import type { ViaFarmaco } from '../types'

export const CATEGORIAS_FARMACO = [
  'Opioides',
  'Hipnóticos',
  'BNM',
  'Analgésicos',
  'Coadyuvantes y otros',
  'Vasoactivos',
  'Antibióticos',
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
  // La dosis sugerida por peso se redondea a un múltiplo de este valor (p. ej., 41 mg → 40 mg con 5).
  redondeoDosis?: number
  // Antibióticos: en el carrito se puede cambiar uno por otro del mismo grupo.
  grupo?: 'antibiotico'
  // Texto de referencia que se muestra junto a la dosis (rango habitual, observaciones).
  referencia?: string
  // No aparece en el catálogo (p. ej., el antibiótico aún sin elegir).
  oculto?: boolean
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
    redondeoDosis: 50,
  }),
  continuo({
    id: 'remifentanilo',
    nombre: 'Remifentanilo',
    categoria: 'Opioides',
    modoLabel: 'TCI',
    unidad: 'ng/mL',
    dosis: rango(1, 6, 0.5),
  }),
  bolo({ id: 'metadona', nombre: 'Metadona', categoria: 'Opioides', unidad: 'mg', dosis: rango(1, 20, 1), referencia: '100–200 μg/kg (ampolla de 10 mg)' }),
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
    dosisPorDefecto: 1,
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
    dosis: rango(20, 300, 5),
    dosisPorKg: 2,
    redondeoDosis: 10,
  }),

  bolo({ id: 'midazolam', nombre: 'Midazolam', categoria: 'Hipnóticos', unidad: 'mg', dosis: [1, 2, 3, 4, 5, 7.5, 10] }),

  // BNM
  bolo({ id: 'rocuronio', nombre: 'Rocuronio', categoria: 'BNM', unidad: 'mg', dosis: rango(5, 100, 5), dosisPorKg: 0.6, redondeoDosis: 5 }),
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
    referencia: '15 mg/kg/dosis, máx. 60 mg/kg/día; cada 4–6 h',
  }),
  bolo({ id: 'ketorolaco', nombre: 'Ketorolaco', categoria: 'Analgésicos', unidad: 'mg', dosis: [15, 30, 60], referencia: '30–60 mg; 0,5 mg/kg' }),
  bolo({ id: 'ketoprofeno', nombre: 'Ketoprofeno', categoria: 'Analgésicos', unidad: 'mg', dosis: [] }),
  bolo({ id: 'metamizol', nombre: 'Metamizol', categoria: 'Analgésicos', unidad: 'mg', dosis: [1000, 2000], referencia: 'Ampolla de 2 g' }),

  // Coadyuvantes y otros
  bolo({ id: 'ketamina', nombre: 'Ketamina', categoria: 'Coadyuvantes y otros', unidad: 'mg', dosis: [25, 50] }),
  continuo({
    id: 'dexmedetomidina',
    nombre: 'Dexmedetomidina',
    categoria: 'Coadyuvantes y otros',
    modoLabel: 'Infusión',
    unidad: 'mcg/kg/h',
    dosis: rango(0.1, 1, 0.1),
    referencia: '0,5 μg/kg/h (ampolla de 200 μg)',
  }),
  bolo({
    id: 'dexametasona',
    nombre: 'Dexametasona',
    categoria: 'Coadyuvantes y otros',
    unidad: 'mg',
    dosis: [1, 2, 3, 4, 8, 10, 12],
    dosisPorDefecto: 4,
  }),
  bolo({
    id: 'ondansetron',
    nombre: 'Ondansetron',
    categoria: 'Coadyuvantes y otros',
    unidad: 'mg',
    dosis: [1, 2, 3, 4, 8],
    dosisPorDefecto: 4,
    referencia: '4–8 mg, al término de la cirugía',
  }),
  bolo({
    id: 'clonazepam',
    nombre: 'Clonazepam',
    categoria: 'Coadyuvantes y otros',
    unidad: 'mg',
    dosis: [0.25, 0.5, 0.75, 1, 1.5, 2],
    referencia: '0,01–0,05 mg/kg (ampolla de 1 mg)',
  }),
  bolo({
    id: 'sulfato-magnesio',
    nombre: 'Sulfato de magnesio',
    categoria: 'Coadyuvantes y otros',
    unidad: 'mg',
    dosis: rango(1000, 4000, 500),
    referencia: '30–50 mg/kg (2 ampollas)',
  }),
  continuo({
    id: 'lidocaina-infusion',
    nombre: 'Lidocaína',
    etiqueta: 'Lidocaína (infusión)',
    categoria: 'Coadyuvantes y otros',
    modoLabel: 'Infusión',
    unidad: 'mg/kg/h',
    dosis: rango(0.5, 2, 0.5),
    referencia: '1 mg/kg/h',
  }),
  bolo({
    id: 'droperidol',
    nombre: 'Droperidol',
    categoria: 'Coadyuvantes y otros',
    unidad: 'mg',
    dosis: [0.625, 1],
  }),
  bolo({ id: 'omeprazol', nombre: 'Omeprazol', categoria: 'Coadyuvantes y otros', unidad: 'mg', dosis: [40], referencia: '40 mg, una vez' }),
  bolo({
    id: 'acido-tranexamico',
    nombre: 'Ácido Tranexámico',
    categoria: 'Coadyuvantes y otros',
    unidad: 'mg',
    dosis: [1000, 2000],
    referencia: '2 g, por una vez',
  }),
  bolo({
    id: 'sugammadex',
    nombre: 'Sugammadex',
    categoria: 'Coadyuvantes y otros',
    unidad: 'mg',
    dosis: [50, 100, 200],
  }),
]

CATALOGO_FARMACOS.push(
  bolo({ id: 'efedrina', nombre: 'Efedrina', categoria: 'Vasoactivos', unidad: 'mg', dosis: [6, 12] }),
  bolo({ id: 'fenilefrina-bolo', nombre: 'Fenilefrina', etiqueta: 'Fenilefrina (bolo)', categoria: 'Vasoactivos', unidad: 'mcg', dosis: [50, 100] }),
  continuo({
    id: 'fenilefrina-infusion',
    nombre: 'Fenilefrina',
    etiqueta: 'Fenilefrina (infusión)',
    categoria: 'Vasoactivos',
    modoLabel: 'Infusión',
    unidad: 'mcg/kg/min',
    dosis: rango(0.1, 2, 0.1),
    dosisPorDefecto: 0.5,
  }),
  continuo({
    id: 'noradrenalina',
    nombre: 'Noradrenalina',
    categoria: 'Vasoactivos',
    modoLabel: 'Infusión',
    unidad: 'mcg/kg/min',
    dosis: rango(0.01, 0.5, 0.01),
    dosisPorDefecto: 0.05,
  }),
  continuo({
    id: 'vasopresina',
    nombre: 'Vasopresina',
    categoria: 'Vasoactivos',
    modoLabel: 'Infusión',
    unidad: 'U/min',
    dosis: rango(0.01, 0.1, 0.01),
    dosisPorDefecto: 0.01,
  }),
  bolo({ id: 'atropina', nombre: 'Atropina', categoria: 'Vasoactivos', unidad: 'mg', dosis: [0.5, 1] }),
  bolo({ id: 'nitroglicerina-bolo', nombre: 'Nitroglicerina', etiqueta: 'Nitroglicerina (bolo)', categoria: 'Vasoactivos', unidad: 'mcg', dosis: [50, 100] }),
  continuo({
    id: 'nitroglicerina-infusion',
    nombre: 'Nitroglicerina',
    etiqueta: 'Nitroglicerina (infusión)',
    categoria: 'Vasoactivos',
    modoLabel: 'Infusión',
    unidad: 'mcg/min',
    dosis: [50, 100],
  }),
  bolo({ id: 'labetalol', nombre: 'Labetalol', categoria: 'Vasoactivos', unidad: 'mg', dosis: [20] }),
)

// Antibióticos de profilaxis; solo la cefazolina trae una dosis preseleccionada.
const antibiotico = (d: Pick<FarmacoDef, 'id' | 'nombre' | 'dosis'> & Partial<FarmacoDef>) =>
  bolo({ categoria: 'Antibióticos', unidad: 'mg', grupo: 'antibiotico', ...d })

CATALOGO_FARMACOS.push(
  antibiotico({ id: 'cefazolina', nombre: 'Cefazolina', dosis: [1000, 2000], dosisPorDefecto: 2000 }),
  antibiotico({ id: 'clindamicina', nombre: 'Clindamicina', dosis: [600, 900] }),
  antibiotico({ id: 'vancomicina', nombre: 'Vancomicina', dosis: [1000, 1500, 2000] }),
  antibiotico({ id: 'ceftriaxona', nombre: 'Ceftriaxona', dosis: [1000, 2000] }),
  antibiotico({ id: 'metronidazol', nombre: 'Metronidazol', dosis: [500] }),
  // Se usa cuando no corresponde sugerir cefazolina (alergia a penicilina): queda por elegir.
  antibiotico({ id: 'antibiotico', nombre: 'Antibiótico', etiqueta: 'Antibiótico (elegir)', dosis: [], oculto: true }),
)

export const CATALOGO_ELEGIBLE = CATALOGO_FARMACOS.filter((f) => !f.oculto)
export const ANTIBIOTICOS = CATALOGO_FARMACOS.filter((f) => f.grupo === 'antibiotico' && !f.oculto)

const porId = new Map(CATALOGO_FARMACOS.map((f) => [f.id, f]))

export function obtenerFarmaco(id: string): FarmacoDef | undefined {
  return porId.get(id)
}

export function indiceCatalogo(id: string): number {
  const i = CATALOGO_FARMACOS.findIndex((f) => f.id === id)
  return i === -1 ? CATALOGO_FARMACOS.length : i
}
