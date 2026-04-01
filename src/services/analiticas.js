import { supabase } from './supabase'

export const getAnaliticas = async() => {
    const { data } = await supabase.from('analiticas').select('*')
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

  // Si hay filtro de UO, infraestructura, zona o zonas (array), hacer query previa
  if (filters.uo_fk || filters.infraestructura_fk || filters.zona_fk || filters.zonas_fk) {
    console.log('🔍 Filtros de UO/Infraestructura/Zona detectados, obteniendo puntos de muestreo...')

    // Sub-paso 1a: Si hay filtro de UO, primero obtener las zonas de esa UO
    let zonaIds = null
    if (filters.uo_fk) {
      console.log('  🔍 Obteniendo zonas de UO:', filters.uo_fk)
      const { data: zonasData, error: zonasError } = await supabase
        .from('zonas_abastecimiento')
        .select('id')
        .eq('unidades_operativas_fk', filters.uo_fk)

      if (zonasError) {
        console.error('❌ Error obteniendo zonas:', zonasError)
        throw zonasError
      }

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

    // Sub-paso 1b: Obtener puntos de muestreo con los filtros correspondientes
    let pmQuery = supabase
      .from('puntos_muestreo')
      .select('id')

    if (filters.infraestructura_fk) {
      console.log('  ➜ Filtrando por infraestructura_fk:', filters.infraestructura_fk)
      pmQuery = pmQuery.eq('infraestructura_fk', filters.infraestructura_fk)
    }

    const targetZonas = []
    if (filters.zona_fk) targetZonas.push(filters.zona_fk)
    else if (filters.zonas_fk && filters.zonas_fk.length > 0) targetZonas.push(...filters.zonas_fk)
    else if (zonaIds) targetZonas.push(...zonaIds)

    if (targetZonas.length > 0) {
      console.log('  ➜ Buscando infraestructuras vinculadas a zonas:', targetZonas)
      const { data: infrasData, error: infrasError } = await supabase
        .from('zonas_infraestructuras')
        .select('infraestructuras_fk')
        .in('zonas_fk', targetZonas)

      if (infrasError) {
        console.error('❌ Error obteniendo infarestructuras de zonas:', infrasError)
        throw infrasError
      }

      const infraIdsSet = new Set(infrasData.map(i => i.infraestructuras_fk))
      const infraIdsArray = Array.from(infraIdsSet)

      console.log(`  ➜ Encontradas ${infraIdsArray.length} infraestructuras para las zonas seleccionadas.`)
      
      // Filtramos puntos que pertenezcan a las infraestructuras encontradas O tengan directamente la zona guardada (legacy)
      if (infraIdsArray.length > 0) {
        pmQuery = pmQuery.or(`infraestructura_fk.in.(${infraIdsArray.join(',')}),zona_fk.in.(${targetZonas.join(',')})`)
      } else {
        pmQuery = pmQuery.in('zona_fk', targetZonas)
      }
    }

    const { data: puntosMuestreo, error: pmError } = await pmQuery

    if (pmError) {
      console.error('❌ Error obteniendo puntos de muestreo:', pmError)
      throw pmError
    }

    puntosMuestreoIds = puntosMuestreo.map(pm => pm.id)
    console.log(`  ✓ Encontrados ${puntosMuestreoIds.length} puntos de muestreo que cumplen condiciones:`, puntosMuestreoIds)

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
  let selectQuery = '*,personal:personal_fk(id, name),punto_muestreo:punto_muestreo_fk(id, name, zona_fk)'
  console.log('🔗 Select query:', selectQuery)

  let query = supabase
    .from('analiticas')
    .select(selectQuery, { count: 'exact' })

  // Si obtuvimos IDs de puntos de muestreo en el PASO 1, aplicar ese filtro
  if (puntosMuestreoIds !== null) {
    console.log('  ✓ Aplicando filtro punto_muestreo_fk con IDs obtenidos en PASO 1:', puntosMuestreoIds.length, 'IDs')
    query = query.in('punto_muestreo_fk', puntosMuestreoIds)
  }

  // Aplicar filtros directos
  if (filters.fecha_inicio) {
    console.log('  ✓ Aplicando filtro fecha_inicio:', filters.fecha_inicio)
    query = query.gte('fecha', filters.fecha_inicio)
  }
  if (filters.fecha_final) {
    console.log('  ✓ Aplicando filtro fecha_final:', filters.fecha_final)
    query = query.lte('fecha', filters.fecha_final)
  }
  if (filters.punto_muestreo_fk) {
    console.log('  ✓ Aplicando filtro punto_muestreo_fk directo:', filters.punto_muestreo_fk)
    query = query.eq('punto_muestreo_fk', filters.punto_muestreo_fk)
  }
  if (filters.personal_fk) {
    console.log('  ✓ Aplicando filtro personal_fk:', filters.personal_fk)
    query = query.eq('personal_fk', filters.personal_fk)
  }
  if (filters.type) {
    console.log('  ✓ Aplicando filtro type:', filters.type)
    query = query.eq('type', filters.type)
  }

  // NOTA: uo_fk, zona_fk e infraestructura_fk ya se manejaron en PASO 1

  // Búsqueda de texto en observaciones
  if (searchText) {
    query = query.ilike('observaciones', `%${searchText}%`)
  }

  // Ordenamiento
  const orderDirection = sortOrder === 'desc' ? false : true
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

  if (filters.uo_fk || filters.infraestructura_fk || filters.zona_fk || filters.zonas_fk) {
    console.log('🔍 Filtros de UO/Infraestructura/Zona detectados en getAnaliticasFiltered')

    // Sub-paso 1a: Si hay filtro de UO, primero obtener las zonas de esa UO
    let zonaIds = null
    if (filters.uo_fk) {
      console.log('  🔍 Obteniendo zonas de UO:', filters.uo_fk)
      const { data: zonasData, error: zonasError } = await supabase
        .from('zonas_abastecimiento')
        .select('id')
        .eq('unidades_operativas_fk', filters.uo_fk)

      if (zonasError) {
        console.error('❌ Error obteniendo zonas:', zonasError)
        throw zonasError
      }

      zonaIds = zonasData.map(z => z.id)
      console.log(`  ✓ Encontradas ${zonaIds.length} zonas para UO ${filters.uo_fk}:`, zonaIds)

      if (zonaIds.length === 0) {
        console.log('  ⚠️ No hay zonas para esta UO, retornando array vacío')
        return []
      }
    }

    let pmQuery = supabase
      .from('puntos_muestreo')
      .select('id')

    if (filters.infraestructura_fk) {
      console.log('  ➜ Filtrando por infraestructura_fk:', filters.infraestructura_fk)
      pmQuery = pmQuery.eq('infraestructura_fk', filters.infraestructura_fk)
    }

    const targetZonas = []
    if (filters.zona_fk) targetZonas.push(filters.zona_fk)
    else if (filters.zonas_fk && filters.zonas_fk.length > 0) targetZonas.push(...filters.zonas_fk)
    else if (zonaIds) targetZonas.push(...zonaIds)

    if (targetZonas.length > 0) {
      console.log('  ➜ Buscando infraestructuras vinculadas a zonas:', targetZonas)
      const { data: infrasData, error: infrasError } = await supabase
        .from('zonas_infraestructuras')
        .select('infraestructuras_fk')
        .in('zonas_fk', targetZonas)

      if (infrasError) {
        console.error('❌ Error obteniendo infarestructuras de zonas:', infrasError)
        throw infrasError
      }

      const infraIdsSet = new Set(infrasData.map(i => i.infraestructuras_fk))
      const infraIdsArray = Array.from(infraIdsSet)

      console.log(`  ➜ Encontradas ${infraIdsArray.length} infraestructuras para las zonas seleccionadas.`)
      
      // Filtramos puntos que pertenezcan a las infraestructuras encontradas O tengan directamente la zona guardada (legacy)
      if (infraIdsArray.length > 0) {
        pmQuery = pmQuery.or(`infraestructura_fk.in.(${infraIdsArray.join(',')}),zona_fk.in.(${targetZonas.join(',')})`)
      } else {
        pmQuery = pmQuery.in('zona_fk', targetZonas)
      }
    }

    const { data: puntosMuestreo, error: pmError } = await pmQuery

    if (pmError) {
      console.error('❌ Error obteniendo puntos de muestreo:', pmError)
      throw pmError
    }

    puntosMuestreoIds = puntosMuestreo.map(pm => pm.id)
    console.log(`  ✓ Encontrados ${puntosMuestreoIds.length} puntos de muestreo en getAnaliticasFiltered`)

    if (puntosMuestreoIds.length === 0) {
      console.log('  ⚠️ No hay puntos de muestreo, retornando array vacío')
      return []
    }
  }

  // **PASO 2: Query principal de analíticas**
  let selectQuery = '*,personal:personal_fk(id, name),punto_muestreo:punto_muestreo_fk(id, name, zona_fk)'
  let query = supabase
    .from('analiticas')
    .select(selectQuery)

  // Si obtuvimos IDs de puntos de muestreo en el PASO 1, aplicar ese filtro
  if (puntosMuestreoIds !== null) {
    console.log('  ✓ Aplicando filtro punto_muestreo_fk con IDs obtenidos:', puntosMuestreoIds.length, 'IDs')
    query = query.in('punto_muestreo_fk', puntosMuestreoIds)
  }

  // Aplicar filtros directos
  if (filters.fecha_inicio) {
    query = query.gte('fecha', filters.fecha_inicio)
  }
  if (filters.fecha_final) {
    query = query.lte('fecha', filters.fecha_final)
  }
  if (filters.punto_muestreo_fk) {
    query = query.eq('punto_muestreo_fk', filters.punto_muestreo_fk)
  }
  if (filters.personal_fk) {
    query = query.eq('personal_fk', filters.personal_fk)
  }
  if (filters.type) {
    query = query.eq('type', filters.type)
  }

  // NOTA: uo_fk, zona_fk e infraestructura_fk ya se manejaron en PASO 1

  // Búsqueda de texto en observaciones
  if (searchText) {
    query = query.ilike('observaciones', `%${searchText}%`)
  }

  // Ordenamiento
  const orderDirection = sortOrder === 'desc' ? false : true
  query = query.order(sortBy, { ascending: orderDirection })

  const { data, error } = await query

  if (error) {
    console.error('❌ Error fetching filtered analiticas:', error)
    throw error
  }

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
  const { data } = await supabase.from('analiticas').insert(analitica)
  return data
}
