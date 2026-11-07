# Zigbee2MQTT Dashboard

A Home Assistant styled alternative frontend for Zigbee2MQTT, available as a
**Home Assistant App (formerly add-on)** or a standalone nginx Alpine container.
It runs alongside the official frontend and manages the same Zigbee network.

## Install in Home Assistant

[Add this app repository](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fj4n-e4t%2Fzigbee2mqtt-dashboard)

1. Open **Settings → Apps → App store → ⋮ → Repositories** (called Add-ons on older versions).
2. Add `https://github.com/j4n-e4t/zigbee2mqtt-dashboard`.
3. Install **Zigbee2MQTT Dashboard**.
4. Set `z2m_url` to your existing Zigbee2MQTT frontend URL as reached by the app,
   for example `http://45df7312-zigbee2mqtt:8080`. Set `z2m_token` if required.
5. Start the app, then **Open Web UI**. Optionally enable **Show in sidebar**.

This is a Supervisor app repository, **not a HACS integration**. It needs Home
Assistant OS or another installation with Supervisor. See [app documentation](web/DOCS.md).
The image supports amd64 and aarch64. Ingress handles authentication; no extra port
is exposed. WebSocket traffic is proxied on the same origin and the backend token
stays in the container.

## Features

- Searchable and sortable HA-style device tables, live state and writable controls.
- Device rename, options, removal, reconfigure and interview.
- Groups, members, scenes and group options.
- OTA checks, updates, scheduling and progress; Touchlink scans and resets.
- Network topology and link quality; schema-driven bridge settings and tools.
- Persistent joining status, countdown and notification history.

Some advanced per-device tabs are still scaffolding. This is an initial 0.0.1
release, not full Windfront feature parity. Back up Zigbee2MQTT before network changes.

## Standalone Docker

```sh
docker run -d --name z2m-dashboard --restart unless-stopped \
  -p 8081:80 \
  -e Z2M_UPSTREAM=http://zigbee2mqtt.local:8080 \
  -e Z2M_TOKEN=your-frontend-token \
  ghcr.io/j4n-e4t/zigbee2mqtt-dashboard:0.0.1
```

`Z2M_UPSTREAM` is the backend HTTP(S) frontend URL from the container's network.
In this mode the browser uses the dashboard's own `/api` WebSocket proxy. Put
standalone deployments behind your own authentication; only Supervisor ingress
provides Home Assistant authentication.

For direct browser connections instead, omit `Z2M_UPSTREAM` and set `Z2M_URL` to
a browser-reachable `ws://` or `wss://` endpoint ending in `/api`. In that mode
`Z2M_TOKEN` is sent to the browser in `config.js`.

## Development and releases

```sh
cd web
pnpm install --frozen-lockfile
pnpm dev
# From repository root:
node --test mock/handlers.test.mjs web/tests/notifications.test.mjs
# Or run dashboard and fake bridge together:
docker compose up --build
```

Development dashboard: http://localhost:8081; mock API: ws://localhost:8090/api.
The mock never connects to real Zigbee hardware.

The `Validate and release` GitHub Actions workflow checks the app and builds a
multi-architecture image from `web/Dockerfile` (nginx Alpine). Pushing `v0.0.1`
publishes `ghcr.io/j4n-e4t/zigbee2mqtt-dashboard:0.0.1` and `:latest`, then creates
the GitHub release. Future releases must update `web/config.yaml`,
`web/package.json`, the image version label, and `web/CHANGELOG.md` before tagging.
The app store reads its available version from the repository's default branch.
