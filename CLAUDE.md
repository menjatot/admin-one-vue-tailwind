# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build
npm run preview   # Preview production build on port 4173
npm run lint      # ESLint with auto-fix (.vue, .js, .cjs, .mjs)
npm run format    # Prettier format src/
```

## Architecture Overview

This is the **AQLARA Admin Panel** — a water utility management SPA (Vue 3 + Vite + Tailwind CSS) for managing water supply zones, infrastructure, sampling points, and water quality analytics (analíticas).

### Auth Flow

Two auth systems work together:

1. **Microsoft MSAL** (`src/services/msalConfig.js`) handles login via Azure AD popup (desktop) or redirect (mobile).
2. **Supabase** (`src/services/supabase.js`) is the database backend. After MSAL login, user email is looked up in the `personal` table to fetch their role.
3. **`useLoginStore`** (`src/stores/login.js`) persists auth state to `localStorage` and is the primary auth check for the router guard (`requiresAuth` meta).

### Global State

**`usePlantasStore`** (`src/stores/plantas.js`) is the central data store, initialized on app mount in `App.vue`. It loads all domain entities in parallel from Supabase:
- `zonas` (zonas_abastecimiento), `operarios` (personal), `analiticas`, `puntosMuestreo`, `unidadesOperativas`, `comunidadesAutonomas`, `infraestructuras`, `tipo_infraestructura`, `zonas_infraestructuras`, `tipoPersonal`

Components consume this store rather than making individual Supabase calls in most cases.

### Routing

Uses `createWebHashHistory` (hash-based URLs). Routes with `meta.requiresAuth: true` are protected by a `beforeEach` guard that checks `loginStore.isAuthenticated`. Admin sub-routes live under `/admin/*`.

### Layouts

- `LayoutAuthenticated.vue` — full shell with NavBar, AsideMenu, FooterBar. Renders `UnAutorizedComponent` if not authenticated.
- `LayoutGuest.vue` — minimal, for login/public pages.

Navigation items are defined in `src/menuAside.js` and `src/menuNavBar.js`.

### Services Layer

`src/services/` contains one file per domain entity (e.g., `analiticas.js`, `operarios.js`, `zonas.js`, `puntosMuestreo.js`, `uo.js`, `infraestructuras.js`). These wrap Supabase queries. `supabase.js` also exports several direct utility functions (`deleteAnalitica`, `updateAnaliticabyId`, etc.).

### Permissions System

Roles (ADMIN, SUPERVISOR, OPERARIO, CONSULTOR) and their permissions are defined in `src/constants/permissions.js`. The `usePermissions` composable (`src/composables/usePermissions.js`) loads permissions from roles and exposes `hasPermission`, `hasRole`, `hasAnyPermission`, `hasAllPermissions`.

### Key Composables

- `useUploadFile` / `useExtractData` — Excel file parsing via `xlsx` for SINAQ data upload (the main feature at `/`)
- `useUploadFormData` — form-based data upload to Supabase
- `useFormSelectData` — populates form dropdowns from store data
- `useAuth` — auth helpers

### Domain Model (Supabase tables)

```
comunidades_autonomas
  └── unidades_operativas
        └── zonas_abastecimiento
              └── infraestructuras
                    └── puntos_muestreo
                          └── analiticas (water quality samples)
personal (operarios) ←→ zonas_personal (junction) ←→ zonas_abastecimiento
```

### Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_MICROSOFT_CLIENT_ID
VITE_MICROSOFT_TENANT_ID
```

### PrimeVue

PrimeVue 4 is registered with `theme: 'none'`. Component-level CSS overrides live in `src/assets/primevue/`. Some components have a `_PrimeVue` variant (e.g., `AnaliticsTable_PrimeVue.vue`, `TablaOperarios_PrimeVue.vue`) as alternatives to the default implementations.
