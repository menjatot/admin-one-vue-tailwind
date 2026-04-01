import { computed, reactive, watch } from 'vue'
import { usePlantasStore } from '@/stores/plantas'
import { useLoginStore } from '@/stores/login'

export default function useFormSelectData() {
  const loginStore = useLoginStore()
  const plantasStore = usePlantasStore()

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
    operario: '',
    infraestructura: null,
    fecha_inicio: null,
    fecha_final: null
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
    return plantasStore.getUnidadesOperativas.map((uo) => {
      return { value: uo.id, label: uo.name }
    })
  })
  const selectZona = computed(() => {
    if (!form.uo)
      return plantasStore.getZonas.map((zona) => {
        return { value: zona.id, label: zona.name }
      })
    return plantasStore.getZonas
      .filter((zona) => zona.unidades_operativas_fk === Number(form.uo))
      .map((zona) => {
        return { value: zona.id, label: zona.name }
      })
  })

  const selectInfraestructura = computed(() => {
    let infraestructurasDisponibles = plantasStore.getZonasInfraestructuras
    
    if (form.zona) {
      infraestructurasDisponibles = infraestructurasDisponibles.filter((infra) => infra.zonas_fk === Number(form.zona))
    } else if (form.uo) {
      const zonasDeUo = plantasStore.getZonas.filter(z => z.unidades_operativas_fk === Number(form.uo)).map(z => z.id)
      infraestructurasDisponibles = infraestructurasDisponibles.filter(infra => zonasDeUo.includes(infra.zonas_fk))
    } else if (Number(loginStore.userRole) !== 99 && loginStore.userRole !== 'admin') {
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

  const selectPuntosMuestra = computed(() => {
    let puntos = plantasStore.getPuntosMuestreo

    // Filtering by Role (Admin vs Operario)
    if (Number(loginStore.userRole) !== 99 && loginStore.userRole !== 'admin') {
      const operarioActual = plantasStore.getOperarios.find(op => op.email?.toLowerCase() === loginStore.userEmail?.toLowerCase())
      if (!operarioActual || !operarioActual.zonas) {
        console.warn('Operario no encontrado o sin zonas asignadas')
        return []
      }
      const zonasIds = operarioActual.zonas.map(zona => typeof zona === 'object' ? zona.id : zona)
      puntos = puntos.filter(punto => punto.activo && zonasIds.includes(punto.zona_fk))
    }

    // Cascading geographical filters
    if (form.infraestructura) {
      puntos = puntos.filter(punto => punto.infraestructura_fk === Number(form.infraestructura))
    } else if (form.zona) {
      // To reliably find points for a zone, find the infrastructures that belong to the zone
      const infrasEnZona = plantasStore.getZonasInfraestructuras
        .filter(zi => zi.zonas_fk === Number(form.zona))
        .map(zi => zi.infraestructuras_fk)
      puntos = puntos.filter(punto => infrasEnZona.includes(punto.infraestructura_fk) || punto.zona_fk === Number(form.zona))
    } else if (form.uo) {
      const zonasDeUo = plantasStore.getZonas.filter(z => z.unidades_operativas_fk === Number(form.uo)).map(z => z.id)
      const infrasDeUo = plantasStore.getZonasInfraestructuras
        .filter(zi => zonasDeUo.includes(zi.zonas_fk))
        .map(zi => zi.infraestructuras_fk)
      puntos = puntos.filter(punto => infrasDeUo.includes(punto.infraestructura_fk) || zonasDeUo.includes(punto.zona_fk))
    }

    return puntos.map(punto => ({ value: punto.id, label: punto.name }))
  })
  

  const operarioPorZona = computed(() => {
    if (!form.uo)
      return plantasStore.getOperarios.map((operario) => {
        return { value: operario.id, label: operario.name }
      })

    return plantasStore.getOperarios
      .filter((operario) => operario.ud_operativa_fk === Number(form.uo))
      .map((operario) => {
        return { value: operario.id, label: operario.name }
      })
  })


  return {
    resetForm,
    form,
    selectUO,
    selectZona,
    selectInfraestructura,
    selectPuntosMuestra,
    operarioPorZona,
    findOperarioByUser,
    operarioLogueado
  }
}
