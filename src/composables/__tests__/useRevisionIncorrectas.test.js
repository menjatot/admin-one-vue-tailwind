import { describe, it, expect } from 'vitest'
import { getMotivosIncorrectas } from '@/composables/useRevisionIncorrectas'
import { DEFAULT_ANALITICA_RANGES } from '@/constants/parametrosCalidad'

const analitica = (over = {}) => ({
  cloro: null, ph: null, turbidez: null, aluminio: null,
  olor: 1, color: 1, sabor: 1,
  ...over
})

describe('getMotivosIncorrectas', () => {
  it('sin valores fuera de rango no hay motivos', () => {
    expect(getMotivosIncorrectas(analitica({ cloro: 0.5, ph: 7.5, turbidez: 1 }), DEFAULT_ANALITICA_RANGES)).toEqual([])
    expect(getMotivosIncorrectas(analitica(), DEFAULT_ANALITICA_RANGES)).toEqual([])
  })

  it('cloro fuera de rango incluye valor y rango', () => {
    const motivos = getMotivosIncorrectas(analitica({ cloro: 0.3 }), DEFAULT_ANALITICA_RANGES)
    expect(motivos).toEqual(['Cloro: 0.3 mg/l [0.4 - 1]'])
  })

  it('respeta los rangos por comunidad', () => {
    const ranges = { ...DEFAULT_ANALITICA_RANGES, cloro: { min: 0.2, max: 1 } }
    expect(getMotivosIncorrectas(analitica({ cloro: 0.3 }), ranges)).toEqual([])
  })

  it('pH fuera de rango', () => {
    expect(getMotivosIncorrectas(analitica({ ph: 9.9 }), DEFAULT_ANALITICA_RANGES))
      .toEqual(['pH: 9.9 [6.5 - 9.5]'])
  })

  it('turbidez usa el rango DC en depósito de cabecera', () => {
    const ranges = DEFAULT_ANALITICA_RANGES
    // 0.5 está en [0-4] pero fuera de [0.8-2] con DC
    expect(getMotivosIncorrectas(analitica({ turbidez: 0.5 }), ranges, false)).toEqual([])
    expect(getMotivosIncorrectas(analitica({ turbidez: 0.5 }), ranges, true))
      .toEqual(['Turbidez: 0.5 [0.8 - 2]'])
  })

  it('aluminio: incidencia solo por encima de 200', () => {
    expect(getMotivosIncorrectas(analitica({ aluminio: 250 }), DEFAULT_ANALITICA_RANGES))
      .toEqual(['Aluminio: 250 µg/L [máx 200]'])
    expect(getMotivosIncorrectas(analitica({ aluminio: 200 }), DEFAULT_ANALITICA_RANGES)).toEqual([])
    expect(getMotivosIncorrectas(analitica({ aluminio: 0 }), DEFAULT_ANALITICA_RANGES)).toEqual([])
  })

  it('organolépticos no conformes', () => {
    expect(getMotivosIncorrectas(analitica({ olor: 0, color: 0 }), DEFAULT_ANALITICA_RANGES))
      .toEqual(['Olor: no conforme', 'Color: no conforme'])
  })

  it('acumula varios motivos', () => {
    const motivos = getMotivosIncorrectas(
      analitica({ cloro: 0, ph: 9.9, aluminio: 300, sabor: 0 }),
      DEFAULT_ANALITICA_RANGES
    )
    expect(motivos).toHaveLength(4)
  })
})
