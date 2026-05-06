<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  mdiChevronLeft,
  mdiChevronRight,
  mdiChevronDoubleLeft,
  mdiChevronDoubleRight,
  mdiRefresh,
  mdiAccount,
  mdiFileDocumentOutline,
  mdiArrowUpCircle,
  mdiArrowDownCircle,
  mdiPencil,
  mdiTrashCan
} from '@mdi/js'
import BaseButton from './BaseButton.vue'
import BaseButtons from './BaseButtons.vue'
import BaseIcon from './BaseIcon.vue'
import PillTag from './PillTag.vue'
import { getAuditLogs } from '@/services/auditLog'
import { useNotifications } from '@/composables/useNotifications'

const { error: notifyError } = useNotifications()

// State
const logs = ref([])
const loading = ref(false)
const count = ref(0)
const totalPages = ref(0)
const page = ref(1)
const pageSize = ref(25)
const sortBy = ref('created_at')
const sortOrder = ref('desc')

// Filters
const filterEntity = ref('')
const filterAction = ref('')
const filterUserId = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')

// Expanded rows
const expandedRows = ref(new Set())

// Debounced user filter
let userFilterTimer = null

watch(filterUserId, () => {
  if (userFilterTimer) clearTimeout(userFilterTimer)
  userFilterTimer = setTimeout(() => {
    applyFilters()
  }, 400)
})

onUnmounted(() => {
  if (userFilterTimer) clearTimeout(userFilterTimer)
})

// Entity display names
const entityNames = {
  operarios: 'Operario',
  zonas: 'Zona',
  uo: 'Unidad Operativa',
  infraestructuras: 'Infraestructura',
  puntos_muestreo: 'Punto Muestreo',
  parametros_calidad: 'Parámetro Calidad',
  analiticas: 'Analítica',
  centros_coste: 'Centro Coste'
}

const actionNames = {
  CREATE: 'Creado',
  UPDATE: 'Modificado',
  DELETE: 'Eliminado'
}

const actionColors = {
  CREATE: 'success',
  UPDATE: 'warning',
  DELETE: 'danger'
}

const entityColors = {
  operarios: 'info',
  zonas: 'success',
  uo: 'warning',
  infraestructuras: 'info',
  puntos_muestreo: 'success',
  parametros_calidad: 'danger',
  analiticas: 'warning',
  centros_coste: 'info'
}

// Computed
const totalRecords = computed(() => count.value)

const pages = computed(() => {
  const pagesArray = []
  const current = page.value
  const total = totalPages.value
  const delta = 2

  for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
    pagesArray.push(i)
  }

  return pagesArray
})

const formattedLogs = computed(() => {
  return logs.value.map((log) => {
    const summary = buildSummary(log)
    const beforeJson = log.before_values
    const afterJson = log.after_values
    const diff = buildDiff(beforeJson, afterJson)
    return { ...log, summary, diff, beforeJson, afterJson }
  })
})

// Functions
const buildSummary = (log) => {
  const entityName = entityNames[log.entity] || log.entity
  const actionName = actionNames[log.action] || log.action
  const userName = log.user_name || log.user_id

  if (log.action === 'CREATE') {
    return `${userName} creó ${entityName} #${log.record_id}`
  }
  if (log.action === 'UPDATE') {
    return `${userName} modificó ${entityName} #${log.record_id}`
  }
  if (log.action === 'DELETE') {
    return `${userName} eliminó ${entityName} #${log.record_id}`
  }
  return `${userName} — ${actionName} — ${entityName} #${log.record_id}`
}

const buildDiff = (before, after) => {
  if (!before && !after) return []
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})])
  const changes = []

  for (const key of allKeys) {
    const beforeVal = before?.[key]
    const afterVal = after?.[key]
    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      changes.push({
        field: key,
        before: beforeVal,
        after: afterVal
      })
    }
  }

  return changes
}

const toggleRow = (index) => {
  const newSet = new Set(expandedRows.value)
  if (newSet.has(index)) {
    newSet.delete(index)
  } else {
    newSet.add(index)
  }
  expandedRows.value = newSet
}

const fetchLogs = async () => {
  loading.value = true
  try {
    const result = await getAuditLogs({
      entity: filterEntity.value || undefined,
      action: filterAction.value || undefined,
      userId: filterUserId.value || undefined,
      dateFrom: filterDateFrom.value || undefined,
      dateTo: filterDateTo.value ? `${filterDateTo.value}T23:59:59` : undefined,
      page: page.value,
      pageSize: pageSize.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value
    })

    logs.value = result.data
    count.value = result.count
    totalPages.value = result.totalPages
  } catch (err) {
    notifyError('No se pudieron cargar los registros de auditoría.', {
      title: 'Error al cargar'
    })
  } finally {
    loading.value = false
  }
}

const applyFilters = () => {
  page.value = 1
  fetchLogs()
}

const clearFilters = () => {
  filterEntity.value = ''
  filterAction.value = ''
  filterUserId.value = ''
  filterDateFrom.value = ''
  filterDateTo.value = ''
  page.value = 1
  fetchLogs()
}

const handleSort = (column) => {
  if (sortBy.value === column) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = column
    sortOrder.value = column === 'created_at' ? 'desc' : 'asc'
  }
  fetchLogs()
}

const sortIcon = (column) => {
  if (sortBy.value !== column) return null
  return sortOrder.value === 'asc' ? mdiArrowUpCircle : mdiArrowDownCircle
}

const formatDate = (isoString) => {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  fetchLogs()
})
</script>

<template>
  <div>
    <!-- Filters -->
    <div class="flex flex-wrap gap-3 items-end mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Entidad</label>
        <select
          v-model="filterEntity"
          class="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100"
          @change="applyFilters"
        >
          <option value="">Todas</option>
          <option v-for="(name, key) in entityNames" :key="key" :value="key">{{ name }}</option>
        </select>
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Acción</label>
        <select
          v-model="filterAction"
          class="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100"
          @change="applyFilters"
        >
          <option value="">Todas</option>
          <option v-for="(name, key) in actionNames" :key="key" :value="key">{{ name }}</option>
        </select>
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Usuario</label>
        <input
          v-model="filterUserId"
          type="text"
          placeholder="Email o nombre"
          class="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 placeholder-gray-400"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Desde</label>
        <input
          v-model="filterDateFrom"
          type="date"
          class="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100"
          @change="applyFilters"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Hasta</label>
        <input
          v-model="filterDateTo"
          type="date"
          class="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100"
          @change="applyFilters"
        />
      </div>

      <BaseButtons>
        <BaseButton
          label="Buscar"
          :icon="mdiRefresh"
          color="info"
          small
          @click="applyFilters"
        />
        <BaseButton
          label="Limpiar"
          color="whiteDark"
          small
          outline
          @click="clearFilters"
        />
      </BaseButtons>
    </div>

    <!-- Count -->
    <div class="mb-2 text-sm text-gray-500 dark:text-gray-400">
      {{ totalRecords }} registro{{ totalRecords !== 1 ? 's' : '' }} encontrado{{ totalRecords !== 1 ? 's' : '' }}
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead>
          <tr>
            <th
              class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 cursor-pointer select-none"
              @click="handleSort('created_at')"
            >
              <span class="flex items-center gap-1">
                Fecha
                <BaseIcon v-if="sortIcon('created_at')" :path="sortIcon('created_at')" w="h-4 w-4" />
              </span>
            </th>
            <th
              class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 cursor-pointer select-none"
              @click="handleSort('user_name')"
            >
              <span class="flex items-center gap-1">
                Usuario
                <BaseIcon v-if="sortIcon('user_name')" :path="sortIcon('user_name')" w="h-4 w-4" />
              </span>
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Acción</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Entidad</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Resumen</th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Detalle</th>
          </tr>
        </thead>

        <tbody v-if="loading" class="divide-y divide-gray-100 dark:divide-gray-700">
          <tr>
            <td colspan="6" class="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
              <span class="inline-flex items-center gap-2">
                <span class="animate-spin h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                Cargando registros...
              </span>
            </td>
          </tr>
        </tbody>

        <tbody v-else-if="logs.length === 0" class="divide-y divide-gray-100 dark:divide-gray-700">
          <tr>
            <td colspan="6" class="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
              No hay registros de auditoría.
            </td>
          </tr>
        </tbody>

        <tbody v-else class="divide-y divide-gray-100 dark:divide-gray-700">
          <template v-for="(log, index) in formattedLogs" :key="log.id">
            <!-- Main row -->
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td class="px-4 py-3 text-sm whitespace-nowrap dark:text-gray-100">
                {{ formatDate(log.created_at) }}
              </td>
              <td class="px-4 py-3 text-sm whitespace-nowrap dark:text-gray-100">
                <div class="flex items-center gap-1.5">
                  <BaseIcon :path="mdiAccount" w="h-3.5 w-3.5 text-gray-400" />
                  {{ log.user_name }}
                </div>
                <div class="text-xs text-gray-400">{{ log.user_id }}</div>
              </td>
              <td class="px-4 py-3">
                <PillTag
                  :label="actionNames[log.action] || log.action"
                  :color="actionColors[log.action] || 'white'"
                  :icon="log.action === 'CREATE' ? mdiFileDocumentOutline : log.action === 'UPDATE' ? mdiPencil : mdiTrashCan"
                  small
                />
              </td>
              <td class="px-4 py-3">
                <PillTag
                  :label="entityNames[log.entity] || log.entity"
                  :color="entityColors[log.entity] || 'white'"
                  small
                />
              </td>
              <td class="px-4 py-3 text-sm dark:text-gray-100 max-w-xs truncate">
                {{ log.summary }}
              </td>
              <td class="px-4 py-3 text-center">
                <button
                  v-if="log.diff && log.diff.length > 0"
                  class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  @click="toggleRow(index)"
                >
                  {{ expandedRows.has(index) ? 'Ocultar' : 'Ver cambios' }}
                </button>
                <span v-else class="text-xs text-gray-400">—</span>
              </td>
            </tr>

            <!-- Expanded diff row -->
            <tr v-if="expandedRows.has(index) && log.diff && log.diff.length > 0">
              <td colspan="6" class="px-4 py-3 bg-gray-50 dark:bg-gray-800/80">
                <div class="text-sm">
                  <div class="font-semibold mb-2 text-gray-700 dark:text-gray-300">
                    Cambios detectados ({{ log.diff.length }}):
                  </div>
                  <div class="space-y-1">
                    <div
                      v-for="change in log.diff"
                      :key="change.field"
                      class="flex items-start gap-3 text-xs font-mono bg-white dark:bg-gray-900 rounded px-3 py-2 border border-gray-200 dark:border-gray-700"
                    >
                      <span class="font-semibold text-gray-600 dark:text-gray-300 min-w-[140px]">
                        {{ change.field }}
                      </span>
                      <span class="text-red-600 dark:text-red-400 line-through">
                        {{ change.before ?? '(nulo)' }}
                      </span>
                      <span class="text-gray-400">→</span>
                      <span class="text-green-600 dark:text-green-400 font-medium">
                        {{ change.after ?? '(nulo)' }}
                      </span>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex flex-wrap items-center justify-between mt-4 gap-4">
      <div class="text-sm text-gray-500 dark:text-gray-400">
        Página {{ page }} de {{ totalPages }}
      </div>

      <BaseButtons>
        <BaseButton
          :icon="mdiChevronDoubleLeft"
          label="Primera"
          color="whiteDark"
          small
          outline
          :disabled="page <= 1"
          @click="page = 1; fetchLogs()"
        />
        <BaseButton
          :icon="mdiChevronLeft"
          label="Anterior"
          color="whiteDark"
          small
          outline
          :disabled="page <= 1"
          @click="page--; fetchLogs()"
        />

        <BaseButton
          v-for="p in pages"
          :key="p"
          :label="String(p)"
          :color="p === page ? 'info' : 'whiteDark'"
          small
          :outline="p !== page"
          @click="page = p; fetchLogs()"
        />

        <BaseButton
          label="Siguiente"
          :icon="mdiChevronRight"
          color="whiteDark"
          small
          outline
          :disabled="page >= totalPages"
          @click="page++; fetchLogs()"
        />
        <BaseButton
          label="Última"
          :icon="mdiChevronDoubleRight"
          color="whiteDark"
          small
          outline
          :disabled="page >= totalPages"
          @click="page = totalPages; fetchLogs()"
        />
      </BaseButtons>
    </div>
  </div>
</template>
