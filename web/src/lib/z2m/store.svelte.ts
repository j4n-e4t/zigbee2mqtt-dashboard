// One Zigbee2MQTT connection shared by all pages (the app is client-only, ssr = false).
import { loadConfig } from '#lib/config.js';
import { Z2MClient } from './client.svelte.js';

export const config = loadConfig();
export const z2m = new Z2MClient(config);
z2m.connect();

/** Current time, updated every 15s so relative "last seen" labels stay fresh */
export const clock = $state({ now: Date.now() });
setInterval(() => (clock.now = Date.now()), 15_000);
