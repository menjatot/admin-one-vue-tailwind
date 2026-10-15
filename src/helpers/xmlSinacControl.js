// Helpers puros del control de XMLs SINAC (SINAQ).
// Sin dependencias del DOM: fáciles de testear.

const RE_FECHA_ISO = /^\d{4}-\d{2}-\d{2}/

/** 'YYYY-MM-DD...' -> 'YYYY-MM-DD' (o null si no es una fecha ISO válida). */
export const soloFecha = (fecha) => {
  if (fecha == null) return null
  const s = String(fecha)
  return RE_FECHA_ISO.test(s) ? s.slice(0, 10) : null
}

/**
 * Resumen de las analíticas incluidas en un XML, para registrar el control SINAC.
 *
 * @param {Array} analiticas filas de analíticas incluidas en el XML
 * @param {Object} resolvers
 * @param {(id:number)=>object|null} resolvers.resolverPunto id -> { zona_fk }
 * @param {(id:number)=>object|null} resolvers.resolverZona  id -> { name, centro_coste_fk }
 * @returns {{fecha_desde:string|null, fecha_hasta:string|null, num_za:number, num_analiticas:number,
 *            zonas:Array<{zona_fk:number|null, zona_nombre:string, centro_coste_fk:number|null,
 *                         fecha_desde:string|null, fecha_hasta:string|null, num_analiticas:number}>}}
 */
export const resumenXmlSinac = (analiticas = [], { resolverPunto, resolverZona } = {}) => {
  const zonas = new Map()
  let min = null
  let max = null

  for (const a of analiticas) {
    const fecha = soloFecha(a?.fecha)
    if (fecha) {
      if (!min || fecha < min) min = fecha
      if (!max || fecha > max) max = fecha
    }

    const punto = resolverPunto ? resolverPunto(a?.punto_muestreo_fk) : null
    const zonaFk = punto?.zona_fk ?? null
    const zona = zonaFk != null && resolverZona ? resolverZona(zonaFk) : null
    const key = zonaFk ?? 'sin-zona'

    if (!zonas.has(key)) {
      zonas.set(key, {
        zona_fk: zonaFk ?? null,
        zona_nombre: zona?.name ?? 'Sin zona',
        centro_coste_fk: zona?.centro_coste_fk ?? null,
        fecha_desde: null,
        fecha_hasta: null,
        num_analiticas: 0
      })
    }

    const entrada = zonas.get(key)
    entrada.num_analiticas += 1
    if (fecha) {
      if (!entrada.fecha_desde || fecha < entrada.fecha_desde) entrada.fecha_desde = fecha
      if (!entrada.fecha_hasta || fecha > entrada.fecha_hasta) entrada.fecha_hasta = fecha
    }
  }

  const lista = [...zonas.values()].sort((x, y) =>
    x.zona_nombre.localeCompare(y.zona_nombre, 'es')
  )

  return {
    fecha_desde: min,
    fecha_hasta: max,
    // nº de ZA reales (los puntos sin zona no cuentan como ZA)
    num_za: lista.filter((z) => z.zona_fk != null).length,
    num_analiticas: analiticas.length,
    zonas: lista
  }
}

/**
 * Etiqueta para el nombre del fichero: la ZA si es una sola; el proyecto
 * (centro de coste) si todas las ZA son del mismo; si no, "nZAS".
 */
export const etiquetaXmlSinac = (resumen, { resolverCentro } = {}) => {
  const zonas = (resumen?.zonas ?? []).filter((z) => z.zona_fk != null)
  if (zonas.length === 0) return 'ANALITICAS'
  if (zonas.length === 1) return zonas[0].zona_nombre

  const centros = new Set(zonas.map((z) => z.centro_coste_fk ?? null))
  if (centros.size === 1) {
    const fk = [...centros][0]
    const nombre = fk != null && resolverCentro ? resolverCentro(fk) : null
    if (nombre) return nombre
  }
  return `${zonas.length}ZAS`
}

const limpiarNombre = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // tildes/diacríticos
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')

/** Nombre de fichero trazable: SINAC_<ETIQUETA>_<desde>_<hasta>_<generación>.xml */
export const nombreFicheroSinac = ({ etiqueta, fechaDesde, fechaHasta, fechaGeneracion } = {}) => {
  const rango = [fechaDesde, fechaHasta].map(soloFecha).filter(Boolean).join('_') || 'sin-fechas'
  const generacion = soloFecha(fechaGeneracion) || 'sin-fecha'
  return `SINAC_${limpiarNombre(etiqueta) || 'ANALITICAS'}_${rango}_${generacion}.xml`
}

export const ESTADOS_XML_SINAC = ['generado', 'anulado', 'correcto', 'con_errores']

/** Estados a los que se puede pasar desde `estado`. Correcto y anulado son finales. */
export const transicionesEstadoXmlSinac = (estado) => {
  switch (estado) {
    case 'generado':
      return ['anulado', 'correcto', 'con_errores']
    case 'con_errores':
      return ['correcto']
    default:
      return []
  }
}

/**
 * Tabla "Estado por zona de abastecimiento" del Control SINAC.
 *
 * @param {Array} xmls registros de xml_sinac con `xml_sinac_zonas` embebido,
 *                    ordenados de más reciente a más antiguo (como los devuelve el servicio)
 * @param {Array} catalogoZonas zonas de abastecimiento conocidas ([{id, name}])
 * @returns {Array<{zona_fk:number|null, zona_nombre:string, cargado_hasta:string|null, ultimo:object|null}>}
 *   - cargado_hasta: máxima fecha_hasta entre los desgloses de XML `correcto` (de cualquier técnico)
 *   - ultimo: XML más reciente NO anulado que incluye la zona (para mostrar su estado)
 */
export const estadoZonasDesdeXmls = (xmls = [], catalogoZonas = []) => {
  const porZona = new Map()

  for (const xml of xmls) {
    for (const z of xml?.xml_sinac_zonas ?? []) {
      const key = z.zona_fk ?? `sin:${z.zona_nombre}`
      if (!porZona.has(key)) {
        porZona.set(key, {
          zona_fk: z.zona_fk ?? null,
          zona_nombre: z.zona_nombre,
          cargado_hasta: null,
          ultimo: null
        })
      }
      const entrada = porZona.get(key)
      if (xml.estado === 'correcto' && z.fecha_hasta) {
        if (!entrada.cargado_hasta || z.fecha_hasta > entrada.cargado_hasta) {
          entrada.cargado_hasta = z.fecha_hasta
        }
      }
      // xmls vienen de más reciente a más antiguo: el primero no anulado es el último
      if (xml.estado !== 'anulado' && !entrada.ultimo) entrada.ultimo = xml
    }
  }

  const filas = catalogoZonas.map((z) => {
    const datos = porZona.get(z.id)
    return {
      zona_fk: z.id,
      zona_nombre: z.name,
      cargado_hasta: datos?.cargado_hasta ?? null,
      ultimo: datos?.ultimo ?? null
    }
  })

  // Zonas presentes en XMLs pero fuera del catálogo (p. ej. "Sin zona")
  for (const datos of porZona.values()) {
    const existe = filas.some(
      (f) => f.zona_fk === datos.zona_fk && f.zona_nombre === datos.zona_nombre
    )
    if (!existe) {
      filas.push({
        zona_fk: datos.zona_fk,
        zona_nombre: datos.zona_nombre,
        cargado_hasta: datos.cargado_hasta,
        ultimo: datos.ultimo
      })
    }
  }

  return filas.sort((a, b) => a.zona_nombre.localeCompare(b.zona_nombre, 'es'))
}

/** Contadores por estado del histórico de XMLs. */
export const contarEstadosXmlSinac = (xmls = []) => {
  const c = { total: xmls.length, generado: 0, anulado: 0, correcto: 0, con_errores: 0 }
  for (const x of xmls) c[x.estado] = (c[x.estado] ?? 0) + 1
  return c
}

/**
 * Filtro del histórico. `desde`/`hasta` comparan contra la fecha de generación
 * (YYYY-MM-DD, inclusive). `tecnico` busca en email y nombre.
 */
export const filtrarHistoricoXmlSinac = (xmls = [], { estado, tecnico, desde, hasta } = {}) =>
  xmls.filter((xml) => {
    if (estado && xml.estado !== estado) return false
    if (tecnico && String(tecnico).trim()) {
      const q = String(tecnico).trim().toLowerCase()
      const texto = `${xml.tecnico_email ?? ''} ${xml.tecnico_nombre ?? ''}`.toLowerCase()
      if (!texto.includes(q)) return false
    }
    const gen = (xml.fecha_generacion ?? '').slice(0, 10)
    if (desde && gen < desde) return false
    if (hasta && gen > hasta) return false
    return true
  })
