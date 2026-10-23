import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { RegistroVital, TimeFlag, ValoresVitales } from '../types'
import type { Hito } from '../utils/hitos'
import { formatHora } from '../utils/tiempo'
import { calcularPam, formatTemp, valoresDe } from '../utils/vitales'
import { cortaPosicion, marcasFlags, segmentosPosicion } from '../utils/flags'
import { disponerMarcas, marcasDeHitos, MarcasHitos } from './MarcasHitos'

const ALTO = 260
const ALTO_TIRA = 72
const ANCHO_EJE = 82
const PAD_IZQ = 32
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

const FILAS_TIRA = [
  { clave: 'spo2', etiqueta: 'SpO2 (%)' },
  { clave: 'etco2', etiqueta: 'EtCO2 (mmHg)' },
  { clave: 'temp', etiqueta: 'Temp (°C)' },
] as const

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
  flags = [],
  pendiente = null,
  seleccionHora = null,
  onSolicitarCambio,
  onSeleccionar,
  controles = true,
}: {
  serie: RegistroVital[]
  inicio: string | null
  hitos?: Hito[]
  flags?: TimeFlag[]
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

  const tiemposMarcas = [...hitos.map((h) => Date.parse(h.hora)), ...flags.map((f) => Date.parse(f.hora))]
  const t0Base = inicio ? Date.parse(inicio) : Date.parse(visibles[0].hora)
  const t0 = Math.min(t0Base, Date.parse(visibles[0].hora), ...tiemposMarcas)
  const tUltimo = Math.max(Date.parse(visibles[visibles.length - 1].hora), ...tiemposMarcas)
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
  const banda = disponerMarcas([...marcasDeHitos(hitos), ...marcasFlags(flags)], xTiempo, ancho - 4)
  const desfase = banda.alto
  const altoSvg = ALTO + desfase + ALTO_TIRA
  const yCero = desfase + PAD_TOP + altoInterior
  const y = (valor: number) => yCero - (Math.min(Math.max(valor, 0), ESCALA_MAX) / ESCALA_MAX) * altoInterior

  const cadaTiempo = Math.max(1, Math.ceil(46 / pxPor5))
  const cadaTira = Math.max(1, Math.ceil(34 / pxPor5))
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
            <text key={v} x={ANCHO_EJE - 8} y={y(v) + 4} fontSize={12} fontWeight={700} fill="#1e293b" textAnchor="end">
              {v}
            </text>
          ))}
          <line x1={ANCHO_EJE - 0.5} x2={ANCHO_EJE - 0.5} y1={desfase} y2={yCero} stroke="#94a3b8" />
          {FILAS_TIRA.map((f, k) => (
            <text key={f.clave} x={6} y={ALTO + desfase + 15 + k * 17} fontSize={10} fontWeight={700} fill="#1e293b">
              {f.etiqueta}
            </text>
          ))}
          <text x={6} y={ALTO + desfase + 15 + FILAS_TIRA.length * 17} fontSize={10} fontWeight={700} fill="#1e293b">
            Posición
          </text>
        </svg>

        <div ref={setContenedor} className="min-w-0 flex-1 overflow-x-auto">
          <svg ref={svgRef} width={ancho} height={altoSvg} role="img" aria-label="Gráfico de signos vitales">
            <MarcasHitos
              hitos={hitos}
              items={banda.items}
              alto={banda.alto}
              x={xTiempo}
              yTop={0}
              yBottom={ALTO + desfase - PAD_BOTTOM}
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
                  <text x={x(r.hora)} y={ALTO + desfase - 8} fontSize={12} fontWeight={700} fill="#334155" textAnchor="middle" pointerEvents="none">
                    {formatHora(r.hora)}
                  </text>
                )}
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
                fill={COLOR_PAM}
                stroke={COLOR_PAM}
                strokeWidth={1.5}
                pointerEvents="none"
              />
            ))}
            {con('pas').map((r) => (
              <g key={`pas-${r.id}`} {...manejadores(r, 'pas')} style={estiloArrastre}>
                {interactivo && <circle cx={x(r.hora)} cy={y(r.pas as number) - 4} r={11} fill="transparent" />}
                <polyline points={simboloV(x(r.hora), y(r.pas as number))} {...TRAZO_SIMBOLO} />
              </g>
            ))}
            {con('pad').map((r) => (
              <g key={`pad-${r.id}`} {...manejadores(r, 'pad')} style={estiloArrastre}>
                {interactivo && <circle cx={x(r.hora)} cy={y(r.pad as number) + 4} r={11} fill="transparent" />}
                <polyline points={simboloVInvertida(x(r.hora), y(r.pad as number))} {...TRAZO_SIMBOLO} />
              </g>
            ))}
            {con('fc').map((r) => (
              <g key={`fc-${r.id}`} {...manejadores(r, 'fc')} style={estiloArrastre}>
                {interactivo && <circle cx={x(r.hora)} cy={y(r.fc as number)} r={11} fill="transparent" />}
                <circle
                  cx={x(r.hora)}
                  cy={y(r.fc as number)}
                  r={4.5}
                  fill={COLOR_FC}
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
                  {FILAS_TIRA.map((f, k) => (
                    <text
                      key={f.clave}
                      x={x(r.hora)}
                      y={ALTO + desfase + 15 + k * 17}
                      fontSize={11}
                      textAnchor="middle"
                      fill="#1e293b"
                      fontWeight={600}
                    >
                      {f.clave === 'temp' ? formatTemp(r.temp) : (r[f.clave] ?? '–')}
                    </text>
                  ))}
                </g>
              ) : null,
            )}
            {segmentosPosicion(flags, Date.parse(visibles[0].hora), tUltimo).map((seg, i) => {
              const xs = xTiempo(seg.desde)
              const xe = xTiempo(seg.hasta)
              const nombre = cortaPosicion(seg.posicion)
              const anchoNombre = nombre.length * 6.6 + 8
              const flechas = Math.max(0, Math.floor((xe - xs - anchoNombre - 4) / 7.5))
              return (
                <text
                  key={`pos-${i}`}
                  x={xs - 4}
                  y={ALTO + desfase + 15 + FILAS_TIRA.length * 17}
                  fontSize={11}
                  fontWeight={700}
                  fill="#1e293b"
                  pointerEvents="none"
                >
                  {nombre}
                  <tspan fill="#94a3b8" fontWeight={400} dx={6}>
                    {'>'.repeat(flechas)}
                  </tspan>
                </text>
              )
            })}
          </svg>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
        <Leyenda color={COLOR_FC} simbolo="●" label="FC (lpm)" />
        <Leyenda color={COLOR_PA} simbolo="V" label="PAS" />
        <Leyenda color={COLOR_PA} simbolo="Λ" label="PAD" />
        <Leyenda color={COLOR_PAM} simbolo="◆" label="PAM" />
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

const TRAZO_SIMBOLO = {
  fill: 'none',
  stroke: COLOR_PA,
  strokeWidth: 2.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function rombo(cx: number, cy: number) {
  return `${cx},${cy - 4} ${cx + 4},${cy} ${cx},${cy + 4} ${cx - 4},${cy}`
}
