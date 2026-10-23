import { useState } from 'react'
import { FLUIDOS_EGRESO, FLUIDOS_INGRESO } from '../constants'
import type { CasoAnestesico } from '../types'
import { cambiarHoraColumna, filasFluidos, fijarCelda, formatBalance, formatCantidad, quitarColumna, totales, type Columna } from '../utils/fluidos'
import { formatHora, hhmmLocal, horaCercanaIso } from '../utils/tiempo'
import { BotonesAgregar } from './farmacos/BotonesAgregar'
import { TablaBalanceFluidos } from './TablaBalanceFluidos'
import { Button, Field, Input, Section, Select } from './ui'

type Patch = (fn: (c: CasoAnestesico) => Partial<CasoAnestesico>) => void

export function RegistroFluidosSection({ caso, patch }: { caso: CasoAnestesico; patch: Patch }) {
  const registros = caso.fluidos
  const [vacias, setVacias] = useState<string[]>([])
  const [tipo, setTipo] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [editandoHora, setEditandoHora] = useState<Columna | null>(null)
  const [hora, setHora] = useState('')
  const [error, setError] = useState('')
  const total = totales(registros)
  const filas = filasFluidos(registros)
  const filaElegida = filas.find((f) => f.id === tipo)
  const numero = Number.parseFloat(cantidad.replace(',', '.'))

  function agregarRapido(horaIso?: string) {
    if (!filaElegida || !Number.isFinite(numero) || numero <= 0) return
    const iso = horaIso ?? new Date().toISOString()
    const columna = { clave: iso.slice(0, 16), hora: iso }
    patch((c) => {
      const previo = c.fluidos.find((r) => r.hora.slice(0, 16) === columna.clave)
      const col = previo ? { clave: columna.clave, hora: previo.hora } : columna
      const actual = c.fluidos.filter((r) => r.tipo === filaElegida.id && r.hora.slice(0, 16) === col.clave).reduce((s, r) => s + r.cantidad, 0)
      return { fluidos: fijarCelda(c.fluidos, filaElegida, col, actual + numero) }
    })
    setCantidad('')
  }

  function fijar(fila: (typeof filas)[number], columna: Columna, valor: number | null) {
    patch((c) => ({ fluidos: fijarCelda(c.fluidos, fila, columna, valor) }))
  }

  function empezarEdicionHora(c: Columna) {
    setEditandoHora(c)
    setHora(hhmmLocal(c.hora))
    setError('')
  }

  function guardarHora() {
    if (!editandoHora || !hora) return
    const iso = horaCercanaIso(hora, editandoHora.hora)
    if (Date.parse(iso) > Date.now() + 60000) return setError('La hora no puede ser posterior a la hora actual.')
    const origen = editandoHora
    patch((c) => ({ fluidos: cambiarHoraColumna(c.fluidos, origen.clave, iso) }))
    setVacias((v) => v.map((h) => (h.slice(0, 16) === origen.clave ? iso : h)))
    setEditandoHora(null)
  }

  function quitar() {
    if (!editandoHora) return
    const origen = editandoHora
    patch((c) => ({ fluidos: quitarColumna(c.fluidos, origen.clave) }))
    setVacias((v) => v.filter((h) => h.slice(0, 16) !== origen.clave))
    setEditandoHora(null)
  }

  return (
    <Section title="Balance de fluidos">
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-sky-50 p-3 text-center">
          <p className="text-xs text-sky-700">Ingresos</p>
          <p className="text-xl font-bold text-sky-900">{formatCantidad(total.ingresoMl)} mL</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3 text-center">
          <p className="text-xs text-amber-700">Egresos</p>
          <p className="text-xl font-bold text-amber-900">{formatCantidad(total.egresoMl)} mL</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-3 text-center">
          <p className="text-xs text-slate-600">Balance</p>
          <p className="text-xl font-bold text-slate-900">{formatBalance(total.balanceMl)} mL</p>
        </div>
      </div>
      {total.unidades.length > 0 && (
        <p className="mb-3 text-sm text-slate-600">Hemocomponentes: {total.unidades.map((u) => `${u.etiqueta} ${formatCantidad(u.total)} U`).join(' · ')}</p>
      )}

      <div className="mb-4 rounded-xl border border-slate-200 p-3">
        <p className="mb-2 text-sm font-medium text-slate-600">Agregar rápido</p>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Fluido o pérdida">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Seleccionar…</option>
              <optgroup label="Ingresos">
                {FLUIDOS_INGRESO.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.etiqueta}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Egresos">
                {FLUIDOS_EGRESO.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.etiqueta}
                  </option>
                ))}
              </optgroup>
            </Select>
          </Field>
          <Field label={filaElegida ? `Cantidad (${filaElegida.unidad === 'U' ? 'unidades' : 'mL'})` : 'Cantidad'}>
            <Input type="text" inputMode="decimal" className="w-32" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          </Field>
          <div className="min-w-[260px] flex-1">
            <BotonesAgregar
              listo={Boolean(filaElegida) && Number.isFinite(numero) && numero > 0}
              etiquetaAhora="Agregar ahora"
              etiquetaPersonalizada="Agregar a hora personalizada"
              onAgregar={agregarRapido}
            />
          </div>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">Completa solo lo que se usa o se mide; cada columna es una hora.</p>
        <div className="min-w-[260px]">
          <BotonesAgregar
            listo
            etiquetaAhora="+ Columna ahora"
            etiquetaPersonalizada="+ Columna a otra hora"
            onAgregar={(h) => setVacias((v) => [...v, h ?? new Date().toISOString()])}
          />
        </div>
      </div>

      <TablaBalanceFluidos registros={registros} vacias={vacias} onFijar={fijar} onEditarHora={empezarEdicionHora} />

      {editandoHora && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <Field label={`Hora de la columna de las ${formatHora(editandoHora.hora)}`}>
            <Input
              type="time"
              value={hora}
              onChange={(e) => {
                setHora(e.target.value)
                setError('')
              }}
            />
          </Field>
          <Button size="sm" disabled={!hora} onClick={guardarHora}>
            Guardar hora
          </Button>
          <Button size="sm" variant="danger" onClick={quitar}>
            Quitar columna
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditandoHora(null)}>
            Cancelar
          </Button>
          {error && <p className="w-full text-sm text-rose-700">{error}</p>}
        </div>
      )}
      <p className="mt-2 text-xs text-slate-500">El balance suma solo lo registrado en mL; los hemocomponentes en unidades (U) se informan aparte.</p>
    </Section>
  )
}
