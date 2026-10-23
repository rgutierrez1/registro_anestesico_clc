import { useEffect, useRef } from 'react'

const ALTO_FILA = 44
const FILAS_VISIBLES = 3

// Rueda para elegir un número deslizando hacia arriba o abajo. Mientras está vacía no se guarda nada:
// `inicio` solo indica en qué valor se abre la rueda; el valor se fija al deslizar o al tocar un número.
export function RuedaNumerica({
  etiqueta,
  unidad,
  valor,
  opciones,
  inicio,
  onChange,
}: {
  etiqueta: string
  unidad?: string
  valor: number | ''
  opciones: number[]
  inicio: number
  onChange: (v: number | '') => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const temporizador = useRef<number | undefined>(undefined)
  const programatico = useRef(false)
  // Solo se fija un valor si la persona deslizó (o tocó) la rueda; el posicionamiento inicial no cuenta.
  const usuario = useRef(false)

  const indiceDe = (v: number | '') => {
    if (v !== '') return Math.max(0, opciones.indexOf(v))
    const i = opciones.findIndex((o) => o >= inicio)
    return i === -1 ? opciones.length - 1 : i
  }

  function irA(indice: number, suave = false) {
    const el = ref.current
    if (!el || Math.round(el.scrollTop / ALTO_FILA) === indice) return
    programatico.current = true
    el.scrollTo({ top: indice * ALTO_FILA, behavior: suave ? 'smooth' : 'auto' })
    window.setTimeout(() => (programatico.current = false), suave ? 400 : 100)
  }

  useEffect(() => {
    irA(indiceDe(valor))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, opciones])

  function alDeslizar() {
    if (programatico.current || !usuario.current) return
    window.clearTimeout(temporizador.current)
    temporizador.current = window.setTimeout(() => {
      const el = ref.current
      if (!el) return
      const v = opciones[Math.min(opciones.length - 1, Math.max(0, Math.round(el.scrollTop / ALTO_FILA)))]
      usuario.current = false
      if (v !== valor) onChange(v)
    }, 140)
  }

  const texto = (n: number) => String(n).replace('.', ',')

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-slate-600">{etiqueta}</span>
        {valor !== '' && (
          <button type="button" onClick={() => onChange('')} className="min-h-[28px] text-xs text-slate-400 underline">
            Borrar
          </button>
        )}
      </div>
      <p className={`text-lg font-bold tabular-nums ${valor === '' ? 'text-slate-300' : 'text-slate-900'}`}>
        {valor === '' ? '—' : texto(valor)}
        {valor !== '' && unidad && <span className="ml-1 text-sm font-normal text-slate-500">{unidad}</span>}
      </p>
      <div className="relative rounded-xl border border-slate-300 bg-white" style={{ height: ALTO_FILA * FILAS_VISIBLES }}>
        <div
          ref={ref}
          onScroll={alDeslizar}
          onWheel={() => (usuario.current = true)}
          onTouchStart={() => (usuario.current = true)}
          onPointerDown={() => (usuario.current = true)}
          role="listbox"
          aria-label={etiqueta}
          className="h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain rounded-xl"
          style={{ scrollbarWidth: 'none', touchAction: 'pan-y' }}
        >
          <div style={{ height: ALTO_FILA }} aria-hidden="true" />
          {opciones.map((o) => (
            <div
              key={o}
              role="option"
              aria-selected={o === valor}
              onClick={() => {
                onChange(o)
                irA(opciones.indexOf(o), true)
              }}
              className={`flex snap-center items-center justify-center text-base tabular-nums ${o === valor ? 'font-bold text-sky-700' : 'text-slate-400'}`}
              style={{ height: ALTO_FILA }}
            >
              {texto(o)}
            </div>
          ))}
          <div style={{ height: ALTO_FILA }} aria-hidden="true" />
        </div>
        <div
          className="pointer-events-none absolute inset-x-1 rounded-lg border-y-2 border-sky-300 bg-sky-50/40"
          style={{ top: ALTO_FILA, height: ALTO_FILA }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

export const rango = (desde: number, hasta: number, paso = 1) =>
  Array.from({ length: Math.round((hasta - desde) / paso) + 1 }, (_, i) => Math.round((desde + i * paso) * 100) / 100)
