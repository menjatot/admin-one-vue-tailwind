<script setup>
import BaseButton from '@/components/BaseButton.vue'
import CardBox from '@/components/CardBox.vue'
import SectionTitleLineWithButton from '@/components/SectionTitleLineWithButton.vue'
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import { mdiChevronDown, mdiChevronUp, mdiCrosshairsGps, mdiDownload, mdiFilter, mdiFlaskEmptyOutline, mdiMap } from '@mdi/js'
import BaseIcon from '@/components/BaseIcon.vue'

import { usePlantasStore } from '@/stores/plantas'
import {useLoginStore} from '@/stores/login'
import { usePermissions } from '@/composables/usePermissions'

import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { LMap, LTileLayer, LMarker, LTooltip } from '@vue-leaflet/vue-leaflet'
import { computed, ref, watch } from 'vue'
import CardBoxModal from '@/components/CardBoxModal.vue'
import FormAnalitica from '@/components/FormAnalitica.vue'
import { getIconByInfraestructura, getInfraPinColors, markerDivIcon, filtrarPuntosMapa, tipoBucketDePunto } from '@/helpers/maps'
import L from 'leaflet'
import 'leaflet.markercluster'
import { onMounted } from 'vue'
// Force all Leaflet consumers (vue-leaflet, markercluster, our code) to share the same instance.
// Without this, Vite loads the ESM entry for imports and the UMD entry for CJS requires,
// producing two incompatible LatLngBounds class hierarchies that break markercluster.
window.L = L
import aqlaraIcon from '@/assets/icons/aqlara-icon-192.png'
import AqlaraLogo from '@/components/AqlaraLogo.vue'

const plantasStore = usePlantasStore()
const loginStore=useLoginStore()
const isModalActive = ref(false)
const historyOnly = ref(false)

const { isVisualizador, canWrite: canCreateAnalitica, seeAllZones } = usePermissions()
const selectedPunto = ref(null)
const isLoading = ref(false)
const geoLocationError = ref(null)
const map=ref(null)

const center=ref([39.4679255214283, -0.3762874990439122])
const zoom = ref(13)
const userLocation = ref(null)
let clusterGroup = null
let popupOpenHandler = null
const mapLoaded = ref(false)

const buildClusterGroup = () => {
  const leafletMap = map.value?.leafletObject
  if (!leafletMap || !mapLoaded.value) return
  // Wait until infraestructuras are available — icons depend on them
  if (!plantasStore.getInfraestructuras.length) return

  // Clean up previous cluster and its event listener
  if (clusterGroup) {
    leafletMap.removeLayer(clusterGroup)
    clusterGroup = null
  }
  if (popupOpenHandler) {
    leafletMap.off('popupopen', popupOpenHandler)
    popupOpenHandler = null
  }
  clusterGroup = L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 60,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
  })

  const useCreate = canCreateAnalitica.value
  const buttonLabel = useCreate ? 'Añadir analítica' : 'Ver analíticas'
  const action = useCreate ? 'crear' : 'ver'

  puntosMapa.value.forEach((punto) => {
    if (!punto.posicion) return

    const marker = L.marker([punto.posicion.lat, punto.posicion.lon], {
      icon: markerDivIcon(getIconByInfraestructura(punto.infraestructura_fk)),
      draggable: false,
    })

    marker.bindTooltip(`<b>${punto.name}</b><br><span style="font-size:0.85em">id: ${punto.id}</span>`)
    marker.bindPopup(`
      <div style="text-align:center;min-width:150px">
        <p style="font-weight:bold;margin:0 0 4px">${punto.name}</p>
        <p style="font-size:0.85em;margin:0 0 8px">SINAC Id: ${punto.id}</p>
        <button
          data-punto-id="${punto.id}"
          data-action="${action}"
          style="background:#3b82f6;color:#fff;padding:5px 14px;border-radius:4px;border:none;cursor:pointer;font-size:0.9em"
        >${buttonLabel}</button>
      </div>
    `)
    clusterGroup.addLayer(marker)
  })

  // Single delegated click handler for popup buttons
  popupOpenHandler = (e) => {
    const btn = e.popup.getElement()?.querySelector('button[data-punto-id]')
    if (!btn) return
    btn.addEventListener('click', () => {
      const puntoId = Number(btn.dataset.puntoId)
      const punto = puntosMuestreo.value.find((p) => p.id === puntoId)
      if (!punto) return
      if (btn.dataset.action === 'crear') crearAnalitica(punto)
      else verAnaliticas(punto)
      leafletMap.closePopup()
    }, { once: true })
  }
  leafletMap.on('popupopen', popupOpenHandler)

  leafletMap.addLayer(clusterGroup)
}

const onMapReady = () => {
  const leafletMap = map.value.leafletObject
  const afterLoad = () => {
    mapLoaded.value = true
    buildClusterGroup()
  }
  // _loaded is set by Leaflet after setView() is first called
  if (leafletMap._loaded) {
    afterLoad()
  } else {
    leafletMap.once('load', afterLoad)
  }
}

// Icono para la posición actual del usuario (círculo azul pulsante)
const userLocationIcon = L.divIcon({
  html: `
    <div class="user-location-marker">
      <div class="user-location-pulse"></div>
      <div class="user-location-dot"></div>
    </div>
  `,
  className: 'user-location-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

const crearAnalitica = (puntoId) => {
  historyOnly.value = false
  isModalActive.value = true
  selectedPunto.value = puntoId
}

const verAnaliticas = (puntoId) => {
  historyOnly.value = true
  isModalActive.value = true
  selectedPunto.value = puntoId
}
// const crearAnalitica = (puntoId) => {
//   isModalActive.value = true
//   selectedPuntoId.value = puntoId.id
// }

// const puntosMuestreo = computed(() => plantasStore.getPuntosMuestreo.filter((punto) => punto.activo))

const puntosMuestreo = computed(() => {
  // Si es rol 99, mostrar todos los puntos activos
  if (seeAllZones.value) {
    return plantasStore.getPuntosMuestreo.filter((punto) => punto.activo)
  }
  
  // Para otros roles, filtrar por las zonas del operario
  const operarioActual = plantasStore.getOperarios.find(
    (op) => op.email?.toLowerCase() === loginStore.userEmail?.toLowerCase()
  )
  
  if (!operarioActual || !operarioActual.zonas || operarioActual.zonas.length === 0) {
    console.warn('Operario sin zonas asignadas:', loginStore.userEmail)
    return [] // No mostrar puntos si no tiene zonas asignadas
  }
  
  // Obtener IDs de zonas asignadas al operario
  const zonasIds = operarioActual.zonas.map(zona => 
    typeof zona === 'object' ? zona.id : zona
  )
  
  console.log('Zonas asignadas al operario:', zonasIds)
  
  // Filtrar puntos de muestreo por zona y activos
  return plantasStore.getPuntosMuestreo.filter(punto => 
    punto.activo && zonasIds.includes(punto.zona_fk)
  )
})

// ─── Filtro de tipos de punto en el mapa ─────────────────────────────────────
// Preferencia por dispositivo (localStorage). null = mostrar todos los tipos;
// array de buckets (ids de tipo de infraestructura o 'sin') = solo esos.
const TIPOS_STORAGE_KEY = 'sinaq.mapa.tiposVisibles'

const cargarTiposVisibles = () => {
  try {
    const raw = localStorage.getItem(TIPOS_STORAGE_KEY)
    if (!raw) return null
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : null
  } catch {
    return null
  }
}

const tiposVisibles = ref(cargarTiposVisibles())
const panelTiposAbierto = ref(typeof window !== 'undefined' && window.innerWidth >= 768)

// Puntos que realmente se pintan: activos + zona + no ocultos + tipo visible
const puntosMapa = computed(() =>
  filtrarPuntosMapa(puntosMuestreo.value, tiposVisibles.value)
)

// Recuento por tipo (para los chips), sin contar los ocultos por el admin
const conteoPorTipo = computed(() => {
  const c = {}
  puntosMuestreo.value.forEach((p) => {
    if (p.oculto_mapa) return
    const bucket = tipoBucketDePunto(p)
    c[bucket] = (c[bucket] || 0) + 1
  })
  return c
})

const tiposConPuntos = computed(() => {
  const chips = [...(plantasStore.getTipoInfraestructura || [])]
    .sort((a, b) => Number(a.id) - Number(b.id))
    .map((t) => ({
      key: Number(t.id),
      name: t.name,
      count: conteoPorTipo.value[Number(t.id)] || 0
    }))
  if (conteoPorTipo.value['sin']) {
    chips.push({ key: 'sin', name: 'Sin infraestructura', count: conteoPorTipo.value['sin'] })
  }
  return chips
})

const esTipoVisible = (key) =>
  !tiposVisibles.value || tiposVisibles.value.map(String).includes(String(key))

const colorDeTipo = (key) => {
  if (key === 'sin') return '#78909c'
  return getInfraPinColors(Number(key)).g1
}

const toggleTipo = (key) => {
  const actuales = tiposVisibles.value
    ? [...tiposVisibles.value]
    : tiposConPuntos.value.map((c) => c.key)
  const idx = actuales.map(String).indexOf(String(key))
  if (idx >= 0) actuales.splice(idx, 1)
  else actuales.push(key)
  tiposVisibles.value = actuales
  try {
    localStorage.setItem(TIPOS_STORAGE_KEY, JSON.stringify(actuales))
  } catch {
    /* almacenamiento no disponible */
  }
}

const mostrarTodosLosTipos = () => {
  tiposVisibles.value = null
  try {
    localStorage.removeItem(TIPOS_STORAGE_KEY)
  } catch {
    /* almacenamiento no disponible */
  }
}

const totalPuntosMapa = computed(() => puntosMuestreo.value.filter((p) => !p.oculto_mapa).length)

const closeModal = () => {
  isModalActive.value = false
  selectedPunto.value = null
  historyOnly.value = false
}

const getUserLocation = () => {
  if (!navigator.geolocation) {
    console.error('Geolocalización no soportada por este navegador')
    return
  }
  
  isLoading.value = true
  geoLocationError.value = null
  
  console.log('Solicitando ubicación del usuario...')
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      console.log('Ubicación obtenida:', position.coords)
      const coords = [position.coords.latitude, position.coords.longitude]
      center.value = coords
      userLocation.value = coords
      isLoading.value = false

      // Si tenemos referencia al mapa, forzar actualización
      if (map.value) {
        console.log('Actualizando centro del mapa')
        map.value.leafletObject.setView(center.value, zoom.value)
      }
    },
    (error) => {
      console.error('Error de geolocalización:', error.message)
      geoLocationError.value = error.message
      isLoading.value = false
      
      // Intentar nuevamente después de 2 segundos si fue un error temporal
      if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
        setTimeout(() => {
          console.log('Reintentando obtener ubicación...')
          getUserLocation()
        }, 2000)
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  )
}
// Botón para centrar en la ubicación del usuario
const centerOnUserLocation = () => {
  getUserLocation()
}

// Rebuild cluster when puntos visibles or infraestructuras data changes (icons depend on both)
watch(
  [puntosMapa, () => plantasStore.getInfraestructuras.length],
  () => { if (mapLoaded.value) buildClusterGroup() }
)

onMounted(async () => {
  // Always reload infras and puntos so the map reflects current DB state.
  // Stale store data (e.g. infras with null type before fix, or puntos added
  // by another session) would cause the wrong icon (faucet default) on markers.
  await Promise.all([
    plantasStore.loadInfraestructuras(),
    plantasStore.loadPuntosMuestreo(),
  ])

  setTimeout(() => {
    getUserLocation()
  }, 500)
})

</script>

<template>
  <CardBoxModal
    v-model="isModalActive"
    :title="historyOnly ? 'Últimas 5 analíticas en ' + selectedPunto?.name : 'Nueva analitica en ' + selectedPunto?.name"
    no-button
    class="modal-overlay"
    :modal-size="'xl'"
    @cancel="closeModal"
  >
    <FormAnalitica
      :initial-position="selectedPunto?.id"
      :history-only="historyOnly"
      class="h-full"
      @close-modal="closeModal"
      />
      <!-- @close="isModalActive = false" -->
    <!-- v-model="isModalActive" -->
    <!-- <FormAnalitica
      v-model="isModalActive"
      :initial-position="selectedPunto?.id"
      class="modal-content"
      @close="isModalActive = false"
    /> -->
  </CardBoxModal>

  <LayoutAuthenticated>
    <section class="p-6 pb-0">
      <SectionTitleLineWithButton :icon="mdiMap" title="Mapa Puntos Muestreo" main>
        <div class="flex gap-2">
          <!-- <BaseButton
        target="_blank"
        :icon="mdiDownload"
        label="Download XML"
        color="info"
        rounded-full
        small
          />
          <BaseButton
            target="_blank"
            :icon="mdiFilter"
            label="Limpiar filtros"
            color="contrast"
            rounded-full
            small
            @click="limpiarFiltros"
          /> -->
        </div>
      </SectionTitleLineWithButton>
      <!-- <NotificationBar color="info" :icon="mdiMonitorCellphone">
        <b>Responsive table.</b> Collapses on mobile
      </NotificationBar> -->

      <CardBox has-table class="overflow-hidden">
        <div class="relative w-full" style="height: calc(100dvh - 13rem); min-height: 400px;">

          <!-- Filtro de tipos de punto (preferencia por dispositivo) -->
          <div class="absolute top-3 left-3 z-10 flex flex-col gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-white/95 dark:bg-slate-800/95 text-gray-700 dark:text-gray-200 text-sm font-medium shadow-md border border-gray-200 dark:border-slate-600"
              @click="panelTiposAbierto = !panelTiposAbierto"
            >
              <BaseIcon :path="mdiFilter" size="16" />
              <span>Tipos de punto</span>
              <span class="text-xs font-normal text-gray-500 dark:text-gray-400">{{ puntosMapa.length }}/{{ totalPuntosMapa }}</span>
              <BaseIcon :path="panelTiposAbierto ? mdiChevronUp : mdiChevronDown" size="16" />
            </button>

            <div
              v-if="panelTiposAbierto"
              class="rounded-xl bg-white/95 dark:bg-slate-800/95 shadow-lg border border-gray-200 dark:border-slate-600 p-3 w-72 max-w-[calc(100vw-1.5rem)] backdrop-blur"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold uppercase tracking-wide text-gray-400">Mostrar en el mapa</span>
                <button
                  v-if="tiposVisibles"
                  type="button"
                  class="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                  @click="mostrarTodosLosTipos"
                >
                  Todos
                </button>
              </div>
              <div class="flex flex-col gap-1.5">
                <label
                  v-for="chip in tiposConPuntos"
                  :key="chip.key"
                  class="flex items-center gap-2 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    :checked="esTipoVisible(chip.key)"
                    @change="toggleTipo(chip.key)"
                  />
                  <span
                    class="inline-block w-3.5 h-3.5 rounded-full flex-shrink-0"
                    :style="{ backgroundColor: colorDeTipo(chip.key) }"
                    :class="{ 'opacity-30': !esTipoVisible(chip.key) }"
                  />
                  <span
                    class="text-sm text-gray-700 dark:text-gray-200 flex-1 leading-tight"
                    :class="{ 'opacity-50': !esTipoVisible(chip.key) }"
                  >{{ chip.name }}</span>
                  <span class="text-xs text-gray-400">{{ chip.count }}</span>
                </label>
              </div>
              <p class="mt-2 text-[11px] leading-snug text-gray-400">
                La selección se guarda en este dispositivo.
              </p>
            </div>
          </div>

          <!-- Botón superpuesto sobre el mapa -->
          <div class="absolute top-3 right-12 z-10">
            <BaseButton
              label="Centrar posición"
              :icon="mdiCrosshairsGps"
              color="info"
              rounded
              small
              :disabled="isLoading"
              @click="centerOnUserLocation"
            />
          </div>

          <l-map
            ref="map"
            v-model:zoom="zoom"
            :center="center"
            use-global-leaflet
            style="height: 100%; width: 100%"
            @ready="onMapReady"
            >
              <!-- :center="[39.54982998070428, -0.4656852311920545]" -->
              <l-tile-layer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                layer-type="base"
                name="OpenStreetMap"
              ></l-tile-layer>

                <!-- Marcador de posición actual del usuario -->
              <l-marker
                v-if="userLocation"
                :lat-lng="userLocation"
                :icon="userLocationIcon"
              >
                <l-tooltip>
                  <div class="text-center">
                    <p class="text-sm font-semibold">Tu ubicación actual</p>
                  </div>
                </l-tooltip>
              </l-marker>

              <l-marker
                :lat-lng="[39.55260629146044, -0.4660164890395499]"
                :icon="L.icon({
                  iconUrl: aqlaraIcon,
                  iconSize: [32, 32],
                  iconAnchor: [16, 32],
                  popupAnchor: [0, -32]
                })"
                >
                <l-tooltip>
                  <div class="text-center">
                    <AqlaraLogo class="text-center w-32"/>
                  <!-- <h1 class="text-lg font-bold">AQLARA</h1> -->
                  <p class="text-sm">Oficinas Centrales</p>
                  <p class="text-sm">Parque Tecnológico de Paterna,</p>
                  <p class="text-sm"> Calle Sir Alexander Fleming 7</p>
                  <p class="text-sm"> 46980 Paterna, Valencia (España)</p>
                  <p class="text-sm"> Tfno: 963 153 232</p>
                  </div>
                </l-tooltip>

                <!-- <l-popup>
                  <div class="text-center">
                  <h1 class="text-lg font-bold">Punto 1</h1>
                  <a href="http://www.aqlara.com" target="_blank" class="text-sm"
                    >AQLARA</a
                  >
                  <p class="text-sm">Muestra 1</p>
                  </div>
                </l-popup> -->
                </l-marker>
              <!-- Puntos de muestreo rendered imperatively via L.markerClusterGroup in onMapReady/watch -->
            </l-map>
        </div>
      </CardBox>
     

      <!-- <CardBox class="mb-6" has-table>
        <AnaliticsTablePrimeVue checkable />
      </CardBox> -->

      <!-- <SectionTitleLineWithButton :icon="mdiTableOff" title="Empty variation" /> -->

      <!-- <NotificationBar color="danger" :icon="mdiTableOff">
        <b>Empty table.</b> When there's nothing to show
      </NotificationBar> -->

      <!-- <CardBox>
        <CardBoxComponentEmpty />
      </CardBox> -->
    </section>
  </LayoutAuthenticated>
</template>

<style scoped>
.modal-overlay {
  z-index: 1000;
}

:deep(.leaflet-container) {
  z-index: 1;
}

:deep(.modal-content) {
  z-index: 1001;
  position: relative;
}

/* Ensure modal content can scroll on mobile */
:deep(.overflow-y-auto) {
  -webkit-overflow-scrolling: touch;
}

/* Estilos para el marcador de ubicación del usuario */
:deep(.user-location-icon) {
  background: transparent !important;
  border: none !important;
}

:deep(.user-location-marker) {
  position: relative;
  width: 24px;
  height: 24px;
}

:deep(.user-location-dot) {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  background-color: #4285f4;
  border: 3px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  z-index: 2;
}

:deep(.user-location-pulse) {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  background-color: rgba(66, 133, 244, 0.3);
  border-radius: 50%;
  animation: pulse 2s ease-out infinite;
  z-index: 1;
}

@keyframes pulse {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(2.5);
    opacity: 0;
  }
}
</style>
