import { afterEach, describe, expect, it, vi } from 'vitest'
import { codMuestraLab, excelDateToJSDate, fechaFinal, formatDate, formatDatos } from '../index'

describe('formatDate', () => {
  it('convierte ISO a DD/MM/YYYY', () => {
    expect(formatDate('2026-09-15T12:00:00')).toBe('15/09/2026')
    expect(formatDate('2026-01-02T12:00:00')).toBe('02/01/2026')
  })
})

describe('formatDatos', () => {
  it('cadena vacía se mantiene vacía', () => {
    expect(formatDatos('')).toBe('')
  })
  it('formatea a un decimal', () => {
    expect(formatDatos('1')).toBe('1.0')
    expect(formatDatos(0)).toBe('0.0')
    expect(formatDatos('3.14159')).toBe('3.1')
    expect(formatDatos(2.5)).toBe('2.5')
  })
})

describe('fechaFinal', () => {
  it('antepone el día con dos dígitos', () => {
    expect(fechaFinal(5, '15/09/2026')).toBe('0515/09/2026')
    expect(fechaFinal(12, '09/2026')).toBe('1209/2026')
  })
})

describe('excelDateToJSDate', () => {
  it('convierte el serial 25569 al epoch (1970-01-01)', () => {
    const d = excelDateToJSDate(25569)
    expect(d.getFullYear()).toBe(1970)
    expect(d.getMonth()).toBe(0)
    expect(d.getDate()).toBe(1)
  })

  it('días consecutivos distan 24h', () => {
    const d1 = excelDateToJSDate(25569)
    const d2 = excelDateToJSDate(25570)
    expect(d2.getTime() - d1.getTime()).toBe(24 * 60 * 60 * 1000)
  })

  it('la parte decimal son horas/minutos', () => {
    const d = excelDateToJSDate(25569.5)
    expect(d.getHours()).toBe(12)
    expect(d.getMinutes()).toBe(0)
  })

  it('lanza error con valores inválidos', () => {
    expect(() => excelDateToJSDate(null)).toThrow()
    expect(() => excelDateToJSDate(undefined)).toThrow()
    expect(() => excelDateToJSDate('abc')).toThrow()
    expect(() => excelDateToJSDate(NaN)).toThrow()
    expect(() => excelDateToJSDate(0)).toThrow() // fuera de rango
    expect(() => excelDateToJSDate(200000)).toThrow() // fuera de rango
  })
})

describe('codMuestraLab', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('compone LAB + fecha de hoy + punto + día + aleatorio', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 14)) // 14/10/2026
    vi.spyOn(Math, 'random').mockReturnValue(0.123456)

    // '0.123456' -> slice(2, 6) = '1234'
    expect(codMuestraLab(101, '05')).toBe('LAB20261014101_051234')
  })

  it('corta a partir de la primera barra de la fecha recibida', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 14))
    vi.spyOn(Math, 'random').mockReturnValue(0.123456)

    expect(codMuestraLab(101, '05/09/2026')).toBe('LAB20261014101_05')
  })
})
