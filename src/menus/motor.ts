import type { CampoDef, Condicion, MenuDef, OpcionDef, SeccionDef, Valor, Valores, VersionMenu, Alerta } from './tipos'

export const CODIGOS_CON_TEXTO = ['otro', 'otra']

export interface Contexto {
  version: VersionMenu
  valores: Valores
}

export function claveTexto(id: string, codigo: string) {
  return `${id}#texto:${codigo}`
}
export const claveHoras = (id: string) => `${id}#horas`
export const claveHora = (id: string) => `${id}#hora`

export function vacio(v: Valor | undefined): boolean {
  return v === undefined || v === '' || (Array.isArray(v) && v.length === 0)
}

export function evaluar(cond: Condicion | undefined, ctx: Contexto): boolean {
  if (!cond) return true
  if ('todas' in cond) return cond.todas.every((c) => evaluar(c, ctx))
  if ('alguna' in cond) return cond.alguna.some((c) => evaluar(c, ctx))
  const v = ctx.valores[cond.campo]
  const ref = cond.valor
  switch (cond.op) {
    case 'eq':
      return v === ref
    case 'neq':
      // Mientras el campo de referencia no tiene valor, la condición no se cumple (no se abre nada por anticipado).
      return !vacio(v) && v !== ref
    case 'in':
      return Array.isArray(ref) && ref.includes(v)
    case 'not_in':
      return !vacio(v) && !(Array.isArray(ref) && ref.includes(v))
    case 'contiene':
      return Array.isArray(v) && v.includes(ref as string)
    case 'contiene_alguna':
      return Array.isArray(v) && Array.isArray(ref) && ref.some((r) => v.includes(r))
    case 'gte':
      return typeof v === 'number' && v >= (ref as number)
    case 'lt':
      return typeof v === 'number' && v < (ref as number)
    case 'lleno':
      return !vacio(v)
    case 'es_verdadero':
      return v === true
    case 'es_falso':
      return v === false
  }
}

const versionOk = (el: { version?: 'ped' }, version: VersionMenu) => el.version !== 'ped' || version === 'ped'

// Las opciones que se ven en esta versión y cuya condición se cumple.
export function opcionesVisibles(campo: CampoDef, ctx: Contexto): OpcionDef[] {
  return (campo.opciones ?? []).filter((o) => versionOk(o, ctx.version) && evaluar(o.mostrar_si, ctx))
}

function codigosElegidos(campo: CampoDef, v: Valor | undefined): string[] {
  if (campo.tipo === 'unica') return typeof v === 'string' ? [v] : []
  if (campo.tipo === 'multiple') return Array.isArray(v) ? v : []
  return []
}

export interface Visibilidad {
  campos: Set<string>
  secciones: Set<string>
}

// Un campo o sección referido por algún "abre" solo aparece mientras alguna opción elegida lo abra.
export function calcularVisibilidad(def: MenuDef, base: Valores, version: VersionMenu): Visibilidad {
  const abribles = new Set<string>()
  for (const s of def.secciones) for (const c of s.campos) for (const o of c.opciones ?? []) for (const id of o.abre ?? []) abribles.add(id)

  let visibles: Visibilidad = {
    campos: new Set(def.secciones.flatMap((s) => s.campos.map((c) => c.id))),
    secciones: new Set(def.secciones.map((s) => s.id)),
  }
  for (let vuelta = 0; vuelta < 8; vuelta++) {
    const valores: Valores = {}
    for (const [k, v] of Object.entries(base)) {
      const id = k.split('#')[0]
      if (visibles.campos.has(id) || !def.secciones.some((s) => s.campos.some((c) => c.id === id))) valores[k] = v
    }
    const ctx: Contexto = { version, valores }
    const abiertos = new Set<string>()
    for (const s of def.secciones) {
      if (!visibles.secciones.has(s.id)) continue
      for (const c of s.campos) {
        if (!visibles.campos.has(c.id)) continue
        for (const cod of codigosElegidos(c, valores[c.id])) {
          for (const id of c.opciones?.find((o) => o.codigo === cod)?.abre ?? []) abiertos.add(id)
        }
      }
    }
    const sig: Visibilidad = { campos: new Set(), secciones: new Set() }
    for (const s of def.secciones) {
      const sv = versionOk(s, version) && evaluar(s.mostrar_si, ctx) && (!abribles.has(s.id) || abiertos.has(s.id))
      if (sv) sig.secciones.add(s.id)
      for (const c of s.campos) {
        if (sv && versionOk(c, version) && evaluar(c.mostrar_si, ctx) && (!abribles.has(c.id) || abiertos.has(c.id))) sig.campos.add(c.id)
      }
    }
    const igual = sig.campos.size === visibles.campos.size && [...sig.campos].every((x) => visibles.campos.has(x))
    visibles = sig
    if (igual) break
  }
  return visibles
}

export function valoresPorDefecto(secciones: SeccionDef[]): Valores {
  const r: Valores = {}
  for (const s of secciones) for (const c of s.campos) if (c.por_defecto !== undefined) r[c.id] = c.por_defecto
  return r
}

export function campoCompleto(c: CampoDef, v: Valor | undefined): boolean {
  switch (c.tipo) {
    case 'si_no':
      return typeof v === 'boolean'
    case 'checklist': {
      const r = (typeof v === 'object' && !Array.isArray(v) ? v : {}) as Record<string, string | boolean>
      return (c.items ?? []).every((i) => (i.tipo === 'texto' ? typeof r[i.codigo] === 'string' && String(r[i.codigo]).trim() !== '' : typeof r[i.codigo] === 'boolean'))
    }
    case 'numero':
      return typeof v === 'number' || (typeof v === 'string' && v === c.boton_alternativo?.codigo)
    default:
      return !vacio(v) && !(typeof v === 'string' && v.trim() === '')
  }
}

export function esObligatorio(c: CampoDef, ctx: Contexto): boolean {
  return c.obligatorio === true || (c.obligatorio_si !== undefined && evaluar(c.obligatorio_si, ctx))
}

// Campos visibles y obligatorios que aún no están completos (o con un número fuera de rango).
export function faltantes(secciones: SeccionDef[], valores: Valores, vis: Visibilidad, version: VersionMenu): CampoDef[] {
  const ctx: Contexto = { version, valores }
  const r: CampoDef[] = []
  for (const s of secciones) {
    for (const c of s.campos) {
      if (!vis.campos.has(c.id)) continue
      const v = valores[c.id]
      const fuera = c.tipo === 'numero' && typeof v === 'number' && ((c.min !== undefined && v < c.min) || (c.max !== undefined && v > c.max))
      if ((esObligatorio(c, ctx) && !campoCompleto(c, v)) || fuera) r.push(c)
    }
  }
  return r
}

export function alertasDeCampo(c: CampoDef, ctx: Contexto): Alerta[] {
  return (c.alertas ?? []).filter((a) => a.si !== undefined && versionOk(a, ctx.version) && evaluar(a.si, ctx))
}

// Quita las claves de campos ocultos (para guardar solo lo que se ve).
export function soloVisibles(secciones: SeccionDef[], valores: Valores, vis: Visibilidad): Valores {
  const ids = new Set(secciones.flatMap((s) => s.campos.map((c) => c.id)))
  const r: Valores = {}
  for (const [k, v] of Object.entries(valores)) {
    const id = k.split('#')[0]
    if (ids.has(id) && vis.campos.has(id)) r[k] = v
  }
  return r
}

export function buscarOpcion(def: MenuDef, campoId: string, codigo: string): OpcionDef | undefined {
  for (const s of def.secciones) for (const c of s.campos) if (c.id === campoId) return c.opciones?.find((o) => o.codigo === codigo)
  return undefined
}

export function buscarCampo(def: MenuDef, campoId: string): CampoDef | undefined {
  for (const s of def.secciones) for (const c of s.campos) if (c.id === campoId) return c
  return undefined
}

// Aplica un cambio de valor respetando exclusivas, implica y horas por opción.
export function aplicarCambio(campo: CampoDef, valores: Valores, nuevo: Valor | undefined, ahoraIso: string): Valores {
  const r: Valores = { ...valores }
  if (nuevo === undefined) delete r[campo.id]
  else r[campo.id] = nuevo
  if (campo.tipo === 'multiple' && Array.isArray(nuevo)) {
    const previo = Array.isArray(valores[campo.id]) ? (valores[campo.id] as string[]) : []
    const agregados = nuevo.filter((x) => !previo.includes(x))
    let lista = nuevo
    for (const a of agregados) {
      const op = campo.opciones?.find((o) => o.codigo === a)
      if (campo.exclusivas?.includes(a)) lista = [a]
      else lista = lista.filter((x) => !campo.exclusivas?.includes(x))
      for (const i of op?.implica ?? []) if (!lista.includes(i)) lista = [...lista, i]
    }
    r[campo.id] = lista
    if (campo.cada_opcion_registra_hora) {
      const horas = { ...(valores[claveHoras(campo.id)] as Record<string, string> | undefined) }
      for (const a of agregados) horas[a] = ahoraIso
      for (const k of Object.keys(horas)) if (!lista.includes(k)) delete horas[k]
      r[claveHoras(campo.id)] = horas as Record<string, string>
    }
  }
  if (campo.registra_hora && nuevo !== undefined) r[claveHora(campo.id)] = ahoraIso
  if (campo.tipo === 'si_no' && campo.registra_hora_si === 'es_verdadero') {
    if (nuevo === true) r[claveHora(campo.id)] = ahoraIso
    else delete r[claveHora(campo.id)]
  }
  return r
}

export function etiquetaOpcion(def: MenuDef, campoId: string, codigo: string): string {
  return buscarOpcion(def, campoId, codigo)?.etiqueta ?? codigo
}

// Texto corto de un campo con valor, para listas y resumen.
export function textoValor(def: MenuDef, c: CampoDef, valores: Valores): string {
  const v = valores[c.id]
  const conTexto = (cod: string) => {
    const t = valores[claveTexto(c.id, cod)]
    const e = etiquetaOpcion(def, c.id, cod)
    return typeof t === 'string' && t.trim() ? `${e} (${t.trim()})` : e
  }
  if (c.tipo === 'unica' && typeof v === 'string') return conTexto(v)
  if (c.tipo === 'multiple' && Array.isArray(v)) return v.map(conTexto).join(', ')
  if (c.tipo === 'numero') {
    if (typeof v === 'number') return `${String(v).replace('.', ',')}${c.unidad ? ` ${c.unidad}` : ''}`
    if (typeof v === 'string') return c.boton_alternativo?.etiqueta ?? v
  }
  if (c.tipo === 'si_no') return typeof v === 'boolean' ? (v ? 'sí' : 'no') : ''
  if (c.tipo === 'texto') return typeof v === 'string' ? v : ''
  if (c.tipo === 'hora') return typeof v === 'string' ? new Date(v).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''
  if (c.tipo === 'checklist' && v && typeof v === 'object' && !Array.isArray(v)) {
    return (c.items ?? [])
      .map((i) => `${i.etiqueta}: ${i.tipo === 'texto' ? String(v[i.codigo] ?? '—') : v[i.codigo] === true ? 'sí' : v[i.codigo] === false ? 'no' : '—'}`)
      .join('; ')
  }
  return ''
}
