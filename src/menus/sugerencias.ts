import viaAerea from '../data/menus/via_aerea.json'
import type { PacienteMenu } from './paciente'
import type { Valores, VersionMenu } from './tipos'

export interface Sugerencia {
  texto: string
  codigos?: string[]
  valor?: number
}

interface TablaTubo {
  con_cuff_por_edad: { desde_meses: number; hasta_meses: number; di_mm: number }[]
  recien_nacido_sin_cuff_por_peso: { peso_min_kg?: number; peso_max_kg?: number; di_mm: number }[]
}
interface FilaDsg {
  tamano: string
  igel_kg: { min: number | null; max: number | null }
  con_manguito_kg: { min: number | null; max: number | null }
}
interface FilaHoja {
  criterio: { peso_min_kg?: number; peso_max_kg?: number; edad_min_anios?: number; edad_max_anios?: number }
  hoja: string
}
interface FilaAislamiento {
  edad_anios: [number, number]
  tubo_di: string
  bloqueador_fr: string
  doble_lumen_fr: string | null
}

const T = viaAerea.tablas_pediatricas as unknown as {
  A1_tubo: TablaTubo
  A2_dsg_por_peso: FilaDsg[]
  A3_hoja: FilaHoja[]
  A3_nota: string
  A4_aislamiento: FilaAislamiento[]
  A4_nota: string
}

const coma = (n: number) => String(n).replace('.', ',')
const aMedio = (n: number) => Math.round(n * 2) / 2
const codigoDi = (di: number) => `${Math.trunc(di)}_${Math.round((di % 1) * 10)}`
const enRango = (v: number, min: number | null | undefined, max: number | null | undefined) =>
  (min === null || min === undefined || v >= min) && (max === null || max === undefined || v <= max)

// 6.7 Diámetro interno del tubo (A1).
export function sugerirDi(p: PacienteMenu, valores: Valores): Sugerencia | null {
  const sinCuff = valores['int.tubo'] === 'sin_cuff'
  if (p.edadMeses === undefined && p.pesoKg === undefined) return null
  if (sinCuff && p.edadMeses !== undefined && p.edadMeses < 1 && p.pesoKg !== undefined) {
    const f = T.A1_tubo.recien_nacido_sin_cuff_por_peso.find((x) => (x.peso_min_kg === undefined || p.pesoKg! >= x.peso_min_kg) && (x.peso_max_kg === undefined || p.pesoKg! < x.peso_max_kg))
    if (f) return { texto: `${coma(f.di_mm)} mm sin cuff (RN según peso)`, codigos: [codigoDi(f.di_mm)] }
  }
  if (p.edadMeses === undefined) return null
  if (sinCuff && p.edadAnios !== undefined && p.edadAnios >= 2) {
    const di = aMedio(p.edadAnios / 4 + 4)
    return { texto: `${coma(di)} mm sin cuff (edad/4 + 4); tener a mano medio número más y menos`, codigos: [codigoDi(di)] }
  }
  const fila = T.A1_tubo.con_cuff_por_edad.find((x) => p.edadMeses! >= x.desde_meses && p.edadMeses! < x.hasta_meses)
  if (!fila) return null
  return { texto: `${coma(fila.di_mm)} mm con cuff (tabla por edad); tener a mano medio número más y menos`, codigos: [codigoDi(fila.di_mm)] }
}

// 6.8 Profundidad de fijación (fórmulas de A1).
export function sugerirProfundidad(p: PacienteMenu, valores: Valores): Sugerencia | null {
  const nasal = valores['int.via'] === 'nasal'
  const di = typeof valores['int.di_mm'] === 'string' ? Number(String(valores['int.di_mm']).replace('_', '.')) : undefined
  if (p.edadMeses !== undefined && p.edadMeses < 1 && p.pesoKg !== undefined) {
    const v = p.pesoKg + 6
    return { texto: `${coma(Math.round(v * 2) / 2)} cm (RN: peso + 6)`, valor: Math.round(v * 2) / 2 }
  }
  if (p.edadAnios !== undefined && p.edadAnios >= 2) {
    const v = nasal ? p.edadAnios / 2 + 15 : p.edadAnios / 2 + 12
    return { texto: `${coma(Math.round(v * 2) / 2)} cm (${nasal ? 'edad/2 + 15 nasal' : 'edad/2 + 12 oral'})`, valor: Math.round(v * 2) / 2 }
  }
  if (di !== undefined && !nasal) return { texto: `${coma(Math.round(3 * di * 2) / 2)} cm (3 × diámetro interno)`, valor: Math.round(3 * di * 2) / 2 }
  return null
}

// 5.2 Tamaño del DSG por peso (A2): puede haber más de uno por solapamiento entre tamaños.
export function sugerirDsg(p: PacienteMenu, valores: Valores): Sugerencia | null {
  if (p.pesoKg === undefined) return null
  const igel = valores['dsg.tipo'] === 'igel'
  const coinciden = T.A2_dsg_por_peso.filter((f) => {
    const r = igel ? f.igel_kg : f.con_manguito_kg
    return enRango(p.pesoKg!, r.min, r.max)
  })
  if (!coinciden.length) return null
  return { texto: `${coinciden.map((f) => coma(Number(f.tamano.replace('_', '.')))).join(' o ')} (${igel ? 'i-gel' : 'con manguito'}, ${coma(p.pesoKg)} kg)`, codigos: coinciden.map((f) => f.tamano) }
}

// 6.3 Hoja de laringoscopio (A3).
export function sugerirHoja(p: PacienteMenu): Sugerencia | null {
  if (p.pesoKg === undefined && p.edadAnios === undefined) return null
  const f = T.A3_hoja.find(({ criterio: c }) => {
    if (c.peso_min_kg !== undefined && (p.pesoKg === undefined || p.pesoKg < c.peso_min_kg)) return false
    if (c.peso_max_kg !== undefined && (p.pesoKg === undefined || p.pesoKg >= c.peso_max_kg)) return false
    if (c.edad_min_anios !== undefined && (p.edadAnios === undefined || p.edadAnios < c.edad_min_anios)) return false
    if (c.edad_max_anios !== undefined && (p.edadAnios === undefined || p.edadAnios >= c.edad_max_anios)) return false
    return true
  })
  if (!f) return null
  const nums = [...f.hoja.matchAll(/\d+(?:[–-]\d+)?/g)].flatMap((m) => m[0].split(/[–-]/))
  const codigos = [...new Set(nums.map((n) => n.replace(',', '_')))]
  return { texto: `${f.hoja}. ${T.A3_nota}`, codigos }
}

function filaAislamiento(p: PacienteMenu): FilaAislamiento | undefined {
  if (p.edadAnios === undefined) return undefined
  return T.A4_aislamiento.find((f) => p.edadAnios! >= f.edad_anios[0] && p.edadAnios! < f.edad_anios[1])
}

const numerosDe = (t: string | null) => (t ? t.match(/\d+/g) ?? [] : [])

// 7.2 y 7.3 Aislamiento pulmonar por edad (A4).
export function sugerirAislamiento(p: PacienteMenu, campo: 'ais.tdl_fr' | 'ais.bloqueador_fr'): Sugerencia | null {
  const f = filaAislamiento(p)
  if (!f) return null
  if (campo === 'ais.tdl_fr') {
    if (!f.doble_lumen_fr) return { texto: 'Sin doble lumen a esta edad (usar bloqueador o tubo bronquial)' }
    return { texto: `${f.doble_lumen_fr} Fr · ${T.A4_nota}`, codigos: numerosDe(f.doble_lumen_fr) }
  }
  const nums = numerosDe(f.bloqueador_fr)
  const codigos = nums.map((n) => (n === '2' || n === '3' ? '2_3_fogarty' : n))
  return { texto: `${f.bloqueador_fr} Fr (tubo ${f.tubo_di}) · ${T.A4_nota}`, codigos: [...new Set(codigos)] }
}

export function sugerir(campoId: string, version: VersionMenu, p: PacienteMenu, valores: Valores): Sugerencia | null {
  if (version !== 'ped') return null
  switch (campoId) {
    case 'int.di_mm':
      return sugerirDi(p, valores)
    case 'int.profundidad_cm':
      return sugerirProfundidad(p, valores)
    case 'dsg.tamano':
      return sugerirDsg(p, valores)
    case 'int.hoja':
      return sugerirHoja(p)
    case 'ais.tdl_fr':
    case 'ais.bloqueador_fr':
      return sugerirAislamiento(p, campoId)
    default:
      return null
  }
}
