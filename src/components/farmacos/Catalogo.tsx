import { CATALOGO_ELEGIBLE, CATEGORIAS_FARMACO, type FarmacoDef } from '../../data/catalogoFarmacos'

export const TIPO_DRAG_FARMACO = 'text/plain'

export function Catalogo({
  seleccionados,
  onAlternar,
}: {
  seleccionados: Set<string>
  onAlternar: (def: FarmacoDef) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      {CATEGORIAS_FARMACO.map((categoria) => (
        <div key={categoria}>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{categoria}</h3>
          <div className="flex flex-wrap gap-2">
            {CATALOGO_ELEGIBLE.filter((f) => f.categoria === categoria).map((def) => {
              const activo = seleccionados.has(def.id)
              return (
                <button
                  key={def.id}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(TIPO_DRAG_FARMACO, def.id)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  onClick={() => onAlternar(def)}
                  aria-pressed={activo}
                  className={`min-h-[44px] rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    activo
                      ? 'border-sky-600 bg-sky-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-sky-400'
                  }`}
                >
                  {activo && '✓ '}
                  {def.etiqueta}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
