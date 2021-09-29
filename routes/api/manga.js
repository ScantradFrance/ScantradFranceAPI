const { Router } = require('express');
const router = Router();
const scrapper = require('../../modules/scrapper/manga');

router.get('/', (_req, res) => {
	scrapper.getAll()
		.then(mangas => {
			if (!(mangas && mangas.length > 0)) return res.status(404).send({ "error": "No manga found" });
			res.status(200).send(mangas);
		}).catch(() => {
			res.status(404).send({ "error": "No manga found" });
		});
});

router.get('/:id', (req, res) => {
	scrapper.getById(req.params.id)
		.then(manga => {
			if (!manga) return res.status(404).send({ "error": "No manga found" });
			res.status(200).send(manga);
		}).catch(() => {
			res.status(404).send({ "error": "Manga not found" });
		});
});

module.exports = router;