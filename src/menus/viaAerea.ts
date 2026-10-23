import json from '../data/menus/via_aerea.json'
import { obtenerFarmaco } from '../data/catalogoFarmacos'
import type { CasoAnestesico, ViaAereaMenu } from '../types'
import { calcularVisibilidad, faltantes, valoresPorDefecto, claveHoras, type Visibilidad } from './motor'
import { pacienteMenu, pesoMagro, versionMenu, type PacienteMenu } from './paciente'
import { sugerir, type Sugerencia } from './sugerencias'
import type { Alerta, MenuDef, RegistroMenu, SeccionDef, Valores, VersionMenu } from './tipos'

export const DEF_VIA = json as unknown as MenuDef
export const SECCIONES_VIA = DEF_VIA.secciones
export const SECCIONES_CASO = SECCIONES_VIA.filter((s) => s.ambito === 'caso')
export const SECCIONES_EVENTO = SECCIONES_VIA.filter((s) => s.ambito === 'evento')

const CLAVES_DE = (s: SeccionDef) => new Set(s.campos.map((c) => c.id))

export function seccionDeEvento(e: RegistroMenu): SeccionDef | undefined {
  return SECCIONES_VIA.find((s) => s.id === e.seccion)
}

export const activos = (eventos: RegistroMenu[]) => eventos.filter((e) => !e.anulado).sort((a, b) => a.hora.localeCompare(b.hora))

// Valores del caso + lo último registrado en cada maniobra (+ lo que se está editando).
export function valoresEfectivos(via: ViaAereaMenu, editando?: Valores, excluirId?: string): Valores {
  const r: Valores = { ...via.valores }
  for (const e of activos(via.eventos)) if (e.id !== excluirId) Object.assign(r, e.valores)
  return { ...r, ...editando }
}

const en = (v: unknown, lista: string[]) => typeof v === 'string' && lista.includes(v)

export function calculadosVia(via: ViaAereaMenu, valores: Valores, p: PacienteMenu): Valores {
  const han = en(valores['va.han'], ['han_3', 'han_4'])
  const intentosInt = en(valores['int.intentos'], ['3', '4_mas'])
  const spo2 = typeof valores['int.spo2_min'] === 'number' ? (valores['int.spo2_min'] as number) : undefined
  const manejo = Array.isArray(valores['va.manejo']) ? (valores['va.manejo'] as string[]) : []
  const intubacionFallida = manejo.includes('intubacion') && (en(valores['vad.desenlace'], ['despertar', 'sigue_dsg', 'fona', 'postergada']) || valores['vigil.resultado'] === 'fallida')
  const dsgFallido = valores['dsg.intentos'] === '3_mas' || en(valores['vad.plan_alcanzado'], ['plan_c', 'plan_d'])
  const disparador = han || intentosInt || valores['dsg.intentos'] === '3_mas' || valores['vigil.resultado'] === 'fallida' || (spo2 !== undefined && spo2 < 80)
  const r: Valores = {
    'va.intubacion_fallida': intubacionFallida,
    'va.dsg_fallido': dsgFallido,
    'va.vad_disparador': disparador,
    'va.vad_imprevista_sugerida': valores['va.vad_anticipada'] === false && (han || intentosInt || intubacionFallida || dsgFallido),
    'boton_crisis.declarar_vad': via.vadDeclarada !== null,
    'va.desaturacion': spo2 !== undefined && spo2 < 90,
    'va.exito_primer_intento': manejo.includes('intubacion') && valores['int.intentos'] === '1' && Array.isArray(valores['int.confirmacion']) && (valores['int.confirmacion'] as string[]).includes('capnografia'),
  }
  const lido = valores['vigil.lidocaina_mg']
  const magro = pesoMagro(p)
  if (typeof lido === 'number' && magro) r['vigil.lidocaina_mg_kg'] = lido / magro.kg
  return r
}

export function tieneRelajante(c: CasoAnestesico): boolean {
  return c.farmacos.some((f) => obtenerFarmaco(f.farmacoId)?.categoria === 'BNM')
}

export interface EstadoVia {
  version: VersionMenu
  paciente: PacienteMenu
  valores: Valores
  visibilidad: Visibilidad
}

// `editando` son los valores de la maniobra que se está cargando (si hay una).
export function estadoVia(c: CasoAnestesico, editando?: Valores, excluirId?: string): EstadoVia {
  const version = versionMenu(c)
  const paciente = pacienteMenu(c.paciente)
  const base = valoresEfectivos(c.viaAereaMenu, editando, excluirId)
  const valores = { ...base, ...calculadosVia(c.viaAereaMenu, base, paciente) }
  const visibilidad = calcularVisibilidad(DEF_VIA, valores, version)
  if (!tieneRelajante(c)) visibilidad.campos.delete('ext.tof')
  return { version, paciente, valores, visibilidad }
}

export function defaultsVia(): Valores {
  return valoresPorDefecto(SECCIONES_VIA)
}

// Alertas que el JSON solo describe con texto.
export function alertasViaEspeciales(campoId: string, e: EstadoVia, magroAprox: boolean): Alerta[] {
  const v = e.valores
  const r: Alerta[] = []
  if (campoId === 'int.presion_cuff' && typeof v['int.presion_cuff'] === 'number') {
    const p = v['int.presion_cuff'] as number
    if (e.version === 'ped' && p > 20) r.push({ nivel: 'amarilla', mensaje: 'Presión de cuff sobre 20 cmH2O en un niño.' })
    if (e.version === 'adulto' && (p < 20 || p > 30)) r.push({ nivel: 'amarilla', mensaje: 'Presión de cuff fuera de rango (meta 20–30 cmH2O).' })
  }
  if (campoId === 'int.confirmacion' && Array.isArray(v['int.confirmacion']) && v['int.confirmacion'].length > 0 && !v['int.confirmacion'].includes('capnografia')) {
    r.push({ nivel: 'roja', mensaje: 'Sin curva de capnografía, el tubo está mal puesto hasta demostrar lo contrario.' })
  }
  if (campoId === 'vigil.lidocaina_mg' && typeof v['vigil.lidocaina_mg_kg'] === 'number') {
    const kg = v['vigil.lidocaina_mg_kg'] as number
    if (kg > 9) r.push({ nivel: 'roja', mensaje: `Lidocaína tópica sobre 9 mg/kg de peso magro (máximo DAS): ${kg.toFixed(1).replace('.', ',')} mg/kg.` })
    if (magroAprox) r.push({ nivel: 'info', mensaje: 'Cálculo aproximado: falta talla o sexo, se usó el peso real.' })
  }
  if (campoId === 'va.pack_hora_retiro' && v['va.pack'] === true && typeof v['va.pack_hora_retiro'] !== 'string') {
    r.push({ nivel: 'bloqueo', mensaje: 'Pack sin retiro registrado: no se puede registrar la extubación ni cerrar la hoja.' })
  }
  if (campoId === 'vad.comunicacion') {
    const c = v['vad.comunicacion']
    const completa = c && typeof c === 'object' && !Array.isArray(c) && ['alerta_ficha', 'paciente_informado', 'carta_entregada'].every((k) => typeof c[k] === 'boolean') && typeof c['recomendacion'] === 'string' && (c['recomendacion'] as string).trim() !== ''
    if (!completa) r.push({ nivel: 'bloqueo', mensaje: 'Hubo VAD: completar la comunicación antes de cerrar la hoja.' })
  }
  return r
}

export function sugerenciaVia(campoId: string, e: EstadoVia, spo2Min: number | null): Sugerencia | null {
  if (campoId === 'int.spo2_min' && spo2Min !== null) return { texto: `${spo2Min} % (mínima de SpO2 en los signos vitales)`, valor: spo2Min }
  return sugerir(campoId, e.version, e.paciente, e.valores)
}

// Añade solas las complicaciones que el JSON marca como automáticas (desaturación <90%).
export function conComplicacionesAuto(valoresCaso: Valores, efectivos: Valores, ahoraIso: string): Valores {
  const spo2 = efectivos['int.spo2_min']
  if (typeof spo2 !== 'number' || spo2 >= 90) return valoresCaso
  const lista = Array.isArray(valoresCaso['va.complicaciones']) ? (valoresCaso['va.complicaciones'] as string[]) : []
  if (lista.includes('desaturacion')) return valoresCaso
  const horas = { ...(valoresCaso[claveHoras('va.complicaciones')] as Record<string, string> | undefined), desaturacion: ahoraIso }
  return { ...valoresCaso, 'va.complicaciones': [...lista.filter((x) => x !== 'ninguna'), 'desaturacion'], [claveHoras('va.complicaciones')]: horas }
}

// Lo que falta para poder cerrar la hoja (campos obligatorios y bloqueos).
export function pendientesVia(c: CasoAnestesico): string[] {
  const e = estadoVia(c)
  const r: string[] = []
  const etiqueta = (s: SeccionDef, campo: string) => `Vía aérea ${s.numero}. ${campo}`
  for (const s of SECCIONES_CASO) {
    if (!e.visibilidad.secciones.has(s.id)) continue
    for (const f of faltantes([s], e.valores, e.visibilidad, e.version)) r.push(etiqueta(s, f.etiqueta))
  }
  const vivos = activos(c.viaAereaMenu.eventos)
  for (const s of SECCIONES_EVENTO) {
    if (!e.visibilidad.secciones.has(s.id)) continue
    if (!vivos.some((x) => x.seccion === s.id)) r.push(`Vía aérea: falta registrar «${s.titulo}»`)
  }
  for (const ev of vivos) {
    const s = seccionDeEvento(ev)
    if (!s) continue
    const est = estadoVia(c, ev.valores, ev.id)
    for (const f of faltantes([s], est.valores, est.visibilidad, est.version)) r.push(etiqueta(s, f.etiqueta))
  }
  if (e.valores['va.pack'] === true && typeof e.valores['va.pack_hora_retiro'] !== 'string') r.push('Vía aérea: pack sin hora de retiro')
  return [...new Set(r)]
}

export { CLAVES_DE }
