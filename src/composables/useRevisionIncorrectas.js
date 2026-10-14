import { ref } from 'vue'
import { usePlantasStore } from '@/stores/plantas'
import { getAllParametrosCalidad } from '@/services/parametrosCalidad'
import {
  DEFAULT_ANALITICA_RANGES,
  normalizeParametrosCalidad,
  formatRangeLabel
} from '@/constants/parametrosCalidad'
import {
  isCloroWrong,
  isPhWrong,
  isTurbidezWrong,
  isAluminioWrong,
  isOrganolepticWrong
} from '@/composables/useRangeCheck'

/**
 * Motivos por los que una analítica está "incorrecta" (función pura y testeable).
 * Devuelve [] si todo está dentro de rango.
 */
export function getMotivosIncorrectas(analitica, ranges, isDC = false) {
  const motivos = []

  if (isCloroWrong(analitica.cloro, ranges.cloro)) {
    motivos.push(`Cloro: ${analitica.cloro} mg/l ${formatRangeLabel(ranges.cloro)}`)
  }
  if (isPhWrong(analitica.ph, ranges.ph)) {
    motivos.push(`pH: ${analitica.ph} ${formatRangeLabel(ranges.ph)}`)
  }

  const rangoTurbidez = {
    min: isDC ? ranges.turbidez.dcMin : ranges.turbidez.min,
    max: isDC ? ranges.turbidez.dcMax : ranges.turbidez.max
  }
  if (isTurbidezWrong(analitica.turbidez, ranges.turbidez, isDC)) {
    motivos.push(`Turbidez: ${analitica.turbidez} ${formatRangeLabel(rangoTurbidez)}`)
  }

  if (isAluminioWrong(analitica.aluminio)) {
    motivos.push(`Aluminio: ${analitica.aluminio} µg/L [máx 200]`)
  }

  if (isOrganolepticWrong(analitica.olor)) motivos.push('Olor: no conforme')
  if (isOrganolepticWrong(analitica.color)) motivos.push('Color: no conforme')
  if (isOrganolepticWrong(analitica.sabor)) motivos.push('Sabor: no conforme')

  return motivos
}

/**
 * Composable para la revisión previa a exportar: detecta las analíticas con
 * valores incorrectos (rangos por comunidad, depósito de cabecera DC para
 * turbidez, aluminio y organolépticos), con el mismo criterio que el listado.
 */
export function useRevisionIncorrectas() {
  const plantaStore = usePlantasStore()
  const parametrosByComunidad = ref({})
  let cargaPromesa = null

  const cargarParametros = async () => {
    if (!cargaPromesa) {
      cargaPromesa = (async () => {
        try {
          const records = await getAllParametrosCalidad()
          records.forEach((record) => {
            if (record.comunidades_autonomas_fk) {
              parametrosByComunidad.value[record.comunidades_autonomas_fk] =
                normalizeParametrosCalidad(record)
            }
          })
        } catch (e) {
          console.error('No se pudieron cargar los parámetros de calidad:', e)
        }
      })()
    }
    return cargaPromesa
  }

  const getComunidadIdFromAnalitica = (analitica) => {
    if (analitica?.comunidad_id) return analitica.comunidad_id

    const puntoMuestreo = plantaStore.getPuntosMuestreo.find(
      (punto) => punto.id === analitica?.punto_muestreo_fk
    )
    if (!puntoMuestreo?.zona_fk) return null

    const zona = plantaStore.getZonas.find((z) => z.id === puntoMuestreo.zona_fk)
    return zona?.com_autonoma_fk ?? null
  }

  const getInfraTypeFromAnalitica = (analitica) => {
    if (analitica?.infraestructura_type != null) return analitica.infraestructura_type

    const pm = plantaStore.getPuntosMuestreo.find((p) => p.id === analitica?.punto_muestreo_fk)
    if (!pm?.infraestructura_fk) return null

    const infra = plantaStore.getInfraestructuras.find((i) => i.id === pm.infraestructura_fk)
    return infra?.type ?? null
  }

  const getRangesForAnalitica = (analitica) => {
    const comunidadId = getComunidadIdFromAnalitica(analitica)
    if (!comunidadId) return DEFAULT_ANALITICA_RANGES
    return parametrosByComunidad.value[comunidadId] || DEFAULT_ANALITICA_RANGES
  }

  /**
   * Devuelve [{ analitica, motivos }] para las analíticas de la lista que
   * tienen algún valor incorrecto (vacío si ninguna).
   */
  const getIncorrectas = async (analiticas) => {
    await cargarParametros()
    return (analiticas || [])
      .map((a) => ({
        analitica: a,
        motivos: getMotivosIncorrectas(
          a,
          getRangesForAnalitica(a),
          getInfraTypeFromAnalitica(a) === 5
        )
      }))
      .filter((x) => x.motivos.length > 0)
  }

  return { getIncorrectas, cargarParametros }
}
