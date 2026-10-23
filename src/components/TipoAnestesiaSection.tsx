import { useState } from 'react'
import { TIPOS_ANESTESIA } from '../constants'
import type { TipoAnestesia } from '../types'
import { BotonesAgregar } from './farmacos/BotonesAgregar'
import { Badge, Button, Field, Input, Pill, Section } from './ui'

export function TipoAnestesiaSection({
  tipos,
  onCambiar,
}: {
  tipos: TipoAnestesia[]
  onCambiar: (nuevos: TipoAnestesia[], motivo: string, hora?: string) => void
}) {
  const [editando, setEditando] = useState(false)
  const [seleccion, setSeleccion] = useState<TipoAnestesia[]>(tipos)
  const [motivo, setMotivo] = useState('')
  const definido = tipos.length > 0
  const cambio = seleccion.length > 0 && (seleccion.length !== tipos.length || seleccion.some((t) => !tipos.includes(t)))

  function abrir() {
    setSeleccion(tipos)
    setMotivo('')
    setEditando(true)
  }

  function alternar(t: TipoAnestesia) {
    setSeleccion((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))
  }

  return (
    <Section
      title="Tipo de anestesia"
      actions={
        !editando && (
          <Button size="sm" variant="secondary" onClick={abrir}>
            {definido ? 'Cambiar tipo (conversión)' : 'Definir tipo'}
          </Button>
        )
      }
    >
      {definido ? (
        <div className="flex flex-wrap gap-2">
          {tipos.map((t) => (
            <Badge key={t} tone="sky">
              {t}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Todavía no se definió el tipo de anestesia.</p>
      )}

      {editando && (
        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <p className="mb-1 text-sm font-semibold text-amber-900">
            {definido ? 'Conversión del tipo de anestesia' : 'Definir el tipo de anestesia'}
          </p>
          <p className="mb-3 text-sm text-amber-900">
            Se puede seleccionar más de una.
            {definido && ' El cambio queda registrado como un evento.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {TIPOS_ANESTESIA.map((t) => (
              <Pill key={t} active={seleccion.includes(t)} onClick={() => alternar(t)}>
                {t}
              </Pill>
            ))}
          </div>
          {definido && (
            <Field label="Motivo (opcional)" className="mt-3">
              <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: bloqueo insuficiente" />
            </Field>
          )}
          <div className="mt-3">
            <BotonesAgregar
              listo={cambio}
              etiquetaAhora={definido ? 'Registrar conversión ahora' : 'Guardar tipo'}
              etiquetaPersonalizada={definido ? 'Registrar a hora personalizada' : 'Guardar a hora personalizada'}
              onAgregar={(hora) => {
                onCambiar(seleccion, motivo.trim(), hora)
                setEditando(false)
              }}
            />
          </div>
          <div className="mt-2 flex justify-end">
            <Button size="sm" variant="ghost" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </Section>
  )
}
