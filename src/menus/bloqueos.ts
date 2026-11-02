import json from '../data/menus/bloqueos.json'
import type { TecnicaRegional } from '../types'
import { cargarMenu } from './cargar'
import { buscarOpcion, claveTexto } from './motor'
import type { MenuDef, RegistroMenu, SeccionDef, Valores } from './tipos'

export const DEF_BLOQUEOS: MenuDef = cargarMenu(json)
export const SECCIONES_BLOQUEO: SeccionDef[] = DEF_BLOQUEOS.secciones

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const etiqueta = (campo: string, codigo: unknown) => buscarOpcion(DEF_BLOQUEOS, campo, texto(codigo))?.etiqueta ?? ''

// Etiqueta de una opción; si es "Otro", el texto que se escribió.
function conOtro(v: Valores, campo: string): string {
  const cod = texto(v[campo])
  if (!cod) return ''
  const otro = texto(v[claveTexto(campo, cod)])
  return cod === 'otro' && otro ? otro : etiqueta(campo, cod)
}

// "{hora} · Interescalénico derecha · Ropivacaína 150 mg · Eco · Catéter"
export function tarjetaBloqueo(r: RegistroMenu, formatHora: (iso: string) => string): string {
  const v = r.valores
  const lado = etiqueta('blq.lateralidad', v['blq.lateralidad'])
  return [
    formatHora(r.hora),
    [conOtro(v, 'blq.tipo'), lado && lado !== 'No aplica' ? lado.toLowerCase() : ''].filter(Boolean).join(' '),
    [conOtro(v, 'blq.anestesico'), typeof v['blq.dosis_mg'] === 'number' ? `${v['blq.dosis_mg']} mg` : ''].filter(Boolean).join(' '),
    v['blq.eco'] === true ? 'Eco' : '',
    v['blq.modalidad'] === 'cateter' ? 'Catéter' : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

// Concentración del anestésico: dosis (mg) ÷ volumen (mL) = mg/mL; 10 mg/mL equivale a 1 %.
export function concentracionAnestesico(v: Valores): { mgPorMl: number; porcentaje: number } | null {
  const dosis = v['blq.dosis_mg']
  const volumen = Number(texto(v['blq.volumen_ml']))
  if (typeof dosis !== 'number' || !Number.isFinite(volumen) || volumen <= 0) return null
  const mgPorMl = dosis / volumen
  return { mgPorMl, porcentaje: mgPorMl / 10 }
}

const coma = (n: number) => String(Math.round(n * 1000) / 1000).replace('.', ',')

export function textoConcentracion(v: Valores): string {
  const c = concentracionAnestesico(v)
  return c ? `${coma(c.porcentaje)} % (${coma(c.mgPorMl)} mg/mL)` : ''
}

const minus = (t: string) => t.toLowerCase()

function observaciones(v: Valores): string {
  const campos: [string, string][] = [
    ['blq.aspiracion', 'aspiración de sangre'],
    ['blq.parestesia', 'parestesia'],
    ['blq.intravascular', 'signos ecográficos de inyección intravascular'],
    ['blq.intraneural', 'signos ecográficos de inyección intraneural'],
  ]
  const dados = campos.filter(([id]) => v[id])
  if (!dados.length) return ''
  if (dados.length === campos.length && dados.every(([id]) => v[id] === 'no')) {
    return 'Sin aspiración de sangre, parestesia ni signos ecográficos de inyección intravascular o intraneural'
  }
  const texto1 = dados.map(([id, nombre]) => `${nombre}: ${minus(etiqueta(id, v[id]))}`).join('; ')
  const conducta = texto(v['blq.conducta'])
  return `Durante la inyección: ${texto1}${conducta ? `. Conducta: ${conducta}` : ''}`
}

function catéter(v: Valores): string {
  if (v['blq.modalidad'] !== 'cateter') return ''
  const partes = [
    texto(v['blq.cat_ubicacion']) && `ubicación ${texto(v['blq.cat_ubicacion'])}`,
    typeof v['blq.cat_fijacion_cm'] === 'number' && `fijado en piel a ${v['blq.cat_fijacion_cm']} cm`,
    conOtro(v, 'blq.cat_metodo') && `método de fijación: ${minus(conOtro(v, 'blq.cat_metodo'))}`,
    conOtro(v, 'blq.cat_esquema') && `esquema de infusión ${conOtro(v, 'blq.cat_esquema')}`,
    conOtro(v, 'blq.cat_solucion') && `solución: ${minus(conOtro(v, 'blq.cat_solucion'))}`,
    conOtro(v, 'blq.cat_destino') && `destino: ${minus(conOtro(v, 'blq.cat_destino'))}`,
  ].filter(Boolean)
  return partes.length ? `Catéter: ${partes.join(', ')}` : ''
}

function complicaciones(v: Valores): string {
  const g = v['blq.comp_inmediatas']
  if (g === 'no') return 'Sin complicaciones inmediatas'
  if (g === 'pendiente') return 'Complicaciones inmediatas pendientes de evaluación'
  if (g !== 'si') return ''
  const lista = [
    v['blq.comp_toxicidad'] === 'si' && 'toxicidad sistémica por anestésicos locales',
    (v['blq.comp_puncion_vascular'] === 'arterial' || v['blq.comp_puncion_vascular'] === 'venosa') && `punción vascular ${v['blq.comp_puncion_vascular']}`,
    v['blq.comp_hematoma'] === 'si' && 'hematoma',
    texto(v['blq.comp_otras']),
  ].filter(Boolean)
  return `Complicaciones inmediatas${lista.length ? `: ${lista.join(', ')}` : ''}`
}

// Texto final armado con lo registrado en las secciones 1 a 5; se actualiza solo mientras no se edite a mano.
export function textoBloqueo(v: Valores): string {
  const tipo = v['blq.tipo'] === 'otro' ? texto(v['blq.detalle']) || 'otro' : conOtro(v, 'blq.tipo')
  if (!tipo) return ''
  const lado = etiqueta('blq.lateralidad', v['blq.lateralidad'])
  const tecnica: string[] = []
  if (v['blq.eco'] === true) {
    tecnica.push(`ecoguiado${v['blq.sonda'] ? ` con sonda ${minus(etiqueta('blq.sonda', v['blq.sonda']))}` : ''}${texto(v['blq.proteccion_sonda']) ? ` y ${minus(texto(v['blq.proteccion_sonda']))}` : ''}`)
  } else if (v['blq.eco'] === false) tecnica.push('sin ecografía')
  if (v['blq.neuroestimulador'] === true) tecnica.push(`con neuroestimulación${texto(v['blq.neuro_parametros']) ? ` (${texto(v['blq.neuro_parametros'])})` : ''}`)
  const modalidad = etiqueta('blq.modalidad', v['blq.modalidad'])
  const primera = `Bloqueo ${minus(tipo)}${lado && lado !== 'No aplica' ? ` ${minus(lado)}` : ''}${tecnica.length ? `, ${tecnica.join(', ')}` : ''}${modalidad ? `, ${minus(modalidad)}` : ''}`

  // Registros anteriores guardaban la aguja como texto libre.
  const aguja = conOtro(v, 'blq.aguja') || texto(v['blq.aguja'])
  const anestesico = conOtro(v, 'blq.anestesico')
  const coad = [1, 2]
    .map((n) => (v[`blq.coad${n}`] ? `${minus(etiqueta(`blq.coad${n}`, v[`blq.coad${n}`]))}${texto(v[`blq.coad${n}_dosis`]) ? ` ${texto(v[`blq.coad${n}_dosis`])}` : ''}` : ''))
    .filter(Boolean)
  const conc = concentracionAnestesico(v)
  const sed = etiqueta('blq.sedacion', v['blq.sedacion'])

  return [
    primera,
    aguja && `Aguja ${aguja}${typeof v['blq.profundidad_mm'] === 'number' ? `, profundidad ${v['blq.profundidad_mm']} mm` : ''}`,
    anestesico &&
      `Se administró ${minus(anestesico)}${typeof v['blq.dosis_mg'] === 'number' ? ` ${v['blq.dosis_mg']} mg` : ''}${v['blq.volumen_ml'] ? ` en ${etiqueta('blq.volumen_ml', v['blq.volumen_ml'])}` : ''}${conc ? `, a una concentración de ${coma(conc.porcentaje)} %` : ''}${coad.length ? `, con ${coad.join(' y ')}` : ''}${texto(v['blq.obs_medicamentos']) ? `. ${texto(v['blq.obs_medicamentos'])}` : ''}`,
    sed && `Sedación: ${minus(sed)}`,
    observaciones(v),
    catéter(v),
    complicaciones(v),
  ]
    .filter(Boolean)
    .map((x) => `${String(x).replace(/\.$/, '')}.`)
    .join(' ')
}

// Técnicas regionales guardadas antes de este registro: se conservan como bloqueo "Otro" con su detalle.
export function migrarTecnicaRegional(t: TecnicaRegional): RegistroMenu {
  const detalle = [t.tipo, t.nivel, t.agujaOKit && `aguja/kit ${t.agujaOKit}`, [t.farmaco, t.dosis].filter(Boolean).join(' '), t.exitosa ? '' : 'fallida', t.notas].filter(Boolean).join(' · ')
  return { id: t.id, hora: t.hora, valores: { 'blq.tipo': 'otro', 'blq.detalle': detalle }, legado: t }
}
