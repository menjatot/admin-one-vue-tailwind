import { supabase, assertAuthenticated } from './supabase'
import { logAudit } from './auditLog'

export const BUCKET_XML_SINAC = 'xml-sinac'

/**
 * Registra un XML generado en el control SINAC: cabecera (xml_sinac),
 * desglose por zona (xml_sinac_zonas) y, si se pasa, el propio fichero en
 * Storage (bucket `xml-sinac`). Si el fichero no se puede subir, el registro
 * se mantiene (sin re-descarga) y solo se avisa por consola.
 */
export const registrarXmlSinac = async ({ nombreFichero, resumen, tecnico, xmlBlob } = {}) => {
  assertAuthenticated('registrar XML SINAC')

  const { data, error } = await supabase
    .from('xml_sinac')
    .insert({
      nombre_fichero: nombreFichero,
      tecnico_email: tecnico?.email ?? '',
      tecnico_nombre: tecnico?.nombre ?? null,
      fecha_desde: resumen?.fecha_desde ?? null,
      fecha_hasta: resumen?.fecha_hasta ?? null,
      num_za: resumen?.num_za ?? 0,
      num_analiticas: resumen?.num_analiticas ?? 0,
      estado: 'generado'
    })
    .select()
    .single()

  if (error) throw error

  const zonas = resumen?.zonas ?? []
  if (zonas.length > 0) {
    const { error: errZonas } = await supabase.from('xml_sinac_zonas').insert(
      zonas.map((z) => ({
        xml_id: data.id,
        zona_fk: z.zona_fk,
        zona_nombre: z.zona_nombre,
        fecha_desde: z.fecha_desde,
        fecha_hasta: z.fecha_hasta,
        num_analiticas: z.num_analiticas
      }))
    )
    if (errZonas) throw errZonas
  }

  if (xmlBlob) {
    try {
      const path = `${data.id}/${nombreFichero}`
      const { error: errSubida } = await supabase.storage
        .from(BUCKET_XML_SINAC)
        .upload(path, xmlBlob, { contentType: 'application/xml', upsert: true })
      if (errSubida) throw errSubida

      const { error: errPath } = await supabase
        .from('xml_sinac')
        .update({ fichero_path: path })
        .eq('id', data.id)
      if (errPath) throw errPath

      data.fichero_path = path
    } catch (e) {
      console.error('No se pudo guardar el fichero XML en Storage:', e)
    }
  }

  logAudit('CREATE', 'xml_sinac', data.id, null, {
    nombre_fichero: nombreFichero,
    tecnico: tecnico?.email ?? null,
    num_analiticas: resumen?.num_analiticas ?? 0
  })

  return data
}

/** Lista completa de XMLs con su desglose de zonas, más recientes primero. */
export const getXmlSinac = async () => {
  const { data, error } = await supabase
    .from('xml_sinac')
    .select('*, xml_sinac_zonas(*)')
    .order('fecha_generacion', { ascending: false })

  if (error) throw error
  return data ?? []
}

/** Cambia el estado de un XML (anulado | correcto | con_errores). */
export const cambiarEstadoXmlSinac = async (id, estado, { notas } = {}) => {
  assertAuthenticated('cambiar estado XML SINAC')

  const { data: previo } = await supabase.from('xml_sinac').select('*').eq('id', id).single()

  const cambios = { estado, fecha_estado: new Date().toISOString() }
  if (notas !== undefined) cambios.notas = notas

  const { data, error } = await supabase
    .from('xml_sinac')
    .update(cambios)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  logAudit('UPDATE', 'xml_sinac', id, previo, data)
  return data
}

/** URL firmada (2 min) para re-descargar el fichero guardado, como adjunto. */
export const obtenerUrlXmlSinac = async (path, nombreFichero) => {
  const { data, error } = await supabase.storage
    .from(BUCKET_XML_SINAC)
    .createSignedUrl(path, 120, nombreFichero ? { download: nombreFichero } : undefined)

  if (error) throw error
  return data.signedUrl
}
