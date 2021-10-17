const mongoose = require('mongoose');
const { post } = require('axios');
const express = require('express');
require('dotenv').config();
const RssFeedEmitter = require('rss-feed-emitter');
const User = require('./models/User');
const WebSocket = require('ws');
const { saveMangaPlusPages } = require('./modules/scrapper/chapter');

// Database
mongoose.connect(process.env.MONGODB_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	useFindAndModify: false,
	useCreateIndex: true
}).catch(console.error);

// Express
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API
app.use('/api', require('./routes/api/index'));
app.use(function(_req, res) {
	res.status(404).send({"error": "API not found"});
});

// Websocket
const wss = new WebSocket.Server({ noServer: true });
const server = app.listen(process.env.PORT, () => console.info(`Listening at http://localhost:${process.env.PORT}`));
server.on('upgrade', (request, socket, head) => { wss.handleUpgrade(request, socket, head, () => { }); });

// RSS Feed
const feeder = new RssFeedEmitter({ skipFirstLoad: true });
feeder.add({ url: 'https://scantrad.net/rss/', eventName: 'chapitres' });
feeder.on('chapitres', function (item) {
	const links = item.description.match(/(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|$])/igm);
	const chapter = {
		manga: {
			id: links[0].split('/').pop(),
			name: cutByMatch(item.title, /Scan - (.*?) Chapitre/g),
			thumbnail: links[1]
		},
		title: cutByMatch(item.description.match(/">(.*?)<\/a>/g).pop(), /">(.*?)<\/a>/g),
		number: Number(item.link.match(/[^\/]+$/g)[0])
	};
	// ws-sf
	wss.clients.forEach(client => {
		if (client.readyState === WebSocket.OPEN)
			client.send(JSON.stringify(chapter));
	});
	// App mobile
	User.find({ follows: chapter.manga.id }).exec().then(ret => ret.map(e => e.token)).then(tokens => {
		if (!tokens.length) return;
		post('https://exp.host/--/api/v2/push/send', {
			to: tokens,
			title: `${chapter.manga.name} - ${chapter.number}`,
			body: chapter.title,
			priority: "default",
			sound: "default",
			channelId: "default",
		}, {
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				'accept-encoding': 'gzip, deflate',
				'host': 'exp.host'
			},
		}).catch(console.error);
	}).catch(console.error);
	// Mangaplus
	saveMangaPlusPages(chapter.manga.id, chapter.number).catch(() => {});
});
feeder.on('error', () => {});
cutByMatch = (str, regex) => Array.from(str.matchAll(regex), x => x[1])[0];