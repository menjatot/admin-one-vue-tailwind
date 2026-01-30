<script setup>
import { computed, onMounted, reactive, ref, toValue, watch } from 'vue'
import {
  mdiBallotOutline,
  mdiAccount,
  mdiMail,
  mdiWaterAlert,
  mdiStopCircle,
  mdiSignal,
  mdiChartBellCurve,
  mdiLogin,
  mdiCrosshairsGps
} from '@mdi/js'
import SectionMain from '@/components/SectionMain.vue'
import CardBox from '@/components/CardBox.vue'
import FormCheckRadioGroup from '@/components/FormCheckRadioGroup.vue'
// import FormFilePicker from '@/components/FormFilePicker.vue'
import FormField from '@/components/FormField.vue'
import FormControl from '@/components/FormControl.vue'
import BaseDivider from '@/components/BaseDivider.vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseButtons from '@/components/BaseButtons.vue'
import SectionTitle from '@/components/SectionTitle.vue'
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionTitleLineWithButton from '@/components/SectionTitleLineWithButton.vue'
// import NotificationBarInCard from '@/components/NotificationBarInCard.vue'
import { usePlantasStore } from '@/stores/plantas'
import { searchZonasOperarios } from '@/services/supabase'
import { setOperarios } from '@/services/operarios'
import OperariosView from '@/views/OperariosView.vue'
import { FormKit } from '@formkit/vue'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { LMap, LTileLayer, LMarker, LTooltip, LPopup } from '@vue-leaflet/vue-leaflet'
import { getIconByInfraestructura } from '@/helpers/maps'
// const zonasUoOperario = ref([]);

// const emits = defineEmits(['cancelModal', 'closeModal'])

const emit = defineEmits(['submit', 'closeModal'])

const plantasStore = usePlantasStore()

const API_KEY_ICONS = import.meta.env.VITE_ICONS_API_KEY
const zoom = ref(13)
const posicionEditable = ref(false)
const userLocation = ref(null)
const isLoadingLocation = ref(false)
const map = ref(null)

const props = defineProps({
  uo: {
    type: Object,
    required: true,
    default: () => ({ esNuevo: true })
  }
})

const form = reactive({
  esNuevo: props.uo?.esNuevo ?? true,
  id: props.uo?.id || null,
  name: props.uo?.name,
  infraestructura_fk: props.uo?.infraestructura_fk,
  zona_fk: props.uo?.zona_fk,
  posicion: props.uo?.posicion
})

const submitHandler = () => {
  console.log('submitHandler')
  // Validar formulario
  if (!form.name || !form.infraestructura_fk || !form.zona_fk) {
    console.error('Faltan campos requeridos')
    return false
  }

  const uoData = {
    id: form.id,
    name: form.name,
    infraestructura_fk: form.infraestructura_fk,
    zona_fk: form.zona_fk,
    posicion: form.posicion,
    esNuevo: form.esNuevo
  }
  emit('submit', uoData)
  // return uoData
}

const selectInfraestructura = computed(() => {
  return plantasStore.getInfraestructuras.map((inf) => {
    return { value: inf.id, label: inf.name }
  })
})

const selectZona = computed(() => {
  return plantasStore.getZonas.map((zona) => {
    return { value: zona.id, label: zona.name }
  })
})

const toggleEditarPosicion = () => {
  posicionEditable.value = !posicionEditable.value
}

const zonasPorComunidadAutonoma = (ca) => {
  const comAut = plantasStore.getZonas
    .filter((zona) => zona.com_autonoma_fk === ca)
    .map((zona) => {
      return { value: zona.id, label: zona.name }
    })
  // console.log('comAut: ', comAut)
  return comAut
}

const getZonas = computed(() => {
  const zonas = plantasStore.getZonas.map((zona) => {
    return { value: zona.id, label: zona.name }
  })
  console.log('ZONAS: ', zonas)
  return zonas
})

const icon = L.divIcon({
  html: `
  <div class="marker-pin">
    <svg viewBox="0 0 24 24" style="width: 60px; height: 60px;">
      <path fill="#2196f3" d="${mdiSignal}" />
    </svg>
    </div>
    `,
  className: 'custom-div-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 24]
})

watch(
  () => props.uo,
  (newUO) => {
    form.esNuevo = newUO?.esNuevo
    form.id = newUO?.id
    form.name = newUO?.name
    form.infraestructura_fk = newUO?.infraestructura_fk
    ;(form.zona_fk = newUO?.zona_fk), (form.posicion = newUO?.posicion)
    posicionEditable.value = false //resetear al abrir el modal
  },
  { inmediate: true }
)

const zonasUOSeleccionadas = async (id) => {
  if (!id) {
    console.warn('El valor de id es undefined o null')
    return []
  }

  const zonas = plantasStore.getZonas
    .filter((zona) => zona.unidades_operativas_fk === id)
    .map((zona) => {
      return zona.id
    })
  // console.log('ZONAS SELECCIONADAS: ', zonas)
  form.zonas = zonas
}

const customIcon = (icon) =>
  L.divIcon({
    html: `  
    <svg viewBox="0 0 24 24" style="width: 60px; height: 60px;" class="marker-pin">
      <path fill="#2196f3" d="${icon}" />
      </svg>
      `,
    className: 'custom-div-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 24]
  })

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

const getUserLocation = () => {
  if (!navigator.geolocation) {
    console.error('Geolocalización no soportada por este navegador')
    return
  }

  isLoadingLocation.value = true

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const coords = [position.coords.latitude, position.coords.longitude]
      userLocation.value = coords
      isLoadingLocation.value = false
      console.log('Ubicación del usuario obtenida:', coords)
    },
    (error) => {
      console.error('Error de geolocalización:', error.message)
      isLoadingLocation.value = false
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  )
}

onMounted(() => {
  // Obtener ubicación del usuario al montar el componente
  setTimeout(() => {
    getUserLocation()
  }, 500)
})

const getGoogleMapsUrl = (lat, lng) => {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

const imprime = () => {
  console.log(form)
}

zonasUOSeleccionadas(form.id)

defineExpose({
  submitHandler
})
</script>

<template>
  <SectionMain>
    <!-- <CardBox form @submit.prevent="submit"> -->
    <CardBox is-form>
      <form class="w-full" @submit.prevent="submitHandler">
        <div class="grid grid-cols-1 lg:grid-cols-6 mb-6 gap-4 w-full">
          <div class="col-span-1 w-full">
            <FormKit
              v-model="form.id"
              type="text"
              label="Código"
              placeholder="Nº SINAC"
              validation="required"
              class="col-span-1 w-full"
              :disabled="form.esNuevo ? false : true"
            />
          </div>
          <div class="col-span-5 w-full">
            <FormKit
              v-model="form.name"
              type="text"
              label="Nombre"
              placeholder="Nombre"
              validation="required"
              class="col-span-3 w-full"
            />
          </div>
        </div>
        <div class="flex flex-col w-full md:flex-row md:space-x-4 md:space-y-0 space-y-4 mb-6">
          <FormKit
            v-model="form.infraestructura_fk"
            :options="selectInfraestructura"
            type="select"
            label="Infraestructura"
            placeholder="Infraestructura"
            class="w-full"
            option-class="w-full"
          />
          <FormKit
            v-model="form.zona_fk"
            :options="selectZona"
            type="select"
            label="Zona"
            placeholder="Zona"
            class="w-full"
            option-class="w-full"
          />
        </div>
        <div style="height: 300px; width: 100%">
          <l-map
            ref="map"
            v-model:zoom="zoom"
            :center="
              form.posicion
                ? [form.posicion.lat, form.posicion.lon]
                : [39.54982998070428, -0.4656852311920545]
            "
            :use-global-leaflet="false"
          >
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
              :lat-lng="
                form.posicion
                  ? [form.posicion.lat, form.posicion.lon]
                  : [39.54982998070428, -0.4656852311920545]
              "
              :draggable="posicionEditable"
              :icon="markerIcon(getIconByInfraestructura(form.infraestructura_fk))"
              @dragend="
                (e) => {
                  form.posicion = {
                    lat: e.target.getLatLng().lat,
                    lon: e.target.getLatLng().lng
                  }
                  console.log('New position:', form.posicion)
                }
              "
            >
              <!-- :icon="markerIcon(getIconByInfraestructura(form.infraestructura_fk))" -->

              <l-tooltip>
                <div class="text-center">
                  <h1 class="text-lg font-bold">{{ form.name }}</h1>
                  <p class="text-sm">{{ form.id }}</p>
                </div>
              </l-tooltip>

              <l-popup>
                <div class="text-center">
                  <h1 class="text-lg font-bold">{{ form.name }}</h1>
                  <a
                    :href="
                      getGoogleMapsUrl(
                        form.posicion?.lat || 33.84984041752422,
                        form.posicion?.lon || -111.42066937394506
                      )
                    "
                    target="_blank"
                    class="text-sm"
                    >Ver en Google Maps</a
                  >
                  <p class="text-sm">{{ form.id }}</p>
                </div>
              </l-popup>
            </l-marker>
            <!-- <div v-for="punto in plantasStore.getPuntosMuestreo" :key="punto.id">
                <l-marker
                v-if="punto.posicion"
                :lat-lng="[punto.posicion.lat, punto.posicion.lon]"
                draggable
                @dragend="onDragEnd"
                >
                <l-tooltip>
                  <div class="text-center">
                      <h1 class="text-lg font-bold">{{ punto.name }}</h1>
                      <p class="text-sm">id: {{ punto.id }}</p>
                    </div>
                  </l-tooltip>

                  <l-popup>
                    <div class="text-center">
                      <h1 class="text-lg font-bold">{{ punto.name }}</h1>
                      <p class="text-sm">SINAC Id: {{ punto.id }}</p>
                      <BaseButton
                      label="Añadir analítica"
                        color="info"
                        @click="crearAnalitica(punto)"
                      ></BaseButton>
                    </div>
                  </l-popup>
                </l-marker>
              </div> -->
          </l-map>
        </div>
        <div class="items-center justify-center flex w-full">
          <BaseButton
            :label="posicionEditable ? 'Fijar Posición' : 'Editar Posición'"
            color="info"
            class="w-full"
            @click="toggleEditarPosicion"
          />
        </div>

        <!-- <div v-if="form.comunidadAutonoma" class="grid md-grid-cols-1 md:grid-cols-4 gap-4 mb-6"> -->
        <!-- <div class="w-full" v-for="zona in zonasPorComunidadAutonoma(form.comunidadAutonoma)" :key="zona.id"> -->

        <!-- </div> -->
        <!-- </div> -->
        <!-- </div> -->
      </form>
      <template #footer>
        <BaseButtons>
          <BaseButton type="submit" color="info" label="Guardar" @click="emit('submit', form)" />
          <!-- <BaseButton type="submit" color="info" label="imprime" @click="imprime" /> -->
          <BaseButton
            type="reset"
            color="danger"
            outline
            label="Cancelar"
            @click="emit('closeModal')"
          />
        </BaseButtons>
      </template>
    </CardBox>
  </SectionMain>
</template>
<style scoped>
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
