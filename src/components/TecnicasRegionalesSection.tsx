import { useState } from 'react'
import { TIPOS_TECNICA_REGIONAL } from '../constants'
import type { TecnicaRegional } from '../types'
import { formatHora, hhmmLocal, horaCercanaIso } from '../utils/tiempo'
import { Button, Field, Input, Select, Section } from './ui'
import { nuevoId } from '../utils/id'

function tecnicaVacia(): Omit<TecnicaRegional, 'id' | 'hora'> {
  return { tipo: TIPOS_TECNICA_REGIONAL[0], nivel: '', agujaOKit: '', farmaco: '', dosis: '', exitosa: true, notas: '' }
}

export function TecnicasRegionalesSection({
  tecnicas,
  onAgregar,
  onEliminar,
  onEditar,
}: {
  tecnicas: TecnicaRegional[]
  onAgregar: (t: TecnicaRegional) => void
  onEliminar: (id: string) => void
  onEditar: (t: TecnicaRegional) => void
}) {
  const [borrador, setBorrador] = useState(tecnicaVacia())
  const [expandido, setExpandido] = useState(false)
  const [editando, setEditando] = useState<TecnicaRegional | null>(null)
  const [horaEdicion, setHoraEdicion] = useState('')
  const [errorEdicion, setErrorEdicion] = useState('')

  function agregar() {
    if (!borrador.tipo) return
    onAgregar({ id: nuevoId(), hora: new Date().toISOString(), ...borrador })
    setBorrador(tecnicaVacia())
    setExpandido(false)
  }

  function empezarEdicion(t: TecnicaRegional) {
    const { id: _id, hora, ...resto } = t
    void _id
    setBorrador(resto)
    setEditando(t)
    setHoraEdicion(hhmmLocal(hora))
    setErrorEdicion('')
    setExpandido(true)
  }

  function cerrarFormulario() {
    setExpandido(false)
    setEditando(null)
    setBorrador(tecnicaVacia())
  }

  function guardarEdicion() {
    if (!editando || !horaEdicion) return
    const iso = horaCercanaIso(horaEdicion, editando.hora)
    if (Date.parse(iso) > Date.now() + 60000) return setErrorEdicion('La hora no puede ser posterior a la hora actual.')
    onEditar({ id: editando.id, hora: iso, ...borrador })
    cerrarFormulario()
  }

  return (
    <Section
      title="Técnicas regionales"
      actions={
        !expandido && (
          <button className="text-sm text-sky-600" onClick={() => setExpandido(true)}>
            + Agregar
          </button>
        )
      }
    >
      {expandido && (
        <div className="mb-4 rounded-lg border border-slate-200 p-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Técnica" className="col-span-2 sm:col-span-1">
              <Select value={borrador.tipo} onChange={(e) => setBorrador((b) => ({ ...b, tipo: e.target.value }))}>
                {TIPOS_TECNICA_REGIONAL.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nivel / sitio">
              <Input value={borrador.nivel} onChange={(e) => setBorrador((b) => ({ ...b, nivel: e.target.value }))} placeholder="Ej: L3-L4" />
            </Field>
            <Field label="Aguja / kit">
              <Input value={borrador.agujaOKit} onChange={(e) => setBorrador((b) => ({ ...b, agujaOKit: e.target.value }))} />
            </Field>
            <Field label="Fármaco">
              <Input value={borrador.farmaco} onChange={(e) => setBorrador((b) => ({ ...b, farmaco: e.target.value }))} />
            </Field>
            <Field label="Dosis">
              <Input value={borrador.dosis} onChange={(e) => setBorrador((b) => ({ ...b, dosis: e.target.value }))} />
            </Field>
            <Field label="Resultado">
              <Select
                value={borrador.exitosa ? '1' : '0'}
                onChange={(e) => setBorrador((b) => ({ ...b, exitosa: e.target.value === '1' }))}
              >
                <option value="1">Exitosa</option>
                <option value="0">Fallida / requirió conversión</option>
              </Select>
            </Field>
            <Field label="Notas" className="col-span-2 sm:col-span-3">
              <Input value={borrador.notas} onChange={(e) => setBorrador((b) => ({ ...b, notas: e.target.value }))} />
            </Field>
          </div>
          {editando && (
            <div className="mt-3 max-w-xs">
              <Field label="Hora">
                <Input type="time" value={horaEdicion} onChange={(e) => setHoraEdicion(e.target.value)} />
              </Field>
              {errorEdicion && <p className="mt-1 text-sm text-rose-700">{errorEdicion}</p>}
            </div>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="secondary" onClick={cerrarFormulario}>
              Cancelar
            </Button>
            {editando ? (
              <Button onClick={guardarEdicion} disabled={!horaEdicion}>
                Guardar cambios
              </Button>
            ) : (
              <Button onClick={agregar}>Guardar técnica</Button>
            )}
          </div>
        </div>
      )}

      {tecnicas.length === 0 && !expandido && (
        <p className="py-2 text-center text-sm text-slate-400">Sin técnicas regionales registradas.</p>
      )}
      <div className="flex flex-col gap-2">
        {tecnicas.map((t) => (
          <div key={t.id} className="flex items-start justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <div className="text-sm">
              <p className="font-medium text-slate-800">
                {t.tipo} {t.nivel && `· ${t.nivel}`}{' '}
                <span className={t.exitosa ? 'text-emerald-600' : 'text-rose-600'}>{t.exitosa ? '✓' : '✗'}</span>
              </p>
              <p className="text-slate-500">
                {formatHora(t.hora)} {t.farmaco && `· ${t.farmaco} ${t.dosis}`} {t.notas && `· ${t.notas}`}
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <button onClick={() => empezarEdicion(t)} className="min-h-[32px] text-xs text-sky-600">
                Editar
              </button>
              <button
                onClick={() => {
                  if (editando?.id === t.id) cerrarFormulario()
                  onEliminar(t.id)
                }}
                className="min-h-[32px] text-xs text-rose-500"
              >
                Borrar
              </button>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
