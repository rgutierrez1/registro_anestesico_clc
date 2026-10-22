import { obtenerFarmaco, type FarmacoDef } from '../data/catalogoFarmacos'
import type { PackFarmacos } from '../data/packsFarmacos'
import type { CasoAnestesico, DatosPaciente, ItemCarrito, RegistroFarmaco } from '../types'
import { pesoParaDosificar, valorMasCercano } from './dosis'

export const ID_PERSONALIZADO = 'personalizado'

export function claveFarmaco(farmacoId: string, nombre: string): string {
  return farmacoId === ID_PERSONALIZADO ? `${ID_PERSONALIZADO}:${nombre}` : farmacoId
}

export function crearItemCarrito(def: FarmacoDef, paciente: DatosPaciente): ItemCarrito {
  let dosisSel = def.dosis.length === 0 ? 'otra' : ''
  if (def.dosisPorKg) {
    const peso = pesoParaDosificar(paciente)
    if (peso) dosisSel = String(valorMasCercano(def.dosis, def.dosisPorKg * peso.kg))
  }
  if (def.dosisPorDefecto !== undefined) dosisSel = String(def.dosisPorDefecto)
  return {
    id: crypto.randomUUID(),
    farmacoId: def.id,
    presentacionId: '',
    dosisSel,
    dosisManual: '',
    nombre: '',
    unidad: '',
    via: def.via,
  }
}

export function crearItemPersonalizado(): ItemCarrito {
  return {
    id: crypto.randomUUID(),
    farmacoId: ID_PERSONALIZADO,
    presentacionId: '',
    dosisSel: 'otra',
    dosisManual: '',
    nombre: '',
    unidad: 'mg',
    via: 'IV',
  }
}

export function valorItem(item: ItemCarrito): number | null {
  if (item.dosisSel === '') return null
  const n = item.dosisSel === 'otra' ? Number.parseFloat(item.dosisManual.replace(',', '.')) : Number(item.dosisSel)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function itemListo(item: ItemCarrito): boolean {
  if (valorItem(item) === null) return false
  if (item.farmacoId === ID_PERSONALIZADO) return item.nombre.trim() !== '' && item.unidad.trim() !== ''
  const def = obtenerFarmaco(item.farmacoId)
  if (!def) return false
  return !def.presentaciones || item.presentacionId !== ''
}

export interface InfusionActiva {
  clave: string
  farmacoId: string
  nombre: string
  modo: string
  valor: number | null
  unidad: string
  via: RegistroFarmaco['via']
  desde: string
}

export function infusionesActivas(registros: RegistroFarmaco[]): InfusionActiva[] {
  const activas = new Map<string, InfusionActiva>()
  const ordenados = [...registros].sort((a, b) => a.hora.localeCompare(b.hora))
  for (const r of ordenados) {
    if (r.evento === 'bolo') continue
    const clave = claveFarmaco(r.farmacoId, r.nombre)
    if (r.evento === 'fin') {
      activas.delete(clave)
    } else {
      const previa = activas.get(clave)
      activas.set(clave, {
        clave,
        farmacoId: r.farmacoId,
        nombre: r.nombre,
        modo: r.modo,
        valor: r.valor,
        unidad: r.unidad,
        via: r.via,
        desde: previa?.desde ?? r.hora,
      })
    }
  }
  return [...activas.values()]
}

export function infusionActivaEn(registros: RegistroFarmaco[], clave: string, tMs: number): boolean {
  const eventos = registros
    .filter((r) => r.evento !== 'bolo' && claveFarmaco(r.farmacoId, r.nombre) === clave && Date.parse(r.hora) <= tMs)
    .sort((a, b) => a.hora.localeCompare(b.hora))
  const ultimo = eventos[eventos.length - 1]
  return ultimo !== undefined && ultimo.evento !== 'fin'
}

// Un inicio/cambio/fin no puede cruzar a sus eventos vecinos del mismo fármaco; los bolos no tienen límites.
export function limitesHora(registros: RegistroFarmaco[], id: string): { min: number | null; max: number | null } {
  const r = registros.find((x) => x.id === id)
  if (!r || r.evento === 'bolo') return { min: null, max: null }
  const clave = claveFarmaco(r.farmacoId, r.nombre)
  const hermanos = registros
    .filter((x) => x.evento !== 'bolo' && claveFarmaco(x.farmacoId, x.nombre) === clave)
    .sort((a, b) => a.hora.localeCompare(b.hora))
  const i = hermanos.findIndex((x) => x.id === id)
  return {
    min: i > 0 ? Date.parse(hermanos[i - 1].hora) : null,
    max: i < hermanos.length - 1 ? Date.parse(hermanos[i + 1].hora) : null,
  }
}

export function cambiarHoraRegistro(c: CasoAnestesico, id: string, hora: string): Partial<CasoAnestesico> {
  const t = Date.parse(hora)
  const { min, max } = limitesHora(c.farmacos, id)
  if (Number.isNaN(t) || (min !== null && t <= min) || (max !== null && t >= max)) return {}
  return { farmacos: c.farmacos.map((r) => (r.id === id ? { ...r, hora } : r)) }
}

function registroDesdeItem(item: ItemCarrito, hora: string, previos: RegistroFarmaco[]): RegistroFarmaco | null {
  const valor = valorItem(item)
  if (valor === null) return null
  if (item.farmacoId === ID_PERSONALIZADO) {
    return {
      id: crypto.randomUUID(),
      hora,
      farmacoId: ID_PERSONALIZADO,
      nombre: item.nombre.trim(),
      modo: 'Bolo',
      evento: 'bolo',
      valor,
      unidad: item.unidad.trim(),
      via: item.via,
    }
  }
  const def = obtenerFarmaco(item.farmacoId)
  if (!def) return null
  const presentacion = def.presentaciones?.find((p) => p.id === item.presentacionId)
  const evento =
    def.administracion === 'bolo' ? 'bolo' : infusionActivaEn(previos, def.id, Date.parse(hora)) ? 'cambio' : 'inicio'
  return {
    id: crypto.randomUUID(),
    hora,
    farmacoId: def.id,
    nombre: def.nombre,
    modo: presentacion?.label ?? def.modoLabel,
    evento,
    valor,
    unidad: def.unidad,
    via: def.via,
  }
}

export function registrarItems(c: CasoAnestesico, ids: string[], hora?: string): Partial<CasoAnestesico> {
  const horaIso = hora ?? new Date().toISOString()
  const nuevos: RegistroFarmaco[] = []
  const restantes: ItemCarrito[] = []
  for (const item of c.carritoFarmacos) {
    const registro =
      ids.includes(item.id) && itemListo(item) ? registroDesdeItem(item, horaIso, [...c.farmacos, ...nuevos]) : null
    if (registro) nuevos.push(registro)
    else restantes.push(item)
  }
  return { carritoFarmacos: restantes, farmacos: [...c.farmacos, ...nuevos] }
}

export function cambiarInfusion(c: CasoAnestesico, clave: string, valor: number): Partial<CasoAnestesico> {
  const activa = infusionesActivas(c.farmacos).find((a) => a.clave === clave)
  if (!activa || !(valor > 0)) return {}
  const registro: RegistroFarmaco = {
    id: crypto.randomUUID(),
    hora: new Date().toISOString(),
    farmacoId: activa.farmacoId,
    nombre: activa.nombre,
    modo: activa.modo,
    evento: 'cambio',
    valor,
    unidad: activa.unidad,
    via: activa.via,
  }
  return { farmacos: [...c.farmacos, registro] }
}

export function finalizarInfusion(c: CasoAnestesico, clave: string): Partial<CasoAnestesico> {
  const activa = infusionesActivas(c.farmacos).find((a) => a.clave === clave)
  if (!activa) return {}
  const registro: RegistroFarmaco = {
    id: crypto.randomUUID(),
    hora: new Date().toISOString(),
    farmacoId: activa.farmacoId,
    nombre: activa.nombre,
    modo: activa.modo,
    evento: 'fin',
    valor: null,
    unidad: activa.unidad,
    via: activa.via,
  }
  return { farmacos: [...c.farmacos, registro] }
}

export function alternarFarmacoEnCarrito(c: CasoAnestesico, def: FarmacoDef): Partial<CasoAnestesico> {
  const presente = c.carritoFarmacos.some((i) => i.farmacoId === def.id)
  return {
    carritoFarmacos: presente
      ? c.carritoFarmacos.filter((i) => i.farmacoId !== def.id)
      : [...c.carritoFarmacos, crearItemCarrito(def, c.paciente)],
  }
}

export function agregarFarmacoAlCarrito(c: CasoAnestesico, def: FarmacoDef): Partial<CasoAnestesico> {
  if (c.carritoFarmacos.some((i) => i.farmacoId === def.id)) return {}
  return { carritoFarmacos: [...c.carritoFarmacos, crearItemCarrito(def, c.paciente)] }
}

export function aplicarPack(c: CasoAnestesico, pack: PackFarmacos): Partial<CasoAnestesico> {
  const presentes = new Set(c.carritoFarmacos.map((i) => i.farmacoId))
  const nuevos: ItemCarrito[] = []
  for (const it of pack.items) {
    const def = obtenerFarmaco(it.farmacoId)
    if (!def || presentes.has(def.id)) continue
    const item = crearItemCarrito(def, c.paciente)
    if (it.presentacionId) item.presentacionId = it.presentacionId
    if (it.dosis !== undefined) item.dosisSel = String(it.dosis)
    nuevos.push(item)
  }
  return { carritoFarmacos: [...c.carritoFarmacos, ...nuevos] }
}

export const ETIQUETA_EVENTO: Record<RegistroFarmaco['evento'], string> = {
  bolo: 'Bolo',
  inicio: 'Inicio',
  cambio: 'Cambio de dosis',
  fin: 'Fin',
}
