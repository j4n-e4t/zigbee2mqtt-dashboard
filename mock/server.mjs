// Minimal Zigbee2MQTT frontend-API mock.
// Speaks the same WebSocket protocol as Z2M's built-in frontend server:
//   ws://<host>:<port>/api[?token=...]  with JSON frames { topic, payload }
// where `topic` is relative to the MQTT base topic (e.g. "bridge/devices").

import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { createBridge } from './bridge.mjs';

const PORT = Number(process.env.PORT ?? 8080);
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

const DIY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="26" y="4" width="12" height="40" rx="3" fill="#2f855a"/><path d="M10 44h44v12a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z" fill="#8b5e34"/><circle cx="32" cy="14" r="3" fill="#c6f6d5"/></svg>`;

const http = createServer((req, res) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	const url = new URL(req.url ?? '/', 'http://localhost');
	if (url.pathname === '/device_icons/diy-soil.svg') {
		res.writeHead(200, { 'Content-Type': 'image/svg+xml' }).end(DIY_ICON);
	} else if (url.pathname === '/health') {
		res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"status":"ok"}');
	} else {
		res.writeHead(200, { 'Content-Type': 'text/plain' }).end('Zigbee2MQTT mock. WebSocket API at /api\n');
	}
});

const wss = new WebSocketServer({ noServer: true });

http.on('upgrade', (req, socket, head) => {
	const url = new URL(req.url ?? '/', 'http://localhost');
	if (url.pathname !== '/api') {
		socket.destroy();
		return;
	}
	wss.handleUpgrade(req, socket, head, (ws) => {
		if (AUTH_TOKEN && url.searchParams.get('token') !== AUTH_TOKEN) {
			ws.close(4401, 'Unauthorized');
			return;
		}
		wss.emit('connection', ws, req);
	});
});

const send = (ws, topic, payload) => ws.readyState === ws.OPEN && ws.send(JSON.stringify({ topic, payload }));
const broadcast = (topic, payload) => {
	for (const ws of wss.clients) send(ws, topic, payload);
};
const bridge = createBridge({ broadcast });
const {states, availability} = bridge;

// Live updates: every few seconds one online device reports, like a real network would.
const jitter = (v, step, min, max) => Math.min(max, Math.max(min, Math.round((v + (Math.random() - 0.5) * 2 * step) * 10) / 10));
setInterval(() => {
	const names = Object.keys(states).filter((n) => availability[n] === 'online' && states[n]);
	if (!names.length) return;
	const name = names[Math.floor(Math.random() * names.length)];
	const s = states[name];
	if ('temperature' in s) s.temperature = jitter(s.temperature, 0.2, -10, 40);
	if ('humidity' in s) s.humidity = jitter(s.humidity, 0.5, 0, 100);
	if ('power' in s) s.power = jitter(s.power, 3, 0, 2000);
	if ('illuminance' in s) s.illuminance = Math.max(0, Math.round(jitter(s.illuminance, 5, 0, 1000)));
	if ('occupancy' in s && Math.random() < 0.3) s.occupancy = !s.occupancy;
	if (typeof s.linkquality === 'number') s.linkquality = Math.round(jitter(s.linkquality, 6, 1, 255));
	s.last_seen = new Date().toISOString();
	broadcast(name, s);
}, 3000);

wss.on('connection', (ws, req) => {
	console.log(`client connected from ${req.socket.remoteAddress}`);

	bridge.onConnect((topic, payload) => send(ws, topic, payload));

	ws.on('message', (raw) => {
		let msg;
		try {
			msg = JSON.parse(raw.toString());
		} catch {
			return;
		}
		const topic = String(msg?.topic ?? '');
		console.log(`<- ${topic} ${JSON.stringify(msg.payload ?? null).slice(0, 200)}`);
		// Responses go to everyone, like the real bridge (clients match on transaction)
		bridge.onMessage(topic, msg.payload, broadcast);
	});

	ws.on('close', () => console.log('client disconnected'));
});

http.listen(PORT, () => {
	console.log(`Z2M mock listening on :${PORT} (ws path /api${AUTH_TOKEN ? ', token required' : ''})`);
});
