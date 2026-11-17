/**
 * Exclusión de analíticas desde la revisión previa a exportar (XML / PDF / Excel).
 *
 * El modal de revisión deja desmarcar filas para que esas analíticas no entren en
 * el fichero exportado, aunque sigan marcadas en el listado. La selección del
 * listado (checkedRows) NO se toca: la exclusión vive solo en la exportación.
 */

/**
 * Devuelve las analíticas que NO están en `excluidas` (lista de ids).
 * Sin exclusiones devuelve una copia de la lista original.
 */
export function filtrarExcluidas(analiticas, excluidas) {
  const lista = analiticas || []
  const ids = new Set((excluidas || []).filter((id) => id != null))
  if (ids.size === 0) return [...lista]
  return lista.filter((a) => !ids.has(a?.id))
}

/**
 * Ids de las filas de la revisión que el usuario ha dejado desmarcadas.
 * `desmarcadas` puede ser un Set o un array de ids.
 */
export function idsExcluidas(incorrectas, desmarcadas) {
  const set = desmarcadas instanceof Set ? desmarcadas : new Set(desmarcadas || [])
  if (set.size === 0) return []
  return (incorrectas || [])
    .map((item) => item?.analitica?.id)
    .filter((id) => id != null && set.has(id))
}
