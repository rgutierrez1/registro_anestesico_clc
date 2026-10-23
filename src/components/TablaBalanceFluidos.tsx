import { useEffect, useState } from 'react'
import type { RegistroFluido } from '../types'
import {
  cantidadCelda,
  claveColumna,
  columnas,
  filasFluidos,
  formatBalance,
  formatCantidad,
  totales,
  type Columna,
  type FilaFluido,
} from '../utils/fluidos'
import { formatHora } from '../utils/tiempo'

function Celda({ valor, unidad, onFijar }: { valor: number | null; unidad: string; onFijar: (v: number | null) => void }) {
  const mostrar = valor === null ? '' : formatCantidad(valor)
  const [texto, setTexto] = useState(mostrar)
  useEffect(() => setTexto(mostrar), [mostrar])
  function confirmar() {
    const n = Number.parseFloat(texto.replace(',', '.'))
    const nuevo = texto.trim() === '' || !Number.isFinite(n) || n < 0 ? null : n
    if (nuevo !== valor) onFijar(nuevo)
    else setTexto(mostrar)
  }
  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={`Cantidad (${unidad})`}
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className="h-11 w-20 rounded-lg border border-slate-200 bg-white px-2 text-right text-base tabular-nums focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
    />
  )
}

const TH = 'sticky left-0 z-10 bg-white px-2 py-1 text-left text-sm font-medium text-slate-700'

// Tabla del balance: filas precargadas × columnas de hora. Editable en la hoja, de solo lectura en el resumen.
export function TablaBalanceFluidos({
  registros,
  vacias = [],
  onFijar,
  onEditarHora,
}: {
  registros: RegistroFluido[]
  vacias?: string[]
  onFijar?: (fila: FilaFluido, columna: Columna, valor: number | null) => void
  onEditarHora?: (columna: Columna) => void
}) {
  const filas = filasFluidos(registros)
  const cols = columnas(registros, vacias)
  const ingresos = filas.filter((f) => f.entrada)
  const egresos = filas.filter((f) => !f.entrada)
  const total = totales(registros)

  const totalFila = (f: FilaFluido) => registros.filter((r) => r.tipo === f.id).reduce((s, r) => s + r.cantidad, 0)
  const celda = (f: FilaFluido, c: Columna) => {
    const v = cantidadCelda(registros, f.id, c.clave)
    return onFijar ? (
      <Celda valor={v} unidad={f.unidad} onFijar={(n) => onFijar(f, c, n)} />
    ) : (
      <span className="tabular-nums text-slate-800">{v === null ? '' : formatCantidad(v)}</span>
    )
  }
  const sumaColumna = (c: Columna, entrada: boolean) =>
    registros.filter((r) => claveColumna(r.hora) === c.clave && r.entrada === entrada && r.unidad === 'mL').reduce((s, r) => s + r.cantidad, 0)

  const grupo = (titulo: string, lista: FilaFluido[], entrada: boolean, ml: number) => (
    <>
      <tr>
        <th colSpan={cols.length + 2} className="bg-slate-100 px-2 py-1 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
          {titulo}
        </th>
      </tr>
      {lista.map((f) => (
        <tr key={f.id} className="border-b border-slate-100">
          <th scope="row" className={TH}>
            {f.etiqueta} <span className="text-xs font-normal text-slate-400">({f.unidad})</span>
          </th>
          {cols.map((c) => (
            <td key={c.clave} className="px-1 py-1 text-right">
              {celda(f, c)}
            </td>
          ))}
          <td className="px-2 py-1 text-right font-semibold tabular-nums text-slate-800">{totalFila(f) > 0 ? formatCantidad(totalFila(f)) : ''}</td>
        </tr>
      ))}
      <tr className="border-b border-slate-300 bg-slate-50">
        <th scope="row" className={`${TH} bg-slate-50 font-semibold`}>
          Total {entrada ? 'ingresos' : 'egresos'} (mL)
        </th>
        {cols.map((c) => (
          <td key={c.clave} className="px-2 py-1 text-right text-sm tabular-nums text-slate-600">
            {sumaColumna(c, entrada) > 0 ? formatCantidad(sumaColumna(c, entrada)) : ''}
          </td>
        ))}
        <td className="px-2 py-1 text-right font-bold tabular-nums text-slate-900">{formatCantidad(ml)}</td>
      </tr>
    </>
  )

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className={`${TH} text-slate-500`}>Hora</th>
            {cols.map((c) => (
              <th key={c.clave} className="px-1 py-1 text-center">
                {onEditarHora ? (
                  <button type="button" onClick={() => onEditarHora(c)} className="min-h-[36px] rounded-lg px-2 font-mono text-sm font-semibold text-sky-700 hover:bg-sky-50" title="Editar la hora de esta columna">
                    {formatHora(c.hora)} ✎
                  </button>
                ) : (
                  <span className="font-mono text-sm font-semibold text-slate-700">{formatHora(c.hora)}</span>
                )}
              </th>
            ))}
            <th className="px-2 py-1 text-right text-sm font-semibold text-slate-700">Total</th>
          </tr>
        </thead>
        <tbody>
          {grupo('Ingresos', ingresos, true, total.ingresoMl)}
          {grupo('Egresos', egresos, false, total.egresoMl)}
          <tr className="bg-sky-50">
            <th scope="row" className={`${TH} bg-sky-50 font-bold text-sky-900`}>
              Balance acumulado (mL)
            </th>
            {cols.map((c) => (
              <td key={c.clave} className="px-2 py-2 text-right font-semibold tabular-nums text-sky-900">
                {formatBalance(totales(registros, c.clave).balanceMl)}
              </td>
            ))}
            <td className="px-2 py-2 text-right font-bold tabular-nums text-sky-900">{formatBalance(total.balanceMl)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
