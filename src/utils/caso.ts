import { ALERGIA_OTROS } from '../constants'
import type { CasoAnestesico, DatosPaciente, Evento } from '../types'
import type { MarcaTemporal } from '../components/MarcasHitos'

export function textoComplicacion(tipo: string, detalle: string): string {
  return detalle.trim() ? `Complicación: ${tipo}. ${detalle.trim()}` : `Complicación: ${tipo}`
}

export function textoCambio(de: string, a: string, entregaFormal: boolean): string {
  return `Cambio de anestesiólogo: ${de || 'sin definir'} → ${a}. Entrega formal del paciente: ${entregaFormal ? 'sí' : 'no'}`
}

// Texto de las alergias (incluye el campo de texto libre de casos anteriores).
export function textoAlergias(p: DatosPaciente): string {
  const lista = p.alergiasLista.map((a) => (a === ALERGIA_OTROS ? p.alergiasOtros.trim() || ALERGIA_OTROS : a))
  if (p.alergias.trim()) lista.push(p.alergias.trim())
  return lista.join(', ')
}

// Alergia a penicilina marcada, o mencionada en el texto libre de alergias.
export function alergicoPenicilina(p: DatosPaciente): boolean {
  return /penicil/i.test([...p.alergiasLista, p.alergiasOtros, p.alergias].join(' '))
}

export const esCambioAnestesiologo = (e: Evento) => e.cambioAnestesiologo !== undefined

// El anestesiólogo actual es el último que asumió por un cambio, o el inicial si no hubo cambios.
export function anestesiologoActual(c: CasoAnestesico): string {
  const cambios = c.eventos.filter(esCambioAnestesiologo).sort((a, b) => a.hora.localeCompare(b.hora))
  return cambios.length ? (cambios[cambios.length - 1].cambioAnestesiologo?.a ?? '') : c.cirugia.anestesiologo
}

// Marcas para la hoja de signos vitales.
export function marcasCambiosAnestesiologo(eventos: Evento[]): MarcaTemporal[] {
  return eventos
    .filter(esCambioAnestesiologo)
    .map((e) => ({ clave: e.id, corta: `Asume ${e.cambioAnestesiologo?.a}`, hora: e.hora, color: '#334155' }))
}
