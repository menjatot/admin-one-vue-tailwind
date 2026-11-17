import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import RevisionIncorrectasModal from '../RevisionIncorrectasModal.vue'

vi.mock('@/stores/plantas', () => ({
  usePlantasStore: () => ({
    getPuntosMuestreo: [{ id: 101, name: 'PM-FUENTE PLAZA' }],
    getOperarios: [{ id: 7, name: 'Óscar Romero' }]
  })
}))

const item = (id) => ({
  analitica: { id, fecha: '2026-11-13', punto_muestreo_fk: 101, personal_fk: 7, type: 29 },
  motivos: ['Cloro: 0 mg/l [0.2 - 1]']
})

const incorrectas = [item(1), item(2), item(3)]

const mountModal = () =>
  mount(RevisionIncorrectasModal, {
    props: {
      modelValue: true,
      incorrectas,
      exportLabel: 'la exportación a XML'
    }
  })

const filas = (w) => w.findAll('tbody input[type="checkbox"]')
const maestra = (w) => w.find('thead input[type="checkbox"]')
const botonConfirmar = (w) =>
  w.findAll('button').find((b) => b.text().includes('Continuar con'))

describe('RevisionIncorrectasModal — exclusión de filas', () => {
  it('incluye todas por defecto y confirma sin exclusiones', async () => {
    const w = mountModal()
    expect(filas(w)).toHaveLength(3)
    filas(w).forEach((c) => expect(c.element.checked).toBe(true))

    await botonConfirmar(w).trigger('click')
    expect(w.emitted('confirm')[0][0]).toEqual({ excluidas: [] })
  })

  it('desmarcar una fila la envía como excluida', async () => {
    const w = mountModal()
    await filas(w)[1].setValue(false)

    expect(filas(w)[1].element.checked).toBe(false)
    expect(w.text()).toContain('excluir 1')
    expect(w.text()).toContain('Se excluye')

    await botonConfirmar(w).trigger('click')
    expect(w.emitted('confirm')[0][0]).toEqual({ excluidas: [2] })
  })

  it('la casilla de cabecera excluye todas y aun así se puede continuar', async () => {
    const w = mountModal()
    await maestra(w).setValue(false)

    filas(w).forEach((c) => expect(c.element.checked).toBe(false))
    expect(w.text()).toContain('Ninguna de las 3 se incluirá en el fichero')
    expect(botonConfirmar(w).attributes('disabled')).toBeUndefined()

    await botonConfirmar(w).trigger('click')
    expect(w.emitted('confirm')[0][0]).toEqual({ excluidas: [1, 2, 3] })
  })

  it('marca intermedia: desmarcar una deja la maestra en estado parcial y se puede volver a marcar todas', async () => {
    const w = mountModal()
    await filas(w)[2].setValue(false)

    expect(maestra(w).element.checked).toBe(false)
    expect(maestra(w).element.indeterminate).toBe(true)
    expect(w.text()).toContain('excluir 1')

    await maestra(w).setValue(true)
    filas(w).forEach((c) => expect(c.element.checked).toBe(true))
    expect(w.text()).toContain('Se incluirán las 3 analíticas.')
  })

  it('con una sola incorrecta, desmarcarla deja continuar excluyéndola', async () => {
    const w = mount(
      RevisionIncorrectasModal,
      {
        props: {
          modelValue: true,
          incorrectas: [item(7)],
          exportLabel: 'la exportación a XML'
        }
      }
    )
    await filas(w)[0].setValue(false)
    expect(botonConfirmar(w).attributes('disabled')).toBeUndefined()

    await botonConfirmar(w).trigger('click')
    expect(w.emitted('confirm')[0][0]).toEqual({ excluidas: [7] })
  })

  it('al cerrar y reabrir vuelve a incluir todo', async () => {
    const w = mountModal()
    await filas(w)[0].setValue(false)
    await botonConfirmar(w).trigger('click')
    expect(w.emitted('confirm')[0][0]).toEqual({ excluidas: [1] })

    await w.setProps({ modelValue: false })
    await w.setProps({ modelValue: true })

    expect(filas(w)[0].element.checked).toBe(true)
    await botonConfirmar(w).trigger('click')
    expect(w.emitted('confirm')[1][0]).toEqual({ excluidas: [] })
  })
})
