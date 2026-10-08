/**
 * Normaliza un valor de formulario a número o null.
 *
 * El 0 es una medición válida (p. ej. cloro libre 0 mg/l) y debe guardarse como 0;
 * solo un campo vacío ('' / null / undefined) o un valor no numérico se convierte en null.
 */
export function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * Construye el payload de una analítica para Supabase.
 *
 * `form` es el formulario reactivo; `cloroCombinado` y `totalizador` son valores
 * ya calculados/auxiliares que viven fuera del objeto `form`.
 */
export function buildAnaliticaPayload(
  form,
  { esCataluna = false, esDeposito = false, cloroCombinado = null, totalizador = '' } = {}
) {
  return {
    punto_muestreo_fk: form.punto_muestreo_fk,
    fecha: form.fecha,
    color: toNumberOrNull(form.color),
    olor: form.olor,
    sabor: form.sabor,
    cloro: toNumberOrNull(form.cloro),
    type: form.type,
    observaciones: form.observaciones,
    personal_fk: form.operario,
    ph: toNumberOrNull(form.ph),
    turbidez: toNumberOrNull(form.turbidez),
    cloro_total: esCataluna ? toNumberOrNull(form.cloro_total) : null,
    cloro_combinado: esCataluna ? toNumberOrNull(cloroCombinado) : null,
    totalizador: esDeposito ? toNumberOrNull(totalizador) : null
  }
}
