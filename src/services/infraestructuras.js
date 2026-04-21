import { supabase } from "./supabase";
import { useNotifications } from '@/composables/useNotifications'
import { logAudit } from './auditLog'

const { error: notifyError } = useNotifications()


export const createInfraestructura = async (infraestructura) => {
  try {
    const { data, error } = await supabase
      .from('infraestructuras')
      .insert({
        sinac_id: infraestructura.sinac_id ?? null,
        name: infraestructura.name,
        type: infraestructura.type ? Number(infraestructura.type) : null,
        operador: infraestructura.operador,
      })
      .select()
      .single()

    if (error) throw error

    logAudit('CREATE', 'infraestructuras', data.id, null, data)

    return data
  } catch (error) {
    console.error('Error en createInfraestructura:', error)
    throw error
  }
}   

export const anularInfraestructura = async (id) => {
    try {
        // Fetch before state
        const { data: beforeData } = await supabase
          .from('infraestructuras')
          .select('*')
          .eq('id', id)
          .single()

        const { data } = await supabase
        .from('infraestructuras')
        .update({ activo: false })
        .eq('id', id)
        .single()

        logAudit('DELETE', 'infraestructuras', id, beforeData, { ...beforeData, activo: false })

        return data
    } catch (error) {
    console.error('Error en anularInfraestructura:', error)
    throw error
}

}

export const getZonasDeInfraestructura = async (infraId) => {
  const { data, error } = await supabase
    .from('zonas_infraestructuras')
    .select('zonas_fk')
    .eq('infraestructuras_fk', Number(infraId))
  if (error) throw error
  return data?.map((row) => row.zonas_fk) ?? []
}

export const syncZonasInfraestructura = async (infraId, zonaIds) => {
  try {
    await supabase
      .from('zonas_infraestructuras')
      .delete()
      .eq('infraestructuras_fk', Number(infraId))

    if (zonaIds.length > 0) {
      const { error } = await supabase
        .from('zonas_infraestructuras')
        .insert(zonaIds.map((zonaId) => ({
          infraestructuras_fk: Number(infraId),
          zonas_fk: Number(zonaId)
        })))
      if (error) throw error
    }
  } catch (error) {
    console.error('Error sincronizando zonas de infraestructura:', error)
    throw error
  }
}

export const updateInfraestructura = async (id) => {
    console.log(id);
    try {
        // Fetch before state
        const { data: beforeData } = await supabase
            .from('infraestructuras')
            .select('*')
            .eq('id', id.id)
            .single()

        const { data } = await supabase
            .from('infraestructuras')
            .update({
                sinac_id: id.sinac_id ?? null,
                name: id.name,
                type: id.type ? Number(id.type) : null,
                operador: id.operador })
            .eq('id', id.id)
            .single()

        logAudit('UPDATE', 'infraestructuras', id.id, beforeData, data)

        return data

    } catch (error) {
        console.error('Error al Actualizar la Infraestructura:', error)
      notifyError('No se ha podido actualizar la infraestructura.', {
        title: 'Error al actualizar infraestructura'
      })
        throw error
    }
}