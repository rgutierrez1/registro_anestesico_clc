import type { CasoAnestesico } from '../types'

export type ClaveHito = 'inicioAnestesia' | 'inicioCirugia' | 'finCirugia' | 'finAnestesia'

type CampoHito = 'horaInicioAnestesia' | 'horaInicioCirugia' | 'horaFinCirugia' | 'horaFinAnestesia'

export type TiemposHitos = Pick<CasoAnestesico, CampoHito>

export interface DefHito {
  clave: ClaveHito
  etiqueta: string
  corta: string
  color: string
  campo: CampoHito
}

export interface Hito {
  clave: ClaveHito
  etiqueta: string
  corta: string
  color: string
  hora: string
}

// El orden de esta lista es el orden cronológico obligatorio de los hitos.
export const HITOS: DefHito[] = [
  { clave: 'inicioAnestesia', etiqueta: 'Inicio de anestesia', corta: 'Inicio anestesia', color: '#4f46e5', campo: 'horaInicioAnestesia' },
  { clave: 'inicioCirugia', etiqueta: 'Inicio de cirugía', corta: 'Inicio cirugía', color: '#a21caf', campo: 'horaInicioCirugia' },
  { clave: 'finCirugia', etiqueta: 'Fin de cirugía', corta: 'Fin cirugía', color: '#a21caf', campo: 'horaFinCirugia' },
  { clave: 'finAnestesia', etiqueta: 'Fin de anestesia', corta: 'Fin anestesia', color: '#4f46e5', campo: 'horaFinAnestesia' },
]

export function hitosDelCaso(c: TiemposHitos): Hito[] {
  return HITOS.flatMap((d) => {
    const hora = c[d.campo]
    return hora ? [{ clave: d.clave, etiqueta: d.etiqueta, corta: d.corta, color: d.color, hora }] : []
  })
}

export function limitesHito(c: TiemposHitos, clave: ClaveHito): { min: number | null; max: number | null } {
  const i = HITOS.findIndex((h) => h.clave === clave)
  const tiempos = (defs: DefHito[]) => defs.flatMap((h) => (c[h.campo] ? [Date.parse(c[h.campo] as string)] : []))
  const antes = tiempos(HITOS.slice(0, i))
  const despues = tiempos(HITOS.slice(i + 1))
  return {
    min: antes.length ? Math.max(...antes) : null,
    max: despues.length ? Math.min(...despues) : null,
  }
}

export function errorHito(c: TiemposHitos, clave: ClaveHito, iso: string): string | null {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return 'Hora inválida.'
  if (t > Date.now() + 60000) return 'La hora no puede ser posterior a la hora actual.'
  if (clave === 'inicioCirugia' && !c.horaInicioAnestesia) return 'Registrá primero el inicio de anestesia.'
  if (clave === 'finCirugia' && !c.horaInicioCirugia) return 'Registrá primero el inicio de cirugía.'
  const { min, max } = limitesHito(c, clave)
  const fmt = (ms: number) => new Date(ms).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  if (min !== null && t < min) return `No puede ser anterior a las ${fmt(min)} (hito previo).`
  if (max !== null && t > max) return `No puede ser posterior a las ${fmt(max)} (hito siguiente).`
  return null
}

export function cambiarHito(c: CasoAnestesico, clave: ClaveHito, iso: string | null): Partial<CasoAnestesico> {
  const def = HITOS.find((h) => h.clave === clave)
  if (!def) return {}
  if (iso !== null && errorHito(c, clave, iso) !== null) return {}
  const cambios: Partial<CasoAnestesico> = { [def.campo]: iso }
  if (clave === 'inicioAnestesia' && iso !== null && c.estado === 'planificado') cambios.estado = 'en_curso'
  return cambios
}

export function duracionMinutos(desde: string | null, hasta: string | null): number | null {
  if (!desde || !hasta) return null
  return Math.max(0, Math.round((Date.parse(hasta) - Date.parse(desde)) / 60000))
}
