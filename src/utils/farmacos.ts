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

function registroDesdeItem(
  item: ItemCarrito,
  hora: string,
  activas: Set<string>,
): RegistroFarmaco | null {
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
  const evento = def.administracion === 'bolo' ? 'bolo' : activas.has(def.id) ? 'cambio' : 'inicio'
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

export function registrarItems(c: CasoAnestesico, ids: string[]): Partial<CasoAnestesico> {
  const hora = new Date().toISOString()
  const activas = new Set(infusionesActivas(c.farmacos).map((a) => a.clave))
  const nuevos: RegistroFarmaco[] = []
  const restantes: ItemCarrito[] = []
  for (const item of c.carritoFarmacos) {
    const registro = ids.includes(item.id) && itemListo(item) ? registroDesdeItem(item, hora, activas) : null
    if (!registro) {
      restantes.push(item)
      continue
    }
    nuevos.push(registro)
    if (registro.evento === 'inicio') activas.add(claveFarmaco(registro.farmacoId, registro.nombre))
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
