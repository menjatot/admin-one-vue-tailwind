import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/services/supabase'

export const usePlantasStore = defineStore('plantasStore', () => {
  const zonas = ref([])
  const operarios = ref([])
  const analiticas = ref([])
  const puntosMuestreo = ref([])
  const unidadesOperativas = ref([])
  const comunidadesAutonomas = ref([])
  const formZonas = ref([])
  const infraestructuras = ref([])
  const tipo_infraestructura = ref([])
  const zonas_infraestructuras = ref([])
  const analiticaToUpdate = ref(null)
  const tipoPersonal = ref([])
  const zonas_personal = ref([])
  const centrosCoste = ref([])

  // onMounted(() => {
  //   loadZonas()
  //   loadOperarios()
  //   loadAnaliticas()
  //   loadPuntosMuestreo()
  //   loadUnidadesOperativas()
  //   loadComunidadesAutonomas()
  //   loadInfraestructuras()
  //   loadTipoInfraestructura()
  //   loadZonasInfraestructuras()
  //   loadTipoPersonal()
  // })

  // Función para inicializar datos básicos (sin analíticas)
  const initializeStore = async () => {
    try {
      await Promise.all([
        loadZonas(),
        loadOperarios(),
        // loadAnaliticas(), // ❌ Removido - se carga bajo demanda
        loadPuntosMuestreo(),
        loadUnidadesOperativas(),
        loadComunidadesAutonomas(),
        loadInfraestructuras(),
        loadTipoInfraestructura(),
        loadZonasInfraestructuras(),
        loadTipoPersonal(),
        loadCentrosCoste()
      ])
      console.log('📊 Store inicializado (sin analíticas)')
    } catch (error) {
      console.error('Error inicializando store:', error)
    }
  }

  // Nueva función para inicializar incluyendo analíticas (solo cuando se necesite)
  const initializeStoreWithAnalytics = async () => {
    try {
      await Promise.all([
        loadZonas(),
        loadOperarios(),
        loadAnaliticas(), // ✅ Solo se carga cuando explícitamente se necesita
        loadPuntosMuestreo(),
        loadUnidadesOperativas(),
        loadComunidadesAutonomas(),
        loadInfraestructuras(),
        loadTipoInfraestructura(),
        loadZonasInfraestructuras(),
        loadTipoPersonal(),
        loadCentrosCoste()
      ])
      console.log('📊 Store inicializado (con analíticas)')
    } catch (error) {
      console.error('Error inicializando store completo:', error)
    }
  }

  const loadZonas = async () => {
    const PAGE_SIZE = 1000
    let allData = []
    let from = 0
    while (true) {
      const { data, error } = await supabase
        .from('zonas_abastecimiento')
        .select('*')
        .range(from, from + PAGE_SIZE - 1)
      if (error || !data || data.length === 0) break
      allData = allData.concat(data)
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }
    zonas.value = allData
  }
  // const loadOperarios = async () => {
  //   const { data } = await supabase.from('personal').select('*')
  //   operarios.value = data
  // }
  const loadZonasOperarios = async () => {
    const PAGE_SIZE = 1000
    let allData = []
    let from = 0
    while (true) {
      const { data, error } = await supabase
        .from('zonas_personal')
        .select('*')
        .range(from, from + PAGE_SIZE - 1)
      if (error || !data || data.length === 0) break
      allData = allData.concat(data)
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }
    zonas_personal.value = allData
  }
  // const loadAnaliticas = async () => {
  //   const { data } = await supabase.from('analiticas').select('*')
  //   analiticas.value = data
  // }

  const loadAnaliticas = async () => {
    try {
      const PAGE_SIZE = 1000
      let allData = []
      let from = 0

      while (true) {
        const { data, error } = await supabase
          .from('analiticas')
          .select(`
            *,
            puntos_muestreo (
              id,
              name,
              infraestructuras (
                id,
                name,
                type
              ),
              zonas_abastecimiento (
                id,
                name,
                unidades_operativas (
                  id,
                  name
                ),
                comunidades_autonomas (
                  id,
                  name
                )
              )
            )
          `)
          .range(from, from + PAGE_SIZE - 1)

        if (error) throw error
        if (!data || data.length === 0) break
        allData = allData.concat(data)
        if (data.length < PAGE_SIZE) break
        from += PAGE_SIZE
      }

      if (allData.length > 0) {
        const mappedData = allData.map(item => {
          const puntoMuestreo = item.puntos_muestreo
          const infraestructura = puntoMuestreo?.infraestructuras || {}
          const zonaAbastecimiento = puntoMuestreo?.zonas_abastecimiento || {}
          const unidadOperativa = zonaAbastecimiento?.unidades_operativas || {}
          const comunidadAutonoma = zonaAbastecimiento?.comunidades_autonomas || {}
  
          return {
            ...item,
            punto_muestreo_id: puntoMuestreo?.id,
            punto_muestreo_name: puntoMuestreo?.name,
            infraestructura_id: infraestructura?.id,
            infraestructura_name: infraestructura?.name,
            infraestructura_type: infraestructura?.type,
            zona_id: zonaAbastecimiento?.id,
            zona_name: zonaAbastecimiento?.name,
            unidad_id: unidadOperativa?.id,
            unidad_name: unidadOperativa?.name,
            comunidad_id: comunidadAutonoma?.id,
            comunidad_name: comunidadAutonoma?.name
          }
        })
        
        analiticas.value = mappedData
        return mappedData
      }
  
    } catch (error) {
      console.error('Error al cargar analíticas:', error.message)
      throw error
    }
  }

  // Modificar loadOperarios para incluir las zonas de cada operario
const loadOperarios = async () => {
  try {
    const { data: operariosData, error } = await supabase.from('personal').select('*')
    
    if (error) throw error

    const PAGE_SIZE = 1000
    let allZonasPersonal = []
    let from = 0
    while (true) {
      const { data, error: zpError } = await supabase
        .from('zonas_personal')
        .select('*')
        .range(from, from + PAGE_SIZE - 1)
      if (zpError || !data || data.length === 0) break
      allZonasPersonal = allZonasPersonal.concat(data)
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }

    // Enriquecer cada operario con sus zonas asignadas
    operarios.value = operariosData.map(operario => {
      const relacionesZonas = allZonasPersonal
        .filter(relacion => relacion.personal_fk === operario.id)
        .map(relacion => relacion.zonas_fk)
      return {
        ...operario,
        zonas: relacionesZonas || []
      }
    })
    
    return operarios.value
  } catch (error) {
    console.error('Error cargando operarios:', error)
    return []
  }
}

  const loadTipoPersonal = async () => {
    const { data } = await supabase.from('tipo_personal').select('*')
    tipoPersonal.value = data
  }

  const loadPuntosMuestreo = async () => {
    const PAGE_SIZE = 1000
    let allData = []
    let from = 0

    while (true) {
      const { data, error } = await supabase
        .from('puntos_muestreo')
        .select('*')
        .range(from, from + PAGE_SIZE - 1)

      if (error || !data || data.length === 0) break
      allData = allData.concat(data)
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }

    puntosMuestreo.value = allData
  }
  const loadUnidadesOperativas = async () => {
    const { data } = await supabase.from('unidades_operativas').select('*')
    unidadesOperativas.value = data
  }
  const loadComunidadesAutonomas = async () => {
    const { data } = await supabase.from('comunidades_autonomas').select('*')
    comunidadesAutonomas.value = data
  }

  const loadZonasInfraestructuras = async () => {
    const PAGE_SIZE = 1000
    let allData = []
    let from = 0

    while (true) {
      const { data, error } = await supabase
        .from('zonas_infraestructuras')
        .select('*')
        .range(from, from + PAGE_SIZE - 1)

      if (error || !data || data.length === 0) break
      allData = allData.concat(data)
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }

    zonas_infraestructuras.value = allData
  }
  const loadTipoInfraestructura = async () => {
    const { data } = await supabase.from('tipo_infraestructura').select('*')
    tipo_infraestructura.value = data
  }

  const loadCentrosCoste = async () => {
    const { data } = await supabase.from('centros_coste').select('*')
    centrosCoste.value = data ?? []
  }

  const loadInfraestructuras = async () => {
    const PAGE_SIZE = 1000
    let allData = []
    let from = 0

    while (true) {
      const { data, error } = await supabase
        .from('infraestructuras')
        .select('*')
        .range(from, from + PAGE_SIZE - 1)

      if (error || !data || data.length === 0) break
      allData = allData.concat(data)
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }

    infraestructuras.value = allData
  }

  const getZonas = computed(() => {
    return zonas.value
  })

  const getOperarios = computed(() => {
    return operarios.value
  })


  const getAnaliticas = computed(() => {
    return analiticas.value
  })

  // Computed para verificar si las analíticas están cargadas
  const isAnalyticasLoaded = computed(() => {
    return analiticas.value.length > 0
  })

  // Computed para obtener el número de analíticas cargadas
  const analyticsCount = computed(() => {
    return analiticas.value.length
  })

  const getPuntosMuestreo = computed(() => {
    return puntosMuestreo.value
  })
  const getUnidadesOperativas = computed(() => {
    return unidadesOperativas.value
  })
  const getComunidadesAutonomas = computed(() => {
    return comunidadesAutonomas.value
  })

  const getInfraestructuras = computed(() => {
    return infraestructuras.value
  })
  const getZonasInfraestructuras = computed(() => {
    return zonas_infraestructuras.value
  })
  const getTipoInfraestructura = computed(() => {
    return tipo_infraestructura.value
  })

  const getTipoPersonal = computed(() => {
    return tipoPersonal.value
  })

  const getCentrosCoste = computed(() => {
    return centrosCoste.value
  })

  const getPuntosMuestreoTotal = computed(() => {
    //quiero qeu devuelva todos los puntos de muestreo con su zona de abastecimiento y su zona de infraestructura
    return puntosMuestreo.value.map((punto) => {
      const zonaAbastecimiento = zonas.value.find((zona) => zona.id === punto.zona_fk)
      const zonaInfraestructura = infraestructuras.value.find(
        (infraestructura) => infraestructura.id === punto.infraestructura_fk
      )
      return {
        ...punto,
        zonaAbastecimiento,
        zonaInfraestructura
      }
    })
  })

  // Añadir un computed getter para facilitar el acceso a las zonas de un operario específico
const getZonasOperario = computed(() => {
  return (operarioId) => {
    const operario = operarios.value.find(op => op.id === operarioId)
    return operario?.zonas || []
  }
})

  const getAnaliticasTotal = computed(() => {
    //quiero qeu devuelva todos los puntos de muestreo con su zona de abastecimiento y su zona de infraestructura

    return analiticas.value.map((analitica) => {
      const puntoMuestreo = puntosMuestreo.value.find(
        (punto) => punto.id === analitica.punto_muestreo_fk
      )

      if (puntoMuestreo) {
        
        const zona_fk = puntoMuestreo.zona_fk
        const infraestructura_fk = puntoMuestreo.infraestructura_fk

        
        
        return {
          ...analitica,
          zona_fk,
          infraestructura_fk,
        }
      }
    })
  })

  // getTipoOperario = (id) => {
  //   const operario = operarios.value.find((operario) => operario.id === id)
  //   if (operario) {
  //     return operario.tipo
  //   } else {
  //     return ''
  //   }
  // }

  return {
    getZonas,
    getOperarios,
    getAnaliticas,
    isAnalyticasLoaded,
    analyticsCount,
    getPuntosMuestreo,
    getUnidadesOperativas,
    getComunidadesAutonomas,
    getInfraestructuras,
    getZonasInfraestructuras,
    getTipoInfraestructura,
    getTipoPersonal,
    tipo_infraestructura,
    zonas,
    operarios,
    analiticas,
    puntosMuestreo,
    unidadesOperativas,
    comunidadesAutonomas,
    formZonas,
    infraestructuras,
    zonas_infraestructuras,
    tipoPersonal,
    loadAnaliticas,
    getPuntosMuestreoTotal,
    getAnaliticasTotal,
    loadOperarios,
    loadZonas,
    loadPuntosMuestreo,
    loadUnidadesOperativas,
    loadComunidadesAutonomas,
    loadInfraestructuras,
    loadZonasInfraestructuras,
    loadTipoPersonal,
    analiticaToUpdate,
    initializeStore,
    initializeStoreWithAnalytics,
    zonas_personal,
    loadZonasOperarios,
    getZonasOperario,
    getCentrosCoste,
    loadCentrosCoste
  }
})
