<script setup>
import { computed, ref, watch } from 'vue'
import CardBoxModal from './CardBoxModal.vue'
import BaseButton from './BaseButton.vue'
import BaseIcon from './BaseIcon.vue'
import { mdiAlertCircleOutline, mdiPencil } from '@mdi/js'
import { usePlantasStore } from '@/stores/plantas'
import { idsExcluidas } from '@/helpers/revisionExport'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  // [{ analitica, motivos: ['Cloro: 0.3 mg/l [0.4 - 1]', ...] }]
  incorrectas: {
    type: Array,
    default: () => []
  },
  exportLabel: {
    type: String,
    default: 'la exportación a SINAC'
  }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel', 'edit'])

const plantaStore = usePlantasStore()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

// Ids de las filas desmarcadas en esta revisión. Por defecto se incluyen todas
// (comportamiento anterior) y solo se excluyen las que el usuario desmarque,
// de modo que esas analíticas no entran en el XML, el PDF ni el Excel.
const desmarcadas = ref(new Set())

const estaIncluida = (item) => !desmarcadas.value.has(item.analitica.id)

const setIncluida = (item, incluir) => {
  const siguiente = new Set(desmarcadas.value)
  if (incluir) siguiente.delete(item.analitica.id)
  else siguiente.add(item.analitica.id)
  desmarcadas.value = siguiente
}

const totalExcluidas = computed(
  () => props.incorrectas.filter((item) => desmarcadas.value.has(item.analitica.id)).length
)
const totalIncluidas = computed(() => props.incorrectas.length - totalExcluidas.value)
const todasIncluidas = computed(() => totalExcluidas.value === 0)
// Casilla maestra en estado intermedio: hay unas incluidas y otras excluidas
const parcial = computed(() => totalExcluidas.value > 0 && totalIncluidas.value > 0)

const toggleTodas = (incluir) => {
  desmarcadas.value = incluir
    ? new Set()
    : new Set(props.incorrectas.map((item) => item.analitica.id))
}

// Cada apertura empieza con todo incluido
watch(
  () => props.modelValue,
  (abierto) => {
    if (!abierto) desmarcadas.value = new Set()
  }
)

const etiquetaConfirmar = computed(() =>
  totalExcluidas.value > 0
    ? `Continuar con ${props.exportLabel} (excluir ${totalExcluidas.value})`
    : `Continuar con ${props.exportLabel}`
)

const nombrePunto = (id) =>
  plantaStore.getPuntosMuestreo.find((p) => p.id === id)?.name || `#${id}`

const nombreOperario = (analitica) =>
  analitica?.personal?.name ||
  plantaStore.getOperarios.find((o) => o.id === analitica?.personal_fk)?.name ||
  '—'

const TIPOS = { 28: 'Operacional', 29: 'Rutina', 99: 'Seguimiento' }
const nombreTipo = (type) => TIPOS[type] ?? type

const onCancel = () => emit('cancel')
const onConfirm = () =>
  emit('confirm', { excluidas: idsExcluidas(props.incorrectas, desmarcadas.value) })
</script>

<template>
  <CardBoxModal
    v-model="visible"
    :title="`Analíticas incorrectas en la selección (${incorrectas.length})`"
    no-button
    :modal-size="'xl'"
    @cancel="onCancel"
  >
    <div class="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-3 mb-3">
      <BaseIcon :path="mdiAlertCircleOutline" size="20" class="text-amber-500 flex-shrink-0 mt-0.5" />
      <p class="text-sm text-amber-800 dark:text-amber-200">
        Estas analíticas tienen valores fuera de rango u organolépticos no conformes.
        Puedes <b>corregirlas con el lápiz</b> (sin salir de esta pantalla), <b>continuar</b> con
        {{ exportLabel }} o <b>cancelar</b> y revisarlas en el listado.
        <b>Desmarca las que no quieras incluir</b>: no se exportarán al fichero.
      </p>
    </div>

    <div class="max-h-96 overflow-auto rounded-lg border border-gray-200 dark:border-slate-600">
      <table class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-slate-700">
          <tr>
            <th class="p-2 text-left">
              <label
                class="inline-flex items-center gap-1.5 cursor-pointer select-none"
                title="Marcar / desmarcar todas"
              >
                <input
                  type="checkbox"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  :checked="todasIncluidas"
                  :indeterminate="parcial"
                  @change="toggleTodas($event.target.checked)"
                />
                <span>Incluir</span>
              </label>
            </th>
            <th class="text-left p-2">Fecha</th>
            <th class="text-left p-2">Punto de muestreo</th>
            <th class="text-left p-2">Operario</th>
            <th class="text-left p-2">Tipo</th>
            <th class="text-left p-2">Incidencias</th>
            <th class="p-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in incorrectas"
            :key="item.analitica.id"
            class="border-t border-gray-100 dark:border-slate-700"
            :class="{ 'opacity-50': !estaIncluida(item) }"
          >
            <td class="p-2">
              <input
                type="checkbox"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                :checked="estaIncluida(item)"
                :title="estaIncluida(item) ? 'No incluir en la exportación' : 'Volver a incluir en la exportación'"
                @change="setIncluida(item, $event.target.checked)"
              />
            </td>
            <td class="p-2 whitespace-nowrap">{{ item.analitica.fecha }}</td>
            <td class="p-2" :class="{ 'line-through': !estaIncluida(item) }">
              {{ nombrePunto(item.analitica.punto_muestreo_fk) }}
            </td>
            <td class="p-2 whitespace-nowrap">{{ nombreOperario(item.analitica) }}</td>
            <td class="p-2 whitespace-nowrap">{{ nombreTipo(item.analitica.type) }}</td>
            <td class="p-2">
              <span
                v-for="(motivo, i) in item.motivos"
                :key="i"
                class="inline-block mr-1 mb-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
              >
                {{ motivo }}
              </span>
              <span
                v-if="!estaIncluida(item)"
                class="inline-block mr-1 mb-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600 dark:bg-slate-600 dark:text-gray-300"
              >
                Se excluye
              </span>
            </td>
            <td class="p-2 text-right whitespace-nowrap">
              <BaseButton
                color="info"
                :icon="mdiPencil"
                small
                title="Editar esta analítica"
                @click="emit('edit', item.analitica)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2 mt-4">
      <p class="text-xs text-gray-500 dark:text-gray-400">
        <template v-if="totalExcluidas > 0 && totalIncluidas > 0">
          {{ totalIncluidas }} de {{ incorrectas.length }} se incluirán en el fichero;
          {{ totalExcluidas === 1 ? '1 analítica queda fuera' : `${totalExcluidas} analíticas quedan fuera` }}.
        </template>
        <template v-else-if="totalExcluidas > 0">
          Ninguna de las {{ incorrectas.length }} se incluirá en el fichero; el resto de la
          selección se exporta igualmente.
        </template>
        <template v-else>
          Se incluirán las {{ incorrectas.length }} analíticas.
        </template>
      </p>
      <div class="flex flex-wrap justify-end gap-2">
        <BaseButton
          label="Cancelar y revisar"
          color="danger"
          outline
          rounded
          @click="onCancel"
        />
        <BaseButton
          :label="etiquetaConfirmar"
          color="info"
          rounded
          @click="onConfirm"
        />
      </div>
    </div>
  </CardBoxModal>
</template>
