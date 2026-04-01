<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { usePlantasStore } from '@/stores/plantas'
import { useLoginStore } from '@/stores/login'
import useFormSelectData from '@/composables/useFormSelectData'
import { supabase } from '@/services/supabase'
import { saveAnaliticaOffline } from '@/services/offlineSync'
import CardBox from './CardBox.vue'
import { confetti } from '@tsparticles/confetti'
import { mdiHistory, mdiAlertCircle, mdiCheckCircle } from '@mdi/js'
import BaseIcon from './BaseIcon.vue'

const plantaStore = usePlantasStore()
const loginStore = useLoginStore()

const totalizador = ref('')

const esDeposito = computed(() => {
  const puntoId = form.punto_muestreo_fk || props.initialPosition
  if (!puntoId) return false

  const punto = plantaStore.getPuntosMuestreo.find((p) => p.id === puntoId)
  if (!punto?.infraestructura_fk) return false

  const infra = plantaStore.getInfraestructuras.find((i) => i.id === punto.infraestructura_fk)
  return infra?.type === 2
})

// Control para mostrar/ocultar el histórico en móvil
const showHistorico = ref(false)

const props = defineProps({
  initialPosition: {
    type: Number,
    default: null
  }
})

const emit=defineEmits(['closeModal'])



const {
  form,
  selectZona,
  selectPuntosMuestra,
  selectInfraestructura,
  selectUO,
  operarioPorZona,
  findOperarioByUser,
  operarioLogueado
} = useFormSelectData()

const resetForm = () => {
  form.punto_muestreo_fk = ''
  form.fecha = ''
  form.color = 1
  form.olor = 1
  form.sabor = 1
  form.cloro = ''
  form.type = ''
  form.observaciones = ''
  form.operario = ''
  form.ph = ''
  form.turbidez = ''
  form.zona = ''
  form.infraestructura = ''
  form.uo = ''
  form.type = ''
  totalizador.value = ''
}

// Computed properties para valores organolépticos
const olorValue = computed({
  get: () => form.olor === 0,
  set: (checked) => (form.olor = checked ? 0 : 1)
})

const colorValue = computed({
  get: () => form.color === 0,
  set: (checked) => (form.color = checked ? 0 : 1)
})

const saborValue = computed({
  get: () => form.sabor === 0,
  set: (checked) => (form.sabor = checked ? 0 : 1)
})

const recargaFormulario = () => {
  form.operario = loginStore.isAuthenticated ? operarioLogueado.value?.id : null
  form.uo = loginStore.isAuthenticated ? operarioLogueado.value?.ud_operativa_fk : null
}

// Obtener las últimas 5 analíticas del punto de muestreo seleccionado
const ultimasAnaliticas = computed(() => {
  const puntoId = form.punto_muestreo_fk || props.initialPosition
  if (!puntoId) return []

  return plantaStore.getAnaliticas
    .filter((a) => a.punto_muestreo_fk === puntoId)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 5)
})

// Formatear fecha para mostrar
const formatFecha = (fecha) => {
  if (!fecha) return '-'
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Verificar si hay errores organolépticos
const tieneErrorOrganoleptico = (analitica) => {
  return analitica.color === 0 || analitica.olor === 0 || analitica.sabor === 0
}

// Obtener lista de errores organolépticos
const getErroresOrganolepticos = (analitica) => {
  const errores = []
  if (analitica.color === 0) errores.push('Color')
  if (analitica.olor === 0) errores.push('Olor')
  if (analitica.sabor === 0) errores.push('Sabor')
  return errores
}

// Calcular volumen consumido y m³/día comparando con la analítica anterior con totalizador
const getVolumenData = (analitica) => {
  if (analitica.totalizador == null) return null

  const prevAnalitica = plantaStore.getAnaliticas
    .filter(a =>
      a.punto_muestreo_fk === analitica.punto_muestreo_fk &&
      a.totalizador != null &&
      a.id !== analitica.id &&
      a.fecha <= analitica.fecha
    )
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0]

  if (!prevAnalitica) return null

  const volumen = analitica.totalizador - prevAnalitica.totalizador
  const dias = Math.round((new Date(analitica.fecha) - new Date(prevAnalitica.fecha)) / (1000 * 60 * 60 * 24))
  const m3PerDia = dias > 0 ? Math.round((volumen / dias) * 100) / 100 : null

  return { volumen, m3PerDia }
}

const submitHandler = async () => {
  try {
    const newAnalitica = {
      punto_muestreo_fk: form.punto_muestreo_fk,
      fecha: form.fecha,
      color: form.color ? Number(form.color) : null,
      olor: form.olor,
      sabor: form.sabor,
      cloro: form.cloro ? Number(form.cloro) : null,
      type: form.type,
      observaciones: form.observaciones,
      personal_fk: form.operario,
      ph: form.ph ? Number(form.ph) : null,
      turbidez: form.turbidez ? Number(form.turbidez) : null,
      totalizador: esDeposito.value && totalizador.value !== '' ? Number(totalizador.value) : null
    }

    // 1. Verificar conexión a internet
    if (!navigator.onLine) {
      saveAnaliticaOffline(newAnalitica)
      resetForm()
      emit('closeModal')
      alert('⚠️ Sin cobertura. La analítica se ha guardado en el dispositivo y se enviará automáticamente cuando recuperes la señal.')
      return
    }

    // 2. Envío normal si hay conexión
    const { data, error } = await supabase.from('analiticas').insert([newAnalitica])

    if (error) {
      console.error('Error al insertar datos:', error)
      alert('Error al insertar datos: ' + error.message)
    } else {
      plantaStore.loadAnaliticas()
      console.log('Datos insertados:', data)
      resetForm()
      emit('closeModal')
      // fiestaConfetti()
      
      alert('Datos insertados correctamente')
    }
  } catch (error) {
    console.error('Error en la solicitud:', error)
    alert('Error en la solicitud: ' + error.message)
  } finally {
    recargaFormulario()
  }
}

const fiestaConfetti =  async() => {
  
    await confetti('tsparticles', {
      /**
       * @deprecated use count property instead
       */
      particleCount: 50,
      /**
       * @deprecated use position property instead
       */
      origin: {
        x: 0.5,
        y: 0.5
      },
      //------------------------------------------
      angle: 90,
      count: 700,
      position: {
        x: 50,
        y: 50
      },
      spread: 45,
      startVelocity: 45,
      decay: 0.9,
      gravity: 1,
      drift: 0,
      ticks: 200,
      colors: ['#ffffff', '#ff0000'],
      shapes: ['square', 'circle'],
      scalar: 1,
      zIndex: 100,
      disableForReducedMotion: true
    })

  
}

onMounted(async () => {
  await plantaStore.loadOperarios()
  // Cargar analíticas si no están cargadas para mostrar el histórico
  if (!plantaStore.isAnalyticasLoaded) {
    await plantaStore.loadAnaliticas()
  }
  findOperarioByUser(loginStore.userEmail)
  form.operario = loginStore.isAuthenticated ? operarioLogueado.value?.id : null
  form.uo = loginStore.isAuthenticated ? operarioLogueado.value?.ud_operativa_fk : null
  if (props.initialPosition) {
    form.punto_muestreo_fk = props.initialPosition
    console.log('Punto de muestreo:', props.initialPosition)
  }
})

watch(
  () => props.initialPosition,
  async (newPosition) => {
    if (newPosition) {
      form.punto_muestreo_fk = newPosition
    }
  },
  { immediate: true }
)

// Al cambiar de UO, resincronizar el operario con el usuario logueado
// para evitar que quede un valor "huérfano" fuera de la lista de opciones
watch(
  () => form.uo,
  () => {
    form.operario = operarioLogueado.value?.id ?? null
    form.zona = null
    form.infraestructura = null
    form.punto_muestreo_fk = null
  }
)
</script>

<template>
  <div>
    <!-- Histórico de últimas analíticas -->
    <div v-if="form.punto_muestreo_fk || props.initialPosition" class="mb-4">
      <!-- Botón para móvil -->
      <button
        type="button"
        class="md:hidden w-full flex items-center justify-between bg-blue-50 dark:bg-slate-700 p-3 rounded-lg border border-blue-200 dark:border-slate-600"
        @click="showHistorico = !showHistorico"
      >
        <span class="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-medium">
          <BaseIcon :path="mdiHistory" :size="20" />
          {{ ultimasAnaliticas.length > 0 ? `Ver últimas ${ultimasAnaliticas.length} analíticas` : 'Histórico de analíticas' }}
        </span>
        <svg
          :class="['w-5 h-5 transition-transform text-blue-700 dark:text-blue-300', { 'rotate-180': showHistorico }]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Contenido del histórico (siempre visible en md+, toggle en móvil) -->
      <div :class="['md:block', showHistorico ? 'block mt-2' : 'hidden']">
        <div class="bg-blue-50 dark:bg-slate-700 rounded-lg p-4 border border-blue-200 dark:border-slate-600 max-h-80 overflow-y-auto">
          <h3 class="hidden md:flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold mb-3">
            <BaseIcon :path="mdiHistory" :size="20" />
            {{ ultimasAnaliticas.length > 0 ? `Últimas ${ultimasAnaliticas.length} analíticas de este punto` : 'Histórico de analíticas' }}
          </h3>

          <!-- Mensaje cuando no hay analíticas -->
          <div v-if="ultimasAnaliticas.length === 0" class="flex flex-col items-center justify-center py-6 text-gray-500 dark:text-gray-400">
            <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="text-sm font-medium">No existen analíticas anteriores</p>
            <p class="text-xs mt-1">Este será el primer registro para este punto de muestreo</p>
          </div>

          <!-- Lista de analíticas -->
          <div v-else class="space-y-3">
            <div
              v-for="(analitica, index) in ultimasAnaliticas"
              :key="analitica.id"
              class="bg-white dark:bg-slate-800 rounded-md p-3 shadow-sm"
            >
              <!-- Encabezado con fecha -->
              <div class="flex items-center justify-between mb-2 pb-2 border-b border-gray-100 dark:border-slate-600">
                <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {{ formatFecha(analitica.fecha) }}
                </span>
                <span
                  v-if="tieneErrorOrganoleptico(analitica)"
                  class="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium"
                >
                  <BaseIcon :path="mdiAlertCircle" :size="14" />
                  Incidencia
                </span>
                <span
                  v-else
                  class="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium"
                >
                  <BaseIcon :path="mdiCheckCircle" :size="14" />
                  OK
                </span>
              </div>

              <!-- Valores principales -->
              <div class="grid grid-cols-3 gap-2 text-center mb-2">
                <div class="bg-gray-50 dark:bg-slate-700 rounded p-2">
                  <p class="text-xs text-gray-500 dark:text-gray-400">Cloro</p>
                  <p class="text-sm font-bold text-gray-800 dark:text-gray-100">
                    {{ analitica.cloro ?? '-' }}
                    <span v-if="analitica.cloro" class="text-xs font-normal">mg/l</span>
                  </p>
                </div>
                <div class="bg-gray-50 dark:bg-slate-700 rounded p-2">
                  <p class="text-xs text-gray-500 dark:text-gray-400">pH</p>
                  <p class="text-sm font-bold text-gray-800 dark:text-gray-100">
                    {{ analitica.ph ?? '-' }}
                  </p>
                </div>
                <div class="bg-gray-50 dark:bg-slate-700 rounded p-2">
                  <p class="text-xs text-gray-500 dark:text-gray-400">Turbidez</p>
                  <p class="text-sm font-bold text-gray-800 dark:text-gray-100">
                    {{ analitica.turbidez ?? '-' }}
                    <span v-if="analitica.turbidez" class="text-xs font-normal">UNF</span>
                  </p>
                </div>
              </div>

              <!-- Totalizador / Volumen / m³/día -->
              <div
                v-if="analitica.totalizador != null"
                class="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded p-2 mb-2"
              >
                <div class="flex items-baseline gap-2 flex-wrap">
                  <span class="text-xs text-gray-500 dark:text-gray-400">Totalizador:</span>
                  <span class="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {{ analitica.totalizador }} <span class="text-xs font-normal">m³</span>
                  </span>
                  <template v-if="getVolumenData(analitica)">
                    <span class="text-gray-300 dark:text-gray-600">|</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">Vol:</span>
                    <span class="text-sm font-semibold text-blue-500 dark:text-blue-300">
                      {{ getVolumenData(analitica).volumen }} m³
                    </span>
                    <template v-if="getVolumenData(analitica).m3PerDia != null">
                      <span class="text-gray-300 dark:text-gray-600">|</span>
                      <span class="text-sm font-semibold text-blue-500 dark:text-blue-300">
                        {{ getVolumenData(analitica).m3PerDia }} m³/día
                      </span>
                    </template>
                  </template>
                </div>
              </div>

              <!-- Errores organolépticos -->
              <div
                v-if="tieneErrorOrganoleptico(analitica)"
                class="bg-red-50 dark:bg-red-900/30 rounded p-2 mb-2"
              >
                <p class="text-xs text-red-700 dark:text-red-300 font-medium">
                  ⚠️ Organolépticos con incidencia:
                  <span class="font-bold">{{ getErroresOrganolepticos(analitica).join(', ') }}</span>
                </p>
              </div>

              <!-- Observaciones -->
              <div
                v-if="analitica.observaciones"
                class="bg-yellow-50 dark:bg-yellow-900/30 rounded p-2"
              >
                <p class="text-xs text-yellow-800 dark:text-yellow-200">
                  <span class="font-medium">📝 Obs:</span> {{ analitica.observaciones }}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <CardBox>
      <FormKit type="form" submit-label="Enviar" @submit="submitHandler">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormKit
            v-model.number="form.operario"
            type="select"
            :options="operarioPorZona"
            placeholder="Operario"
            :disabled="!!operarioLogueado"
          />
          <FormKit v-model="form.fecha" type="date" placeholder="Fecha de la toma de la muestra" />
        </div>
        <div v-if="!props.initialPosition" class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <FormKit
            v-model="form.uo"
            type="select"
            :options="selectUO"
            placeholder="Unidad Operativa"
            label="Unidad Operativa"
          />
          <FormKit
            v-model="form.zona"
            type="select"
            :options="form.uo ? selectZona : []"
            placeholder="Zona de Muestra"
            label="Zona"
          />
          <FormKit
            v-model="form.infraestructura"
            type="select"
            :options="form.zona ? selectInfraestructura : []"
            placeholder="Infraestructura"
            label="Infraestructura"
          />
          <FormKit
            v-model="form.punto_muestreo_fk"
            type="select"
            :options="selectPuntosMuestra"
            placeholder="Punto de muestra"
            label="Punto de Muestra"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormKit
            v-model.number="form.type"
            type="radio"
            :options="{ 29: 'Rutina', 28: 'Operacional', 99: 'Seguimiento' }"
            label="Tipo de Analítica"
          />
        </div>
        <div v-if="form.type">
          <div v-if="form.type === 29">
            <h2 class="font-bold text-xl mb-3 mt-3 text-gray-600 flex justify-center">
              Caracteristicas Organolépticas
            </h2>
            <div class="border border-gray-300 p-4 rounded-md mb-6 flex flex-col items-center">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormKit
                  v-model="olorValue"
                  type="checkbox"
                  label="Olor"
                  help="Marca si el agua tiene mal olor"
                  name="olor"
                  validation-visibility="dirty"
                />
                <FormKit
                  v-model="colorValue"
                  type="checkbox"
                  label="Color"
                  help="Marca si el agua tiene mal color"
                  name="color"
                  validation-visibility="dirty"
                />
                <FormKit
                  v-model="saborValue"
                  type="checkbox"
                  label="Sabor"
                  help="Marca si el agua tiene mal sabor"
                  name="sabor"
                  validation-visibility="dirty"
                />
              </div>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <FormKit
              v-model.number="form.cloro"
              type="number"
              placeholder="Cloro Residual"
              label="Cloro Residual"
              help="mg/l"
              :validation="
                form.type === 29 || form.type === 28
                  ? 'required|number|min:0|max:99'
                  : 'number|min:0|max:99'
              "
              :validation-messages="{
                required: 'Este campo es obligatorio',
                number: 'Introduce un número',
                min: 'El valor mínimo es 0',
                max: 'El valor máximo es 99'
              }"
            ></FormKit>
            <FormKit
              v-model="form.ph"
              type="number"
              placeholder="pH"
              label="pH"
              help="ud"
              :validation="
                form.type === 29 || form.type === 28
                  ? 'required|number|min:0|max:14'
                  : 'number|min:0|max:14'
              "
              :validation-messages="{
                required: 'Este campo es obligatorio',
                number: 'Introduce un número',
                min: 'El valor mínimo es 0',
                max: 'El valor máximo es 14'
              }"
            />
            <FormKit
              v-model.number="form.turbidez"
              type="number"
              placeholder="Turbidez"
              label="Turbidez"
              help="UNF"
              :validation="
                form.type === 29 || form.type === 28
                  ? 'required|number|min:0|max:999'
                  : 'number|min:0|max:999'
              "
              :validation-messages="{
                required: 'Este campo es obligatorio',
                number: 'Introduce un número',
                min: 'El valor mínimo es 0',
                max: 'El valor máximo es 999'
              }"
            />
            <FormKit
              v-if="esDeposito"
              v-model.number="totalizador"
              type="number"
              placeholder="Totalizador"
              label="Totalizador"
              help="m³"
              :step="1"
              :min="0"
              validation="number|min:0"
              :validation-messages="{
                number: 'Introduce un número',
                min: 'El valor mínimo es 0'
              }"
            />
          </div>
          <div>
            <FormKit
              v-model="form.observaciones"
              type="textarea"
              placeholder="Introduce cualquier tipo de incidencia"
              inner-class="w-full"
              wrapper-class="w-full"
            />
          </div>
        </div>
      </FormKit>

      <!-- <BaseButtons>
          <BaseButton type="submit" color="info" label="Enviar" />
          <BaseButtons type="reset" color="info" outline label="Borrar" />
        </BaseButtons> -->
      <!-- </FormKit> -->
    </CardBox>
  </div>
</template>

<style scoped></style>
