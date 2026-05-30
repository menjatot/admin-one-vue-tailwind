import { describe, it, expect } from 'vitest'
import {
  DEFAULT_ANALITICA_RANGES,
  normalizeParametrosCalidad,
  formatRangeLabel
} from '@/constants/parametrosCalidad'

describe('DEFAULT_ANALITICA_RANGES', () => {
  it('tiene los rangos por defecto correctos', () => {
    expect(DEFAULT_ANALITICA_RANGES.cloro).toEqual({ min: 0.4, max: 1 })
    expect(DEFAULT_ANALITICA_RANGES.ph).toEqual({ min: 6.5, max: 9.5 })
    expect(DEFAULT_ANALITICA_RANGES.turbidez).toEqual({ min: 0, max: 4, dcMin: 0.8, dcMax: 2 })
  })
})

describe('normalizeParametrosCalidad', () => {
  it('devuelve los defaults cuando record es null', () => {
    const result = normalizeParametrosCalidad(null)
    expect(result.cloro).toEqual({ min: 0.4, max: 1 })
    expect(result.ph).toEqual({ min: 6.5, max: 9.5 })
  })

  it('devuelve los defaults cuando record es undefined', () => {
    const result = normalizeParametrosCalidad(undefined)
    expect(result.cloro).toEqual({ min: 0.4, max: 1 })
  })

  it('normaliza un registro de Cataluña con cloro_min=0, cloro_max=2', () => {
    const result = normalizeParametrosCalidad({
      cloro_min: 0,
      cloro_max: 2,
      ph_min: 6.5,
      ph_max: 9.5,
      turbidez_min: 0,
      turbidez_max: 1,
      turbidez_min_dc: 0.2,
      turbidez_max_dc: 0.8
    })
    expect(result.cloro).toEqual({ min: 0, max: 2 })
    expect(result.ph).toEqual({ min: 6.5, max: 9.5 })
    expect(result.turbidez).toEqual({ min: 0, max: 1, dcMin: 0.2, dcMax: 0.8 })
  })

  it('usa el default cuando un valor es null', () => {
    const result = normalizeParametrosCalidad({
      cloro_min: null,
      cloro_max: null,
      ph_min: null,
      ph_max: null,
      turbidez_min: null,
      turbidez_max: null,
      turbidez_min_dc: null,
      turbidez_max_dc: null
    })
    expect(result.cloro).toEqual({ min: 0, max: 0 })
    expect(result.ph).toEqual({ min: 0, max: 0 })
    expect(result.turbidez).toEqual({ min: 0, max: 0, dcMin: 0, dcMax: 0 })
  })

  it('usa el default cuando un valor no es un número finito', () => {
    const result = normalizeParametrosCalidad({
      cloro_min: 'abc',
      cloro_max: NaN,
      ph_min: Infinity,
      ph_max: undefined
    })
    expect(result.cloro).toEqual({ min: 0.4, max: 1 })
    expect(result.ph).toEqual({ min: 6.5, max: 9.5 })
  })

  it('combina valores válidos con defaults para los inválidos', () => {
    const result = normalizeParametrosCalidad({
      cloro_min: 0.1,
      cloro_max: null,
      ph_min: 'no_num',
      ph_max: 8,
      turbidez_min: 0.5,
      turbidez_max: 3,
      turbidez_min_dc: 1,
      turbidez_max_dc: 2
    })
    expect(result.cloro).toEqual({ min: 0.1, max: 0 })
    expect(result.ph).toEqual({ min: 6.5, max: 8 })
    expect(result.turbidez).toEqual({ min: 0.5, max: 3, dcMin: 1, dcMax: 2 })
  })
})

describe('formatRangeLabel', () => {
  it('formatea un rango correctamente', () => {
    expect(formatRangeLabel({ min: 0.4, max: 1 })).toBe('[0.4 - 1]')
  })

  it('formatea un rango con decimales', () => {
    expect(formatRangeLabel({ min: 6.5, max: 9.5 })).toBe('[6.5 - 9.5]')
  })
})
