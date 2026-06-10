import { supabase, assertAuthenticated } from './supabase'
import { logAudit } from './auditLog'

const PAGE_SIZE = 1000

// Paginate a Supabase query to fetch all rows (Supabase caps at 1000 by default)
const fetchAll = async (query) => {
  let allData = []
  let from = 0
  let keepGoing = true
  while (keepGoing) {
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    allData = allData.concat(data)
    if (data.length < PAGE_SIZE) keepGoing = false
    else from += PAGE_SIZE
  }
  return allData
}

const EMPTY_SCOPE = Symbol('empty-scope')

// Resolve UO / zona(s) / centro_coste / infraestructura filters into a description
// of how to constrain analiticas via their punto_muestreo, WITHOUT materializing
// the (potentially thousands of) punto IDs on the client.
//
// Returns:
//   null         → no spatial filter present, query analiticas unconstrained
//   EMPTY_SCOPE  → filter resolves to zero zonas/puntos, caller returns empty result
//   { kind: 'infra', infra }      → constrain by punto_muestreo.infraestructura_fk
//   { kind: 'zonas', zonas: [] }  → constrain by punto_muestreo.zona_fk IN (zonas)
//
// Note: every punto_muestreo has a zona_fk (verified: 0 rows with infra-but-no-zona),
// so the zona_fk filter fully covers the old zona-OR-infra logic for UO/zona/CC filters.
// The infra branch is only used when a *specific* infrastructure is selected.
const resolvePuntoScope = async (filters) => {
  const hasSpatialFilter =
    filters.uo_fk ||
    filters.infraestructura_fk ||
    filters.zona_fk ||
    filters.zonas_fk ||
    filters.centro_coste_fk

  if (!hasSpatialFilter) return null

  // A specific infrastructure was selected → constrain by it directly.
  if (filters.infraestructura_fk) {
    return { kind: 'infra', infra: filters.infraestructura_fk }
  }

  // Build the effective zona set, mirroring the original precedence:
  //   zona_fk  >  zonas_fk (intersected with centro_coste)  >  zonas of UO
  let effectiveZonasFk = filters.zonas_fk ? [...filters.zonas_fk] : null

  if (filters.centro_coste_fk && !filters.zona_fk) {
    const ccZonasData = await fetchAll(
      supabase.from('zonas_abastecimiento').select('id').eq('centro_coste_fk', filters.centro_coste_fk)
    )
    const ccZonaIds = ccZonasData.map((z) => z.id)
    if (ccZonaIds.length === 0) return EMPTY_SCOPE
    effectiveZonasFk = effectiveZonasFk
      ? effectiveZonasFk.filter((id) => ccZonaIds.includes(id))
      : ccZonaIds
  }

  let zonaIdsFromUO = null
  if (filters.uo_fk) {
    const zonasData = await fetchAll(
      supabase.from('zonas_abastecimiento').select('id').eq('unidades_operativas_fk', filters.uo_fk)
    )
    zonaIdsFromUO = zonasData.map((z) => z.id)
    if (zonaIdsFromUO.length === 0) return EMPTY_SCOPE
  }

  let targetZonas = []
  if (filters.zona_fk) targetZonas = [filters.zona_fk]
  else if (effectiveZonasFk && effectiveZonasFk.length > 0) targetZonas = effectiveZonasFk
  else if (zonaIdsFromUO) targetZonas = zonaIdsFromUO

  if (targetZonas.length === 0) return EMPTY_SCOPE

  return { kind: 'zonas', zonas: targetZonas }
}

// Apply the resolved scope to an analiticas query by filtering on the embedded
// punto_muestreo foreign table. Requires the select to embed punto_muestreo with !inner.
const applyPuntoScope = (query, scope) => {
  if (!scope) return query
  if (scope.kind === 'infra') return query.eq('punto_muestreo.infraestructura_fk', scope.infra)
  return query.in('punto_muestreo.zona_fk', scope.zonas)
}

const emptyPage = (page, pageSize) => ({
  data: [],
  count: 0,
  page,
  pageSize,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false
})

// Select for the analiticas list. Embeds punto_muestreo as an inner join when a
// spatial scope is active so the embedded filter actually constrains parent rows.
const buildSelect = (hasScope) =>
  hasScope
    ? '*,personal:personal_fk(id, name),punto_muestreo:punto_muestreo_fk!inner(id, name, zona_fk, infraestructura_fk)'
    : '*,personal:personal_fk(id, name),punto_muestreo:punto_muestreo_fk(id, name, zona_fk)'

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

  // Resolve UO/zona/CC/infra filters into an embedded-table scope (1 small query at most).
  const scope = await resolvePuntoScope(filters)
  if (scope === EMPTY_SCOPE) return emptyPage(page, pageSize)

  const hasScope = scope !== null
  const orderDirection = sortOrder !== 'desc'

  // Direct (top-level) column filters shared by both code paths.
  const applyDirectFilters = (query) => {
    if (filters.fecha_inicio) query = query.gte('fecha', filters.fecha_inicio)
    if (filters.fecha_final) query = query.lte('fecha', filters.fecha_final)
    if (filters.punto_muestreo_fk) query = query.eq('punto_muestreo_fk', filters.punto_muestreo_fk)
    if (filters.personal_fk) query = query.eq('personal_fk', filters.personal_fk)
    if (filters.type) query = query.eq('type', filters.type)
    // fuera_de_rango is a PostgREST computed column (DB function fuera_de_rango(analiticas))
    if (filters.fuera_de_rango) query = query.eq('fuera_de_rango', true)
    if (searchText) query = query.ilike('observaciones', `%${searchText}%`)
    return query
  }

  // Single server-side query: filtering, ordering, exact count and pagination
  // all happen in the database. No client-side download/sort of the full table.
  let query = supabase.from('analiticas').select(buildSelect(hasScope), { count: 'exact' })
  query = applyPuntoScope(query, scope)
  query = applyDirectFilters(query)
  query = query.order(sortBy, { ascending: orderDirection })

  const from = (page - 1) * pageSize
  query = query.range(from, from + pageSize - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('❌ Error fetching paginated analiticas:', error.message, error.details, error.hint)
    throw error
  }

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
  const { sortBy = 'fecha', sortOrder = 'desc', filters = {}, searchText = '' } = options

  const scope = await resolvePuntoScope(filters)
  if (scope === EMPTY_SCOPE) return []

  const hasScope = scope !== null
  const orderDirection = sortOrder !== 'desc'

  const applyDirectFilters = (query) => {
    if (filters.fecha_inicio) query = query.gte('fecha', filters.fecha_inicio)
    if (filters.fecha_final) query = query.lte('fecha', filters.fecha_final)
    if (filters.punto_muestreo_fk) query = query.eq('punto_muestreo_fk', filters.punto_muestreo_fk)
    if (filters.personal_fk) query = query.eq('personal_fk', filters.personal_fk)
    if (filters.type) query = query.eq('type', filters.type)
    // fuera_de_rango is a PostgREST computed column (DB function fuera_de_rango(analiticas))
    if (filters.fuera_de_rango) query = query.eq('fuera_de_rango', true)
    if (searchText) query = query.ilike('observaciones', `%${searchText}%`)
    return query
  }

  // No pagination here (used for exports): fetch every matching row, but with the
  // filter applied server-side so we only page through the rows that actually match.
  let query = supabase.from('analiticas').select(buildSelect(hasScope))
  query = applyPuntoScope(query, scope)
  query = applyDirectFilters(query)
  query = query.order(sortBy, { ascending: orderDirection })

  return fetchAll(query)
}

export const setAnaliticas = async(analitica) => {
  assertAuthenticated('crear analíticas')
  const { data } = await supabase.from('analiticas').insert(analitica).select()

  logAudit('CREATE', 'analiticas', data?.[0]?.id, null, data?.[0])

  return data
}

export const getAnaliticasPunto = async (puntoMuestreoFk, limit = 10) => {
  const { data, error } = await supabase
    .from('analiticas')
    .select('*')
    .eq('punto_muestreo_fk', puntoMuestreoFk)
    .order('fecha', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}
