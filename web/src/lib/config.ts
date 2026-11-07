// Runtime configuration. Loaded from /config.js (see static/config.js) so the
// same static build can point at any Zigbee2MQTT instance without rebuilding.

declare global {
	interface Window {
		__Z2M_CONFIG__?: { url?: string; token?: string };
	}
}

export type Z2MConfig = {
	/** WebSocket URL of Z2M's frontend API, e.g. ws://z2m.local:8080/api */
	wsUrl: string;
	/** HTTP base of the Z2M frontend, used to resolve relative device icons */
	httpBase: string;
	token: string;
};

export function loadConfig(): Z2MConfig {
	const raw = window.__Z2M_CONFIG__ ?? {};
	// Dev convenience: VITE_Z2M_URL / VITE_Z2M_TOKEN (e.g. in web/.env.local) when config.js is empty
	const envUrl = import.meta.env.VITE_Z2M_URL as string | undefined;
	const envToken = import.meta.env.VITE_Z2M_TOKEN as string | undefined;
	const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
	const wsUrl = raw.url?.trim() || envUrl?.trim() || `${proto}//${location.hostname}:8080/api`;

	const http = new URL(wsUrl);
	http.protocol = http.protocol === 'wss:' ? 'https:' : 'http:';
	http.pathname = http.pathname.replace(/\/api\/?$/, '/');
	http.search = '';

	return { wsUrl, httpBase: http.toString(), token: raw.token?.trim() || envToken?.trim() || '' };
}
