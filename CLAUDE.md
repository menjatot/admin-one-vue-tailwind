# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` (Vite development server with Doppler dev config)
- **Build for staging**: `npm run build:staging` (Vite build with Doppler staging config)
- **Build for production**: `npm run build` (Vite build with Doppler production config)
- **Preview production build**: `npm run preview` (Preview build with Doppler production config)
- **Lint code**: `npm run lint` (ESLint with auto-fix)

**Note**: All commands use Doppler for environment variable management. Ensure Doppler CLI is installed and configured.

## Deployment to Production

### Building for Production

1. Run `npm run build` to create production build with Doppler production config
2. The build outputs to `dist/` directory
3. Upload the entire `dist/` folder contents to the server path `apps.aqlara.com/sinaq/`

### Important: .htaccess Configuration

- The `.htaccess` file is located in `public/.htaccess`
- Vite automatically copies files from `public/` to `dist/` during build
- **The `.htaccess` file is required** for Vue Router hash mode and CORS headers
- After uploading to server, verify `.htaccess` is present in `/sinaq/.htaccess`
- Recommended permissions: `.htaccess` = 644, directories = 755, files = 644

### Apache Requirements

The application requires the following Apache modules enabled:
- `mod_rewrite` - For Vue Router URL handling
- `mod_headers` - For CORS and security headers

### Troubleshooting 403 Forbidden

If you get 403 Forbidden after deployment:
1. Verify `.htaccess` exists in the deployment directory
2. Check file permissions (644 for files, 755 for directories)
3. Ensure `mod_rewrite` and `mod_headers` are enabled in Apache
4. Verify `index.html` exists in the root deployment directory

## Project Architecture

This is a Vue 3 admin dashboard application built with:

- **Vue 3** with Composition API and `<script setup>` syntax
- **Vite** as build tool with custom base path `/sinaq/`
- **Tailwind CSS 3** for styling with custom scrollbar utilities
- **Vue Router 4** with hash-based routing and authentication guards
- **Pinia** for state management
- **PrimeVue 4** UI component library with custom theming
- **FormKit** for form handling
- **Vueform** for advanced form components

### Key Dependencies

- **@azure/msal-browser**: Microsoft authentication (MSAL)
- **@supabase/supabase-js**: Database integration
- **axios**: HTTP client
- **chart.js**: Data visualization
- **leaflet + @vue-leaflet/vue-leaflet**: Interactive maps
- **jspdf + jspdf-autotable**: PDF generation
- **xlsx**: Excel file handling
- **date-fns**: Date manipulation

### Environment Management

This project uses **Doppler** for secure environment variable management:

- **Environment variables** are injected automatically via Doppler CLI
- **Configs**: `dev`, `staging`, `production` (mapped in package.json scripts)
- **Required variables**:
  - `VITE_SUPABASE_URL`: Supabase project URL
  - `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
  - `VITE_MICROSOFT_CLIENT_ID`: Azure AD application client ID
  - `VITE_MICROSOFT_TENANT_ID`: Azure AD tenant ID
  - `VITE_BASE_URL`: Base path for deployment (defaults to `/sinaq/`)
  - `VITE_DEV_PORT`: Development server port (defaults to 3000)

### Application Structure

#### Authentication & Routing
- **Authentication flow**: Microsoft Azure AD via MSAL (`src/services/msalConfig.js`)
- **Session management**: 30-minute timeout with auto-logout in `src/stores/login.js`
- **Route guards** in `src/router/index.js`:
  - Routes with `meta.requiresAuth: true` require authentication
  - Routes with `meta.requiredRole: 'admin'` require admin privileges (role '99', 99, or 'admin')
  - Session expiry checked on each navigation with `checkSessionExpiry()`
  - Session renewed on each authenticated route navigation via `renewSession()`
- **User state persistence**: sessionStorage for user data, avatar, role, and session timestamps
- **Router mode**: Hash-based routing (`createWebHashHistory`)
- **Unauthenticated users** redirected to `/login`
- **Unauthorized users** redirected to `/unauthorized`

#### Main Application Areas
- **Home** (`/`): Excel uploader and analytics (`ExcelUploaderView.vue`)
- **Admin Panel** (`/admin/*`): CRUD operations requiring admin role
  - `/admin/operarios`: Operators management
  - `/admin/unidades_operativas`: Operational units management
  - `/admin/zonas`: Zones management
  - `/admin/infraestructuras`: Infrastructure management
  - `/admin/puntos_muestreo`: Sampling points management
- **Map Visualization** (`/mapa`): Interactive map of sampling points using Leaflet
- **Analytics Table** (`/tablaAnaliticas`): Table view of analytics data
- **Settings** (`/settings`): Configuration panel (admin only)

#### Service Layer Architecture
Services in `src/services/` handle data operations:
- **Authentication**: `msalConfig.js` (Microsoft authentication integration)
- **Database**: `supabase.js` (Supabase client configuration)
- **Domain Services**: Separate files for each entity (operarios, uo, zonas, infraestructuras, puntosMuestreo, analiticas)
- **External APIs**: `factorialConfig.js` (Factorial HR integration)

#### Store Management (Pinia)
- **main.js**: Sample data and general app state
- **login.js**: Authentication state with session timeout management
  - Watchers persist state to sessionStorage
  - Session timeout clears after 30 minutes of inactivity
  - Provides `login()`, `logout()`, `renewSession()`, `checkSessionExpiry()`
- **auth.js**: Additional auth utilities
- **plantas.js**: Plant/facility data
- **darkMode.js**: Theme switching

### Code Style & Standards

- **ESLint**: Vue 3 recommended + eslint:recommended rules
- **Prettier**: 2 spaces, single quotes, no semicolons, 100 char width, no trailing commas
- **Components**: Use Composition API with `<script setup>` syntax
- **Path alias**: `@/` points to `src/` directory
- **ECMAScript**: Target ES2022 (top-level await supported)

### Custom Styling

- **Tailwind extended** with custom scrollbar utilities (`aside-scrollbars` with light/gray variants)
- **PrimeVue theming**: Disabled in favor of Tailwind classes (`theme: 'none'`)
- **Custom animations**: fade-in/fade-out keyframes and transitions
- **Dark mode**: Supported via CSS classes (`darkMode: 'class'` in Tailwind config)
- **Responsive layout**: Mobile-first design with collapsable sidebar

### Build Configuration

- **Vite target**: ES2022 for top-level await support
- **Base path**: Dynamic via `VITE_BASE_URL` environment variable (defaults to `/sinaq/`)
- **Vue options**: Production hydration mismatch details disabled (`__VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false`)
- **Dev server port**: Configurable via `VITE_DEV_PORT` (defaults to 3000)
- **Asset handling**: Static assets served from configured base path

### Important Development Notes

- **Microsoft Authentication**: Uses popup-based login for desktop, redirect-based for mobile devices
- **Graph API Integration**: Fetches user profile including photo from Microsoft Graph API
- **Supabase Client**: Auto-refresh tokens enabled with persistent session support
- **Service Layer Pattern**: Each domain entity has its own service file with CRUD operations
- **Composables**: Reusable logic in `src/composables/` for auth, permissions, data loading, etc.