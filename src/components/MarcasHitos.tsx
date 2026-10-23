import type { Hito } from '../utils/hitos'
import { formatHora } from '../utils/tiempo'

export interface MarcaTemporal {
  clave: string
  corta: string
  hora: string
  color: string
}

export interface MarcaDispuesta extends MarcaTemporal {
  xh: number
  xEtiqueta: number
  ancho: number
  fila: number
  texto: string
}

const ALTO_ETIQUETA = 17
const SEPARACION = 19
const MAX_FILAS = 5

export function marcasDeHitos(hitos: Hito[]): MarcaTemporal[] {
  return hitos.map((h) => ({ clave: h.clave, corta: h.corta, hora: h.hora, color: h.color }))
}

// Reparte las etiquetas en filas para que no se pisen; devuelve también el alto que ocupa la banda.
export function disponerMarcas(
  marcas: MarcaTemporal[],
  x: (t: number) => number,
  xMax: number,
): { items: MarcaDispuesta[]; alto: number } {
  const finales: number[] = []
  const items = [...marcas]
    .sort((a, b) => a.hora.localeCompare(b.hora))
    .map((m) => {
      const xh = x(Date.parse(m.hora))
      const texto = `${m.corta} ${formatHora(m.hora)}`
      const ancho = texto.length * 6.2 + 14
      const xEtiqueta = xh + ancho <= xMax ? xh : Math.max(0, xh - ancho)
      let fila = finales.findIndex((fin) => xEtiqueta >= fin + 4)
      if (fila === -1) {
        if (finales.length < MAX_FILAS) {
          fila = finales.length
          finales.push(-Infinity)
        } else {
          fila = finales.indexOf(Math.min(...finales))
        }
      }
      finales[fila] = Math.max(finales[fila], xEtiqueta + ancho)
      return { ...m, xh, xEtiqueta, ancho, fila, texto }
    })
  return { items, alto: items.length ? finales.length * SEPARACION + 4 : 0 }
}

// Se dibuja detrás de los datos: sombrea el tiempo quirúrgico y traza una línea con etiqueta por marca.
export function MarcasHitos({
  hitos,
  items,
  alto,
  x,
  yTop,
  yBottom,
  tFinal,
}: {
  hitos: Hito[]
  items: MarcaDispuesta[]
  alto: number
  x: (t: number) => number
  yTop: number
  yBottom: number
  tFinal: number
}) {
  if (items.length === 0) return null
  const inicioCirugia = hitos.find((h) => h.clave === 'inicioCirugia')
  const finCirugia = hitos.find((h) => h.clave === 'finCirugia')

  return (
    <g pointerEvents="none">
      {inicioCirugia && (
        <rect
          x={x(Date.parse(inicioCirugia.hora))}
          y={yTop + alto}
          width={Math.max(0, x(finCirugia ? Date.parse(finCirugia.hora) : tFinal) - x(Date.parse(inicioCirugia.hora)))}
          height={Math.max(0, yBottom - yTop - alto)}
          fill={inicioCirugia.color}
          opacity={0.07}
        />
      )}
      {items.map((m) => {
        const yEtiqueta = yTop + 2 + m.fila * SEPARACION
        return (
          <g key={m.clave}>
            <line x1={m.xh} x2={m.xh} y1={yEtiqueta + ALTO_ETIQUETA} y2={yBottom} stroke={m.color} strokeWidth={1.5} opacity={0.75} />
            <rect x={m.xEtiqueta} y={yEtiqueta} width={m.ancho} height={ALTO_ETIQUETA} rx={4} fill={m.color} />
            <text x={m.xEtiqueta + 7} y={yEtiqueta + 12.5} fontSize={11} fontWeight={600} fill="#fff">
              {m.texto}
            </text>
          </g>
        )
      })}
    </g>
  )
}
