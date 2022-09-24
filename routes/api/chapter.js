import Router from '@koa/router'
import * as scrapper from '../../modules/scrapper/chapter.js'
import * as mangaplus from '../../modules/mangaplus/api.js'

const router = new Router({
	prefix: '/chapters'
})

router.get('/page/:page', async ctx => {
	if (ctx.params.page === 'mangaplus') {
		return mangaplus.decrypteImage(ctx.query.url, ctx.query.key).then(data => {
			if (!data.byteLength) throw new Error()
			ctx.status = 200
			ctx.body = data
			ctx.type = 'image/jpeg'
		}).catch(() => {
			ctx.status = 404
			ctx.body = { error: 'No page found' }
		})
	} else {
		return scrapper.getPage(ctx.params.page, ctx.query).then(async img => {
			if (!img.byteLength) throw new Error()
			return scrapper.getImageData(img, ctx.query).then(data => {
				ctx.status = 200
				if (ctx.query.type === 'base64') {
					ctx.body = `data:image/jpeg;base64,${data.toString('base64')}`
				} else {
					ctx.body = data
					ctx.type = 'image/jpeg'
				}
			}).catch(() => {
				ctx.status = 404
				ctx.body = { error: 'Image not found' }
			})
		}).catch(() => {
			ctx.status = 404
			ctx.body = { error: 'No page found' }
		})
	}
})

router.get('/:limit(\\d+)', async ctx => {
	return scrapper.getRecents(ctx.params.limit).then(chapters => {
		if (!chapters || !chapters.length) throw new Error()
		ctx.status = 200
		ctx.body = chapters
	}).catch(() => {
		ctx.status = 404
		ctx.body = { error: 'No chapter found' }
	})
})

router.get('/:manga_id/:number([\\d|\\.]+)', async ctx => {
	return scrapper.getSourcePages(ctx.params.manga_id, ctx.params.number).then(async pages => {
		return scrapper.getPages(pages).then(({ length, urls }) => {
			if (!urls.length) throw new Error()
			ctx.status = 200
			ctx.body = { length: length, pages: urls }
		}).catch(() => {
			ctx.status = 404
			ctx.body = { error: 'No page found' }
		})
	}).catch(() => {
		ctx.status = 404
		ctx.body = { error: 'Chapter not found' }
	})
})

router.get('/:id', async ctx => {
	return scrapper.getByManga(ctx.params.id).then(chapters => {
		if (!(chapters && chapters.length > 0)) throw new Error()
		ctx.status = 200
		ctx.body = chapters
	}).catch(() => {
		ctx.status = 404
		ctx.body = { error: 'Invalid manga ID' }
	})
})

export default router
