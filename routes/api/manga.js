import Router from '@koa/router'
import * as scrapper from '../../modules/scrapper/manga.js'

const router = new Router({
	prefix: '/mangas'
})

router.get('/', async ctx => {
	return scrapper.getAll().then(mangas => {
		if (!(mangas && mangas.length > 0)) throw new Error()
		ctx.status = 200
		ctx.body = mangas
	}).catch(() => {
		ctx.status = 404
		ctx.body = { error: 'No manga found' }
	})
})

router.get('/:id', async ctx => {
	return scrapper.getById(ctx.params.id).then(manga => {
		if (!manga) throw new Error()
		ctx.status = 200
		ctx.body = manga
	}).catch(() => {
		ctx.status = 404
		ctx.body = { error: 'Manga not found' }
	})
})

export default router