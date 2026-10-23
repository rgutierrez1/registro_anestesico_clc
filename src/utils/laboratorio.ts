import { EXAMENES_LAB } from '../constants'
import type { ExamenLab, TipoExamen } from '../types'

export function definicionExamen(tipo: TipoExamen) {
  return EXAMENES_LAB.find((e) => e.id === tipo)!
}

function aNumero(t: string): number {
  return Number.parseFloat(t.replace(',', '.'))
}

export function errorExamen(e: ExamenLab): string | null {
  if (Number.isNaN(Date.parse(e.hora))) return 'Hora inválida.'
  if (Date.parse(e.hora) > Date.now() + 60000) return 'La hora no puede ser posterior a la hora actual.'
  const def = definicionExamen(e.tipo)
  if (!def.campos.some((c) => (e.valores[c.clave] ?? '').trim() !== '')) return 'Ingresá al menos un resultado.'
  for (const c of def.campos) {
    const t = (e.valores[c.clave] ?? '').trim()
    if (t === '' || c.min === undefined || c.max === undefined) continue
    const n = aNumero(t)
    if (!Number.isFinite(n) || n < c.min || n > c.max) return `${c.etiqueta}: debe ser un número entre ${c.min} y ${c.max}.`
  }
  return null
}

// Resultados cargados, p. ej. "pH 7,40 · PaCO2 40 mmHg".
export function resumenExamen(e: ExamenLab): string {
  const def = definicionExamen(e.tipo)
  const partes = def.campos
    .filter((c) => (e.valores[c.clave] ?? '').trim() !== '')
    .map((c) => `${c.min === undefined ? '' : `${c.etiqueta} `}${e.valores[c.clave].trim()}${c.unidad ? ` ${c.unidad}` : ''}`)
  const base = partes.join(' · ')
  return e.notas.trim() ? `${base} — ${e.notas.trim()}` : base
}
