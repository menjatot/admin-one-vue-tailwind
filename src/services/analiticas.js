import { supabase } from './supabase'
import { logAudit } from './auditLog'

const PAGE_SIZE = 1000
const MAX_IN_FILTER = 300

// Paginate a Supabase query to fetch all rows (Supabase caps at 1000 by default)
const fetchAll = async (query) => {
  let allData = []
  let from = 0
  while (true) {
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    allData = allData.concat(data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return allData
}

// Fetch all rows matching an ID set via batched .in() queries (avoids URL length limits)
const fetchByIdsBatched = async (table, selectQuery, idColumn, ids, buildQuery) => {
  if (ids.length <= MAX_IN_FILTER) {
    let query = supabase.from(table).select(selectQuery).in(idColumn, ids)
    if (buildQuery) query = buildQuery(query)
    return fetchAll(query)
  }

  let allData = []
  for (let i = 0; i < ids.length; i += MAX_IN_FILTER) {
    const batch = ids.slice(i, i + MAX_IN_FILTER)
    let query = supabase.from(table).select(selectQuery).in(idColumn, batch)
    if (buildQuery) query = buildQuery(query)
    const batchData = await fetchAll(query)
    allData = allData.concat(batchData)
  }
  return allData
}

// Get puntos_muestreo IDs that belong to given zonas, via infraestructuras join table
// Batches all .in() queries when zona IDs exceed URL length limits
const getPuntosMuestreoByZonas = async (targetZonas, infraestructuraFk) => {
  // Get infraestructuras linked to the target zonas (batched)
  const infrasData = await fetchByIdsBatched(
    'zonas_infraestructuras', 'infraestructuras_fk', 'zonas_fk', targetZonas
  )

  let infraIdsArray = Array.from(new Set(infrasData.map(i => i.infraestructuras_fk)))

  // If a specific infraestructura is requested, intersect
  if (infraestructuraFk) {
    infraIdsArray = infraIdsArray.filter(id => id === infraestructuraFk)
  }

  console.log(`  ➜ Encontradas ${infraIdsArray.length} infraestructuras para las zonas seleccionadas.`)

  // Build puntos_muestreo: query by infraestructura OR by direct zona_fk, both batched
  const pmIdSet = new Set()

  if (infraIdsArray.length > 0) {
    const byInfra = await fetchByIdsBatched(
      'puntos_muestreo', 'id', 'infraestructura_fk', infraIdsArray
    )
    byInfra.forEach(pm => pmIdSet.add(pm.id))
  }

  // Always also check direct zona_fk (legacy data that bypasses the join table)
  // If infraestructuraFk is set, only match puntos in that specific infraestructura
  const byZona = await fetchByIdsBatched(
    'puntos_muestreo', 'id', 'zona_fk', targetZonas,
    infraestructuraFk ? (q) => q.eq('infraestructura_fk', infraestructuraFk) : undefined
  )
  byZona.forEach(pm => pmIdSet.add(pm.id))

  return Array.from(pmIdSet)
}

export const getAnaliticas = async () => {
  const data = await fetchAll(supabase.from('analiticas').select('*'))
  return data
}

export const getAnaliticasPaginated = async (options = {}) => {
  const {
    page = 1,
    pageSize = 20,
    sortBy = 'fecha',
    sortOrder = 'desc',
    filters = {},
    searchText = ''
  } = options

  console.log('📊 Filtros recibidos en getAnaliticasPaginated:', filters)

  // **PASO 1: Obtener IDs de puntos de muestreo según filtros de UO/infraestructura/zona**
  let puntosMuestreoIds = null

  // Si hay filtro de UO, infraestructura, zona, zonas (array) o centro_coste, hacer query previa
  if (filters.uo_fk || filters.infraestructura_fk || filters.zona_fk || filters.zonas_fk || filters.centro_coste_fk) {
    console.log('🔍 Filtros de UO/Infraestructura/Zona/CC detectados, obteniendo puntos de muestreo...')

    // Sub-paso 1a: Si hay filtro de centro_coste, obtener las zonas que pertenecen a ese CC
    if (filters.centro_coste_fk && !filters.zona_fk) {
      console.log('  🔍 Obteniendo zonas de Centro de Coste:', filters.centro_coste_fk)
      const ccZonasData = await fetchAll(
        supabase.from('zonas_abastecimiento').select('id').eq('centro_coste_fk', filters.centro_coste_fk)
      )

      const ccZonaIds = ccZonasData.map(z => z.id)
      console.log(`  ✓ Encontradas ${ccZonaIds.length} zonas para CC ${filters.centro_coste_fk}`)

      if (ccZonaIds.length === 0) {
        return { data: [], count: 0, page, pageSize, totalPages: 0, hasNextPage: false, hasPreviousPage: false }
      }

      // Inyectar como filtro de zonas (se combina con zonas_fk si existe)
      if (filters.zonas_fk && filters.zonas_fk.length > 0) {
        filters.zonas_fk = filters.zonas_fk.filter(id => ccZonaIds.includes(id))
      } else {
        filters.zonas_fk = ccZonaIds
      }
    }

    // Sub-paso 1b: Si hay filtro de UO, primero obtener las zonas de esa UO
    let zonaIds = null
    if (filters.uo_fk) {
      console.log('  🔍 Obteniendo zonas de UO:', filters.uo_fk)
      const zonasData = await fetchAll(
        supabase.from('zonas_abastecimiento').select('id').eq('unidades_operativas_fk', filters.uo_fk)
      )

      zonaIds = zonasData.map(z => z.id)
      console.log(`  ✓ Encontradas ${zonaIds.length} zonas para UO ${filters.uo_fk}:`, zonaIds)

      if (zonaIds.length === 0) {
        console.log('  ⚠️ No hay zonas para esta UO, retornando 0 resultados')
        return {
          data: [],
          count: 0,
          page,
          pageSize,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      }
    }

    // Sub-paso 1c: Obtener puntos de muestreo con los filtros correspondientes
    const targetZonas = []
    if (filters.zona_fk) targetZonas.push(filters.zona_fk)
    else if (filters.zonas_fk && filters.zonas_fk.length > 0) targetZonas.push(...filters.zonas_fk)
    else if (zonaIds) targetZonas.push(...zonaIds)

    if (targetZonas.length > 0) {
      console.log('  ➜ Buscando puntos de muestreo por zonas:', targetZonas.length, 'zonas')
      const pmIds = await getPuntosMuestreoByZonas(targetZonas, filters.infraestructura_fk)
      puntosMuestreoIds = pmIds
    } else if (filters.infraestructura_fk) {
      // Solo filtro de infraestructura (sin zonas)
      const pmData = await fetchAll(
        supabase.from('puntos_muestreo').select('id').eq('infraestructura_fk', filters.infraestructura_fk)
      )
      puntosMuestreoIds = pmData.map(pm => pm.id)
    }

    console.log(`  ✓ Encontrados ${puntosMuestreoIds.length} puntos de muestreo que cumplen condiciones`)

    // Si no hay puntos de muestreo que cumplan, retornar vacío
    if (puntosMuestreoIds.length === 0) {
      console.log('  ⚠️ No hay puntos de muestreo que cumplan los filtros, retornando 0 resultados')
      return {
        data: [],
        count: 0,
        page,
        pageSize,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false
      }
    }
  }

  // **PASO 2: Query principal de analíticas**
  const selectQuery = '*,personal:personal_fk(id, name),punto_muestreo:punto_muestreo_fk(id, name, zona_fk)'
  console.log('🔗 Select query:', selectQuery)

  // Helper: apply direct filters to a query
  const applyDirectFilters = (query) => {
    if (filters.fecha_inicio) query = query.gte('fecha', filters.fecha_inicio)
    if (filters.fecha_final) query = query.lte('fecha', filters.fecha_final)
    if (filters.punto_muestreo_fk) query = query.eq('punto_muestreo_fk', filters.punto_muestreo_fk)
    if (filters.personal_fk) query = query.eq('personal_fk', filters.personal_fk)
    if (filters.type) query = query.eq('type', filters.type)
    if (searchText) query = query.ilike('observaciones', `%${searchText}%`)
    return query
  }

  const orderDirection = sortOrder === 'desc' ? false : true

  // If we have a large ID set, batch the .in() query to avoid URL length limits
  if (puntosMuestreoIds !== null && puntosMuestreoIds.length > MAX_IN_FILTER) {
    console.log(`  ⚡ Batched query: ${puntosMuestreoIds.length} IDs in batches of ${MAX_IN_FILTER}`)

    const allData = await fetchByIdsBatched(
      'analiticas',
      selectQuery,
      'punto_muestreo_fk',
      puntosMuestreoIds,
      applyDirectFilters
    )

    // Sort
    allData.sort((a, b) => {
      const aVal = a[sortBy]
      const bVal = b[sortBy]
      if (aVal == null) return 1
      if (bVal == null) return -1
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortOrder === 'desc' ? -cmp : cmp
    })

    // Paginate
    const from = (page - 1) * pageSize
    const data = allData.slice(from, from + pageSize)
    const count = allData.length

    console.log(`✅ Query exitosa (batched): ${count} analíticas encontradas, mostrando ${data?.length} en esta página`)

    return {
      data,
      count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
      hasNextPage: page * pageSize < count,
      hasPreviousPage: page > 1
    }
  }

  // Standard query with server-side pagination
  let query = supabase
    .from('analiticas')
    .select(selectQuery, { count: 'exact' })

  if (puntosMuestreoIds !== null) {
    console.log('  ✓ Aplicando filtro punto_muestreo_fk con IDs obtenidos en PASO 1:', puntosMuestreoIds.length, 'IDs')
    query = query.in('punto_muestreo_fk', puntosMuestreoIds)
  }

  query = applyDirectFilters(query)
  query = query.order(sortBy, { ascending: orderDirection })

  // Paginación
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('❌ Error fetching paginated analiticas:', error)
    console.error('   Error details:', error.message, error.details, error.hint)
    throw error
  }

  console.log(`✅ Query exitosa: ${count} analíticas encontradas, mostrando ${data?.length} en esta página`)

  return {
    data,
    count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize),
    hasNextPage: page * pageSize < count,
    hasPreviousPage: page > 1
  }
}

export const getAnaliticasFiltered = async (options = {}) => {
  const {
    sortBy = 'fecha',
    sortOrder = 'desc',
    filters = {},
    searchText = ''
  } = options

  console.log('📊 getAnaliticasFiltered - Filtros recibidos:', filters)

  // **PASO 1: Obtener IDs de puntos de muestreo según filtros de UO/infraestructura/zona**
  let puntosMuestreoIds = null

  if (filters.uo_fk || filters.infraestructura_fk || filters.zona_fk || filters.zonas_fk || filters.centro_coste_fk) {
    console.log('🔍 Filtros de UO/Infraestructura/Zona/CC detectados en getAnaliticasFiltered')

    // Sub-paso 1a: Si hay filtro de centro_coste, obtener las zonas de ese CC
    if (filters.centro_coste_fk && !filters.zona_fk) {
      console.log('  🔍 Obteniendo zonas de Centro de Coste:', filters.centro_coste_fk)
      const ccZonasData = await fetchAll(
        supabase.from('zonas_abastecimiento').select('id').eq('centro_coste_fk', filters.centro_coste_fk)
      )

      const ccZonaIds = ccZonasData.map(z => z.id)
      console.log(`  ✓ Encontradas ${ccZonaIds.length} zonas para CC ${filters.centro_coste_fk}`)

      if (ccZonaIds.length === 0) return []

      if (filters.zonas_fk && filters.zonas_fk.length > 0) {
        filters.zonas_fk = filters.zonas_fk.filter(id => ccZonaIds.includes(id))
      } else {
        filters.zonas_fk = ccZonaIds
      }
    }

    // Sub-paso 1b: Si hay filtro de UO, primero obtener las zonas de esa UO
    let zonaIds = null
    if (filters.uo_fk) {
      console.log('  🔍 Obteniendo zonas de UO:', filters.uo_fk)
      const zonasData = await fetchAll(
        supabase.from('zonas_abastecimiento').select('id').eq('unidades_operativas_fk', filters.uo_fk)
      )

      zonaIds = zonasData.map(z => z.id)
      console.log(`  ✓ Encontradas ${zonaIds.length} zonas para UO ${filters.uo_fk}:`, zonaIds)

      if (zonaIds.length === 0) {
        console.log('  ⚠️ No hay zonas para esta UO, retornando array vacío')
        return []
      }
    }

    const targetZonas = []
    if (filters.zona_fk) targetZonas.push(filters.zona_fk)
    else if (filters.zonas_fk && filters.zonas_fk.length > 0) targetZonas.push(...filters.zonas_fk)
    else if (zonaIds) targetZonas.push(...zonaIds)

    if (targetZonas.length > 0) {
      console.log('  ➜ Buscando puntos de muestreo por zonas:', targetZonas.length, 'zonas')
      const pmIds = await getPuntosMuestreoByZonas(targetZonas, filters.infraestructura_fk)
      puntosMuestreoIds = pmIds
    } else if (filters.infraestructura_fk) {
      const pmData = await fetchAll(
        supabase.from('puntos_muestreo').select('id').eq('infraestructura_fk', filters.infraestructura_fk)
      )
      puntosMuestreoIds = pmData.map(pm => pm.id)
    }

    console.log(`  ✓ Encontrados ${puntosMuestreoIds.length} puntos de muestreo en getAnaliticasFiltered`)

    if (puntosMuestreoIds.length === 0) {
      console.log('  ⚠️ No hay puntos de muestreo, retornando array vacío')
      return []
    }
  }

  // **PASO 2: Query principal de analíticas**
  const selectQuery = '*,personal:personal_fk(id, name),punto_muestreo:punto_muestreo_fk(id, name, zona_fk)'

  // Helper: apply direct filters to a query
  const applyDirectFilters = (query) => {
    if (filters.fecha_inicio) query = query.gte('fecha', filters.fecha_inicio)
    if (filters.fecha_final) query = query.lte('fecha', filters.fecha_final)
    if (filters.punto_muestreo_fk) query = query.eq('punto_muestreo_fk', filters.punto_muestreo_fk)
    if (filters.personal_fk) query = query.eq('personal_fk', filters.personal_fk)
    if (filters.type) query = query.eq('type', filters.type)
    if (searchText) query = query.ilike('observaciones', `%${searchText}%`)
    return query
  }

  const orderDirection = sortOrder === 'desc' ? false : true

  // If we have a large ID set, batch the .in() query to avoid URL length limits
  if (puntosMuestreoIds !== null && puntosMuestreoIds.length > MAX_IN_FILTER) {
    console.log(`  ⚡ Batched query: ${puntosMuestreoIds.length} IDs in batches of ${MAX_IN_FILTER}`)

    const allData = await fetchByIdsBatched(
      'analiticas',
      selectQuery,
      'punto_muestreo_fk',
      puntosMuestreoIds,
      applyDirectFilters
    )

    // Sort
    allData.sort((a, b) => {
      const aVal = a[sortBy]
      const bVal = b[sortBy]
      if (aVal == null) return 1
      if (bVal == null) return -1
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortOrder === 'desc' ? -cmp : cmp
    })

    console.log(`✅ getAnaliticasFiltered exitosa (batched): ${allData.length} analíticas encontradas`)
    return allData
  }

  // Standard query
  let query = supabase
    .from('analiticas')
    .select(selectQuery)

  if (puntosMuestreoIds !== null) {
    console.log('  ✓ Aplicando filtro punto_muestreo_fk con IDs obtenidos:', puntosMuestreoIds.length, 'IDs')
    query = query.in('punto_muestreo_fk', puntosMuestreoIds)
  }

  query = applyDirectFilters(query)
  query = query.order(sortBy, { ascending: orderDirection })

  const data = await fetchAll(query)

  console.log(`✅ getAnaliticasFiltered exitosa: ${data?.length} analíticas encontradas`)

  return data
}

export const getAnaliticasFilteredCount = async (filters = {}) => {
  let query = supabase
    .from('analiticas')
    .select('*', { count: 'exact', head: true })

  // Aplicar los mismos filtros que en getAnaliticasPaginated
  if (filters.fecha_inicio) query = query.gte('fecha', filters.fecha_inicio)
  if (filters.fecha_final) query = query.lte('fecha', filters.fecha_final)
  if (filters.punto_muestreo_fk) query = query.eq('punto_muestreo_fk', filters.punto_muestreo_fk)
  if (filters.personal_fk) query = query.eq('personal_fk', filters.personal_fk)
  if (filters.type) query = query.eq('type', filters.type)

  const { count, error } = await query

  if (error) throw error
  return count
}

export const setAnaliticas = async(analitica) => {
  const { data } = await supabase.from('analiticas').insert(analitica).select()

  logAudit('CREATE', 'analiticas', data?.[0]?.id, null, data?.[0])

  return data
}
