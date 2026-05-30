import { ref, reactive, computed, watch } from 'vue'
import { getAnaliticasPaginated, getAnaliticasFiltered } from '@/services/analiticas'

export function useServerPagination(initialOptions = {}) {
  const loading = ref(false)
  const error = ref(null)

  // Request deduplication: discard stale responses
  let requestId = 0

  // Estado de la paginación
  const pagination = reactive({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  })

  // Estado del ordenamiento
  const sorting = reactive({
    sortBy: 'fecha',
    sortOrder: 'desc'
  })

  // Filtros
  const filters = reactive({
    fecha_inicio: null,
    fecha_final: null,
    punto_muestreo_fk: null,
    personal_fk: null,
    type: null,
    zona_fk: null
  })

  // Búsqueda
  const searchText = ref('')

  // Datos
  const data = ref([])

  // Debounce timer for filters
  let filterDebounceTimer = null

  // Computed para información de paginación
  const paginationInfo = computed(() => ({
    from: (pagination.page - 1) * pagination.pageSize + 1,
    to: Math.min(pagination.page * pagination.pageSize, pagination.totalItems),
    total: pagination.totalItems,
    currentPage: pagination.page,
    totalPages: pagination.totalPages
  }))

  // Función para cargar datos
  const loadData = async () => {
    const currentId = ++requestId
    loading.value = true
    error.value = null

    try {
      // Limpiar filtros vacíos antes de enviar
      const cleanFilters = {}
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          cleanFilters[key] = filters[key]
        }
      })

      const options = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        sortBy: sorting.sortBy,
        sortOrder: sorting.sortOrder,
        filters: cleanFilters,
        searchText: searchText.value
      }

      console.log('🚀 useServerPagination.loadData con opciones:', options)

      const result = await getAnaliticasPaginated(options)

      // Discard stale responses
      if (currentId !== requestId) {
        console.log('⏭️ Respuesta descartada (petición obsoleta)')
        return
      }

      data.value = result.data
      pagination.totalItems = result.count
      pagination.totalPages = result.totalPages
      pagination.hasNextPage = result.hasNextPage
      pagination.hasPreviousPage = result.hasPreviousPage

    } catch (err) {
      if (currentId !== requestId) return
      console.error('Error loading paginated data:', err)
      error.value = err
    } finally {
      if (currentId === requestId) {
        loading.value = false
      }
    }
  }

  // Funciones de navegación
  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      pagination.page = page
    }
  }

  const nextPage = () => {
    if (pagination.hasNextPage) {
      pagination.page++
    }
  }

  const previousPage = () => {
    if (pagination.hasPreviousPage) {
      pagination.page--
    }
  }

  const changePageSize = (newPageSize) => {
    pagination.pageSize = newPageSize
    pagination.page = 1
  }

  // Funciones de ordenamiento
  const toggleSort = (column) => {
    if (sorting.sortBy === column) {
      sorting.sortOrder = sorting.sortOrder === 'asc' ? 'desc' : 'asc'
    } else {
      sorting.sortBy = column
      sorting.sortOrder = 'asc'
    }
    pagination.page = 1
  }

  // Función para aplicar filtros (NO llama loadData — el watcher lo hace)
  const applyFilters = (newFilters) => {
    console.log('⚙️ applyFilters llamado con:', newFilters)

    // Limpiar filtros anteriores
    Object.keys(filters).forEach(key => {
      filters[key] = null
    })

    // Aplicar nuevos filtros (el watcher de filters disparará loadData)
    Object.assign(filters, newFilters)
  }

  // Función para limpiar filtros
  const clearFilters = () => {
    Object.keys(filters).forEach(key => {
      filters[key] = null
    })
    searchText.value = ''
  }

  // Función para buscar
  const search = (text) => {
    searchText.value = text
  }

  // Función de refresh
  const refresh = () => {
    loadData()
  }

  // Función para cargar TODAS las analíticas que coinciden con los filtros actuales (sin paginación)
  // Útil para exportaciones y reportes
  const loadAllFilteredData = async () => {
    try {
      const cleanFilters = {}
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          cleanFilters[key] = filters[key]
        }
      })

      const options = {
        sortBy: sorting.sortBy,
        sortOrder: sorting.sortOrder,
        filters: cleanFilters,
        searchText: searchText.value
      }

      const allData = await getAnaliticasFiltered(options)
      return allData
    } catch (err) {
      console.error('Error loading all filtered data:', err)
      throw err
    }
  }

  // Watch para filtros: reset página + cargar (debounced)
  watch(
    filters,
    () => {
      clearTimeout(filterDebounceTimer)
      filterDebounceTimer = setTimeout(() => {
        pagination.page = 1
        loadData()
      }, 300)
    },
    { deep: true }
  )

  // Watch para búsqueda: reset página + cargar (debounced)
  let searchDebounceTimer = null
  watch(
    searchText,
    () => {
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = setTimeout(() => {
        pagination.page = 1
        loadData()
      }, 300)
    }
  )

  // Watch para página, pageSize o sorting (sin debounce — cambios inmediatos)
  watch(
    [() => pagination.page, () => pagination.pageSize, sorting],
    () => {
      console.log('📡 Watcher disparado - cambio en paginación o sorting')
      loadData()
    },
    { deep: true }
  )

  return {
    // Estado
    loading,
    error,
    data,
    pagination,
    sorting,
    filters,
    searchText,

    // Computed
    paginationInfo,

    // Métodos
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
  }
}
