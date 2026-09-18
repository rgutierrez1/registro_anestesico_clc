import { useState } from 'react'
import type { RegistroVital } from '../types'
import { formatHora } from '../utils/tiempo'
import { Button, Section } from './ui'
import { VitalesChart } from './VitalesChart'

const CAMPOS: { key: keyof RegistroVital; label: string; unidad: string }[] = [
  { key: 'fc', label: 'FC', unidad: 'lpm' },
  { key: 'pas', label: 'PAS', unidad: 'mmHg' },
  { key: 'pad', label: 'PAD', unidad: 'mmHg' },
  { key: 'spo2', label: 'SpO2', unidad: '%' },
  { key: 'etco2', label: 'EtCO2', unidad: 'mmHg' },
  { key: 'fr', label: 'FR', unidad: 'rpm' },
  { key: 'temp', label: 'Temp', unidad: '°C' },
  { key: 'bis', label: 'BIS', unidad: '' },
]

type Borrador = Partial<Record<keyof RegistroVital, string>>

export function RegistroVitalesSection({
  registros,
  inicio,
  onAgregar,
  onEliminar,
}: {
  registros: RegistroVital[]
  inicio: string | null
  onAgregar: (v: RegistroVital) => void
  onEliminar: (id: string) => void
}) {
  const [borrador, setBorrador] = useState<Borrador>({})
  const [mostrarTabla, setMostrarTabla] = useState(false)

  function agregar() {
    const algunValor = CAMPOS.some((c) => borrador[c.key])
    if (!algunValor) return
    const registro: RegistroVital = {
      id: crypto.randomUUID(),
      hora: new Date().toISOString(),
      fc: numeroONull(borrador.fc),
      pas: numeroONull(borrador.pas),
      pad: numeroONull(borrador.pad),
      pam: null,
      spo2: numeroONull(borrador.spo2),
      etco2: numeroONull(borrador.etco2),
      temp: numeroONull(borrador.temp),
      fr: numeroONull(borrador.fr),
      bis: numeroONull(borrador.bis),
    }
    onAgregar(registro)
    setBorrador({})
  }

  const ordenados = [...registros].sort((a, b) => b.hora.localeCompare(a.hora))

  return (
    <Section
      title="Signos vitales"
      actions={
        <button className="text-sm text-sky-600" onClick={() => setMostrarTabla((v) => !v)}>
          {mostrarTabla ? 'Ver gráfico' : 'Ver tabla'}
        </button>
      }
    >
      {mostrarTabla ? (
        <TablaVitales registros={ordenados} onEliminar={onEliminar} />
      ) : (
        <VitalesChart registros={registros} inicio={inicio} />
      )}

      <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
        {CAMPOS.map((c) => (
          <label key={c.key} className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500">
              {c.label}
              {c.unidad ? ` (${c.unidad})` : ''}
            </span>
            <input
              type="number"
              inputMode="decimal"
              value={borrador[c.key] ?? ''}
              onChange={(e) => setBorrador((b) => ({ ...b, [c.key]: e.target.value }))}
              className="min-h-[44px] rounded-lg border border-slate-300 px-2 py-2 text-center text-base focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </label>
        ))}
      </div>
      <Button className="mt-3 w-full sm:w-auto" onClick={agregar}>
        + Registrar signos vitales ahora
      </Button>
    </Section>
  )
}

function TablaVitales({ registros, onEliminar }: { registros: RegistroVital[]; onEliminar: (id: string) => void }) {
  if (registros.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Sin registros todavía.</p>
  }
  return (
    <div className="max-h-[320px] overflow-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-100 text-slate-600">
          <tr>
            <th className="px-2 py-2 text-left">Hora</th>
            {CAMPOS.map((c) => (
              <th key={c.key} className="px-2 py-2 text-right">
                {c.label}
              </th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {registros.map((r) => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="px-2 py-2 text-left font-medium text-slate-700">{formatHora(r.hora)}</td>
              {CAMPOS.map((c) => (
                <td key={c.key} className="px-2 py-2 text-right text-slate-600">
                  {(r[c.key] as number | null) ?? '—'}
                </td>
              ))}
              <td className="px-2 py-2 text-right">
                <button onClick={() => onEliminar(r.id)} className="text-xs text-rose-500">
                  Borrar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function numeroONull(v: string | undefined): number | null {
  if (v === undefined || v === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}
