# Zigbee2MQTT custom dashboard

See README.md for layout, dev stack and deployment.

## Architecture
- Read-only for now: no writes to the bridge or devices (core management is explicitly deferred).
- One shared connection: `#lib/z2m/store.svelte.ts` (`z2m`, `config`, `clock`). Pages import it; don't create clients.
- Hash router (`router: { type: 'hash' }`): links must start with `#/`; page options (`ssr`, `prerender`) are not allowed.
- Exposes → display rows in `#lib/z2m/exposes.ts`; formatting (battery, LQI, last seen, docs URL) in `#lib/z2m/format.ts`.
- Per-browser preferences (columns, sort) in `#lib/prefs.svelte.ts` (localStorage, failure-tolerant).
- Data shapes follow Z2M's frontend WebSocket topics; extend `mock/devices.mjs` alongside any new feature.

## UI must look native to Home Assistant
- Theme tokens live in `web/src/routes/layout.css`: HA's own CSS variables (values copied from the
  home-assistant/frontend source, `src/resources/theme/**`), with shadcn tokens mapped onto them.
  Use the HA variables / mapped Tailwind colors (`bg-table`, `text-muted-foreground`, `text-icon`, ...),
  never hard-coded colors.
- Metrics mirror HA components: `hass-subpage` toolbar (56px, `px-3 py-2`, 20px title at `ms-6`),
  `hass-tabs-subpage-data-table` search bar (56px, 32px/10px-radius input; 40px/8px when narrow),
  `ha-data-table` (56px header, 12px medium header text, 52px rows, 16px cell inset / 8px narrow),
  `ha-label` dense chips (`.ha-label[data-tone]`). Narrow breakpoint is 870px (`ha.narrow`).
  `hass-tabs-subpage` tabs (desktop: centered in toolbar, 2px primary underline; narrow: bottom bar),
  `ha-card` (12px radius, 1px divider border, 24px header), `hui-generic-entity-row` (40px icon badge
  in `--state-icon-color`), device page container (max 1280px, 16px gutter, 32px top margin).
- Icons: `@mdi/js` paths via `#lib/components/ha-icon.svelte` (what HA uses), not lucide.
- `#lib/home-assistant.svelte.ts` syncs the live HA theme when embedded same-origin; otherwise
  follows the system dark mode via `data-theme`.
- Sister project with the same approach: https://github.com/j4n-e4t/ha-editor
- When checking a new HA-styled component, read its source in home-assistant/frontend rather than guessing values.
