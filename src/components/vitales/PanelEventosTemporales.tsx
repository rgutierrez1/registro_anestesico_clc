import { useState } from 'react'
import { DEF_FLAGS, POSICIONES, PRESION_ISQUEMIA_POR_DEFECTO } from '../../constants'
import type { Posicion, TimeFlag, TipoFlag } from '../../types'
import { duracionesFlags, etiquetaFlag } from '../../utils/flags'
import { formatHora } from '../../utils/tiempo'
import { useAhora } from '../../utils/useAhora'
import { BotonesAgregar } from '../farmacos/BotonesAgregar'
import { Button, Field, Input, Pill, Select } from '../ui'

export function IconoReloj() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export function PanelEventosTemporales({
  flags,
  onAgregar,
  onEliminar,
  onCerrar,
}: {
  flags: TimeFlag[]
  onAgregar: (flag: TimeFlag) => string | void
  onEliminar: (id: string) => void
  onCerrar: () => void
}) {
  const ahora = useAhora(30000)
  const [tipo, setTipo] = useState<TipoFlag | null>(null)
  const [presion, setPresion] = useState(String(PRESION_ISQUEMIA_POR_DEFECTO))
  const [posicion, setPosicion] = useState<Posicion | ''>('')
  const [error, setError] = useState('')

  const presionNumero = Number.parseFloat(presion.replace(',', '.'))
  const listo =
    tipo !== null &&
    (tipo !== 'posicion' || posicion !== '') &&
    (tipo !== 'inicioIsquemia' || Number.isFinite(presionNumero))
  const duraciones = duracionesFlags(flags, ahora)
  const ordenados = [...flags].sort((a, b) => a.hora.localeCompare(b.hora))

  function agregar(hora?: string) {
    if (!tipo) return
    const resultado = onAgregar({
      id: crypto.randomUUID(),
      hora: hora ?? new Date().toISOString(),
      tipo,
      presionMmHg: tipo === 'inicioIsquemia' ? presionNumero : null,
      posicion: tipo === 'posicion' && posicion ? posicion : null,
    })
    if (resultado) return setError(resultado)
    setTipo(null)
    setPosicion('')
    setPresion(String(PRESION_ISQUEMIA_POR_DEFECTO))
    setError('')
  }

  return (
    <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-sky-900">Eventos temporales</p>
        <Button size="sm" variant="ghost" onClick={onCerrar}>
          Cerrar
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {DEF_FLAGS.map((d) => (
          <Pill
            key={d.tipo}
            active={tipo === d.tipo}
            onClick={() => {
              setTipo(d.tipo)
              setError('')
            }}
          >
            {d.etiqueta}
          </Pill>
        ))}
      </div>

      {tipo === 'inicioIsquemia' && (
        <Field label="Presión de isquemia (mmHg)" className="mt-3 max-w-xs">
          <Input
            type="number"
            inputMode="numeric"
            min={50}
            max={600}
            value={presion}
            onChange={(e) => setPresion(e.target.value)}
          />
        </Field>
      )}
      {tipo === 'posicion' && (
        <Field label="Nueva posición" className="mt-3 max-w-xs">
          <Select value={posicion} onChange={(e) => setPosicion(e.target.value as Posicion)}>
            <option value="">Seleccionar…</option>
            {POSICIONES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.etiqueta}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {tipo && (
        <div className="mt-3">
          <BotonesAgregar
            listo={listo}
            etiquetaAhora="Agregar ahora"
            etiquetaPersonalizada="Agregar a hora personalizada"
            onAgregar={agregar}
          />
        </div>
      )}
      {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}

      {ordenados.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1 border-t border-sky-200 pt-3">
          {ordenados.map((f) => {
            const duracion = duraciones.get(f.id)
            return (
              <li key={f.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                <span>
                  <span className="mr-2 font-mono text-xs font-semibold text-slate-500">{formatHora(f.hora)}</span>
                  {etiquetaFlag(f)}
                  {duracion && (
                    <span className="ml-2 text-xs text-slate-500">
                      {duracion.abierto ? `en curso: ${duracion.minutos} min` : `duración: ${duracion.minutos} min`}
                    </span>
                  )}
                </span>
                <button type="button" onClick={() => onEliminar(f.id)} className="min-h-[36px] shrink-0 px-2 text-xs text-rose-500">
                  Borrar
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
