import { useState } from 'react'
import { FARMACOS_FRECUENTES, VIAS_FARMACO } from '../constants'
import type { RegistroFarmaco, ViaFarmaco } from '../types'
import { formatHora } from '../utils/tiempo'
import { Button, Field, Input, Select } from './ui'
import { Section } from './ui'

export function RegistroFarmacosSection({
  registros,
  onAgregar,
  onEliminar,
}: {
  registros: RegistroFarmaco[]
  onAgregar: (f: RegistroFarmaco) => void
  onEliminar: (id: string) => void
}) {
  const [nombre, setNombre] = useState('')
  const [dosis, setDosis] = useState('')
  const [via, setVia] = useState<ViaFarmaco>('IV')
  const [tipo, setTipo] = useState<RegistroFarmaco['tipo']>('Bolo')

  function agregar() {
    if (!nombre.trim() || !dosis.trim()) return
    onAgregar({ id: crypto.randomUUID(), hora: new Date().toISOString(), nombre: nombre.trim(), dosis: dosis.trim(), via, tipo })
    setDosis('')
  }

  const ordenados = [...registros].sort((a, b) => b.hora.localeCompare(a.hora))

  return (
    <Section title="Fármacos">
      <div className="mb-3 flex flex-wrap gap-2">
        {FARMACOS_FRECUENTES.map((f) => (
          <button
            key={f.nombre}
            type="button"
            onClick={() => {
              setNombre(f.nombre)
              setVia(f.via as ViaFarmaco)
            }}
            className="min-h-[40px] rounded-full border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:border-sky-400"
          >
            {f.nombre}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Field label="Fármaco" className="col-span-2 sm:col-span-2">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" />
        </Field>
        <Field label="Dosis">
          <Input value={dosis} onChange={(e) => setDosis(e.target.value)} placeholder="Ej: 100 mg" />
        </Field>
        <Field label="Vía">
          <Select value={via} onChange={(e) => setVia(e.target.value as ViaFarmaco)}>
            {VIAS_FARMACO.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as RegistroFarmaco['tipo'])}>
            <option value="Bolo">Bolo</option>
            <option value="Infusión inicio">Infusión inicio</option>
            <option value="Infusión fin">Infusión fin</option>
          </Select>
        </Field>
      </div>
      <Button className="mt-3 w-full sm:w-auto" onClick={agregar}>
        + Registrar fármaco ahora
      </Button>

      <div className="mt-4 max-h-[280px] overflow-auto rounded-lg border border-slate-200">
        {ordenados.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Sin fármacos registrados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-100 text-slate-600">
              <tr>
                <th className="px-2 py-2 text-left">Hora</th>
                <th className="px-2 py-2 text-left">Fármaco</th>
                <th className="px-2 py-2 text-left">Dosis</th>
                <th className="px-2 py-2 text-left">Vía</th>
                <th className="px-2 py-2 text-left">Tipo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ordenados.map((f) => (
                <tr key={f.id} className="border-t border-slate-100">
                  <td className="px-2 py-2 font-medium text-slate-700">{formatHora(f.hora)}</td>
                  <td className="px-2 py-2 text-slate-800">{f.nombre}</td>
                  <td className="px-2 py-2 text-slate-600">{f.dosis}</td>
                  <td className="px-2 py-2 text-slate-600">{f.via}</td>
                  <td className="px-2 py-2 text-slate-600">{f.tipo}</td>
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
