const User = require('../../../models/User');
const { Router } = require('express');
const { sf_api: { token } } = require('../../../config/secrets');

const router = Router();

router.all('/*', (req, res, next) => {
        const bearerHeader = req.headers["authorization"];
        const bearerToken = bearerHeader === undefined ? null : bearerHeader.split(' ')[1];
        if (bearerToken !== token) res.status(403).send({"error": "Invalid token"})
        else next();
});

router.post('/token', (req, res) => {
	User.find({ token: req.body.token }).then(doc => {
		if (!doc.length) {
			User.create({ token: req.body.token }).then(() => {
				res.status(200).send({ "status": "ok" });
			}).catch(() => {
				res.status(400).send({ "status": "error", "message": "Invalid token" });
			});
		} else {
			res.status(200).send({ "status": "warning", "message": "Token exists" });
		}
	}).catch(() => {});
});

router.post('/follows', (req, res) => {
	if (!["get", "edit"].includes(req.body.request)) return res.status(400).send({ "status": "error", "message": "Invalid request" });
	if (req.body.request === "get") {
		User.findOne({ token: req.body.token }).then(user => {
			res.status(200).send(user.follows);
		}).catch(() => {
			res.status(400).send({ "status": "error", "message": "Invalid token" });
		});
	} else {
		User.updateOne({ token: req.body.token }, { follows: JSON.parse(req.body.follows) }).then(ret => {
			if (ret.n) res.status(200).send({ "status": "ok" });
			else res.status(400).send({ "status": "error", "message": "Invalid token" });
		}).catch(() => {
			res.status(400).send({ "status": "error", "message": "Invalid follows" });
		});
	}
});

module.exports = router;
