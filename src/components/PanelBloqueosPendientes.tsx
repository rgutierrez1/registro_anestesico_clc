import { useState } from 'react'
import { tarjetaBloqueo } from '../menus/bloqueos'
import { tarjetaNeuroaxial } from '../menus/neuroaxial'
import type { MomentoBloqueo } from '../menus/tipos'
import type { CasoAnestesico } from '../types'
import { asociarBloqueo, ETIQUETA_MOMENTO, mismoPaciente, momentoSugerido, type BloqueoPendiente } from '../utils/bloqueosIndependientes'
import { formatHora } from '../utils/tiempo'
import { Button, Pill } from './ui'

// Confirma si el bloqueo se hizo antes o después de entrar a pabellón (se propone según la hora).
const tarjetaDe = (p: BloqueoPendiente) => (p.tipo === 'bloqueo' ? tarjetaBloqueo(p.bloqueo, formatHora) : tarjetaNeuroaxial(p.bloqueo, formatHora))

export function ConfirmarAsociacion({
  titulo,
  hora,
  sugerido,
  onConfirmar,
  onCancelar,
}: {
  titulo: string
  hora: string
  sugerido: MomentoBloqueo
  onConfirmar: (momento: MomentoBloqueo) => void
  onCancelar: () => void
}) {
  const [momento, setMomento] = useState<MomentoBloqueo>(sugerido)
  return (
    <div className="mt-2 rounded-xl border border-sky-300 bg-sky-50 p-3">
      <p className="text-sm font-semibold text-sky-900">{titulo}</p>
      <p className="mb-2 text-xs text-sky-800">Hora del bloqueo: {formatHora(hora)}. Quedará anotada junto con la marca de antes o después de pabellón.</p>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(ETIQUETA_MOMENTO) as MomentoBloqueo[]).map((m) => (
          <Pill key={m} active={momento === m} onClick={() => setMomento(m)}>
            {ETIQUETA_MOMENTO[m]}
          </Pill>
        ))}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button size="sm" onClick={() => onConfirmar(momento)}>
          Agregar al registro
        </Button>
      </div>
    </div>
  )
}

// En el registro anestésico: bloqueos hechos sin registro (se arrastran a la sección o se agregan con el botón).
export function PanelBloqueosPendientes({
  caso,
  pendientes,
  elegido,
  onElegir,
}: {
  caso: CasoAnestesico
  pendientes: BloqueoPendiente[]
  elegido: BloqueoPendiente | null
  onElegir: (p: BloqueoPendiente | null) => void
}) {
  const [verTodos, setVerTodos] = useState(false)
  if (pendientes.length === 0 && !elegido) return null
  const delPaciente = pendientes.filter((p) => mismoPaciente(p.registro.paciente.nombre, caso.paciente.nombre))
  const lista = verTodos || delPaciente.length === 0 ? pendientes : delPaciente

  return (
    <div className="mb-4 rounded-xl border border-dashed border-sky-300 bg-sky-50/50 p-3">
      <p className="text-sm font-semibold text-sky-900">Bloqueos y epidurales registrados sin registro anestésico ({pendientes.length})</p>
      <p className="mb-2 text-xs text-sky-800">Arrastra uno hasta esta sección, o toca "Agregar a este registro".</p>
      <ul className="flex flex-col gap-2">
        {lista.map((p) => (
          <li
            key={p.bloqueo.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', `${p.registro.id}|${p.bloqueo.id}`)
              e.dataTransfer.effectAllowed = 'copy'
            }}
            className="flex cursor-grab flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">{p.registro.paciente.nombre || 'Paciente sin nombre'}</p>
              <p className="text-xs text-slate-600">
                <span className="mr-1 font-semibold uppercase text-slate-400">{p.tipo === 'bloqueo' ? 'Bloqueo' : 'Epidural'}</span>
                {tarjetaDe(p)}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => onElegir(p)}>
              Agregar a este registro
            </Button>
          </li>
        ))}
      </ul>
      {delPaciente.length > 0 && delPaciente.length < pendientes.length && (
        <button type="button" className="mt-2 min-h-[32px] text-xs text-sky-700 underline" onClick={() => setVerTodos((v) => !v)}>
          {verTodos ? 'Mostrar solo los de este paciente' : 'Mostrar los de otros pacientes'}
        </button>
      )}
      {elegido && (
        <ConfirmarAsociacion
          titulo={`${elegido.registro.paciente.nombre || 'Paciente sin nombre'} · ${tarjetaDe(elegido)}`}
          hora={elegido.bloqueo.hora}
          sugerido={momentoSugerido(elegido.bloqueo.hora, caso)}
          onCancelar={() => onElegir(null)}
          onConfirmar={async (momento) => {
            await asociarBloqueo(elegido.registro.id, elegido.bloqueo.id, caso.id, momento, elegido.tipo)
            onElegir(null)
          }}
        />
      )}
    </div>
  )
}
