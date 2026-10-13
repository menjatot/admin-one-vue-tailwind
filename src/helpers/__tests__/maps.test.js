import { describe, it, expect } from 'vitest'
import { filtrarPuntosMapa, esBucketVisible } from '@/helpers/maps'

const punto = (id, bucket, oculto = false) => ({ id, __bucket: bucket, oculto_mapa: oculto })
const tipoDe = (p) => p.__bucket

describe('filtrarPuntosMapa', () => {
  const puntos = [
    punto(1, 1),            // captación
    punto(2, 2),            // depósito
    punto(3, 4),            // red
    punto(4, 4, true),      // red, oculto por el admin
    punto(5, 'sin'),        // sin infraestructura
  ]

  it('excluye siempre los puntos ocultos por el administrador', () => {
    const ids = filtrarPuntosMapa(puntos, null, tipoDe).map((p) => p.id)
    expect(ids).toEqual([1, 2, 3, 5])
  })

  it('con tiposVisibles null muestra todos los tipos', () => {
    expect(filtrarPuntosMapa(puntos, null, tipoDe)).toHaveLength(4)
  })

  it('con una lista de tipos solo muestra esos buckets', () => {
    const ids = filtrarPuntosMapa(puntos, [4], tipoDe).map((p) => p.id)
    expect(ids).toEqual([3]) // la red oculta sigue fuera
    const ids2 = filtrarPuntosMapa(puntos, [1, 2], tipoDe).map((p) => p.id)
    expect(ids2).toEqual([1, 2])
  })

  it('el bucket "sin" es filtrable como cualquier otro', () => {
    const ids = filtrarPuntosMapa(puntos, ['sin'], tipoDe).map((p) => p.id)
    expect(ids).toEqual([5])
    expect(filtrarPuntosMapa(puntos, [1, 2, 4], tipoDe).map((p) => p.id)).toEqual([1, 2, 3])
  })

  it('una lista vacía no muestra nada (el usuario ocultó todo)', () => {
    expect(filtrarPuntosMapa(puntos, [], tipoDe)).toHaveLength(0)
  })

  it('tolera entradas nulas', () => {
    expect(filtrarPuntosMapa(null, null, tipoDe)).toEqual([])
  })
})

describe('esBucketVisible', () => {
  it('null → todo visible', () => {
    expect(esBucketVisible(3, null)).toBe(true)
    expect(esBucketVisible('sin', undefined)).toBe(true)
  })
  it('compara números y strings sin fallos', () => {
    expect(esBucketVisible(4, [1, 2, 4])).toBe(true)
    expect(esBucketVisible(4, ['4'])).toBe(true)
    expect(esBucketVisible('sin', [1, 2])).toBe(false)
  })
})
