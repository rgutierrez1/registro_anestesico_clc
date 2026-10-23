import { useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'

const ALTO = 168
const RADIO = 20

// Deslizador táctil vertical: arrastrar hacia arriba sube el valor y hacia abajo lo baja; los botones ± ajustan de a un paso.
export function DeslizadorVertical({
  etiqueta,
  unidad,
  valor,
  min,
  max,
  paso,
  porDefecto,
  onChange,
}: {
  etiqueta: string
  unidad: string
  valor: number | null
  min: number
  max: number
  paso: number
  porDefecto: number
  onChange: (v: number | null) => void
}) {
  const pista = useRef<HTMLDivElement>(null)
  const arrastrando = useRef(false)
  const decimales = paso < 1 ? 1 : 0
  const actual = valor ?? porDefecto
  const acotar = (v: number) => Math.min(max, Math.max(min, v))
  const redondear = (v: number) => Number((Math.round(v / paso) * paso).toFixed(decimales))
  const fraccion = (acotar(actual) - min) / (max - min)
  const yPulgar = RADIO + (1 - fraccion) * (ALTO - 2 * RADIO)

  function desdePuntero(clientY: number) {
    const rect = pista.current?.getBoundingClientRect()
    if (!rect) return
    const f = 1 - (clientY - rect.top - RADIO) / (rect.height - 2 * RADIO)
    onChange(redondear(min + Math.min(1, Math.max(0, f)) * (max - min)))
  }

  function ajustar(delta: number) {
    onChange(acotar(redondear(actual + delta)))
  }

  function teclado(e: KeyboardEvent) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') ajustar(paso)
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') ajustar(-paso)
    else return
    e.preventDefault()
  }

  const texto = valor === null ? '—' : valor.toFixed(decimales).replace('.', ',')

  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white px-1 py-2">
      <span className="text-sm font-semibold text-slate-700">{etiqueta}</span>
      <span className={`text-2xl font-bold tabular-nums ${valor === null ? 'text-slate-300' : 'text-slate-900'}`}>{texto}</span>
      <span className="-mt-1 text-[11px] text-slate-500">{unidad}</span>
      <button
        type="button"
        aria-label={`Subir ${etiqueta}`}
        onClick={() => ajustar(paso)}
        className="flex h-9 w-12 items-center justify-center rounded-lg bg-slate-100 text-lg font-bold text-slate-700 active:bg-slate-200"
      >
        +
      </button>
      <div
        ref={pista}
        role="slider"
        tabIndex={0}
        aria-label={etiqueta}
        aria-orientation="vertical"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={actual}
        onKeyDown={teclado}
        onPointerDown={(e: ReactPointerEvent<HTMLDivElement>) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          arrastrando.current = true
          desdePuntero(e.clientY)
        }}
        onPointerMove={(e) => {
          if (arrastrando.current) desdePuntero(e.clientY)
        }}
        onPointerUp={() => {
          arrastrando.current = false
        }}
        onPointerCancel={() => {
          arrastrando.current = false
        }}
        className="relative w-14 cursor-pointer touch-none select-none rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        style={{ height: ALTO }}
      >
        <div className="absolute left-1/2 w-2 -translate-x-1/2 rounded-full bg-slate-200" style={{ top: RADIO, bottom: RADIO }} />
        <div
          className="absolute left-1/2 w-2 -translate-x-1/2 rounded-full bg-sky-300"
          style={{ top: yPulgar, bottom: RADIO, opacity: valor === null ? 0.35 : 1 }}
        />
        <div
          className={`absolute left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 shadow ${
            valor === null ? 'border-slate-300 bg-white' : 'border-sky-600 bg-sky-600'
          }`}
          style={{ top: yPulgar, width: RADIO * 2, height: RADIO * 2 }}
        >
          <span className={`h-0.5 w-4 rounded ${valor === null ? 'bg-slate-300' : 'bg-white'}`} />
        </div>
      </div>
      <button
        type="button"
        aria-label={`Bajar ${etiqueta}`}
        onClick={() => ajustar(-paso)}
        className="flex h-9 w-12 items-center justify-center rounded-lg bg-slate-100 text-lg font-bold text-slate-700 active:bg-slate-200"
      >
        −
      </button>
      <button
        type="button"
        onClick={() => onChange(null)}
        disabled={valor === null}
        className="min-h-[28px] text-xs text-slate-500 underline disabled:invisible"
      >
        Sin dato
      </button>
    </div>
  )
}
