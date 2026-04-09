# SinAQ - AQLARA SINAC Manager

Sistema integral de gestión y monitoreo de calidad de agua. Plataforma web moderna para administrar datos de análisis, puntos de muestreo, infraestructuras y visualización geoespacial.

## 📋 Características

- ✅ **Carga y gestión de datos** - Importar análisis desde Excel
- ✅ **Panel de administración** - Gestión de:
  - Personal (operarios)
  - Unidades operativas
  - Zonas geográficas
  - Infraestructuras
  - Puntos de muestreo
- ✅ **Visualización en mapas** - Mapa interactivo de puntos de muestreo con Leaflet
- ✅ **Tablas analíticas** - Visualización y análisis de datos
- ✅ **Autenticación** - Integración con Azure AD (MSAL)
- ✅ **Tema oscuro/claro** - Soporte completo de dark mode
- ✅ **Seguridad de sesión** - Timeout automático y renovación de sesión
- ✅ **Control de roles** - Sistema de permisos basado en roles de usuario

## 🛠 Stack Tecnológico

- **Frontend**: Vue 3 (Composition API + `<script setup>`)
- **Build Tool**: Vite
- **Estilos**: Tailwind CSS 3
- **Ruteo**: Vue Router 4 (hash-based)
- **Estado**: Pinia
- **UI Components**: PrimeVue 4
- **Formularios**: FormKit + Vueform
- **Base de datos**: Supabase
- **Autenticación**: Azure AD (MSAL)
- **Mapas**: Leaflet + Vue Leaflet
- **Exportación**: jsPDF + xlsx
- **Gráficos**: Chart.js

## 📦 Requisitos

- Node.js 16+
- npm o yarn
- Doppler CLI (para gestión de variables de entorno)

## 🚀 Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd sinaq

# Instalar dependencias
npm install

# Configurar variables de entorno con Doppler
doppler setup
```

## 🏃 Cómo ejecutar

```bash
# Desarrollo
npm run dev

# Build staging
npm run build:staging

# Build producción
npm run build

# Preview build
npm run preview

# Lint + autofix
npm run lint
```

La aplicación se ejecutará en `http://localhost:3000` (o el puerto configurado en `VITE_DEV_PORT`).

## 📝 Variables de Entorno

Variables requeridas en Doppler:

- `VITE_SUPABASE_URL` - URL del proyecto Supabase
- `VITE_SUPABASE_ANON_KEY` - Clave anónima de Supabase
- `VITE_MICROSOFT_CLIENT_ID` - Client ID de Azure AD
- `VITE_MICROSOFT_TENANT_ID` - Tenant ID de Azure AD
- `VITE_BASE_URL` - Base path de deployment (default: `/sinaq/`)
- `VITE_DEV_PORT` - Puerto de desarrollo (default: 3000)

## 📂 Estructura del Proyecto

```
src/
├── components/        # Componentes reutilizables
├── composables/       # Lógica compartida (hooks)
├── constants/         # Constantes globales
├── helpers/           # Funciones auxiliares
├── layouts/           # Layouts principales
├── router/            # Configuración de ruteo
├── services/          # Servicios (API, autenticación, BD)
├── stores/            # Estado global (Pinia)
├── views/             # Páginas/Vistas
├── assets/            # Recursos estáticos
├── App.vue            # Componente raíz
└── main.js            # Punto de entrada
```

## 🔐 Autenticación

- **Método**: Azure AD (Microsoft Entra)
- **Librería**: MSAL (@azure/msal-browser)
- **Tipo de login**: Popup en desktop, redirect en mobile
- **Session timeout**: 30 minutos de inactividad
- **Auto-logout**: Se ejecuta automáticamente tras expiración

## 🔑 Sistema de Roles y Permisos

- **Admin** - Rol '99', 99 o 'admin' (acceso a panel de administración)
- **Usuario estándar** - Acceso a visualización y formularios
- **Rutas protegidas** - Verificadas en guardias de Router

## 📊 Rutas Principales

- `/` - Home (Excel uploader)
- `/login` - Autenticación
- `/mapa` - Visualización de puntos en mapa
- `/tablaAnaliticas` - Tabla de datos analíticos
- `/forms` - Formulario de análitica
- `/admin/operarios` - Gestión de personal
- `/admin/unidadesOperativas` - Gestión de unidades
- `/admin/zonas` - Gestión de zonas
- `/admin/infraestructuras` - Gestión de infraestructuras
- `/admin/puntosMuestreo` - Gestión de puntos de muestreo

## 🎨 Personalización

### Tema (Dark Mode)
Controlado por Pinia store `darkMode`. Usa clases CSS `dark:` de Tailwind.

### Colores
Ver `src/colors.js` para paleta de colores personalizada.

### Menús
- `src/menuAside.js` - Menú lateral
- `src/menuNavBar.js` - Barra superior

## 📦 Despliegue

### En Producción

```bash
npm run build
```

Sube el contenido de `dist/` a tu servidor:

```bash
# Ejemplo: servidor Apache
scp -r dist/* user@server:/var/www/apps.aqlara.com/sinaq/
```

### Requisitos Apache

- `mod_rewrite` - Para Vue Router
- `mod_headers` - Para CORS y headers de seguridad
- `.htaccess` configurado (se copia automáticamente desde `public/.htaccess`)

## 🐛 Troubleshooting

### 403 Forbidden después de deployment
1. Verificar que `.htaccess` existe en el directorio de despliegue
2. Revisar permisos: `644` para archivos, `755` para directorios
3. Confirmar que `mod_rewrite` y `mod_headers` están habilitados en Apache

### Error de sesión expirada
- Session timeout: 30 minutos de inactividad
- Se renueva automáticamente con cada actividad del usuario
- Check: `src/stores/login.js`

## 📄 Licencia

MIT

## 👥 Autor

Alejandro Mínguez Escriba

## 📧 Soporte

Para reportar issues o sugerencias, contactar al equipo de desarrollo de AQLARA (alejandro.minguez@aqlara.com)
