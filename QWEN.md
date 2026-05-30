# QWEN.md — SinAQ (AQLARA SINAC Manager)

## Project Overview

**SinAQ** is a modern water quality monitoring and management web platform. It provides an integrated system for managing water analysis data, sampling points, infrastructure, and geospatial visualization. The application features an admin dashboard with role-based access control, Excel data import, interactive Leaflet maps, and analytical tables.

### Tech Stack

- **Frontend**: Vue 3 (Composition API + `<script setup>`)
- **Build Tool**: Vite 4
- **Styling**: Tailwind CSS 3 + PrimeVue 4 (theme disabled, styled with Tailwind)
- **Routing**: Vue Router 4 (hash-based)
- **State Management**: Pinia
- **Forms**: FormKit + Vueform
- **Database**: Supabase
- **Authentication**: Azure AD / Microsoft Entra (MSAL)
- **Maps**: Leaflet + @vue-leaflet/vue-leaflet
- **Charts**: Chart.js
- **Export**: jsPDF + xlsx
- **Secrets Management**: Doppler CLI

## Building and Running

### Prerequisites

- Node.js 16+
- Doppler CLI (for environment variable management)

### Commands

```bash
# Install dependencies
npm install

# Development server (runs on localhost:3000 by default)
npm run dev

# Build for staging
npm run build:staging

# Build for production
npm run build:prod

# Build for dev environment
npm run build

# Preview production build
npm run preview

# Lint + autofix
npm run lint
```

**Note**: All commands use Doppler for environment variable injection. Ensure Doppler CLI is installed and configured with the appropriate configs (`dev`, `staging`, `prd`).

### Required Environment Variables (managed via Doppler)

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_MICROSOFT_CLIENT_ID` | Azure AD application client ID |
| `VITE_MICROSOFT_TENANT_ID` | Azure AD tenant ID |
| `VITE_BASE_URL` | Base path for deployment (default: `/sinaq/`) |
| `VITE_DEV_PORT` | Development server port (default: 3000) |

## Project Structure

```
src/
├── assets/            # Static resources
├── components/        # Reusable Vue components
├── composables/       # Shared logic (hooks)
├── constants/         # Global constants
├── css/               # Global CSS (main.css)
├── helpers/           # Utility functions
├── layouts/           # Main layouts
├── router/            # Vue Router configuration
├── services/          # API/DB/Auth services
│   ├── analiticas.js
│   ├── factorialConfig.js
│   ├── infraestructuras.js
│   ├── msalConfig.js      # Azure AD auth
│   ├── offlineSync.js     # Offline data sync
│   ├── operarios.js       # Operators service
│   ├── parametrosCalidad.js
│   ├── puntosMuestreo.js
│   ├── supabase.js        # Supabase client
│   ├── uo.js              # Operational units
│   └── zonas.js           # Zones service
├── stores/            # Pinia stores
│   ├── auth.js
│   ├── darkMode.js
│   ├── login.js         # Auth state + session timeout
│   ├── main.js
│   └── plantas.js
├── views/             # Pages/views
├── App.vue            # Root component
├── main.js            # Entry point
├── colors.js          # Color palette
├── config.js          # App config
├── menuAside.js       # Sidebar menu
└── menuNavBar.js      # Top bar menu
```

## Key Routes

| Route | Description | Auth | Role |
|---|---|---|---|
| `/login` | Azure AD login | No | — |
| `/` | Home (Excel uploader) | Yes | Non-role-10 |
| `/dashboard` | Dashboard | Yes | — |
| `/mapa` | Sampling points map | Yes | — |
| `/tablaAnaliticas` | Analytics table | Yes | — |
| `/forms` | Analytics form | Yes | Non-role-10 |
| `/admin/*` | Admin CRUD pages | Yes | Admin only |
| `/settings` | Settings panel | Yes | Admin only |
| `/sinaq` | Excel uploader (alias) | Yes | Non-role-10 |

### Admin Routes (`/admin/*`)

- `/admin/operarios` — Operators management
- `/admin/unidades_operativas` — Operational units
- `/admin/zonas` — Zones management
- `/admin/infraestructuras` — Infrastructure management
- `/admin/puntos_muestreo` — Sampling points management
- `/admin/parametros_calidad` — Quality parameters management

## Authentication & Authorization

- **Auth Method**: Azure AD (Microsoft Entra) via MSAL
- **Login Flow**: Popup on desktop, redirect on mobile
- **Session Timeout**: 30 minutes of inactivity (managed in `src/stores/login.js`)
- **Session Renewal**: Automatically renewed on each authenticated navigation
- **Persistence**: sessionStorage for user data, role, and session timestamps

### Role System

- **Admin**: Role `'99'`, `99`, or `'admin'` — full access to admin panel and settings
- **Standard User**: Access to visualization and forms
- **Role 10**: Blocked from `/`, `/forms`, and `/sinaq` routes

Route guards in `src/router/index.js` check:
1. `meta.requiresAuth` — authentication required
2. `meta.requiredRole` — specific role required (e.g., `'admin'`)
3. `meta.blockedRoles` — roles blocked from the route

## Code Style & Conventions

- **ESLint**: Vue 3 recommended rules + `eslint:recommended`
- **Prettier** (`.prettierrc.json`):
  - `semi: false` — no semicolons
  - `singleQuote: true` — single quotes
  - `tabWidth: 2` — 2-space indentation
  - `printWidth: 100` — 100 character line width
  - `trailingComma: "none"` — no trailing commas
- **Components**: Composition API with `<script setup>` syntax
- **Path Alias**: `@/` maps to `src/` (configured in `jsconfig.json`)
- **Target**: ES2022 (supports top-level await)

## Styling

- **Tailwind CSS** with `darkMode: 'class'` for dark mode support
- **PrimeVue**: Theme disabled (`theme: 'none'`), styled with Tailwind classes
- **Custom Tailwind plugins**: `aside-scrollbars` utility (light/gray variants)
- **Custom animations**: `fade-in` / `fade-out` keyframes (250ms ease-in-out)
- **Color palette**: Defined in `src/colors.js`

## Build Configuration (Vite)

- **Base path**: Dynamic via `VITE_BASE_URL` env var (default: `/sinaq/`)
- **Chunk splitting**: Vendor chunks for xlsx, jspdf, chart.js, leaflet, MSAL, Supabase, PrimeVue, FormKit, Vue ecosystem
- **Production**: Console/debugger statements stripped via esbuild `drop`
- **PWA**: Configured via `vite-plugin-pwa` with caching for Google Fonts
- **Router mode**: Hash-based (`createWebHashHistory`)

## Deployment

- Build outputs to `dist/` directory
- Deploy to Apache server at `apps.aqlara.com/sinaq/`
- `.htaccess` from `public/` is copied to `dist/` during build
- **Apache modules required**: `mod_rewrite`, `mod_headers`

## Notable Patterns

- **Service Layer**: Each domain entity has its own service file in `src/services/` with CRUD operations
- **Lazy Loading**: All route components use dynamic imports for code splitting
- **Offline Sync**: `src/services/offlineSync.js` handles offline data synchronization
- **External Integrations**: Factorial HR system integration via `factorialConfig.js`
