// Esquema de los menús de clic (hoja-anestesia-clc/menus-de-clic v1.0).

export type VersionMenu = 'adulto' | 'ped'

export type Operador =
  | 'eq'
  | 'neq'
  | 'in'
  | 'not_in'
  | 'contiene'
  | 'contiene_alguna'
  | 'gte'
  | 'lt'
  | 'lleno'
  | 'es_verdadero'
  | 'es_falso'

export type Condicion =
  | { campo: string; op: Operador; valor?: unknown }
  | { todas: Condicion[] }
  | { alguna: Condicion[] }

export interface Alerta {
  si?: Condicion
  si_texto?: string
  nivel: 'roja' | 'amarilla' | 'info' | 'bloqueo'
  mensaje: string
  version?: 'ped'
  fija?: boolean
}

export interface OpcionDef {
  codigo: string
  etiqueta: string
  abrev?: string
  version?: 'ped'
  mostrar_si?: Condicion
  abre?: string[]
  implica?: string[]
  exclusivas?: string[]
  color_hex?: string
  grupo?: string
  extremidad?: 'superior' | 'inferior' | 'cabeza_cuello'
  valor?: number
  pide_texto?: string
  peso_min_kg?: number
  peso_max_kg?: number
  auto?: string
}

export type TipoCampo = 'unica' | 'multiple' | 'numero' | 'si_no' | 'hora' | 'texto' | 'checklist'

export interface ItemChecklist {
  codigo: string
  etiqueta: string
  tipo?: 'texto'
  nota?: string
}

export interface CampoDef {
  id: string
  numero: string
  etiqueta: string
  tipo: TipoCampo
  obligatorio?: boolean
  obligatorio_si?: Condicion
  mostrar_si?: Condicion
  mostrar_si_texto?: string
  version?: 'ped'
  por_defecto?: string | string[]
  opciones?: OpcionDef[]
  exclusivas?: string[]
  items?: ItemChecklist[]
  unidad?: string
  min?: number
  max?: number
  decimales?: number
  boton_alternativo?: { codigo: string; etiqueta: string }
  alertas?: Alerta[]
  ayuda?: string
  nota?: string
  nota_ped?: string
  significa?: string | string[]
  cada_opcion_registra_hora?: boolean
  registra_hora_si?: string
  registra_hora?: boolean
  presentacion?: string
  grupos?: string[]
  // v3: un solo aviso, siempre rojo; `fijo` = se muestra siempre mientras se cumpla.
  aviso?: { si: Condicion; mensaje: string; fijo?: boolean }
}

export interface SeccionDef {
  id: string
  numero: string
  titulo: string
  ambito?: 'caso' | 'evento'
  registra_hora?: boolean
  mostrar_si?: Condicion
  version?: 'ped'
  nota?: string
  campos: CampoDef[]
}

export interface MenuDef {
  pestana: string
  secciones: SeccionDef[]
  tablas_pediatricas?: Record<string, unknown>
}

// Valores guardados: siempre códigos. Claves auxiliares: `id#texto:codigo`, `id#horas`, `id#hora`.
export type Valor = string | number | boolean | string[] | Record<string, string | boolean>
export type Valores = Record<string, Valor>

export interface RegistroMenu {
  id: string
  hora: string
  seccion?: string
  valores: Valores
  anulado?: { motivo: string; usuario: string; hora: string }
  retiro?: { hora: string; usuario: string }
  // Quién y cuándo cambió el registro después de guardarlo.
  historial?: { usuario: string; hora: string }[]
  legado?: unknown
}
