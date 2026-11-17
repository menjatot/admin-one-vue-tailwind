import { describe, expect, it } from 'vitest'
import { filtrarExcluidas, idsExcluidas } from '../revisionExport'

const a = (id) => ({ id, fecha: '2026-11-13' })
const item = (id) => ({ analitica: a(id), motivos: ['Cloro: 0 mg/l [0.2 - 1]'] })

describe('filtrarExcluidas', () => {
  it('quita de la lista las analíticas excluidas por id', () => {
    const rows = [a(1), a(2), a(3)]
    expect(filtrarExcluidas(rows, [2]).map((r) => r.id)).toEqual([1, 3])
  })

  it('sin exclusiones devuelve una copia con todo', () => {
    const rows = [a(1), a(2)]
    const out = filtrarExcluidas(rows, [])
    expect(out.map((r) => r.id)).toEqual([1, 2])
    expect(out).not.toBe(rows)
  })

  it('tolera listas nulas y exclusiones no informadas', () => {
    expect(filtrarExcluidas(null, [1])).toEqual([])
    expect(filtrarExcluidas([a(1)], null).map((r) => r.id)).toEqual([1])
    expect(filtrarExcluidas([a(1), a(2)], [null, undefined, 2]).map((r) => r.id)).toEqual([1])
  })

  it('no toca las filas sin id coincidente', () => {
    const rows = [a(1), { fecha: '2026-11-13' }]
    expect(filtrarExcluidas(rows, [1])).toEqual([{ fecha: '2026-11-13' }])
  })
})

describe('idsExcluidas', () => {
  it('devuelve los ids de las filas desmarcadas', () => {
    const incorrectas = [item(1), item(2), item(3)]
    expect(idsExcluidas(incorrectas, new Set([1, 3]))).toEqual([1, 3])
    expect(idsExcluidas(incorrectas, [2])).toEqual([2])
  })

  it('sin desmarcadas devuelve []', () => {
    expect(idsExcluidas([item(1)], new Set())).toEqual([])
    expect(idsExcluidas([item(1)], null)).toEqual([])
    expect(idsExcluidas(null, new Set([1]))).toEqual([])
  })

  it('ignora ids desmarcados que ya no están en la revisión', () => {
    expect(idsExcluidas([item(1)], new Set([1, 99]))).toEqual([1])
  })
})
