import { FLUIDOS_EGRESO, FLUIDOS_INGRESO, type TipoFluido } from '../constants'
import type { RegistroFluido } from '../types'
import { nuevoId } from './id'

export interface FilaFluido extends TipoFluido {
  entrada: boolean
  antiguo?: boolean
}

// Filas del catálogo + las de registros antiguos cuyo tipo ya no está en el catálogo.
export function filasFluidos(registros: RegistroFluido[]): FilaFluido[] {
  const conocidos = new Set([...FLUIDOS_INGRESO, ...FLUIDOS_EGRESO].map((t) => t.id))
  const extra = (entrada: boolean): FilaFluido[] =>
    [...new Set(registros.filter((r) => r.entrada === entrada && !conocidos.has(r.tipo)).map((r) => r.tipo))].map((t) => ({
      id: t,
      etiqueta: `${t} (registro anterior)`,
      unidad: 'mL',
      entrada,
      antiguo: true,
    }))
  return [
    ...FLUIDOS_INGRESO.map((t) => ({ ...t, entrada: true })),
    ...extra(true),
    ...FLUIDOS_EGRESO.map((t) => ({ ...t, entrada: false })),
    ...extra(false),
  ]
}

// Una columna por minuto: los registros de la misma hora van juntos.
export const claveColumna = (iso: string) => iso.slice(0, 16)

export interface Columna {
  clave: string
  hora: string
}

export function columnas(registros: RegistroFluido[], vacias: string[]): Columna[] {
  const mapa = new Map<string, string>()
  for (const r of registros) if (!mapa.has(claveColumna(r.hora))) mapa.set(claveColumna(r.hora), r.hora)
  for (const h of vacias) if (!mapa.has(claveColumna(h))) mapa.set(claveColumna(h), h)
  return [...mapa.entries()].map(([clave, hora]) => ({ clave, hora })).sort((a, b) => a.clave.localeCompare(b.clave))
}

export function cantidadCelda(registros: RegistroFluido[], tipo: string, clave: string): number | null {
  const r = registros.filter((x) => x.tipo === tipo && claveColumna(x.hora) === clave)
  return r.length ? r.reduce((s, x) => s + x.cantidad, 0) : null
}

// Fija la celda (tipo × columna): 0 o vacío la borra.
export function fijarCelda(registros: RegistroFluido[], fila: FilaFluido, columna: Columna, cantidad: number | null): RegistroFluido[] {
  const resto = registros.filter((x) => !(x.tipo === fila.id && claveColumna(x.hora) === columna.clave))
  if (cantidad === null || cantidad <= 0) return resto
  return [...resto, { id: nuevoId(), hora: columna.hora, tipo: fila.id, cantidad, unidad: fila.unidad, entrada: fila.entrada }]
}

export function cambiarHoraColumna(registros: RegistroFluido[], clave: string, nuevaIso: string): RegistroFluido[] {
  return registros.map((r) => (claveColumna(r.hora) === clave ? { ...r, hora: nuevaIso } : r))
}

export function quitarColumna(registros: RegistroFluido[], clave: string): RegistroFluido[] {
  return registros.filter((r) => claveColumna(r.hora) !== clave)
}

export interface Totales {
  ingresoMl: number
  egresoMl: number
  balanceMl: number
  unidades: { etiqueta: string; total: number }[]
}

const enMl = (r: RegistroFluido) => r.unidad === 'mL'

export function totales(registros: RegistroFluido[], hastaClave?: string): Totales {
  const dentro = registros.filter((r) => hastaClave === undefined || claveColumna(r.hora) <= hastaClave)
  const ingresoMl = dentro.filter((r) => r.entrada && enMl(r)).reduce((s, r) => s + r.cantidad, 0)
  const egresoMl = dentro.filter((r) => !r.entrada && enMl(r)).reduce((s, r) => s + r.cantidad, 0)
  const unidades = filasFluidos(registros)
    .filter((f) => f.unidad === 'U')
    .map((f) => ({ etiqueta: f.etiqueta, total: dentro.filter((r) => r.tipo === f.id && r.unidad === 'U').reduce((s, r) => s + r.cantidad, 0) }))
    .filter((u) => u.total > 0)
  return { ingresoMl, egresoMl, balanceMl: ingresoMl - egresoMl, unidades }
}

export const formatCantidad = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',')
export const formatBalance = (n: number) => `${n > 0 ? '+' : ''}${formatCantidad(n)}`
