import { describe, it, expect } from 'vitest'
import { toNumberOrNull, buildAnaliticaPayload } from '@/helpers/analiticaPayload'

describe('toNumberOrNull', () => {
  it('conserva el 0 como valor válido', () => {
    expect(toNumberOrNull(0)).toBe(0)
    expect(toNumberOrNull('0')).toBe(0)
    expect(toNumberOrNull('0.0')).toBe(0)
  })

  it('convierte campos vacíos en null', () => {
    expect(toNumberOrNull('')).toBeNull()
    expect(toNumberOrNull(null)).toBeNull()
    expect(toNumberOrNull(undefined)).toBeNull()
  })

  it('convierte valores numéricos', () => {
    expect(toNumberOrNull('0.5')).toBe(0.5)
    expect(toNumberOrNull(3)).toBe(3)
  })

  it('descarta valores no numéricos', () => {
    expect(toNumberOrNull('abc')).toBeNull()
    expect(toNumberOrNull(NaN)).toBeNull()
  })
})

describe('buildAnaliticaPayload', () => {
  const baseForm = {
    punto_muestreo_fk: 7,
    fecha: '2026-10-08',
    color: 1,
    olor: 1,
    sabor: 1,
    cloro: '',
    type: 29,
    observaciones: '',
    operario: 3,
    ph: '',
    turbidez: '',
    cloro_total: ''
  }

  it('guarda el cloro 0 como 0 (regresión: se guardaba null)', () => {
    const payload = buildAnaliticaPayload({ ...baseForm, cloro: 0 })
    expect(payload.cloro).toBe(0)
  })

  it('guarda turbidez 0 y ph 0 como 0', () => {
    const payload = buildAnaliticaPayload({ ...baseForm, turbidez: 0, ph: 0 })
    expect(payload.turbidez).toBe(0)
    expect(payload.ph).toBe(0)
  })

  it('guarda color 0 (mal color) como 0 y no como null', () => {
    const payload = buildAnaliticaPayload({ ...baseForm, color: 0 })
    expect(payload.color).toBe(0)
  })

  it('los campos vacíos siguen siendo null', () => {
    const payload = buildAnaliticaPayload(baseForm)
    expect(payload.cloro).toBeNull()
    expect(payload.ph).toBeNull()
    expect(payload.turbidez).toBeNull()
  })

  it('cloro_total 0 solo se guarda en Cataluña', () => {
    const form = { ...baseForm, cloro_total: 0 }
    expect(buildAnaliticaPayload(form, { esCataluna: true }).cloro_total).toBe(0)
    expect(buildAnaliticaPayload(form, { esCataluna: false }).cloro_total).toBeNull()
  })

  it('cloro_combinado 0 se guarda como 0 en Cataluña', () => {
    const payload = buildAnaliticaPayload(baseForm, { esCataluna: true, cloroCombinado: 0 })
    expect(payload.cloro_combinado).toBe(0)
  })

  it('totalizador 0 solo se guarda en depósito', () => {
    expect(
      buildAnaliticaPayload(baseForm, { esDeposito: true, totalizador: 0 }).totalizador
    ).toBe(0)
    expect(
      buildAnaliticaPayload(baseForm, { esDeposito: false, totalizador: 0 }).totalizador
    ).toBeNull()
  })

  it('mapea el resto de campos del formulario', () => {
    const payload = buildAnaliticaPayload(baseForm)
    expect(payload.punto_muestreo_fk).toBe(7)
    expect(payload.fecha).toBe('2026-10-08')
    expect(payload.personal_fk).toBe(3)
    expect(payload.type).toBe(29)
    expect(payload.olor).toBe(1)
    expect(payload.sabor).toBe(1)
  })
})
