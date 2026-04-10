import { supabase } from "./supabase";
import { useNotifications } from '@/composables/useNotifications'

const { error: notifyError } = useNotifications()


export const createInfraestructura = async (infraestructura) => {
  try {
    const { data } = await supabase
      .from('infraestructuras')
      .insert({
        sinac_id: infraestructura.sinac_id ?? null,
        name: infraestructura.name,
        type: infraestructura.type ? Number(infraestructura.type) : null,
        operador: infraestructura.operador,
      })
      .select()
      .single()

    return data
  } catch (error) {
    console.error('Error en setZona:', error)
    throw error
  }
}   

export const anularInfraestructura = async (id) => {
    try {
    const { data } = await supabase
    .from('infraestructuras')
    .update({ activo: false })
    .eq('id', id)
    .single()

    return data
} catch (error) {
    console.error('Error en anularInfraestructura:', error)
    throw error
}

}

export const updateInfraestructura = async (id) => {
    console.log(id);
    try {
        const { data } = await supabase
            .from('infraestructuras')
            .update({
                sinac_id: id.sinac_id ?? null,
                name: id.name,
                type: id.type ? Number(id.type) : null,
                operador: id.operador })
            .eq('id', id.id)
            .single()

        return data

    } catch (error) {
        console.error('Error al Actualizar la Infraestructura:', error)
      notifyError('No se ha podido actualizar la infraestructura.', {
        title: 'Error al actualizar infraestructura'
      })
        throw error
    }
}