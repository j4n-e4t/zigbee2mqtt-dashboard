// Runtime config for the dashboard. Overwritten by the Docker entrypoint from
// the Z2M_URL / Z2M_TOKEN environment variables.
//   url:   Zigbee2MQTT frontend WebSocket, e.g. "ws://z2m.local:8080/api".
//          Empty = ws(s)://<this host>:8080/api
//   token: frontend.auth_token from Z2M's configuration.yaml (if set)
window.__Z2M_CONFIG__ = { url: '', token: '' };
