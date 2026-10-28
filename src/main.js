import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { plugin, defaultConfig } from '@formkit/vue'
import { initOfflineSync } from '@/services/offlineSync'
import PrimeVue from 'primevue/config'
import { registerSW } from 'virtual:pwa-register'

import config from '../formkit.config'
import '@formkit/themes/genesis'

import App from './App.vue'
import router from './router'
import { useMainStore } from '@/stores/main.js'
// import "./assets/base.css"

import './css/main.css'

// Init Pinia
const pinia = createPinia()

// Create Vue app
createApp(App)
  .use(pinia)
  .use(router)
  .use(PrimeVue, { theme: 'none' })
  .use(plugin, defaultConfig(config))
  .mount('#app')

// Init main store
const mainStore = useMainStore(pinia)
initOfflineSync()
// await supabase.initialize() // Uso de Top-level await

// Fetch sample data
mainStore.fetchSampleClients()
mainStore.fetchSampleHistory()

// Dark mode
// Uncomment, if you'd like to restore persisted darkMode setting, or use `prefers-color-scheme: dark`. Make sure to uncomment localStorage block in src/stores/darkMode.js
// import { useDarkModeStore } from './stores/darkMode'

// const darkModeStore = useDarkModeStore(pinia)

// if (
//   (!localStorage['darkMode'] && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
//   localStorage['darkMode'] === '1'
// ) {
//   darkModeStore.set(true)
// }

// Default title tag
const defaultDocumentTitle = 'AQLARA Admin Panel'

// Set document title from route meta
router.afterEach((to) => {
  document.title = to.meta?.title
    ? `${to.meta.title} — ${defaultDocumentTitle}`
    : defaultDocumentTitle
})

// --- Auto-recuperación tras despliegues ---
// Si la pestaña mantiene en memoria una versión antigua de la app y el usuario
// navega a una ruta cuyo chunk ya no existe en el servidor, el .htaccess devuelve
// index.html (text/html), los módulos no cargan y la navegación "no hace nada".
// En ese caso recargamos UNA vez para coger la versión nueva (el guard evita
// bucles si el servidor estuviera realmente roto).
const CHUNK_RELOAD_KEY = 'sinaq-chunk-reload-ts'
const reloadOnceForNewVersion = () => {
  const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0)
  if (Date.now() - last > 15000) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
    window.location.reload()
    return true
  }
  console.error(
    '[SINAQ] Un recurso de la aplicación no se pudo cargar y ya se intentó recargar hace unos segundos. Recarga manualmente (Ctrl/Cmd+Shift+R).'
  )
  return false
}

window.addEventListener('vite:preloadError', (event) => {
  console.warn('[SINAQ] Fallo al cargar un módulo (posible versión antigua tras despliegue). Recargando…', event.payload)
  reloadOnceForNewVersion()
})

router.onError((error) => {
  const msg = String(error?.message || '')
  if (/dynamically imported module|Loading chunk|module script failed|MIME type/i.test(msg)) {
    console.warn('[SINAQ] Error de carga de módulo en el router. Recargando…', msg)
    reloadOnceForNewVersion()
  }
})

// --- Actualización de la PWA ---
// La app es una PWA con el index.html y los chunks precacheados: sin esto, un
// dispositivo que ya la tenía abierta sigue ejecutando el bundle antiguo durante
// días (el service worker nuevo se activa, pero la página abierta no se recarga)
// y aparecen incidencias ya corregidas. Ahora:
//   · se comprueba si hay versión nueva al volver la app a primer plano y cada hora,
//   · al tomar el control el service worker nuevo se recarga una sola vez.
const SW_RELOAD_KEY = 'sinaq-sw-reload-ts'
const habiaServiceWorker = 'serviceWorker' in navigator && !!navigator.serviceWorker.controller

const recargarPorNuevaVersion = () => {
  const last = Number(sessionStorage.getItem(SW_RELOAD_KEY) || 0)
  if (Date.now() - last < 10000) return
  sessionStorage.setItem(SW_RELOAD_KEY, String(Date.now()))
  window.location.reload()
}

if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      const comprobarVersion = () => registration.update().catch(() => {})
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') comprobarVersion()
      })
      setInterval(comprobarVersion, 60 * 60 * 1000)
      comprobarVersion()
    }
  })

  // Solo si ya había un service worker controlando la página: en la primera
  // instalación también se dispara y no hay nada que actualizar.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (habiaServiceWorker) recargarPorNuevaVersion()
  })
}
