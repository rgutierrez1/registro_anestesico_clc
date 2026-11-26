import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { CasoAnestesico, RegistroBloqueo } from '../types'
import type { MomentoBloqueo, RegistroMenu } from '../menus/tipos'
import { nuevoId } from './id'

export const ETIQUETA_MOMENTO: Record<MomentoBloqueo, string> = {
  antes_pabellon: 'Bloqueo realizado antes de entrar a pabellón',
  despues_pabellon: 'Bloqueo realizado después de entrar a pabellón',
}

export function crearRegistroBloqueoVacio(): RegistroBloqueo {
  const ahora = new Date().toISOString()
  return {
    id: nuevoId(),
    paciente: { nombre: '', edad: '', historiaClinica: '' },
    procedimiento: '',
    anestesiologo: '',
    fecha: ahora.slice(0, 10),
    bloqueos: [],
    createdAt: ahora,
    updatedAt: ahora,
  }
}

// Antes o después de entrar a pabellón: se compara la hora del bloqueo con el inicio de la anestesia.
export function momentoSugerido(horaBloqueo: string, caso: Pick<CasoAnestesico, 'horaInicioAnestesia'>): MomentoBloqueo {
  return caso.horaInicioAnestesia && Date.parse(horaBloqueo) >= Date.parse(caso.horaInicioAnestesia) ? 'despues_pabellon' : 'antes_pabellon'
}

export type TipoRegistroIndependiente = 'bloqueo' | 'neuroaxial'

export interface BloqueoPendiente {
  registro: RegistroBloqueo
  bloqueo: RegistroMenu
  tipo: TipoRegistroIndependiente
}

const pendientes = (r: RegistroBloqueo, tipo: TipoRegistroIndependiente): BloqueoPendiente[] =>
  (tipo === 'bloqueo' ? r.bloqueos : (r.neuroaxial ?? [])).filter((b) => !b.anulado && !b.asociadoA).map((bloqueo) => ({ registro: r, bloqueo, tipo }))

// Bloqueos y epidurales independientes que todavía no se agregaron a ningún registro anestésico.
export function useBloqueosPendientes(): BloqueoPendiente[] {
  const registros = useLiveQuery(() => db.registrosBloqueo.toArray(), [])
  return (registros ?? []).flatMap((r) => [...pendientes(r, 'bloqueo'), ...pendientes(r, 'neuroaxial')]).sort((a, b) => b.bloqueo.hora.localeCompare(a.bloqueo.hora))
}

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

// Mismo paciente (por nombre) primero.
export function mismoPaciente(a: string, b: string): boolean {
  const x = norm(a)
  const y = norm(b)
  return x !== '' && y !== '' && (x.includes(y) || y.includes(x))
}

// Copia el bloqueo (o la epidural) al registro anestésico con la marca de antes/después de pabellón y lo da por asociado.
export async function asociarBloqueo(
  registroId: string,
  bloqueoId: string,
  casoId: string,
  momento: MomentoBloqueo,
  tipo: TipoRegistroIndependiente = 'bloqueo',
): Promise<void> {
  await db.transaction('rw', db.casos, db.registrosBloqueo, async () => {
    const registro = await db.registrosBloqueo.get(registroId)
    const caso = await db.casos.get(casoId)
    const lista = tipo === 'bloqueo' ? registro?.bloqueos : registro?.neuroaxial
    const bloqueo = lista?.find((b) => b.id === bloqueoId)
    if (!registro || !caso || !lista || !bloqueo) return
    const ahora = new Date().toISOString()
    const copia: RegistroMenu = { ...bloqueo, asociadoA: undefined, contexto: { momento, registroId, paciente: registro.paciente.nombre } }
    const destino = tipo === 'bloqueo' ? caso.bloqueos : caso.neuroaxial
    if (!destino.some((b) => b.id === bloqueoId)) {
      await db.casos.update(casoId, tipo === 'bloqueo' ? { bloqueos: [...destino, copia], updatedAt: ahora } : { neuroaxial: [...destino, copia], updatedAt: ahora })
    }
    const marcada = lista.map((b) => (b.id === bloqueoId ? { ...b, asociadoA: { casoId, hora: ahora } } : b))
    await db.registrosBloqueo.update(registroId, tipo === 'bloqueo' ? { bloqueos: marcada, updatedAt: ahora } : { neuroaxial: marcada, updatedAt: ahora })
  })
}
