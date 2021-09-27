const { get } = require("axios");
const { load } = require("cheerio");
const { sf_api, base_url, mangaplus_url , pages_url } = require("../../config/secrets");
const puppeteer = require('puppeteer');

function getRecents(limit = 20) {
	limit = Math.min(Math.max(limit, 1), 20);
	return get(`${base_url}`).then(res => {
		const $ = load(res.data);
		return $("#home-chapter .home-manga").map((_, c) => ({
			title: $(c).find($(".hm-info .hmi-sub .hm-font")).text().replace(/^ : /gm, ""),
			number: Number($(c).find($(".hmi-sub > span"))[0].children[0].data.match(/[\d]+/g).pop()),
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
	return get(`${base_url}${manga_id}`).then(res => {
		const $ = load(res.data);
		const card = $("#chap-top");
		if (!card.length) return null;
		return card.find($("#chapitres .chapitre")).map((_, c) => ({
			number: Number($(c).find($(".chl-num")).text().match(/[\d]+/g).pop()),
			release_date: $(c).find($(".chl-date")).children().get(0).next.data,
			source: $(c).find($(".hm-link")).attr("href")
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

function getUrl(manga_id, number) {
	return getByManga(manga_id).then(res => res.filter(c => c.number == number)[0]?.source);
}

async function getMangaPlusPages(mangaplus_id) {
	const browser = await puppeteer.launch({ defaultViewport: { width: 1920, height: 1080 } });
	const page = await browser.newPage();
	await page.goto(mangaplus_url + mangaplus_id, { waitUntil: 'networkidle2' });
	await page.waitForSelector('img.zao-image');
	await page.waitForTimeout(5000);
	await page.evaluate(() => {
		const style = document.createElement('style');
		style.setAttribute('type', 'text/css');
		style.innerHTML = `
			.zao-image {
				position: absolute !important;
				top: 0 !important;
			}
			.zao-container {
				background-color: #43ff49 !important;
				height: 100vh !important;
				width: 100vw !important;
				margin: 0 !important;
			}
		`;
		document.querySelector("head").appendChild(style);
		document.getElementsByClassName("styles-module_container_1h4NA")[0].remove();
	});
	const pages = (await page.$$("img.zao-image")).length;
	for (let i = 0; i < pages; i++) {
		await page.evaluate(i => {
			document.getElementsByClassName("zao-image")[i].style.zIndex = 100 + i;
		}, i);
		await page.screenshot({ path: 'pages/' + mangaplus_id + '-' + i + '.png' });
	}
	await browser.close();
	return [];
}

module.exports = {
	getRecents: getRecents,
	getByManga: getByManga,
	getPages: getPages,
	getPage: getPage,
	getUrl: getUrl,
	// getMangaPlusPages: getMangaPlusPages
}