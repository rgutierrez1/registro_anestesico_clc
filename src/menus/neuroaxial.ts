import json from '../data/menus/neuroaxial.json'
import type { TecnicaRegional } from '../types'
import { cargarMenu } from './cargar'
import { buscarOpcion } from './motor'
import type { MenuDef, RegistroMenu, SeccionDef } from './tipos'

export const DEF_NEUROAXIAL: MenuDef = cargarMenu(json)
export const SECCIONES_NEUROAXIAL: SeccionDef[] = DEF_NEUROAXIAL.secciones

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

const DROGAS: { id: string; unidad: string }[] = [
  { id: 'lidocaina', unidad: 'mg' },
  { id: 'bupivacaina_isobarica', unidad: 'mg' },
  { id: 'bupivacaina_hiperbarica', unidad: 'mg' },
  { id: 'fentanilo', unidad: 'mcg' },
  { id: 'epinefrina', unidad: 'mcg' },
  { id: 'morfina', unidad: 'mcg' },
]

const etiqueta = (campo: string, codigo: unknown) => buscarOpcion(DEF_NEUROAXIAL, campo, texto(codigo))?.etiqueta ?? ''

// Fármacos con su dosis: "Bupivacaína 12,5 mg + Fentanilo 15 mcg" (o el texto libre de registros anteriores).
export function farmacosNeuroaxial(v: RegistroMenu['valores']): string {
  const elegidos = Array.isArray(v['neu.drogas']) ? (v['neu.drogas'] as string[]) : []
  const lista = DROGAS.filter((d) => elegidos.includes(d.id)).map((d) => {
    const dosis = v[`neu.dosis_${d.id}`]
    return `${etiqueta('neu.drogas', d.id)}${typeof dosis === 'number' ? ` ${String(dosis).replace('.', ',')} ${d.unidad}` : ''}`
  })
  const antiguo = [texto(v['neu.farmaco']), texto(v['neu.dosis'])].filter(Boolean).join(' ')
  return lista.length ? lista.join(' + ') : antiguo
}

// Solo lo que se aparta de lo habitual (LCR claro y sin parestesias, punción dural ni sangre).
function hallazgos(v: RegistroMenu['valores']): string[] {
  const r: string[] = []
  const lcr = texto(v['neu.lcr'])
  if (lcr && lcr !== 'claro') r.push(`LCR ${lcr}`)
  if (v['neu.epi_puncion_dural'] === true) r.push('Punción dural')
  if (v['neu.esp_parestesias'] === true || v['neu.epi_parestesias'] === true) r.push('Parestesias')
  if (v['neu.epi_sangre'] === true) r.push('Salida de sangre')
  return r
}

// "{hora} · Raquídea (subaracnoidea) · L3-L4 · Bupivacaína 12,5 mg + Fentanilo 15 mcg"
export function tarjetaNeuroaxial(r: RegistroMenu, formatHora: (iso: string) => string): string {
  const v = r.valores
  return [
    formatHora(r.hora),
    etiqueta('neu.tipo', v['neu.tipo']),
    etiqueta('neu.nivel', v['neu.nivel']) || texto(v['neu.nivel']),
    farmacosNeuroaxial(v),
    ...hallazgos(v),
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
  // El nivel, la aguja y los fármacos eran texto libre: se conservan en las notas.
  const notas = [t.nivel && `Nivel ${t.nivel}`, t.agujaOKit && `Aguja/kit ${t.agujaOKit}`, [t.farmaco, t.dosis].filter(Boolean).join(' '), t.notas].filter(Boolean).join(' · ')
  if (notas) valores['neu.notas'] = notas
  return { id: t.id, hora: t.hora, valores, legado: t }
}
