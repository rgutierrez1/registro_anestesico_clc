import type { DatosPaciente } from '../types'

export function formatNumero(n: number): string {
  return String(Math.round(n * 1000) / 1000)
}

export function formatDosis(valor: number | null, unidad: string): string {
  if (valor === null) return '—'
  if (unidad === 'mg' && valor >= 1000 && valor % 1000 === 0) return `${valor / 1000} g`
  return `${formatNumero(valor)} ${unidad}`.trim()
}

export interface PesoDosificacion {
  kg: number
  base: 'ajustado' | 'real'
  detalle: string
}

// Peso ideal (Devine); null si faltan altura o sexo.
export function pesoIdeal(p: DatosPaciente): number | null {
  if (p.altura === '' || (p.sexo !== 'M' && p.sexo !== 'F')) return null
  return (p.sexo === 'M' ? 50 : 45.5) + 2.3 * (p.altura / 2.54 - 60)
}

// Peso ajustado = ideal (Devine) + 0,4 × (real − ideal). Si el paciente pesa menos que su
// peso ideal, o faltan altura/sexo para calcularlo, se usa el peso real.
export function pesoParaDosificar(p: DatosPaciente): PesoDosificacion | null {
  if (p.peso === '' || p.peso <= 0) return null
  const ideal = pesoIdeal(p)
  if (ideal === null) {
    return { kg: p.peso, base: 'real', detalle: 'peso real: faltan altura o sexo para calcular el peso ajustado' }
  }
  if (p.peso <= ideal) {
    return { kg: p.peso, base: 'real', detalle: 'peso real: es menor o igual al peso ideal' }
  }
  const ajustado = ideal + 0.4 * (p.peso - ideal)
  return { kg: ajustado, base: 'ajustado', detalle: 'peso ajustado' }
}

// En caso de empate gana el valor menor.
export function valorMasCercano(opciones: number[], objetivo: number): number {
  return opciones.reduce((mejor, v) => (Math.abs(v - objetivo) < Math.abs(mejor - objetivo) ? v : mejor))
}
