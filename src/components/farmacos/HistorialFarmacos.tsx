import type { RegistroFarmaco } from '../../types'
import { formatDosis } from '../../utils/dosis'
import { ETIQUETA_EVENTO } from '../../utils/farmacos'
import { formatHora } from '../../utils/tiempo'

export function HistorialFarmacos({
  registros,
  onEliminar,
}: {
  registros: RegistroFarmaco[]
  onEliminar: (id: string) => void
}) {
  const ordenados = [...registros].sort((a, b) => b.hora.localeCompare(a.hora))
  return (
    <div className="max-h-[280px] overflow-auto rounded-lg border border-slate-200">
      {ordenados.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">Sin fármacos registrados.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-100 text-slate-600">
            <tr>
              <th className="px-2 py-2 text-left">Hora</th>
              <th className="px-2 py-2 text-left">Fármaco</th>
              <th className="px-2 py-2 text-left">Modo</th>
              <th className="px-2 py-2 text-left">Evento</th>
              <th className="px-2 py-2 text-left">Dosis</th>
              <th className="px-2 py-2 text-left">Vía</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {ordenados.map((f) => (
              <tr key={f.id} className="border-t border-slate-100">
                <td className="px-2 py-2 font-medium text-slate-700">{formatHora(f.hora)}</td>
                <td className="px-2 py-2 text-slate-800">{f.nombre}</td>
                <td className="px-2 py-2 text-slate-600">{f.modo}</td>
                <td className="px-2 py-2 text-slate-600">{ETIQUETA_EVENTO[f.evento]}</td>
                <td className="px-2 py-2 text-slate-600">
                  {f.evento === 'fin' ? '—' : (f.dosisTexto ?? formatDosis(f.valor, f.unidad))}
                </td>
                <td className="px-2 py-2 text-slate-600">{f.via}</td>
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
  )
}
