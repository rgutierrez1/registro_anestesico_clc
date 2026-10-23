import { useState } from 'react'
import { EXAMENES_LAB } from '../constants'
import type { ExamenLab, TipoExamen } from '../types'
import { definicionExamen, errorExamen, resumenExamen } from '../utils/laboratorio'
import { formatHora, hhmmLocal, horaCercanaIso } from '../utils/tiempo'
import { BotonesAgregar } from './farmacos/BotonesAgregar'
import { Button, Field, Input, Pill, Section } from './ui'

export function LaboratorioSection({
  examenes,
  onAgregar,
  onEditar,
  onEliminar,
}: {
  examenes: ExamenLab[]
  onAgregar: (e: ExamenLab) => void
  onEditar: (e: ExamenLab) => void
  onEliminar: (id: string) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [tipo, setTipo] = useState<TipoExamen | null>(null)
  const [valores, setValores] = useState<Record<string, string>>({})
  const [notas, setNotas] = useState('')
  const [editando, setEditando] = useState<ExamenLab | null>(null)
  const [horaEdicion, setHoraEdicion] = useState('')
  const [error, setError] = useState('')
  const ordenados = [...examenes].sort((a, b) => b.hora.localeCompare(a.hora))
  const def = tipo ? definicionExamen(tipo) : null

  function cerrar() {
    setAbierto(false)
    setTipo(null)
    setValores({})
    setNotas('')
    setEditando(null)
    setError('')
  }

  function elegirTipo(t: TipoExamen) {
    setTipo(t)
    setValores({})
    setError('')
  }

  function construir(id: string, hora: string): ExamenLab | null {
    return tipo ? { id, hora, tipo, valores, notas } : null
  }

  function agregar(hora?: string) {
    const nuevo = construir(crypto.randomUUID(), hora ?? new Date().toISOString())
    if (!nuevo) return
    const problema = errorExamen(nuevo)
    if (problema) return setError(problema)
    onAgregar(nuevo)
    cerrar()
  }

  function empezarEdicion(e: ExamenLab) {
    setEditando(e)
    setTipo(e.tipo)
    setValores(e.valores)
    setNotas(e.notas)
    setHoraEdicion(hhmmLocal(e.hora))
    setError('')
    setAbierto(true)
  }

  function guardarEdicion() {
    if (!editando || !horaEdicion) return
    const editado = construir(editando.id, horaCercanaIso(horaEdicion, editando.hora))
    if (!editado) return
    const problema = errorExamen(editado)
    if (problema) return setError(problema)
    onEditar(editado)
    cerrar()
  }

  return (
    <Section
      title="Exámenes de laboratorio"
      actions={
        !abierto && (
          <button type="button" className="min-h-[44px] px-2 text-sm font-medium text-sky-600" onClick={() => setAbierto(true)}>
            + Agregar examen
          </button>
        )
      }
    >
      {abierto && (
        <div className={`mb-4 rounded-xl border p-3 ${editando ? 'border-amber-300 bg-amber-50' : 'border-sky-200 bg-sky-50'}`}>
          {editando ? (
            <p className="mb-2 text-sm font-semibold text-amber-900">
              Editar {definicionExamen(editando.tipo).etiqueta} de las {formatHora(editando.hora)}
            </p>
          ) : (
            <>
              <p className="mb-2 text-sm font-medium text-slate-600">Examen</p>
              <div className="flex flex-wrap gap-2">
                {EXAMENES_LAB.map((x) => (
                  <Pill key={x.id} active={tipo === x.id} onClick={() => elegirTipo(x.id)}>
                    {x.etiqueta}
                  </Pill>
                ))}
              </div>
            </>
          )}

          {def && (
            <>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {def.campos.map((c) => (
                  <Field
                    key={c.clave}
                    label={c.unidad ? `${c.etiqueta} (${c.unidad})` : c.etiqueta}
                    className={c.min === undefined ? 'col-span-2 sm:col-span-4' : ''}
                  >
                    <Input
                      type="text"
                      inputMode={c.min === undefined ? 'text' : 'decimal'}
                      value={valores[c.clave] ?? ''}
                      onChange={(e) => {
                        setValores((v) => ({ ...v, [c.clave]: e.target.value }))
                        setError('')
                      }}
                    />
                  </Field>
                ))}
                <Field label="Observaciones (opcional)" className="col-span-2 sm:col-span-4">
                  <Input value={notas} onChange={(e) => setNotas(e.target.value)} />
                </Field>
              </div>

              {editando ? (
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <Field label="Hora">
                    <Input
                      type="time"
                      value={horaEdicion}
                      onChange={(e) => {
                        setHoraEdicion(e.target.value)
                        setError('')
                      }}
                    />
                  </Field>
                  <Button size="sm" disabled={!horaEdicion} onClick={guardarEdicion}>
                    Guardar cambios
                  </Button>
                </div>
              ) : (
                <div className="mt-3">
                  <BotonesAgregar
                    listo
                    etiquetaAhora="Registrar ahora"
                    etiquetaPersonalizada="Registrar a hora personalizada"
                    onAgregar={agregar}
                  />
                </div>
              )}
            </>
          )}
          {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
          <div className="mt-2 flex justify-end">
            <Button size="sm" variant="ghost" onClick={cerrar}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {ordenados.length === 0 ? (
        <p className="py-2 text-center text-sm text-slate-400">Sin exámenes registrados.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ordenados.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div>
                <p className="font-semibold text-slate-900">
                  {definicionExamen(e.tipo).etiqueta} <span className="font-mono text-xs font-normal text-slate-500">{formatHora(e.hora)}</span>
                </p>
                <p className="text-sm text-slate-700">{resumenExamen(e)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => empezarEdicion(e)} className="min-h-[36px] px-2 text-xs text-sky-600">
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (editando?.id === e.id) cerrar()
                    onEliminar(e.id)
                  }}
                  className="min-h-[36px] px-2 text-xs text-rose-500"
                >
                  Borrar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
