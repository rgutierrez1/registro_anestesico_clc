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

export interface BloqueoPendiente {
  registro: RegistroBloqueo
  bloqueo: RegistroMenu
}

// Bloqueos independientes que todavía no se agregaron a ningún registro anestésico.
export function useBloqueosPendientes(): BloqueoPendiente[] {
  const registros = useLiveQuery(() => db.registrosBloqueo.toArray(), [])
  return (registros ?? [])
    .flatMap((registro) => registro.bloqueos.filter((b) => !b.anulado && !b.asociadoA).map((bloqueo) => ({ registro, bloqueo })))
    .sort((a, b) => b.bloqueo.hora.localeCompare(a.bloqueo.hora))
}

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

// Mismo paciente (por nombre) primero.
export function mismoPaciente(a: string, b: string): boolean {
  const x = norm(a)
  const y = norm(b)
  return x !== '' && y !== '' && (x.includes(y) || y.includes(x))
}

// Copia el bloqueo al registro anestésico con la marca de antes/después de pabellón y lo da por asociado.
export async function asociarBloqueo(registroId: string, bloqueoId: string, casoId: string, momento: MomentoBloqueo): Promise<void> {
  await db.transaction('rw', db.casos, db.registrosBloqueo, async () => {
    const registro = await db.registrosBloqueo.get(registroId)
    const caso = await db.casos.get(casoId)
    const bloqueo = registro?.bloqueos.find((b) => b.id === bloqueoId)
    if (!registro || !caso || !bloqueo) return
    const ahora = new Date().toISOString()
    const copia: RegistroMenu = { ...bloqueo, asociadoA: undefined, contexto: { momento, registroId, paciente: registro.paciente.nombre } }
    if (!caso.bloqueos.some((b) => b.id === bloqueoId)) await db.casos.update(casoId, { bloqueos: [...caso.bloqueos, copia], updatedAt: ahora })
    await db.registrosBloqueo.update(registroId, {
      bloqueos: registro.bloqueos.map((b) => (b.id === bloqueoId ? { ...b, asociadoA: { casoId, hora: ahora } } : b)),
      updatedAt: ahora,
    })
  })
}
