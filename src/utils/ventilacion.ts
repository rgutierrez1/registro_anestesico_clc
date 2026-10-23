import { TIPOS_VENTILACION, VENTILACION_ESPONTANEA, VENTILACION_POR_DEFECTO } from '../constants'
import type { CasoAnestesico, DatosPaciente, RegistroVentilacion } from '../types'
import { pesoIdeal } from './dosis'

export type ClaveVentilacion = 'tipo' | 'vt' | 'fr' | 'peep' | 'fio2'

export const CAMPOS_VENTILACION: { clave: ClaveVentilacion; etiqueta: string; unidad: string }[] = [
  { clave: 'tipo', etiqueta: 'Ventilación', unidad: '' },
  { clave: 'vt', etiqueta: 'Vt (mL)', unidad: 'mL' },
  { clave: 'fr', etiqueta: 'FR (rpm)', unidad: 'rpm' },
  { clave: 'peep', etiqueta: 'PEEP (cmH2O)', unidad: 'cmH2O' },
  { clave: 'fio2', etiqueta: 'FiO2 (%)', unidad: '%' },
]

const LIMITES: Record<'vt' | 'fr' | 'peep' | 'fio2', [number, number]> = {
  vt: [0, 2000],
  fr: [0, 100],
  peep: [0, 40],
  fio2: [21, 100],
}

export type ValoresVentilacion = Pick<RegistroVentilacion, 'tipo' | 'vt' | 'fr' | 'peep' | 'fio2'>

export function vtPorDefecto(p: DatosPaciente): number | null {
  const ideal = pesoIdeal(p)
  // Se redondea a la decena más cercana (p. ej. 303 → 300).
  return ideal === null || ideal <= 0 ? null : Math.round((ideal * VENTILACION_POR_DEFECTO.vtMlPorKg) / 10) * 10
}

const porHora = (a: RegistroVentilacion, b: RegistroVentilacion) => a.hora.localeCompare(b.hora)

// Valores con los que se abre el formulario: el último registro, o los valores de partida.
export function valoresIniciales(c: CasoAnestesico): ValoresVentilacion {
  const ultimo = [...c.ventilacion].sort(porHora).pop()
  if (!ultimo) return valoresDePartida(c.paciente)
  // Tras una ventilación espontánea, al pasar a otro modo se ofrecen los valores de partida.
  if (ultimo.tipo === VENTILACION_ESPONTANEA) return { ...valoresDePartida(c.paciente), fio2: ultimo.fio2 }
  return { tipo: ultimo.tipo, vt: ultimo.vt, fr: ultimo.fr, peep: ultimo.peep, fio2: ultimo.fio2 }
}

// El tipo de partida es espontánea; Vt, FR y PEEP quedan prellenados por si se cambia a ventilación mecánica.
export function valoresDePartida(p: DatosPaciente): ValoresVentilacion {
  return { tipo: VENTILACION_ESPONTANEA, vt: vtPorDefecto(p), fr: VENTILACION_POR_DEFECTO.fr, peep: VENTILACION_POR_DEFECTO.peep, fio2: VENTILACION_POR_DEFECTO.fio2 }
}

export function errorVentilacion(r: RegistroVentilacion): string | null {
  if (Number.isNaN(Date.parse(r.hora))) return 'Hora inválida.'
  if (Date.parse(r.hora) > Date.now() + 60000) return 'La hora no puede ser posterior a la hora actual.'
  for (const clave of ['vt', 'fr', 'peep', 'fio2'] as const) {
    const v = r[clave]
    if (v === null) continue
    const [min, max] = LIMITES[clave]
    if (!Number.isFinite(v) || v < min || v > max) {
      const campo = CAMPOS_VENTILACION.find((x) => x.clave === clave)
      return `${campo?.etiqueta}: debe estar entre ${min} y ${max}.`
    }
  }
  return null
}

export function textoValor(r: RegistroVentilacion, clave: ClaveVentilacion): string {
  const v = r[clave]
  return v === null ? '–' : String(v).replace('.', ',')
}

export function resumenVentilacion(r: RegistroVentilacion): string {
  if (r.tipo === VENTILACION_ESPONTANEA) return `${r.tipo} · FiO2 ${textoValor(r, 'fio2')} %`
  return `${r.tipo} · Vt ${textoValor(r, 'vt')} mL · FR ${textoValor(r, 'fr')} · PEEP ${textoValor(r, 'peep')} · FiO2 ${textoValor(r, 'fio2')} %`
}

export interface SegmentoVentilacion {
  texto: string
  desde: number
  hasta: number
}

// Tramos de un parámetro: un valor nuevo abre un tramo y se rellena con >>>> hasta el siguiente cambio.
export function segmentosVentilacion(registros: RegistroVentilacion[], clave: ClaveVentilacion, hasta: number): SegmentoVentilacion[] {
  const segmentos: SegmentoVentilacion[] = []
  let anterior: string | null = null
  for (const r of [...registros].sort(porHora)) {
    const texto = textoValor(r, clave)
    if (texto === anterior) continue
    const t = Date.parse(r.hora)
    if (segmentos.length) segmentos[segmentos.length - 1].hasta = t
    segmentos.push({ texto: clave === 'tipo' ? tipoCorto(r) : texto, desde: t, hasta: Math.max(hasta, t) })
    anterior = texto
  }
  return segmentos
}

function tipoCorto(r: RegistroVentilacion): string {
  return TIPOS_VENTILACION.find((t) => t.id === r.tipo)?.corta ?? r.tipo
}

export function agregarVentilacion(c: CasoAnestesico, r: RegistroVentilacion): Partial<CasoAnestesico> {
  if (errorVentilacion(r) !== null) return {}
  return { ventilacion: [...c.ventilacion, r] }
}

export function editarVentilacion(c: CasoAnestesico, r: RegistroVentilacion): Partial<CasoAnestesico> {
  if (errorVentilacion(r) !== null) return {}
  return { ventilacion: c.ventilacion.map((x) => (x.id === r.id ? r : x)) }
}

export function eliminarVentilacion(c: CasoAnestesico, id: string): Partial<CasoAnestesico> {
  return { ventilacion: c.ventilacion.filter((x) => x.id !== id) }
}
