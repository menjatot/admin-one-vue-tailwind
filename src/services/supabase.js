import { createClient } from "@supabase/supabase-js";
// import {corsHeaders} from '../helpers/cors'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY; 
// const isModalDeleteActive = ref(false)
// const analiticaToDelete = ref(null)

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Client-Info, X-Client-Proto, X-Client-Version, X-Requested-With, Content-Type, Accept, Authorization',
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  },
  // db: {
  //   schema: {
  //     defaultHTTPMethod: 'PUT'  // Force PUT instead of PATCH for updates
  //   }
  // }
});


// Variables locales para persistencia de contexto entre refrescos de token
let currentEmail = null;
let currentRole = null;

// Interceptor para manejar cambios en la autenticación
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('Usuario autenticado:', session?.user?.email)
  }
  if (event === 'SIGNED_OUT') {
    console.log('Usuario desconectado')
    currentEmail = null;
    currentRole = null;
  }
  if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
    console.log('Token actualizado o sesión iniciada, re-aplicando contexto RLS')
    if (currentEmail) {
      setSupabaseAuthContext(currentEmail, currentRole);
    }
  }
})

/**
 * Establece el contexto de seguridad para las políticas RLS de Supabase.
 * Esto inyecta cabeceras personalizadas que son leídas por la función SQL auth_check_zone.
 */
export const setSupabaseAuthContext = (email, role) => {
  currentEmail = email;
  currentRole = role;

  if (email) {
    console.log(`🔐 Estableciendo contexto Supabase para: ${email} (${role})`);
    // Modificamos las cabeceras directamente para que PostgREST las reciba
    supabase.rest.headers['X-User-Email'] = email;
    supabase.rest.headers['X-User-Role'] = role || '';
  } else {
    console.log('🔓 Limpiando contexto Supabase');
    delete supabase.rest.headers['X-User-Email'];
    delete supabase.rest.headers['X-User-Role'];
  }
};



export const searchOperarios = async () => {
  const { data } = await supabase.from('personal').select('*')
  return data
}
export const searchZonasOperarios = async (id) => {
  const { data } = await supabase.from('personal').select(`id,zonas_personal(zonas_abastecimiento(*))`).eq('id',id)
  return data
}

// export const deleteAnalitica = async (analitica) => {
//   analiticaToDelete.value = analitica
//   isModalDeleteActive.value = true
// }




export const deleteAnalitica = async (id) => {
  const { error } = await supabase
      .from('analiticas')
      .delete()
      .eq('id', id)

     if (error) throw error
}

export const updateAnaliticabyId = async (id, data) => {
  try {
    console.log('updateAnaliticabyId: ',id, data);
    // Limpiar datos antes de actualizar
    const cleanData = {
      id: data.id,
      fecha: data.fecha,
      personal_fk: data.personal_fk,
      punto_muestreo_fk: data.punto_muestreo_fk,
      type: data.type,
      cloro: data.cloro,
      color: data.color,
      olor: data.olor,
      sabor: data.sabor,
      ph: data.ph,
      turbidez: data.turbidez,
      observaciones: data.observaciones,
      registro: data.registro
    }
    const { data: updateData, error } = await supabase
      .from('analiticas')
      .update(cleanData)
      .eq('id', id)
      .select()

    if (error) throw error

    return updateData
  } catch (error) {
    console.error('Error en updateAnaliticabyId:', error)
    throw error
  }

 
}
// export const deleteAnalitica = async (id) => {
//   const { data, error } = await supabase
//   .from('analiticas')
//   .delete()
//   .eq('id', id)
//   if (error) throw error
//   return data
// }
