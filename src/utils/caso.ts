import { ALERGIA_OTROS } from '../constants'
import type { CasoAnestesico, DatosPaciente } from '../types'

// Texto de las alergias (incluye el campo de texto libre de casos anteriores).
export function textoAlergias(p: DatosPaciente): string {
  const lista = p.alergiasLista.map((a) => (a === ALERGIA_OTROS ? p.alergiasOtros.trim() || ALERGIA_OTROS : a))
  if (p.alergias.trim()) lista.push(p.alergias.trim())
  return lista.join(', ')
}

// El anestesiólogo actual es el último que asumió por un cambio, o el inicial si no hubo cambios.
export function anestesiologoActual(c: CasoAnestesico): string {
  const cambios = c.eventos.filter((e) => e.cambioAnestesiologo).sort((a, b) => a.hora.localeCompare(b.hora))
  return cambios.length ? (cambios[cambios.length - 1].cambioAnestesiologo?.a ?? '') : c.cirugia.anestesiologo
}
