export type ASA = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI'

export type EstadoCaso = 'planificado' | 'en_curso' | 'finalizado'

export type TipoAnestesia =
  | 'General'
  | 'Regional'
  | 'Sedación'
  | 'Local'
  | 'Combinada (General + Regional)'

export interface DatosPaciente {
  nombre: string
  historiaClinica: string
  edad: number | ''
  sexo: 'F' | 'M' | 'Otro' | ''
  peso: number | ''
  altura: number | ''
  asa: ASA | ''
  alergias: string
  antecedentes: string
  ayuno: string
  viaAerea: string
}

export interface DatosCirugia {
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

export interface RegistroVital {
  id: string
  hora: string
  fc: number | null
  pas: number | null
  pad: number | null
  pam: number | null
  spo2: number | null
  etco2: number | null
  temp: number | null
  fr: number | null
  bis: number | null
}

export type ViaFarmaco = 'IV' | 'IM' | 'Inhalatoria' | 'Regional' | 'Oral' | 'Subcutánea' | 'Otra'

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
}

export interface CasoAnestesico {
  id: string
  estado: EstadoCaso
  paciente: DatosPaciente
  cirugia: DatosCirugia
  tiposAnestesia: TipoAnestesia[]
  monitorizacion: string[]
  manejoViaAerea: ManejoViaAerea
  tecnicasRegionales: TecnicaRegional[]
  signosVitales: RegistroVital[]
  carritoFarmacos: ItemCarrito[]
  farmacos: RegistroFarmaco[]
  fluidos: RegistroFluido[]
  eventos: Evento[]
  horaInicioAnestesia: string | null
  horaFinAnestesia: string | null
  destinoPaciente: string
  notasFinales: string
  createdAt: string
  updatedAt: string
}
