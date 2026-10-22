import type { ViaFarmaco } from '../types'

export const CATEGORIAS_FARMACO = [
  'Opioides',
  'Hipnóticos',
  'BNM',
  'Analgésicos',
  'Coadyuvantes y otros',
] as const

export type CategoriaFarmaco = (typeof CATEGORIAS_FARMACO)[number]

export interface PresentacionFarmaco {
  id: string
  label: string
}

export interface FarmacoDef {
  id: string
  nombre: string
  etiqueta: string
  categoria: CategoriaFarmaco
  administracion: 'bolo' | 'continuo'
  modoLabel: string
  via: ViaFarmaco
  unidad: string
  dosis: number[]
  presentaciones?: PresentacionFarmaco[]
  dosisPorDefecto?: number
  dosisPorKg?: number
}

function rango(desde: number, hasta: number, paso: number): number[] {
  const n = Math.round((hasta - desde) / paso)
  return Array.from({ length: n + 1 }, (_, i) => Math.round((desde + i * paso) * 1000) / 1000)
}

type Base = Pick<FarmacoDef, 'id' | 'nombre' | 'categoria' | 'unidad' | 'dosis'> & Partial<FarmacoDef>

function bolo(d: Base): FarmacoDef {
  return { etiqueta: d.nombre, administracion: 'bolo', modoLabel: 'Bolo', via: 'IV', ...d }
}

function continuo(d: Base & Pick<FarmacoDef, 'modoLabel'>): FarmacoDef {
  return { etiqueta: d.nombre, administracion: 'continuo', via: 'IV', ...d }
}

export const CATALOGO_FARMACOS: FarmacoDef[] = [
  // Opioides
  bolo({
    id: 'fentanilo',
    nombre: 'Fentanilo',
    categoria: 'Opioides',
    unidad: 'mcg',
    dosis: [50, 100, 150, 200, 300],
    dosisPorKg: 3,
  }),
  continuo({
    id: 'remifentanilo',
    nombre: 'Remifentanilo',
    categoria: 'Opioides',
    modoLabel: 'TCI',
    unidad: 'ng/mL',
    dosis: rango(1, 6, 0.5),
  }),
  bolo({ id: 'metadona', nombre: 'Metadona', categoria: 'Opioides', unidad: 'mg', dosis: rango(1, 20, 1) }),
  bolo({ id: 'morfina', nombre: 'Morfina', categoria: 'Opioides', unidad: 'mg', dosis: rango(1, 20, 1) }),

  // Hipnóticos
  continuo({
    id: 'sevofluorano',
    nombre: 'Sevofluorano',
    categoria: 'Hipnóticos',
    modoLabel: 'Inhalatoria continua',
    via: 'Inhalatoria',
    unidad: 'MAC',
    dosis: rango(0.5, 1.5, 0.1),
  }),
  continuo({
    id: 'desfluorano',
    nombre: 'Desfluorano',
    categoria: 'Hipnóticos',
    modoLabel: 'Inhalatoria continua',
    via: 'Inhalatoria',
    unidad: 'MAC',
    dosis: rango(0.5, 1.5, 0.1),
  }),
  continuo({
    id: 'propofol-tci',
    nombre: 'Propofol',
    etiqueta: 'Propofol (TCI)',
    categoria: 'Hipnóticos',
    modoLabel: 'TCI',
    unidad: 'mcg/mL',
    dosis: rango(0.5, 5, 0.5),
    presentaciones: [
      { id: '1', label: 'TCI 1% - Sitio efecto' },
      { id: '2', label: 'TCI 2% - Sitio efecto' },
    ],
  }),
  bolo({
    id: 'propofol-bolo',
    nombre: 'Propofol',
    etiqueta: 'Propofol (bolo)',
    categoria: 'Hipnóticos',
    unidad: 'mg',
    dosis: rango(20, 200, 10),
  }),

  // BNM
  bolo({ id: 'rocuronio', nombre: 'Rocuronio', categoria: 'BNM', unidad: 'mg', dosis: rango(5, 50, 5) }),
  bolo({ id: 'cisatracurio', nombre: 'Cisatracurio', categoria: 'BNM', unidad: 'mg', dosis: rango(2, 20, 2) }),
  bolo({ id: 'atracurio', nombre: 'Atracurio', categoria: 'BNM', unidad: 'mg', dosis: rango(5, 50, 5) }),
  bolo({ id: 'succinilcolina', nombre: 'Succinilcolina', categoria: 'BNM', unidad: 'mg', dosis: rango(20, 100, 20) }),

  // Analgésicos
  bolo({
    id: 'paracetamol',
    nombre: 'Paracetamol',
    categoria: 'Analgésicos',
    unidad: 'mg',
    dosis: rango(300, 1000, 100),
    dosisPorDefecto: 1000,
  }),
  bolo({ id: 'ketorolaco', nombre: 'Ketorolaco', categoria: 'Analgésicos', unidad: 'mg', dosis: [15, 30, 60] }),
  bolo({ id: 'ketoprofeno', nombre: 'Ketoprofeno', categoria: 'Analgésicos', unidad: 'mg', dosis: [] }),
  bolo({ id: 'metamizol', nombre: 'Metamizol', categoria: 'Analgésicos', unidad: 'mg', dosis: [] }),

  // Coadyuvantes y otros
  bolo({ id: 'ketamina', nombre: 'Ketamina', categoria: 'Coadyuvantes y otros', unidad: 'mg', dosis: [25, 50] }),
  continuo({
    id: 'dexmedetomidina',
    nombre: 'Dexmedetomidina',
    categoria: 'Coadyuvantes y otros',
    modoLabel: 'Infusión',
    unidad: 'mcg/kg/h',
    dosis: rango(0.1, 1, 0.1),
  }),
  bolo({
    id: 'dexametasona',
    nombre: 'Dexametasona',
    categoria: 'Coadyuvantes y otros',
    unidad: 'mg',
    dosis: [1, 2, 3, 4, 8, 10, 12],
  }),
  bolo({
    id: 'ondansetron',
    nombre: 'Ondansetron',
    categoria: 'Coadyuvantes y otros',
    unidad: 'mg',
    dosis: [1, 2, 3, 4, 8],
  }),
  bolo({
    id: 'droperidol',
    nombre: 'Droperidol',
    categoria: 'Coadyuvantes y otros',
    unidad: 'mg',
    dosis: [0.625, 1],
  }),
  bolo({ id: 'omeprazol', nombre: 'Omeprazol', categoria: 'Coadyuvantes y otros', unidad: 'mg', dosis: [40] }),
  bolo({
    id: 'acido-tranexamico',
    nombre: 'Ácido Tranexámico',
    categoria: 'Coadyuvantes y otros',
    unidad: 'mg',
    dosis: [1000],
  }),
  bolo({
    id: 'sugammadex',
    nombre: 'Sugammadex',
    categoria: 'Coadyuvantes y otros',
    unidad: 'mg',
    dosis: [50, 100, 200],
  }),
]

const porId = new Map(CATALOGO_FARMACOS.map((f) => [f.id, f]))

export function obtenerFarmaco(id: string): FarmacoDef | undefined {
  return porId.get(id)
}

export function indiceCatalogo(id: string): number {
  const i = CATALOGO_FARMACOS.findIndex((f) => f.id === id)
  return i === -1 ? CATALOGO_FARMACOS.length : i
}
