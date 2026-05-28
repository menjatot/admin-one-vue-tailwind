import { computed, reactive, ref, watch } from 'vue'
import { usePlantasStore } from '@/stores/plantas'
import { useLoginStore } from '@/stores/login'
import { usePermissions } from '@/composables/usePermissions'
import { supabase } from '@/services/supabase'

export default function useFormSelectData() {
  const loginStore = useLoginStore()
  const plantasStore = usePlantasStore()
  const { seeAllZones, isAdmin, isOperario, isVisualizador } = usePermissions()

  const findOperarioByUser = (usuarioMail) => {
    // Verificar que existe el store y los datos
    if (!plantasStore?.getOperarios) return 'HOLA'

    const operario = plantasStore.getOperarios.find((user) => user.email === usuarioMail)

    return operario ? operario.id : null
  }

  // })
  const operarioLogueado = computed(() => {
    // Verificar si existe userEmail y plantasStore
    if (!loginStore?.userEmail || !plantasStore?.getOperarios) {
      console.warn('No hay email de usuario o no hay operarios')
      return null
    }

    const operario = plantasStore.getOperarios.find((op) => {
      // Validar que op.email existe
      if (!op?.email) return false
      return op.email.toLowerCase() === loginStore.userEmail.toLowerCase()
    })

    return operario || null
  })

  // Obtener fecha actual en formato AAAA-MM-DD
  const today = new Date().toISOString().split('T')[0]

  const form = reactive({
    uo: '',
    zona: null,
    punto_muestreo_fk: null,
    fecha: today,
    color: 1,
    olor: 1,
    sabor: 1,
    cloro: '',
    type: '',
    observaciones: '',
    ph: null,
    turbidez: null,
    cloro_total: null,
    cloro_combinado: null,
    operario: '',
    infraestructura: null,
    fecha_inicio: null,
    fecha_final: null,
    centro_coste: null
  })

  watch(
    () => plantasStore.getOperarios,
    () => {
      if (operarioLogueado.value) {
        // form.operario = operarioLogueado.value.id
        // form.uo = operarioLogueado.value.ud_operativa_fk
      }
    },
    { immediate: true }
  )

  const resetForm = () => {
    Object.keys(form).forEach((key) => {
      form[key] = null
    })
  }

  
  const selectUO = computed(() => {
    // Si no es admin, filtrar UOs basándonos en las zonas que el operario tiene asignadas
    if (!seeAllZones.value) {
      const operario = operarioLogueado.value
      if (!operario) return []
      
      // Obtener el ID de la UO del operario
      const uoId = operario.ud_operativa_fk
      return plantasStore.getUnidadesOperativas
        .filter(uo => uo.id === uoId)
        .map(uo => ({ value: uo.id, label: uo.name }))
    }

    return plantasStore.getUnidadesOperativas.map((uo) => {
      return { value: uo.id, label: uo.name }
    })
  })

  const selectZona = computed(() => {
    let zonas = plantasStore.getZonas

    // 1. Filtrado por Rol (Operario)
    if (!seeAllZones.value) {
      const operario = operarioLogueado.value
      if (operario && operario.zonas) {
        const zonasIds = operario.zonas.map(z => typeof z === 'object' ? z.id : z)
        zonas = zonas.filter(z => zonasIds.includes(z.id))
      } else {
        return []
      }
    }

    // 2. Filtrado por UO seleccionada (Cascada)
    if (form.uo) {
      zonas = zonas.filter((zona) => zona.unidades_operativas_fk === Number(form.uo))
    }

    return zonas.map((zona) => ({ value: zona.id, label: zona.name }))
  })

  const selectInfraestructura = computed(() => {
    let infraestructurasDisponibles = plantasStore.getZonasInfraestructuras
    
    if (form.zona) {
      infraestructurasDisponibles = infraestructurasDisponibles.filter((infra) => infra.zonas_fk === Number(form.zona))
    } else if (form.uo) {
      const zonasDeUo = plantasStore.getZonas.filter(z => z.unidades_operativas_fk === Number(form.uo)).map(z => z.id)
      infraestructurasDisponibles = infraestructurasDisponibles.filter(infra => zonasDeUo.includes(infra.zonas_fk))
    } else if (!seeAllZones.value) {
      const operarioActual = plantasStore.getOperarios.find(op => op.email?.toLowerCase() === loginStore.userEmail?.toLowerCase())
      if (operarioActual && operarioActual.zonas) {
        const zonasIds = operarioActual.zonas.map(zona => typeof zona === 'object' ? zona.id : zona)
        infraestructurasDisponibles = infraestructurasDisponibles.filter(infra => zonasIds.includes(infra.zonas_fk))
      }
    }

    // Deduplicate infraestructuras in case they belong to multiple zones among the filtered ones
    const infraIds = new Set()
    const result = []
    
    infraestructurasDisponibles.forEach((infra) => {
      if (!infraIds.has(infra.infraestructuras_fk)) {
        infraIds.add(infra.infraestructuras_fk)
        result.push({
          value: infra.infraestructuras_fk,
          label: buscaInfraestructuraPorId(infra.infraestructuras_fk)
        })
      }
    })
    
    return result
  })

  const buscaInfraestructuraPorId = (id) => {
    const infraestructura = plantasStore.getInfraestructuras.find(
      (infraestructura) => infraestructura.id === id
    )
    if (infraestructura) {
      return infraestructura.name
    } else {
      return ''
    }
  }

  const puntosCargados = ref([])
  const cargandoPuntos = ref(false)

  watch(
    () => [form.zona, form.infraestructura],
    async ([zona, infra]) => {
      if (!zona && !infra) {
        puntosCargados.value = []
        return
      }

      // Non-admin: validate the selected zone is actually assigned to the operario
      if (!seeAllZones.value) {
        const operario = operarioLogueado.value
        if (!operario?.zonas) {
          puntosCargados.value = []
          return
        }
        const zonasIds = operario.zonas.map(z => (typeof z === 'object' ? z.id : z))
        if (zona && !zonasIds.includes(Number(zona))) {
          puntosCargados.value = []
          return
        }
      }

      cargandoPuntos.value = true
      try {
        let query = supabase
          .from('puntos_muestreo')
          .select('id, name, infraestructura_fk, zona_fk')
          .eq('activo', true)

        if (infra) {
          query = query.eq('infraestructura_fk', Number(infra))
        } else if (zona) {
          const { data: ziData } = await supabase
            .from('zonas_infraestructuras')
            .select('infraestructuras_fk')
            .eq('zonas_fk', Number(zona))

          const infraIds = (ziData ?? []).map(r => r.infraestructuras_fk)

          if (infraIds.length > 0) {
            query = query.or(`zona_fk.eq.${zona},infraestructura_fk.in.(${infraIds.join(',')})`)
          } else {
            query = query.eq('zona_fk', Number(zona))
          }
        }

        const { data } = await query
        puntosCargados.value = data ?? []
      } catch (error) {
        console.error('Error cargando puntos de muestreo:', error)
        puntosCargados.value = []
      } finally {
        cargandoPuntos.value = false
      }
    }
  )

  const selectPuntosMuestra = computed(() =>
    puntosCargados.value.map(p => ({ value: p.id, label: p.name }))
  )
  

  const selectCentroCosto = computed(() => {
    let centros = plantasStore.getCentrosCoste
    if (form.uo) {
      centros = centros.filter(cc => cc.uo_fk === Number(form.uo))
    }
    return centros.map(cc => ({
      value: cc.id,
      label: cc.code ? `${cc.code} - ${cc.name}` : cc.name
    }))
  })

  const operarioPorZona = computed(() => {
    const allOperarios = plantasStore.getOperarios

    // 1. Operario: solo se ve a sí mismo
    if (isOperario.value) {
      const yo = operarioLogueado.value
      if (!yo) return []
      return [{ value: yo.id, label: yo.name }]
    }

    // 2. Administrador: ve todos, filtrando por UO si hay una seleccionada
    if (isAdmin.value) {
      const base = form.uo
        ? allOperarios.filter((op) => op.ud_operativa_fk === Number(form.uo))
        : allOperarios
      return base.map((op) => ({ value: op.id, label: op.name }))
    }

    // 3. Visualizador: ve todos (las analiticas ya estan filtradas por zona via RLS)
    if (isVisualizador.value) {
      return allOperarios.map((op) => ({ value: op.id, label: op.name }))
    }

    // 4. Otros roles (gestor, técnico...):
    //    ve los operarios que comparten zona con el usuario actual
    const yo = operarioLogueado.value
    if (!yo?.zonas?.length) return []
    const misZonas = new Set(yo.zonas.map((z) => (typeof z === 'object' ? z.id : z)))
    return allOperarios
      .filter((op) => op.zonas?.some((z) => misZonas.has(typeof z === 'object' ? z.id : z)))
      .map((op) => ({ value: op.id, label: op.name }))
  })


  return {
    resetForm,
    form,
    selectUO,
    selectZona,
    selectInfraestructura,
    selectPuntosMuestra,
    selectCentroCosto,
    operarioPorZona,
    findOperarioByUser,
    operarioLogueado,
    puntosCargados,
    cargandoPuntos
  }
}
