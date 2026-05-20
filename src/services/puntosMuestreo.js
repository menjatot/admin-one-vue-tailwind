import { supabase, assertAuthenticated } from './supabase'
import { logAudit } from './auditLog'

export const createPuntoMuestreo = async (data) => {
    assertAuthenticated('crear puntos de muestreo')
    const { data: puntoMuestreo, error } = await supabase
        .from('puntos_muestreo')
        .insert({
            id:data.id,
            name: data.name,
            infraestructura_fk: data.infraestructura_fk,
            zona_fk: data.zona_fk,
            posicion: data.posicion,
            activo: data.activo,
            sn_contador: data.sn_contador ?? null,
        })
        .select()
    .single()
  if (error) throw error

  logAudit('CREATE', 'puntos_muestreo', puntoMuestreo.id, null, puntoMuestreo)

  return puntoMuestreo
}

export const anularPuntoMuestreo = async (id) => {
    assertAuthenticated('anular puntos de muestreo')
    const { data: beforeData } = await supabase
        .from('puntos_muestreo')
        .select('*')
        .eq('id', id)
        .single()

    const { data, error } = await supabase
        .from('puntos_muestreo')
        .update({ activo: false })
        .eq('id', id)
        .select()
        .single()
    if (error) throw error

    logAudit('DELETE', 'puntos_muestreo', id, beforeData, { ...beforeData, activo: false })

    return data
}

export const updatePuntoMuestreo = async (data) => {
    assertAuthenticated('actualizar puntos de muestreo')
    const { data: beforeData } = await supabase
        .from('puntos_muestreo')
        .select('*')
        .eq('id', data.id)
        .single()

    const { data: puntoMuestreo, error } = await supabase
        .from('puntos_muestreo')
        .update({
            name: data.name,
            infraestructura_fk: data.infraestructura_fk,
            zona_fk: data.zona_fk,
            posicion: data.posicion,
            activo: data.activo,
            sn_contador: data.sn_contador ?? null,
        })
        .eq('id', data.id)
        .select()
        .single()
    if (error) throw error

    logAudit('UPDATE', 'puntos_muestreo', data.id, beforeData, puntoMuestreo)

    return puntoMuestreo
}