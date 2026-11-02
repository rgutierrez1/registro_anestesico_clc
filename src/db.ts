import Dexie, { type Table } from 'dexie'
import { MONITORIZACION_ESTANDAR } from './constants'
import { migrarAccesoLegado, migrarAccesoV1 } from './menus/accesos'
import { migrarTecnicaRegional } from './menus/bloqueos'
import { esTecnicaNeuroaxial, migrarTecnicaNeuroaxial } from './menus/neuroaxial'
import { migrarViaAerea } from './menus/viaAerea'
import type { RegistroMenu } from './menus/tipos'
import type { AccesoVascular, CasoAnestesico, ManejoViaAerea, RegistroFarmaco, RegistroFluido, TecnicaRegional, ViaAereaMenu } from './types'
import { nuevoId } from './utils/id'

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
    this.version(4)
      .stores({
        casos: 'id, estado, createdAt, paciente.nombre',
      })
      .upgrade((tx) =>
        tx
          .table('casos')
          .toCollection()
          .modify((caso) => {
            caso.horaInicioCirugia ??= null
            caso.horaFinCirugia ??= null
          }),
      )
    this.version(5)
      .stores({
        casos: 'id, estado, createdAt, paciente.nombre',
      })
      .upgrade((tx) =>
        tx
          .table('casos')
          .toCollection()
          .modify((caso) => {
            caso.signosVitales = (caso.signosVitales ?? []).map((v: Record<string, unknown>) => ({
              ...v,
              propaga: v.propaga ?? false,
              copiar: v.copiar ?? null,
            }))
          }),
      )
    this.version(6)
      .stores({
        casos: 'id, estado, createdAt, paciente.nombre',
      })
      .upgrade((tx) =>
        tx
          .table('casos')
          .toCollection()
          .modify((caso) => {
            if (caso.manejoViaAerea) caso.manejoViaAerea.tuboDobleLumen ??= { numero: '', lado: '' }
          }),
      )
    this.version(7)
      .stores({
        casos: 'id, estado, createdAt, paciente.nombre',
      })
      .upgrade((tx) =>
        tx
          .table('casos')
          .toCollection()
          .modify((caso) => {
            caso.checklist ??= []
          }),
      )
    this.version(8)
      .stores({
        casos: 'id, estado, createdAt, paciente.nombre',
      })
      .upgrade((tx) =>
        tx
          .table('casos')
          .toCollection()
          .modify((caso) => {
            caso.accesosVasculares ??= []
          }),
      )
    this.version(9)
      .stores({
        casos: 'id, estado, createdAt, paciente.nombre',
      })
      .upgrade((tx) =>
        tx
          .table('casos')
          .toCollection()
          .modify((caso) => {
            caso.tiposAnestesia = (caso.tiposAnestesia ?? []).map((t: string) => (t === 'Regional' ? 'Bloqueo regional' : t))
          }),
      )
    this.version(10)
      .stores({
        casos: 'id, estado, createdAt, paciente.nombre',
      })
      .upgrade((tx) =>
        tx
          .table('casos')
          .toCollection()
          .modify((caso) => {
            // "Combinada (General + Regional)" se reemplaza por los dos tipos que la componían.
            const tipos: string[] = []
            for (const t of caso.tiposAnestesia ?? []) {
              const nuevos = t === 'Combinada (General + Regional)' ? ['General', 'Bloqueo regional'] : [t]
              for (const n of nuevos) if (!tipos.includes(n)) tipos.push(n)
            }
            caso.tiposAnestesia = tipos
          }),
      )
    this.version(11)
      .stores({
        casos: 'id, estado, createdAt, paciente.nombre',
      })
      .upgrade((tx) =>
        tx
          .table('casos')
          .toCollection()
          .modify((caso) => {
            caso.timeFlags ??= []
          }),
      )
    this.version(12)
      .stores({
        casos: 'id, estado, createdAt, paciente.nombre',
      })
      .upgrade((tx) =>
        tx
          .table('casos')
          .toCollection()
          .modify((caso) => {
            caso.ventilacion ??= []
          }),
      )
    this.version(13)
      .stores({
        casos: 'id, estado, createdAt, paciente.nombre',
      })
      .upgrade((tx) =>
        tx
          .table('casos')
          .toCollection()
          .modify((caso) => {
            caso.laboratorio ??= []
          }),
      )
    this.version(14)
      .stores({
        casos: 'id, estado, createdAt, paciente.nombre',
      })
      .upgrade((tx) =>
        tx
          .table('casos')
          .toCollection()
          .modify((caso) => {
            caso.accesosVasculares = (caso.accesosVasculares ?? []).map(migrarAcceso)
            caso.viaAereaMenu = caso.viaAereaMenu ? migrarViaAerea(caso.viaAereaMenu) : vacioViaAerea()
            caso.versionMenus ??= 'auto'
          }),
      )
    this.version(15)
      .stores({
        casos: 'id, estado, createdAt, paciente.nombre',
      })
      .upgrade((tx) =>
        tx
          .table('casos')
          .toCollection()
          .modify((caso) => {
            caso.fluidos = (caso.fluidos ?? []).map(migrarFluido)
          }),
      )
    this.version(16)
      .stores({
        casos: 'id, estado, createdAt, paciente.nombre',
      })
      .upgrade((tx) =>
        tx
          .table('casos')
          .toCollection()
          .modify((caso) => {
            caso.accesosVasculares = (caso.accesosVasculares ?? []).map(migrarAcceso)
            caso.viaAereaMenu = caso.viaAereaMenu ? migrarViaAerea(caso.viaAereaMenu) : vacioViaAerea()
          }),
      )
    this.version(17)
      .stores({
        casos: 'id, estado, createdAt, paciente.nombre',
      })
      .upgrade((tx) =>
        tx
          .table('casos')
          .toCollection()
          .modify((caso) => {
            const antiguas: TecnicaRegional[] = caso.tecnicasRegionales ?? []
            caso.bloqueos = [...(caso.bloqueos ?? []), ...antiguas.filter((t) => !esTecnicaNeuroaxial(t)).map(migrarTecnicaRegional)]
            caso.neuroaxial = [...(caso.neuroaxial ?? []), ...antiguas.filter(esTecnicaNeuroaxial).map(migrarTecnicaNeuroaxial)]
            caso.tecnicasRegionales = []
          }),
      )
    this.casos.hook('reading', (caso) => normalizarCaso(caso))
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
  return {
    tipo: '',
    tamanoTubo: '',
    cormack: '',
    tamanoMascara: '',
    dispositivosAdicionales: [],
    tuboDobleLumen: { numero: '', lado: '' },
  }
}

// Los registros anteriores guardaban solo `volumenMl`.
function migrarFluido(f: RegistroFluido | (Record<string, unknown> & { volumenMl?: number })): RegistroFluido {
  if ('cantidad' in f) return f as RegistroFluido
  const { volumenMl, ...resto } = f as Record<string, unknown> & { volumenMl?: number }
  return { ...resto, cantidad: volumenMl ?? 0, unidad: 'mL' } as RegistroFluido
}

// Las técnicas antiguas se suman a los bloqueos sin duplicarlas (mismo id) ni resucitar las anuladas.
function unirAntiguas(registros: RegistroMenu[], antiguas: TecnicaRegional[], migrar: (t: TecnicaRegional) => RegistroMenu): RegistroMenu[] {
  const ids = new Set(registros.map((b) => b.id))
  return [...registros, ...antiguas.filter((t) => !ids.has(t.id)).map(migrar)]
}

const vacioViaAerea = (): ViaAereaMenu => ({ registros: [] })

// Los accesos guardados antes de los menús de clic se convierten a códigos (sin perder el original).
function migrarAcceso(a: AccesoVascular | Record<string, unknown>): AccesoVascular {
  return 'valores' in a ? migrarAccesoV1(a as AccesoVascular) : migrarAccesoLegado(a as never)
}

// Completa los campos que un caso guardado en una versión anterior pueda no tener,
// para que ninguna pantalla falle por un dato faltante.
export function normalizarCaso(c: CasoAnestesico): CasoAnestesico {
  const via = c.manejoViaAerea ?? crearManejoViaAereaVacio()
  return {
    ...c,
    paciente: {
      ...c.paciente,
      grupoSanguineo: c.paciente?.grupoSanguineo ?? '',
      edadMeses: c.paciente?.edadMeses ?? '',
      alergiasLista: c.paciente?.alergiasLista ?? [],
      alergiasOtros: c.paciente?.alergiasOtros ?? '',
    },
    cirugia: { ...c.cirugia, diagnostico: c.cirugia?.diagnostico ?? '' },
    tiposAnestesia: c.tiposAnestesia ?? [],
    monitorizacion: c.monitorizacion ?? [],
    checklist: c.checklist ?? [],
    carritoFarmacos: c.carritoFarmacos ?? [],
    accesosVasculares: (c.accesosVasculares ?? []).map(migrarAcceso),
    viaAereaMenu: c.viaAereaMenu ? migrarViaAerea(c.viaAereaMenu) : vacioViaAerea(),
    versionMenus: c.versionMenus ?? 'auto',
    timeFlags: c.timeFlags ?? [],
    ventilacion: c.ventilacion ?? [],
    laboratorio: c.laboratorio ?? [],
    tecnicasRegionales: [],
    bloqueos: unirAntiguas(c.bloqueos ?? [], (c.tecnicasRegionales ?? []).filter((t) => !esTecnicaNeuroaxial(t)), migrarTecnicaRegional),
    neuroaxial: unirAntiguas(c.neuroaxial ?? [], (c.tecnicasRegionales ?? []).filter(esTecnicaNeuroaxial), migrarTecnicaNeuroaxial),
    signosVitales: c.signosVitales ?? [],
    farmacos: c.farmacos ?? [],
    fluidos: (c.fluidos ?? []).map(migrarFluido),
    eventos: c.eventos ?? [],
    horaInicioCirugia: c.horaInicioCirugia ?? null,
    horaFinCirugia: c.horaFinCirugia ?? null,
    manejoViaAerea: {
      ...crearManejoViaAereaVacio(),
      ...via,
      dispositivosAdicionales: via.dispositivosAdicionales ?? [],
      tuboDobleLumen: via.tuboDobleLumen ?? { numero: '', lado: '' },
    },
  }
}

export const db = new RegistroAnestesicoDB()

export function crearCasoVacio(): CasoAnestesico {
  const ahora = new Date().toISOString()
  return {
    id: nuevoId(),
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
      grupoSanguineo: '',
      edadMeses: '',
      alergiasLista: [],
      alergiasOtros: '',
      antecedentes: '',
      ayuno: '',
      viaAerea: '',
    },
    cirugia: {
      diagnostico: '',
      procedimiento: '',
      cirujano: '',
      fecha: ahora.slice(0, 10),
      anestesiologo: '',
    },
    tiposAnestesia: [],
    monitorizacion: [...MONITORIZACION_ESTANDAR],
    checklist: [],
    manejoViaAerea: crearManejoViaAereaVacio(),
    accesosVasculares: [],
    viaAereaMenu: vacioViaAerea(),
    versionMenus: 'auto',
    timeFlags: [],
    ventilacion: [],
    laboratorio: [],
    tecnicasRegionales: [],
    bloqueos: [],
    neuroaxial: [],
    signosVitales: [],
    carritoFarmacos: [],
    farmacos: [],
    fluidos: [],
    eventos: [],
    horaInicioAnestesia: null,
    horaInicioCirugia: null,
    horaFinCirugia: null,
    horaFinAnestesia: null,
    destinoPaciente: '',
    notasFinales: '',
    createdAt: ahora,
    updatedAt: ahora,
  }
}
