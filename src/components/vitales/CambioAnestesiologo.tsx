import { useState } from 'react'
import { ANESTESIOLOGOS } from '../../constants'
import type { Evento } from '../../types'
import { textoCambio } from '../../utils/caso'
import { hhmmLocal, horaCercanaIso } from '../../utils/tiempo'
import { BotonesAgregar } from '../farmacos/BotonesAgregar'
import { Button, Casilla, Field, Input, Select } from '../ui'

export function FormularioCambio({
  anestesiologoActual,
  onRegistrar,
}: {
  anestesiologoActual: string
  onRegistrar: (e: Evento) => void
}) {
  const [entrante, setEntrante] = useState('')
  const [entrega, setEntrega] = useState(false)

  function registrar(hora?: string) {
    if (!entrante) return
    onRegistrar({
      id: crypto.randomUUID(),
      hora: hora ?? new Date().toISOString(),
      descripcion: textoCambio(anestesiologoActual, entrante, entrega),
      cambioAnestesiologo: { de: anestesiologoActual, a: entrante, entregaFormal: entrega },
    })
    setEntrante('')
    setEntrega(false)
  }

  return (
    <div className="mt-3">
      <p className="mb-2 text-sm text-slate-600">
        Anestesiólogo/a actual: <strong>{anestesiologoActual || 'sin definir'}</strong>
      </p>
      <Field label="Anestesiólogo/a que asume" className="max-w-sm">
        <Select value={entrante} onChange={(e) => setEntrante(e.target.value)}>
          <option value="">Seleccionar…</option>
          {ANESTESIOLOGOS.filter((a) => a !== anestesiologoActual).map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
      </Field>
      <div className="mt-3">
        <Casilla etiqueta="Se realiza entrega formal del paciente" marcada={entrega} onAlternar={() => setEntrega((v) => !v)} />
      </div>
      <div className="mt-3">
        <BotonesAgregar
          listo={entrante !== ''}
          etiquetaAhora="Registrar cambio ahora"
          etiquetaPersonalizada="Registrar a hora personalizada"
          onAgregar={registrar}
        />
      </div>
    </div>
  )
}

export function EditorCambio({
  evento,
  onGuardar,
  onCancelar,
}: {
  evento: Evento
  onGuardar: (e: Evento) => string | void
  onCancelar: () => void
}) {
  const cambio = evento.cambioAnestesiologo!
  const [hora, setHora] = useState(hhmmLocal(evento.hora))
  const [entrante, setEntrante] = useState(cambio.a)
  const [entrega, setEntrega] = useState(cambio.entregaFormal)
  const [error, setError] = useState('')

  function guardar() {
    const iso = horaCercanaIso(hora, evento.hora)
    if (Date.parse(iso) > Date.now() + 60000) return setError('La hora no puede ser posterior a la hora actual.')
    if (!entrante) return setError('Elegí quién asume.')
    const problema = onGuardar({
      ...evento,
      hora: iso,
      descripcion: textoCambio(cambio.de, entrante, entrega),
      cambioAnestesiologo: { de: cambio.de, a: entrante, entregaFormal: entrega },
    })
    if (problema) setError(problema)
  }

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Hora">
          <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </Field>
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
          <Casilla etiqueta="Entrega formal del paciente" marcada={entrega} onAlternar={() => setEntrega((v) => !v)} />
        </div>
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
