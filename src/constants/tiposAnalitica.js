// Tipos de analítica y reglas por tipo de infraestructura del punto de muestreo.
//
// Tipos de infraestructura (tabla tipo_infraestructura):
//   1 Captación · 2 Depósito de Distribución · 3 Tratamiento ·
//   4 Red de Distribución · 5 Depósito de Cabecera
//
// Reglas de negocio:
//   · Captación (1): solo Seguimiento.
//   · Depósitos (distribución 2 y cabecera 5): solo Operacional y Seguimiento.
//   · Red de distribución (4): solo Rutina y Seguimiento.
//   · Resto (tratamiento 3): sin restricción.
export const TIPOS_ANALITICA = {
  29: 'Rutina',
  28: 'Operacional',
  99: 'Seguimiento'
}

export function tiposAnaliticaPermitidos(tipoInfra) {
  switch (Number(tipoInfra)) {
    case 1: // Captación
      return { 99: 'Seguimiento' }
    case 2: // Depósito de Distribución
    case 5: // Depósito de Cabecera
      return { 28: 'Operacional', 99: 'Seguimiento' }
    case 4: // Red de Distribución
      return { 29: 'Rutina', 99: 'Seguimiento' }
    default:
      return { ...TIPOS_ANALITICA }
  }
}
