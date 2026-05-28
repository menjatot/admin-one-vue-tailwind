import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
/// <reference types="vitest" />
import vue from "@vitejs/plugin-vue";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
// export default defineConfig({
//   base: "/sinaq/",
//   plugins: [vue()],
//   build: {
//     target: 'ES2022' // Asegura que esbuild soporta Top-level await
//   },
//   define: {
//     '__VUE_PROD_HYDRATION_MISMATCH_DETAILS__': false,
//     // Otras banderas de características que necesites
//   },
//   resolve: {
//     alias: {
//       "@": fileURLToPath(new URL("./src", import.meta.url)),
//     },
//   },
// });
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno (Doppler las inyectará automáticamente)
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    base: env.VITE_BASE_URL || "/sinaq/",
    plugins: [
      vue(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        devOptions: {
          enabled: true
        },
        manifest: {
          name: 'SinAQ - AQLARA',
          short_name: 'SinAQ',
          description: 'AQLARA SINAC Manager',
          theme_color: '#1e3a8a',
          icons: [
            {
              src: 'aqlara_logo_sq_icon_small.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'aqlara_logo_sq_icon_small.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                }
              }
            },
            {
              urlPattern: ({ url }) => url.hostname.endsWith('tile.openstreetmap.org'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'osm-tiles',
                expiration: {
                  maxEntries: 2000,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                },
                cacheableResponse: { statuses: [0, 200] }
              }
            }
          ]
        }
      })
    ],
    build: {
      target: 'ES2022',
      minify: 'esbuild',
      rollupOptions: {
        output: {
          // Function form matches real file paths (id), preventing duplicate chunks
          // when different entry points (ESM vs CJS) resolve to different files of
          // the same package (e.g. leaflet-src.esm.js vs leaflet.js).
          manualChunks(id) {
            if (id.includes('node_modules/xlsx')) return 'xlsx-vendor'
            if (id.includes('node_modules/jspdf')) return 'pdf-vendor'
            if (id.includes('node_modules/chart.js') || id.includes('node_modules/chart-js')) return 'chart-vendor'
            if (
              id.includes('node_modules/leaflet') ||
              id.includes('node_modules/@vue-leaflet')
            ) return 'leaflet-vendor'
            if (id.includes('node_modules/@azure/msal')) return 'msal-vendor'
            if (id.includes('node_modules/@supabase')) return 'supabase-vendor'
            if (id.includes('node_modules/primevue')) return 'primevue-vendor'
            if (id.includes('node_modules/@formkit') || id.includes('node_modules/formkit')) return 'formkit-vendor'
            if (
              id.includes('node_modules/vue-router') ||
              id.includes('node_modules/vue-demi') ||
              id.includes('node_modules/pinia') ||
              id.includes('node_modules/@vue/') ||
              id.includes('node_modules/vue/')
            ) return 'vue-vendor'
          }
        }
      }
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    define: {
      '__VUE_PROD_HYDRATION_MISMATCH_DETAILS__': false,
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      // Configuración específica para desarrollo
      port: parseInt(env.VITE_DEV_PORT) || 3000,
    },
    test: {
      environment: 'happy-dom',
      include: ['src/**/*.{test,spec}.{js,ts}']
    }
  };
});