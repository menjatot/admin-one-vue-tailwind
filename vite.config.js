import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
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
            }
          ]
        }
      })
    ],
    build: {
      target: 'ES2022'
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
    }
  };
});