import { useState } from 'react'
import { TIPOS_FLUIDO } from '../constants'
import type { RegistroFluido } from '../types'
import { formatHora } from '../utils/tiempo'
import { Button, Field, Input, Select, Section } from './ui'

export function RegistroFluidosSection({
  registros,
  onAgregar,
  onEliminar,
}: {
  registros: RegistroFluido[]
  onAgregar: (f: RegistroFluido) => void
  onEliminar: (id: string) => void
}) {
  const [tipo, setTipo] = useState(TIPOS_FLUIDO[0])
  const [volumen, setVolumen] = useState('')

  const esSalida = tipo === 'Sangrado estimado' || tipo === 'Diuresis' || tipo === 'Otras pérdidas'

  function agregar() {
    const vol = Number(volumen)
    if (!volumen || Number.isNaN(vol)) return
    onAgregar({ id: crypto.randomUUID(), hora: new Date().toISOString(), tipo, volumenMl: vol, entrada: !esSalida })
    setVolumen('')
  }

  const entradas = registros.filter((r) => r.entrada)
  const salidas = registros.filter((r) => !r.entrada)
  const totalEntradas = entradas.reduce((s, r) => s + r.volumenMl, 0)
  const totalSalidas = salidas.reduce((s, r) => s + r.volumenMl, 0)
  const ordenados = [...registros].sort((a, b) => b.hora.localeCompare(a.hora))

  return (
    <Section title="Balance de fluidos">
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-sky-50 p-3 text-center">
          <p className="text-xs font-medium text-sky-700">Total entradas</p>
          <p className="text-xl font-bold text-sky-900">{totalEntradas} ml</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-3 text-center">
          <p className="text-xs font-medium text-amber-700">Total salidas</p>
          <p className="text-xl font-bold text-amber-900">{totalSalidas} ml</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Tipo" className="col-span-2 sm:col-span-1">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS_FLUIDO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Volumen (ml)">
          <Input type="number" inputMode="numeric" value={volumen} onChange={(e) => setVolumen(e.target.value)} />
        </Field>
      </div>
      <Button className="mt-3 w-full sm:w-auto" onClick={agregar}>
        + Registrar {esSalida ? 'salida' : 'entrada'}
      </Button>

      <div className="mt-4 max-h-[240px] overflow-auto rounded-lg border border-slate-200">
        {ordenados.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Sin registros todavía.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-100 text-slate-600">
              <tr>
                <th className="px-2 py-2 text-left">Hora</th>
                <th className="px-2 py-2 text-left">Tipo</th>
                <th className="px-2 py-2 text-right">Volumen</th>
                <th className="px-2 py-2 text-left">Dirección</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ordenados.map((f) => (
                <tr key={f.id} className="border-t border-slate-100">
                  <td className="px-2 py-2 font-medium text-slate-700">{formatHora(f.hora)}</td>
                  <td className="px-2 py-2 text-slate-800">{f.tipo}</td>
                  <td className="px-2 py-2 text-right text-slate-600">{f.volumenMl} ml</td>
                  <td className="px-2 py-2 text-slate-600">{f.entrada ? 'Entrada' : 'Salida'}</td>
                  <td className="px-2 py-2 text-right">
                    <button onClick={() => onEliminar(f.id)} className="text-xs text-rose-500">
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Section>
  )
}
