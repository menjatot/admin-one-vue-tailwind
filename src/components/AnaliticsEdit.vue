<script setup>
import { FormKit } from '@formkit/vue'
import { computed, ref, watch } from 'vue'
import { CATALUNA_COMUNIDAD_ID } from '@/constants/comunidades'
import { usePlantasStore } from '@/stores/plantas'

const props = defineProps({
  analitic: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update'])
const localAnalitic = ref({ ...props.analitic })

const ORGANOLEPTICO_INCORRECTO = 0
const ORGANOLEPTICO_CORRECTO = 1
// Computed properties para valores organolépticos
const olorValue = computed({
  get: () => +localAnalitic.value.olor === ORGANOLEPTICO_INCORRECTO,
  set: (checked) => {
    localAnalitic.value.olor = checked ? ORGANOLEPTICO_INCORRECTO : ORGANOLEPTICO_CORRECTO
    // emit('update', localAnalitic.value)
  }
})

const colorValue = computed({
  get: () => +localAnalitic.value.color === ORGANOLEPTICO_INCORRECTO,
  set: (checked) => (localAnalitic.value.color = checked ? 0 : 1)
})

const saborValue = computed({
  get: () => +localAnalitic.value.sabor === 0,
  set: (checked) => (localAnalitic.value.sabor = checked ? 0 : 1)
})

const plantaStore = usePlantasStore()

const esCataluna = computed(() => {
  if (localAnalitic.value.comunidad_id) return localAnalitic.value.comunidad_id === CATALUNA_COMUNIDAD_ID
  const punto = plantaStore.getPuntosMuestreo.find((p) => p.id === localAnalitic.value.punto_muestreo_fk)
  if (!punto?.zona_fk) return false
  const zona = plantaStore.getZonas.find((z) => z.id === punto.zona_fk)
  return zona?.com_autonoma_fk === CATALUNA_COMUNIDAD_ID
})

watch(
  () => [localAnalitic.value.cloro_total, localAnalitic.value.cloro],
  ([cloroTotal, cloro]) => {
    if (cloroTotal != null && cloroTotal !== '' && cloro != null && cloro !== '') {
      const total = Number(cloroTotal)
      const libre = Number(cloro)
      if (!isNaN(total) && !isNaN(libre)) {
        localAnalitic.value.cloro_combinado = parseFloat((total - libre).toFixed(2))
        return
      }
    }
    localAnalitic.value.cloro_combinado = null
  }
)

const cloroCombinadoNegativo = computed(() => {
  return localAnalitic.value.cloro_combinado != null && localAnalitic.value.cloro_combinado < 0
})

watch(
  () => props.analitic,
  (newVal) => {
    localAnalitic.value = { ...newVal }
  },
  { immediate: true }
)

watch(
  localAnalitic,
  (newVal) => {
    emit('update', newVal)
  },
  { deep: true }
)

// watch(
//   () => props.modelValue,
//   (newVal) => {
//     if (!newVal) {
//        localAnalitic.value = { ...props.analitic }
//       emit('update', null)
//     }
//   }
// )
// watch(() => localAnalitic, (newVal) => {
//         // <div v-if="localAnalitic.value.type === 29">
// });
</script>

<template>
  <div v-if="localAnalitic.type">
    <div v-if="localAnalitic.type === 29">
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
        v-model.number="localAnalitic.cloro"
        type="number"
        placeholder="Cloro Residual"
        label="Cloro Residual"
        help="mg/l"
        validation="number|min:0|max:99"
        :validation-messages="{
          number: 'Introduce un número',
          min: 'El valor mínimo es 0',
          max: 'El valor máximo es 99'
        }"
      ></FormKit>
      <FormKit
        v-model="localAnalitic.ph"
        type="number"
        placeholder="pH"
        label="pH"
        help="ud"
        validation="number|min:0|max:14"
        :validation-messages="{
          number: 'Introduce un número',
          min: 'El valor mínimo es 0',
          max: 'El valor máximo es 14'
        }"
      />
      <FormKit
        v-model.number="localAnalitic.turbidez"
        type="number"
        placeholder="Turbidez"
        label="Turbidez"
        help="UNF"
        validation="number|min:0|max:999"
        :validation-messages="{
          number: 'Introduce un número',
          min: 'El valor mínimo es 0',
          max: 'El valor máximo es 999'
        }"
      />
    </div>
    <div
      v-if="esCataluna"
      class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border border-amber-300 dark:border-amber-600 rounded-xl p-4 bg-amber-50 dark:bg-amber-900/20"
    >
      <FormKit
        v-model.number="localAnalitic.cloro_total"
        type="number"
        placeholder="Cloro Total"
        label="Cloro Total"
        help="mg/l"
        :step="0.01"
        validation="number|min:0|max:99"
        :validation-messages="{
          number: 'Introduce un número',
          min: 'El valor mínimo es 0',
          max: 'El valor máximo es 99'
        }"
      />
      <div class="flex flex-col justify-end">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cloro Combinado</label>
        <div
          :class="[
            'flex items-center gap-2 h-[42px] px-3 rounded-md border',
            cloroCombinadoNegativo
              ? 'border-red-400 bg-red-50 dark:border-red-600 dark:bg-red-900/20'
              : 'border-gray-300 bg-gray-100 dark:border-slate-600 dark:bg-slate-700'
          ]"
        >
          <span
            :class="[
              'text-lg font-bold',
              cloroCombinadoNegativo ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'
            ]"
          >
            {{ localAnalitic.cloro_combinado != null ? localAnalitic.cloro_combinado : '—' }}
          </span>
          <span class="text-sm text-gray-500 dark:text-gray-400">mg/l</span>
        </div>
        <span
          v-if="cloroCombinadoNegativo"
          class="text-xs text-red-500 dark:text-red-400 mt-1 font-medium"
        >
          ⚠ El Cloro Combinado no puede ser negativo. Revisa Cloro Total y Cloro Libre Residual.
        </span>
        <span v-else class="text-xs text-gray-400 mt-1">Cloro Total − Cloro Libre Residual</span>
      </div>
    </div>
    <div class="grid grid-cols-2 justify-between mt-6">
      <FormKit
        v-model="localAnalitic.observaciones"
        label="Observaciones"
        type="textarea"
        placeholder="Introduce cualquier tipo de incidencia"
        inner-class="w-full"
        wrapper-class="w-full"
      />
      <FormKit
        v-model="localAnalitic.registro"
        label="Registro"
        disabled
        type="textarea"
        placeholder="Introduce cualquier tipo de incidencia"
        inner-class="w-full"
        wrapper-class="w-full"
      />
    </div>
  </div>
</template>
