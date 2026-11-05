import type { CasoAnestesico, DatosPaciente } from '../types'
import type { VersionMenu } from './tipos'

// Hasta los 10 años inclusive se ofrece la versión pediátrica; desde que el paciente supera los 10, solo opciones de adulto.
export const EDAD_MAXIMA_PEDIATRICA = 10

export interface PacienteMenu {
  edadAnios?: number
  edadMeses?: number
  pesoKg?: number
  tallaCm?: number
  sexo?: 'M' | 'F'
}

export function pacienteMenu(p: DatosPaciente): PacienteMenu {
  const anios = p.edad === '' ? undefined : p.edad
  // Los meses solo se registran en menores de 5 años.
  const extra = p.edadMeses === '' || p.edadMeses === undefined || (anios !== undefined && anios >= 5) ? 0 : p.edadMeses
  return {
    edadAnios: anios === undefined ? undefined : anios + extra / 12,
    edadMeses: anios === undefined ? undefined : anios * 12 + extra,
    pesoKg: p.peso === '' ? undefined : p.peso,
    tallaCm: p.altura === '' ? undefined : p.altura,
    sexo: p.sexo === 'M' || p.sexo === 'F' ? p.sexo : undefined,
  }
}

// El corte (edad ≤ 10 años = pediátrica) se puede cambiar a mano por paciente.
export function versionMenu(c: Pick<CasoAnestesico, 'paciente' | 'versionMenus'>): VersionMenu {
  if (c.versionMenus === 'ped' || c.versionMenus === 'adulto') return c.versionMenus
  const edad = pacienteMenu(c.paciente).edadAnios
  return edad !== undefined && edad <= EDAD_MAXIMA_PEDIATRICA ? 'ped' : 'adulto'
}

// Peso magro (Janmahasatian); sin talla o sexo usa el peso real y avisa que es aproximado.
export function pesoMagro(p: PacienteMenu): { kg: number; aproximado: boolean } | null {
  if (p.pesoKg === undefined) return null
  if (p.tallaCm === undefined || p.sexo === undefined) return { kg: p.pesoKg, aproximado: true }
  const imc = p.pesoKg / (p.tallaCm / 100) ** 2
  const kg = p.sexo === 'M' ? (9270 * p.pesoKg) / (6680 + 216 * imc) : (9270 * p.pesoKg) / (8780 + 244 * imc)
  return { kg, aproximado: false }
}
