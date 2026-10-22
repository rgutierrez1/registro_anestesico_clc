import { useState } from 'react'
import { hhmmLocal, horaPersonalizadaIso } from '../../utils/tiempo'
import { Button, Field, Input } from '../ui'

export function BotonesAgregar({
  listo,
  etiquetaAhora,
  etiquetaPersonalizada,
  onAgregar,
}: {
  listo: boolean
  etiquetaAhora: string
  etiquetaPersonalizada: string
  onAgregar: (hora?: string) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [hora, setHora] = useState('')

  function abrir() {
    setHora(hhmmLocal(new Date().toISOString()))
    setAbierto(true)
  }

  function confirmar() {
    if (!hora) return
    onAgregar(horaPersonalizadaIso(hora))
    setAbierto(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" disabled={!listo} onClick={() => onAgregar()}>
          {etiquetaAhora}
        </Button>
        <Button size="sm" variant="secondary" disabled={!listo} onClick={abrir}>
          {etiquetaPersonalizada}
        </Button>
      </div>
      {abierto && (
        <div className="flex flex-wrap items-end justify-end gap-2 rounded-lg bg-slate-100 p-2">
          <Field label="Hora de administración">
            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </Field>
          <Button size="sm" disabled={!hora} onClick={confirmar}>
            Agregar a las {hora}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  )
}
