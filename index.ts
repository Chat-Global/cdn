const { node } = require('@tensorflow/tfjs-node');
const { load: loadNSFW } = require('nsfwjs');
const { get: httpGet } = require('axios');
const { createServer } = require('http');
const download = require('download');
const { existsSync } = require('fs');
const express = require('express');
const { join } = require('path');

const app = express();
const server = createServer(app);

const port = process.env.PORT || 4000;

// Settings
app.set('port', port);
app.set('json spaces', 2);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/attachments', express.static('./attachments'));
app.use('/assets', express.static('./assets'));

// Endpoints
app.get('/', async (req: any, res: any) => {
	res.redirect('https://chatglobal.ml/');
});

app.post('/post', async (req: any, res: any) => {
	function createID(
		length: number,
		createFileName: string,
		createShortPath: string
	): string {
		const characters = [
			'A',
			'B',
			'C',
			'D',
			'E',
			'F',
			'G',
			'H',
			'I',
			'J',
			'K',
			'L',
			'M',
			'N',
			'O',
			'P',
			'Q',
			'R',
			'S',
			'T',
			'U',
			'V',
			'W',
			'X',
			'Y',
			'Z'
		];

		const resultArray = [];

		for (let i = 0; i < length; i++) {
			resultArray.push(characters[~~(Math.random() * characters.length)]);
		}

		const result = `${resultArray.join('')}-${createFileName}`;

		if (existsSync(`${createShortPath}${result}`))
			return createID(
				~~(Math.random() * characters.length) + length,
				createFileName,
				createShortPath
			);

		return result;
	}

	const headers = req.headers;
	const body = req.body;

	if (!headers.api_key)
		return res.status(400).json({
			error: 'API_KEY is a required field.',
			status: 400
		});

	if (headers.api_key != process.env.API_KEY)
		return res.status(401).json({
			error: 'Invalid API_KEY provided.',
			status: 401
		});

	if (!body.url)
		return res.status(400).json({
			error: 'URL is a required field.',
			status: 400
		});

	const fileName = body.url.substring(body.url.lastIndexOf('/') + 1);

	const shortPath = `./files/`;

	const fullFile = createID(
		Math.floor(Math.random() * 4 + 2),
		fileName,
		shortPath
	);

	const path = `${shortPath}${fullFile}`;

	const pic = await httpGet(body.url, {
		responseType: 'arraybuffer'
	});

	try {
		const model = await loadNSFW();
		const image = await node.decodeImage(pic.data, 3);
		const predictions = await model.classify(image);

		image.dispose();

		if (
			predictions[0].className != 'Neutral' &&
			predictions[0].className != 'Drawing'
		) {
			return res.status(200).json({
				text: 'NSFW Detected.',
				url: 'https://cdn.chatglobal.ml/assets/navi.png',
				status: 200
			});
		}
	} catch (err) {
		void 0;
	}

	const downloadResponse = await download(body.url, path).catch(() => false);

	if (downloadResponse) {
		return res.status(200).json({
			text: 'Successfully uploaded.',
			url: `https://cdn.chatglobal.ml/attachments/${fullFile}`,
			status: 200
		});
	} else {
		return res.status(500).json({
			text: 'Internal server error.',
			url: `https://cdn.chatglobal.ml/attachments/${fullFile}`,
			status: 200
		});
	}
});

app.use((req: any, res: any, next: any) => {
    const error: any = new Error('Not Found.');
    error.status = 404;
    next(error);
});

app.use((error: any, req: any, res: any, next: any) => {
    res.status(404).send('404: Not found.');
});

// Starting the server

server.listen(app.get('port'), () => {
	console.log(`Server listening on port ${app.get('port')}`);
});
