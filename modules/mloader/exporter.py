import base64
import zipfile
from abc import ABCMeta, abstractmethod
from itertools import chain
from pathlib import Path
from typing import Union, Optional

from mloader.constants import Language
from mloader.response_pb2 import Title, Chapter
from mloader.utils import escape_path, is_oneshot, chapter_name_to_int


class ExporterBase(metaclass=ABCMeta):
    def __init__(
        self,
        destination: str,
        title: Title,
        chapter: Chapter,
        next_chapter: Optional[Chapter] = None,
        add_chapter_title: bool = False,
        manga_id: str = None,
        chapter_number: int = 0
    ):
        self.destination = destination
        self.add_chapter_title = add_chapter_title
        self.title_name = escape_path(title.name).title()
        self.number_id = chapter.chapter_id
        self.is_oneshot = is_oneshot(chapter.name, chapter.sub_title)
        self.is_extra = chapter.name == "ex"
        self.manga_id = manga_id
        self.chapter_number = chapter_number

        self._extra_info = []

        if self.is_oneshot:
            self._extra_info.append("[Oneshot]")

        if self.is_extra or self.add_chapter_title:
            self._extra_info.append(f"[{escape_path(chapter.sub_title)}]")

        self._chapter_prefix = self._format_chapter_prefix(
            self.title_name,
            chapter.name,
            title.language,
            next_chapter and next_chapter.name,
        )
        self._chapter_suffix = self._format_chapter_suffix()
        self.chapter_name = " ".join(
            (self._chapter_prefix, self._chapter_suffix)
        )

    def _format_chapter_prefix(
        self,
        title_name: str,
        chapter_name: str,
        language: int,
        next_chapter_name: Optional[str] = None,
    ) -> str:
        # https://github.com/Daiz/manga-naming-scheme
        components = [title_name]
        if Language(language) != Language.eng:
            components.append(f"[{Language(language).name}]")
        components.append("-")
        suffix = ""
        prefix = ""
        if self.is_oneshot:
            chapter_num = 0
        elif self.is_extra and next_chapter_name:
            suffix = "x1"
            chapter_num = chapter_name_to_int(next_chapter_name)
            if chapter_num is not None:
                chapter_num -= 1
                prefix = "c" if chapter_num < 1000 else "d"
        else:
            chapter_num = chapter_name_to_int(chapter_name)
            if chapter_num is not None:
                prefix = "c" if chapter_num < 1000 else "d"

        if chapter_num is None:
            chapter_num = escape_path(chapter_name)

        components.append(f"{prefix}{chapter_num:0>3}{suffix}")
        components.append("(web)")
        return f"{title_name.lower().replace(' ','')}_{chapter_num}"
        # return " ".join(components)

    def _format_chapter_suffix(self) -> str:
        return " ".join(chain(self._extra_info, ["[Viz]"]))

    def format_page_name(self, page: Union[int, range], ext=".jpg") -> str:
        if isinstance(page, range):
            page = f"{page.start}-{page.stop}"

        ext = ext.lstrip(".")

        return f"{page}.{ext}"

    def close(self):
        pass

    @abstractmethod
    def add_image(self, image_data: bytes, index: Union[int, range]):
        pass


class RawExporter(ExporterBase):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.path = Path(self.destination, f"{self.manga_id or self.title_name.lower().replace(' ', '-')}/{self.chapter_number}")
        self.path.mkdir(parents=True, exist_ok=True)

    def add_image(self, image_data: bytes, index: Union[int, range]):
        filename = Path(self.format_page_name(index))
        self.path.joinpath(filename).write_bytes(image_data)


class CBZExporter(ExporterBase):
    def __init__(self, compression=zipfile.ZIP_DEFLATED, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.path = Path(self.destination, self.title_name)
        self.path.mkdir(parents=True, exist_ok=True)
        self.path = self.path.joinpath(self.chapter_name).with_suffix(".cbz")
        self.archive = zipfile.ZipFile(
            self.path, mode="w", compression=compression
        )

    def add_image(self, image_data: bytes, index: Union[int, range]):
        path = Path(self.chapter_name, self.format_page_name(index))
        self.archive.writestr(path.as_posix(), image_data)

    def close(self):
        self.archive.close()
