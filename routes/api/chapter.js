const { Router } = require('express');
const sharp = require('sharp');

async function getImagesData(data) {
	const { width, height } = await sharp(data).metadata();
	const images = [];
	if (width * 5 < height) {
		const cut_height = Math.ceil(width * 13 / 9);
		const cut = Math.ceil(height / cut_height);
		for (let i = 0; i < cut; i++)
			images.push(await sharp(data).extract({ top: cut_height * i, left: 0, width: width, height: i === cut - 1 ? (height % cut_height) || cut_height : cut_height }).toBuffer().then(buf => `data:image/png;base64,${buf.toString('base64')}`));
	} else {
		images.push(`data:image/png;base64,${data.toString('base64')}`);
	}
	return images;
}

module.exports = scrapper => {
	const router = Router();

	router.get('/page/:number(\\d+)', (req, res) => {
		scrapper.getPage(req.params.number)
			.then(page_res => {
				if (!(page_res && page_res.data && page_res.data.length)) return res.status(404).send({ "error": "No page found" });
				getImagesData(page_res.data)
					.then(imgs => res.status(200).send(imgs))
					.catch((err) => {console.log(err); res.status(500).send({ "error": "Internal server error" })});
			}).catch(err => {
				console.error(err);
				res.status(500).send({ "error": "Internal server error" });
			});
	});

	router.get('/:limit(\\d+)', (req, res) => {
		scrapper.getRecents(req.params.limit)
			.then(chapters => {
				if (!(chapters && chapters.length > 0)) return res.status(404).send({ "error": "No chapter found" });
				res.status(200).send(chapters);
			}).catch(err => {
				console.error(err);
				res.status(500).send({ "error": "Internal server error" });
			});
	});

	router.get('/:id/:number(\\d+)', (req, res) => {
		scrapper.getPages(req.params.id, req.params.number)
			.then(pages => {
				if (!(pages && pages.length > 0)) return res.status(404).send({ "error": "No pages found" });
				res.status(200).send(pages);
			}).catch(err => {
				console.error(err);
				res.status(500).send({ "error": "Internal server error" });
			});
	});

	router.get('/:id', (req, res) => {
		scrapper.getByManga(req.params.id)
			.then(chapters => {
				if (!(chapters && chapters.length > 0)) return res.status(404).send({ "error": "No chapter found" });
				res.status(200).send(chapters);
			}).catch(err => {
				console.error(err);
				res.status(500).send({ "error": "Internal server error" });
			});
	});

	return router;
};
