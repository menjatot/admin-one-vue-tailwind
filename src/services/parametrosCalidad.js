import { supabase, assertAdminPermission } from './supabase'

export const getAllParametrosCalidad = async () => {
  const { data, error } = await supabase
    .from('parametros_calidad')
    .select('*')

  if (error) throw error
  return data || []
}

export const upsertParametroCalidad = async (payload) => {
  assertAdminPermission('modificar parámetros de calidad')

  const upsertPayload = {
    comunidades_autonomas_fk: payload.comunidades_autonomas_fk,
    cloro_min: payload.cloro_min,
    cloro_max: payload.cloro_max,
    ph_min: payload.ph_min,
    ph_max: payload.ph_max,
    turbidez_min: payload.turbidez_min,
    turbidez_max: payload.turbidez_max
  }

  const { data, error } = await supabase
    .from('parametros_calidad')
    .upsert(upsertPayload, { onConflict: 'comunidades_autonomas_fk' })
    .select()
    .single()

  if (error) throw error
  return data
}
