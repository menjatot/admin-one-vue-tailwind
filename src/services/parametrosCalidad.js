import { supabase, assertAdminPermission } from './supabase'
import { logAudit } from './auditLog'

export const getAllParametrosCalidad = async () => {
  const { data, error } = await supabase
    .from('parametros_calidad')
    .select('*')

  if (error) throw error
  return data || []
}

export const upsertParametroCalidad = async (payload) => {
  assertAdminPermission('modificar parámetros de calidad')

  // Fetch before state if exists
  const { data: existingData } = await supabase
    .from('parametros_calidad')
    .select('*')
    .eq('comunidades_autonomas_fk', payload.comunidades_autonomas_fk)
    .single()

  const upsertPayload = {
    comunidades_autonomas_fk: payload.comunidades_autonomas_fk,
    cloro_min: payload.cloro_min,
    cloro_max: payload.cloro_max,
    ph_min: payload.ph_min,
    ph_max: payload.ph_max,
    turbidez_min: payload.turbidez_min,
    turbidez_max: payload.turbidez_max,
    turbidez_min_dc: payload.turbidez_min_dc,
    turbidez_max_dc: payload.turbidez_max_dc
  }

  const { data, error } = await supabase
    .from('parametros_calidad')
    .upsert(upsertPayload, { onConflict: 'comunidades_autonomas_fk' })
    .select()
    .single()

  if (error) throw error

  const action = existingData ? 'UPDATE' : 'CREATE'
  logAudit(action, 'parametros_calidad', data.id, existingData, data)

  return data
}
