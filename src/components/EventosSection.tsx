import { useState } from 'react'
import { ANESTESIOLOGOS } from '../constants'
import type { Evento } from '../types'
import { formatHora, hhmmLocal, horaCercanaIso } from '../utils/tiempo'
import { BotonesAgregar } from './farmacos/BotonesAgregar'
import { Button, Casilla, Field, Input, Pill, Select, Section } from './ui'

type Modo = 'evento' | 'cambio'

function textoCambio(de: string, a: string, entregaFormal: boolean): string {
  return `Cambio de anestesiólogo: ${de || 'sin definir'} → ${a}. Entrega formal del paciente: ${entregaFormal ? 'sí' : 'no'}`
}

export function EventosSection({
  eventos,
  anestesiologoActual,
  onAgregar,
  onEliminar,
  onEditar,
}: {
  eventos: Evento[]
  anestesiologoActual: string
  onAgregar: (e: Evento) => void
  onEliminar: (id: string) => void
  onEditar: (e: Evento) => void
}) {
  const [modo, setModo] = useState<Modo>('evento')
  const [texto, setTexto] = useState('')
  const [entrante, setEntrante] = useState('')
  const [entrega, setEntrega] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  const candidatos = ANESTESIOLOGOS.filter((a) => a !== anestesiologoActual)

  function agregarTexto() {
    if (!texto.trim()) return
    onAgregar({ id: crypto.randomUUID(), hora: new Date().toISOString(), descripcion: texto.trim() })
    setTexto('')
  }

  function registrarCambio(hora?: string) {
    if (!entrante) return
    onAgregar({
      id: crypto.randomUUID(),
      hora: hora ?? new Date().toISOString(),
      descripcion: textoCambio(anestesiologoActual, entrante, entrega),
      cambioAnestesiologo: { de: anestesiologoActual, a: entrante, entregaFormal: entrega },
    })
    setEntrante('')
    setEntrega(false)
    setModo('evento')
  }

  const ordenados = [...eventos].sort((a, b) => b.hora.localeCompare(a.hora))

  return (
    <Section title="Eventos e incidencias">
      <div className="mb-3 flex flex-wrap gap-2">
        <Pill active={modo === 'evento'} onClick={() => setModo('evento')}>
          Evento general
        </Pill>
        <Pill active={modo === 'cambio'} onClick={() => setModo('cambio')}>
          Cambio de anestesiólogo
        </Pill>
      </div>

      {modo === 'evento' ? (
        <div className="flex gap-2">
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && agregarTexto()}
            placeholder="Ej: hipotensión transitoria, se administra efedrina"
            className="flex-1"
          />
          <Button onClick={agregarTexto}>Agregar</Button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-sm text-slate-600">
            Anestesiólogo/a actual: <strong>{anestesiologoActual || 'sin definir'}</strong>
          </p>
          <Field label="Anestesiólogo/a que asume" className="max-w-sm">
            <Select value={entrante} onChange={(e) => setEntrante(e.target.value)}>
              <option value="">Seleccionar…</option>
              {candidatos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </Field>
          <div className="mt-3">
            <Casilla
              etiqueta="Se realiza entrega formal del paciente"
              marcada={entrega}
              onAlternar={() => setEntrega((v) => !v)}
            />
          </div>
          <div className="mt-3">
            <BotonesAgregar
              listo={entrante !== ''}
              etiquetaAhora="Registrar cambio ahora"
              etiquetaPersonalizada="Registrar a hora personalizada"
              onAgregar={registrarCambio}
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {ordenados.length === 0 && <p className="py-2 text-center text-sm text-slate-400">Sin eventos registrados.</p>}
        {ordenados.map((e) =>
          editandoId === e.id ? (
            <EditorEvento
              key={e.id}
              evento={e}
              onGuardar={(nuevo) => {
                onEditar(nuevo)
                setEditandoId(null)
              }}
              onCancelar={() => setEditandoId(null)}
            />
          ) : (
            <div key={e.id} className="flex items-start justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <div>
                <span className="mr-2 font-mono text-xs font-semibold text-slate-500">{formatHora(e.hora)}</span>
                <span className="text-sm text-slate-800">{e.descripcion}</span>
              </div>
              <div className="flex shrink-0 gap-3">
                <button onClick={() => setEditandoId(e.id)} className="min-h-[32px] text-xs text-sky-600">
                  Editar
                </button>
                <button onClick={() => onEliminar(e.id)} className="min-h-[32px] text-xs text-rose-500">
                  Borrar
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </Section>
  )
}

function EditorEvento({
  evento,
  onGuardar,
  onCancelar,
}: {
  evento: Evento
  onGuardar: (e: Evento) => void
  onCancelar: () => void
}) {
  const cambio = evento.cambioAnestesiologo
  const [texto, setTexto] = useState(evento.descripcion)
  const [hora, setHora] = useState(hhmmLocal(evento.hora))
  const [entrante, setEntrante] = useState(cambio?.a ?? '')
  const [entrega, setEntrega] = useState(cambio?.entregaFormal ?? false)
  const [error, setError] = useState('')

  function guardar() {
    const iso = horaCercanaIso(hora, evento.hora)
    if (Date.parse(iso) > Date.now() + 60000) return setError('La hora no puede ser posterior a la hora actual.')
    if (cambio) {
      if (!entrante) return setError('Elegí quién asume.')
      return onGuardar({
        ...evento,
        hora: iso,
        descripcion: textoCambio(cambio.de, entrante, entrega),
        cambioAnestesiologo: { de: cambio.de, a: entrante, entregaFormal: entrega },
      })
    }
    if (!texto.trim()) return setError('Escribí la descripción del evento.')
    onGuardar({ ...evento, hora: iso, descripcion: texto.trim() })
  }

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Hora">
          <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </Field>
        {cambio ? (
          <>
            <Field label="Anestesiólogo/a que asume">
              <Select value={entrante} onChange={(e) => setEntrante(e.target.value)}>
                <option value="">Seleccionar…</option>
                {ANESTESIOLOGOS.filter((a) => a !== cambio.de).map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex items-end">
              <Casilla
                etiqueta="Entrega formal del paciente"
                marcada={entrega}
                onAlternar={() => setEntrega((v) => !v)}
              />
            </div>
          </>
        ) : (
          <Field label="Descripción" className="sm:col-span-2">
            <Input value={texto} onChange={(e) => setTexto(e.target.value)} />
          </Field>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button size="sm" onClick={guardar}>
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}
