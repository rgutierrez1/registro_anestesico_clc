import type { CasoAnestesico, RegistroVital, ValoresVitales } from '../types'
import { cambiarHito, errorHito } from './hitos'
import { horaPersonalizadaIso } from './tiempo'

export const PASO_VITALES_MS = 5 * 60000

export type ClaveVital = 'pas' | 'pad' | 'fc' | 'etco2' | 'spo2' | 'temp'

export const CAMPOS_VITALES: {
  clave: ClaveVital
  etiqueta: string
  unidad: string
  min: number
  max: number
  paso: number
}[] = [
  { clave: 'pas', etiqueta: 'PAS', unidad: 'mmHg', min: 20, max: 300, paso: 1 },
  { clave: 'pad', etiqueta: 'PAD', unidad: 'mmHg', min: 10, max: 200, paso: 1 },
  { clave: 'fc', etiqueta: 'FC', unidad: 'lpm', min: 10, max: 250, paso: 1 },
  { clave: 'etco2', etiqueta: 'EtCO2', unidad: 'mmHg', min: 0, max: 100, paso: 1 },
  { clave: 'spo2', etiqueta: 'SpO2', unidad: '%', min: 0, max: 100, paso: 1 },
  { clave: 'temp', etiqueta: 'Temp', unidad: '°C', min: 25, max: 43, paso: 0.1 },
]

export const PREFIJO_AUTO = 'auto:'

export function formatTemp(t: number | null): string {
  return t === null ? '–' : String(t).replace('.', ',')
}

export function esCopia(r: RegistroVital): boolean {
  return r.id.startsWith(PREFIJO_AUTO)
}

export function calcularPam(pas: number | null, pad: number | null): number | null {
  return pas !== null && pad !== null ? Math.round((pas + 2 * pad) / 3) : null
}

export function valoresDe(r: ValoresVitales): ValoresVitales {
  return { pas: r.pas, pad: r.pad, pam: r.pam, fc: r.fc, etco2: r.etco2, spo2: r.spo2, temp: r.temp ?? null }
}

export function conPam(v: Omit<ValoresVitales, 'pam'>): ValoresVitales {
  return { ...v, pam: calcularPam(v.pas, v.pad) }
}

export function valoresIguales(a: ValoresVitales, b: ValoresVitales): boolean {
  return CAMPOS_VITALES.every((c) => a[c.clave] === b[c.clave])
}

export function validarValores(v: ValoresVitales): string | null {
  if (CAMPOS_VITALES.every((c) => v[c.clave] === null)) return 'Cargá al menos un valor.'
  for (const c of CAMPOS_VITALES) {
    const x = v[c.clave]
    if (x !== null && (x < c.min || x > c.max)) return `${c.etiqueta} debe estar entre ${c.min} y ${c.max} ${c.unidad}.`
  }
  if (v.pas !== null && v.pad !== null && v.pad >= v.pas) return 'La PAD debe ser menor que la PAS.'
  return null
}

function registroBase(id: string, hora: string, v: ValoresVitales): RegistroVital {
  return { ...v, temp: v.temp ?? null, id, hora, propaga: false, copiar: null, fr: null, bis: null }
}

// Serie completa: registros explícitos + copias cada 5 min (desde la primera ancla hasta `hasta`).
export function serieVitales(registros: RegistroVital[], hasta: number): RegistroVital[] {
  const ordenados = [...registros].sort((a, b) => a.hora.localeCompare(b.hora))
  const anclas = ordenados.filter((r) => r.propaga)
  if (anclas.length === 0) return ordenados

  const explicitos = new Set(ordenados.map((r) => Date.parse(r.hora)))
  const copias: RegistroVital[] = []
  let i = 0
  for (let t = Date.parse(anclas[0].hora); t <= hasta; t += PASO_VITALES_MS) {
    if (explicitos.has(t)) continue
    while (i + 1 < anclas.length && Date.parse(anclas[i + 1].hora) <= t) i++
    const fuente = anclas[i]
    copias.push(registroBase(`${PREFIJO_AUTO}${new Date(t).toISOString()}`, new Date(t).toISOString(), fuente.copiar ?? valoresDe(fuente)))
  }
  return [...ordenados, ...copias].sort((a, b) => a.hora.localeCompare(b.hora))
}

export function ultimosValores(serie: RegistroVital[], hasta: number): ValoresVitales | null {
  const previos = serie.filter((r) => Date.parse(r.hora) <= hasta)
  return previos.length ? valoresDe(previos[previos.length - 1]) : null
}

export function agregarAncla(c: CasoAnestesico, valores: ValoresVitales, hora: string): Partial<CasoAnestesico> {
  const ms = Date.parse(hora)
  const otros = c.signosVitales.filter((r) => Date.parse(r.hora) !== ms)
  const ancla: RegistroVital = { ...registroBase(crypto.randomUUID(), hora, conPam(valores)), propaga: true }
  return { signosVitales: [...otros, ancla] }
}

export type ModoEdicionVital = 'solo' | 'siguientes'

export function aplicarEdicionVital(
  c: CasoAnestesico,
  hora: string,
  nuevos: ValoresVitales,
  modo: ModoEdicionVital,
): Partial<CasoAnestesico> {
  const ms = Date.parse(hora)
  const existente = c.signosVitales.find((r) => Date.parse(r.hora) === ms)
  const otros = c.signosVitales.filter((r) => r !== existente)
  const valores = conPam(nuevos)
  const base = existente ?? registroBase(crypto.randomUUID(), hora, valores)

  if (modo === 'siguientes') {
    return { signosVitales: [...otros, { ...base, ...valores, propaga: true, copiar: null }] }
  }
  if (existente?.propaga) {
    return { signosVitales: [...otros, { ...base, ...valores, copiar: existente.copiar ?? valoresDe(existente) }] }
  }
  return { signosVitales: [...otros, { ...base, ...valores, propaga: false, copiar: null }] }
}

export function eliminarRegistroVital(c: CasoAnestesico, id: string): Partial<CasoAnestesico> {
  return { signosVitales: c.signosVitales.filter((r) => r.id !== id) }
}

export interface ExtrasPrimerRegistro {
  inicio?: string
  fin?: string
}

// Convierte las horas (HH:MM) del primer registro y las valida contra los hitos existentes.
export function prepararPrimerRegistro(
  c: CasoAnestesico,
  extras: ExtrasPrimerRegistro,
): { error: string | null; inicioIso?: string; finIso?: string } {
  let simulado = c
  let inicioIso: string | undefined
  let finIso: string | undefined
  if (extras.inicio) {
    inicioIso = horaPersonalizadaIso(extras.inicio)
    const problema = errorHito(c, 'inicioAnestesia', inicioIso)
    if (problema) return { error: `Inicio de anestesia: ${problema}` }
    simulado = { ...c, horaInicioAnestesia: inicioIso }
  }
  if (extras.fin) {
    finIso = horaPersonalizadaIso(extras.fin)
    const problema = errorHito(simulado, 'finAnestesia', finIso)
    if (problema) return { error: `Fin de anestesia: ${problema}` }
  }
  return { error: null, inicioIso, finIso }
}

// El primer registro parte de la hora de inicio de anestesia y se repite cada 5 min hasta ahora o hasta el fin.
export function cargarPrimerRegistro(
  c: CasoAnestesico,
  valores: ValoresVitales,
  extras: { inicioIso?: string; finIso?: string },
): Partial<CasoAnestesico> {
  let base = c
  let cambios: Partial<CasoAnestesico> = {}
  if (extras.inicioIso) {
    const h = cambiarHito(base, 'inicioAnestesia', extras.inicioIso)
    cambios = { ...cambios, ...h }
    base = { ...base, ...h }
  }
  if (extras.finIso) {
    const h = cambiarHito(base, 'finAnestesia', extras.finIso)
    cambios = { ...cambios, ...h }
    base = { ...base, ...h }
  }
  const ancla = agregarAncla(base, valores, base.horaInicioAnestesia ?? new Date().toISOString())
  return { ...cambios, ...ancla }
}
