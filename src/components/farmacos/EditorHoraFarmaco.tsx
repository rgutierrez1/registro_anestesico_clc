import { useState } from 'react'
import { obtenerFarmaco } from '../../data/catalogoFarmacos'
import type { RegistroFarmaco } from '../../types'
import { formatDosis } from '../../utils/dosis'
import { ETIQUETA_EVENTO, limitesHora } from '../../utils/farmacos'
import { formatHora, hhmmLocal, horaCercanaIso } from '../../utils/tiempo'
import { Button, Field, Input } from '../ui'

export function EditorHoraFarmaco({
  registro,
  registros,
  onGuardar,
  onCerrar,
}: {
  registro: RegistroFarmaco
  registros: RegistroFarmaco[]
  onGuardar: (hora: string, valor: number | null) => void
  onCerrar: () => void
}) {
  const [hora, setHora] = useState(hhmmLocal(registro.hora))
  const [error, setError] = useState('')
  const editaDosis = registro.evento !== 'fin' && registro.valor !== null && !registro.dosisTexto
  const [dosis, setDosis] = useState(registro.valor !== null ? String(registro.valor).replace('.', ',') : '')
  const nombre = obtenerFarmaco(registro.farmacoId)?.etiqueta ?? registro.nombre

  function guardar() {
    if (!hora) return
    const valor = Number.parseFloat(dosis.replace(',', '.'))
    if (editaDosis && !(Number.isFinite(valor) && valor >= 0)) return setError('Indicá una dosis válida.')
    const iso = horaCercanaIso(hora, registro.hora)
    const t = Date.parse(iso)
    const { min, max } = limitesHora(registros, registro.id)
    if (t > Date.now() + 60000) return setError('La hora no puede ser posterior a la hora actual.')
    if (min !== null && t <= min) return setError(`Debe ser posterior a las ${formatHora(new Date(min).toISOString())}, el evento anterior de este fármaco.`)
    if (max !== null && t >= max) return setError(`Debe ser anterior a las ${formatHora(new Date(max).toISOString())}, el evento siguiente de este fármaco.`)
    onGuardar(iso, editaDosis ? valor : null)
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
      <p className="mb-2 text-sm font-semibold text-amber-900">
        Editar registro: {nombre} · {ETIQUETA_EVENTO[registro.evento]}
        {registro.evento !== 'fin' && ` · ${registro.dosisTexto ?? formatDosis(registro.valor, registro.unidad)}`}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Hora de administración">
          <Input
            type="time"
            value={hora}
            onChange={(e) => {
              setHora(e.target.value)
              setError('')
            }}
          />
        </Field>
        {editaDosis && (
          <Field label={`Dosis (${registro.unidad})`}>
            <Input
              type="text"
              inputMode="decimal"
              value={dosis}
              onChange={(e) => {
                setDosis(e.target.value)
                setError('')
              }}
            />
          </Field>
        )}
        <Button size="sm" disabled={!hora} onClick={guardar}>
          Guardar cambios
        </Button>
        <Button size="sm" variant="ghost" onClick={onCerrar}>
          Cancelar
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
    </div>
  )
}
