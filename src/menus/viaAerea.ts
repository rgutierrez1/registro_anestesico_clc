import json from '../data/menus/via_aerea.json'
import type { CasoAnestesico, ViaAereaMenu } from '../types'
import { cargarMenu } from './cargar'
import { buscarOpcion, calcularVisibilidad, faltantes, valoresPorDefecto, type Visibilidad } from './motor'
import { pacienteMenu, versionMenu, type PacienteMenu } from './paciente'
import { sugerir, type Sugerencia } from './sugerencias'
import type { MenuDef, RegistroMenu, SeccionDef, Valores, VersionMenu } from './tipos'

export const DEF_VIA: MenuDef = cargarMenu(json)
export const SECCIONES_VIA: SeccionDef[] = DEF_VIA.secciones

export interface EstadoVia {
  version: VersionMenu
  paciente: PacienteMenu
  valores: Valores
  visibilidad: Visibilidad
}

// `valores` son los de la maniobra que se está cargando o mostrando.
export function estadoVia(c: Pick<CasoAnestesico, 'paciente' | 'versionMenus'>, valores: Valores): EstadoVia {
  const version = versionMenu(c)
  return { version, paciente: pacienteMenu(c.paciente), valores, visibilidad: calcularVisibilidad(DEF_VIA, valores, version) }
}

// Valores premarcados (1 intento, ventilación con máscara fácil, técnica estándar, tubo con cuff).
export const defaultsVia = (): Valores => valoresPorDefecto(SECCIONES_VIA)

export function sugerenciaVia(campoId: string, e: EstadoVia): Sugerencia | null {
  return sugerir(campoId, e.version, e.paciente, e.valores)
}

export function faltantesVia(e: EstadoVia) {
  return faltantes(SECCIONES_VIA, e.valores, e.visibilidad, e.version)
}

export const registrosVivos = (c: Pick<CasoAnestesico, 'viaAereaMenu'>) =>
  c.viaAereaMenu.registros.filter((r) => !r.anulado).sort((a, b) => a.hora.localeCompare(b.hora))

// Lo que falta para cerrar la hoja: en anestesia general, al menos un dispositivo registrado.
export function pendientesVia(c: CasoAnestesico): string[] {
  return c.tiposAnestesia.includes('General') && registrosVivos(c).length === 0 ? ['Vía aérea: falta registrar qué se usó'] : []
}

const texto = (v: unknown) => (typeof v === 'string' ? v : '')
const etiqueta = (campo: string, codigo: unknown) => buscarOpcion(DEF_VIA, campo, texto(codigo))?.etiqueta ?? ''

// "{hora} · Tubo orotraqueal · 7,5 mm · fijado a 22 cm · 1 intento(s)"
export function tarjetaVia(r: RegistroMenu, formatHora: (iso: string) => string): string {
  const v = r.valores
  const usos = (Array.isArray(v['va.uso']) ? (v['va.uso'] as string[]) : []).map((u) => etiqueta('va.uso', u)).filter(Boolean)
  const mm = texto(v['int.numero_mm']).replace('_', ',')
  const intentos = texto(v['int.intentos'] || v['ml.intentos'])
  return [
    formatHora(r.hora),
    usos.join(' + '),
    etiqueta('ml.tipo', v['ml.tipo']),
    v['ml.numero'] ? `N° ${texto(v['ml.numero']).replace('_', ',')}` : '',
    mm ? `${mm} mm` : '',
    typeof v['int.fijado_cm'] === 'number' ? `fijado a ${v['int.fijado_cm']} cm` : '',
    intentos ? `${intentos === '3_mas' ? '3 o más' : intentos} intento(s)` : '',
  ]
    .filter(Boolean)
    .join(' · ')
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

// Versiones anteriores guardaban un único formulario (`valores`); ahora cada dispositivo es un registro.
export function migrarViaAerea(v: ViaAereaMenu | (ViaAereaV1 & { historial?: { usuario: string; hora: string }[] })): ViaAereaMenu {
  if ('registros' in v) return v
  const hora = v.historial?.[0]?.hora ?? v.eventos?.[0]?.hora ?? new Date().toISOString()
  const valores = 'eventos' in v ? unirV1(v) : v.valores
  const hayUso = Array.isArray(valores['va.uso']) && valores['va.uso'].length > 0
  return {
    registros: hayUso ? [{ id: 'via-migrada', hora, valores, historial: v.historial?.slice(1) }] : [],
    legado: 'eventos' in v ? v : undefined,
  }
}

function unirV1(v: ViaAereaV1): Valores {
  const viejo = v
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
  for (const k of ['ais.dispositivo', 'ais.tdl_fr', 'ais.bloqueador_fr'] as const) if (efectivos[k] !== undefined) n[k] = efectivos[k]
  if (efectivos['ais.confirmado_fibroscopio'] !== undefined) n['ais.fibroscopio'] = efectivos['ais.confirmado_fibroscopio']
  if (typeof efectivos['pre.llega_con'] === 'string') n['pre.llega_con'] = efectivos['pre.llega_con'] === 'tet' ? 'tubo' : efectivos['pre.llega_con']
  if (efectivos['pre.diametro_mm'] !== undefined) n['pre.numero_mm'] = efectivos['pre.diametro_mm']
  if (efectivos['va.pack'] === true) n['va.otros'] = ['pack']
  return n
}
