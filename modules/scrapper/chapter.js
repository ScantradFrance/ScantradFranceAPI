import { load } from 'cheerio'
import sharp from 'sharp'
import probe from 'probe-image-size'
import { getById } from './manga.js'
import * as mangaplus from '../mangaplus/api.js'

export async function getRecents(limit = 20) {
	limit = Math.min(Math.max(limit, 1), 20)
	return fetch(`${process.env.BASE_URL}`).then(res => { if (!res.ok) { throw new Error('Failed to fetch') } else { return res.text() } }).then(data => {
		const $ = load(data)
		return $('#home-chapter .home-manga').map((_, c) => ({
			title: $(c).find($('.hm-info .hmi-sub .hm-font')).text().replace(/^ : /gm, ''),
			number: Number($(c).find($('.hmi-sub > span:first-child')).text().match(/[\d|.]+/g).pop()),
			release_date: $(c).find($('.hmr-date .hm-font')).get(0).next.data,
			source: $(c).find($('.hmi-sub')).attr('href'),
			manga: {
				id: $(c).find($('.hm-image')).attr('data-slug'),
				name: $(c).find($('.hm-info .hmi-titre span')).text(),
				thumbnail: $(c).find($('.hm-image img')).attr('data-src')
			}
		})).toArray().splice(0, limit)
	})
}

export async function getByManga(manga_id) {
	return getById(manga_id).then(m => m.chapters)
}

export async function getSourcePages(manga_id, number) {
	return fetch(`${process.env.BASE_URL}mangas/${manga_id}/${number}`).then(res => { if (!res.ok) { throw new Error('Failed to fetch') } else { return res.text() } }).then(data => {
		const $ = load(data)
		const card = $('#lel')
		if (!card.length) return null
		const urls = card
			.find($('.main .sc-lel img'))
			.map((_, p) => process.env.PAGES_URL + $(p).attr('data-src'))
			.toArray()
			.filter(p => p.includes('lel'))
		if (urls.length > 0) {
			return {
				manga_id,
				number,
				urls,
				source: 'scantrad'
			}
		} else {
			return {
				manga_id,
				number: card.find($('.main .next_chapitre')).attr('href').split('/').pop(),
				source: 'mangaplus'
			}
		}
	})
}

export async function getPages(pages) {
	if (pages.source === 'mangaplus') {
		const imgs = await mangaplus.getPages(pages.number)
		const urls = imgs.map(p => ({
			uri: `${process.env.API_SHARED_URL}chapters/page/mangaplus?url=${encodeURIComponent(p.imageUrl)}&key=${p.encryptionKey}`,
			width: p.width,
			height: p.height
		}))
		return {
			length: urls.length,
			urls
		}
	}
	const urls = await Promise.all(pages.urls.map(async url => {
		const { width, height } = await probe(url, { headers: { Referer: process.env.BASE_URL } })
		const uri = `${process.env.API_SHARED_URL}chapters/page/${url.replace(/(\D+)/g, "")}`
		if (width * 5 > height) return { uri, width, height }
		const cut_h = Math.ceil(width * 13 / 9)
		const cut = Math.ceil(height / cut_h)
		const urls = []
		for (let i = 0; i < cut; i++) {
			const new_height = i === cut - 1 ? (height % cut_h) || cut_h : cut_h
			urls.push({
				uri: `${uri}?top=${cut_h * i}&width=${width}&height=${new_height}`,
				width: width,
				height: new_height
			})
		}
		return urls
	})).then(arr => arr.flat())
	return {
		length: urls.length,
		urls: urls
	}
}

export async function getImageData(data, { top, width, height }) {
	if ([top, width, height].includes(undefined)) return new Promise(resolve => resolve(data))
	return sharp(data).extract({ top: Number(top), left: 0, width: Number(width), height: Number(height) }).toBuffer()
}

export async function getPage(page_number) {
	return fetch(`${process.env.PAGES_URL}lel/${page_number}.png`, { headers: { Referer: process.env.BASE_URL } })
		.then(res => { if (!res.ok) { throw new Error('Failed to fetch') } else { return res.arrayBuffer() } })
		.then(buf => Buffer.from(buf))
}
