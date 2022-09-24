import Router from '@koa/router'
import chapterRouter from './chapter.js'
import mangaRouter from './manga.js'
import userRouter from './user.js'

const apiRouter = new Router({
	prefix: '/api'
})

apiRouter.use(chapterRouter.routes(), chapterRouter.allowedMethods())
apiRouter.use(mangaRouter.routes(), mangaRouter.allowedMethods())
apiRouter.use(userRouter.routes(), userRouter.allowedMethods())

export default apiRouter
