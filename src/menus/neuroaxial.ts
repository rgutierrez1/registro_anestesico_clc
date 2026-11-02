import json from '../data/menus/neuroaxial.json'
import type { TecnicaRegional } from '../types'
import { cargarMenu } from './cargar'
import { buscarOpcion } from './motor'
import type { MenuDef, RegistroMenu, SeccionDef } from './tipos'

export const DEF_NEUROAXIAL: MenuDef = cargarMenu(json)
export const SECCIONES_NEUROAXIAL: SeccionDef[] = DEF_NEUROAXIAL.secciones

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

// "{hora} · Raquídea (subaracnoidea) · L3-L4 · Bupivacaína pesada 12 mg"
export function tarjetaNeuroaxial(r: RegistroMenu, formatHora: (iso: string) => string): string {
  const v = r.valores
  return [
    formatHora(r.hora),
    buscarOpcion(DEF_NEUROAXIAL, 'neu.tipo', texto(v['neu.tipo']))?.etiqueta ?? '',
    texto(v['neu.nivel']),
    [texto(v['neu.farmaco']), texto(v['neu.dosis'])].filter(Boolean).join(' '),
    v['neu.resultado'] === 'fallida' ? 'Fallida' : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

// Las técnicas regionales guardadas antes de separar los bloqueos: raquídea, epidural y combinada van aquí.
export const esTecnicaNeuroaxial = (t: TecnicaRegional) => /raqu|epidural|peridural|combinada/i.test(t.tipo)

export function migrarTecnicaNeuroaxial(t: TecnicaRegional): RegistroMenu {
  const tipo = /combinada/i.test(t.tipo) ? 'combinada' : /epidural|peridural/i.test(t.tipo) ? 'peridural' : 'raquidea'
  const valores: RegistroMenu['valores'] = { 'neu.tipo': tipo, 'neu.resultado': t.exitosa ? 'exitosa' : 'fallida' }
  if (t.nivel) valores['neu.nivel'] = t.nivel
  if (t.agujaOKit) valores['neu.aguja'] = t.agujaOKit
  if (t.farmaco) valores['neu.farmaco'] = t.farmaco
  if (t.dosis) valores['neu.dosis'] = t.dosis
  if (t.notas) valores['neu.notas'] = t.notas
  return { id: t.id, hora: t.hora, valores, legado: t }
}
