import { describe, expect, it, vi } from 'vitest'

// Mock del store de login: usePermissions solo lee `userRole`.
const { estado } = vi.hoisted(() => ({ estado: { userRole: '99' } }))

vi.mock('@/stores/login', () => ({
  useLoginStore: () => estado,
  default: () => estado
}))

import { usePermissions } from '../usePermissions'

// IDs de roles: 1=OPERARIO | 2=GESTOR | 10=VISUALIZADOR | 99=ADMINISTRADOR

describe('usePermissions', () => {
  it('administrador (99): escribe, exporta, administra y ve todas las zonas', () => {
    estado.userRole = '99'
    const p = usePermissions()
    expect(p.isAdmin.value).toBe(true)
    expect(p.canWrite.value).toBe(true)
    expect(p.canExport.value).toBe(true)
    expect(p.canAdmin.value).toBe(true)
    expect(p.seeAllZones.value).toBe(true)
  })

  it('gestor (2, también como número): escribe y exporta, no administra', () => {
    estado.userRole = 2
    const p = usePermissions()
    expect(p.isGestor.value).toBe(true)
    expect(p.canWrite.value).toBe(true)
    expect(p.canExport.value).toBe(true)
    expect(p.canAdmin.value).toBe(false)
    expect(p.seeAllZones.value).toBe(false)
  })

  it('operario (1): escribe pero no exporta (XML/informes)', () => {
    estado.userRole = '1'
    const p = usePermissions()
    expect(p.isOperario.value).toBe(true)
    expect(p.canWrite.value).toBe(true)
    expect(p.canExport.value).toBe(false)
  })

  it('visualizador (10): no escribe, sí exporta', () => {
    estado.userRole = '10'
    const p = usePermissions()
    expect(p.isVisualizador.value).toBe(true)
    expect(p.canWrite.value).toBe(false)
    expect(p.canExport.value).toBe(true)
  })

  it('sin rol: sin permisos de escritura ni exportación', () => {
    estado.userRole = ''
    const p = usePermissions()
    expect(p.canWrite.value).toBe(false)
    expect(p.canExport.value).toBe(false)
    expect(p.canAdmin.value).toBe(false)
  })
})
