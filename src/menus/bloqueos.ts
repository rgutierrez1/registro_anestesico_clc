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

// Borrador del texto final a partir de lo registrado; se puede editar.
export function textoBloqueo(v: Valores): string {
  const tipo = v['blq.tipo'] === 'otro' ? texto(v['blq.detalle']) || 'otro' : conOtro(v, 'blq.tipo')
  if (!tipo) return ''
  const lado = etiqueta('blq.lateralidad', v['blq.lateralidad'])
  const partes: string[] = [`Bloqueo ${tipo.toLowerCase()}${lado && lado !== 'No aplica' ? ` ${lado.toLowerCase()}` : ''}`]
  const tecnica: string[] = []
  if (v['blq.eco'] === true) tecnica.push(`ecoguiado${v['blq.sonda'] ? ` con sonda ${etiqueta('blq.sonda', v['blq.sonda']).toLowerCase()}` : ''}`)
  if (v['blq.neuroestimulador'] === true) tecnica.push(`con neuroestimulación${texto(v['blq.neuro_parametros']) ? ` (${texto(v['blq.neuro_parametros'])})` : ''}`)
  if (tecnica.length) partes[0] += `, ${tecnica.join(' y ')}`
  const modalidad = etiqueta('blq.modalidad', v['blq.modalidad'])
  if (modalidad) partes[0] += `, ${modalidad.toLowerCase()}`
  // Registros anteriores guardaban la aguja como texto libre.
  const aguja = conOtro(v, 'blq.aguja') || texto(v['blq.aguja'])
  if (aguja) partes.push(`Aguja ${aguja}${typeof v['blq.profundidad_mm'] === 'number' ? `, profundidad ${v['blq.profundidad_mm']} mm` : ''}.`)
  const anestesico = conOtro(v, 'blq.anestesico')
  if (anestesico) {
    const coad = [1, 2]
      .map((n) => (v[`blq.coad${n}`] ? `${etiqueta(`blq.coad${n}`, v[`blq.coad${n}`])}${texto(v[`blq.coad${n}_dosis`]) ? ` ${texto(v[`blq.coad${n}_dosis`])}` : ''}` : ''))
      .filter(Boolean)
    partes.push(
      `Se administró ${anestesico.toLowerCase()}${typeof v['blq.dosis_mg'] === 'number' ? ` ${v['blq.dosis_mg']} mg` : ''}${v['blq.volumen_ml'] ? ` en ${etiqueta('blq.volumen_ml', v['blq.volumen_ml'])}` : ''}${coad.length ? `, con ${coad.join(' y ').toLowerCase()}` : ''}.`,
    )
  }
  const sed = etiqueta('blq.sedacion', v['blq.sedacion'])
  if (sed) partes.push(`Sedación: ${sed.toLowerCase()}.`)
  const comp = v['blq.comp_inmediatas']
  if (comp === 'no') partes.push('Sin complicaciones inmediatas.')
  else if (comp === 'si') partes.push(`Complicaciones inmediatas${texto(v['blq.comp_otras']) ? `: ${texto(v['blq.comp_otras'])}` : ''}.`)
  else if (comp === 'pendiente') partes.push('Complicaciones inmediatas pendientes de evaluación.')
  return partes.join('. ').replace(/\.\./g, '.').replace(/\. \./g, '.')
}

// Técnicas regionales guardadas antes de este registro: se conservan como bloqueo "Otro" con su detalle.
export function migrarTecnicaRegional(t: TecnicaRegional): RegistroMenu {
  const detalle = [t.tipo, t.nivel, t.agujaOKit && `aguja/kit ${t.agujaOKit}`, [t.farmaco, t.dosis].filter(Boolean).join(' '), t.exitosa ? '' : 'fallida', t.notas].filter(Boolean).join(' · ')
  return { id: t.id, hora: t.hora, valores: { 'blq.tipo': 'otro', 'blq.detalle': detalle }, legado: t }
}
