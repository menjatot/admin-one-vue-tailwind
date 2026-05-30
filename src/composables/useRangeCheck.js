import { DEFAULT_ANALITICA_RANGES } from '@/constants/parametrosCalidad'

export function isCloroWrong(cloro, range) {
  if (cloro === null || cloro === undefined || cloro === '') return false
  const { min, max } = range || DEFAULT_ANALITICA_RANGES.cloro
  return Number(cloro) < min || Number(cloro) > max
}

export function isPhWrong(ph, range) {
  if (ph === null || ph === undefined || ph === '') return false
  const { min, max } = range || DEFAULT_ANALITICA_RANGES.ph
  return Number(ph) < min || Number(ph) > max
}

export function isTurbidezWrong(turbidez, range, isDC = false) {
  if (turbidez === null || turbidez === undefined || turbidez === '') return false
  const r = range || DEFAULT_ANALITICA_RANGES.turbidez
  const min = isDC ? r.dcMin : r.min
  const max = isDC ? r.dcMax : r.max
  return Number(turbidez) < min || Number(turbidez) > max
}

export function isOrganolepticWrong(value) {
  if (value === null || value === undefined) return false
  return +value === 0
}

export function isWrongValues(analitica, ranges) {
  return (
    isCloroWrong(analitica.cloro, ranges?.cloro) ||
    isPhWrong(analitica.ph, ranges?.ph) ||
    (analitica.turbidez !== undefined &&
      isTurbidezWrong(analitica.turbidez, ranges?.turbidez, analitica._isDC)) ||
    isOrganolepticWrong(analitica.olor) ||
    isOrganolepticWrong(analitica.color) ||
    isOrganolepticWrong(analitica.sabor)
  )
}

export function calcCloroCombinado(cloroTotal, cloroLibre) {
  if (cloroTotal == null || cloroTotal === '' || cloroLibre == null || cloroLibre === '') return null
  const total = Number(cloroTotal)
  const libre = Number(cloroLibre)
  if (isNaN(total) || isNaN(libre)) return null
  return parseFloat((total - libre).toFixed(2))
}
