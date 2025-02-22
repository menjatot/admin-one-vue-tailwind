<script setup>
import BaseButton from '@/components/BaseButton.vue'
import CardBox from '@/components/CardBox.vue'
import SectionTitleLineWithButton from '@/components/SectionTitleLineWithButton.vue'
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import { mdiDownload, mdiFilter, mdiFlaskEmptyOutline, mdiMap } from '@mdi/js'

import { usePlantasStore } from '@/stores/plantas'

import 'leaflet/dist/leaflet.css'
import { LMap, LTileLayer, LMarker, LTooltip, LPopup } from '@vue-leaflet/vue-leaflet'
import { ref } from 'vue'
import CardBoxModal from '@/components/CardBoxModal.vue'
import FormAnalitica from '@/components/FormAnalitica.vue'
import SectionMain from '@/components/SectionMain.vue'
import { getIconByInfraestructura } from '@/helpers/maps'
import L from 'leaflet'


const plantasStore = usePlantasStore()
const isModalActive = ref(false)
const selectedPunto = ref(null)

const zoom = ref(13)
const API_KEY_ICONS = import.meta.env.VITE_ICONS_API_KEY
 const markerIcon = (icon) =>
    L.icon({
      iconUrl: `https://api.geoapify.com/v1/icon/?type=material&color=blue&icon=${icon}&iconType=awesome&apiKey=${API_KEY_ICONS}`,
      iconSize: [31, 46], // size of the icon
      iconAnchor: [15.5, 42], // point of the icon which will correspond to marker's location
      popupAnchor: [0, -45] // point from which the popup should open relative to the iconAnchor
    })
  

const crearAnalitica = (puntoId) => {
  isModalActive.value = true
  selectedPunto.value = puntoId
}
// const crearAnalitica = (puntoId) => {
//   isModalActive.value = true
//   selectedPuntoId.value = puntoId.id
// }

const onDragEnd = (event) => {

  
                  const posicion = {
                    lat: event.target.getLatLng().lat,
                    lon: event.target.getLatLng().lng
                  }
                  console.log('New position:', posicion)
                
  console.log(event.target.getLatLng())
}
</script>

<template>
<CardBoxModal v-model="isModalActive" :title="'Nueva analitica en '+ selectedPunto?.name" no-button class="modal-overlay" @confirm="isModalActive = false" :modal-size="'xl'">
  
    <FormAnalitica
      v-model="isModalActive"
      :initial-position="selectedPunto?.id"
      class="h-full"
      @close="isModalActive = false"
    />
    <!-- <FormAnalitica
      v-model="isModalActive"
      :initial-position="selectedPunto?.id"
      class="modal-content"
      @close="isModalActive = false"
    /> -->
     
</CardBoxModal>

<LayoutAuthenticated>
  <SectionMain>
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

      <CardBox class="mb-6" has-table>
        <div class="flex flex-col items-center justify-center">
          <div style="height: 600px; width: 95%">
            <l-map
              ref="map"
              v-model:zoom="zoom"
              :center="[39.54982998070428, -0.4656852311920545]"
              :use-global-leaflet="false"
            >
              <l-tile-layer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                layer-type="base"
                name="OpenStreetMap"
              ></l-tile-layer>
              <l-marker :lat-lng="[39.54982998070428, -0.4656852311920545]">
                <l-tooltip>
                  <div class="text-center">
                    <h1 class="text-lg font-bold">AQLARA Headquarters</h1>
                    <p class="text-sm">Oficinas Centrales</p>
                  </div>
                </l-tooltip>
                
                <l-popup>
                  <div class="text-center">
                    <h1 class="text-lg font-bold">Punto 1</h1>
                    <a href="http://google.com" target="_blank" class="text-sm"
                      >Ver en Google Maps</a
                    >
                    <p class="text-sm">Muestra 1</p>
                  </div>
                </l-popup>
              </l-marker>
              <div v-for="punto in plantasStore.getPuntosMuestreo" :key="punto.id">
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
</style>
