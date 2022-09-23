const { get } = require("axios");
const { load } = require("cheerio");
const sharp = require('sharp');
const { spawn } = require('child_process');
const { getById } = require('../../modules/scrapper/manga');
const { readFile, stat, readdir } = require('fs/promises');
const sizeOf = require('buffer-image-size');

const MANGAPLUS_PATH = 'mangaplus/';

function getRecents(limit = 20) {
	limit = Math.min(Math.max(limit, 1), 20);
	return get(`${process.env.BASE_URL}`).then(res => {
		const $ = load(res.data);
		return $("#home-chapter .home-manga").map((_, c) => ({
			title: $(c).find($(".hm-info .hmi-sub .hm-font")).text().replace(/^ : /gm, ""),
			number: Number($(c).find($(".hmi-sub > span:first-child")).text().match(/[\d|.]+/g).pop()),
			release_date: $(c).find($(".hmr-date .hm-font")).get(0).next.data,
			source: $(c).find($(".hmi-sub")).attr("href"),
			manga: {
				id: $(c).find($(".hm-image")).attr("data-slug"),
				name: $(c).find($(".hm-info .hmi-titre span")).text(),
				thumbnail: $(c).find($(".hm-image img")).attr("data-src")
			}
		})).toArray().splice(0, limit);
	});
}

function getByManga(manga_id) {
	return getById(manga_id).then(m => m.chapters);
}

function getPages(manga_id, number) {
	return get(`${process.env.BASE_URL}mangas/${manga_id}/${number}`).then(res => {
		const $ = load(res.data);
		const card = $("#lel");
		if (!card.length) return null;
		return { manga_id, number, urls: card.find($(".main .sc-lel img")).map((_, p) => process.env.PAGES_URL + $(p).attr("data-src")).toArray().filter(p => p.includes("lel")).map(p => `${process.env.API_SHARED_URL}chapters/page/${p.replace(/(\D+)/g, "")}`) };
	});
}

async function getPagesUrl({ manga_id, number, urls: pages }, source) {
	if (source.includes("mangaplus")) {
		const length = (await readdir(MANGAPLUS_PATH + manga_id + "/" + number).catch(() => { })).length;
		return {
			length,
			urls: await Promise.all(new Array(length).fill().map(async (_, i) => {
				const img = await readFile(MANGAPLUS_PATH + manga_id + "/" + number + "/" + i + ".jpg");
				const { width, height } = sizeOf(img);
				return {
					uri: `${process.env.API_SHARED_URL}chapters/page/${i}?source=mangaplus&manga_id=${manga_id}&number=${number}`,
					width,
					height
				}
			}))
		};
	}
	return {
		length: pages.length,
		urls: await Promise.all(pages.map(async p => {
			const number = p.split('/').pop();
			const data = await getPage(number, source).then(r => r && r.data);
			if (!data || !data.length) return [];
			const { width, height } = await sharp(data).metadata();
			if (width * 5 > height) return { uri: p, width: width, height: height };
			const cut_h = Math.ceil(width * 13 / 9);
			const cut = Math.ceil(height / cut_h);
			const urls = [];
			for (let i = 0; i < cut; i++) {
				const new_height = i === cut - 1 ? (height % cut_h) || cut_h : cut_h;
				urls.push({
					uri: `${process.env.API_SHARED_URL}chapters/page/${number}?top=${cut_h * i}&width=${width}&height=${new_height}`,
					width: width,
					height: new_height
				});
			}
			return urls;
		})).then(arr => arr.flat())
	};
}

function getImageData(data, { top, width, height }) {
	if ([top, width, height].includes(undefined)) return new Promise(resolve => resolve(data));
	return sharp(data).extract({ top: Number(top), left: 0, width: Number(width), height: Number(height) }).toBuffer();
}

async function getPage(page_number, { source, manga_id, number }) {
	if (source === "mangaplus") return new Promise(resolve => readFile(MANGAPLUS_PATH + manga_id + "/" + number + "/" + page_number + ".jpg").then(data => resolve({ data })).catch(() => resolve([])));
	return get(`${process.env.PAGES_URL}lel/${page_number}.png`, { responseType: 'arraybuffer', headers: { Referer: process.env.BASE_URL } });
}

function getUrl(manga_id, number) {
	return getByManga(manga_id).then(res => res.filter(c => c.number == number)[0]?.source);
}

function saveMangaPlusPages(manga_id, number) {
	return getUrl(manga_id, number).then(url => {
		if (!url.includes("mangaplus")) return;
		const mangaplus_id = url.match(/[\d]+/g).pop();
		return stat(MANGAPLUS_PATH + manga_id + "/" + number).then(() => "The chapter already exists").catch(() => {
			spawn('mloader', ['-grx', '-c', mangaplus_id, '-o', MANGAPLUS_PATH, '-i', manga_id, '-n', number]);
			return "Saved pages in " + MANGAPLUS_PATH + manga_id + "/" + number;
		});
	}).catch(() => "Invalid manga id or chapter number");
}

module.exports = {
	getRecents: getRecents,
	getByManga: getByManga,
	getPages: getPages,
	getPagesUrl: getPagesUrl,
	getImageData: getImageData,
	getPage: getPage,
	getUrl: getUrl,
	saveMangaPlusPages: saveMangaPlusPages
}
