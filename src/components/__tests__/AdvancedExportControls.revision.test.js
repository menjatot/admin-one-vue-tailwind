import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import * as XLSX from 'xlsx'
import AdvancedExportControls from '../AdvancedExportControls.vue'

const getIncorrectas = vi.hoisted(() => vi.fn())
const writeFileMock = vi.hoisted(() => vi.fn())
const notifyWarning = vi.hoisted(() => vi.fn())

vi.mock('xlsx', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, writeFile: writeFileMock }
})

vi.mock('@/composables/useRevisionIncorrectas', () => ({
  useRevisionIncorrectas: () => ({ getIncorrectas })
}))

vi.mock('@/composables/useNotifications', () => ({
  useNotifications: () => ({ warning: notifyWarning, error: vi.fn(), success: vi.fn() })
}))

vi.mock('@/stores/plantas', () => ({
  usePlantasStore: () => ({
    getPuntosMuestreo: [
      { id: 101, name: 'PM-A', zona_fk: 1 },
      { id: 102, name: 'PM-B', zona_fk: 1 }
    ],
    getZonas: [{ id: 1, name: 'ZA1', com_autonoma_fk: null }],
    getOperarios: []
  })
}))

const fila = (id, puntoFk) => ({
  id,
  fecha: '2026-11-13',
  punto_muestreo_fk: puntoFk,
  personal_fk: 1,
  personal: { name: 'Operario' },
  type: 29,
  cloro: 0,
  ph: 7,
  turbidez: 0.2,
  olor: 1,
  sabor: 1,
  color: 1
})

const ROWS = [fila(1, 101), fila(2, 102), fila(3, 101)]

const mountControls = () =>
  mount(AdvancedExportControls, {
    props: { selectedRows: ROWS, allAnaliticasForDateRange: ROWS }
  })

const boton = (w, texto) =>
  w.findAll('button').find((b) => b.text().trim() === texto)

// Filas de datos del Excel (sin título/subtítulo/vacía ni cabecera)
const filasDatosExcel = (libro) => {
  const filas = XLSX.utils.sheet_to_json(libro.Sheets['Analíticas'], { header: 1 })
  return filas.slice(4)
}

describe('AdvancedExportControls — exclusión de incorrectas en la exportación', () => {
  it('exporta al Excel solo las filas que quedan marcadas en la revisión', async () => {
    writeFileMock.mockClear()
    getIncorrectas.mockResolvedValue([
      { analitica: ROWS[1], motivos: ['Cloro: 0 mg/l [0.2 - 1]'] },
      { analitica: ROWS[2], motivos: ['pH: 9 [6.5 - 8.5]'] }
    ])

    const w = mountControls()
    await boton(w, 'Excel').trigger('click')
    await flushPromises()

    // La revisión deja desmarcar la fila incorrecta
    const check = w.findAll('tbody input[type="checkbox"]')
    expect(check).toHaveLength(2)
    await check[0].setValue(false)
    expect(w.text()).toContain('excluir 1')

    await w.findAll('button').find((b) => b.text().includes('Continuar con')).trigger('click')
    await flushPromises()

    expect(writeFileMock).toHaveBeenCalledTimes(1)
    const libro = writeFileMock.mock.calls[0][0]
    const datos = filasDatosExcel(libro)
    expect(datos).toHaveLength(2)
    expect(datos.map((f) => f[0])).toEqual(['13/11/2026', '13/11/2026'])
    expect(datos.flat()).not.toContain(102) // Pm-B excluida
  })

  it('sin desmarcar nada exporta la selección completa', async () => {
    writeFileMock.mockClear()
    getIncorrectas.mockResolvedValue([])

    const w = mountControls()
    await boton(w, 'Excel').trigger('click')
    await flushPromises()

    const libro = writeFileMock.mock.calls[0][0]
    expect(filasDatosExcel(libro)).toHaveLength(3)
  })

  it('Imprimir: cierra la pestaña "Generando informe..." al abrir la revisión y la reabre al confirmar', async () => {
    const ventanas = []
    const nuevaVentana = () => {
      const win = {
        closed: false,
        document: { open: vi.fn(), write: vi.fn(), close: vi.fn() }
      }
      win.close = vi.fn(() => {
        win.closed = true
      })
      ventanas.push(win)
      return win
    }
    const open = vi.spyOn(window, 'open').mockImplementation(() => nuevaVentana())
    getIncorrectas.mockResolvedValue([
      { analitica: ROWS[1], motivos: ['Cloro: 0 mg/l [0.2 - 1]'] },
      { analitica: ROWS[2], motivos: ['pH: 9 [6.5 - 8.5]'] }
    ])

    const w = mountControls()
    await flushPromises()
    await boton(w, 'Imprimir').trigger('click')
    await flushPromises()

    // La ventana se abre para no perder la activación del click…
    expect(open).toHaveBeenCalledTimes(1)
    // …pero se cierra: el modal está en la pestaña de la app, no en la nueva
    expect(ventanas[0].close).toHaveBeenCalledTimes(1)
    expect(ventanas[0].closed).toBe(true)

    // Al confirmar la revisión se abre otra ventana (síncrona con el click) con el informe
    await w.findAll('button').find((b) => b.text().includes('Continuar con')).trigger('click')
    await flushPromises()

    expect(open).toHaveBeenCalledTimes(2)
    expect(ventanas[1].closed).toBe(false)
    const html = ventanas[1].document.write.mock.calls.at(-1)[0]
    expect(html).toContain('Informe de Analíticas')
    open.mockRestore()
  })

  it('con una sola incorrecta, al desmarcarla se exporta el resto de la selección', async () => {
    writeFileMock.mockClear()
    getIncorrectas.mockResolvedValue([{ analitica: ROWS[1], motivos: ['Cloro: 0 mg/l [0.2 - 1]'] }])

    const w = mountControls()
    await flushPromises()
    await boton(w, 'Excel').trigger('click')
    await flushPromises()

    const checks = w.findAll('tbody input[type="checkbox"]')
    expect(checks).toHaveLength(1)
    await checks[0].setValue(false)

    await w.findAll('button').find((b) => b.text().includes('Continuar con')).trigger('click')
    await flushPromises()

    expect(writeFileMock).toHaveBeenCalledTimes(1)
    const datos = filasDatosExcel(writeFileMock.mock.calls[0][0])
    expect(datos).toHaveLength(2)
    expect(datos.flat()).not.toContain(102)
  })

  it('si se excluyen todas las analíticas no se exporta nada y se avisa', async () => {
    writeFileMock.mockClear()
    notifyWarning.mockClear()
    getIncorrectas.mockResolvedValue(ROWS.map((r) => ({ analitica: r, motivos: ['x'] })))

    const w = mountControls()
    await flushPromises()
    await boton(w, 'Excel').trigger('click')
    await flushPromises()

    await w.find('thead input[type="checkbox"]').setValue(false)
    await w.findAll('button').find((b) => b.text().includes('Continuar con')).trigger('click')
    await flushPromises()

    expect(writeFileMock).not.toHaveBeenCalled()
    expect(notifyWarning).toHaveBeenCalledWith(
      expect.stringContaining('Has excluido todas las analíticas'),
      expect.anything()
    )
  })
})
