import json from '../data/menus/accesos.json'
import { cargarMenu } from './cargar'
import { buscarOpcion, valoresPorDefecto } from './motor'
import type { PacienteMenu } from './paciente'
import type { MenuDef, RegistroMenu, SeccionDef, Valores } from './tipos'

export const DEF_ACCESOS: MenuDef = cargarMenu(json)
export const SECCIONES_ACCESO: SeccionDef[] = DEF_ACCESOS.secciones

// Sitio, vena o arteria según el tipo de acceso, y su calibre.
const CAMPO_SITIO: Record<string, string> = {
  vvp: 'vvp.sitio',
  midline: 'mid.vena',
  cvc: 'cvc.vena',
  picc: 'picc.vena',
  arterial: 'art.arteria',
  intraosea: 'io.sitio',
  umbilical: 'umb.tipo',
}
const CAMPO_CALIBRE: Record<string, string> = {
  vvp: 'vvp.calibre',
  midline: 'mid.calibre',
  cvc: 'cvc.calibre',
  picc: 'picc.calibre',
  arterial: 'art.calibre',
  umbilical: 'umb.calibre',
  intraosea: 'io.aguja',
}

const texto = (v: unknown) => (typeof v === 'string' ? v : '')
const opc = (campo: string, codigo: string) => buscarOpcion(DEF_ACCESOS, campo, codigo)
const abrev = (campo: string, codigo: string) => {
  const o = opc(campo, codigo)
  return o ? (o.abrev ?? o.etiqueta) : ''
}

// "{tipo} {calibre} · {sitio} {lado} · {hora} · {procedencia} · {quién | estado al llegar} · Eco · {n} intento(s)"
export function tarjetaAcceso(a: RegistroMenu, formatHora: (iso: string) => string): string {
  const v = a.valores
  const tipo = texto(v['acc.tipo'])
  const calibre = CAMPO_CALIBRE[tipo] ? abrev(CAMPO_CALIBRE[tipo], texto(v[CAMPO_CALIBRE[tipo]])) : ''
  const sitio = CAMPO_SITIO[tipo] ? abrev(CAMPO_SITIO[tipo], texto(v[CAMPO_SITIO[tipo]])) : ''
  const lado = abrev('acc.lado', texto(v['acc.lado']))
  const pabellon = texto(v['acc.procedencia']) === 'pabellon'
  const intentos = texto(v['acc.intentos'])
  return [
    [abrev('acc.tipo', tipo) || 'Acceso', calibre].filter(Boolean).join(' '),
    [sitio, lado].filter(Boolean).join(' '),
    formatHora(a.hora),
    abrev('acc.procedencia', texto(v['acc.procedencia'])),
    pabellon ? abrev('acc.quien', texto(v['acc.quien'])) : (opc('acc.estado_llegada', texto(v['acc.estado_llegada']))?.etiqueta ?? ''),
    v['acc.eco'] === true ? 'Eco' : '',
    pabellon && intentos ? `${intentos === '3_mas' ? '3 o más' : intentos} intento(s)` : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

export const defaultsAcceso = (): Valores => valoresPorDefecto(SECCIONES_ACCESO)

// Sugerencia de profundidad del CVC (Peres en adulto, Andropoulos en niños): orientativa.
export function sugerirAcceso(campoId: string, version: 'adulto' | 'ped', p: PacienteMenu, valores: Valores) {
  if (campoId !== 'cvc.fijado_cm' || p.tallaCm === undefined) return null
  const vena = texto(valores['cvc.vena'])
  const lado = texto(valores['acc.lado'])
  if ((vena !== 'yugular_interna' && vena !== 'subclavia') || (lado !== 'derecho' && lado !== 'izquierdo')) return null
  const t = p.tallaCm / 10
  let v: number
  if (version === 'ped') {
    if (lado !== 'derecho') return null
    v = p.tallaCm <= 100 ? t - 1 : t - 2
  } else {
    v = t + ({ 'yugular_interna:derecho': 0, 'subclavia:derecho': -2, 'yugular_interna:izquierdo': 4, 'subclavia:izquierdo': 2 }[`${vena}:${lado}`] ?? 0)
  }
  return { texto: `${v.toFixed(1).replace('.', ',')} cm. Orientativo: no reemplaza confirmar la punta`, valor: Math.round(v * 2) / 2 }
}

// --- Registros guardados con versiones anteriores → códigos actuales ---
const SITIO_VVP: Record<string, string> = { dorso_mano: 'mano', pie_tobillo: 'pie' }
const CALIBRE_CVC: Record<string, string> = { '3_4fr': '4fr', '5_5_5fr': '5fr', hd_11_5_14fr: '12fr_mas' }
const AGUJA_IO: Record<string, string> = { ezio_15: '15mm', ezio_25: '25mm', ezio_45: '45mm', manual_otro: 'manual' }

interface AccesoLegado {
  id: string
  hora: string
  tipo: string
  ubicacion: string
  lado: string
  calibre: string
}

const TIPO_LEGADO: Record<string, string> = { VVP: 'vvp', PICC: 'picc', VVC: 'cvc', LINEA_ARTERIAL: 'arterial' }

// Primera versión de la app: texto libre (p. ej. "Antebrazo izquierdo").
export function migrarAccesoLegado(a: AccesoLegado): RegistroMenu {
  const tipo = TIPO_LEGADO[a.tipo] ?? 'otro'
  const u = (a.ubicacion ?? '').toLowerCase()
  const lado = u.includes('derech') ? 'derecho' : u.includes('izquierd') ? 'izquierdo' : a.lado === 'Derecho' ? 'derecho' : a.lado === 'Izquierdo' ? 'izquierdo' : undefined
  const valores: Valores = { 'acc.tipo': tipo, 'acc.procedencia': 'pabellon', 'acc.hora': a.hora }
  if (lado) valores['acc.lado'] = lado
  if (tipo === 'vvp') {
    if (a.calibre) valores['vvp.calibre'] = a.calibre.toLowerCase()
    valores['vvp.sitio'] = u.includes('mano') ? 'mano' : u.includes('antebrazo') ? 'antebrazo' : 'otro'
  } else if (tipo === 'picc') {
    valores['picc.vena'] = u.includes('bas') ? 'basilica' : u.includes('cef') ? 'cefalica' : 'otra'
  } else if (tipo === 'cvc') {
    valores['cvc.vena'] = u.includes('yugular') ? 'yugular_interna' : u.includes('subclavia') ? 'subclavia' : u.includes('femoral') ? 'femoral' : 'otra'
  } else if (tipo === 'arterial') {
    valores['art.arteria'] = u.includes('radial') ? 'radial' : u.includes('femoral') ? 'femoral' : u.includes('braquial') ? 'braquial' : 'otra'
  }
  return { id: a.id, hora: a.hora, valores, legado: a }
}

// Menús de clic 1.0 → 3.0 (códigos que cambiaron o campos que se movieron). Lo que ya no existe se conserva sin usarse.
export function migrarAccesoV1(a: RegistroMenu): RegistroMenu {
  const v: Valores = { ...a.valores }
  const mover = (de: string, a2: string, mapa?: Record<string, string>) => {
    if (!(de in v)) return
    const x = v[de]
    delete v[de]
    v[a2] = typeof x === 'string' && mapa ? (mapa[x] ?? x) : x
  }
  if (v['acc.tipo'] === 'port_tunelizado') v['acc.tipo'] = 'port'
  if (v['acc.tipo'] === 'vvp' && v['vvp.tipo'] === 'largo_midline') {
    v['acc.tipo'] = 'midline'
    mover('vvp.calibre', 'mid.calibre')
  }
  if (typeof v['vvp.sitio'] === 'string') v['vvp.sitio'] = SITIO_VVP[v['vvp.sitio']] ?? v['vvp.sitio']
  if (v['acc.procedencia'] === 'externo') v['acc.procedencia'] = 'otro'
  if (v['acc.intentos'] === '4_mas' || v['acc.intentos'] === '3') v['acc.intentos'] = '3_mas'
  if (v['acc.lado'] === 'no_aplica') delete v['acc.lado']
  const vip = typeof v['acc.flebitis_vip'] === 'string' ? Number(String(v['acc.flebitis_vip']).replace('vip_', '')) : undefined
  if (v['acc.procedencia'] && v['acc.procedencia'] !== 'pabellon') {
    const antes = v['acc.estado_llegada']
    if (vip !== undefined && vip >= 2) v['acc.estado_llegada'] = 'flebitis'
    else if (antes === 'funciona' || (vip !== undefined && antes === undefined)) v['acc.estado_llegada'] = 'funciona'
    else if (antes === 'pasa_no_refluye' || antes === 'infiltrado' || antes === 'no_funciona') v['acc.estado_llegada'] = 'no_funciona'
  }
  if (Array.isArray(v['acc.rescate'])) v['acc.eco'] = (v['acc.rescate'] as string[]).includes('eco') || v['acc.guia'] === 'eco'
  else if (v['acc.guia'] === 'eco') v['acc.eco'] = true
  mover('picc.largo_insertado_cm', 'picc.largo_cm')
  mover('cvc.tipo', 'cvc.cateter')
  if (v['cvc.vena'] === 'axilar') v['cvc.vena'] = 'otra'
  if (typeof v['cvc.calibre'] === 'string') v['cvc.calibre'] = CALIBRE_CVC[v['cvc.calibre']] ?? v['cvc.calibre']
  if (v['art.arteria'] === 'cubital' || v['art.arteria'] === 'axilar') v['art.arteria'] = 'otra'
  if (v['io.sitio'] === 'humero_proximal') v['io.sitio'] = 'humero'
  if (typeof v['io.aguja'] === 'string') v['io.aguja'] = AGUJA_IO[v['io.aguja']] ?? v['io.aguja']
  if (typeof v['port.tipo'] === 'string') v['port.tipo'] = String(v['port.tipo']).startsWith('port') ? 'port' : String(v['port.tipo']).startsWith('tunel') ? 'tunelizado' : v['port.tipo']
  if (v['port.uso'] === 'se_punciona') v['port.puncionado'] = true
  if (v['umb.tipo'] === 'cvu') v['umb.tipo'] = 'venoso'
  if (v['umb.tipo'] === 'cau') v['umb.tipo'] = 'arterial'
  if (!('acc.hora' in v)) v['acc.hora'] = a.hora
  return { ...a, valores: v }
}
