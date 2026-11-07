// Minimal Zigbee2MQTT frontend-API mock.
// Speaks the same WebSocket protocol as Z2M's built-in frontend server:
//   ws://<host>:<port>/api[?token=...]  with JSON frames { topic, payload }
// where `topic` is relative to the MQTT base topic (e.g. "bridge/devices").

import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { bridgeInfo, devices, groups } from './devices.mjs';

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

const send = (ws, topic, payload) => ws.send(JSON.stringify({ topic, payload }));

const stateFor = (d) => {
	if (d.type === 'Coordinator') return null;
	const s = { linkquality: 40 + ((d.network_address * 7) % 215) };
	if (d.power_source === 'Battery') s.battery = 20 + ((d.network_address * 13) % 81);
	return s;
};

wss.on('connection', (ws, req) => {
	console.log(`client connected from ${req.socket.remoteAddress}`);

	// Same initial burst Z2M sends: retained bridge topics, then device states.
	send(ws, 'bridge/state', { state: 'online' });
	send(ws, 'bridge/info', bridgeInfo);
	send(ws, 'bridge/devices', devices);
	send(ws, 'bridge/groups', groups);
	send(ws, 'bridge/extensions', []);
	for (const d of devices) {
		const s = stateFor(d);
		if (s) send(ws, d.friendly_name, s);
	}

	ws.on('message', (raw) => {
		let msg;
		try {
			msg = JSON.parse(raw.toString());
		} catch {
			return;
		}
		const topic = String(msg?.topic ?? '');
		console.log(`<- ${topic}`);
		const m = topic.match(/^bridge\/request\/(.+)$/);
		if (m) {
			send(ws, `bridge/response/${m[1]}`, {
				status: 'error',
				error: 'Not supported by mock server',
				data: {},
				...(msg.payload?.transaction ? { transaction: msg.payload.transaction } : {})
			});
		}
	});

	ws.on('close', () => console.log('client disconnected'));
});

http.listen(PORT, () => {
	console.log(`Z2M mock listening on :${PORT} (ws path /api${AUTH_TOKEN ? ', token required' : ''})`);
});
