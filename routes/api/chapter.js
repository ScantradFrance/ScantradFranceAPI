const { Router } = require('express');
const router = Router();
const scrapper = require('../../modules/scrapper/chapter');

router.get('/page/:number(\\d+)', (req, res) => {
	scrapper.getPage(req.params.number, req.query).then(r => r && r.data).then(data => {
		if (!data || !data.length) return res.status(404).send({ "error": "No page found" });
		scrapper.getImageData(data, req.query).then(img => {
			if (req.query.type === "base64") return res.status(200).send('data:image/png;base64,' + img.toString('base64'));
			res.status(200).set({ 'Content-Type': 'image/jpeg' }).end(img, 'binary')
		}).catch(() => {
			res.status(404).send({ "error": "Image not found" })
		});
	}).catch(() => {
		res.status(404).send({ "error": "Page not found" });
	});
});

router.get('/:limit(\\d+)', (req, res) => {
	scrapper.getRecents(req.params.limit).then(chapters => {
		if (!chapters || !chapters.length) return res.status(404).send({ "error": "No chapter found" });
		res.status(200).send(chapters);
	}).catch(() => {
		res.status(404).send({ "error": "No chapter found" });
	});
});

router.get('/:id/:number([\\d|\\.]+)', (req, res) => {
	scrapper.getPages(req.params.id, req.params.number).then(pages => {
		scrapper.getUrl(req.params.id, req.params.number).then(url => {
			scrapper.getPagesUrl(pages, url).then(({length, urls}) => {
				if (!urls || !urls.length) return res.status(404).send({ "error": "No page found" });
				res.status(200).send({ length: length, pages: urls });
			}).catch(() => {
				res.status(404).send({ "error": "No page found" });
			});
		}).catch(() => {
			res.status(404).send({ "error": "No page found" });
		});
	}).catch(() => {
		res.status(404).send({ "error": "Chapter not found" });
	});
});

router.get('/:id', (req, res) => {
	scrapper.getByManga(req.params.id).then(chapters => {
		if (!(chapters && chapters.length > 0)) return res.status(404).send({ "error": "No chapter found" });
		res.status(200).send(chapters);
	}).catch(() => {
		res.status(404).send({ "error": "Invalid manga ID" });
	});
});

module.exports = router;
