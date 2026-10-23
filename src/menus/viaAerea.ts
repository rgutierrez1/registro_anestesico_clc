import json from '../data/menus/via_aerea.json'
import type { CasoAnestesico, ViaAereaMenu } from '../types'
import { cargarMenu } from './cargar'
import { calcularVisibilidad, faltantes, valoresPorDefecto, type Visibilidad } from './motor'
import { pacienteMenu, versionMenu, type PacienteMenu } from './paciente'
import { sugerir, type Sugerencia } from './sugerencias'
import type { MenuDef, SeccionDef, Valores, VersionMenu } from './tipos'

export const DEF_VIA: MenuDef = cargarMenu(json)
export const SECCIONES_VIA: SeccionDef[] = DEF_VIA.secciones

export interface EstadoVia {
  version: VersionMenu
  paciente: PacienteMenu
  valores: Valores
  visibilidad: Visibilidad
}

// `editando` son los valores que se están cargando; si no hay, se usan los guardados.
export function estadoVia(c: CasoAnestesico, editando?: Valores): EstadoVia {
  const version = versionMenu(c)
  const valores = editando ?? c.viaAereaMenu.valores
  return { version, paciente: pacienteMenu(c.paciente), valores, visibilidad: calcularVisibilidad(DEF_VIA, valores, version) }
}

export const defaultsVia = (): Valores => valoresPorDefecto(SECCIONES_VIA)

export function sugerenciaVia(campoId: string, e: EstadoVia): Sugerencia | null {
  return sugerir(campoId, e.version, e.paciente, e.valores)
}

export function faltantesVia(e: EstadoVia) {
  return faltantes(SECCIONES_VIA, e.valores, e.visibilidad, e.version)
}

export const haySeleccionVia = (v: Valores) => Array.isArray(v['va.uso']) && v['va.uso'].length > 0

// Lo que falta para cerrar la hoja: en anestesia general, que la vía aérea esté registrada y completa.
export function pendientesVia(c: CasoAnestesico): string[] {
  const guardado = c.viaAereaMenu.valores
  if (!haySeleccionVia(guardado)) return c.tiposAnestesia.includes('General') ? ['Vía aérea: falta registrar qué se usó'] : []
  return faltantesVia(estadoVia(c)).map((f) => `Vía aérea ${f.numero}. ${f.etiqueta}`)
}

// --- Registros de la versión 1.0 (ámbito caso + eventos con hora) → versión 3.0 ---
const HAN: Record<string, string> = { han_0: 'no_intentada', han_1: 'facil', han_2: 'con_ayuda', han_3: 'dificil', han_4: 'imposible' }
const ML_TIPO: Record<string, string> = { igel: 'igel', lma_2gen: 'supreme_proseal', lma_clasica: 'clasica' }
const LARINGO: Record<string, string> = {
  vl_estandar: 'video_estandar',
  vl_canalizado: 'video_estandar',
  vl_hiperangulada: 'video_hiperangulada',
  ld_macintosh: 'directo',
  ld_miller: 'directo',
  fibroscopio: 'fibroscopio',
  otro: 'directo',
}
const TUBO: Record<string, string> = { estandar_cuff: 'con_cuff', sin_cuff: 'sin_cuff', anillado: 'anillado', rae_oral: 'rae', rae_nasal: 'rae' }

interface ViaAereaV1 {
  valores: Valores
  eventos?: { valores: Valores; hora: string; anulado?: unknown }[]
  vadDeclarada?: string | null
}

export function migrarViaAereaV1(v: ViaAereaV1 | ViaAereaMenu): ViaAereaMenu {
  if (!('eventos' in v) && 'historial' in v) return v as ViaAereaMenu
  const viejo = v as ViaAereaV1
  const efectivos: Valores = { ...viejo.valores }
  for (const e of [...(viejo.eventos ?? [])].filter((x) => !x.anulado).sort((a, b) => a.hora.localeCompare(b.hora))) Object.assign(efectivos, e.valores)
  const n: Valores = {}
  const manejo = Array.isArray(efectivos['va.manejo']) ? (efectivos['va.manejo'] as string[]) : []
  const uso: string[] = []
  const nasal = efectivos['int.via'] === 'nasal'
  if (manejo.includes('sin_dispositivo')) uso.push('sin_dispositivo')
  if (manejo.includes('solo_mascara')) uso.push('mascara_facial')
  if (manejo.includes('dsg')) uso.push('mascara_laringea')
  if (manejo.includes('aislamiento')) uso.push('doble_lumen_bloqueador')
  else if (manejo.includes('intubacion')) uso.push(nasal ? 'tnt' : 'tot')
  if (manejo.includes('preexistente')) uso.push('llega_con_va')
  if (uso.length) n['va.uso'] = uso
  const o2 = String(efectivos['va.o2_sin_dispositivo'] ?? '')
  if (o2) n['va.o2_con'] = o2.startsWith('naricera') ? 'naricera' : o2
  if (typeof efectivos['va.han'] === 'string') n['va.ventilacion_mascara'] = HAN[efectivos['va.han']] ?? efectivos['va.han']
  if (typeof efectivos['dsg.tipo'] === 'string') n['ml.tipo'] = ML_TIPO[efectivos['dsg.tipo']] ?? 'otra'
  if (efectivos['dsg.tamano'] !== undefined) n['ml.numero'] = efectivos['dsg.tamano']
  if (efectivos['dsg.intentos'] !== undefined) n['ml.intentos'] = efectivos['dsg.intentos']
  const induccion = String(efectivos['va.induccion'] ?? '')
  if (uso.some((u) => ['tot', 'tnt', 'doble_lumen_bloqueador'].includes(u))) n['int.tecnica'] = induccion === 'secuencia_rapida' || induccion === 'vigil' ? induccion : 'estandar'
  if (typeof efectivos['int.dispositivo'] === 'string') n['int.laringoscopio'] = LARINGO[efectivos['int.dispositivo']] ?? 'directo'
  if (efectivos['int.cormack'] !== undefined) n['int.cormack'] = efectivos['int.cormack']
  if (Array.isArray(efectivos['int.adjuntos'])) n['int.ayudas'] = (efectivos['int.adjuntos'] as string[]).filter((x) => x !== 'ninguno')
  if (typeof efectivos['int.tubo'] === 'string') n['int.tubo'] = TUBO[efectivos['int.tubo']] ?? 'otro'
  if (efectivos['int.di_mm'] !== undefined) n['int.numero_mm'] = efectivos['int.di_mm']
  if (efectivos['int.profundidad_cm'] !== undefined) n['int.fijado_cm'] = efectivos['int.profundidad_cm']
  if (efectivos['int.intentos'] !== undefined) n['int.intentos'] = efectivos['int.intentos'] === '4_mas' || efectivos['int.intentos'] === '3' ? '3_mas' : efectivos['int.intentos']
  if (Array.isArray(efectivos['int.confirmacion'])) n['int.capnografia'] = (efectivos['int.confirmacion'] as string[]).includes('capnografia')
  for (const k of ['ais.dispositivo', 'ais.tdl_fr', 'ais.bloqueador_fr'] as const) if (efectivos[k] !== undefined) n[k] = efectivos[k]
  if (efectivos['ais.confirmado_fibroscopio'] !== undefined) n['ais.fibroscopio'] = efectivos['ais.confirmado_fibroscopio']
  if (typeof efectivos['pre.llega_con'] === 'string') n['pre.llega_con'] = efectivos['pre.llega_con'] === 'tet' ? 'tubo' : efectivos['pre.llega_con']
  if (efectivos['pre.diametro_mm'] !== undefined) n['pre.numero_mm'] = efectivos['pre.diametro_mm']
  if (efectivos['vad.imprevista_confirmada'] !== undefined) n['vad.no_prevista'] = efectivos['vad.imprevista_confirmada']
  const com = efectivos['vad.comunicacion']
  if (com && typeof com === 'object' && !Array.isArray(com) && typeof com['carta_entregada'] === 'boolean') n['vad.carta'] = com['carta_entregada']
  if (efectivos['va.pack'] === true) n['va.otros'] = ['pack']
  return { valores: n, historial: [], legado: viejo }
}
