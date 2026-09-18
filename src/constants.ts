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

export const VIAS_FARMACO = ['IV', 'IM', 'Inhalatoria', 'Regional', 'Oral', 'Subcutánea', 'Otra'] as const

export const FARMACOS_FRECUENTES = [
  { nombre: 'Propofol', via: 'IV' },
  { nombre: 'Fentanilo', via: 'IV' },
  { nombre: 'Remifentanilo', via: 'IV' },
  { nombre: 'Rocuronio', via: 'IV' },
  { nombre: 'Succinilcolina', via: 'IV' },
  { nombre: 'Sevoflurano', via: 'Inhalatoria' },
  { nombre: 'Midazolam', via: 'IV' },
  { nombre: 'Lidocaína', via: 'IV' },
  { nombre: 'Efedrina', via: 'IV' },
  { nombre: 'Fenilefrina', via: 'IV' },
  { nombre: 'Atropina', via: 'IV' },
  { nombre: 'Ondansetrón', via: 'IV' },
  { nombre: 'Dexametasona', via: 'IV' },
  { nombre: 'Ketamina', via: 'IV' },
  { nombre: 'Neostigmina', via: 'IV' },
  { nombre: 'Sugammadex', via: 'IV' },
  { nombre: 'Paracetamol', via: 'IV' },
  { nombre: 'Ketorolac', via: 'IV' },
]

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
