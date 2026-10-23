import { useState } from 'react'
import { COMPLICACIONES } from '../constants'
import type { Evento } from '../types'
import { esCambioAnestesiologo, textoComplicacion } from '../utils/caso'
import { formatHora, hhmmLocal, horaCercanaIso } from '../utils/tiempo'
import { BotonesAgregar } from './farmacos/BotonesAgregar'
import { Button, Field, Input, Pill, Select, Section, TextArea } from './ui'

type Modo = 'evento' | 'complicacion'

export function EventosSection({
  eventos,
  onAgregar,
  onEliminar,
  onEditar,
}: {
  eventos: Evento[]
  onAgregar: (e: Evento) => void
  onEliminar: (id: string) => void
  onEditar: (e: Evento) => void
}) {
  const [modo, setModo] = useState<Modo>('evento')
  const [texto, setTexto] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [tipoComplicacion, setTipoComplicacion] = useState('')
  const [detalleComplicacion, setDetalleComplicacion] = useState('')

  function agregarTexto() {
    if (!texto.trim()) return
    onAgregar({ id: crypto.randomUUID(), hora: new Date().toISOString(), descripcion: texto.trim() })
    setTexto('')
  }

  function registrarComplicacion(hora?: string) {
    if (!tipoComplicacion) return
    onAgregar({
      id: crypto.randomUUID(),
      hora: hora ?? new Date().toISOString(),
      descripcion: textoComplicacion(tipoComplicacion, detalleComplicacion),
      complicacion: { tipo: tipoComplicacion, detalle: detalleComplicacion.trim() },
    })
    setTipoComplicacion('')
    setDetalleComplicacion('')
    setModo('evento')
  }

  const ordenados = eventos.filter((e) => !esCambioAnestesiologo(e)).sort((a, b) => b.hora.localeCompare(a.hora))

  return (
    <Section title="Eventos e incidencias">
      <div className="mb-3 flex flex-wrap gap-2">
        <Pill active={modo === 'evento'} onClick={() => setModo('evento')}>
          Evento general
        </Pill>
        <Pill active={modo === 'complicacion'} onClick={() => setModo('complicacion')}>
          Agregar complicación
        </Pill>
      </div>

      {modo === 'complicacion' ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="mb-2 text-sm font-medium text-rose-900">¿Hubo alguna complicación?</p>
          <Field label="Complicación" className="max-w-sm">
            <Select value={tipoComplicacion} onChange={(e) => setTipoComplicacion(e.target.value)}>
              <option value="">Seleccionar…</option>
              {COMPLICACIONES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Descripción (opcional)" className="mt-3">
            <TextArea
              rows={3}
              value={detalleComplicacion}
              onChange={(e) => setDetalleComplicacion(e.target.value)}
              placeholder="Detalle de lo ocurrido y de las medidas tomadas"
            />
          </Field>
          <div className="mt-3">
            <BotonesAgregar
              listo={tipoComplicacion !== ''}
              etiquetaAhora="Registrar complicación ahora"
              etiquetaPersonalizada="Registrar a hora personalizada"
              onAgregar={registrarComplicacion}
            />
          </div>
        </div>
      ) : (
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
            <div
              key={e.id}
              className={`flex items-start justify-between gap-2 rounded-lg px-3 py-2 ${
                e.complicacion ? 'border border-rose-200 bg-rose-50' : 'bg-slate-50'
              }`}
            >
              <div>
                <span className="mr-2 font-mono text-xs font-semibold text-slate-500">{formatHora(e.hora)}</span>
                {e.complicacion && <span className="mr-2 text-xs font-semibold uppercase text-rose-700">Complicación</span>}
                <span className="text-sm text-slate-800">{e.complicacion ? [e.complicacion.tipo, e.complicacion.detalle].filter(Boolean).join('. ') : e.descripcion}</span>
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
  const [texto, setTexto] = useState(evento.descripcion)
  const [hora, setHora] = useState(hhmmLocal(evento.hora))
  const complicacion = evento.complicacion
  const [tipoComp, setTipoComp] = useState(complicacion?.tipo ?? '')
  const [detalleComp, setDetalleComp] = useState(complicacion?.detalle ?? '')
  const [error, setError] = useState('')

  function guardar() {
    const iso = horaCercanaIso(hora, evento.hora)
    if (Date.parse(iso) > Date.now() + 60000) return setError('La hora no puede ser posterior a la hora actual.')
    if (complicacion) {
      if (!tipoComp) return setError('Elegí la complicación.')
      return onGuardar({
        ...evento,
        hora: iso,
        descripcion: textoComplicacion(tipoComp, detalleComp),
        complicacion: { tipo: tipoComp, detalle: detalleComp.trim() },
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
        {complicacion ? (
          <>
            <Field label="Complicación">
              <Select value={tipoComp} onChange={(e) => setTipoComp(e.target.value)}>
                <option value="">Seleccionar…</option>
                {COMPLICACIONES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Descripción" className="sm:col-span-3">
              <TextArea rows={2} value={detalleComp} onChange={(e) => setDetalleComp(e.target.value)} />
            </Field>
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
