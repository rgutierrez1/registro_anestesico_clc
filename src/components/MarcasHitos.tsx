import type { Hito } from '../utils/hitos'
import { formatHora } from '../utils/tiempo'

export const ALTO_BANDA_HITOS = 38

const ALTO_ETIQUETA = 15
const SEPARACION = 17

// Se dibuja detrás de los datos: sombrea el tiempo quirúrgico y traza una línea con etiqueta por hito.
export function MarcasHitos({
  hitos,
  x,
  yTop,
  yBottom,
  xMax,
  tFinal,
}: {
  hitos: Hito[]
  x: (t: number) => number
  yTop: number
  yBottom: number
  xMax: number
  tFinal: number
}) {
  if (hitos.length === 0) return null
  const inicioCirugia = hitos.find((h) => h.clave === 'inicioCirugia')
  const finCirugia = hitos.find((h) => h.clave === 'finCirugia')
  const color = inicioCirugia?.color ?? '#a21caf'

  return (
    <g pointerEvents="none">
      {inicioCirugia && (
        <rect
          x={x(Date.parse(inicioCirugia.hora))}
          y={yTop + ALTO_BANDA_HITOS}
          width={Math.max(0, x(finCirugia ? Date.parse(finCirugia.hora) : tFinal) - x(Date.parse(inicioCirugia.hora)))}
          height={Math.max(0, yBottom - yTop - ALTO_BANDA_HITOS)}
          fill={color}
          opacity={0.07}
        />
      )}
      {hitos.map((h, i) => {
        const xh = x(Date.parse(h.hora))
        const texto = `${h.corta} ${formatHora(h.hora)}`
        const ancho = texto.length * 5.3 + 12
        const xEtiqueta = xh + ancho <= xMax ? xh : xh - ancho
        const yEtiqueta = yTop + 2 + (i % 2) * SEPARACION
        return (
          <g key={h.clave}>
            <line x1={xh} x2={xh} y1={yEtiqueta + ALTO_ETIQUETA} y2={yBottom} stroke={h.color} strokeWidth={1.5} opacity={0.75} />
            <rect x={xEtiqueta} y={yEtiqueta} width={ancho} height={ALTO_ETIQUETA} rx={4} fill={h.color} />
            <text x={xEtiqueta + 6} y={yEtiqueta + 11} fontSize={9.5} fontWeight={600} fill="#fff">
              {texto}
            </text>
          </g>
        )
      })}
    </g>
  )
}
