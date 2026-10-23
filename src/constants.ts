import type { TipoExamen } from './types'

export const ANESTESIOLOGOS = ['Álvarez', 'Canepa', 'Gutiérrez', 'Jankelevich']

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
  'Bloqueo regional',
  'Neuroaxial',
  'Sedación',
  'CAM',
  'Local',
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
  'Eco TE',
  'NIRS',
]

export const GRUPOS_SANGUINEOS = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−', 'No se conoce']

export const ALERGIAS_OPCIONES = ['Látex', 'Penicilina', 'Otros']
export const ALERGIA_OTROS = 'Otros'

export const TIPOS_ACCESO = [
  { id: 'VVP', etiqueta: 'Vía venosa periférica', corta: 'VVP' },
  { id: 'PICC', etiqueta: 'PICC line', corta: 'PICC line' },
  { id: 'VVC', etiqueta: 'Vía venosa central', corta: 'VVC' },
  { id: 'LINEA_ARTERIAL', etiqueta: 'Línea arterial', corta: 'Línea arterial' },
] as const

export const UBICACIONES_ACCESO = {
  VVP: ['Mano derecha', 'Antebrazo derecho', 'Mano izquierda', 'Antebrazo izquierdo'],
  PICC: ['Vena basílica derecha', 'Vena basílica izquierda', 'Vena cefálica derecha', 'Vena cefálica izquierda'],
  VVC: ['Yugular derecha', 'Yugular izquierda', 'Subclavia', 'Axilar', 'Femoral'],
  LINEA_ARTERIAL: [
    'Radial izquierda',
    'Radial derecha',
    'Ulnar izquierda',
    'Ulnar derecha',
    'Braquial izquierda',
    'Braquial derecha',
    'Femoral izquierda',
    'Femoral derecha',
  ],
} as const

// En la VVC solo yugular indica el lado en su nombre; para estos sitios se ofrece un lado opcional.
export const UBICACIONES_VVC_CON_LADO = ['Subclavia', 'Axilar', 'Femoral']

export const CALIBRES_VVP = ['24G', '22G', '20G', '18G', '16G', '14G']

export const POSICIONES = [
  { id: 'Prono', etiqueta: 'Prono', corta: 'Prono' },
  { id: 'Supino', etiqueta: 'Supino', corta: 'Supino' },
  { id: 'DLI', etiqueta: 'DLI (decúbito lateral izquierdo)', corta: 'DLI' },
  { id: 'DLD', etiqueta: 'DLD (decúbito lateral derecho)', corta: 'DLD' },
  { id: 'Litotomía', etiqueta: 'Litotomía', corta: 'Litotomía' },
  { id: 'Trendelenburg forzado', etiqueta: 'Trendelenburg forzado', corta: 'Trend. forzado' },
] as const

export const POSICION_INICIAL = 'Supino'

export const PRESION_ISQUEMIA_POR_DEFECTO = 250

export const TIPOS_VENTILACION = [
  { id: 'Espontánea', corta: 'Espontánea' },
  { id: 'Volumen control', corta: 'Vol. control' },
  { id: 'Presión control', corta: 'Pres. control' },
  { id: 'SIMV', corta: 'SIMV' },
  { id: 'Presión soporte', corta: 'Pres. soporte' },
  { id: 'JET', corta: 'JET' },
] as const

// En ventilación espontánea solo se registra la FiO2.
export const VENTILACION_ESPONTANEA = 'Espontánea'

export const VENTILACION_POR_DEFECTO = { vtMlPorKg: 7, fr: 12, peep: 6, fio2: 100 }

// Orden en el que se ofrecen al registrar un evento temporal.
export const DEF_FLAGS = [
  { tipo: 'listo', etiqueta: 'Paciente listo para ser operado', corta: 'Paciente listo', color: '#0369a1' },
  { tipo: 'inicioIsquemia', etiqueta: 'Inicio isquemia', corta: 'Inicio isquemia', color: '#b45309' },
  { tipo: 'finIsquemia', etiqueta: 'Fin de isquemia', corta: 'Fin isquemia', color: '#b45309' },
  { tipo: 'inicioVMP', etiqueta: 'Inicio ventilación monopulmonar', corta: 'Inicio VMP', color: '#0f766e' },
  { tipo: 'finVMP', etiqueta: 'Fin ventilación monopulmonar', corta: 'Fin VMP', color: '#0f766e' },
  { tipo: 'inicioCEC', etiqueta: 'Inicio CEC', corta: 'Inicio CEC', color: '#be123c' },
  { tipo: 'finCEC', etiqueta: 'Fin CEC', corta: 'Fin CEC', color: '#be123c' },
  { tipo: 'posicion', etiqueta: 'Cambio de posición', corta: 'Posición', color: '#6d28d9' },
] as const

export const CHECKLIST_SEGURIDAD = [
  { id: 'maquina', etiqueta: 'Revisión de máquina de anestesia' },
  { id: 'drogas', etiqueta: 'Revisión de drogas' },
  { id: 'proteccion-ocular', etiqueta: 'Protección ocular' },
  { id: 'puntos-apoyo', etiqueta: 'Protección de puntos de apoyo' },
  { id: 'profilaxis-tev', etiqueta: 'Profilaxis antitromboembólica no farmacológica' },
  { id: 'calentador-corporal', etiqueta: 'Uso de calentador corporal' },
  { id: 'plan-via-aerea', etiqueta: 'Plan de vía aérea acorde al riesgo del paciente' },
  { id: 'pausa-seguridad', etiqueta: 'Se realiza pausa de seguridad' },
]

export const MONITORIZACION_ESTANDAR = [
  'ECG',
  'SpO2',
  'PANI (presión no invasiva)',
  'Capnografía (EtCO2)',
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

export const TUBO_DOBLE_LUMEN = 'Tubo doble lumen'

export const DISPOSITIVOS_VIA_AEREA = [
  'Fibrobroncoscopio',
  'GEB',
  'Videolaringoscopio',
  TUBO_DOBLE_LUMEN,
  'Bloqueador bronquial',
  'Pack',
]

export const NUMEROS_TUBO_DOBLE_LUMEN = ['35', '37', '39', '42']

export const LADOS_TUBO_DOBLE_LUMEN = ['Derecho', 'Izquierdo'] as const

export const VIAS_FARMACO =['IV', 'IM', 'Inhalatoria', 'Regional', 'Oral', 'Subcutánea', 'Otra'] as const

export interface TipoFluido {
  id: string
  etiqueta: string
  unidad: 'mL' | 'U'
}

// Filas precargadas del balance, en el orden en que se muestran.
export const FLUIDOS_INGRESO: TipoFluido[] = [
  { id: 'ringer', etiqueta: 'Ringer lactato', unidad: 'mL' },
  { id: 'sf09', etiqueta: 'SF 0,9%', unidad: 'mL' },
  { id: 'sf3', etiqueta: 'SF 3%', unidad: 'mL' },
  { id: 'sg5', etiqueta: 'SG 5%', unidad: 'mL' },
  { id: 'gr', etiqueta: 'GR', unidad: 'U' },
  { id: 'plaquetas', etiqueta: 'Plaquetas', unidad: 'U' },
  { id: 'crio', etiqueta: 'Crioprecipitado', unidad: 'U' },
  { id: 'albumina', etiqueta: 'Albúmina', unidad: 'mL' },
  { id: 'coloide', etiqueta: 'Coloide', unidad: 'mL' },
]

export const FLUIDOS_EGRESO: TipoFluido[] = [
  { id: 'sangrado', etiqueta: 'Sangrado estimado', unidad: 'mL' },
  { id: 'diuresis', etiqueta: 'Diuresis', unidad: 'mL' },
]

export const COMPLICACIONES = [
  'Intubación difícil',
  'Apnea',
  'Hipotermia',
  'Hipotensión (PAM < 60)',
  'Shock',
  'Arritmia',
  'Recuperación prolongada',
  'Reintubación',
  'Broncoespasmo',
  'Laringoespasmo',
  'Anafilaxia',
  'PCR',
]

export interface CampoExamen {
  clave: string
  etiqueta: string
  unidad: string
  // Sin min/max el campo es de texto libre.
  min?: number
  max?: number
}

const gas = (p: string): CampoExamen[] => [
  { clave: 'ph', etiqueta: 'pH', unidad: '', min: 6.5, max: 7.8 },
  { clave: 'pco2', etiqueta: `${p}CO2`, unidad: 'mmHg', min: 5, max: 150 },
  { clave: 'po2', etiqueta: `${p}O2`, unidad: 'mmHg', min: 10, max: 700 },
  { clave: 'hco3', etiqueta: 'HCO3', unidad: 'mEq/L', min: 3, max: 50 },
  { clave: 'eb', etiqueta: 'EB', unidad: 'mEq/L', min: -30, max: 30 },
  { clave: 'lactato', etiqueta: 'Lactato', unidad: 'mmol/L', min: 0, max: 30 },
  { clave: 'sat', etiqueta: 'Saturación', unidad: '%', min: 0, max: 100 },
]

export const EXAMENES_LAB: { id: TipoExamen; etiqueta: string; campos: CampoExamen[] }[] = [
  { id: 'HGT', etiqueta: 'HGT', campos: [{ clave: 'glicemia', etiqueta: 'Glicemia', unidad: 'mg/dL', min: 10, max: 1000 }] },
  {
    id: 'HCTO_HB',
    etiqueta: 'Hcto / Hb',
    campos: [
      { clave: 'hcto', etiqueta: 'Hcto', unidad: '%', min: 5, max: 70 },
      { clave: 'hb', etiqueta: 'Hb', unidad: 'g/dL', min: 2, max: 25 },
    ],
  },
  {
    id: 'ELP',
    etiqueta: 'ELP',
    campos: [
      { clave: 'na', etiqueta: 'Na', unidad: 'mEq/L', min: 100, max: 180 },
      { clave: 'k', etiqueta: 'K', unidad: 'mEq/L', min: 1, max: 10 },
      { clave: 'cl', etiqueta: 'Cl', unidad: 'mEq/L', min: 70, max: 140 },
      { clave: 'cai', etiqueta: 'Ca iónico', unidad: 'mmol/L', min: 0.3, max: 3 },
    ],
  },
  { id: 'GASES_ART', etiqueta: 'Gases arteriales', campos: gas('Pa') },
  { id: 'GASES_VEN', etiqueta: 'Gases venosos', campos: gas('Pv') },
  { id: 'ROTEM', etiqueta: 'ROTEM', campos: [{ clave: 'resultado', etiqueta: 'Resultado (CT, CFT, A10, MCF…)', unidad: '' }] },
  { id: 'ACT', etiqueta: 'ACT', campos: [{ clave: 'act', etiqueta: 'ACT', unidad: 's', min: 50, max: 1500 }] },
]

export const DESTINOS_PACIENTE = [
  'Sala de recuperación (PACU)',
  'UCI / Terapia intensiva',
  'Sala general',
  'Domicilio (cirugía ambulatoria)',
]
