// Stateful fake Zigbee2MQTT bridge: holds devices, groups, states and settings, answers
// bridge/request/* like the real bridge and handles <name>/set and <name>/get.
// Request handlers live in ./handlers.mjs; each returns `data` or throws to produce an error response.

import { availability, bridgeInfo, devices as initialDevices, groups as initialGroups, states } from './devices.mjs';
import { createHandlers } from './handlers.mjs';

export function createBridge({ broadcast }) {
	const db = {
		devices: structuredClone(initialDevices),
		groups: structuredClone(initialGroups),
		info: structuredClone(bridgeInfo),
		states, // friendly name -> state (shared with the live-update ticker)
		availability,
		groupStates: {},
		permitJoinTimer: null
	};

	const log = (level, message, namespace = 'z2m') => broadcast('bridge/logging', { level, message, namespace });
	const publish = {
		devices: () => broadcast('bridge/devices', db.devices),
		groups: () => broadcast('bridge/groups', db.groups),
		info: () => broadcast('bridge/info', db.info),
		state: (name) => broadcast(name, db.states[name] ?? db.groupStates[name] ?? {}),
		availability: (name) => db.availability[name] && broadcast(`${name}/availability`, { state: db.availability[name] }),
		event: (type, data) => broadcast('bridge/event', { type, data }),
		log
	};

	const find = {
		device: (id) => {
			const key = typeof id === 'string' ? id.trim() : id;
			return db.devices.find((d) => d.ieee_address === key || d.friendly_name === key || d.network_address === key);
		},
		group: (id) => {
			const key = typeof id === 'string' ? id.trim() : id;
			return db.groups.find((g) => g.friendly_name === key || g.id === key || String(g.id) === String(key));
		},
		entity: (name) => find.device(name) ?? find.group(name)
	};

	const handlers = createHandlers({ db, publish, find, broadcast });

	/** Apply a /set payload to a device (or every member of a group), publishing the new state */
	function applySet(entityName, payload) {
		const group = find.group(entityName);
		const device = group ? undefined : find.device(entityName);
		if (!group && !device) return log('error', `Entity '${entityName}' is unknown`);
		const special = handlers.$set?.(group ?? device, payload, { isGroup: !!group }) ?? {};
		const values = { ...payload };
		for (const k of special.consumed ?? []) delete values[k];
		if (values.state === 'TOGGLE') {
			const cur = (group ? db.groupStates[group.friendly_name] : db.states[device.friendly_name])?.state;
			values.state = cur === 'ON' ? 'OFF' : 'ON';
		}
		if (!Object.keys(values).length) return;
		if (group) {
			db.groupStates[group.friendly_name] = { ...db.groupStates[group.friendly_name], ...values };
			publish.state(group.friendly_name);
			for (const m of group.members) {
				const d = find.device(m.ieee_address);
				if (!d) continue;
				db.states[d.friendly_name] = { ...db.states[d.friendly_name], ...values, last_seen: new Date().toISOString() };
				publish.state(d.friendly_name);
			}
		} else {
			db.states[device.friendly_name] = { ...db.states[device.friendly_name], ...values, last_seen: new Date().toISOString() };
			publish.state(device.friendly_name);
		}
		log('info', `Publish 'set' to '${entityName}': ${JSON.stringify(payload)}`, 'z2m:publish');
	}

	return {
		onConnect(send) {
			// Same initial burst Z2M sends: retained bridge topics, then states and availability.
			send('bridge/state', { state: 'online' });
			send('bridge/info', db.info);
			send('bridge/devices', db.devices);
			send('bridge/groups', db.groups);
			for (const [topic, payload] of Object.entries(handlers.$retained?.() ?? {})) send(topic, payload);
			for (const [name, s] of Object.entries(db.states)) send(name, s);
			for (const [name, s] of Object.entries(db.groupStates)) send(name, s);
			for (const [name, state] of Object.entries(db.availability)) send(`${name}/availability`, { state });
		},

		async onMessage(topic, payload, reply) {
			const req = topic.match(/^bridge\/request\/(.+)$/);
			if (req) {
				const op = req[1];
				const transaction = payload?.transaction;
				const respond = (body) => reply(`bridge/response/${op}`, { ...body, ...(transaction !== undefined ? { transaction } : {}) });
				const handler = handlers[op];
				if (!handler) return respond({ data: {}, status: 'error', error: `Request '${op}' is not supported by the mock server` });
				try {
					const { transaction: _t, ...rest } = payload && typeof payload === 'object' ? payload : { value: payload };
					const data = await handler(rest);
					respond({ data: data ?? {}, status: 'ok' });
				} catch (error) {
					log('error', `Request '${topic}' failed with error: '${error.message}'`, 'z2m');
					respond({ data: {}, status: 'error', error: error.message });
				}
				return;
			}

			const set = topic.match(/^(.+)\/set(?:\/([^/]+))?$/);
			if (set) {
				const body = set[2] ? { [set[2]]: payload } : payload;
				if (body && typeof body === 'object') applySet(set[1], body);
				return;
			}
			const get = topic.match(/^(.+)\/get$/);
			if (get) {
				const entity = find.entity(get[1]);
				if (entity) publish.state(entity.friendly_name);
			}
		}
	};
}
