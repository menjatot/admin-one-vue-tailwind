import { describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import AnaliticsTableView from '../AnaliticsTableView.vue'

const getIncorrectas = vi.hoisted(() => vi.fn())
const exportXMLData = vi.hoisted(() => vi.fn((rows) => `<xml>${rows.map((r) => r.id).join(',')}</xml>`))
const registrarXmlSinac = vi.hoisted(() => vi.fn().mockResolvedValue({}))
const cargarIncidencias = vi.hoisted(() => vi.fn())

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    isAdmin: ref(true),
    isGestor: ref(false),
    canExport: ref(true),
    isOperario: ref(false),
    isVisualizador: ref(false)
  })
}))

vi.mock('@/composables/useRevisionIncorrectas', () => ({
  useRevisionIncorrectas: () => ({ getIncorrectas })
}))

vi.mock('@/composables/useDashboardIncidencias', () => ({
  useDashboardIncidencias: () => ({
    resumen: { total: 0 },
    sinIncidencias: true,
    cargando: false,
    cargarIncidencias
  })
}))

vi.mock('@/composables/useNotifications', () => ({
  useNotifications: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() })
}))

vi.mock('@/composables/useUploadFormData', () => ({
  default: () => ({ exportXMLData })
}))

vi.mock('@/services/xmlSinac', () => ({ registrarXmlSinac }))

vi.mock('@/stores/login', () => {
  const estado = { userRole: '99', userEmail: 'tecnico@aqlara.com' }
  return { useLoginStore: () => estado, default: () => estado }
})

vi.mock('@/stores/plantas', () => ({
  usePlantasStore: () => ({
    getPuntosMuestreo: [
      { id: 101, name: 'PM-A', zona_fk: 1 },
      { id: 102, name: 'PM-B', zona_fk: 1 }
    ],
    getZonas: [{ id: 1, name: 'ZA1', centro_coste_fk: null }],
    getCentrosCoste: [],
    getOperarios: [{ id: 1, name: 'Operario', email: 'tecnico@aqlara.com' }],
    getInfraestructuras: []
  })
}))

const fila = (id, puntoFk, type = 29) => ({
  id,
  fecha: '2026-11-13',
  punto_muestreo_fk: puntoFk,
  personal_fk: 1,
  personal: { name: 'Operario' },
  type,
  cloro: 0,
  ph: 7,
  turbidez: 0.2,
  olor: 1,
  sabor: 1,
  color: 1
})

const R1 = fila(1, 101)
const R2 = fila(2, 102, 28)
const R3 = fila(3, 101, 99) // Seguimiento: no entra en el XML

const SlotStub = { template: '<div><slot /></div>' }

const TablaStub = defineComponent({
  name: 'AnaliticsTableServerSide',
  data: () => ({ checkedRows: [R1, R2, R3] }),
  methods: {
    abrirEdicionAnalitica: vi.fn(),
    loadAllFilteredData() {
      return Promise.resolve([R1, R2, R3])
    },
    resetForm: vi.fn()
  },
  render() {
    return null
  }
})

const mountView = () =>
  mount(AnaliticsTableView, {
    global: {
      stubs: {
        LayoutAuthenticated: SlotStub,
        AnaliticsTableServerSide: TablaStub
      }
    }
  })

const botonXml = (w) => w.findAll('button').find((b) => b.text().trim() === 'XML')

describe('AnaliticsTableView — XML sin las filas desmarcadas en la revisión', () => {
  it('exporta solo las analíticas que quedan marcadas', async () => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:x')
    globalThis.URL.revokeObjectURL = vi.fn()
    exportXMLData.mockClear()
    registrarXmlSinac.mockClear()
    getIncorrectas.mockResolvedValue([
      { analitica: R1, motivos: ['Cloro: 0 mg/l [0.2 - 1]'] },
      { analitica: R2, motivos: ['Cloro: 0 mg/l [0.2 - 1]'] }
    ])

    const w = mountView()
    // esperar el primer render completo (watch immediate de filtros) antes de pulsar
    await flushPromises()
    await botonXml(w).trigger('click')
    await flushPromises()

    // Se filtra por tipo (R3 fuera) y se muestra la revisión de incorrectas
    const checks = w.findAll('tbody input[type="checkbox"]')
    expect(checks).toHaveLength(2)

    await checks[0].setValue(false) // se excluye R1
    // OJO: el modal de AdvancedExportControls también existe; se filtra por su etiqueta
    await w.findAll('button').find((b) => b.text().includes('a XML')).trigger('click')
    await flushPromises()

    expect(exportXMLData).toHaveBeenCalledTimes(1)
    expect(exportXMLData.mock.calls[0][0].map((r) => r.id)).toEqual([2])
    expect(registrarXmlSinac).toHaveBeenCalledTimes(1)
    expect(registrarXmlSinac.mock.calls[0][0].resumen.num_analiticas).toBe(1)
  })

  it('sin desmarcar nada exporta toda la selección operacional/rutina', async () => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:x')
    globalThis.URL.revokeObjectURL = vi.fn()
    exportXMLData.mockClear()
    registrarXmlSinac.mockClear()
    getIncorrectas.mockResolvedValue([])

    const w = mountView()
    // esperar el primer render completo (watch immediate de filtros) antes de pulsar
    await flushPromises()
    await botonXml(w).trigger('click')
    await flushPromises()

    expect(exportXMLData.mock.calls[0][0].map((r) => r.id)).toEqual([1, 2])
  })

  it('con una sola incorrecta, al desmarcarla se exporta el resto de la selección', async () => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:x')
    globalThis.URL.revokeObjectURL = vi.fn()
    exportXMLData.mockClear()
    registrarXmlSinac.mockClear()
    getIncorrectas.mockResolvedValue([{ analitica: R1, motivos: ['Cloro: 0 mg/l [0.2 - 1]'] }])

    const w = mountView()
    await flushPromises()
    await botonXml(w).trigger('click')
    await flushPromises()

    const checks = w.findAll('tbody input[type="checkbox"]')
    expect(checks).toHaveLength(1)
    await checks[0].setValue(false)

    await w.findAll('button').find((b) => b.text().includes('a XML')).trigger('click')
    await flushPromises()

    expect(exportXMLData).toHaveBeenCalledTimes(1)
    expect(exportXMLData.mock.calls[0][0].map((r) => r.id)).toEqual([2])
    expect(registrarXmlSinac.mock.calls[0][0].resumen.num_analiticas).toBe(1)
  })
})
