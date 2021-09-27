const { Router } = require('express');

module.exports = (() => {
	const router = Router();

	router.use('/mangas', require('./manga'));
	router.use('/chapters', require('./chapter'));
	router.use('/users', require('./user'));

	return router;
})();
