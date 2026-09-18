import { useState } from 'react'
import type { Evento } from '../types'
import { formatHora } from '../utils/tiempo'
import { Button, Input, Section } from './ui'

export function EventosSection({
  eventos,
  onAgregar,
  onEliminar,
}: {
  eventos: Evento[]
  onAgregar: (e: Evento) => void
  onEliminar: (id: string) => void
}) {
  const [texto, setTexto] = useState('')

  function agregar() {
    if (!texto.trim()) return
    onAgregar({ id: crypto.randomUUID(), hora: new Date().toISOString(), descripcion: texto.trim() })
    setTexto('')
  }

  const ordenados = [...eventos].sort((a, b) => b.hora.localeCompare(a.hora))

  return (
    <Section title="Eventos e incidencias">
      <div className="flex gap-2">
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && agregar()}
          placeholder="Ej: hipotensión transitoria, se administra efedrina"
          className="flex-1"
        />
        <Button onClick={agregar}>Agregar</Button>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {ordenados.length === 0 && <p className="py-2 text-center text-sm text-slate-400">Sin eventos registrados.</p>}
        {ordenados.map((e) => (
          <div key={e.id} className="flex items-start justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <div>
              <span className="mr-2 font-mono text-xs font-semibold text-slate-500">{formatHora(e.hora)}</span>
              <span className="text-sm text-slate-800">{e.descripcion}</span>
            </div>
            <button onClick={() => onEliminar(e.id)} className="shrink-0 text-xs text-rose-500">
              Borrar
            </button>
          </div>
        ))}
      </div>
    </Section>
  )
}
