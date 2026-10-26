import type { CasoAnestesico } from '../../types'
import { versionMenu } from '../paciente'

const OPCIONES: { id: CasoAnestesico['versionMenus']; etiqueta: string }[] = [
  { id: 'auto', etiqueta: 'Automática' },
  { id: 'adulto', etiqueta: 'Adulto' },
  { id: 'ped', etiqueta: 'Pediátrica' },
]

// El corte pediátrico (hasta 10 años, pediátrica; mayor de 10, adulto) se puede cambiar a mano por paciente.
export function SelectorVersion({ caso, onCambiar }: { caso: CasoAnestesico; onCambiar: (v: CasoAnestesico['versionMenus']) => void }) {
  const activa = versionMenu(caso)
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
      <span>Versión: {activa === 'ped' ? 'pediátrica' : 'adulto'}</span>
      {OPCIONES.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onCambiar(o.id)}
          className={`min-h-[32px] rounded-full border px-3 ${caso.versionMenus === o.id ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 bg-white'}`}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  )
}
