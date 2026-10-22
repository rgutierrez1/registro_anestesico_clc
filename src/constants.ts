export const OPCIONES_ASA: { value: string; label: string }[] = [
  { value: 'I', label: 'ASA I — sano' },
  { value: 'II', label: 'ASA II — enfermedad sistémica leve' },
  { value: 'III', label: 'ASA III — enfermedad sistémica grave' },
  { value: 'IV', label: 'ASA IV — amenaza constante para la vida' },
  { value: 'V', label: 'ASA V — moribundo' },
  { value: 'VI', label: 'ASA VI — muerte cerebral (donante)' },
]

export const TIPOS_ANESTESIA = [
  'General',
  'Regional',
  'Sedación',
  'Local',
  'Combinada (General + Regional)',
] as const

export const OPCIONES_MONITORIZACION = [
  'ECG',
  'SpO2',
  'PANI (presión no invasiva)',
  'Línea arterial invasiva',
  'Capnografía (EtCO2)',
  'Temperatura',
  'BIS / entropía',
  'TOF (relajación neuromuscular)',
  'Diuresis',
  'PVC',
  'Gasto cardíaco',
]

export const TIPOS_TECNICA_REGIONAL = [
  'Raquídea (subaracnoidea)',
  'Epidural',
  'Combinada raquídea-epidural',
  'Bloqueo de plexo braquial',
  'Bloqueo femoral',
  'Bloqueo ciático',
  'TAP block',
  'Bloqueo paravertebral',
  'Otro',
]

export const TIPOS_MANEJO_VIA_AEREA = [
  'Intubación orotraqueal',
  'Intubación nasotraqueal',
  'Máscara laríngea',
] as const

// Tubos de 2,0 a 9,0 en pasos de 0,5 (se guardan como texto con coma decimal)
export const TAMANOS_TUBO = Array.from({ length: 15 }, (_, i) => (2 + i * 0.5).toFixed(1).replace('.', ','))

export const GRADOS_CORMACK: { value: string; label: string }[] = [
  { value: 'I', label: 'I — se ve la glotis completa' },
  { value: 'IIa', label: 'IIa — se ve la parte anterior de la glotis' },
  { value: 'IIb', label: 'IIb — se ven solo los aritenoides' },
  { value: 'III', label: 'III — se ve solo la epiglotis' },
  { value: 'IV', label: 'IV — no se ve epiglotis ni glotis' },
]

export const TAMANOS_MASCARA_LARINGEA = ['1', '1,5', '2', '2,5', '3', '4', '5', '6']

export const DISPOSITIVOS_VIA_AEREA = ['Fibrobroncoscopio', 'GEB', 'Videolaringoscopio']

export const VIAS_FARMACO =['IV', 'IM', 'Inhalatoria', 'Regional', 'Oral', 'Subcutánea', 'Otra'] as const

export const TIPOS_FLUIDO = [
  'Cristaloide (SF / Ringer)',
  'Coloide',
  'Glóbulos rojos',
  'Plasma fresco',
  'Plaquetas',
  'Sangrado estimado',
  'Diuresis',
  'Otras pérdidas',
]

export const DESTINOS_PACIENTE = [
  'Sala de recuperación (PACU)',
  'UCI / Terapia intensiva',
  'Sala general',
  'Domicilio (cirugía ambulatoria)',
]
