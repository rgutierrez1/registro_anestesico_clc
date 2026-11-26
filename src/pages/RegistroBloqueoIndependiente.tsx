import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ConfirmarAsociacion } from '../components/PanelBloqueosPendientes'
import { DatosBloqueoForm } from '../components/DatosBloqueoForm'
import { configBloqueos, configNeuroaxial, SeccionRegistrosMenu } from '../components/SeccionRegistrosMenu'
import { Badge, Button, Section } from '../components/ui'
import { db } from '../db'
import { tarjetaBloqueo } from '../menus/bloqueos'
import type { RegistroMenu } from '../menus/tipos'
import type { CasoAnestesico, RegistroBloqueo } from '../types'
import { tarjetaNeuroaxial } from '../menus/neuroaxial'
import { asociarBloqueo, mismoPaciente, momentoSugerido, type TipoRegistroIndependiente } from '../utils/bloqueosIndependientes'
import { formatHora } from '../utils/tiempo'

export default function RegistroBloqueoIndependiente() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const registro = useLiveQuery(() => (id ? db.registrosBloqueo.get(id) : undefined), [id])
  const casos = useLiveQuery(() => db.casos.orderBy('createdAt').reverse().toArray(), [])
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState<RegistroBloqueo | null>(null)
  const [asociando, setAsociando] = useState<RegistroMenu | null>(null)
  const [casoElegido, setCasoElegido] = useState<CasoAnestesico | null>(null)

  if (registro === undefined) return <div className="p-6 text-slate-500">Cargando…</div>
  if (registro === null || !id) return <div className="p-6 text-slate-500">Registro no encontrado.</div>

  const guardar = (cambios: Partial<RegistroBloqueo>) => db.registrosBloqueo.update(registro.id, { ...cambios, updatedAt: new Date().toISOString() })

  const candidatos = [...(casos ?? [])].sort(
    (a, b) => Number(mismoPaciente(b.paciente.nombre, registro.paciente.nombre)) - Number(mismoPaciente(a.paciente.nombre, registro.paciente.nombre)),
  )

  const neuroaxial = registro.neuroaxial ?? []
  const tarjetaDe = (tipo: TipoRegistroIndependiente, r: RegistroMenu) => (tipo === 'bloqueo' ? tarjetaBloqueo(r, formatHora) : tarjetaNeuroaxial(r, formatHora))

  // Marca de "agregado" o botón para llevar el registro a un registro anestésico.
  const extra = (tipo: TipoRegistroIndependiente) => (r: RegistroMenu) => (
    <div className="mt-2">
      {r.asociadoA ? (
        <p className="text-xs text-emerald-800">
          <Badge tone="green">Agregado a un registro anestésico</Badge>{' '}
          <a className="underline" href={`#/caso/${r.asociadoA.casoId}`}>
            Abrir el registro
          </a>
        </p>
      ) : (
        !r.anulado && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setCasoElegido(null)
              setAsociando(r)
            }}
          >
            Agregar a un registro anestésico
          </Button>
        )
      )}
      {asociando?.id === r.id && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
          {casoElegido ? (
            <ConfirmarAsociacion
              titulo={`${casoElegido.paciente.nombre || 'Paciente sin nombre'} · ${tarjetaDe(tipo, r)}`}
              hora={r.hora}
              sugerido={momentoSugerido(r.hora, casoElegido)}
              onCancelar={() => setCasoElegido(null)}
              onConfirmar={async (momento) => {
                await asociarBloqueo(registro.id, r.id, casoElegido.id, momento, tipo)
                setAsociando(null)
                setCasoElegido(null)
              }}
            />
          ) : (
            <>
              <p className="mb-2 text-sm font-medium text-slate-700">¿A qué registro anestésico lo agregas?</p>
              {candidatos.length === 0 && <p className="text-sm text-slate-500">Todavía no hay registros anestésicos.</p>}
              <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                {candidatos.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setCasoElegido(c)}
                      className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 text-left hover:border-sky-300"
                    >
                      <span>
                        <span className="font-medium text-slate-900">{c.paciente.nombre || 'Paciente sin nombre'}</span>
                        <span className="ml-2 text-xs text-slate-500">
                          {c.cirugia.procedimiento || 'Procedimiento sin definir'} · {c.cirugia.fecha}
                        </span>
                      </span>
                      {mismoPaciente(c.paciente.nombre, registro.paciente.nombre) && <Badge tone="sky">Mismo paciente</Badge>}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex justify-end">
                <Button size="sm" variant="ghost" onClick={() => setAsociando(null)}>
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-6 pb-16">
      <header className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="min-h-[44px] px-2 text-slate-500" aria-label="Volver">
          ← Volver
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{registro.paciente.nombre || 'Paciente sin nombre'}</h1>
          <p className="text-sm text-slate-500">
            Bloqueos y epidurales sin registro anestésico · {registro.fecha}
            {registro.procedimiento && ` · ${registro.procedimiento}`}
            {registro.anestesiologo && ` · ${registro.anestesiologo}`}
          </p>
        </div>
      </header>

      <div className="mb-4">
        {editando && borrador ? (
          <Section title="Datos del paciente">
            <DatosBloqueoForm registro={borrador} onCambiar={setBorrador} />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditando(false)}>
                Cancelar
              </Button>
              <Button
                disabled={borrador.paciente.nombre.trim() === ''}
                onClick={async () => {
                  await guardar({ paciente: borrador.paciente, procedimiento: borrador.procedimiento, anestesiologo: borrador.anestesiologo, fecha: borrador.fecha })
                  setEditando(false)
                }}
              >
                Guardar datos
              </Button>
            </div>
          </Section>
        ) : (
          <button
            type="button"
            className="min-h-[32px] text-xs font-medium text-sky-600"
            onClick={() => {
              setBorrador(registro)
              setEditando(true)
            }}
          >
            Editar datos del paciente
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <SeccionRegistrosMenu
          registros={registro.bloqueos}
          actualizar={(fn) => guardar({ bloqueos: fn(registro.bloqueos, registro.anestesiologo || 'sin definir') })}
          config={configBloqueos(extra('bloqueo'))}
        />
        <SeccionRegistrosMenu
          registros={neuroaxial}
          actualizar={(fn) => guardar({ neuroaxial: fn(neuroaxial, registro.anestesiologo || 'sin definir') })}
          config={configNeuroaxial(extra('neuroaxial'), { titulo: 'Epidural', nombre: 'epidural', inicial: { 'neu.tipo': 'peridural' } })}
        />
      </div>
    </div>
  )
}
