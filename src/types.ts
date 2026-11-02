import type { RegistroMenu } from './menus/tipos'
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
  edadMeses?: number | ''
  asa: ASA | ''
  grupoSanguineo: string
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

export type TipoExamen = 'HGT' | 'HCTO_HB' | 'ELP' | 'GASES_ART' | 'GASES_VEN' | 'ROTEM' | 'ACT'

export interface ExamenLab {
  id: string
  hora: string
  tipo: TipoExamen
  // Resultados por campo (texto, para admitir coma decimal); las claves dependen del tipo de examen.
  valores: Record<string, string>
  notas: string
}

export type AccesoVascular = RegistroMenu

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
  // Código del catálogo del balance (o la etiqueta, en registros antiguos).
  tipo: string
  // mL, o unidades (U) en los hemocomponentes.
  cantidad: number
  unidad: 'mL' | 'U'
  entrada: boolean
}

export interface Evento {
  id: string
  hora: string
  descripcion: string
  cambioAnestesiologo?: { de: string; a: string; entregaFormal: boolean }
  complicacion?: { tipo: string; detalle: string }
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

// Cada dispositivo usado (máscara, tubo…) es un registro con hora; se pueden agregar varios.
export interface ViaAereaMenu {
  registros: RegistroMenu[]
  legado?: unknown
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
  viaAereaMenu: ViaAereaMenu
  // Versión de los menús de clic: automática por edad (≤ 10 años = pediátrica; mayor de 10, adulto) o fijada a mano.
  versionMenus: 'auto' | 'adulto' | 'ped'
  timeFlags: TimeFlag[]
  ventilacion: RegistroVentilacion[]
  laboratorio: ExamenLab[]
  // Técnicas regionales de versiones anteriores; se migran a `bloqueos` o `neuroaxial`.
  tecnicasRegionales: TecnicaRegional[]
  // Bloqueos regionales y anestesia neuroaxial (raquídea, peridural): cada uno es un registro con hora.
  bloqueos: RegistroMenu[]
  neuroaxial: RegistroMenu[]
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
