# Zigbee2MQTT custom dashboard

A custom, read-only frontend for [Zigbee2MQTT](https://www.zigbee2mqtt.io/) that runs **alongside** the
official UI / Windfront. It connects from the browser to Z2M's frontend WebSocket API (`/api`), the
same API the official frontend uses.

Styled to look native to Home Assistant (HA theme variables, `ha-data-table` / `hass-subpage` metrics,
Roboto, MDI icons); when embedded in HA on the same origin it follows the active HA theme.

Current feature: a device table (image, name, vendor/model, IEEE/network address, type, power,
firmware, status). Device images use the same sources as the official frontend:
`definition.icon` → `zigbee2mqtt.io/images/devices/<model>.png` → vendor image → generic fallback.

## Layout

| Path | What |
| --- | --- |
| `web/` | SvelteKit (Svelte 5) + shadcn-svelte + Tailwind, built as a static SPA (`adapter-static`) |
| `mock/` | Tiny Node mock of Z2M's WebSocket API with 19 fake devices |
| `docker-compose.yml` | Local dev stack: mock + dashboard |

## Local development

```sh
# Option A: everything in Docker
docker compose up --build
# dashboard → http://localhost:8081, mock Z2M → ws://localhost:8090/api

# Option B: hot reload
docker compose up -d z2m-mock
cd web && pnpm install
echo 'VITE_Z2M_URL=ws://localhost:8090/api' > .env.local   # gitignored; add VITE_Z2M_TOKEN=... if needed
pnpm dev
```

## Installing next to a real Zigbee2MQTT

The dashboard is static files served by nginx. Configuration happens at container start:

| Env var | Meaning |
| --- | --- |
| `Z2M_URL` | Z2M frontend WebSocket **as reached from the browser**, e.g. `ws://192.168.1.10:8080/api` (`wss://` behind HTTPS). Empty = `ws://<dashboard host>:8080/api` |
| `Z2M_TOKEN` | `frontend.auth_token` from Z2M's `configuration.yaml`, if set |

```yaml
# add to the compose file that runs zigbee2mqtt
  z2m-dashboard:
    build: ./path/to/this/repo/web    # or a pushed image
    restart: unless-stopped
    ports:
      - "8081:80"
    environment:
      Z2M_URL: "ws://192.168.1.10:8080/api"
      Z2M_TOKEN: ""
```

Notes:
- The token ends up in `config.js`, readable by anyone who can open the dashboard, so it offers the
  same protection as the official UI's token prompt and nothing more. Keep it on your LAN or behind a
  proxy with auth.
- If the dashboard is served over HTTPS, `Z2M_URL` must be `wss://` (put Z2M behind the same reverse proxy).
- Without Docker: `cd web && pnpm build`, copy `web/build/` to any static web server, and edit `config.js`.
