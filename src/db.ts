import Dexie, { type Table } from 'dexie'
import type { CasoAnestesico, ManejoViaAerea, RegistroFarmaco } from './types'

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
    this.version(3)
      .stores({
        casos: 'id, estado, createdAt, paciente.nombre',
      })
      .upgrade((tx) =>
        tx
          .table('casos')
          .toCollection()
          .modify((caso) => {
            if (!caso.carritoFarmacos) caso.carritoFarmacos = []
            caso.farmacos = (caso.farmacos ?? []).map(migrarFarmacoAntiguo)
          }),
      )
  }
}

// Formato anterior: { dosis: string, tipo: 'Bolo' | 'Infusión inicio' | 'Infusión fin' }
function migrarFarmacoAntiguo(f: Record<string, unknown>): RegistroFarmaco {
  if (f.farmacoId) return f as unknown as RegistroFarmaco
  const tipo = String(f.tipo ?? 'Bolo')
  return {
    id: String(f.id),
    hora: String(f.hora),
    farmacoId: 'personalizado',
    nombre: String(f.nombre ?? ''),
    modo: tipo,
    evento: tipo === 'Infusión inicio' ? 'inicio' : tipo === 'Infusión fin' ? 'fin' : 'bolo',
    valor: null,
    unidad: '',
    dosisTexto: String(f.dosis ?? ''),
    via: (f.via as RegistroFarmaco['via']) ?? 'IV',
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
    carritoFarmacos: [],
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
