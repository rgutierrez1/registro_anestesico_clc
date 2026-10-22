import { useState } from 'react'
import { obtenerFarmaco } from '../../data/catalogoFarmacos'
import { formatDosis } from '../../utils/dosis'
import type { InfusionActiva } from '../../utils/farmacos'
import { formatHora } from '../../utils/tiempo'
import { Badge, Button, Input, Select } from '../ui'

export function InfusionesActivas({
  activas,
  onCambiar,
  onFinalizar,
}: {
  activas: InfusionActiva[]
  onCambiar: (clave: string, valor: number) => void
  onFinalizar: (clave: string) => void
}) {
  if (activas.length === 0) return null
  return (
    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
      <h3 className="mb-2 text-sm font-semibold text-emerald-900">En infusión ahora</h3>
      <div className="flex flex-col gap-2">
        {activas.map((a) => (
          <FilaInfusion key={a.clave} activa={a} onCambiar={onCambiar} onFinalizar={onFinalizar} />
        ))}
      </div>
    </div>
  )
}

function FilaInfusion({
  activa,
  onCambiar,
  onFinalizar,
}: {
  activa: InfusionActiva
  onCambiar: (clave: string, valor: number) => void
  onFinalizar: (clave: string) => void
}) {
  const def = obtenerFarmaco(activa.farmacoId)
  const [otra, setOtra] = useState(false)
  const [manual, setManual] = useState('')

  function aplicarManual() {
    const n = Number.parseFloat(manual.replace(',', '.'))
    if (Number.isFinite(n) && n > 0) {
      onCambiar(activa.clave, n)
      setOtra(false)
      setManual('')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white px-3 py-2">
      <div className="min-w-[160px]">
        <p className="font-semibold text-slate-900">
          {def?.etiqueta ?? activa.nombre} <Badge tone="green">{activa.modo}</Badge>
        </p>
        <p className="text-sm text-slate-600">
          Actual: <strong>{formatDosis(activa.valor, activa.unidad)}</strong> · desde {formatHora(activa.desde)}
        </p>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {otra ? (
          <>
            <Input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder={activa.unidad}
              className="w-28"
              aria-label="Nueva dosis manual"
            />
            <Button size="sm" onClick={aplicarManual}>
              Aplicar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOtra(false)}>
              Cancelar
            </Button>
          </>
        ) : (
          <Select
            value=""
            aria-label="Cambiar dosis"
            onChange={(e) => {
              if (e.target.value === 'otra') setOtra(true)
              else if (e.target.value) onCambiar(activa.clave, Number(e.target.value))
            }}
          >
            <option value="">Cambiar dosis…</option>
            {def?.dosis.map((d) => (
              <option key={d} value={String(d)}>
                {formatDosis(d, def.unidad)}
              </option>
            ))}
            <option value="otra">Otra (ingreso manual)</option>
          </Select>
        )}
        <Button size="sm" variant="danger" onClick={() => onFinalizar(activa.clave)}>
          Finalizar
        </Button>
      </div>
    </div>
  )
}
