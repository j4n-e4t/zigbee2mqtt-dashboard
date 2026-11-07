import type { Z2MConfig } from '#lib/config.js';
import type { Availability, BridgeInfo, BridgeState, Device, DeviceState, Group, LogMessage } from './types.js';

export type ConnectionStatus = 'connecting' | 'open' | 'closed' | 'unauthorized';

/** Error returned by Zigbee2MQTT in a bridge/response (status: "error") */
export class BridgeError extends Error {}

type Pending = {
	op: string;
	resolve: (data: unknown) => void;
	reject: (error: Error) => void;
	timer: ReturnType<typeof setTimeout>;
};

const MAX_LOGS = 500;

/**
 * Client for Zigbee2MQTT's frontend WebSocket API (`/api`, frames `{ topic, payload }`).
 * Reactive via Svelte 5 runes; reconnects with backoff.
 *
 * Writes: `request(op, payload)` sends `bridge/request/<op>` and resolves with the `data` of the
 * matching `bridge/response/<op>` (matched by transaction id); `send(topic, payload)` publishes
 * device/group commands such as `<name>/set`.
 */
export class Z2MClient {
	status = $state<ConnectionStatus>('connecting');
	bridgeState = $state<BridgeState['state'] | null>(null);
	info = $state<BridgeInfo | null>(null);
	devices = $state<Device[]>([]);
	groups = $state<Group[]>([]);
	/** Device/group state payloads keyed by friendly name (linkquality, battery, ...) */
	deviceStates = $state<Record<string, DeviceState>>({});
	/** `<friendly name>/availability`, only sent when Z2M's availability feature is enabled */
	availability = $state<Record<string, Availability>>({});
	/** Other retained bridge topics (definitions, extensions, converters, health, ...) by sub-topic */
	bridge = $state<Record<string, unknown>>({});
	/** Recent bridge/logging messages, newest last */
	logs = $state<LogMessage[]>([]);
	lastError = $state<string | null>(null);

	#ws: WebSocket | null = null;
	#retry = 0;
	#timer: ReturnType<typeof setTimeout> | null = null;
	#stopped = false;
	#pending = new Map<string, Pending>();
	#txPrefix = Math.random().toString(36).slice(2, 7);
	#txCounter = 0;
	#listeners = new Set<(topic: string, payload: unknown) => void>();

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
			this.#failAll('Connection to Zigbee2MQTT lost');
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

	/** Publish a raw frame, e.g. send('Kitchen/Spots/set', { state: 'ON' }) */
	send(topic: string, payload: unknown) {
		if (!this.#ws || this.#ws.readyState !== WebSocket.OPEN) throw new Error('Not connected to Zigbee2MQTT');
		this.#ws.send(JSON.stringify({ topic, payload }));
	}

	/** Send bridge/request/<op> and wait for bridge/response/<op>; rejects with BridgeError on status "error" */
	request<T = unknown>(op: string, payload: Record<string, unknown> = {}, { timeoutMs = 30_000 } = {}): Promise<T> {
		const transaction = `${this.#txPrefix}-${++this.#txCounter}`;
		return new Promise<T>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.#pending.delete(transaction);
				reject(new Error(`No response from Zigbee2MQTT for ${op}`));
			}, timeoutMs);
			this.#pending.set(transaction, { op, resolve: resolve as (d: unknown) => void, reject, timer });
			try {
				this.send(`bridge/request/${op}`, { ...payload, transaction });
			} catch (error) {
				clearTimeout(timer);
				this.#pending.delete(transaction);
				reject(error as Error);
			}
		});
	}

	/** Observe every incoming frame (used for one-off events such as touchlink results) */
	subscribe(listener: (topic: string, payload: unknown) => void) {
		this.#listeners.add(listener);
		return () => this.#listeners.delete(listener);
	}

	#failAll(message: string) {
		for (const [tx, p] of this.#pending) {
			clearTimeout(p.timer);
			p.reject(new Error(message));
			this.#pending.delete(tx);
		}
	}

	#scheduleReconnect() {
		const delay = Math.min(30_000, 1000 * 2 ** this.#retry++);
		this.#timer = setTimeout(() => this.connect(), delay);
	}

	#resolveResponse(op: string, payload: unknown) {
		const res = (payload ?? {}) as { status?: string; data?: unknown; error?: string; transaction?: string };
		let tx = res.transaction;
		// Very old bridges don't echo the transaction: settle the oldest pending request for this op
		if (!tx || !this.#pending.has(tx)) tx = [...this.#pending].find(([, p]) => p.op === op)?.[0];
		const pending = tx ? this.#pending.get(tx) : undefined;
		if (!pending || !tx) return;
		clearTimeout(pending.timer);
		this.#pending.delete(tx);
		if (res.status === 'error') pending.reject(new BridgeError(res.error ?? `${op} failed`));
		else pending.resolve(res.data);
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
		for (const l of this.#listeners) l(topic, payload);

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
			case 'bridge/groups':
				this.groups = payload as Group[];
				return;
			case 'bridge/logging': {
				const log = { ...(payload as LogMessage), time: Date.now() };
				this.logs = [...this.logs.slice(-(MAX_LOGS - 1)), log];
				return;
			}
		}

		if (topic.startsWith('bridge/response/')) {
			this.#resolveResponse(topic.slice('bridge/response/'.length), payload);
			return;
		}
		if (topic.startsWith('bridge/')) {
			this.bridge[topic.slice('bridge/'.length)] = payload;
			return;
		}

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
