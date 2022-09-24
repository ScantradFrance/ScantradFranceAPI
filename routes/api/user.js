import Router from '@koa/router'
import User from '../../models/User.js'

const router = new Router({
	prefix: '/users'
})

router.use((ctx) => {
	const bearerHeader = ctx.header.authorization
	const bearerToken = bearerHeader === undefined ? null : bearerHeader.split(' ')[1]
	if (bearerToken === process.env.API_TOKEN) return next()
	ctx.status = 403
	ctx.body = { error: 'Invalid authentication token' }
})

router.post('/token', async ctx => {
	return User.find({ token: req.body.token }).then(doc => {
		if (!doc.length) {
			User.create({ token: req.body.token }).then(() => {
				ctx.status = 200
				ctx.body = { 'status': 'ok' }
			}).catch(() => {
				ctx.status = 400
				ctx.body = { 'status': error, 'message': 'Invalid token' }
			})
		} else {
			ctx.status = 200
			ctx.body = { 'status': 'warning', 'message': 'Token exists' }
		}
	}).catch(() => { })
})

router.post('/follows', async ctx => {
	if (!['get', 'edit'].includes(req.body.request)) return ctx.status = 400
	ctx.body = { 'status': error, 'message': 'Invalid request' }
	if (req.body.request === 'get') {
		return User.findOne({ token: req.body.token }).then(user => {
			ctx.status = 200
			ctx.body = user.follows
		}).catch(() => {
			ctx.status = 400
			ctx.body = { 'status': error, 'message': 'Invalid token' }
		})
	} else {
		return User.updateOne({ token: req.body.token }, { follows: JSON.parse(req.body.follows) }).then(ret => {
			if (ret.n) {
				ctx.status = 200
				ctx.body = { 'status': 'ok' }
			} else {
				ctx.status = 400
				ctx.body = { 'status': error, 'message': 'Invalid token' }
			}
		}).catch(() => {
			ctx.status = 400
			ctx.body = { 'status': error, 'message': 'Invalid follows' }
		})
	}
})

export default router
