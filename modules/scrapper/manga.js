const { get } = require("axios");
const { load } = require("cheerio");
const { base_url } = require("../../config/secrets");

function getAll() {
	return get(`${base_url}mangas`).then(res => {
		const $ = load(res.data);
		return $(".home .new-manga .manga").map((_, m) => {
			const last_chapter = $(m).find($(".manga_right .mr-info .mri-bot")).text();
			return {
				id: $(m).attr("id"),
				name: $(m).find($(".manga_right a.mri-top")).text(),
				thumbnail: $(m).find($(".manga_img img")).attr("data-src"),
				last_chapter: last_chapter.match(/(\d)$/gm) !== null ? last_chapter : null
			}
		}).toArray();
	});
}

function getById(manga_id) {
	return get(`${base_url}${manga_id}`).then(res => {
		const $ = load(res.data);
		const card = $("#chap-top");
		if (!card.length) return null;
		const topinfos = card.find($(".ct-top"));
		const title = topinfos.find($(".titre"))["0"].children;
		const subinfos = topinfos.find($(".info .info .sub-i")).map((_, m) => ({
			type: m.children[0].data.split(" ")[0].toLowerCase(),
			items: $(m).find($(".snm-button")).map((_, i) => $(i).text()).toArray()
		})).toArray();
		return {
			id: manga_id,
			name: title[0].data,
			thumbnail: topinfos.find($(".ctt-img img")).attr("src"),
			genres: (subinfos.find(s => s.type === "genre") || []).items,
			status: (subinfos.find(s => s.type === "status") || []).items[0],
			licence: (subinfos.find(s => s.type === "status") || []).items[1],
			synopsis: card.find($(".new-main p")).text(),
			authors: $(title[1]).text().replace(/^de /gm, "") || undefined,
			chapters: card.find($("#chapitres .chapitre")).map((_, c) => ({
				number: $(c).find($(".ch-left")).attr('href').match(/[\d]+/g).pop(),
				release_date: $(c).find($(".chl-date")).children().get(0).next.data
			})).toArray()
		};
	});
}


module.exports = {
	getAll: getAll,
	getById: getById
}