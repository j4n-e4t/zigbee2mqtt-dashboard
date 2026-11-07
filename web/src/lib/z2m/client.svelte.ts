import type { Z2MConfig } from '#lib/config.js';
import type { Availability, BridgeInfo, BridgeState, Device, DeviceState } from './types.js';

export type ConnectionStatus = 'connecting' | 'open' | 'closed' | 'unauthorized';

/**
 * Read-only client for Zigbee2MQTT's frontend WebSocket API.
 * Reactive via Svelte 5 runes; reconnects with backoff.
 */
export class Z2MClient {
	status = $state<ConnectionStatus>('connecting');
	bridgeState = $state<BridgeState['state'] | null>(null);
	info = $state<BridgeInfo | null>(null);
	devices = $state<Device[]>([]);
	/** Device state payloads keyed by friendly name (linkquality, battery, ...) */
	deviceStates = $state<Record<string, DeviceState>>({});
	/** `<friendly name>/availability`, only sent when Z2M's availability feature is enabled */
	availability = $state<Record<string, Availability>>({});
	lastError = $state<string | null>(null);

	#ws: WebSocket | null = null;
	#retry = 0;
	#timer: ReturnType<typeof setTimeout> | null = null;
	#stopped = false;

	constructor(readonly config: Z2MConfig) {}

	connect() {
		this.#stopped = false;
		const url = new URL(this.config.wsUrl);
		if (this.config.token) url.searchParams.set('token', this.config.token);

		this.status = 'connecting';
		const ws = new WebSocket(url);
		this.#ws = ws;

		ws.onopen = () => {
			this.status = 'open';
			this.lastError = null;
			this.#retry = 0;
		};
		ws.onmessage = (ev) => this.#handle(ev.data);
		ws.onerror = () => {
			this.lastError = `Could not connect to ${this.config.wsUrl}`;
		};
		ws.onclose = (ev) => {
			if (this.#ws !== ws) return;
			this.#ws = null;
			if (ev.code === 4401) {
				this.status = 'unauthorized';
				this.lastError = 'Zigbee2MQTT rejected the auth token';
				return;
			}
			this.status = 'closed';
			if (!this.#stopped) this.#scheduleReconnect();
		};
	}

	disconnect() {
		this.#stopped = true;
		if (this.#timer) clearTimeout(this.#timer);
		this.#ws?.close();
		this.#ws = null;
	}

	#scheduleReconnect() {
		const delay = Math.min(30_000, 1000 * 2 ** this.#retry++);
		this.#timer = setTimeout(() => this.connect(), delay);
	}

	#handle(data: unknown) {
		let msg: { topic?: string; payload?: unknown };
		try {
			msg = JSON.parse(String(data));
		} catch {
			return;
		}
		const { topic, payload } = msg;
		if (!topic) return;

		switch (topic) {
			case 'bridge/state':
				// Older Z2M versions send a plain string
				this.bridgeState =
					typeof payload === 'string' ? (payload as BridgeState['state']) : (payload as BridgeState).state;
				return;
			case 'bridge/info':
				this.info = payload as BridgeInfo;
				return;
			case 'bridge/devices':
				this.devices = payload as Device[];
				return;
		}

		if (topic.startsWith('bridge/')) return;

		if (topic.endsWith('/availability')) {
			// Z2M >= 1.30 sends { state }, older versions a plain string
			const state = typeof payload === 'string' ? payload : (payload as { state?: string } | null)?.state;
			if (state === 'online' || state === 'offline') {
				this.availability[topic.slice(0, -'/availability'.length)] = state;
			}
			return;
		}

		// Anything else is a device (or group) state topic
		if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
			this.deviceStates[topic] = { ...this.deviceStates[topic], ...(payload as Record<string, unknown>) };
		}
	}
}
