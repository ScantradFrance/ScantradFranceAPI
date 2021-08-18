const { get } = require("axios");
const { load } = require("cheerio");
const { sf_api, base_url, pages_url } = require("../../config/secrets");

function getRecents(limit = 20) {
	limit = Math.min(Math.max(limit, 1), 20);
	return get(`${base_url}`).then(res => {
		const $ = load(res.data);
		return $("#home-chapter .home-manga").map((_, c) => ({
			title: $(c).find($(".hm-info .hmi-sub .hm-font")).text().replace(/^ : /gm, ""),
			number: $(c).find($(".hm-info .hmi-sub :first-child")).text().match(/(\d|\.)/g).join(''),
			release_date: $(c).find($(".hmr-date .hm-font")).get(0).next.data,
			manga: {
				id: $(c).find($(".hm-image")).attr("data-slug"),
				name: $(c).find($(".hm-info .hmi-titre span")).text(),
				thumbnail: $(c).find($(".hm-image img")).attr("data-src")
			}
		})).toArray().splice(0, limit);
	});
}

function getByManga(manga_id) {
	return get(`${base_url}${manga_id}`).then(res => {
		const $ = load(res.data);
		const card = $("#chap-top");
		if (!card.length) return null;
		return card.find($("#chapitres .chapitre")).map((_, c) => ({
			number: $(c).find($(".chl-num")).text().replace(/\D/gm, ""),
			release_date: $(c).find($(".chl-date")).children().get(0).next.data
		})).toArray();
	});
}

function getPages(manga_id, number) {
	return get(`${base_url}mangas/${manga_id}/${number}`).then(res => {
		const $ = load(res.data);
		const card = $("#lel");
		if (!card.length) return null;
		return card.find($(".main .sc-lel img")).map((_, p) => pages_url + $(p).attr("data-src")).toArray().filter(p => p.includes("lel")).map(p => `${sf_api.shared_url}chapters/page/${p.replace(/(\D+)/g, "")}`);
	});
}

function getPage(number) {
	return get(`${pages_url}lel/${number}.png`, { responseType: 'arraybuffer', headers: { Referer: base_url }});
}


module.exports = {
	getRecents: getRecents,
	getByManga: getByManga,
	getPages: getPages,
	getPage: getPage
}