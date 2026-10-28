import { describe, expect, it } from 'vitest'
import {
  idNumerico,
  infraIdDePunto,
  puntoEncajaEnCascada
} from '../infraestructuraForm'

const PUNTO_RED = { id: 74326, zona_fk: 7461, infraestructura_fk: 553 } // red
const PUNTO_DEPOSITO = { id: 74646, zona_fk: 7461, infraestructura_fk: 152 } // depósito
const PUNTO_SIN_INFRA = { id: 1, zona_fk: 7461, infraestructura_fk: null }

describe('idNumerico', () => {
  it('acepta números y cadenas numéricas', () => {
    expect(idNumerico(553)).toBe(553)
    expect(idNumerico('553')).toBe(553)
    expect(idNumerico(0)).toBe(0)
  })

  it('devuelve null para vacíos y basura', () => {
    expect(idNumerico(null)).toBeNull()
    expect(idNumerico(undefined)).toBeNull()
    expect(idNumerico('')).toBeNull()
    expect(idNumerico('abc')).toBeNull()
  })
})

describe('infraIdDePunto', () => {
  it('extrae la infraestructura del punto', () => {
    expect(infraIdDePunto(PUNTO_RED)).toBe(553)
    expect(infraIdDePunto({ infraestructura_fk: '152' })).toBe(152)
  })

  it('tolera puntos vacíos o sin infraestructura', () => {
    expect(infraIdDePunto(null)).toBeNull()
    expect(infraIdDePunto(undefined)).toBeNull()
    expect(infraIdDePunto(PUNTO_SIN_INFRA)).toBeNull()
  })
})

describe('puntoEncajaEnCascada', () => {
  it('sin punto no hay nada que comprobar', () => {
    expect(puntoEncajaEnCascada(null, { zona: 7461, infraestructura: 553 })).toBe(true)
    expect(puntoEncajaEnCascada(undefined, {})).toBe(true)
  })

  it('acepta el punto de la infraestructura y zona elegidas', () => {
    expect(puntoEncajaEnCascada(PUNTO_RED, { zona: 7461, infraestructura: 553 })).toBe(true)
    expect(puntoEncajaEnCascada(PUNTO_RED, { zona: '7461', infraestructura: '553' })).toBe(true)
  })

  it('rechaza el punto de otra infraestructura (el caso del depósito que se queda seleccionado)', () => {
    expect(puntoEncajaEnCascada(PUNTO_DEPOSITO, { zona: 7461, infraestructura: 553 })).toBe(false)
  })

  it('rechaza el punto de otra zona aunque la infraestructura coincida', () => {
    expect(puntoEncajaEnCascada(PUNTO_RED, { zona: 9999, infraestructura: 553 })).toBe(false)
  })

  it('sin infraestructura elegida, un punto con infraestructura no encaja', () => {
    expect(puntoEncajaEnCascada(PUNTO_RED, { zona: 7461, infraestructura: null })).toBe(false)
    expect(puntoEncajaEnCascada(PUNTO_RED, {})).toBe(false)
  })

  it('sin infraestructura elegida, un punto sin infraestructura sí encaja', () => {
    expect(puntoEncajaEnCascada(PUNTO_SIN_INFRA, { zona: 7461 })).toBe(true)
  })
})
