import { describe, expect, it } from 'vitest'
import {
  ESTADOS_XML_SINAC,
  contarEstadosXmlSinac,
  estadoZonasDesdeXmls,
  etiquetaXmlSinac,
  filtrarHistoricoXmlSinac,
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

const ZONAS_XML = (fk, nombre, desde, hasta, n) => ({
  zona_fk: fk,
  zona_nombre: nombre,
  fecha_desde: desde,
  fecha_hasta: hasta,
  num_analiticas: n
})
// Orden real del servicio: más reciente primero
const XMLS = [
  { id: 'x3', estado: 'anulado', fecha_generacion: '2026-10-06T09:00:00Z', xml_sinac_zonas: [ZONAS_XML(1, 'Villalpardo', '2026-10-01', '2026-10-15', 2)] },
  { id: 'x2', estado: 'generado', fecha_generacion: '2026-10-05T09:00:00Z', xml_sinac_zonas: [ZONAS_XML(3, 'Loriguilla', '2026-10-01', '2026-10-10', 1)] },
  { id: 'x1', estado: 'correcto', fecha_generacion: '2026-10-01T09:00:00Z', xml_sinac_zonas: [ZONAS_XML(1, 'Villalpardo', '2026-09-01', '2026-09-30', 4)] },
  { id: 'x0', estado: 'correcto', fecha_generacion: '2026-09-20T09:00:00Z', xml_sinac_zonas: [ZONAS_XML(1, 'Villalpardo', '2026-08-01', '2026-08-31', 3)] }
]
const CATALOGO = [
  { id: 1, name: 'Villalpardo' },
  { id: 2, name: 'Fortaleny' },
  { id: 3, name: 'Loriguilla' }
]

describe('estadoZonasDesdeXmls', () => {
  it('calcula "cargado hasta" solo con XML correctos (máx fecha_hasta) e ignora anulados', () => {
    const filas = estadoZonasDesdeXmls(XMLS, CATALOGO)
    const villalpardo = filas.find((f) => f.zona_fk === 1)
    // el anulado llegaba hasta 15/10 pero no cuenta: manda el correcto (30/09)
    expect(villalpardo.cargado_hasta).toBe('2026-09-30')
    // último NO anulado = x1 (el anulado x3 se salta)
    expect(villalpardo.ultimo.id).toBe('x1')
    expect(villalpardo.ultimo.estado).toBe('correcto')
  })

  it('incluye las zonas del catálogo sin actividad y las ordena por nombre', () => {
    const filas = estadoZonasDesdeXmls(XMLS, CATALOGO)
    expect(filas.map((f) => f.zona_nombre)).toEqual(['Fortaleny', 'Loriguilla', 'Villalpardo'])
    const fortaleny = filas.find((f) => f.zona_fk === 2)
    expect(fortaleny.cargado_hasta).toBeNull()
    expect(fortaleny.ultimo).toBeNull()
    const loriguilla = filas.find((f) => f.zona_fk === 3)
    expect(loriguilla.cargado_hasta).toBeNull() // generado, aún no correcto
    expect(loriguilla.ultimo.id).toBe('x2')
  })

  it('añade zonas presentes en XMLs pero fuera del catálogo (p. ej. Sin zona)', () => {
    const xmls = [
      { id: 'y1', estado: 'generado', fecha_generacion: '2026-10-01T09:00:00Z', xml_sinac_zonas: [ZONAS_XML(null, 'Sin zona', '2026-09-01', '2026-09-30', 1)] }
    ]
    const filas = estadoZonasDesdeXmls(xmls, CATALOGO)
    expect(filas.some((f) => f.zona_nombre === 'Sin zona')).toBe(true)
  })

  it('tolera listas vacías', () => {
    expect(estadoZonasDesdeXmls()).toEqual([])
    expect(estadoZonasDesdeXmls(XMLS, [])).toHaveLength(2) // solo las que aparecen en XMLs (Villalpardo y Loriguilla)
  })
})

describe('contarEstadosXmlSinac', () => {
  it('cuenta por estado y total', () => {
    expect(contarEstadosXmlSinac(XMLS)).toEqual({ total: 4, generado: 1, anulado: 1, correcto: 2, con_errores: 0 })
    expect(contarEstadosXmlSinac()).toEqual({ total: 0, generado: 0, anulado: 0, correcto: 0, con_errores: 0 })
  })
})

describe('filtrarHistoricoXmlSinac', () => {
  it('filtra por estado', () => {
    expect(filtrarHistoricoXmlSinac(XMLS, { estado: 'correcto' }).map((x) => x.id)).toEqual(['x1', 'x0'])
  })
  it('filtra por técnico (email o nombre, case-insensitive)', () => {
    const xmls = [
      { id: 'a', estado: 'generado', tecnico_email: 'ana@aqlara.com', tecnico_nombre: 'Ana López', fecha_generacion: '2026-10-01T00:00:00Z' },
      { id: 'b', estado: 'generado', tecnico_email: 'luis@aqlara.com', tecnico_nombre: 'Luis Pérez', fecha_generacion: '2026-10-02T00:00:00Z' }
    ]
    expect(filtrarHistoricoXmlSinac(xmls, { tecnico: 'ANA' }).map((x) => x.id)).toEqual(['a'])
    expect(filtrarHistoricoXmlSinac(xmls, { tecnico: 'pérez' }).map((x) => x.id)).toEqual(['b'])
  })
  it('filtra por rango de fecha de generación (inclusive)', () => {
    expect(filtrarHistoricoXmlSinac(XMLS, { desde: '2026-10-01', hasta: '2026-10-06' }).map((x) => x.id)).toEqual(['x3', 'x2', 'x1'])
    expect(filtrarHistoricoXmlSinac(XMLS, { hasta: '2026-09-30' }).map((x) => x.id)).toEqual(['x0'])
  })
  it('sin filtros devuelve todo', () => {
    expect(filtrarHistoricoXmlSinac(XMLS)).toHaveLength(4)
  })
})
