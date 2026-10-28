// Coherencia entre la cascada del formulario de analítica (zona → infraestructura
// → punto) y el punto de muestreo realmente seleccionado.
//
// El punto es el dato real: la analítica se guarda contra él, así que su
// infraestructura manda sobre cualquier selección previa del desplegable. Los
// fallos de este tipo (opciones de tipo calculadas con una infraestructura que
// ya no era la del punto) han aparecido varias veces; esta es la parte pura y
// testeable de esa regla.

/** Convierte a número los ids que llegan como texto (selects, Supabase). */
export const idNumerico = (valor) => {
  if (valor === null || valor === undefined || valor === '') return null
  const n = Number(valor)
  return Number.isNaN(n) ? null : n
}

/** Infraestructura del punto de muestreo, o null si no tiene. */
export const infraIdDePunto = (punto) => idNumerico(punto?.infraestructura_fk)

/**
 * ¿El punto seleccionado sigue encajando en la cascada del formulario?
 *
 * - Sin punto, no hay nada que comprobar (true).
 * - Con zona elegida, el punto debe ser de esa zona.
 * - Con infraestructura elegida, debe ser de esa infraestructura.
 * - Sin infraestructura elegida, un punto que sí tiene infraestructura ya no
 *   encaja (el listado de puntos se filtra por infraestructura).
 */
export function puntoEncajaEnCascada(punto, { zona, infraestructura } = {}) {
  if (!punto) return true

  const zonaNum = idNumerico(zona)
  if (zonaNum !== null && idNumerico(punto?.zona_fk) !== zonaNum) return false

  const infraNum = idNumerico(infraestructura)
  const infraPunto = infraIdDePunto(punto)
  if (infraNum !== null) return infraPunto === infraNum
  return infraPunto === null
}
