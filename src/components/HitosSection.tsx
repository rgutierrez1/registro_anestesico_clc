import { useState } from 'react'
import type { CasoAnestesico } from '../types'
import { errorHito, HITOS, type DefHito } from '../utils/hitos'
import { formatHora, hhmmLocal, horaCercanaIso, horaPersonalizadaIso } from '../utils/tiempo'
import { Button, Input, Section } from './ui'

export function HitosSection({
  caso,
  onCambiar,
}: {
  caso: CasoAnestesico
  onCambiar: (clave: DefHito['clave'], iso: string | null) => void
}) {
  return (
    <Section title="Hitos de la anestesia">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {HITOS.map((def) => (
          <TileHito key={def.clave} def={def} caso={caso} onCambiar={onCambiar} />
        ))}
      </div>
    </Section>
  )
}

function TileHito({
  def,
  caso,
  onCambiar,
}: {
  def: DefHito
  caso: CasoAnestesico
  onCambiar: (clave: DefHito['clave'], iso: string | null) => void
}) {
  const hora = caso[def.campo]
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState('')
  const [error, setError] = useState('')
  const sePuedeQuitar = def.clave !== 'inicioAnestesia' && !(def.clave === 'inicioCirugia' && caso.horaFinCirugia)

  function guardar(iso: string) {
    const problema = errorHito(caso, def.clave, iso)
    if (problema) return setError(problema)
    onCambiar(def.clave, iso)
    setEditando(false)
    setError('')
  }

  function abrir() {
    setValor(hhmmLocal(hora ?? new Date().toISOString()))
    setError('')
    setEditando(true)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3" style={{ borderLeft: `4px solid ${def.color}` }}>
      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: def.color }}>
        {def.etiqueta}
      </p>
      <p className="my-1 font-mono text-lg font-semibold text-slate-900">{hora ? formatHora(hora) : '—'}</p>

      {editando ? (
        <div className="flex flex-col gap-2">
          <Input type="time" value={valor} onChange={(e) => setValor(e.target.value)} />
          {error && <p className="text-xs text-rose-700">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={!valor}
              onClick={() => guardar(hora ? horaCercanaIso(valor, hora) : horaPersonalizadaIso(valor))}
            >
              Guardar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
            {hora && sePuedeQuitar && (
              <Button
                size="sm"
                variant="ghost"
                className="text-rose-600"
                onClick={() => {
                  onCambiar(def.clave, null)
                  setEditando(false)
                }}
              >
                Quitar
              </Button>
            )}
          </div>
        </div>
      ) : hora ? (
        <Button size="sm" variant="secondary" onClick={abrir}>
          Editar hora
        </Button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => guardar(new Date().toISOString())}>
            Ahora
          </Button>
          <Button size="sm" variant="secondary" onClick={abrir}>
            Otra hora
          </Button>
        </div>
      )}
      {!editando && error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
    </div>
  )
}
