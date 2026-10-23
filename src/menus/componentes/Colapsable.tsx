import { useState, type ReactNode } from 'react'

export function Colapsable({
  titulo,
  insignia,
  abiertoInicial = false,
  children,
}: {
  titulo: string
  insignia?: ReactNode
  abiertoInicial?: boolean
  children: ReactNode
}) {
  const [abierto, setAbierto] = useState(abiertoInicial)
  return (
    <div className="rounded-xl border border-slate-200">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        className="flex min-h-[48px] w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="font-semibold text-slate-800">{titulo}</span>
        <span className="flex items-center gap-2">
          {insignia}
          <span className="text-slate-400" aria-hidden="true">
            {abierto ? '▾' : '▸'}
          </span>
        </span>
      </button>
      {abierto && <div className="border-t border-slate-200 p-3">{children}</div>}
    </div>
  )
}
