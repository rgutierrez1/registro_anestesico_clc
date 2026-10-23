import { DEF_FLAGS, POSICION_INICIAL, POSICIONES } from '../constants'
import type { CasoAnestesico, Posicion, TimeFlag, TipoFlag } from '../types'
import type { MarcaTemporal } from '../components/MarcasHitos'

type Pareja = 'isquemia' | 'VMP' | 'CEC'

const PAREJAS: { base: Pareja; inicio: TipoFlag; fin: TipoFlag; nombre: string }[] = [
  { base: 'isquemia', inicio: 'inicioIsquemia', fin: 'finIsquemia', nombre: 'isquemia' },
  { base: 'VMP', inicio: 'inicioVMP', fin: 'finVMP', nombre: 'ventilación monopulmonar' },
  { base: 'CEC', inicio: 'inicioCEC', fin: 'finCEC', nombre: 'CEC' },
]

const porHora = (a: TimeFlag, b: TimeFlag) => a.hora.localeCompare(b.hora)

export function defFlag(tipo: TipoFlag) {
  return DEF_FLAGS.find((d) => d.tipo === tipo)!
}

export function cortaPosicion(p: Posicion): string {
  return POSICIONES.find((x) => x.id === p)?.corta ?? p
}

export function posicionEn(flags: TimeFlag[], tMs: number): Posicion {
  const previos = flags.filter((f) => f.tipo === 'posicion' && f.posicion && Date.parse(f.hora) <= tMs).sort(porHora)
  return previos.length ? (previos[previos.length - 1].posicion as Posicion) : POSICION_INICIAL
}

export interface SegmentoPosicion {
  posicion: Posicion
  desde: number
  hasta: number
}

// Tramos de posición entre `desde` y `hasta`; todos parten en supino salvo que ya haya un cambio anterior.
export function segmentosPosicion(flags: TimeFlag[], desde: number, hasta: number): SegmentoPosicion[] {
  const cambios = flags
    .filter((f) => f.tipo === 'posicion' && f.posicion && Date.parse(f.hora) > desde && Date.parse(f.hora) <= hasta)
    .sort(porHora)
  const segmentos: SegmentoPosicion[] = []
  let inicio = desde
  let actual = posicionEn(flags, desde)
  for (const c of cambios) {
    const t = Date.parse(c.hora)
    segmentos.push({ posicion: actual, desde: inicio, hasta: t })
    inicio = t
    actual = c.posicion as Posicion
  }
  segmentos.push({ posicion: actual, desde: inicio, hasta })
  return segmentos
}

function abierto(flags: TimeFlag[], pareja: (typeof PAREJAS)[number], tMs: number): boolean {
  const previos = flags
    .filter((f) => (f.tipo === pareja.inicio || f.tipo === pareja.fin) && Date.parse(f.hora) <= tMs)
    .sort(porHora)
  return previos.length > 0 && previos[previos.length - 1].tipo === pareja.inicio
}

export function errorFlag(flags: TimeFlag[], nuevo: TimeFlag): string | null {
  const t = Date.parse(nuevo.hora)
  if (Number.isNaN(t)) return 'Hora inválida.'
  if (t > Date.now() + 60000) return 'La hora no puede ser posterior a la hora actual.'
  const pareja = PAREJAS.find((p) => p.inicio === nuevo.tipo || p.fin === nuevo.tipo)
  if (pareja) {
    const abiertoAhora = abierto(flags, pareja, t)
    if (nuevo.tipo === pareja.inicio && abiertoAhora) return `Ya hay un inicio de ${pareja.nombre} sin su fin.`
    if (nuevo.tipo === pareja.fin && !abiertoAhora) return `No hay un inicio de ${pareja.nombre} abierto para cerrar.`
  }
  if (nuevo.tipo === 'inicioIsquemia' && !(nuevo.presionMmHg !== null && nuevo.presionMmHg >= 50 && nuevo.presionMmHg <= 600)) {
    return 'Indicá la presión de isquemia (entre 50 y 600 mmHg).'
  }
  if (nuevo.tipo === 'posicion') {
    if (!nuevo.posicion) return 'Elegí la nueva posición.'
    if (posicionEn(flags, t) === nuevo.posicion) return `El paciente ya está en posición ${nuevo.posicion}.`
  }
  return null
}

export function agregarFlag(c: CasoAnestesico, flag: TimeFlag): Partial<CasoAnestesico> {
  if (errorFlag(c.timeFlags, flag) !== null) return {}
  return { timeFlags: [...c.timeFlags, flag] }
}

export function eliminarFlag(c: CasoAnestesico, id: string): Partial<CasoAnestesico> {
  return { timeFlags: c.timeFlags.filter((f) => f.id !== id) }
}

export function etiquetaFlag(f: TimeFlag): string {
  const base = defFlag(f.tipo).etiqueta
  if (f.tipo === 'inicioIsquemia' && f.presionMmHg !== null) return `${base} (${f.presionMmHg} mmHg)`
  if (f.tipo === 'posicion' && f.posicion) return `${base}: ${f.posicion}`
  return base
}

// Etiqueta corta para el gráfico.
export function cortaFlag(f: TimeFlag): string {
  if (f.tipo === 'inicioIsquemia' && f.presionMmHg !== null) return `Inicio isquemia ${f.presionMmHg} mmHg`
  if (f.tipo === 'posicion' && f.posicion) return `Pos: ${cortaPosicion(f.posicion)}`
  return defFlag(f.tipo).corta
}

export function marcasFlags(flags: TimeFlag[]): MarcaTemporal[] {
  return flags.map((f) => ({ clave: f.id, corta: cortaFlag(f), hora: f.hora, color: defFlag(f.tipo).color }))
}

// Duración (en minutos) de cada fin de isquemia / VMP / CEC y de los que siguen abiertos.
export function duracionesFlags(flags: TimeFlag[], ahora: number): Map<string, { minutos: number; abierto: boolean }> {
  const resultado = new Map<string, { minutos: number; abierto: boolean }>()
  for (const p of PAREJAS) {
    let inicio: TimeFlag | null = null
    for (const f of flags.filter((x) => x.tipo === p.inicio || x.tipo === p.fin).sort(porHora)) {
      if (f.tipo === p.inicio) inicio = f
      else if (inicio) {
        resultado.set(f.id, { minutos: Math.round((Date.parse(f.hora) - Date.parse(inicio.hora)) / 60000), abierto: false })
        inicio = null
      }
    }
    if (inicio) {
      resultado.set(inicio.id, { minutos: Math.max(0, Math.round((ahora - Date.parse(inicio.hora)) / 60000)), abierto: true })
    }
  }
  return resultado
}
