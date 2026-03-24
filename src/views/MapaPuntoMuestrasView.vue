<script setup>
import BaseButton from '@/components/BaseButton.vue'
import CardBox from '@/components/CardBox.vue'
import SectionTitleLineWithButton from '@/components/SectionTitleLineWithButton.vue'
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import { mdiCrosshairsGps, mdiDownload, mdiFilter, mdiFlaskEmptyOutline, mdiMap } from '@mdi/js'

import { usePlantasStore } from '@/stores/plantas'
import {useLoginStore} from '@/stores/login'

import 'leaflet/dist/leaflet.css'
import { LMap, LTileLayer, LMarker, LTooltip, LPopup } from '@vue-leaflet/vue-leaflet'
import { computed, ref } from 'vue'
import CardBoxModal from '@/components/CardBoxModal.vue'
import FormAnalitica from '@/components/FormAnalitica.vue'
import SectionMain from '@/components/SectionMain.vue'
import { getIconByInfraestructura } from '@/helpers/maps'
import L from 'leaflet'
import { onMounted } from 'vue'
import aqlaraIcon from '@/assets/icons/aqlara-icon-192.png'
import AqlaraLogo from '@/components/AqlaraLogo.vue'

const plantasStore = usePlantasStore()
const loginStore=useLoginStore()
const isModalActive = ref(false)
const selectedPunto = ref(null)
const isLoading = ref(false)
const geoLocationError = ref(null)
const map=ref(null)

const center=ref([39.4679255214283, -0.3762874990439122])
const zoom = ref(13)
const userLocation = ref(null)
const API_KEY_ICONS = import.meta.env.VITE_ICONS_API_KEY
const markerIcon = (icon) =>
  L.icon({
    iconUrl: `https://api.geoapify.com/v1/icon/?type=material&color=blue&icon=${icon}&iconType=awesome&apiKey=${API_KEY_ICONS}`,
    iconSize: [31, 46], // size of the icon
    iconAnchor: [15.5, 42], // point of the icon which will correspond to marker's location
    popupAnchor: [0, -45] // point from which the popup should open relative to the iconAnchor
  })

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
  if (Number(loginStore.userRole) === 99) {
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

const handleSubmitSuccess = async () => {
  // Recargar datos
  await plantasStore.loadAnaliticas()

  // Cerrar modal
  isModalActive.value = false

  // Limpiar punto seleccionado
  selectedPunto.value = null
}

const closeModal = () => {
  isModalActive.value = false
  selectedPunto.value = null
}

const onDragEnd = (event) => {
  const posicion = {
    lat: event.target.getLatLng().lat,
    lon: event.target.getLatLng().lng
  }
  console.log('New position:', posicion)

  console.log(event.target.getLatLng())
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

onMounted(() => {
  console.log('Componente montado, solicitando ubicación...')
  // Esperar un momento para que el mapa se inicialice completamente
  setTimeout(() => {
    getUserLocation()
  }, 500)
})

</script>

<template>
  <CardBoxModal
    v-model="isModalActive"
    :title="'Nueva analitica en ' + selectedPunto?.name"
    no-button
    class="modal-overlay"
    :modal-size="'xl'"
    @confirm="handleSubmitSuccess"
    @cancel="closeModal"
  >
    <FormAnalitica
      :initial-position="selectedPunto?.id"
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
    <SectionMain class="pb-0">
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

      <CardBox has-table class="overflow-hidden -mx-4 sm:-mx-6">
        <div class="relative w-full" style="height: calc(100dvh - 13rem); min-height: 400px;">

          <!-- Botón superpuesto sobre el mapa -->
          <div class="absolute top-3 right-12 z-[1001]">
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
            :use-global-leaflet="false"
            style="height: 100%; width: 100%"
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
              <div v-for="punto in puntosMuestreo" :key="punto.id">
                <l-marker
                  v-if="punto.posicion"
                  :lat-lng="[punto.posicion.lat, punto.posicion.lon]"
                  draggable
                  :icon="markerIcon(getIconByInfraestructura(punto.infraestructura_fk))"
                  @dragend="onDragEnd"
                >
                  <!-- @dragend="onDragEnd" -->
                  <l-tooltip>
                    <div class="text-center">
                      <h1 class="text-lg font-bold">{{ punto.name }}</h1>
                      <p class="text-sm">id: {{ punto.id }}</p>
                    </div>
                  </l-tooltip>

                  <l-popup>
                    <div class="text-center">
                      <h1 class="text-lg font-bold">{{ punto.name }}</h1>
                      <!-- <a href="http://google.com" target="_blank" class="text-sm">Ver en Google Maps</a> -->
                      <p class="text-sm">SINAC Id: {{ punto.id }}</p>
                      <BaseButton
                        label="Añadir analítica"
                        color="info"
                        @click="crearAnalitica(punto)"
                      ></BaseButton>
                    </div>
                  </l-popup>
                </l-marker>
              </div>
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
    </SectionMain>
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
