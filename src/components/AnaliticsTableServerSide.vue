<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { mdiChevronDown, mdiChevronLeft, mdiPencil, mdiTrashCan, mdiRefresh, mdiMagnify, mdiLoading, mdiRocket } from '@mdi/js'
import TableCheckboxCell from '@/components/TableCheckboxCell.vue'
import BaseLevel from '@/components/BaseLevel.vue'
import BaseButtons from '@/components/BaseButtons.vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseIcon from '@/components/BaseIcon.vue'
import AnaliticsEdit from './AnaliticsEdit.vue'
import CardBoxModal from './CardBoxModal.vue'
import { usePlantasStore } from '../stores/plantas'
import { useLoginStore } from '../stores/login'
import { deleteAnalitica, updateAnaliticabyId, supabase } from '@/services/supabase'
import { useServerPagination } from '@/composables/useServerPagination'
import useFormSelectData from '../composables/useFormSelectData'
import { FormKit } from '@formkit/vue'
import AutocompleteSelect from './AutocompleteSelect.vue'

const checkedRows = ref([])
const fetchingAll = ref(false)
const plantaStore = usePlantasStore()
const loginStore = useLoginStore()

const ORGANOLEPTIC_CORRECT = 1

const turbidezValues = {
  min: 0,
  max: 4
}
const phValues = {
  min: 6.5,
  max: 9.5
}
const cloroValues = {
  min: 0.4,
  max: 1
}

const analiticaToDelete = ref(null)
const analiticaToEdit = ref(null)
const analiticaToUpdate = ref(null)

const {
  form: localFilters,
  selectZona,
  selectPuntosMuestra,
  selectInfraestructura,
  selectUO,
  operarioPorZona,
  resetForm
} = useFormSelectData()

// Usar el composable de paginación server-side
const {
  loading,
  error,
  data: analitics,
  pagination,
  sorting,
  filters,
  searchText,
  paginationInfo,
  loadData,
  goToPage,
  nextPage,
  previousPage,
  changePageSize,
  toggleSort,
  applyFilters,
  clearFilters,
  search,
  refresh,
  loadAllFilteredData
} = useServerPagination()

defineProps({
  checkable: Boolean
})

defineExpose({
  resetForm: () => {
    resetForm()
    clearFilters()
  },
  checkedRows,
  filters: localFilters,
  loadAllFilteredData
})

const showOnlyWrongValues = ref(false)
const expandedRows = ref([])
const isModalDeleteAnaliticsActive = ref(false)
const isModalActive = ref(false)

// Estados de loading específicos
const refreshing = ref(false)

const volumenCache = ref({})

const fetchVolumen = async (analitica) => {
  if (analitica.totalizador == null) return
  if (volumenCache.value[analitica.id] !== undefined) return
  const { data } = await supabase
    .from('analiticas')
    .select('totalizador, fecha')
    .eq('punto_muestreo_fk', analitica.punto_muestreo_fk)
    .not('totalizador', 'is', null)
    .neq('id', analitica.id)
    .lte('fecha', analitica.fecha)
    .order('fecha', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) {
    volumenCache.value[analitica.id] = null
    return
  }

  const volumen = analitica.totalizador - data.totalizador
  const dias = Math.round((new Date(analitica.fecha) - new Date(data.fecha)) / (1000 * 60 * 60 * 24))
  const m3PerDia = dias > 0 ? Math.round((volumen / dias) * 100) / 100 : null
  volumenCache.value[analitica.id] = { volumen, m3PerDia }
}

const toggleExpand = (id) => {
  if (expandedRows.value.includes(id)) {
    expandedRows.value = expandedRows.value.filter((rowId) => rowId !== id)
  } else {
    expandedRows.value.push(id)
    const analitica = filteredAnalitics.value.find((a) => a.id === id)
    if (analitica) fetchVolumen(analitica)
  }
}

// Obtener las zonas del usuario logueado (similar a implementación original)
const userZonas = computed(() => {
  if (loginStore.userRole === 'admin' || loginStore.userRole === 99 || loginStore.userRole === '99') {
    return null
  }

  const operario = plantaStore.getOperarios.find(
    (op) => op.email?.toLowerCase() === loginStore.userEmail?.toLowerCase()
  )
  
  if (!operario) return null
  return operario.zonas || []
})

const getZonaFromAnalitica = (analitica) => {
  const puntoMuestreo = plantaStore.getPuntosMuestreo.find(
    punto => punto.id === analitica.punto_muestreo_fk
  )
  return puntoMuestreo ? puntoMuestreo.zona_fk : null
}

// Páginas para mostrar en el paginador
const pagesList = computed(() => {
  const pages = []
  const current = pagination.page
  const total = pagination.totalPages
  
  // Siempre mostrar primera página
  if (total > 0) pages.push(1)
  
  // Mostrar páginas alrededor de la actual
  const start = Math.max(2, current - 2)
  const end = Math.min(total - 1, current + 2)
  
  if (start > 2) pages.push('...')
  
  for (let i = start; i <= end; i++) {
    if (i !== 1 && i !== total) pages.push(i)
  }
  
  if (end < total - 1) pages.push('...')
  
  // Siempre mostrar última página si hay más de 1
  if (total > 1) pages.push(total)
  
  return pages
})

const getNameOperario = (id) => {
  const operario = plantaStore.getOperarios.find((operario) => operario.id === id)
  return operario ? operario.name : 'No asignado'
}

const getPuntoMuestreo = (id) => {
  const puntoMuestreo = plantaStore.getPuntosMuestreo.find(
    (puntoMuestreo) => puntoMuestreo.id === id
  )
  return puntoMuestreo ? puntoMuestreo.name : 'No asignado'
}

const getTipoAnalitica = (id) => {
  switch (id) {
    case 28:
      return 'Operacional'
    case 29:
      return 'Rutina'
    case 99:
      return 'Seguimiento'
    default:
      return 'Desconocido'
  }
}

// Computed para filtrar analíticas según el checkbox
const filteredAnalitics = computed(() => {
  if (!showOnlyWrongValues.value) {
    return analitics.value
  }
  return analitics.value.filter(analitica => isWrongValues(analitica))
})

const allRowsChecked = computed(() => {
  return filteredAnalitics.value.length > 0 &&
    filteredAnalitics.value.every((analitica) =>
      checkedRows.value.some((row) => row.id === analitica.id)
    )
})

// Funciones de validación (mantenidas de la implementación original)
const isCloroWrong = (analitica) => {
  if (analitica.cloro === null || analitica.cloro === undefined) return false
  return analitica.cloro < cloroValues.min || analitica.cloro > cloroValues.max
}

const isPhWrong = (analitica) => {
  if (analitica.ph === null || analitica.ph === undefined) return false
  return analitica.ph < phValues.min || analitica.ph > phValues.max
}

const isTurbidezWrong = (analitica) => {
  if (analitica.turbidez === null || analitica.turbidez === undefined) return false
  return analitica.turbidez < turbidezValues.min || analitica.turbidez > turbidezValues.max
}

const isOrganolepticWrong = (organolepticValue) => {
  if (organolepticValue === null || organolepticValue === undefined) return false
  return +organolepticValue === 0
}

const isWrongValues = (analitica) => {
  return isCloroWrong(analitica) ||
    isPhWrong(analitica) ||
    isTurbidezWrong(analitica) ||
    isOrganolepticWrong(analitica.olor) ||
    isOrganolepticWrong(analitica.color) ||
    isOrganolepticWrong(analitica.sabor)
}

const toggleAllRows = async (isChecked) => {
  if (isChecked) {
    try {
      fetchingAll.value = true
      // Fetch all matching data from the server instead of just the current page
      // This is crucial for exports (XML, Excel, Print) to include the full dataset
      const allData = await loadAllFilteredData()
      if (allData && allData.length > 0) {
        checkedRows.value = [...allData]
        console.log(`✅ Seleccionadas ${allData.length} analíticas (conjunto completo)`)
      }
    } catch (error) {
      console.error('Error fetching all filtered data for selection:', error)
      // Fallback: select only current page if total fetch fails
      checkedRows.value = [...filteredAnalitics.value]
    } finally {
      fetchingAll.value = false
    }
  } else {
    checkedRows.value = []
  }
}

const addAnalitica = (analitica, isChecked) => {
  if (isChecked) {
    if (!checkedRows.value.some((row) => row.id === analitica.id)) {
      checkedRows.value.push(analitica)
    }
  } else {
    checkedRows.value = checkedRows.value.filter((item) => item.id !== analitica.id)
  }
}

// Obtener IDs de las zonas del usuario (null = sin restricción, [] = sin acceso)
const getUserZonaIds = () => {
  if (!userZonas.value) return null
  return userZonas.value.map(z => typeof z === 'object' ? z.id : z)
}

// Aplicar filtros locales a la paginación server-side
const applyLocalFilters = () => {
  // Crear objeto de filtros sin valores null, undefined o vacíos
  const serverFilters = {}

  if (localFilters.fecha_inicio) serverFilters.fecha_inicio = localFilters.fecha_inicio
  if (localFilters.fecha_final) serverFilters.fecha_final = localFilters.fecha_final
  if (localFilters.punto_muestreo_fk) serverFilters.punto_muestreo_fk = localFilters.punto_muestreo_fk
  if (localFilters.operario) serverFilters.personal_fk = localFilters.operario
  if (localFilters.type) serverFilters.type = localFilters.type
  if (localFilters.zona) serverFilters.zona_fk = localFilters.zona
  if (localFilters.infraestructura) serverFilters.infraestructura_fk = localFilters.infraestructura
  if (localFilters.uo) serverFilters.uo_fk = localFilters.uo

  // Siempre inyectar restricción de zonas para usuarios no admin
  const zonaIds = getUserZonaIds()
  if (zonaIds !== null) {
    serverFilters.zonas_fk = zonaIds
  }

  console.log('🔍 Aplicando filtros locales (filtrados):', serverFilters)
  applyFilters(serverFilters)
}

// Funciones de CRUD (mantenidas de la implementación original)
const handleConfirmDelete = async () => {
  try {
    await deleteAnalitica(analiticaToDelete.value.id)
    await refresh() // Usar refresh del composable
    isModalDeleteAnaliticsActive.value = false
    analiticaToDelete.value = null
  } catch (error) {
    console.error('Error al eliminar:', error)
    alert('Error al eliminar la analítica')
  }
}

const handleConfirmUpdate = async () => {
  try {
    if (!analiticaToUpdate.value) {
      throw new Error('No hay analítica para actualizar')
    }
    await updateAnaliticabyId(analiticaToUpdate.value.id, analiticaToUpdate.value)
    await refresh() // Usar refresh del composable
    isModalActive.value = false
    analiticaToEdit.value = null
    analiticaToUpdate.value = null
  } catch (error) {
    console.error('Error al actualizar:', error)
    alert('Error al actualizar la analítica')
  }
}

const closeModal = () => {
  isModalActive.value = false
  analiticaToEdit.value = null
  analiticaToUpdate.value = null
}

const deleteAnaliticaSeleccionada = async (analitica) => {
  analiticaToDelete.value = analitica
  isModalDeleteAnaliticsActive.value = true
}

const updateAnaliticaSeleccionada = async (analitica) => {
  analiticaToEdit.value = JSON.parse(JSON.stringify(analitica))
  
  const today = new Date().toLocaleDateString()
  const nuevoRegistro = `${today} - Modificado por: ${loginStore.userName}\n${analiticaToEdit.value.observaciones}`
  
  if (analiticaToEdit.value.registro) {
    analiticaToEdit.value.registro = `${nuevoRegistro}\n${analiticaToEdit.value.registro}`
  } else {
    analiticaToEdit.value.registro = nuevoRegistro
  }
  
  await nextTick()
  isModalActive.value = true
}

const handleRefresh = async () => {
  refreshing.value = true
  try {
    await refresh()
  } finally {
    refreshing.value = false
  }
}

const handleSort = (column) => {
  toggleSort(column)
}

// Flag para evitar aplicar filtros durante la inicialización
const isInitializing = ref(true)
// Flag para evitar que los resets en cascada disparen applyLocalFilters múltiples veces
const isResetting = ref(false)

// Watchers con reset en cascada para filtros dependientes
// UO → Zona → Infraestructura → Punto de Muestreo

watch(() => localFilters.uo, async () => {
  if (isInitializing.value || isResetting.value) return
  isResetting.value = true
  localFilters.zona = null
  localFilters.infraestructura = null
  localFilters.punto_muestreo_fk = null
  await nextTick()
  isResetting.value = false
  applyLocalFilters()
})

watch(() => localFilters.zona, async () => {
  if (isInitializing.value || isResetting.value) return
  isResetting.value = true
  localFilters.infraestructura = null
  localFilters.punto_muestreo_fk = null
  await nextTick()
  isResetting.value = false
  applyLocalFilters()
})

watch(() => localFilters.infraestructura, async () => {
  if (isInitializing.value || isResetting.value) return
  isResetting.value = true
  localFilters.punto_muestreo_fk = null
  await nextTick()
  isResetting.value = false
  applyLocalFilters()
})

// Watchers para filtros independientes (sin cascada)
;['fecha_inicio', 'fecha_final', 'punto_muestreo_fk', 'operario', 'type'].forEach(key => {
  watch(
    () => localFilters[key],
    () => {
      if (isInitializing.value || isResetting.value) return
      applyLocalFilters()
    }
  )
})

onMounted(() => {
  console.log('🚀 Componente montado, inicializando...')
  resetForm()

  // Si el usuario no es admin, aplicar restricción de zonas desde el inicio
  const zonaIds = getUserZonaIds()
  if (zonaIds !== null) {
    console.log('🔒 Aplicando restricción de zonas para usuario no-admin:', zonaIds)
    applyFilters({ zonas_fk: zonaIds })
  } else {
    loadData()
  }

  // Habilitar watchers después de la carga inicial
  nextTick(() => {
    isInitializing.value = false
    console.log('✅ Inicialización completa, watchers activos')
  })
})
</script>

<template>
  <CardBoxModal
    v-model="isModalDeleteAnaliticsActive"
    title="Desea Borrar la Analítica?"
    button="danger"
    has-cancel
    @confirm="handleConfirmDelete"
  >
    <p>Si confirma la analitica se borrara <b>definitivamente</b></p>
    <p>Esta seguro de ejecutar esta acción?</p>
  </CardBoxModal>

  <CardBoxModal
    v-model="isModalActive"
    title="Actualizar analítica"
    has-cancel
    @confirm="handleConfirmUpdate"
    @cancel="closeModal"
  >
    <AnaliticsEdit
      v-if="analiticaToEdit"
      :analitic="analiticaToEdit"
      @update="analiticaToUpdate = $event"
    />
    <p class="text-red-600 font-bold">ATENCIÓN:</p>
    <p>
      La modificacion de esta analítica será <b>definitiva</b> y se realizará bajo su propia
      responsabilidad
    </p>
  </CardBoxModal>

  <!-- Controles superiores -->
  <div class="mb-4">
    <div class="flex flex-wrap justify-between items-center gap-y-2 mb-4">
      <div class="flex items-center gap-2">
        <BaseButton
          :icon="refreshing ? mdiLoading : mdiRefresh"
          :color="refreshing ? 'info' : 'success'"
          :disabled="refreshing || loading"
          small
          @click="handleRefresh"
        />
        <span class="text-sm text-gray-600">
          {{ loading ? 'Cargando...' : `${paginationInfo.from}-${paginationInfo.to} de ${paginationInfo.total} registros` }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <label class="text-sm hidden sm:inline">Registros por página:</label>
        <select
          :value="pagination.pageSize"
          class="border rounded px-2 py-1 text-sm"
          :disabled="loading"
          @change="changePageSize(parseInt($event.target.value))"
        >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Filtros -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
    <div class="flex flex-col">
      <label class="font-bold mb-1 text-sm text-gray-700 dark:text-gray-300">Fecha Inicio</label>
      <input 
        type="date" 
        v-model="localFilters.fecha_inicio" 
        :disabled="loading"
        class="w-full border rounded shadow-sm px-3 py-2 text-sm transition-colors bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:dark:bg-slate-800 disabled:text-gray-400 disabled:cursor-not-allowed"
      />
    </div>
    <div class="flex flex-col">
      <label class="font-bold mb-1 text-sm text-gray-700 dark:text-gray-300">Fecha Final</label>
      <input 
        type="date" 
        v-model="localFilters.fecha_final" 
        :disabled="loading"
        class="w-full border rounded shadow-sm px-3 py-2 text-sm transition-colors bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:dark:bg-slate-800 disabled:text-gray-400 disabled:cursor-not-allowed"
      />
    </div>
    <div class="flex flex-col">
      <label class="font-bold mb-1 text-sm text-gray-700 dark:text-gray-300">Unidad Operativa</label>
      <AutocompleteSelect
        v-model="localFilters.uo"
        :options="selectUO"
        placeholder="Unidad Operativa"
        class="w-full"
        :disabled="loading"
      />
    </div>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
    <div class="flex flex-col">
      <label class="font-bold mb-1 text-sm text-gray-700 dark:text-gray-300">Zona de Muestra</label>
      <AutocompleteSelect
        v-model="localFilters.zona"
        :options="selectZona"
        placeholder="Zona de Muestra"
        class="w-full"
        :disabled="loading"
      />
    </div>
    <div class="flex flex-col">
      <label class="font-bold mb-1 text-sm text-gray-700 dark:text-gray-300">Infraestructura</label>
      <AutocompleteSelect
        v-model="localFilters.infraestructura"
        :options="selectInfraestructura"
        placeholder="Infraestructura"
        class="w-full"
        :disabled="loading"
      />
    </div>
    <div class="flex flex-col">
      <label class="font-bold mb-1 text-sm text-gray-700 dark:text-gray-300">Punto de Muestra</label>
      <AutocompleteSelect
        v-model="localFilters.punto_muestreo_fk"
        :options="selectPuntosMuestra"
        placeholder="Punto de muestra"
        class="w-full"
        :disabled="loading"
      />
    </div>
    <div class="flex flex-col">
      <label class="font-bold mb-1 text-sm text-gray-700 dark:text-gray-300">Operario</label>
      <AutocompleteSelect
        v-model="localFilters.operario"
        :options="operarioPorZona"
        placeholder="Operario"
        class="w-full"
        :disabled="loading"
      />
    </div>
  </div>

  <!-- Error state -->
  <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
    Error cargando datos: {{ error.message }}
    <BaseButton 
      label="Reintentar" 
      color="danger" 
      small 
      class="ml-2"
      @click="refresh"
    />
  </div>

  <div v-if="checkedRows.length > 0" class="mb-2 flex items-center justify-between text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg border border-blue-100 dark:border-blue-900/50">
    <div class="flex items-center gap-2">
      <BaseIcon :path="mdiRocket" size="18" />
      <span>Has seleccionado <strong>{{ checkedRows.length }}</strong> analíticas filtradas (en todas las páginas).</span>
    </div>
    <button @click="checkedRows = []" class="text-xs font-bold hover:underline">Deseleccionar todas</button>
  </div>
  <!-- Loading overlay para la tabla -->
  <div class="relative">
    <div v-if="loading" class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded">
      <div class="flex items-center gap-2">
        <BaseIcon :path="mdiLoading" class="animate-spin" />
        <span>Cargando datos...</span>
      </div>
    </div>

    <table class="w-full" :class="{ 'opacity-50': loading }">
      <thead>
        <tr>
          <th v-if="checkable" class="text-center w-12" title="Seleccionar todas las analíticas de todas las páginas que cumplan los filtros actuales">
            <div v-if="fetchingAll" class="flex items-center justify-center">
              <BaseIcon :path="mdiLoading" class="animate-spin text-blue-500" w="w-5" h="h-5" />
            </div>
            <TableCheckboxCell
              v-else
              :model-value="allRowsChecked"
              :disabled="loading || filteredAnalitics.length === 0"
              @update:model-value="toggleAllRows"
            />
          </th>
          <th class="cursor-pointer" @click="!loading && handleSort('fecha')">
            Fecha 
            <span v-if="sorting.sortBy === 'fecha'">
              {{ sorting.sortOrder === 'asc' ? '↑' : '↓' }}
            </span>
          </th>
          <th class="cursor-pointer" @click="!loading && handleSort('punto_muestreo_fk')">
            Punto Muestreo 
            <span v-if="sorting.sortBy === 'punto_muestreo_fk'">
              {{ sorting.sortOrder === 'asc' ? '↑' : '↓' }}
            </span>
          </th>
          <th class="cursor-pointer" @click="!loading && handleSort('personal_fk')">
            Operario
            <span v-if="sorting.sortBy === 'personal_fk'">
              {{ sorting.sortOrder === 'asc' ? '↑' : '↓' }}
            </span>
          </th>
          <th class="cursor-pointer" @click="!loading && handleSort('type')">
            Tipo
            <span v-if="sorting.sortBy === 'type'">
              {{ sorting.sortOrder === 'asc' ? '↑' : '↓' }}
            </span>
          </th>
          <th class="text-center">
            <TableCheckboxCell
              :model-value="showOnlyWrongValues"
              label="Solo valores incorrectos"
              :disabled="loading"
              @update:model-value="showOnlyWrongValues = $event"
            />
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-for="analitica in filteredAnalitics" :key="analitica.id">
          <tr>
            <TableCheckboxCell
              v-if="checkable"
              :model-value="checkedRows.some((row) => row.id === analitica.id)"
              :disabled="loading"
              @update:model-value="(isChecked) => addAnalitica(analitica, isChecked)"
            />

            <td data-label="Fecha">
              {{ analitica.fecha }}
            </td>
            <td data-label="Punto de Muestreo">
              {{ getPuntoMuestreo(analitica.punto_muestreo_fk) }}
            </td>
            <td data-label="Persona">
              {{ getNameOperario(analitica.personal_fk) }}
            </td>
            <td data-label="Tipo Analítica" class="lg:w-32">
              {{ getTipoAnalitica(analitica.type) }}
            </td>

            <td>
              <BaseButton
                :icon="expandedRows.includes(analitica.id) ? mdiChevronDown : mdiChevronLeft"
                :color="isWrongValues(analitica) ? 'danger' : 'info'"
                :disabled="loading"
                @click="toggleExpand(analitica.id)"
              />
            </td>
          </tr>
          <tr v-if="expandedRows.includes(analitica.id)" :key="`expanded-${analitica.id}`">
            <td colspan="6" class="p-0 border-b border-gray-200 dark:border-slate-700">
              <div class="bg-gray-50 dark:bg-slate-800/50 px-5 py-4">

                <!-- Header -->
                <div class="flex items-center justify-between mb-4">
                  <span class="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    Parámetros analíticos
                  </span>
                  <BaseButtons>
                    <BaseButton color="info" :icon="mdiPencil" small :disabled="loading" @click="updateAnaliticaSeleccionada(analitica)" />
                    <BaseButton color="danger" :icon="mdiTrashCan" small :disabled="loading" @click="deleteAnaliticaSeleccionada(analitica)" />
                  </BaseButtons>
                </div>

                <!-- Metric cards -->
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4" :class="{ 'lg:grid-cols-4': analitica.totalizador != null }">
                  <!-- Cloro -->
                  <div
                    :class="[
                      'rounded-xl p-2 sm:p-3 flex flex-col gap-1 border',
                      isCloroWrong(analitica)
                        ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
                        : 'bg-white border-gray-200 dark:bg-slate-700 dark:border-slate-600'
                    ]"
                  >
                    <span class="text-xs font-medium uppercase tracking-wide text-gray-400">Cloro libre</span>
                    <span
                      :class="[
                        'text-xl sm:text-2xl font-bold',
                        isCloroWrong(analitica) ? 'text-red-500' : 'text-gray-800 dark:text-white'
                      ]"
                    >
                      {{ analitica.cloro != null ? analitica.cloro : '—' }}
                    </span>
                    <div class="flex flex-wrap items-center gap-1">
                      <span class="text-xs text-gray-400">mg/l &nbsp;[0,4 – 1]</span>
                      <span
                        :class="[
                          'text-xs font-semibold px-2 py-0.5 rounded-full',
                          analitica.cloro == null
                            ? 'bg-gray-100 text-gray-400 dark:bg-slate-600 dark:text-gray-400'
                            : isCloroWrong(analitica)
                              ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                              : 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'
                        ]"
                      >
                        {{ analitica.cloro == null ? 'Sin muestra' : isCloroWrong(analitica) ? '⚠ Fuera de rango' : '✓ Correcto' }}
                      </span>
                    </div>
                  </div>

                  <!-- pH -->
                  <div
                    :class="[
                      'rounded-xl p-2 sm:p-3 flex flex-col gap-1 border',
                      isPhWrong(analitica)
                        ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
                        : 'bg-white border-gray-200 dark:bg-slate-700 dark:border-slate-600'
                    ]"
                  >
                    <span class="text-xs font-medium uppercase tracking-wide text-gray-400">pH</span>
                    <span
                      :class="[
                        'text-xl sm:text-2xl font-bold',
                        isPhWrong(analitica) ? 'text-red-500' : 'text-gray-800 dark:text-white'
                      ]"
                    >
                      {{ analitica.ph != null ? analitica.ph : '—' }}
                    </span>
                    <div class="flex flex-wrap items-center gap-1">
                      <span class="text-xs text-gray-400">ud &nbsp;[6,5 – 9,5]</span>
                      <span
                        :class="[
                          'text-xs font-semibold px-2 py-0.5 rounded-full',
                          analitica.ph == null
                            ? 'bg-gray-100 text-gray-400 dark:bg-slate-600 dark:text-gray-400'
                            : isPhWrong(analitica)
                              ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                              : 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'
                        ]"
                      >
                        {{ analitica.ph == null ? 'Sin muestra' : isPhWrong(analitica) ? '⚠ Fuera de rango' : '✓ Correcto' }}
                      </span>
                    </div>
                  </div>

                  <!-- Turbidez -->
                  <div
                    :class="[
                      'rounded-xl p-2 sm:p-3 flex flex-col gap-1 border',
                      isTurbidezWrong(analitica)
                        ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
                        : 'bg-white border-gray-200 dark:bg-slate-700 dark:border-slate-600'
                    ]"
                  >
                    <span class="text-xs font-medium uppercase tracking-wide text-gray-400">Turbidez</span>
                    <span
                      :class="[
                        'text-xl sm:text-2xl font-bold',
                        isTurbidezWrong(analitica) ? 'text-red-500' : 'text-gray-800 dark:text-white'
                      ]"
                    >
                      {{ analitica.turbidez != null ? analitica.turbidez : '—' }}
                    </span>
                    <div class="flex flex-wrap items-center gap-1">
                      <span class="text-xs text-gray-400">UNT &nbsp;[0 – 4]</span>
                      <span
                        :class="[
                          'text-xs font-semibold px-2 py-0.5 rounded-full',
                          analitica.turbidez == null
                            ? 'bg-gray-100 text-gray-400 dark:bg-slate-600 dark:text-gray-400'
                            : isTurbidezWrong(analitica)
                              ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                              : 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'
                        ]"
                      >
                        {{ analitica.turbidez == null ? 'Sin muestra' : isTurbidezWrong(analitica) ? '⚠ Fuera de rango' : '✓ Correcto' }}
                      </span>
                    </div>
                  </div>
                  <!-- Totalizador / Volumen -->
                  <div
                    v-if="analitica.totalizador != null"
                    class="rounded-xl p-3 flex flex-col gap-1 border bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700"
                  >
                    <span class="text-xs font-medium uppercase tracking-wide text-gray-400">Totalizador</span>
                    <span class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {{ analitica.totalizador }} <span class="text-sm font-normal text-gray-400">m³</span>
                    </span>
                    <div v-if="volumenCache[analitica.id] != null" class="border-t border-blue-200 dark:border-blue-700 mt-1 pt-1">
                      <span class="text-xs font-medium uppercase tracking-wide text-gray-400">Volumen consumido</span>
                      <div class="flex items-baseline gap-3 flex-wrap">
                        <span class="text-xl font-bold text-blue-500 dark:text-blue-300">
                          {{ volumenCache[analitica.id].volumen }} <span class="text-sm font-normal text-gray-400">m³</span>
                        </span>
                        <span
                          v-if="volumenCache[analitica.id].m3PerDia != null"
                          class="text-sm font-semibold text-blue-400 dark:text-blue-300 whitespace-nowrap"
                        >
                          · {{ volumenCache[analitica.id].m3PerDia }} m³/día
                        </span>
                      </div>
                    </div>
                    <span v-else class="text-xs text-gray-400 italic">Sin analítica anterior para calcular volumen</span>
                  </div>
                </div>

                <!-- Organolépticos (solo Rutina tipo 29) -->
                <div v-if="analitica.type === 29" class="flex flex-wrap items-center gap-2 mb-4">
                  <span class="text-xs font-semibold uppercase tracking-wide text-gray-400 mr-1">Organolépticos:</span>
                  <span
                    v-for="({ key, label }) in [{ key: 'olor', label: 'Olor' }, { key: 'color', label: 'Color' }, { key: 'sabor', label: 'Sabor' }]"
                    :key="key"
                    :class="[
                      'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold',
                      isOrganolepticWrong(analitica[key])
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                        : 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'
                    ]"
                  >
                    {{ label }}: {{ analitica[key] === ORGANOLEPTIC_CORRECT ? '✓ Correcto' : '⚠ Incorrecto' }}
                  </span>
                </div>

                <!-- Datos secundarios -->
                <div
                  class="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-slate-600 pt-3"
                >
                  <span v-if="plantaStore.getPuntosMuestreo.find(p => p.id === analitica.punto_muestreo_fk)?.sn_contador">
                    <span class="font-semibold text-gray-500 dark:text-gray-400">S/N Contador:</span>
                    {{ plantaStore.getPuntosMuestreo.find(p => p.id === analitica.punto_muestreo_fk)?.sn_contador }}
                  </span>
                  <span v-if="analitica.observaciones" class="w-full">
                    <span class="font-semibold text-gray-500 dark:text-gray-400">Observaciones:</span>
                    {{ analitica.observaciones }}
                  </span>
                </div>

              </div>
            </td>
          </tr>
        </template>

        <!-- Empty state -->
        <tr v-if="!loading && filteredAnalitics.length === 0">
          <td :colspan="checkable ? 6 : 5" class="text-center py-8 text-gray-500">
            {{ showOnlyWrongValues ? 'No hay analíticas con valores incorrectos' : 'No se encontraron analíticas con los filtros aplicados' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Paginación -->
  <div class="p-3 lg:px-6 border-t border-gray-100 dark:border-slate-800">
    <BaseLevel>
      <BaseButtons>
        <BaseButton
          label="Anterior"
          color="whiteDark"
          small
          :disabled="!pagination.hasPreviousPage || loading"
          @click="previousPage"
        />
        <template v-for="page in pagesList" :key="page">
          <BaseButton
            v-if="page !== '...'"
            :label="page.toString()"
            :color="page === pagination.page ? 'lightDark' : 'whiteDark'"
            small
            :disabled="loading"
            @click="goToPage(page)"
          />
          <span v-else class="px-2 py-1 text-sm">...</span>
        </template>
        <BaseButton
          label="Siguiente"
          color="whiteDark"
          small
          :disabled="!pagination.hasNextPage || loading"
          @click="nextPage"
        />
      </BaseButtons>
      
      <div class="text-sm text-gray-600">
        <div>{{ paginationInfo.from }}-{{ paginationInfo.to }} de {{ paginationInfo.total }}</div>
        <div>Página {{ paginationInfo.currentPage }} de {{ paginationInfo.totalPages }}</div>
      </div>
    </BaseLevel>
  </div>
</template>

<style scoped>
/* ===== Desktop table ===== */
table {
  @apply min-w-full divide-y divide-gray-200;
}

thead th {
  @apply px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-slate-700 dark:text-gray-400;
}

tbody td {
  @apply px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white;
}

tbody tr:nth-child(even) {
  @apply bg-gray-50 dark:bg-slate-800/50;
}

/* ===== Mobile card layout ===== */
@media (max-width: 767px) {
  table {
    display: block;
    min-width: auto;
  }

  thead {
    display: none;
  }

  tbody {
    display: block;
  }

  tbody tr {
    display: block;
    margin-bottom: 0.5rem;
    border-radius: 0.5rem;
    overflow: hidden;
    @apply border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800;
  }

  /* Neutralizar el rayado zebra en móvil */
  tbody tr:nth-child(even) {
    @apply bg-white dark:bg-slate-800;
  }

  tbody td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    white-space: normal;
    @apply border-b border-gray-100 dark:border-slate-700 text-sm text-gray-900 dark:text-white;
  }

  tbody td:last-child {
    border-bottom: none;
  }

  /* Label automático desde el atributo data-label */
  tbody td[data-label]::before {
    content: attr(data-label);
    flex-shrink: 0;
    margin-right: 0.75rem;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    @apply text-gray-400 dark:text-gray-500;
  }

  /* Celdas sin label (checkbox, botón expandir) → alinear a la derecha */
  tbody td:not([data-label]) {
    justify-content: flex-end;
    padding: 0.25rem 0.75rem;
  }

  /* Fila expandida — ocupa todo el ancho sin pseudo-label */
  tbody td[colspan] {
    display: block;
    padding: 0;
    border-bottom: none;
  }

  tbody td[colspan]::before {
    content: none;
  }
}

/* ===== Spinner ===== */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
</style>