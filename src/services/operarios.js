import { supabase, assertAuthenticated } from './supabase'
import { logAudit } from './auditLog'

export const getOperarios = async () => {
  const { data } = await supabase.from('personal').select('*')
  return data
}

// export const setOperarios = async (operario) => {
//   const { data } = await supabase.from('personal').insert(operario)
//   return data
// }

export const setOperarios = async (operario) => {
  assertAuthenticated('crear operarios')
  try {
    // 1. Insertar operario y obtener ID
    const { data: newOperario, error: errorOperario } = await supabase
      .from('personal')
      .insert({
        name: operario.name,
        email: operario.email,
        phone: operario.phone,
        ud_operativa_fk: operario.ud_operativa_fk,
        type: operario.type,
        rol_id: operario.rol_id
      })
      .select() // Devuelve todos los campos, incluido el ID generado
      .single() // Devuelve un único registro en lugar de un array

    if (errorOperario) throw errorOperario

    // 2. Preparar zonas con el ID generado
    const zonasToInsert = operario.zonas.map(zona_fk => ({
      personal_fk: newOperario.id,
      zonas_fk: zona_fk
    }))

    // 3. Insertar zonas (solo si hay zonas seleccionadas)
    let insertedZonas = []
    if (zonasToInsert.length > 0) {
      const { data, error: errorZonas } = await supabase
        .from('zonas_personal')
        .insert(zonasToInsert)
        .select()

      if (errorZonas) throw errorZonas
      insertedZonas = data
    }

    // Audit log
    logAudit('CREATE', 'operarios', newOperario.id, null, { ...operario, zonas: insertedZonas })

    return {
      operario: newOperario,
      zonas: insertedZonas
    }

  } catch (error) {
    console.error('Error en setOperarios:', error)
    throw error
  }
}

// export const deleteOperario = async (id) => {
//   const { error } = await supabase.from('personal').delete().eq('id', id)

//   if (error) throw error
// }

export const deleteOperario = async (id) => {
  assertAuthenticated('eliminar operarios')
  try {
    // 0. Fetch operario data before deletion for audit
    const { data: operarioToDelete } = await supabase
      .from('personal')
      .select('*')
      .eq('id', id)
      .single()

    // 1. Primero borrar registros en zonas_personal
    const { error: errorZonas } = await supabase
      .from('zonas_personal')
      .delete()
      .eq('personal_fk', id)

    if (errorZonas) throw errorZonas

    // 2. Luego borrar el operario
    const { error: errorOperario } = await supabase
      .from('personal')
      .delete()
      .eq('id', id)

    if (errorOperario) throw errorOperario

    // Audit log
    logAudit('DELETE', 'operarios', id, operarioToDelete, null)

    return true

  } catch (error) {
    console.error('Error al eliminar operario:', error)
    throw error
  }
}


export const updateOperariobyId = async (data) => {
  assertAuthenticated('actualizar operarios')
  try {
    // 0. Fetch current state before update for audit
    const { data: beforeUpdate } = await supabase
      .from('personal')
      .select('*')
      .eq('id', data.id)
      .single()

    const { data: beforeZonas } = await supabase
      .from('zonas_personal')
      .select('*')
      .eq('personal_fk', data.id)

    // 1. Limpiar datos del operario
    const cleanDataOperario = {
      // id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      ud_operativa_fk: data.ud_operativa_fk,
      type: data.type,
      rol_id: data.rol_id
    }
    // 2. Actualizar datos del operario
    const { data: updateDataOperario, errorOperario } = await supabase
      .from('personal')
      .update(cleanDataOperario)
      .eq('id', data.id)
      .select()


    if (errorOperario) throw errorOperario


    // 3. Limpiar datos de las zonas del operario
    const { error: errorDelete } = await supabase
      .from('zonas_personal')
      .delete()
      .eq('personal_fk', data.id)

    if (errorDelete) throw errorDelete

    // 4. Preparar nuevas zonas
    const zonasToInsert = data.zonas.map((zona_fk) => ({
      personal_fk: data.id,
      zonas_fk: zona_fk
    }))

    // 5. Insertar nuevas zonas
    const { data: insertedZonas, error: errorInsert } = await supabase
      .from('zonas_personal')
      .insert(zonasToInsert)
      .select()

    if (errorInsert) throw errorInsert

    // Audit log
    logAudit('UPDATE', 'operarios', data.id,
      { ...beforeUpdate, zonas: beforeZonas },
      { ...updateDataOperario, zonas: insertedZonas }
    )

    return {
      operario: updateDataOperario,
      zonas: insertedZonas
    }
  } catch (error) {
    console.error('Error en updateOperariobyId:', error)
    throw error
  }
}
