import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        gte: () => ({
          order: () => ({ data: [], error: null })
        })
      })
    })
  }
}))

vi.mock('@/services/parametrosCalidad', () => ({
  getAllParametrosCalidad: vi.fn(() => Promise.resolve([]))
}))

vi.mock('@/stores/plantas', () => ({
  usePlantasStore: () => ({
    getZonas: []
  })
}))

import { useDashboardIncidencias } from '@/composables/useDashboardIncidencias'
import { isCloroWrong, isPhWrong, isTurbidezWrong, isOrganolepticWrong } from '@/composables/useRangeCheck'

describe('useDashboardIncidencias - resumen computed', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('expone estado inicial vacío', () => {
    const { resumen, sinIncidencias } = useDashboardIncidencias()
    expect(resumen.value.total).toBe(0)
    expect(resumen.value.conIncidencias).toBe(0)
    expect(sinIncidencias.value).toBe(false)
  })

  it('calcula porcentaje correctamente', () => {
    const dashboard = useDashboardIncidencias()
    expect(dashboard.resumen.value.porcentaje).toBe(0)
  })
})

describe('Detección de incidencias (lógica de rango)', () => {
  it('detecta cloro fuera de rango', () => {
    expect(isCloroWrong(0.1, { min: 0.4, max: 1 })).toBe(true)
    expect(isCloroWrong(0.5, { min: 0.4, max: 1 })).toBe(false)
  })

  it('detecta pH fuera de rango', () => {
    expect(isPhWrong(6, { min: 6.5, max: 9.5 })).toBe(true)
    expect(isPhWrong(7, { min: 6.5, max: 9.5 })).toBe(false)
  })

  it('detecta turbidez fuera de rango', () => {
    expect(isTurbidezWrong(5, { min: 0, max: 4 })).toBe(true)
    expect(isTurbidezWrong(2, { min: 0, max: 4 })).toBe(false)
  })

  it('detecta organoléptico incorrecto', () => {
    expect(isOrganolepticWrong(0)).toBe(true)
    expect(isOrganolepticWrong(1)).toBe(false)
    expect(isOrganolepticWrong(null)).toBe(false)
  })
})
