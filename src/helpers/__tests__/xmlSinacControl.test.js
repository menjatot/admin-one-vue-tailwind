import { describe, expect, it } from 'vitest'
import {
  ESTADOS_XML_SINAC,
  etiquetaXmlSinac,
  nombreFicheroSinac,
  resumenXmlSinac,
  soloFecha,
  transicionesEstadoXmlSinac
} from '../xmlSinacControl'

const punto = (zonaFk) => ({ zona_fk: zonaFk })
const ZONAS = {
  1: { name: 'Villalpardo', centro_coste_fk: 10 },
  2: { name: 'Fortaleny', centro_coste_fk: 20 },
  3: { name: 'Loriguilla', centro_coste_fk: 20 }
}
const resolverPunto = (id) => ({ 101: punto(1), 102: punto(1), 201: punto(2), 301: punto(3) }[id] ?? null)
const resolverZona = (id) => ZONAS[id] ?? null

describe('soloFecha', () => {
  it('recorta timestamps y date-only', () => {
    expect(soloFecha('2026-09-15')).toBe('2026-09-15')
    expect(soloFecha('2026-09-15T10:30:00Z')).toBe('2026-09-15')
  })
  it('devuelve null si no es fecha ISO', () => {
    expect(soloFecha(null)).toBe(null)
    expect(soloFecha('')).toBe(null)
    expect(soloFecha('15/09/2026')).toBe(null)
  })
})

describe('resumenXmlSinac', () => {
  it('agrupa por ZA con rango y cuentas', () => {
    const analiticas = [
      { fecha: '2026-09-05', punto_muestreo_fk: 101 },
      { fecha: '2026-09-25', punto_muestreo_fk: 102 },
      { fecha: '2026-09-10', punto_muestreo_fk: 201 },
      { fecha: '2026-09-30T08:00:00Z', punto_muestreo_fk: 301 }
    ]
    const r = resumenXmlSinac(analiticas, { resolverPunto, resolverZona })

    expect(r.fecha_desde).toBe('2026-09-05')
    expect(r.fecha_hasta).toBe('2026-09-30')
    expect(r.num_analiticas).toBe(4)
    expect(r.num_za).toBe(3)

    const villalpardo = r.zonas.find((z) => z.zona_fk === 1)
    expect(villalpardo.zona_nombre).toBe('Villalpardo')
    expect(villalpardo.num_analiticas).toBe(2)
    expect(villalpardo.fecha_desde).toBe('2026-09-05')
    expect(villalpardo.fecha_hasta).toBe('2026-09-25')

    // ordenadas por nombre en español
    expect(r.zonas.map((z) => z.zona_nombre)).toEqual(['Fortaleny', 'Loriguilla', 'Villalpardo'])
  })

  it('mete los puntos sin zona en "Sin zona" y no los cuenta como ZA', () => {
    const analiticas = [
      { fecha: '2026-09-01', punto_muestreo_fk: 999 },
      { fecha: '2026-09-02', punto_muestreo_fk: 101 }
    ]
    const r = resumenXmlSinac(analiticas, { resolverPunto, resolverZona })
    expect(r.num_za).toBe(1)
    const sinZona = r.zonas.find((z) => z.zona_fk === null)
    expect(sinZona.zona_nombre).toBe('Sin zona')
    expect(sinZona.num_analiticas).toBe(1)
  })

  it('tolera listas vacías', () => {
    const r = resumenXmlSinac([], { resolverPunto, resolverZona })
    expect(r).toEqual({ fecha_desde: null, fecha_hasta: null, num_za: 0, num_analiticas: 0, zonas: [] })
  })
})

describe('etiquetaXmlSinac', () => {
  it('una sola ZA -> nombre de la ZA', () => {
    const r = resumenXmlSinac([{ fecha: '2026-09-01', punto_muestreo_fk: 101 }], { resolverPunto, resolverZona })
    expect(etiquetaXmlSinac(r)).toBe('Villalpardo')
  })
  it('varias ZA del mismo proyecto -> nombre del centro de coste', () => {
    const r = resumenXmlSinac(
      [
        { fecha: '2026-09-01', punto_muestreo_fk: 201 },
        { fecha: '2026-09-01', punto_muestreo_fk: 301 }
      ],
      { resolverPunto, resolverZona }
    )
    const etiqueta = etiquetaXmlSinac(r, { resolverCentro: (fk) => (fk === 20 ? 'Valencia Norte' : null) })
    expect(etiqueta).toBe('Valencia Norte')
  })
  it('varias ZA de proyectos distintos -> nZAS', () => {
    const r = resumenXmlSinac(
      [
        { fecha: '2026-09-01', punto_muestreo_fk: 101 },
        { fecha: '2026-09-01', punto_muestreo_fk: 201 }
      ],
      { resolverPunto, resolverZona }
    )
    expect(etiquetaXmlSinac(r)).toBe('2ZAS')
  })
})

describe('nombreFicheroSinac', () => {
  it('compone el nombre con etiqueta, rango y fecha de generación saneados', () => {
    expect(
      nombreFicheroSinac({
        etiqueta: 'Álava (Norte)',
        fechaDesde: '2026-09-01',
        fechaHasta: '2026-09-30',
        fechaGeneracion: '2026-10-14T09:00:00Z'
      })
    ).toBe('SINAC_Alava_Norte_2026-09-01_2026-09-30_2026-10-14.xml')
  })
  it('sin fechas usa marcadores', () => {
    expect(nombreFicheroSinac({ etiqueta: 'Villalpardo' })).toBe(
      'SINAC_Villalpardo_sin-fechas_sin-fecha.xml'
    )
  })
})

describe('transicionesEstadoXmlSinac', () => {
  it('generado permite anular/correcto/con_errores', () => {
    expect(transicionesEstadoXmlSinac('generado')).toEqual(['anulado', 'correcto', 'con_errores'])
  })
  it('con_errores solo puede pasar a correcto', () => {
    expect(transicionesEstadoXmlSinac('con_errores')).toEqual(['correcto'])
  })
  it('correcto y anulado son finales', () => {
    expect(transicionesEstadoXmlSinac('correcto')).toEqual([])
    expect(transicionesEstadoXmlSinac('anulado')).toEqual([])
  })
  it('estado desconocido no permite nada', () => {
    expect(transicionesEstadoXmlSinac(undefined)).toEqual([])
    expect(ESTADOS_XML_SINAC).toContain('generado')
  })
})
