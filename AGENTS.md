# AGENTS.md

## Quick start

Every `npm run *` command (except `install`) is prefixed with `doppler run`. Doppler CLI must be installed and authenticated or nothing works.

## Commands

| Command | What it does | Doppler config |
|---|---|---|
| `npm run dev` | Vite dev server (default port 3000) | `dev` |
| `npm run build` | Build (base `/sinaq/`, drops console in prod) | `dev` |
| `npm run build:prod` | Production build | `prd` |
| `npm run build:staging` | Staging build | `staging` |
| `npm run preview` | Preview production build | `production` |

No lint script exists in package.json. Run ESLint directly: `npx eslint --fix src/`.

No test framework is configured.

## Key gotchas

- **`npm run build` uses Doppler `dev`, not production.** Use `build:prod` for production.
- **Production Doppler config is `prd`, not `production`.** `preview` uses `production` config.
- **Hash-based routing** (`createWebHashHistory`): all routes live after `#` in the URL. The `.htaccess` in `public/` is still required for Apache deployments.
- **Base path `/sinaq/`** is dynamic via `VITE_BASE_URL` env var (default `/sinaq/`). Set in `vite.config.js`.
- **No test suite.** Verify changes by running `npm run dev` and manually checking. Run `npx eslint` if you want lint checks.
- **Production builds strip `console` and `debugger`** via esbuild `drop` (see `vite.config.js:119`).
- **PWA is enabled** via `vite-plugin-pwa` with Workbox caching for Google Fonts and OpenStreetMap tiles.
- **`.mcp.json` contains a hardcoded Supabase access token.** Do not commit changes to this file inadvertently.

## Auth & roles

- Azure AD (MSAL) authentication. Popup on desktop, redirect on mobile.
- 30-minute session timeout. Auto-logout on expiry. Session renewed on each authenticated navigation.
- User state persisted in `sessionStorage` (user data, role, session timestamps).
- Admin role: `'99'`, `99`, or `'admin'` — all treated as equivalent.
- Role `10` (number or string) is blocked from `/`, `/forms`, `/sinaq` routes.
- Route guards in `src/router/index.js` check `meta.requiresAuth`, `meta.requiredRole`, and `meta.blockedRoles`.

## Code style

- Prettier: no semicolons, single quotes, 2-space indent, 100 char width, no trailing commas.
- ESLint: `plugin:vue/vue3-recommended` + `eslint:recommended` + `@vue/eslint-config-prettier/skip-formatting`.
- Composition API with `<script setup>` everywhere. No Options API.
- Path alias `@/` maps to `src/`.
- Components are PascalCase. Views use `*View.vue` suffix. Stores are camelCase.
- PrimeVue theme is set to `'none'` — all styling via Tailwind classes.
- Vueform locale is Spanish (`es`).

## Architecture

Single-page app. Service layer in `src/services/` with one file per domain entity (operarios, uo, zonas, infraestructuras, puntosMuestreo, analiticas, etc.), each wrapping Supabase CRUD. Stores in `src/stores/` via Pinia. Composables in `src/composables/`.

Build output goes to `dist/`. Deploy by uploading `dist/` contents to `apps.aqlara.com/sinaq/`. Apache needs `mod_rewrite` + `mod_headers`.

## Other instruction files

- `CLAUDE.md` — comprehensive but has inaccuracies (claims `npm run lint` exists; claims `npm run build` uses production Doppler config). Trust this file and `package.json` over CLAUDE.md for commands.
- `WARP.md`, `GEMINI.md`, `QWEN.md` — similar overviews with varying accuracy.
