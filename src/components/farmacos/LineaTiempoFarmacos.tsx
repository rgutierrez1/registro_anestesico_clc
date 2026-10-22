import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { indiceCatalogo, obtenerFarmaco } from '../../data/catalogoFarmacos'
import type { RegistroFarmaco } from '../../types'
import { formatDosis } from '../../utils/dosis'
import { claveFarmaco, limitesHora } from '../../utils/farmacos'
import type { Hito } from '../../utils/hitos'
import { formatHora } from '../../utils/tiempo'
import { useAhora } from '../../utils/useAhora'
import { ALTO_BANDA_HITOS, MarcasHitos } from '../MarcasHitos'

const ANCHO = 760
const ANCHO_ETIQUETA = 150
const MARGEN_DER = 28
const ANCHO_GRAFICO = ANCHO - ANCHO_ETIQUETA - MARGEN_DER
const ALTO_FILA_BOLO = 36
const ALTO_FILA_CONTINUO = 58
const ALTO_EJE = 26
const MIN = 60000

const COLOR_BOLO = '#0284c7'
const COLOR_CONTINUO = '#059669'
const COLOR_EDICION = '#d97706'

interface Fila {
  clave: string
  farmacoId: string
  nombre: string
  etiqueta: string
  modo: string
  continuo: boolean
  registros: RegistroFarmaco[]
  orden: number
}

interface Arrastre {
  id: string
  x0: number
  movido: boolean
  t: number
  lo: number
  hi: number
}

export interface DestinoAgregar {
  farmacoId: string
  nombre: string
  t: number
}

interface Vista {
  base: RegistroFarmaco[]
  id: string
  t: number
}

type Manejadores = {
  onPointerDown: (e: ReactPointerEvent<SVGGElement>) => void
  onPointerMove: (e: ReactPointerEvent<SVGGElement>) => void
  onPointerUp: () => void
  onPointerCancel: () => void
}

const estiloInteractivo = { touchAction: 'none', cursor: 'ew-resize' } as const

export function LineaTiempoFarmacos({
  registros,
  inicio,
  fin,
  onCambiarHora,
  onSeleccionar,
  seleccionadoId = null,
  onAgregarEn,
  agregando = null,
  hitos = [],
}: {
  registros: RegistroFarmaco[]
  inicio: string | null
  fin: string | null
  onCambiarHora?: (id: string, hora: string) => void
  onSeleccionar?: (id: string) => void
  seleccionadoId?: string | null
  onAgregarEn?: (destino: { farmacoId: string; nombre: string }, t: number) => void
  agregando?: DestinoAgregar | null
  hitos?: Hito[]
}) {
  const ahora = useAhora(30000)
  const svgRef = useRef<SVGSVGElement>(null)
  const arrastre = useRef<Arrastre | null>(null)
  const [vista, setVista] = useState<Vista | null>(null)
  if (registros.length === 0 && !agregando) return null

  const tiempos = registros.map((r) => Date.parse(r.hora)).sort((a, b) => a - b)
  const tiemposHitos = hitos.map((h) => Date.parse(h.hora))
  const t0Base = Math.min(inicio ? Date.parse(inicio) : Infinity, tiempos[0] ?? Infinity, ...tiemposHitos)
  const t0 = Number.isFinite(t0Base) ? t0Base : ahora - 10 * MIN
  const tFinal = Math.max(fin ? Date.parse(fin) : ahora, tiempos[tiempos.length - 1] ?? 0, ...tiemposHitos)
  const tEnd = Math.max(tFinal, t0 + 10 * MIN)
  const x = (t: number) => ANCHO_ETIQUETA + ((t - t0) / (tEnd - t0)) * ANCHO_GRAFICO
  const tiempoEn = (clientX: number): number | null => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const sx = ((clientX - rect.left) / rect.width) * ANCHO
    return t0 + ((sx - ANCHO_ETIQUETA) / ANCHO_GRAFICO) * (tEnd - t0)
  }

  // Mientras se arrastra se muestra la hora provisoria, con la escala del gráfico congelada.
  const previa = vista && vista.base === registros ? vista : null
  const efectivos = previa
    ? registros.map((r) => (r.id === previa.id ? { ...r, hora: new Date(previa.t).toISOString() } : r))
    : registros

  const grupos = new Map<string, RegistroFarmaco[]>()
  for (const r of [...efectivos].sort((a, b) => a.hora.localeCompare(b.hora))) {
    const clave = claveFarmaco(r.farmacoId, r.nombre)
    grupos.set(clave, [...(grupos.get(clave) ?? []), r])
  }
  const filas: Fila[] = [...grupos.entries()]
    .map(([clave, regs]) => ({
      clave,
      farmacoId: regs[0].farmacoId,
      nombre: regs[0].nombre,
      etiqueta: obtenerFarmaco(regs[0].farmacoId)?.etiqueta ?? regs[0].nombre,
      modo: regs.find((r) => r.evento === 'inicio')?.modo ?? '',
      continuo: regs.some((r) => r.evento !== 'bolo'),
      registros: regs,
      orden: indiceCatalogo(regs[0].farmacoId),
    }))
    .sort((a, b) => a.orden - b.orden)

  const claveAgregando = agregando ? claveFarmaco(agregando.farmacoId, agregando.nombre) : null
  if (agregando && claveAgregando && !grupos.has(claveAgregando)) {
    const def = obtenerFarmaco(agregando.farmacoId)
    filas.push({
      clave: claveAgregando,
      farmacoId: agregando.farmacoId,
      nombre: agregando.nombre,
      etiqueta: def?.etiqueta ?? agregando.nombre,
      modo: '',
      continuo: def?.administracion === 'continuo',
      registros: [],
      orden: indiceCatalogo(agregando.farmacoId),
    })
    filas.sort((a, b) => a.orden - b.orden)
  }

  const spanMin = (tEnd - t0) / MIN
  const paso = [5, 10, 15, 30, 60, 120].find((p) => spanMin / p <= 8) ?? 120
  const marcas: number[] = []
  for (let m = 0; m <= spanMin; m += paso) marcas.push(t0 + m * MIN)

  const altos = filas.map((f) => (f.continuo ? ALTO_FILA_CONTINUO : ALTO_FILA_BOLO))
  const desfase = hitos.length > 0 ? ALTO_BANDA_HITOS : 0
  const altoTotal = altos.reduce((s, a) => s + a, 0) + ALTO_EJE + desfase
  const tops = altos.map((_, i) => desfase + altos.slice(0, i).reduce((s, a) => s + a, 0))

  const manejadores = onCambiarHora
    ? (r: RegistroFarmaco): Manejadores => ({
        onPointerDown: (e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          const lim = limitesHora(registros, r.id)
          const original = registros.find((o) => o.id === r.id) ?? r
          arrastre.current = {
            id: r.id,
            x0: e.clientX,
            movido: false,
            t: Date.parse(original.hora),
            lo: Math.max(t0, lim.min !== null ? lim.min + MIN : t0),
            hi: Math.min(tEnd, lim.max !== null ? lim.max - MIN : tEnd),
          }
        },
        onPointerMove: (e) => {
          const a = arrastre.current
          if (!a || a.id !== r.id || a.lo > a.hi) return
          if (!a.movido && Math.abs(e.clientX - a.x0) < 4) return
          const bruto = tiempoEn(e.clientX)
          if (bruto === null) return
          a.movido = true
          a.t = Math.min(a.hi, Math.max(a.lo, Math.round(bruto / MIN) * MIN))
          setVista({ base: registros, id: r.id, t: a.t })
        },
        onPointerUp: () => {
          const a = arrastre.current
          arrastre.current = null
          if (!a || a.id !== r.id) return
          if (a.movido) onCambiarHora(r.id, new Date(a.t).toISOString())
          else onSeleccionar?.(r.id)
        },
        onPointerCancel: () => {
          arrastre.current = null
          setVista(null)
        },
      })
    : undefined

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${ANCHO} ${altoTotal}`}
        className="block w-full min-w-[600px]"
        role="img"
        aria-label="Registro gráfico de fármacos"
      >
        {marcas.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={desfase} y2={altoTotal - ALTO_EJE} stroke="#e2e8f0" />
            <text x={x(t)} y={altoTotal - 9} fontSize={10} fill="#94a3b8" textAnchor="middle">
              {formatHora(new Date(t).toISOString())}
            </text>
          </g>
        ))}

        <MarcasHitos
          hitos={hitos}
          x={x}
          yTop={0}
          yBottom={altoTotal - ALTO_EJE}
          xMax={ANCHO - 4}
          tFinal={tFinal}
        />

        {filas.map((fila, i) => {
          const top = tops[i]
          const alto = altos[i]
          return (
            <g key={fila.clave}>
              {i % 2 === 1 && <rect x={0} y={top} width={ANCHO} height={alto} fill="#f8fafc" opacity={0.7} />}
              <line x1={0} x2={ANCHO} y1={top + alto} y2={top + alto} stroke="#e2e8f0" />
              <text x={8} y={top + alto / 2 - (fila.modo ? 2 : -4)} fontSize={12} fontWeight={600} fill="#1e293b">
                {fila.etiqueta}
              </text>
              {fila.modo && (
                <text x={8} y={top + alto / 2 + 12} fontSize={9} fill="#64748b">
                  {fila.modo}
                </text>
              )}
              {onAgregarEn && (
                <rect
                  x={ANCHO_ETIQUETA}
                  y={top}
                  width={ANCHO_GRAFICO}
                  height={alto}
                  className="cursor-cell fill-transparent hover:fill-sky-100/60"
                  onClick={(e) => {
                    const bruto = tiempoEn(e.clientX)
                    if (bruto === null) return
                    const t = Math.min(Date.now(), Math.max(t0, Math.round(bruto / MIN) * MIN))
                    onAgregarEn({ farmacoId: fila.farmacoId, nombre: fila.nombre }, t)
                  }}
                />
              )}
              {fila.registros.length === 0 && (
                <text x={ANCHO_ETIQUETA + 10} y={top + alto / 2 + 4} fontSize={11} fill="#94a3b8" pointerEvents="none">
                  Tocá la fila en el momento de administración, o elegí la hora abajo
                </text>
              )}
              {fila.continuo ? (
                <FilaContinua
                  fila={fila}
                  top={top}
                  alto={alto}
                  x={x}
                  tFinal={tFinal}
                  manejadores={manejadores}
                  seleccionadoId={seleccionadoId}
                />
              ) : (
                <FilaBolos
                  fila={fila}
                  top={top}
                  alto={alto}
                  x={x}
                  manejadores={manejadores}
                  seleccionadoId={seleccionadoId}
                />
              )}
              {agregando && fila.clave === claveAgregando && (
                <MarcadorAgregar x={x(Math.min(Math.max(agregando.t, t0), tEnd))} top={top} alto={alto} />
              )}
            </g>
          )
        })}

        {previa && (
          <g pointerEvents="none">
            <line
              x1={x(previa.t)}
              x2={x(previa.t)}
              y1={desfase}
              y2={altoTotal - ALTO_EJE}
              stroke={COLOR_EDICION}
              strokeDasharray="4 3"
              strokeWidth={1.5}
            />
            <text
              x={x(previa.t)}
              y={altoTotal - 9}
              fontSize={11}
              fontWeight={700}
              fill={COLOR_EDICION}
              textAnchor="middle"
              stroke="#fff"
              strokeWidth={4}
              paintOrder="stroke"
            >
              {formatHora(new Date(previa.t).toISOString())}
            </text>
          </g>
        )}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 px-3 py-2 text-xs text-slate-600">
        <span>
          <span style={{ color: COLOR_BOLO }}>●</span> Bolo
        </span>
        <span>
          <span style={{ color: COLOR_CONTINUO }}>▬</span> TCI / infusión / inhalatoria (escalón = cambio de dosis)
        </span>
      </div>
    </div>
  )
}

function MarcadorAgregar({ x, top, alto }: { x: number; top: number; alto: number }) {
  return (
    <g pointerEvents="none">
      <line x1={x} x2={x} y1={top + 3} y2={top + alto - 3} stroke={COLOR_EDICION} strokeWidth={2} strokeDasharray="4 3" />
      <circle cx={x} cy={top + alto / 2} r={8} fill="#fff" stroke={COLOR_EDICION} strokeWidth={2} />
      <text x={x} y={top + alto / 2 + 4.5} fontSize={13} fontWeight={700} fill={COLOR_EDICION} textAnchor="middle">
        +
      </text>
    </g>
  )
}

function Seleccion({ cx, cy }: { cx: number; cy: number }) {
  return <circle cx={cx} cy={cy} r={10} fill="none" stroke={COLOR_EDICION} strokeWidth={2.5} />
}

function FilaBolos({
  fila,
  top,
  alto,
  x,
  manejadores,
  seleccionadoId,
}: {
  fila: Fila
  top: number
  alto: number
  x: (t: number) => number
  manejadores?: (r: RegistroFarmaco) => Manejadores
  seleccionadoId: string | null
}) {
  const cy = top + alto / 2 + 7
  return (
    <>
      {fila.registros.map((r) => {
        const cx = x(Date.parse(r.hora))
        return (
          <g key={r.id} {...manejadores?.(r)} style={manejadores ? estiloInteractivo : undefined}>
            {manejadores && <circle cx={cx} cy={cy} r={15} fill="transparent" />}
            {seleccionadoId === r.id && <Seleccion cx={cx} cy={cy} />}
            <circle cx={cx} cy={cy} r={5} fill={COLOR_BOLO} />
            <text x={cx} y={cy - 9} fontSize={10} fill="#334155" textAnchor="middle" pointerEvents="none">
              {r.dosisTexto ?? formatDosis(r.valor, r.unidad)}
            </text>
          </g>
        )
      })}
    </>
  )
}

function FilaContinua({
  fila,
  top,
  alto,
  x,
  tFinal,
  manejadores,
  seleccionadoId,
}: {
  fila: Fila
  top: number
  alto: number
  x: (t: number) => number
  tFinal: number
  manejadores?: (r: RegistroFarmaco) => Manejadores
  seleccionadoId: string | null
}) {
  const base = top + alto - 8
  const cima = top + 20
  const conValor = fila.registros.filter((r) => r.valor !== null)
  const def = obtenerFarmaco(fila.farmacoId)
  const maximo = Math.max(...(def?.dosis ?? []), ...conValor.map((r) => r.valor as number), 0)
  const nivel = (v: number) => (maximo > 0 ? base - (v / maximo) * (base - cima) : base)

  let d = ''
  let abierto = false
  let yActual = base
  const puntos: { r: RegistroFarmaco; x: number; y: number; texto: string | null }[] = []
  for (const r of fila.registros) {
    const xr = x(Date.parse(r.hora))
    if (r.evento === 'fin') {
      if (abierto) d += ` H ${xr} V ${base}`
      puntos.push({ r, x: xr, y: abierto ? (yActual + base) / 2 : base, texto: null })
      abierto = false
    } else if (r.evento === 'inicio' || r.evento === 'cambio') {
      yActual = nivel(r.valor ?? 0)
      d += abierto ? ` H ${xr} V ${yActual}` : ` M ${xr} ${base} V ${yActual}`
      abierto = true
      puntos.push({ r, x: xr, y: yActual, texto: formatDosis(r.valor, r.unidad) })
    }
  }
  if (abierto) d += ` H ${x(tFinal)}`

  return (
    <>
      <path d={d.trim()} fill="none" stroke={COLOR_CONTINUO} strokeWidth={2.5} strokeLinejoin="round" />
      {abierto && <circle cx={x(tFinal)} cy={yActual} r={4} fill={COLOR_CONTINUO} />}
      {puntos.map(({ r, x: px, y, texto }) => (
        <g key={r.id} {...manejadores?.(r)} style={manejadores ? estiloInteractivo : undefined}>
          {manejadores && <circle cx={px} cy={y} r={13} fill="transparent" />}
          {seleccionadoId === r.id && <Seleccion cx={px} cy={y} />}
          {manejadores && <circle cx={px} cy={y} r={4.5} fill="#fff" stroke={COLOR_CONTINUO} strokeWidth={2} />}
          {texto && (
            <text x={px + 6} y={y - 6} fontSize={10} fill="#334155" pointerEvents="none">
              {texto}
            </text>
          )}
        </g>
      ))}
    </>
  )
}
