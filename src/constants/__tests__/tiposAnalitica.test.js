import { describe, it, expect } from 'vitest'
import { TIPOS_ANALITICA, tiposAnaliticaPermitidos } from '@/constants/tiposAnalitica'

describe('tiposAnaliticaPermitidos', () => {
  it('depósitos (distribución 2 y cabecera 5): solo Operacional y Seguimiento', () => {
    expect(tiposAnaliticaPermitidos(2)).toEqual({ 28: 'Operacional', 99: 'Seguimiento' })
    expect(tiposAnaliticaPermitidos(5)).toEqual({ 28: 'Operacional', 99: 'Seguimiento' })
  })

  it('red de distribución (4): solo Rutina y Seguimiento', () => {
    expect(tiposAnaliticaPermitidos(4)).toEqual({ 29: 'Rutina', 99: 'Seguimiento' })
  })

  it('captación (1): solo Seguimiento', () => {
    expect(tiposAnaliticaPermitidos(1)).toEqual({ 99: 'Seguimiento' })
    expect(tiposAnaliticaPermitidos('1')).toEqual({ 99: 'Seguimiento' })
  })

  it('tratamiento (3): sin restricción', () => {
    expect(tiposAnaliticaPermitidos(3)).toEqual(TIPOS_ANALITICA)
  })

  it('sin punto / sin infraestructura: sin restricción', () => {
    expect(tiposAnaliticaPermitidos(null)).toEqual(TIPOS_ANALITICA)
    expect(tiposAnaliticaPermitidos(undefined)).toEqual(TIPOS_ANALITICA)
  })

  it('acepta el tipo como texto', () => {
    expect(tiposAnaliticaPermitidos('4')).toEqual({ 29: 'Rutina', 99: 'Seguimiento' })
    expect(tiposAnaliticaPermitidos('5')).toEqual({ 28: 'Operacional', 99: 'Seguimiento' })
  })
})
