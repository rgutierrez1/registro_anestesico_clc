import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { RegistroVital, ValoresVitales } from '../types'
import type { Hito } from '../utils/hitos'
import { calcularPam, esCopia, valoresDe } from '../utils/vitales'
import { ALTO_BANDA_HITOS, MarcasHitos } from './MarcasHitos'

const ALTO = 260
const ALTO_TIRA = 38
const ANCHO_EJE = 56
const PAD_IZQ = 14
const PAD_DER = 32
const PAD_TOP = 16
const PAD_BOTTOM = 28
const ESCALA_MAX = 200
const MIN_ANCHO_AJUSTADO = 280
const PX_POR_5MIN_MIN = 8
const PX_POR_5MIN_MAX = 160
const CLAVE_ZOOM = 'registro-anestesico:zoom-vitales'

const COLOR_FC = '#dc2626'
const COLOR_PA = '#0284c7'
const COLOR_PAM = '#64748b'
const COLOR_EDICION = '#d97706'

type ClaveArrastrable = 'fc' | 'pas' | 'pad'
type Zoom = 'ajustar' | number

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

function leerZoom(): Zoom {
  try {
    const v = localStorage.getItem(CLAVE_ZOOM)
    const n = v === null ? NaN : Number(v)
    if (Number.isFinite(n) && n >= PX_POR_5MIN_MIN && n <= PX_POR_5MIN_MAX) return n
  } catch {
    // sin almacenamiento disponible
  }
  return 'ajustar'
}

function guardarZoom(z: Zoom) {
  try {
    if (z === 'ajustar') localStorage.removeItem(CLAVE_ZOOM)
    else localStorage.setItem(CLAVE_ZOOM, String(z))
  } catch {
    // sin almacenamiento disponible
  }
}

export function VitalesChart({
  serie,
  inicio,
  hitos = [],
  pendiente = null,
  seleccionHora = null,
  onSolicitarCambio,
  onSeleccionar,
  controles = true,
}: {
  serie: RegistroVital[]
  inicio: string | null
  hitos?: Hito[]
  pendiente?: CambioPendiente | null
  seleccionHora?: string | null
  onSolicitarCambio?: (hora: string, nuevos: ValoresVitales) => void
  onSeleccionar?: (hora: string) => void
  controles?: boolean
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const arrastre = useRef<Arrastre | null>(null)
  const [contenedor, setContenedor] = useState<HTMLDivElement | null>(null)
  const [anchoContenedor, setAnchoContenedor] = useState(0)
  const [zoomElegido, setZoom] = useState<Zoom>(leerZoom)
  const [vistaArrastre, setVistaArrastre] = useState<{ hora: string; campo: ClaveArrastrable; valor: number } | null>(null)
  const interactivo = Boolean(onSolicitarCambio)
  const zoom: Zoom = controles ? zoomElegido : 'ajustar'

  useEffect(() => {
    if (!contenedor) return
    const observador = new ResizeObserver(([e]) => setAnchoContenedor(Math.round(e.contentRect.width)))
    observador.observe(contenedor)
    setAnchoContenedor(contenedor.clientWidth)
    return () => observador.disconnect()
  }, [contenedor])

  useEffect(() => {
    if (onSeleccionar && contenedor) contenedor.scrollLeft = contenedor.scrollWidth
  }, [serie.length, onSeleccionar, contenedor, zoom])

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

  const altoInterior = ALTO - PAD_TOP - PAD_BOTTOM
  const desfase = hitos.length > 0 ? ALTO_BANDA_HITOS : 0
  const altoSvg = ALTO + desfase + ALTO_TIRA
  const yCero = desfase + PAD_TOP + altoInterior

  const tiemposHitos = hitos.map((h) => Date.parse(h.hora))
  const t0Base = inicio ? Date.parse(inicio) : Date.parse(visibles[0].hora)
  const t0 = Math.min(t0Base, Date.parse(visibles[0].hora), ...tiemposHitos)
  const tUltimo = Math.max(Date.parse(visibles[visibles.length - 1].hora), ...tiemposHitos)
  const span = Math.max(tUltimo - t0, 10 * 60000)
  const spanMin = span / 60000

  const anchoDisponible = Math.max(MIN_ANCHO_AJUSTADO, anchoContenedor - PAD_IZQ - PAD_DER)
  const pxPor5Ajustado = (anchoDisponible / spanMin) * 5
  const pxPor5 = zoom === 'ajustar' ? pxPor5Ajustado : zoom
  const anchoInterior = zoom === 'ajustar' ? anchoDisponible : Math.max(MIN_ANCHO_AJUSTADO, (spanMin / 5) * pxPor5)
  const ancho = anchoInterior + PAD_IZQ + PAD_DER
  const hayScroll = ancho > anchoContenedor + 1

  const xTiempo = (t: number) => PAD_IZQ + ((t - t0) / span) * anchoInterior
  const x = (hora: string) => xTiempo(Date.parse(hora))
  const y = (valor: number) => yCero - (Math.min(Math.max(valor, 0), ESCALA_MAX) / ESCALA_MAX) * altoInterior

  const cadaTiempo = Math.max(1, Math.ceil(64 / pxPor5))
  const cadaTira = Math.max(1, Math.ceil(26 / pxPor5))
  const ultimo = visibles.length - 1
  const mostrarCada = (i: number, k: number) => i % k === 0 || i === ultimo

  const con = (campo: 'fc' | 'pas' | 'pad' | 'pam') => visibles.filter((r) => r[campo] !== null)
  const trazo = (campo: 'fc' | 'pas' | 'pad' | 'pam') =>
    con(campo)
      .map((r, i) => `${i === 0 ? 'M' : 'L'} ${x(r.hora)} ${y(r[campo] as number)}`)
      .join(' ')

  const gridY = [0, 40, 80, 120, 160, 200]
  const anchoColumna = Math.max(10, pxPor5)

  function cambiarZoom(factor: number) {
    const actual = zoom === 'ajustar' ? pxPor5Ajustado : zoom
    const nuevo = Math.min(PX_POR_5MIN_MAX, actual * factor)
    const siguiente: Zoom = factor < 1 && nuevo <= pxPor5Ajustado + 0.5 ? 'ajustar' : Math.max(PX_POR_5MIN_MIN, Math.round(nuevo))
    setZoom(siguiente)
    guardarZoom(siguiente)
  }

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
      {controles && (
        <div className="no-print flex flex-wrap items-center justify-end gap-2 border-b border-slate-200 bg-white px-3 py-2">
          <span className="mr-auto text-xs text-slate-500">
            Escala de tiempo: {zoom === 'ajustar' ? 'todo el caso' : `${Math.round(zoom)} px cada 5 min`}
            {hayScroll && ' · desplazá hacia los costados'}
          </span>
          <button
            type="button"
            aria-label="Reducir escala de tiempo"
            disabled={zoom === 'ajustar'}
            onClick={() => cambiarZoom(1 / 1.5)}
            className="min-h-[40px] min-w-[40px] rounded-lg bg-slate-200 text-lg font-semibold text-slate-700 hover:bg-slate-300 disabled:opacity-40"
          >
            −
          </button>
          <button
            type="button"
            aria-label="Ampliar escala de tiempo"
            disabled={pxPor5 >= PX_POR_5MIN_MAX}
            onClick={() => cambiarZoom(1.5)}
            className="min-h-[40px] min-w-[40px] rounded-lg bg-slate-200 text-lg font-semibold text-slate-700 hover:bg-slate-300 disabled:opacity-40"
          >
            +
          </button>
          <button
            type="button"
            aria-pressed={zoom === 'ajustar'}
            onClick={() => {
              setZoom('ajustar')
              guardarZoom('ajustar')
            }}
            className={`min-h-[40px] rounded-lg px-3 text-sm font-medium ${
              zoom === 'ajustar' ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            Ver todo
          </button>
        </div>
      )}

      <div className="flex">
        <svg width={ANCHO_EJE} height={altoSvg} className="shrink-0" role="img" aria-label="Escala de valores">
          {gridY.map((v) => (
            <text key={v} x={ANCHO_EJE - 8} y={y(v) + 4} fontSize={10} fill="#94a3b8" textAnchor="end">
              {v}
            </text>
          ))}
          <line x1={ANCHO_EJE - 0.5} x2={ANCHO_EJE - 0.5} y1={desfase} y2={yCero} stroke="#cbd5e1" />
          <text x={6} y={ALTO + desfase + 15} fontSize={9} fontWeight={600} fill="#475569">
            SpO2 %
          </text>
          <text x={6} y={ALTO + desfase + 32} fontSize={9} fontWeight={600} fill="#475569">
            EtCO2
          </text>
        </svg>

        <div ref={setContenedor} className="min-w-0 flex-1 overflow-x-auto">
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
              <line key={v} x1={0} x2={ancho} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth={1} />
            ))}

            {visibles.map((r, i) => (
              <g key={`col-${r.hora}`}>
                {seleccionHora === r.hora && (
                  <rect
                    x={x(r.hora) - anchoColumna / 2}
                    y={desfase}
                    width={anchoColumna}
                    height={altoSvg - desfase}
                    fill={COLOR_EDICION}
                    opacity={0.12}
                  />
                )}
                {onSeleccionar && (
                  <rect
                    x={x(r.hora) - anchoColumna / 2}
                    y={desfase}
                    width={anchoColumna}
                    height={altoSvg - desfase}
                    className="cursor-pointer fill-transparent hover:fill-sky-100/50"
                    onClick={() => onSeleccionar(r.hora)}
                  />
                )}
                {mostrarCada(i, cadaTiempo) && (
                  <text x={x(r.hora)} y={ALTO + desfase - 8} fontSize={9} fill="#94a3b8" textAnchor="middle" pointerEvents="none">
                    {new Date(r.hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </text>
                )}
              </g>
            ))}

            <path d={trazo('pam')} fill="none" stroke={COLOR_PAM} strokeWidth={1.25} strokeDasharray="3 3" />
            <path d={trazo('pas')} fill="none" stroke={COLOR_PA} strokeWidth={1.5} opacity={0.7} />
            <path d={trazo('pad')} fill="none" stroke={COLOR_PA} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />
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
                {interactivo && <circle cx={x(r.hora)} cy={y(r.pas as number) - 4} r={11} fill="transparent" />}
                <polyline points={simboloV(x(r.hora), y(r.pas as number))} {...trazoSimbolo(esCopia(r))} />
              </g>
            ))}
            {con('pad').map((r) => (
              <g key={`pad-${r.id}`} {...manejadores(r, 'pad')} style={estiloArrastre}>
                {interactivo && <circle cx={x(r.hora)} cy={y(r.pad as number) + 4} r={11} fill="transparent" />}
                <polyline points={simboloVInvertida(x(r.hora), y(r.pad as number))} {...trazoSimbolo(esCopia(r))} />
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
            {visibles.map((r, i) =>
              mostrarCada(i, cadaTira) ? (
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
              ) : null,
            )}
          </svg>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
        <Leyenda color={COLOR_FC} simbolo="●" label="FC (lpm)" />
        <Leyenda color={COLOR_PA} simbolo="V" label="PAS" />
        <Leyenda color={COLOR_PA} simbolo="Λ" label="PAD" />
        <Leyenda color={COLOR_PAM} simbolo="◆" label="PAM" />
        <span>Trazo grueso / relleno: registrado · fino / hueco: copia automática cada 5 min</span>
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
      <span className="font-bold" style={{ color }}>
        {simbolo}
      </span>{' '}
      {label}
    </span>
  )
}

// La punta de cada símbolo marca el valor: la V (PAS) queda por encima y la Λ (PAD) por debajo.
function simboloV(cx: number, cy: number) {
  return `${cx - 5},${cy - 9} ${cx},${cy} ${cx + 5},${cy - 9}`
}

function simboloVInvertida(cx: number, cy: number) {
  return `${cx - 5},${cy + 9} ${cx},${cy} ${cx + 5},${cy + 9}`
}

function trazoSimbolo(copia: boolean) {
  return {
    fill: 'none',
    stroke: COLOR_PA,
    strokeWidth: copia ? 1.6 : 2.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    opacity: copia ? 0.55 : 1,
  }
}

function rombo(cx: number, cy: number) {
  return `${cx},${cy - 4} ${cx + 4},${cy} ${cx},${cy + 4} ${cx - 4},${cy}`
}
