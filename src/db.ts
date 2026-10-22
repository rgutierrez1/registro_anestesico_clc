import Dexie, { type Table } from 'dexie'
import type { CasoAnestesico, ManejoViaAerea } from './types'

class RegistroAnestesicoDB extends Dexie {
  casos!: Table<CasoAnestesico, string>

  constructor() {
    super('registro-anestesico')
    this.version(1).stores({
      casos: 'id, estado, createdAt, paciente.nombre',
    })
    this.version(2)
      .stores({
        casos: 'id, estado, createdAt, paciente.nombre',
      })
      .upgrade((tx) =>
        tx
          .table('casos')
          .toCollection()
          .modify((caso) => {
            if (!caso.manejoViaAerea) caso.manejoViaAerea = crearManejoViaAereaVacio()
          }),
      )
  }
}

export function crearManejoViaAereaVacio(): ManejoViaAerea {
  return { tipo: '', tamanoTubo: '', cormack: '', tamanoMascara: '', dispositivosAdicionales: [] }
}

export const db = new RegistroAnestesicoDB()

export function crearCasoVacio(): CasoAnestesico {
  const ahora = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    estado: 'planificado',
    paciente: {
      nombre: '',
      historiaClinica: '',
      edad: '',
      sexo: '',
      peso: '',
      altura: '',
      asa: '',
      alergias: '',
      antecedentes: '',
      ayuno: '',
      viaAerea: '',
    },
    cirugia: {
      procedimiento: '',
      cirujano: '',
      fecha: ahora.slice(0, 10),
      anestesiologo: '',
    },
    tiposAnestesia: [],
    monitorizacion: [],
    manejoViaAerea: crearManejoViaAereaVacio(),
    tecnicasRegionales: [],
    signosVitales: [],
    farmacos: [],
    fluidos: [],
    eventos: [],
    horaInicioAnestesia: null,
    horaFinAnestesia: null,
    destinoPaciente: '',
    notasFinales: '',
    createdAt: ahora,
    updatedAt: ahora,
  }
}
