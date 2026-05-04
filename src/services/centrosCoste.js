import { supabase, assertAdminPermission } from './supabase'
import { logAudit } from './auditLog'

export const createCentroCoste = async (centroCoste) => {
  assertAdminPermission('crear centro de coste')
  try {
    const { data, error } = await supabase
      .from('centros_coste')
      .insert({
        id: centroCoste.id,
        code: centroCoste.code,
        name: centroCoste.name,
        uo_fk: centroCoste.uo_fk ?? null
      })
      .select()
      .single()

    if (error) throw error

    logAudit('CREATE', 'centros_coste', data.id, null, data)
    return data
  } catch (error) {
    console.error('Error en createCentroCoste:', error)
    throw error
  }
}

export const updateCentroCoste = async (centroCoste) => {
  assertAdminPermission('actualizar centro de coste')
  try {
    const { data: beforeUpdate } = await supabase
      .from('centros_coste')
      .select('*')
      .eq('id', centroCoste.id)
      .single()

    const { data, error } = await supabase
      .from('centros_coste')
      .update({
        code: centroCoste.code,
        name: centroCoste.name,
        uo_fk: centroCoste.uo_fk ?? null
      })
      .eq('id', centroCoste.id)
      .select()
      .single()

    if (error) throw error

    logAudit('UPDATE', 'centros_coste', data.id, beforeUpdate, data)
    return data
  } catch (error) {
    console.error('Error en updateCentroCoste:', error)
    throw error
  }
}

export const anularCentroCoste = async (id) => {
  assertAdminPermission('anular centro de coste')
  try {
    const { data, error } = await supabase
      .from('centros_coste')
      .upsert({ id, activa: false }, { onConflict: ['id'] })
      .select()

    if (error) throw error

    logAudit('DELETE', 'centros_coste', id, { id, activa: true }, data)
    return data
  } catch (error) {
    console.error('Error en anularCentroCoste:', error)
    throw error
  }
}
