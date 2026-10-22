import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { RegistroVital, ValoresVitales } from '../types'
import type { Hito } from '../utils/hitos'
import { calcularPam, esCopia, valoresDe } from '../utils/vitales'
import { ALTO_BANDA_HITOS, MarcasHitos } from './MarcasHitos'

const ALTO = 260
const ALTO_TIRA = 38
const ANCHO_MIN_POR_PUNTO = 70
const PAD_IZQ = 58
const PAD_DER = 16
const PAD_TOP = 16
const PAD_BOTTOM = 28
const ESCALA_MAX = 200

const COLOR_FC = '#dc2626'
const COLOR_PA = '#0284c7'
const COLOR_PAM = '#64748b'
const COLOR_EDICION = '#d97706'

type ClaveArrastrable = 'fc' | 'pas' | 'pad'

interface Arrastre {
  hora: string
  campo: ClaveArrastrable
  x0: number
  y0: number
  movido: boolean
  valor: number
  original: number
}

export interface CambioPendiente {
  hora: string
  nuevos: ValoresVitales
}

export function VitalesChart({
  serie,
  inicio,
  hitos = [],
  pendiente = null,
  seleccionHora = null,
  onSolicitarCambio,
  onSeleccionar,
}: {
  serie: RegistroVital[]
  inicio: string | null
  hitos?: Hito[]
  pendiente?: CambioPendiente | null
  seleccionHora?: string | null
  onSolicitarCambio?: (hora: string, nuevos: ValoresVitales) => void
  onSeleccionar?: (hora: string) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const contenedor = useRef<HTMLDivElement>(null)
  const arrastre = useRef<Arrastre | null>(null)
  const [vistaArrastre, setVistaArrastre] = useState<{ hora: string; campo: ClaveArrastrable; valor: number } | null>(null)
  const interactivo = Boolean(onSolicitarCambio)

  useEffect(() => {
    if (onSeleccionar && contenedor.current) contenedor.current.scrollLeft = contenedor.current.scrollWidth
  }, [serie.length, onSeleccionar])

  if (serie.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">
        Sin registros todavía.
      </div>
    )
  }

  const visibles = serie.map((r) => {
    let v = r
    if (pendiente && r.hora === pendiente.hora) v = { ...r, ...pendiente.nuevos }
    if (vistaArrastre && r.hora === vistaArrastre.hora) {
      v = { ...v, [vistaArrastre.campo]: vistaArrastre.valor }
      v.pam = calcularPam(v.pas, v.pad)
    }
    return v
  })

  const n = Math.max(visibles.length, 2)
  const anchoInterior = Math.max(hitos.length > 0 ? 560 : 280, (n - 1) * ANCHO_MIN_POR_PUNTO)
  const ancho = anchoInterior + PAD_IZQ + PAD_DER
  const altoInterior = ALTO - PAD_TOP - PAD_BOTTOM
  const desfase = hitos.length > 0 ? ALTO_BANDA_HITOS : 0
  const altoSvg = ALTO + desfase + ALTO_TIRA
  const yCero = desfase + PAD_TOP + altoInterior

  const tiemposHitos = hitos.map((h) => Date.parse(h.hora))
  const t0Base = inicio ? Date.parse(inicio) : Date.parse(visibles[0].hora)
  const t0 = Math.min(t0Base, Date.parse(visibles[0].hora), ...tiemposHitos)
  const tUltimo = Math.max(Date.parse(visibles[visibles.length - 1].hora), ...tiemposHitos)
  const span = Math.max(tUltimo - t0, 10 * 60000)

  const xTiempo = (t: number) => PAD_IZQ + ((t - t0) / span) * anchoInterior
  const x = (hora: string) => xTiempo(Date.parse(hora))
  const y = (valor: number) => yCero - (Math.min(Math.max(valor, 0), ESCALA_MAX) / ESCALA_MAX) * altoInterior

  const con = (campo: 'fc' | 'pas' | 'pad' | 'pam') => visibles.filter((r) => r[campo] !== null)
  const trazo = (campo: 'fc' | 'pas' | 'pad' | 'pam') =>
    con(campo)
      .map((r, i) => `${i === 0 ? 'M' : 'L'} ${x(r.hora)} ${y(r[campo] as number)}`)
      .join(' ')

  const gridY = [0, 40, 80, 120, 160, 200]
  const separacion = anchoInterior / Math.max(n - 1, 1)

  function manejadores(r: RegistroVital, campo: ClaveArrastrable) {
    if (!interactivo) return undefined
    return {
      onPointerDown: (e: ReactPointerEvent<SVGGElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        const original = r[campo] as number
        arrastre.current = { hora: r.hora, campo, x0: e.clientX, y0: e.clientY, movido: false, valor: original, original }
      },
      onPointerMove: (e: ReactPointerEvent<SVGGElement>) => {
        const a = arrastre.current
        const svg = svgRef.current
        if (!a || a.hora !== r.hora || a.campo !== campo || !svg) return
        if (!a.movido && Math.hypot(e.clientX - a.x0, e.clientY - a.y0) < 5) return
        a.movido = true
        const rect = svg.getBoundingClientRect()
        const ySvg = ((e.clientY - rect.top) / rect.height) * altoSvg
        let valor = Math.round(((yCero - ySvg) / altoInterior) * ESCALA_MAX)
        valor = Math.min(ESCALA_MAX, Math.max(0, valor))
        if (campo === 'pas' && r.pad !== null) valor = Math.max(valor, r.pad + 1)
        if (campo === 'pad' && r.pas !== null) valor = Math.min(valor, r.pas - 1)
        a.valor = valor
        setVistaArrastre({ hora: r.hora, campo, valor })
      },
      onPointerUp: () => {
        const a = arrastre.current
        arrastre.current = null
        setVistaArrastre(null)
        if (!a) return
        if (!a.movido) onSeleccionar?.(r.hora)
        else if (a.valor !== a.original) onSolicitarCambio?.(r.hora, { ...valoresDe(r), [campo]: a.valor })
      },
      onPointerCancel: () => {
        arrastre.current = null
        setVistaArrastre(null)
      },
    }
  }

  const estiloArrastre = interactivo ? ({ touchAction: 'none', cursor: 'ns-resize' } as const) : undefined

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50">
      <div ref={contenedor} className="overflow-x-auto">
        <svg ref={svgRef} width={ancho} height={altoSvg} role="img" aria-label="Gráfico de signos vitales">
          <MarcasHitos
            hitos={hitos}
            x={xTiempo}
            yTop={0}
            yBottom={ALTO + desfase - PAD_BOTTOM}
            xMax={ancho - 4}
            tFinal={tUltimo}
          />
          {gridY.map((v) => (
            <g key={v}>
              <line x1={PAD_IZQ} x2={ancho - PAD_DER} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth={1} />
              <text x={4} y={y(v) + 4} fontSize={10} fill="#94a3b8">
                {v}
              </text>
            </g>
          ))}

          {visibles.map((r) => (
            <g key={`col-${r.hora}`}>
              {seleccionHora === r.hora && (
                <rect
                  x={x(r.hora) - separacion / 2}
                  y={desfase}
                  width={separacion}
                  height={altoSvg - desfase}
                  fill={COLOR_EDICION}
                  opacity={0.12}
                />
              )}
              {onSeleccionar && (
                <rect
                  x={x(r.hora) - separacion / 2}
                  y={desfase}
                  width={separacion}
                  height={altoSvg - desfase}
                  className="cursor-pointer fill-transparent hover:fill-sky-100/50"
                  onClick={() => onSeleccionar(r.hora)}
                />
              )}
              <text x={x(r.hora)} y={ALTO + desfase - 8} fontSize={9} fill="#94a3b8" textAnchor="middle" pointerEvents="none">
                {new Date(r.hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </text>
            </g>
          ))}

          <path d={trazo('pam')} fill="none" stroke={COLOR_PAM} strokeWidth={1.25} strokeDasharray="3 3" />
          <path d={trazo('pas')} fill="none" stroke={COLOR_PA} strokeWidth={2} />
          <path d={trazo('pad')} fill="none" stroke={COLOR_PA} strokeWidth={2} strokeDasharray="4 3" />
          <path d={trazo('fc')} fill="none" stroke={COLOR_FC} strokeWidth={2} />

          {con('pam').map((r) => (
            <polygon
              key={`pam-${r.id}`}
              points={rombo(x(r.hora), y(r.pam as number))}
              fill={esCopia(r) ? '#fff' : COLOR_PAM}
              stroke={COLOR_PAM}
              strokeWidth={1.5}
              pointerEvents="none"
            />
          ))}
          {con('pas').map((r) => (
            <g key={`pas-${r.id}`} {...manejadores(r, 'pas')} style={estiloArrastre}>
              {interactivo && <circle cx={x(r.hora)} cy={y(r.pas as number)} r={11} fill="transparent" />}
              <polygon
                points={trianguloArriba(x(r.hora), y(r.pas as number))}
                fill={esCopia(r) ? '#fff' : COLOR_PA}
                stroke={COLOR_PA}
                strokeWidth={1.5}
              />
            </g>
          ))}
          {con('pad').map((r) => (
            <g key={`pad-${r.id}`} {...manejadores(r, 'pad')} style={estiloArrastre}>
              {interactivo && <circle cx={x(r.hora)} cy={y(r.pad as number)} r={11} fill="transparent" />}
              <polygon
                points={trianguloAbajo(x(r.hora), y(r.pad as number))}
                fill={esCopia(r) ? '#fff' : COLOR_PA}
                stroke={COLOR_PA}
                strokeWidth={1.5}
              />
            </g>
          ))}
          {con('fc').map((r) => (
            <g key={`fc-${r.id}`} {...manejadores(r, 'fc')} style={estiloArrastre}>
              {interactivo && <circle cx={x(r.hora)} cy={y(r.fc as number)} r={11} fill="transparent" />}
              <circle
                cx={x(r.hora)}
                cy={y(r.fc as number)}
                r={4.5}
                fill={esCopia(r) ? '#fff' : COLOR_FC}
                stroke={COLOR_FC}
                strokeWidth={1.5}
              />
            </g>
          ))}

          {vistaArrastre &&
            (() => {
              const r = visibles.find((v) => v.hora === vistaArrastre.hora)
              if (!r) return null
              const cx = x(r.hora)
              return (
                <g pointerEvents="none">
                  <line x1={cx} x2={cx} y1={desfase} y2={yCero} stroke={COLOR_EDICION} strokeDasharray="4 3" />
                  <text
                    x={cx + 9}
                    y={y(vistaArrastre.valor) + 4}
                    fontSize={12}
                    fontWeight={700}
                    fill={COLOR_EDICION}
                    stroke="#fff"
                    strokeWidth={4}
                    paintOrder="stroke"
                  >
                    {vistaArrastre.valor}
                  </text>
                </g>
              )
            })()}

          {pendiente &&
            (() => {
              const r = visibles.find((v) => v.hora === pendiente.hora)
              if (!r) return null
              return (
                <g pointerEvents="none">
                  {(['pas', 'pad', 'fc'] as const).map((c) =>
                    r[c] !== null ? (
                      <circle key={c} cx={x(r.hora)} cy={y(r[c] as number)} r={9} fill="none" stroke={COLOR_EDICION} strokeWidth={2.5} />
                    ) : null,
                  )}
                </g>
              )
            })()}

          <line x1={0} x2={ancho} y1={ALTO + desfase} y2={ALTO + desfase} stroke="#e2e8f0" />
          <text x={4} y={ALTO + desfase + 15} fontSize={9} fontWeight={600} fill="#475569">
            SpO2 %
          </text>
          <text x={4} y={ALTO + desfase + 32} fontSize={9} fontWeight={600} fill="#475569">
            EtCO2
          </text>
          {visibles.map((r) => (
            <g key={`tira-${r.id}`} pointerEvents="none">
              <text
                x={x(r.hora)}
                y={ALTO + desfase + 15}
                fontSize={11}
                textAnchor="middle"
                fill={esCopia(r) ? '#94a3b8' : '#1e293b'}
                fontWeight={esCopia(r) ? 400 : 600}
              >
                {r.spo2 ?? '–'}
              </text>
              <text
                x={x(r.hora)}
                y={ALTO + desfase + 32}
                fontSize={11}
                textAnchor="middle"
                fill={esCopia(r) ? '#94a3b8' : '#1e293b'}
                fontWeight={esCopia(r) ? 400 : 600}
              >
                {r.etco2 ?? '–'}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
        <Leyenda color={COLOR_FC} simbolo="●" label="FC (lpm)" />
        <Leyenda color={COLOR_PA} simbolo="▲" label="PAS" />
        <Leyenda color={COLOR_PA} simbolo="▼" label="PAD" />
        <Leyenda color={COLOR_PAM} simbolo="◆" label="PAM" />
        <span>Relleno: registrado · Hueco: copia automática cada 5 min</span>
        {interactivo && (
          <span className="text-slate-500">
            Arrastrá FC, PAS o PAD hacia arriba o abajo para cambiarlos, o tocá un registro para editar todos sus valores.
          </span>
        )}
      </div>
    </div>
  )
}

function Leyenda({ color, simbolo, label }: { color: string; simbolo: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span style={{ color }}>{simbolo}</span> {label}
    </span>
  )
}

function trianguloArriba(cx: number, cy: number) {
  return `${cx},${cy - 5} ${cx - 5},${cy + 4} ${cx + 5},${cy + 4}`
}

function trianguloAbajo(cx: number, cy: number) {
  return `${cx},${cy + 5} ${cx - 5},${cy - 4} ${cx + 5},${cy - 4}`
}

function rombo(cx: number, cy: number) {
  return `${cx},${cy - 4} ${cx + 4},${cy} ${cx},${cy + 4} ${cx - 4},${cy}`
}
