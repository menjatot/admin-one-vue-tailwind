import { computed } from 'vue'
import { useLoginStore } from '@/stores/login'

// IDs de roles del sistema (tabla `roles`)
// 1=OPERARIO | 2=GESTOR | 10=VISUALIZADOR | 99=ADMINISTRADOR
export function usePermissions() {
  const loginStore = useLoginStore()

  const role = computed(() => String(loginStore.userRole ?? '').trim())

  const isAdmin        = computed(() => role.value === '99')
  const isVisualizador = computed(() => role.value === '10')
  const isGestor       = computed(() => role.value === '2')
  const isOperario     = computed(() => role.value === '1')

  // Puede escribir analíticas (todos excepto visualizador)
  const canWrite  = computed(() => role.value !== '' && !isVisualizador.value)

  // Puede exportar e imprimir informes (todos excepto operario)
  const canExport = computed(() => role.value !== '' && !isOperario.value)

  // Puede acceder al panel de administración
  const canAdmin  = computed(() => isAdmin.value)

  // Ve todos los datos sin filtro de zona
  const seeAllZones = computed(() => isAdmin.value)

  return {
    isAdmin,
    isVisualizador,
    isGestor,
    isOperario,
    canWrite,
    canExport,
    canAdmin,
    seeAllZones,
  }
}
