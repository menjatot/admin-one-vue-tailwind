import { ref, computed } from 'vue'
import { supabase } from '@/services/supabase'
import { usePlantasStore } from '@/stores/plantas'
import { getAllParametrosCalidad } from '@/services/parametrosCalidad'
import { normalizeParametrosCalidad, DEFAULT_ANALITICA_RANGES } from '@/constants/parametrosCalidad'
import { isCloroWrong, isPhWrong, isTurbidezWrong, isOrganolepticWrong } from '@/composables/useRangeCheck'

export function useDashboardIncidencias() {
  const incidencias = ref([])
  const cargando = ref(false)
  const error = ref(null)
  const parametrosByComunidad = ref({})

  const sieteDiasAtras = () => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  }

  const getRangesForComunidad = (comunidadId) => {
    return parametrosByComunidad.value[comunidadId] || DEFAULT_ANALITICA_RANGES
  }

  const cargarIncidencias = async (zonasIds = null) => {
    cargando.value = true
    error.value = null
    incidencias.value = []

    const plantaStore = usePlantasStore()

    try {
      let query = supabase
        .from('analiticas')
        .select('*, punto_muestreo:punto_muestreo_fk(zona_fk)')
        .gte('fecha', sieteDiasAtras())

      if (zonasIds && zonasIds.length > 0) {
        const { data: pmData } = await supabase
          .from('puntos_muestreo')
          .select('id')
          .in('zona_fk', zonasIds)

        const pmIds = (pmData || []).map((p) => p.id)
        if (pmIds.length === 0) {
          incidencias.value = []
          cargando.value = false
          return
        }
        query = query.in('punto_muestreo_fk', pmIds)
      }

      const [paramsData, { data: analiticas, error: analError }] = await Promise.all([
        getAllParametrosCalidad(),
        query.order('fecha', { ascending: false })
      ])

      if (analError) throw analError

      paramsData.forEach((record) => {
        if (record.comunidades_autonomas_fk) {
          parametrosByComunidad.value[record.comunidades_autonomas_fk] =
            normalizeParametrosCalidad(record)
        }
      })

      incidencias.value = (analiticas || []).map((a) => {
        const zonaFk = a.punto_muestreo?.zona_fk
        const zona = zonaFk ? plantaStore.getZonas.find((z) => z.id === zonaFk) : null
        const comunidadId = zona?.com_autonoma_fk ?? null
        const ranges = getRangesForComunidad(comunidadId)

        return {
          id: a.id,
          fecha: a.fecha,
          punto_muestreo_fk: a.punto_muestreo_fk,
          type: a.type,
          comunidad_id: comunidadId,
          cloro: a.cloro,
          ph: a.ph,
          turbidez: a.turbidez,
          olor: a.olor,
          color: a.color,
          sabor: a.sabor,
          cloro_total: a.cloro_total,
          cloro_combinado: a.cloro_combinado,
          cloroWrong: isCloroWrong(a.cloro, ranges.cloro),
          phWrong: isPhWrong(a.ph, ranges.ph),
          turbidezWrong: isTurbidezWrong(a.turbidez, ranges.turbidez),
          olorWrong: isOrganolepticWrong(a.olor),
          colorWrong: isOrganolepticWrong(a.color),
          saborWrong: isOrganolepticWrong(a.sabor),
          isWrong:
            isCloroWrong(a.cloro, ranges.cloro) ||
            isPhWrong(a.ph, ranges.ph) ||
            isTurbidezWrong(a.turbidez, ranges.turbidez) ||
            isOrganolepticWrong(a.olor) ||
            isOrganolepticWrong(a.color) ||
            isOrganolepticWrong(a.sabor)
        }
      })
    } catch (e) {
      console.error('Error cargando incidencias:', e)
      error.value = e.message
    } finally {
      cargando.value = false
    }
  }

  const resumen = computed(() => {
    const todas = incidencias.value
    const wrong = todas.filter((a) => a.isWrong)
    return {
      total: todas.length,
      conIncidencias: wrong.length,
      porcentaje: todas.length > 0 ? Math.round((wrong.length / todas.length) * 100) : 0,
      porCloro: wrong.filter((a) => a.cloroWrong).length,
      porPh: wrong.filter((a) => a.phWrong).length,
      porTurbidez: wrong.filter((a) => a.turbidezWrong).length,
      porOrganolepticos: wrong.filter((a) => a.olorWrong || a.colorWrong || a.saborWrong).length,
      puntosAfectados: new Set(wrong.map((a) => a.punto_muestreo_fk)).size,
      ultimas: wrong.slice(0, 5)
    }
  })

  const sinIncidencias = computed(() => {
    return !cargando.value && !error.value && incidencias.value.length > 0 && resumen.value.conIncidencias === 0
  })

  return {
    incidencias,
    cargando,
    error,
    resumen,
    sinIncidencias,
    cargarIncidencias
  }
}
