import json from '../data/menus/accesos.json'
import type { PacienteMenu } from './paciente'
import { buscarOpcion } from './motor'
import type { Alerta, MenuDef, RegistroMenu, Valores, VersionMenu } from './tipos'
import type { Sugerencia } from './sugerencias'

export const DEF_ACCESOS = json as unknown as MenuDef

export const SECCION_ANTES = DEF_ACCESOS.secciones.find((s) => s.id === 'antes')!
export const SECCIONES_ACCESO = DEF_ACCESOS.secciones.filter((s) => s.ambito === 'evento')

const CAMPO_SITIO: Record<string, string> = {
  vvp: 'vvp.sitio',
  picc: 'picc.vena',
  cvc: 'cvc.vena',
  arterial: 'art.arteria',
  intraosea: 'io.sitio',
  port_tunelizado: 'port.tipo',
  umbilical: 'umb.tipo',
}
const CAMPO_CALIBRE: Record<string, string> = {
  vvp: 'vvp.calibre',
  picc: 'picc.calibre',
  cvc: 'cvc.calibre',
  arterial: 'art.calibre',
  umbilical: 'umb.calibre',
}

const texto = (v: unknown) => (typeof v === 'string' ? v : '')
const opc = (campo: string, codigo: string) => buscarOpcion(DEF_ACCESOS, campo, codigo)
const abrev = (campo: string, codigo: string) => {
  const o = opc(campo, codigo)
  return o ? (o.abrev ?? o.etiqueta) : ''
}

// "{tipo} {calibre} · {sitio} {lado} · {hora} · {procedencia} · {quién | VIP n}"
export function tarjetaAcceso(a: RegistroMenu, formatHora: (iso: string) => string): string {
  const v = a.valores
  const tipo = texto(v['acc.tipo'])
  const calibre = CAMPO_CALIBRE[tipo] ? abrev(CAMPO_CALIBRE[tipo], texto(v[CAMPO_CALIBRE[tipo]])) : ''
  const sitio = CAMPO_SITIO[tipo] ? abrev(CAMPO_SITIO[tipo], texto(v[CAMPO_SITIO[tipo]])) : ''
  const lado = texto(v['acc.lado']) === 'no_aplica' ? '' : abrev('acc.lado', texto(v['acc.lado']))
  const procedencia = abrev('acc.procedencia', texto(v['acc.procedencia']))
  const vip = opc('acc.flebitis_vip', texto(v['acc.flebitis_vip']))
  const ultimo = texto(v['acc.procedencia']) === 'pabellon' ? abrev('acc.quien', texto(v['acc.quien'])) : vip ? `VIP ${vip.valor}` : ''
  return [
    [abrev('acc.tipo', tipo) || 'Acceso', calibre].filter(Boolean).join(' '),
    [sitio, lado].filter(Boolean).join(' '),
    formatHora(a.hora),
    procedencia,
    ultimo,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function complicacionesAcceso(v: Valores): string[] {
  const propias = ['picc.complicaciones_propias', 'cvc.complicaciones_propias', 'art.complicaciones_propias']
  return [v['acc.complicaciones'], ...propias.map((p) => v[p])].flatMap((x) => (Array.isArray(x) ? x : [])).filter((x) => x !== 'ninguna')
}

export interface CalculadosAcceso {
  exitoPrimerIntento: boolean | null
  dificilReal: boolean | null
  flebitis: boolean | null
  cvcSeguro: boolean | null
}

export function calculadosAcceso(v: Valores): CalculadosAcceso {
  const pabellon = v['acc.procedencia'] === 'pabellon'
  const intentos = texto(v['acc.intentos'])
  const comp = Array.isArray(v['acc.complicaciones']) ? (v['acc.complicaciones'] as string[]) : []
  const rescate = Array.isArray(v['acc.rescate']) ? (v['acc.rescate'] as string[]) : []
  const vip = opc('acc.flebitis_vip', texto(v['acc.flebitis_vip']))?.valor
  const seg = v['cvc.seguridad']
  return {
    exitoPrimerIntento: pabellon && intentos ? intentos === '1' && !comp.includes('no_se_logro') : null,
    dificilReal:
      pabellon && intentos
        ? intentos === '3' || intentos === '4_mas' || (intentos === '2' && comp.includes('no_se_logro')) || rescate.includes('eco') || rescate.includes('cambio_operador')
        : null,
    flebitis: !pabellon && vip !== undefined ? vip >= 2 : null,
    cvcSeguro:
      v['acc.tipo'] === 'cvc' && seg && typeof seg === 'object' && !Array.isArray(seg)
        ? ['barreras_maximas', 'vena_confirmada', 'guia_retirada'].every((k) => seg[k] === true)
        : null,
  }
}

// Extremidad (superior/inferior) + lado del sitio elegido, contra las restricciones del caso.
export function extremidadRestringida(acceso: Valores, casoValores: Valores): boolean {
  const tipo = texto(acceso['acc.tipo'])
  const sitioCampo = CAMPO_SITIO[tipo]
  const ext = sitioCampo ? opc(sitioCampo, texto(acceso[sitioCampo]))?.extremidad : undefined
  const lado = texto(acceso['acc.lado'])
  const restr = Array.isArray(casoValores['acc.extremidad_restringida']) ? (casoValores['acc.extremidad_restringida'] as string[]) : []
  if (!ext || (lado !== 'derecho' && lado !== 'izquierdo')) return false
  const sufijo = lado === 'derecho' ? 'der' : 'izq'
  if (ext === 'superior') return restr.includes(`brazo_${sufijo}`)
  if (ext === 'inferior') return restr.includes(`pierna_${sufijo}`)
  return false
}

// Alertas que el JSON describe solo con texto (si_texto) o que dependen de otros datos.
export function alertasEspeciales(campoId: string, valores: Valores, casoValores: Valores, hora?: string, ahora = Date.now()): Alerta[] {
  const r: Alerta[] = []
  if (campoId === 'acc.lado' && extremidadRestringida(valores, casoValores)) {
    r.push({ nivel: 'roja', mensaje: 'Extremidad restringida: no puncionar ni poner el manguito de presión aquí.' })
  }
  if (campoId === 'cvc.seguridad') {
    const seg = valores['cvc.seguridad']
    if (seg && typeof seg === 'object' && !Array.isArray(seg) && ['barreras_maximas', 'vena_confirmada', 'guia_retirada'].some((k) => seg[k] === false)) {
      r.push({ nivel: 'roja', mensaje: 'Punto de seguridad del CVC no cumplido: revisar ahora.' })
    }
  }
  if (campoId === 'io.posicion_confirmada' && hora && ahora - Date.parse(hora) >= 24 * 3600000 && valores['acc.al_salir'] !== 'retirado') {
    r.push({ nivel: 'amarilla', mensaje: 'IO con 24 h: retirar apenas haya otro acceso.' })
  }
  return r
}

const resultado = (texto: string, valor?: number): Sugerencia => ({ texto, valor })

// 6.6 del CVC (Peres en adulto, Andropoulos en pediátrica) y aguja IO por peso.
export function sugerirAcceso(campoId: string, version: VersionMenu, p: PacienteMenu, valores: Valores): Sugerencia | null {
  if (campoId === 'cvc.fijado_cm' && p.tallaCm !== undefined) {
    const vena = texto(valores['cvc.vena'])
    const lado = texto(valores['acc.lado'])
    if (vena !== 'yugular_interna' && vena !== 'subclavia') return null
    if (lado !== 'derecho' && lado !== 'izquierdo') return null
    const t = p.tallaCm / 10
    if (version === 'ped') {
      if (lado !== 'derecho') return null
      const v = p.tallaCm <= 100 ? t - 1 : t - 2
      return resultado(`${v.toFixed(1).replace('.', ',')} cm (Andropoulos). Orientativo: no reemplaza confirmar la punta`, Math.round(v * 2) / 2)
    }
    const ajuste = { 'yugular_interna:derecho': 0, 'subclavia:derecho': -2, 'yugular_interna:izquierdo': 4, 'subclavia:izquierdo': 2 }[`${vena}:${lado}`] ?? 0
    const v = t + ajuste
    return resultado(`${v.toFixed(1).replace('.', ',')} cm (Peres). Orientativo: no reemplaza confirmar la punta`, Math.round(v * 2) / 2)
  }
  if (campoId === 'io.aguja' && version === 'ped' && p.pesoKg !== undefined) {
    const campo = DEF_ACCESOS.secciones.flatMap((s) => s.campos).find((c) => c.id === 'io.aguja')
    const ok = (campo?.opciones ?? []).filter((o) => (o.peso_min_kg === undefined || p.pesoKg! >= o.peso_min_kg) && (o.peso_max_kg === undefined || p.pesoKg! <= o.peso_max_kg) && o.codigo !== 'manual_otro')
    if (ok.length) return { texto: ok.map((o) => o.etiqueta).join(' · '), codigos: ok.map((o) => o.codigo) }
  }
  return null
}

// --- Registros antiguos (antes de los menús de clic) → códigos ---
interface AccesoLegado {
  id: string
  hora: string
  tipo: string
  ubicacion: string
  lado: string
  calibre: string
}

const TIPO_LEGADO: Record<string, string> = { VVP: 'vvp', PICC: 'picc', VVC: 'cvc', LINEA_ARTERIAL: 'arterial' }

export function migrarAccesoLegado(a: AccesoLegado): RegistroMenu {
  const tipo = TIPO_LEGADO[a.tipo] ?? 'otro'
  const u = (a.ubicacion ?? '').toLowerCase()
  const lado = u.includes('derech') ? 'derecho' : u.includes('izquierd') ? 'izquierdo' : a.lado === 'Derecho' ? 'derecho' : a.lado === 'Izquierdo' ? 'izquierdo' : 'no_aplica'
  const valores: Valores = { 'acc.tipo': tipo, 'acc.procedencia': 'pabellon', 'acc.lado': lado, 'acc.al_salir': 'queda_instalado' }
  if (tipo === 'vvp') {
    valores['vvp.tipo'] = 'corto'
    if (a.calibre) valores['vvp.calibre'] = a.calibre.toLowerCase()
    valores['vvp.sitio'] = u.includes('mano') ? 'dorso_mano' : u.includes('antebrazo') ? 'antebrazo' : 'otro'
  } else if (tipo === 'picc') {
    valores['picc.vena'] = u.includes('bas') ? 'basilica' : u.includes('cef') ? 'cefalica' : 'otra'
  } else if (tipo === 'cvc') {
    valores['cvc.vena'] = u.includes('yugular') ? 'yugular_interna' : u.includes('subclavia') ? 'subclavia' : u.includes('axilar') ? 'axilar' : u.includes('femoral') ? 'femoral' : 'otra'
  } else if (tipo === 'arterial') {
    valores['art.arteria'] = u.includes('radial') ? 'radial' : u.includes('ulnar') || u.includes('cubital') ? 'cubital' : u.includes('braquial') ? 'braquial' : u.includes('femoral') ? 'femoral' : 'otra'
  }
  return { id: a.id, hora: a.hora, valores, legado: a } as RegistroMenu
}

import type { CasoAnestesico } from '../types'
import { calcularVisibilidad, faltantes, valoresPorDefecto } from './motor'
import { versionMenu } from './paciente'

export const defaultsAcceso = () => valoresPorDefecto(SECCIONES_ACCESO)

// Lo que falta para cerrar la hoja: sección 1 (caso) con sus campos obligatorios.
export function pendientesAccesos(c: CasoAnestesico): string[] {
  const version = versionMenu(c)
  const vis = calcularVisibilidad(DEF_ACCESOS, c.accesosCaso, version)
  return faltantes([SECCION_ANTES], c.accesosCaso, vis, version).map((f) => `Accesos vasculares ${f.numero}. ${f.etiqueta}`)
}
