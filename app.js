import 'dotenv/config'
import RssFeedEmitter from 'rss-feed-emitter'
import Koa from 'koa'
import bodyparser from 'koa-bodyparser'
import { WebSocketServer } from 'ws'
import mongoose from 'mongoose'
import User from './models/User.js'
import api from './routes/api/index.js'

const MONGODB_URI = process.env.MONGODB_URI ?? ''
const PORT = Number(process.env.PORT ?? 3000)

// Database
mongoose.connect(MONGODB_URI).catch(console.error)

// API
const app = new Koa()
app.use(bodyparser())
app.use(api.routes(), api.allowedMethods())
app.use(ctx => {
	ctx.status = 404
	ctx.body = { error: 'API not found' }
})

// Websocket
const wss = new WebSocketServer({ noServer: true })
const server = app.listen(PORT, '127.0.0.1', () => console.log(`Listening at http://localhost:${PORT}`))
server.on('upgrade', (request, socket, head) => { wss.handleUpgrade(request, socket, head, () => { }) })

// RSS Feed
const feeder = new RssFeedEmitter({ skipFirstLoad: true })
feeder.add({ url: 'https://scantrad.net/rss/', eventName: 'chapitres' })
feeder.on('chapitres', function (item) {
	const links = item.description.match(/(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|$])/igm)
	const chapter = {
		manga: {
			id: links[0].split('/').pop(),
			name: getGroup(item.title, /Scan - (.*?) Chapitre/g),
			thumbnail: links[1]
		},
		title: getGroup(item.description, /">(.*?)<\/a>/g),
		number: Number(item.link.match(/[^\/]+$/g)[0])
	}
	// ws-sf
	wss.clients.forEach(client => {
		if (client.readyState === WebSocket.OPEN)
			client.send(JSON.stringify(chapter))
	})
	// Mobile app
	User.find({ follows: chapter.manga.id }).exec().then(ret => ret.map(e => e.token)).then(tokens => {
		if (!tokens.length) return
		fetch('https://exp.host/--/api/v2/push/send', {
			method: 'post',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				'accept-encoding': 'gzip, deflate',
				'host': 'exp.host'
			},
			body: JSON.stringify({
				to: tokens,
				title: `${chapter.manga.name} - ${chapter.number}`,
				body: chapter.title,
				priority: 'default',
				sound: 'default',
				channelId: 'default',
			})
		}).catch(console.error)
	}).catch(console.error)
})
feeder.on('error', () => { })
function getGroup(str, regex) { return Array.from(str.matchAll(regex)).pop()[1] }