import { describe, it, expect } from 'vitest'
import {
  isCloroWrong,
  isPhWrong,
  isTurbidezWrong,
  isOrganolepticWrong,
  isWrongValues,
  calcCloroCombinado
} from '@/composables/useRangeCheck'

describe('isCloroWrong', () => {
  const defaultRange = { min: 0.4, max: 1 }

  it('devuelve false si el valor está dentro del rango', () => {
    expect(isCloroWrong(0.5, defaultRange)).toBe(false)
    expect(isCloroWrong(0.4, defaultRange)).toBe(false)
    expect(isCloroWrong(1, defaultRange)).toBe(false)
  })

  it('devuelve true si el valor está por debajo del mínimo', () => {
    expect(isCloroWrong(0.3, defaultRange)).toBe(true)
    expect(isCloroWrong(0, defaultRange)).toBe(true)
  })

  it('devuelve true si el valor está por encima del máximo', () => {
    expect(isCloroWrong(1.1, defaultRange)).toBe(true)
    expect(isCloroWrong(5, defaultRange)).toBe(true)
  })

  it('devuelve false si el valor es null', () => {
    expect(isCloroWrong(null, defaultRange)).toBe(false)
  })

  it('devuelve false si el valor es undefined', () => {
    expect(isCloroWrong(undefined, defaultRange)).toBe(false)
  })

  it('devuelve false si el valor es string vacío', () => {
    expect(isCloroWrong('', defaultRange)).toBe(false)
  })

  it('convierte string a número antes de comparar', () => {
    expect(isCloroWrong('0.5', defaultRange)).toBe(false)
    expect(isCloroWrong('0.1', defaultRange)).toBe(true)
  })

  it('usa el rango por defecto si no se pasa range', () => {
    expect(isCloroWrong(0.5)).toBe(false)
    expect(isCloroWrong(0.1)).toBe(true)
  })

  it('acepta el nuevo rango de Cataluña (0 - 2)', () => {
    const catalunaRange = { min: 0, max: 2 }
    expect(isCloroWrong(0, catalunaRange)).toBe(false)
    expect(isCloroWrong(2, catalunaRange)).toBe(false)
    expect(isCloroWrong(2.1, catalunaRange)).toBe(true)
    expect(isCloroWrong(-0.1, catalunaRange)).toBe(true)
  })
})

describe('isPhWrong', () => {
  const defaultRange = { min: 6.5, max: 9.5 }

  it('devuelve false si el valor está dentro del rango', () => {
    expect(isPhWrong(7, defaultRange)).toBe(false)
    expect(isPhWrong(6.5, defaultRange)).toBe(false)
    expect(isPhWrong(9.5, defaultRange)).toBe(false)
  })

  it('devuelve true fuera de rango', () => {
    expect(isPhWrong(6, defaultRange)).toBe(true)
    expect(isPhWrong(10, defaultRange)).toBe(true)
  })

  it('devuelve false para valores nulos', () => {
    expect(isPhWrong(null, defaultRange)).toBe(false)
    expect(isPhWrong(undefined, defaultRange)).toBe(false)
    expect(isPhWrong('', defaultRange)).toBe(false)
  })
})

describe('isTurbidezWrong', () => {
  const range = { min: 0, max: 4, dcMin: 0.8, dcMax: 2 }

  it('usa rango normal por defecto', () => {
    expect(isTurbidezWrong(2, range)).toBe(false)
    expect(isTurbidezWrong(0, range)).toBe(false)
    expect(isTurbidezWrong(5, range)).toBe(true)
  })

  it('usa rango DC cuando isDC=true', () => {
    expect(isTurbidezWrong(0.8, range, true)).toBe(false)
    expect(isTurbidezWrong(2, range, true)).toBe(false)
    expect(isTurbidezWrong(0.5, range, true)).toBe(true)
    expect(isTurbidezWrong(3, range, true)).toBe(true)
  })

  it('devuelve false para valores nulos', () => {
    expect(isTurbidezWrong(null, range)).toBe(false)
    expect(isTurbidezWrong(undefined, range)).toBe(false)
  })
})

describe('isOrganolepticWrong', () => {
  it('devuelve true si es 0 (incorrecto)', () => {
    expect(isOrganolepticWrong(0)).toBe(true)
    expect(isOrganolepticWrong('0')).toBe(true)
  })

  it('devuelve false si es 1 (correcto)', () => {
    expect(isOrganolepticWrong(1)).toBe(false)
    expect(isOrganolepticWrong('1')).toBe(false)
  })

  it('devuelve false para null y undefined', () => {
    expect(isOrganolepticWrong(null)).toBe(false)
    expect(isOrganolepticWrong(undefined)).toBe(false)
  })
})

describe('isWrongValues', () => {
  const okAnalitica = {
    cloro: 0.5,
    ph: 7,
    turbidez: 1,
    olor: 1,
    color: 1,
    sabor: 1
  }

  const defaultRanges = {
    cloro: { min: 0.4, max: 1 },
    ph: { min: 6.5, max: 9.5 },
    turbidez: { min: 0, max: 4 }
  }

  it('devuelve false si todos los valores son correctos', () => {
    expect(isWrongValues(okAnalitica, defaultRanges)).toBe(false)
  })

  it('devuelve true si el cloro está fuera de rango', () => {
    expect(isWrongValues({ ...okAnalitica, cloro: 0.1 }, defaultRanges)).toBe(true)
  })

  it('devuelve true si el pH está fuera de rango', () => {
    expect(isWrongValues({ ...okAnalitica, ph: 10 }, defaultRanges)).toBe(true)
  })

  it('devuelve true si la turbidez está fuera de rango', () => {
    expect(isWrongValues({ ...okAnalitica, turbidez: 5 }, defaultRanges)).toBe(true)
  })

  it('devuelve true si hay error organoléptico', () => {
    expect(isWrongValues({ ...okAnalitica, olor: 0 }, defaultRanges)).toBe(true)
    expect(isWrongValues({ ...okAnalitica, color: 0 }, defaultRanges)).toBe(true)
    expect(isWrongValues({ ...okAnalitica, sabor: 0 }, defaultRanges)).toBe(true)
  })

  it('devuelve false si cloro es null (sin muestra)', () => {
    expect(isWrongValues({ ...okAnalitica, cloro: null }, defaultRanges)).toBe(false)
  })

  it('devuelve true con múltiples valores fuera de rango', () => {
    expect(
      isWrongValues({ ...okAnalitica, cloro: 0.1, ph: 3, olor: 0 }, defaultRanges)
    ).toBe(true)
  })
})

describe('calcCloroCombinado', () => {
  it('calcula cloro combinado correctamente', () => {
    expect(calcCloroCombinado(1.5, 0.8)).toBe(0.7)
    expect(calcCloroCombinado(2, 1)).toBe(1)
    expect(calcCloroCombinado(0.5, 0.5)).toBe(0)
  })

  it('redondea a 2 decimales', () => {
    expect(calcCloroCombinado(1, 0.333)).toBe(0.67)
    expect(calcCloroCombinado(0.555, 0.111)).toBe(0.44)
  })

  it('devuelve valor negativo si total < libre', () => {
    const result = calcCloroCombinado(0.5, 0.8)
    expect(result).toBe(-0.3)
  })

  it('devuelve null si algún valor falta', () => {
    expect(calcCloroCombinado(null, 0.5)).toBeNull()
    expect(calcCloroCombinado(1, null)).toBeNull()
    expect(calcCloroCombinado('', 0.5)).toBeNull()
    expect(calcCloroCombinado(1, '')).toBeNull()
  })

  it('devuelve null si algún valor no es numérico', () => {
    expect(calcCloroCombinado('abc', 0.5)).toBeNull()
    expect(calcCloroCombinado(1, 'xyz')).toBeNull()
  })

  it('acepta strings numéricos', () => {
    expect(calcCloroCombinado('1.5', '0.8')).toBe(0.7)
  })

  it('devuelve null con undefined', () => {
    expect(calcCloroCombinado(undefined, 0.5)).toBeNull()
    expect(calcCloroCombinado(1, undefined)).toBeNull()
  })
})
