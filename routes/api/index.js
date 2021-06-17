const { Router } = require('express');
const scrapper = require('../../modules/scrapper/scrapper');

module.exports = (() => {
	const router = Router();

	router.use('/mangas', require('./manga')(scrapper.manga));
	router.use('/chapters', require('./chapter')(scrapper.chapter));
	router.use('/users', require('./user'));
	router.use('/v2', require('./v2/index'));

	return router;
})();
