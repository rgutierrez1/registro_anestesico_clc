import { CHECKLIST_SEGURIDAD } from '../constants'
import { Section } from './ui'

export function ChecklistSection({
  marcados,
  onAlternar,
  onMarcarTodas,
}: {
  marcados: string[]
  onAlternar: (id: string) => void
  onMarcarTodas: (marcar: boolean) => void
}) {
  const todas = marcados.length === CHECKLIST_SEGURIDAD.length
  return (
    <Section
      title="Checklist de seguridad"
      actions={
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            {marcados.length} de {CHECKLIST_SEGURIDAD.length}
          </span>
          <button
            type="button"
            onClick={() => onMarcarTodas(!todas)}
            className="min-h-[40px] rounded-lg bg-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-300"
          >
            {todas ? 'Desmarcar todas' : 'Marcar todas'}
          </button>
        </div>
      }
    >
      <ul className="flex flex-col gap-2">
        {CHECKLIST_SEGURIDAD.map((item) => {
          const hecho = marcados.includes(item.id)
          return (
            <li key={item.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={hecho}
                onClick={() => onAlternar(item.id)}
                className={`flex min-h-[52px] w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                  hecho ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white hover:border-sky-300'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 text-lg font-bold leading-none ${
                    hecho ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-400 bg-white text-transparent'
                  }`}
                  aria-hidden="true"
                >
                  ✓
                </span>
                <span className={`text-base ${hecho ? 'text-emerald-900' : 'text-slate-800'}`}>{item.etiqueta}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
