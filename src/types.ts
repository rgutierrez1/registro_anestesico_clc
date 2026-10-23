export type ASA = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI'

export type EstadoCaso = 'planificado' | 'en_curso' | 'finalizado'

export type TipoAnestesia =
  | 'General'
  | 'Bloqueo regional'
  | 'Neuroaxial'
  | 'Sedación'
  | 'CAM'
  | 'Local'

export interface DatosPaciente {
  nombre: string
  historiaClinica: string
  edad: number | ''
  sexo: 'F' | 'M' | 'Otro' | ''
  peso: number | ''
  altura: number | ''
  asa: ASA | ''
  alergias: string
  alergiasLista: string[]
  alergiasOtros: string
  antecedentes: string
  ayuno: string
  viaAerea: string
}

export interface DatosCirugia {
  diagnostico: string
  procedimiento: string
  cirujano: string
  fecha: string
  anestesiologo: string
}

export interface TecnicaRegional {
  id: string
  tipo: string
  nivel: string
  agujaOKit: string
  farmaco: string
  dosis: string
  hora: string
  exitosa: boolean
  notas: string
}

export interface ValoresVitales {
  pas: number | null
  pad: number | null
  pam: number | null
  fc: number | null
  etco2: number | null
  spo2: number | null
  temp: number | null
}

// Solo se guardan los registros cargados o editados a mano; los de cada 5 minutos se calculan al mostrarlos.
export interface RegistroVital extends ValoresVitales {
  id: string
  hora: string
  // true: los registros automáticos siguientes copian estos valores (o `copiar`, si existe)
  propaga: boolean
  // valores que siguen copiándose cuando este registro se editó "solo este registro"
  copiar: ValoresVitales | null
  fr: number | null
  bis: number | null
}

export type ViaFarmaco = 'IV' | 'IM' | 'Inhalatoria' | 'Regional' | 'Oral' | 'Subcutánea' | 'Otra'

export type TipoFlag =
  | 'listo'
  | 'inicioIsquemia'
  | 'finIsquemia'
  | 'inicioVMP'
  | 'finVMP'
  | 'inicioCEC'
  | 'finCEC'
  | 'posicion'

export type Posicion = 'Prono' | 'Supino' | 'DLI' | 'DLD' | 'Litotomía' | 'Trendelenburg forzado'

export interface TimeFlag {
  id: string
  hora: string
  tipo: TipoFlag
  presionMmHg: number | null
  posicion: Posicion | null
}

export type TipoVentilacion = 'Espontánea' | 'Volumen control' | 'Presión control' | 'SIMV' | 'Presión soporte' | 'JET'

// Cada registro es una fotografía de los parámetros desde ese momento; rigen hasta el siguiente registro.
export interface RegistroVentilacion {
  id: string
  hora: string
  tipo: TipoVentilacion
  vt: number | null
  fr: number | null
  peep: number | null
  fio2: number | null
}

export type TipoAcceso = 'VVP' | 'PICC' | 'VVC' | 'LINEA_ARTERIAL'

export interface AccesoVascular {
  id: string
  hora: string
  tipo: TipoAcceso
  ubicacion: string
  lado: '' | 'Derecho' | 'Izquierdo'
  calibre: string
  tecnicaEsteril: boolean
  apoyoRadioscopia: boolean
  ecoguiado: boolean
}

export type EventoFarmaco = 'bolo' | 'inicio' | 'cambio' | 'fin'

export interface RegistroFarmaco {
  id: string
  hora: string
  farmacoId: string
  nombre: string
  modo: string
  evento: EventoFarmaco
  valor: number | null
  unidad: string
  dosisTexto?: string
  via: ViaFarmaco
}

export interface ItemCarrito {
  id: string
  farmacoId: string
  presentacionId: string
  dosisSel: string
  dosisManual: string
  nombre: string
  unidad: string
  via: ViaFarmaco
}

export interface RegistroFluido {
  id: string
  hora: string
  tipo: string
  volumenMl: number
  entrada: boolean
}

export interface Evento {
  id: string
  hora: string
  descripcion: string
  cambioAnestesiologo?: { de: string; a: string; entregaFormal: boolean }
}

export type TipoManejoViaAerea =
  | ''
  | 'Intubación orotraqueal'
  | 'Intubación nasotraqueal'
  | 'Máscara laríngea'

export type Cormack = '' | 'I' | 'IIa' | 'IIb' | 'III' | 'IV'

export interface ManejoViaAerea {
  tipo: TipoManejoViaAerea
  tamanoTubo: string
  cormack: Cormack
  tamanoMascara: string
  dispositivosAdicionales: string[]
  tuboDobleLumen: { numero: string; lado: '' | 'Derecho' | 'Izquierdo' }
}

export interface CasoAnestesico {
  id: string
  estado: EstadoCaso
  paciente: DatosPaciente
  cirugia: DatosCirugia
  tiposAnestesia: TipoAnestesia[]
  monitorizacion: string[]
  checklist: string[]
  manejoViaAerea: ManejoViaAerea
  accesosVasculares: AccesoVascular[]
  timeFlags: TimeFlag[]
  ventilacion: RegistroVentilacion[]
  tecnicasRegionales: TecnicaRegional[]
  signosVitales: RegistroVital[]
  carritoFarmacos: ItemCarrito[]
  farmacos: RegistroFarmaco[]
  fluidos: RegistroFluido[]
  eventos: Evento[]
  horaInicioAnestesia: string | null
  horaInicioCirugia: string | null
  horaFinCirugia: string | null
  horaFinAnestesia: string | null
  destinoPaciente: string
  notasFinales: string
  createdAt: string
  updatedAt: string
}
