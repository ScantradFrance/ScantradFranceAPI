const { Router } = require('express');
const router = Router();
const sharp = require('sharp');
const { sf_api } = require('../../config/secrets');
const scrapper = require('../../modules/scrapper/chapter');

async function getPagesUrl(getPage, pages, mangaplus_id) {
	// if (mangaplus_id) {
	// 	const ret = await scrapper.getMangaPlusPages(mangaplus_id);
	// 	return { length: ret.length, urls: ret };
	// }
	return { length: pages.length, urls: await Promise.all(pages.map(async p => {
		const number = p.split('/').pop();
		const data = await getPage(number).then(r => r && r.data);
		if (!data || !data.length) return [];
		const { width, height } = await sharp(data).metadata();
		if (width * 5 > height) return { uri: p, width: width, height: height };
		const cut_h = Math.ceil(width * 13 / 9);
		const cut = Math.ceil(height / cut_h);
		const urls = [];
		for (let i = 0; i < cut; i++) {
			const new_height = i === cut - 1 ? (height % cut_h) || cut_h : cut_h;
			urls.push({
				uri: `${sf_api.shared_url}chapters/page/${number}?top=${cut_h * i}&width=${width}&height=${new_height}`,
				width: width,
				height: new_height
			});
		}
		return urls;
	})).then(arr => arr.flat())};
}

function getImageData(data, { top, width, height }) {
	if ([top, width, height].includes(undefined)) return new Promise(resolve => resolve(data));
	return sharp(data).extract({ top: Number(top), left: 0, width: Number(width), height: Number(height) }).toBuffer();
}

router.get('/page/:number(\\d+)', (req, res) => {
	scrapper.getPage(req.params.number).then(r => r && r.data).then(data => {
		if (!data || !data.length) return res.status(404).send({ "error": "No page found" });
		getImageData(data, req.query).then(img => {
			if (req.query.type === "base64") return res.status(200).send('data:image/png;base64,' + img.toString('base64'));
			res.status(200).set({ 'Content-Type': 'image/jpeg' }).end(img, 'binary')
		}).catch(err => {
			console.error(err);
			res.status(500).send({ "error": "Internal server error" })
		});
	}).catch(err => {
		console.error(err);
		res.status(500).send({ "error": "Internal server error" });
	});
});

router.get('/:limit(\\d+)', (req, res) => {
	scrapper.getRecents(req.params.limit).then(chapters => {
		if (!chapters || !chapters.length) return res.status(404).send({ "error": "No chapter found" });
		res.status(200).send(chapters);
	}).catch(err => {
		console.error(err);
		res.status(500).send({ "error": "Internal server error" });
	});
});

router.get('/:id/:number([\\d|\\.]+)', (req, res) => {
	scrapper.getPages(req.params.id, req.params.number).then(pages => {
		scrapper.getUrl(req.params.id, req.params.number).then(url => {
			if (!pages || !pages.length) return res.status(404).send({ "error": "No page found" });
			getPagesUrl(scrapper.getPage, pages, Number((((url && url.includes("mangaplus")) && url || "").match(/[\d]+/g) || []).pop()) || undefined).then(({length, urls}) => {
				if (!urls || !urls.length) return res.status(404).send({ "error": "No page found" });
				res.status(200).send({ length: length, pages: urls });
			}).catch(err => {
				console.error(err);
				res.status(500).send({ "error": "Internal server error" });
			});
		}).catch(err => {
			console.error(err);
			res.status(500).send({ "error": "Internal server error" });
		});
	}).catch(err => {
		console.error(err);
		res.status(500).send({ "error": "Internal server error" });
	});
});

router.get('/:id', (req, res) => {
	scrapper.getByManga(req.params.id).then(chapters => {
		if (!(chapters && chapters.length > 0)) return res.status(404).send({ "error": "No chapter found" });
		res.status(200).send(chapters);
	}).catch(err => {
		console.error(err);
		res.status(500).send({ "error": "Internal server error" });
	});
});

module.exports = router;
