export interface ItemPack {
  farmacoId: string
  presentacionId?: string
  dosis?: number
}

export interface PackFarmacos {
  id: string
  nombre: string
  items: ItemPack[]
}

// Los packs solo preseleccionan fármacos (y opcionalmente dosis/presentación);
// el anestesiólogo revisa y confirma cada dosis antes de registrar.
export const PACKS_FARMACOS: PackFarmacos[] = [
  {
    id: 'bariatrica',
    nombre: 'Cirugía bariátrica',
    items: [
      { farmacoId: 'fentanilo' },
      { farmacoId: 'remifentanilo' },
      { farmacoId: 'propofol-tci' },
      { farmacoId: 'rocuronio' },
      { farmacoId: 'ketamina' },
      { farmacoId: 'dexmedetomidina' },
      { farmacoId: 'dexametasona' },
      { farmacoId: 'ondansetron' },
      { farmacoId: 'paracetamol' },
      { farmacoId: 'sugammadex' },
    ],
  },
  {
    id: 'general-balanceada',
    nombre: 'Anestesia general balanceada',
    items: [
      { farmacoId: 'fentanilo' },
      { farmacoId: 'propofol-bolo' },
      { farmacoId: 'rocuronio' },
      { farmacoId: 'sevofluorano' },
      { farmacoId: 'dexametasona' },
      { farmacoId: 'ondansetron' },
      { farmacoId: 'paracetamol' },
      { farmacoId: 'sugammadex' },
    ],
  },
]
