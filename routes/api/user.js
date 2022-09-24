import Router from '@koa/router'
import User from '../../models/User.js'

const router = new Router({
	prefix: '/users'
})

router.use(async (ctx, next) => {
	const bearerHeader = ctx.header.authorization
	const bearerToken = bearerHeader === undefined ? null : bearerHeader.split(' ')[1]
	if (bearerToken === process.env.API_TOKEN) return await next()
	ctx.status = 403
	ctx.body = { error: 'Invalid authentication token' }
})

router.post('/token', async ctx => {
	return User.find({ token: ctx.request.body.token }).then(doc => {
		if (!doc.length) {
			User.create({ token: ctx.request.body.token }).then(() => {
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
	if (!['get', 'edit'].includes(ctx.request.body.request)) return ctx.status = 400
	ctx.body = { 'status': error, 'message': 'Invalid request' }
	if (ctx.request.body.request === 'get') {
		return User.findOne({ token: ctx.request.body.token }).then(user => {
			ctx.status = 200
			ctx.body = user.follows
		}).catch(() => {
			ctx.status = 400
			ctx.body = { 'status': error, 'message': 'Invalid token' }
		})
	} else {
		return User.updateOne({ token: ctx.request.body.token }, { follows: JSON.parse(ctx.request.body.follows) }).then(ret => {
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
