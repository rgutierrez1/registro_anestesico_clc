export interface ItemPack {
  farmacoId: string
  presentacionId?: string
  dosis?: number
  // Antibiótico: se carga cefazolina, salvo alergia a penicilina (queda por elegir).
  grupo?: 'antibiotico'
  // Dosis por kg (con el peso ajustado) para preseleccionar al cargar el pack.
  dosisPorKg?: number
}

export interface PackFarmacos {
  id: string
  nombre: string
  items: ItemPack[]
}

// Fármacos que llevan todos los protocolos. El antibiótico va al principio de cada pack:
// cefazolina, salvo alergia a penicilina (queda por elegir).
const ANTIBIOTICO: ItemPack = { farmacoId: 'cefazolina', grupo: 'antibiotico' }
// Vasoactivos que cargan todos los protocolos (al final de cada pack); el resto está en el catálogo.
const VASOACTIVOS: ItemPack[] = [{ farmacoId: 'efedrina' }, { farmacoId: 'atropina' }]

function pack(id: string, nombre: string, items: ItemPack[]): PackFarmacos {
  return { id, nombre, items: [ANTIBIOTICO, ...items, ...VASOACTIVOS] }
}

// Protocolo TIVA: premedicación, inducción y mantención, analgesia multimodal, adyuvantes y otros.
// Cambia solo el relajante neuromuscular.
function tiva(relajante: ItemPack): ItemPack[] {
  return [
    { farmacoId: 'clonazepam' },
    { farmacoId: 'propofol-tci', presentacionId: '2', dosis: 3 },
    { farmacoId: 'remifentanilo', dosis: 4 },
    relajante,
    { farmacoId: 'paracetamol' },
    { farmacoId: 'ketorolaco', dosisPorKg: 0.5 },
    { farmacoId: 'metadona' },
    { farmacoId: 'metamizol', dosis: 2000 },
    { farmacoId: 'dexmedetomidina', dosis: 0.5 },
    { farmacoId: 'sulfato-magnesio' },
    { farmacoId: 'lidocaina-infusion', dosis: 1 },
    { farmacoId: 'omeprazol', dosis: 40 },
    { farmacoId: 'acido-tranexamico', dosis: 2000 },
    { farmacoId: 'ondansetron' },
  ]
}

// Los packs solo preseleccionan fármacos (y opcionalmente dosis/presentación);
// el anestesiólogo revisa y confirma cada dosis antes de registrar.
export const PACKS_FARMACOS: PackFarmacos[] = [
  pack('general-balanceada', 'Anestesia general balanceada', [
    { farmacoId: 'fentanilo' },
    { farmacoId: 'propofol-bolo' },
    { farmacoId: 'rocuronio' },
    { farmacoId: 'sevofluorano' },
    { farmacoId: 'dexametasona' },
    { farmacoId: 'ondansetron' },
    { farmacoId: 'paracetamol' },
    { farmacoId: 'sugammadex' },
  ]),
  pack('espinal-sedacion', 'Anestesia Espinal + Sedación', [
    { farmacoId: 'propofol-tci', presentacionId: '2', dosis: 2 },
    { farmacoId: 'midazolam', dosis: 5 },
    { farmacoId: 'fentanilo', dosis: 100 },
    { farmacoId: 'paracetamol', dosis: 1000 },
    { farmacoId: 'ketorolaco', dosis: 60 },
    { farmacoId: 'metamizol', dosis: 2000 },
    { farmacoId: 'acido-tranexamico', dosis: 2000 },
    { farmacoId: 'dexametasona', dosis: 8 },
    { farmacoId: 'ondansetron', dosis: 4 },
  ]),
  // Escoliosis: premedicación, inducción y mantención TIVA, analgesia multimodal, adyuvantes y otros.
  pack('columna-tiva', 'Cirugía de columna - TIVA', tiva({ farmacoId: 'rocuronio' })),
  // Plástica: igual que la TIVA de columna, con atracurio como relajante neuromuscular.
  pack('plastica-tiva', 'TIVA - Plástica', tiva({ farmacoId: 'atracurio' })),
]
