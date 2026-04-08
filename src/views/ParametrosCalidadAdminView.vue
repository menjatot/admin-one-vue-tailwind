<script setup>
import { computed, onMounted, ref } from 'vue'
import { mdiTune } from '@mdi/js'
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'
import SectionTitleLineWithButton from '@/components/SectionTitleLineWithButton.vue'
import CardBox from '@/components/CardBox.vue'
import BaseButton from '@/components/BaseButton.vue'
import { usePlantasStore } from '@/stores/plantas'
import { useNotifications } from '@/composables/useNotifications'
import {
  getAllParametrosCalidad,
  upsertParametroCalidad
} from '@/services/parametrosCalidad'
import { DEFAULT_ANALITICA_RANGES, normalizeParametrosCalidad } from '@/constants/parametrosCalidad'

const plantasStore = usePlantasStore()
const { success: notifySuccess, error: notifyError } = useNotifications()

const loading = ref(false)
const savingByComunidad = ref({})
const rangesByComunidad = ref({})

const comunidades = computed(() =>
  [...(plantasStore.getComunidadesAutonomas || [])].sort((a, b) => a.name.localeCompare(b.name))
)

const ensureRangeRow = (comunidadId) => {
  if (!rangesByComunidad.value[comunidadId]) {
    rangesByComunidad.value[comunidadId] = {
      cloro_min: DEFAULT_ANALITICA_RANGES.cloro.min,
      cloro_max: DEFAULT_ANALITICA_RANGES.cloro.max,
      ph_min: DEFAULT_ANALITICA_RANGES.ph.min,
      ph_max: DEFAULT_ANALITICA_RANGES.ph.max,
      turbidez_min: DEFAULT_ANALITICA_RANGES.turbidez.min,
      turbidez_max: DEFAULT_ANALITICA_RANGES.turbidez.max
    }
  }

  return rangesByComunidad.value[comunidadId]
}

const hydrateRanges = (records) => {
  const next = {}

  comunidades.value.forEach((comunidad) => {
    const row = records.find((record) => record.comunidades_autonomas_fk === comunidad.id)
    const normalized = normalizeParametrosCalidad(row)

    next[comunidad.id] = {
      cloro_min: normalized.cloro.min,
      cloro_max: normalized.cloro.max,
      ph_min: normalized.ph.min,
      ph_max: normalized.ph.max,
      turbidez_min: normalized.turbidez.min,
      turbidez_max: normalized.turbidez.max
    }
  })

  rangesByComunidad.value = next
}

const validateRow = (row) => {
  if (row.cloro_min > row.cloro_max) return 'Cloro min no puede ser mayor que cloro max'
  if (row.ph_min > row.ph_max) return 'pH min no puede ser mayor que pH max'
  if (row.turbidez_min > row.turbidez_max) return 'Turbidez min no puede ser mayor que turbidez max'
  return null
}

const loadData = async () => {
  loading.value = true
  try {
    if (!plantasStore.getComunidadesAutonomas?.length) {
      await plantasStore.loadComunidadesAutonomas()
    }

    const records = await getAllParametrosCalidad()
    hydrateRanges(records)
  } catch (e) {
    console.error('Error cargando parámetros de calidad:', e)
    notifyError('No se pudieron cargar los parámetros de calidad por comunidad.', {
      title: 'Error de carga'
    })
  } finally {
    loading.value = false
  }
}

const saveComunidad = async (comunidadId) => {
  const row = ensureRangeRow(comunidadId)
  const validationError = validateRow(row)

  if (validationError) {
    notifyError(validationError, { title: 'Rangos inválidos' })
    return
  }

  savingByComunidad.value[comunidadId] = true
  try {
    await upsertParametroCalidad({
      comunidades_autonomas_fk: comunidadId,
      cloro_min: Number(row.cloro_min),
      cloro_max: Number(row.cloro_max),
      ph_min: Number(row.ph_min),
      ph_max: Number(row.ph_max),
      turbidez_min: Number(row.turbidez_min),
      turbidez_max: Number(row.turbidez_max)
    })

    notifySuccess('Rangos guardados correctamente para la comunidad.', {
      title: 'Parámetros actualizados'
    })
  } catch (e) {
    console.error('Error guardando parámetros de calidad:', e)
    notifyError('No se pudieron guardar los rangos para la comunidad seleccionada.', {
      title: 'Error al guardar'
    })
  } finally {
    savingByComunidad.value[comunidadId] = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <SectionTitleLineWithButton :icon="mdiTune" title="Parámetros de Calidad" main />

      <CardBox has-table>
        <div class="p-4 text-sm text-gray-600 dark:text-gray-300 border-b border-gray-100 dark:border-slate-700">
          Configura los rangos analíticos por comunidad autónoma. Estos rangos se aplican a la
          detección de valores fuera de rango en las tablas de analíticas.
        </div>

        <div v-if="loading" class="p-6 text-center text-gray-500">Cargando parámetros...</div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[900px]">
            <thead>
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Comunidad</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Cloro min</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Cloro max</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">pH min</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">pH max</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Turbidez min</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Turbidez max</th>
                <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="comunidad in comunidades"
                :key="comunidad.id"
                class="border-t border-gray-100 dark:border-slate-700"
              >
                <td class="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                  {{ comunidad.name }}
                </td>
                <td class="px-4 py-3">
                  <input v-model.number="ensureRangeRow(comunidad.id).cloro_min" type="number" step="0.01" class="w-28 rounded border border-gray-300 px-2 py-1 text-sm" />
                </td>
                <td class="px-4 py-3">
                  <input v-model.number="ensureRangeRow(comunidad.id).cloro_max" type="number" step="0.01" class="w-28 rounded border border-gray-300 px-2 py-1 text-sm" />
                </td>
                <td class="px-4 py-3">
                  <input v-model.number="ensureRangeRow(comunidad.id).ph_min" type="number" step="0.01" class="w-28 rounded border border-gray-300 px-2 py-1 text-sm" />
                </td>
                <td class="px-4 py-3">
                  <input v-model.number="ensureRangeRow(comunidad.id).ph_max" type="number" step="0.01" class="w-28 rounded border border-gray-300 px-2 py-1 text-sm" />
                </td>
                <td class="px-4 py-3">
                  <input v-model.number="ensureRangeRow(comunidad.id).turbidez_min" type="number" step="0.01" class="w-28 rounded border border-gray-300 px-2 py-1 text-sm" />
                </td>
                <td class="px-4 py-3">
                  <input v-model.number="ensureRangeRow(comunidad.id).turbidez_max" type="number" step="0.01" class="w-28 rounded border border-gray-300 px-2 py-1 text-sm" />
                </td>
                <td class="px-4 py-3 text-right">
                  <BaseButton
                    color="info"
                    small
                    label="Guardar"
                    :disabled="savingByComunidad[comunidad.id]"
                    @click="saveComunidad(comunidad.id)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardBox>
    </SectionMain>
  </LayoutAuthenticated>
</template>
