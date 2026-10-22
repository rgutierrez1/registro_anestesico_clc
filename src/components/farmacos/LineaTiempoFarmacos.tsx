import { indiceCatalogo, obtenerFarmaco } from '../../data/catalogoFarmacos'
import type { RegistroFarmaco } from '../../types'
import { formatDosis } from '../../utils/dosis'
import { claveFarmaco } from '../../utils/farmacos'
import { formatHora } from '../../utils/tiempo'
import { useAhora } from '../../utils/useAhora'

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

interface Fila {
  clave: string
  etiqueta: string
  modo: string
  continuo: boolean
  registros: RegistroFarmaco[]
  orden: number
}

export function LineaTiempoFarmacos({
  registros,
  inicio,
  fin,
}: {
  registros: RegistroFarmaco[]
  inicio: string | null
  fin: string | null
}) {
  const ahora = useAhora(30000)
  if (registros.length === 0) return null

  const ordenados = [...registros].sort((a, b) => a.hora.localeCompare(b.hora))
  const grupos = new Map<string, RegistroFarmaco[]>()
  for (const r of ordenados) {
    const clave = claveFarmaco(r.farmacoId, r.nombre)
    grupos.set(clave, [...(grupos.get(clave) ?? []), r])
  }
  const filas: Fila[] = [...grupos.entries()]
    .map(([clave, regs]) => ({
      clave,
      etiqueta: obtenerFarmaco(regs[0].farmacoId)?.etiqueta ?? regs[0].nombre,
      modo: regs.find((r) => r.evento === 'inicio')?.modo ?? '',
      continuo: regs.some((r) => r.evento !== 'bolo'),
      registros: regs,
      orden: indiceCatalogo(regs[0].farmacoId),
    }))
    .sort((a, b) => a.orden - b.orden)

  const tiempos = ordenados.map((r) => Date.parse(r.hora))
  const t0 = Math.min(inicio ? Date.parse(inicio) : Infinity, tiempos[0])
  const tFinal = Math.max(fin ? Date.parse(fin) : ahora, tiempos[tiempos.length - 1])
  const tEnd = Math.max(tFinal, t0 + 10 * MIN)
  const x = (t: number) => ANCHO_ETIQUETA + ((t - t0) / (tEnd - t0)) * ANCHO_GRAFICO

  const spanMin = (tEnd - t0) / MIN
  const paso = [5, 10, 15, 30, 60, 120].find((p) => spanMin / p <= 8) ?? 120
  const marcas: number[] = []
  for (let m = 0; m <= spanMin; m += paso) marcas.push(t0 + m * MIN)

  const altos = filas.map((f) => (f.continuo ? ALTO_FILA_CONTINUO : ALTO_FILA_BOLO))
  const altoTotal = altos.reduce((s, a) => s + a, 0) + ALTO_EJE
  const tops = altos.map((_, i) => altos.slice(0, i).reduce((s, a) => s + a, 0))

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <svg
        viewBox={`0 0 ${ANCHO} ${altoTotal}`}
        className="block w-full min-w-[600px]"
        role="img"
        aria-label="Registro gráfico de fármacos"
      >
        {marcas.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={0} y2={altoTotal - ALTO_EJE} stroke="#e2e8f0" />
            <text x={x(t)} y={altoTotal - 9} fontSize={10} fill="#94a3b8" textAnchor="middle">
              {formatHora(new Date(t).toISOString())}
            </text>
          </g>
        ))}

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
              {fila.continuo ? (
                <FilaContinua fila={fila} top={top} alto={alto} x={x} tFinal={tFinal} />
              ) : (
                <FilaBolos fila={fila} top={top} alto={alto} x={x} />
              )}
            </g>
          )
        })}
      </svg>
      <div className="flex flex-wrap gap-4 border-t border-slate-200 px-3 py-2 text-xs text-slate-600">
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

function FilaBolos({
  fila,
  top,
  alto,
  x,
}: {
  fila: Fila
  top: number
  alto: number
  x: (t: number) => number
}) {
  const cy = top + alto / 2 + 7
  return (
    <>
      {fila.registros.map((r) => (
        <g key={r.id}>
          <circle cx={x(Date.parse(r.hora))} cy={cy} r={5} fill={COLOR_BOLO} />
          <text x={x(Date.parse(r.hora))} y={cy - 9} fontSize={10} fill="#334155" textAnchor="middle">
            {r.dosisTexto ?? formatDosis(r.valor, r.unidad)}
          </text>
        </g>
      ))}
    </>
  )
}

function FilaContinua({
  fila,
  top,
  alto,
  x,
  tFinal,
}: {
  fila: Fila
  top: number
  alto: number
  x: (t: number) => number
  tFinal: number
}) {
  const base = top + alto - 8
  const cima = top + 20
  const conValor = fila.registros.filter((r) => r.valor !== null)
  const def = obtenerFarmaco(fila.registros[0].farmacoId)
  const maximo = Math.max(...(def?.dosis ?? []), ...conValor.map((r) => r.valor as number), 0)
  const nivel = (v: number) => (maximo > 0 ? base - (v / maximo) * (base - cima) : base)

  let d = ''
  let abierto = false
  const etiquetas: { x: number; y: number; texto: string; id: string }[] = []
  for (const r of fila.registros) {
    const xr = x(Date.parse(r.hora))
    if (r.evento === 'fin') {
      if (abierto) d += ` H ${xr} V ${base}`
      abierto = false
    } else if (r.evento === 'inicio' || r.evento === 'cambio') {
      const y = nivel(r.valor ?? 0)
      d += abierto ? ` H ${xr} V ${y}` : ` M ${xr} ${base} V ${y}`
      abierto = true
      etiquetas.push({ x: xr, y, texto: formatDosis(r.valor, r.unidad), id: r.id })
    }
  }
  if (abierto) d += ` H ${x(tFinal)}`

  return (
    <>
      <path d={d.trim()} fill="none" stroke={COLOR_CONTINUO} strokeWidth={2.5} strokeLinejoin="round" />
      {abierto && <circle cx={x(tFinal)} cy={nivelFinal(fila, nivel)} r={4} fill={COLOR_CONTINUO} />}
      {etiquetas.map((e) => (
        <text key={e.id} x={e.x + 3} y={e.y - 5} fontSize={10} fill="#334155">
          {e.texto}
        </text>
      ))}
    </>
  )
}

function nivelFinal(fila: Fila, nivel: (v: number) => number): number {
  const ultimo = [...fila.registros].reverse().find((r) => r.evento === 'inicio' || r.evento === 'cambio')
  return nivel(ultimo?.valor ?? 0)
}
