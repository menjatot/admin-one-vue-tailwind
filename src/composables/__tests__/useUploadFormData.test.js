import { describe, it, expect } from 'vitest'
import useExtractdata from '@/composables/useUploadFormData'

const { exportXMLData } = useExtractdata()

describe('exportXMLData', () => {
  it('genera XML con cabecera correcta', () => {
    const xml = exportXMLData([])
    expect(xml).toContain('<?xml version="1.0"')
    expect(xml).toContain('<BOLETINES_GENERAL')
    expect(xml).toContain('</BOLETINES_GENERAL>')
  })

  it('incluye cloro (COD_PARAMETRO 045) cuando tiene valor', () => {
    const analiticas = [
      {
        id: 1,
        fecha: '2025-01-15',
        type: 29,
        punto_muestreo_fk: 42,
        cloro: 0.8,
        ph: null,
        turbidez: null,
        color: null,
        olor: null,
        sabor: null
      }
    ]
    const xml = exportXMLData(analiticas)
    expect(xml).toContain('<COD_PARAMETRO>045</COD_PARAMETRO>')
    expect(xml).toContain('<VALOR_CUANTIF>0.8</VALOR_CUANTIF>')
  })

  it('incluye pH (COD_PARAMETRO 051) cuando tiene valor', () => {
    const analiticas = [
      {
        id: 1,
        fecha: '2025-01-15',
        type: 29,
        punto_muestreo_fk: 42,
        cloro: null,
        ph: 7.2,
        turbidez: null,
        color: null,
        olor: null,
        sabor: null
      }
    ]
    const xml = exportXMLData(analiticas)
    expect(xml).toContain('<COD_PARAMETRO>051</COD_PARAMETRO>')
    expect(xml).toContain('<VALOR_CUANTIF>7.2</VALOR_CUANTIF>')
  })

  it('incluye turbidez (COD_PARAMETRO 054) cuando tiene valor', () => {
    const analiticas = [
      {
        id: 1,
        fecha: '2025-01-15',
        type: 29,
        punto_muestreo_fk: 42,
        cloro: null,
        ph: null,
        turbidez: 0.5,
        color: null,
        olor: null,
        sabor: null
      }
    ]
    const xml = exportXMLData(analiticas)
    expect(xml).toContain('<COD_PARAMETRO>054</COD_PARAMETRO>')
    expect(xml).toContain('<VALOR_CUANTIF>0.5</VALOR_CUANTIF>')
  })

  it('incluye cloro_combinado (COD_PARAMETRO 044) cuando tiene valor', () => {
    const analiticas = [
      {
        id: 1,
        fecha: '2025-01-15',
        type: 29,
        punto_muestreo_fk: 42,
        cloro: null,
        ph: null,
        turbidez: null,
        color: null,
        olor: null,
        sabor: null,
        cloro_combinado: 0.3
      }
    ]
    const xml = exportXMLData(analiticas)
    expect(xml).toContain('<COD_PARAMETRO>044</COD_PARAMETRO>')
    expect(xml).toContain('<VALOR_CUANTIF>0.3</VALOR_CUANTIF>')
  })

  it('NO incluye cloro_total en el XML', () => {
    const analiticas = [
      {
        id: 1,
        fecha: '2025-01-15',
        type: 29,
        punto_muestreo_fk: 42,
        cloro: null,
        ph: null,
        turbidez: null,
        color: null,
        olor: null,
        sabor: null,
        cloro_total: 1.5
      }
    ]
    const xml = exportXMLData(analiticas)
    expect(xml).not.toContain('cloro_total')
    expect(xml).not.toContain('<COD_PARAMETRO>046</COD_PARAMETRO>')
  })

  it('incluye organolépticos solo en tipo 29', () => {
    const analiticas = [
      {
        id: 1,
        fecha: '2025-01-15',
        type: 29,
        punto_muestreo_fk: 42,
        cloro: null,
        ph: null,
        turbidez: null,
        color: 1,
        olor: 1,
        sabor: 1
      }
    ]
    const xml = exportXMLData(analiticas)
    expect(xml).toContain('<COD_PARAMETRO>056</COD_PARAMETRO>')
    expect(xml).toContain('<COD_PARAMETRO>057</COD_PARAMETRO>')
    expect(xml).toContain('<COD_PARAMETRO>058</COD_PARAMETRO>')
  })

  it('NO incluye organolépticos en tipo 28', () => {
    const analiticas = [
      {
        id: 1,
        fecha: '2025-01-15',
        type: 28,
        punto_muestreo_fk: 42,
        cloro: null,
        ph: null,
        turbidez: null,
        color: 1,
        olor: 1,
        sabor: 1
      }
    ]
    const xml = exportXMLData(analiticas)
    expect(xml).not.toContain('<COD_PARAMETRO>056</COD_PARAMETRO>')
    expect(xml).not.toContain('<COD_PARAMETRO>057</COD_PARAMETRO>')
    expect(xml).not.toContain('<COD_PARAMETRO>058</COD_PARAMETRO>')
  })

  it('no incluye determinación si el valor es null', () => {
    const analiticas = [
      {
        id: 1,
        fecha: '2025-01-15',
        type: 29,
        punto_muestreo_fk: 42,
        cloro: null,
        ph: null,
        turbidez: null,
        color: null,
        olor: null,
        sabor: null,
        cloro_combinado: null,
        cloro_total: null
      }
    ]
    const xml = exportXMLData(analiticas)
    expect(xml).toContain('<DETERMINACIONES>')
    expect(xml).toContain('</DETERMINACIONES>')
    expect(xml).not.toContain('<COD_PARAMETRO>')
  })

  it('incluye tipo de análisis y punto de muestreo', () => {
    const analiticas = [
      {
        id: 1,
        fecha: '2025-01-15',
        type: 99,
        punto_muestreo_fk: 7,
        cloro: null,
        ph: null,
        turbidez: null,
        color: null,
        olor: null,
        sabor: null
      }
    ]
    const xml = exportXMLData(analiticas)
    expect(xml).toContain('<ID_TIPO_ANALISIS>99</ID_TIPO_ANALISIS>')
    expect(xml).toContain('<ID_PM>7</ID_PM>')
  })
})
