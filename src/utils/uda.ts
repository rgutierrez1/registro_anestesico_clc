import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { DEF_BLOQUEOS, tarjetaBloqueo } from '../menus/bloqueos'
import { DEF_NEUROAXIAL, tarjetaNeuroaxial } from '../menus/neuroaxial'
import { buscarOpcion } from '../menus/motor'
import type { MenuDef, RegistroMenu } from '../menus/tipos'
import type { FichaUDA, VisitaUDA } from '../types'
import { nuevoId } from './id'
import type { TipoRegistroIndependiente } from './bloqueosIndependientes'

// Un paciente entra a la UDA cuando algún registro marca un catéter (bloqueo periférico con catéter o epidural con catéter).
export function tieneCateter(tipo: TipoRegistroIndependiente, r: RegistroMenu): boolean {
  if (r.anulado) return false
  if (tipo === 'bloqueo') return r.valores['blq.modalidad'] === 'cateter'
  const t = r.valores['neu.tipo']
  return (t === 'peridural' || t === 'combinada') && r.valores['neu.cateter'] === true
}

export interface PacienteUDA {
  // Id del bloqueo o de la epidural (es también el id de la ficha).
  id: string
  tipo: TipoRegistroIndependiente
  entrada: RegistroMenu
  origen: { tipo: 'caso' | 'bloqueo'; id: string }
  nombre: string
  historiaClinica: string
  edad: number | ''
  peso: number | ''
  altura: number | ''
  alergias: string
  asa: string
  antecedentes: string
  diagnostico: string
  procedimiento: string
  cirujano: string
  anestesiologo: string
  fechaCirugia: string
  tiposAnestesia: string[]
  ficha?: FichaUDA
  retirado: boolean
}

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const sinHora = () => ''

export function descripcionTecnica(p: Pick<PacienteUDA, 'tipo' | 'entrada'>): string {
  return p.tipo === 'bloqueo' ? tarjetaBloqueo(p.entrada, sinHora) : tarjetaNeuroaxial(p.entrada, sinHora)
}

export const tituloTecnica = (tipo: TipoRegistroIndependiente) => (tipo === 'bloqueo' ? 'Bloqueo periférico con catéter' : 'Epidural con catéter')

function etiqueta(def: MenuDef, campo: string, codigo: unknown, v: RegistroMenu['valores']): string {
  const c = texto(codigo)
  if (!c) return ''
  const otro = texto(v[`${campo}#texto:${c}`])
  if (c === 'otro' && otro) return otro
  return buscarOpcion(def, campo, c)?.etiqueta ?? c
}

// Datos del catéter que ya están en el registro (columnas A–E de la planilla UDA).
export function datosCateter(p: Pick<PacienteUDA, 'tipo' | 'entrada'>): { etiqueta: string; valor: string }[] {
  const v = p.entrada.valores
  const filas: { etiqueta: string; valor: string }[] = []
  const agregar = (e: string, valor: string) => valor && filas.push({ etiqueta: e, valor })
  if (p.tipo === 'bloqueo') {
    agregar('Bloqueo', etiqueta(DEF_BLOQUEOS, 'blq.tipo', v['blq.tipo'], v) + (texto(v['blq.detalle']) ? ` (${texto(v['blq.detalle'])})` : ''))
    agregar('Lateralidad', etiqueta(DEF_BLOQUEOS, 'blq.lateralidad', v['blq.lateralidad'], v))
    agregar('Ubicación del catéter', texto(v['blq.cat_ubicacion']))
    agregar('Profundidad de inserción', typeof v['blq.profundidad_mm'] === 'number' ? `${v['blq.profundidad_mm']} mm` : '')
    agregar('Fijación en piel', typeof v['blq.cat_fijacion_cm'] === 'number' ? `${v['blq.cat_fijacion_cm']} cm` : '')
    agregar('Método de fijación', etiqueta(DEF_BLOQUEOS, 'blq.cat_metodo', v['blq.cat_metodo'], v))
    agregar('Esquema (cont/bolo/lockout)', etiqueta(DEF_BLOQUEOS, 'blq.cat_esquema', v['blq.cat_esquema'], v))
    agregar('Solución de infusión', etiqueta(DEF_BLOQUEOS, 'blq.cat_solucion', v['blq.cat_solucion'], v))
    agregar('Destino', etiqueta(DEF_BLOQUEOS, 'blq.cat_destino', v['blq.cat_destino'], v))
    agregar(
      'Anestésico de carga',
      [etiqueta(DEF_BLOQUEOS, 'blq.anestesico', v['blq.anestesico'], v), typeof v['blq.dosis_mg'] === 'number' ? `${v['blq.dosis_mg']} mg` : '', texto(v['blq.volumen_ml']) ? `${texto(v['blq.volumen_ml'])} mL` : '']
        .filter(Boolean)
        .join(' · '),
    )
  } else {
    agregar('Técnica', etiqueta(DEF_NEUROAXIAL, 'neu.tipo', v['neu.tipo'], v))
    agregar('Nivel', etiqueta(DEF_NEUROAXIAL, 'neu.nivel', v['neu.nivel'], v))
    agregar('Aguja', etiqueta(DEF_NEUROAXIAL, 'neu.aguja_epidural', v['neu.aguja_epidural'], v))
    agregar('Fijación en piel', typeof v['neu.cat_fijacion_cm'] === 'number' ? `${v['neu.cat_fijacion_cm']} cm` : '')
    agregar('Esquema (cont/bolo/lockout)', etiqueta(DEF_NEUROAXIAL, 'neu.cat_esquema', v['neu.cat_esquema'], v))
    agregar('Solución de infusión', etiqueta(DEF_NEUROAXIAL, 'neu.cat_solucion', v['neu.cat_solucion'], v))
  }
  return filas
}

// Programación de la bomba sugerida para la primera visita (por ejemplo "8/5/20").
export function programacionInicial(p: Pick<PacienteUDA, 'tipo' | 'entrada'>): string {
  const v = p.entrada.valores
  const campo = p.tipo === 'bloqueo' ? 'blq.cat_esquema' : 'neu.cat_esquema'
  const cod = texto(v[campo])
  if (!cod || cod === 'otro') return texto(v[`${campo}#texto:otro`])
  return etiqueta(p.tipo === 'bloqueo' ? DEF_BLOQUEOS : DEF_NEUROAXIAL, campo, cod, v)
}

export function infusorInicial(p: Pick<PacienteUDA, 'tipo' | 'entrada'>): FichaUDA['infusor'] {
  return p.tipo === 'bloqueo' && p.entrada.valores['blq.cat_destino'] === 'domicilio_elastomerica' ? 'elastomerica' : ''
}

const partesFecha = (iso: string): [number, number, number] => {
  const d = new Date(iso)
  return [d.getFullYear(), d.getMonth(), d.getDate()]
}

// Día postoperatorio: 0 = día de la cirugía.
export function diaPostop(fechaCirugia: string, horaIso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaCirugia)
  if (!m) return null
  const [y, mo, d] = partesFecha(horaIso)
  const dias = Math.round((Date.UTC(y, mo, d) - Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) / 86400000)
  return dias
}

export function nuevaFicha(p: Pick<PacienteUDA, 'id' | 'asa' | 'antecedentes' | 'tipo' | 'entrada'>): FichaUDA {
  const ahora = new Date().toISOString()
  return {
    id: p.id,
    asa: p.asa,
    funcionRenal: '',
    contraindAines: '',
    patologias: p.antecedentes,
    infusor: infusorInicial(p),
    visitas: [],
    createdAt: ahora,
    updatedAt: ahora,
  }
}

export function nuevaVisita(p: Pick<PacienteUDA, 'tipo' | 'entrada' | 'ficha'>): VisitaUDA {
  const previas = (p.ficha?.visitas ?? []).filter((v) => !v.anulada).sort((a, b) => b.hora.localeCompare(a.hora))
  return {
    id: nuevoId(),
    hora: new Date().toISOString(),
    visitador: '',
    evaReposo: null,
    evaDinamico: null,
    // Se parte de la programación de la visita anterior (o la del registro del catéter).
    progPCA: previas[0]?.progPCA || programacionInicial(p),
    cambioPCA: '',
    terapiaPCT: '',
    aineInf: '',
    icox2: '',
    aineSOS: '',
    tramal: '',
    morfina: '',
    hipBzdPsiq: '',
    otroFarmaco: '',
    boloDemandado: null,
    boloAdministrado: null,
    volInfundir: '',
    nBolsa: '',
    shift: '',
    sedacion: null,
    nauseasVomito: '',
    prurito: '',
    retOrina: '',
    constipacion: '',
    efectoOtro: '',
    estadoCateter: '',
    estadoCateterNota: '',
    bloqueoMotor: null,
    trombofilaxis: previas[0]?.trombofilaxis ?? '',
    plan: '',
  }
}

// Guarda la ficha (se crea al primer cambio). Siempre se trabaja sobre la versión más reciente de la base de datos.
export async function actualizarFicha(p: Pick<PacienteUDA, 'id' | 'asa' | 'antecedentes' | 'tipo' | 'entrada'>, cambiar: (f: FichaUDA) => FichaUDA): Promise<void> {
  await db.transaction('rw', db.fichasUDA, async () => {
    const actual = (await db.fichasUDA.get(p.id)) ?? nuevaFicha(p)
    await db.fichasUDA.put({ ...cambiar(actual), updatedAt: new Date().toISOString() })
  })
}

// Todos los pacientes con catéter, vigentes y retirados, tomados en vivo de los registros anestésicos y de bloqueos.
export function usePacientesUDA(): PacienteUDA[] | undefined {
  return useLiveQuery(async () => {
    const [casos, registros, fichas] = await Promise.all([db.casos.toArray(), db.registrosBloqueo.toArray(), db.fichasUDA.toArray()])
    const porId = new Map(fichas.map((f) => [f.id, f]))
    const vistos = new Set<string>()
    const lista: PacienteUDA[] = []
    const casoIds = new Set(casos.map((c) => c.id))
    const agregar = (p: Omit<PacienteUDA, 'ficha' | 'retirado'>) => {
      if (vistos.has(p.id)) return
      vistos.add(p.id)
      const ficha = porId.get(p.id)
      lista.push({ ...p, ficha, retirado: !!ficha?.retiro })
    }
    for (const c of casos) {
      const base = {
        origen: { tipo: 'caso' as const, id: c.id },
        nombre: c.paciente.nombre,
        historiaClinica: c.paciente.historiaClinica,
        edad: c.paciente.edad,
        peso: c.paciente.peso,
        altura: c.paciente.altura,
        alergias: [...(c.paciente.alergiasLista ?? []), c.paciente.alergiasOtros].filter(Boolean).join(', ') || c.paciente.alergias,
        asa: c.paciente.asa,
        antecedentes: c.paciente.antecedentes,
        diagnostico: c.cirugia.diagnostico,
        procedimiento: c.cirugia.procedimiento,
        cirujano: c.cirugia.cirujano,
        anestesiologo: c.cirugia.anestesiologo,
        fechaCirugia: c.cirugia.fecha,
        tiposAnestesia: c.tiposAnestesia as string[],
      }
      for (const e of c.bloqueos) if (tieneCateter('bloqueo', e)) agregar({ ...base, id: e.id, tipo: 'bloqueo', entrada: e })
      for (const e of c.neuroaxial) if (tieneCateter('neuroaxial', e)) agregar({ ...base, id: e.id, tipo: 'neuroaxial', entrada: e })
    }
    // Los bloqueos independientes ya agregados a un registro anestésico se cuentan una sola vez (con el registro anestésico).
    for (const r of registros) {
      const base = {
        origen: { tipo: 'bloqueo' as const, id: r.id },
        nombre: r.paciente.nombre,
        historiaClinica: r.paciente.historiaClinica,
        edad: r.paciente.edad,
        peso: '' as const,
        altura: '' as const,
        alergias: '',
        asa: '',
        antecedentes: '',
        diagnostico: '',
        procedimiento: r.procedimiento,
        cirujano: '',
        anestesiologo: r.anestesiologo,
        fechaCirugia: r.fecha,
        tiposAnestesia: [] as string[],
      }
      const propio = (e: RegistroMenu) => !(e.asociadoA && casoIds.has(e.asociadoA.casoId))
      for (const e of r.bloqueos) if (propio(e) && tieneCateter('bloqueo', e)) agregar({ ...base, id: e.id, tipo: 'bloqueo', entrada: e })
      for (const e of r.neuroaxial ?? []) if (propio(e) && tieneCateter('neuroaxial', e)) agregar({ ...base, id: e.id, tipo: 'neuroaxial', entrada: e })
    }
    return lista.sort((a, b) => b.entrada.hora.localeCompare(a.entrada.hora))
  }, [])
}
