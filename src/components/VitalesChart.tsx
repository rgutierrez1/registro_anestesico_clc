import type { RegistroVital } from '../types'

const ALTO = 260
const ANCHO_MIN_POR_PUNTO = 70
const PAD_IZQ = 40
const PAD_DER = 16
const PAD_TOP = 16
const PAD_BOTTOM = 28
const ESCALA_MAX = 200

export function VitalesChart({ registros, inicio }: { registros: RegistroVital[]; inicio: string | null }) {
  const ordenados = [...registros].sort((a, b) => a.hora.localeCompare(b.hora))
  const n = Math.max(ordenados.length, 2)
  const anchoInterior = Math.max(280, (n - 1) * ANCHO_MIN_POR_PUNTO)
  const ancho = anchoInterior + PAD_IZQ + PAD_DER
  const altoInterior = ALTO - PAD_TOP - PAD_BOTTOM

  const t0 = inicio ? new Date(inicio).getTime() : ordenados[0] ? new Date(ordenados[0].hora).getTime() : Date.now()
  const tUltimo = ordenados.length ? new Date(ordenados[ordenados.length - 1].hora).getTime() : t0
  const span = Math.max(tUltimo - t0, 1000 * 60 * 10)

  function x(hora: string) {
    const t = new Date(hora).getTime()
    return PAD_IZQ + ((t - t0) / span) * anchoInterior
  }
  function y(valor: number) {
    const clamped = Math.min(Math.max(valor, 0), ESCALA_MAX)
    return PAD_TOP + altoInterior - (clamped / ESCALA_MAX) * altoInterior
  }

  const lineasFC = ordenados.filter((r) => r.fc != null)
  const lineasPAS = ordenados.filter((r) => r.pas != null)
  const lineasPAD = ordenados.filter((r) => r.pad != null)

  const pathFC = lineasFC.map((r, i) => `${i === 0 ? 'M' : 'L'} ${x(r.hora)} ${y(r.fc!)}`).join(' ')
  const pathPAS = lineasPAS.map((r, i) => `${i === 0 ? 'M' : 'L'} ${x(r.hora)} ${y(r.pas!)}`).join(' ')
  const pathPAD = lineasPAD.map((r, i) => `${i === 0 ? 'M' : 'L'} ${x(r.hora)} ${y(r.pad!)}`).join(' ')

  const gridY = [0, 40, 80, 120, 160, 200]

  if (ordenados.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">
        Sin registros todavía. Agregá el primer signo vital abajo.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50">
      <svg width={ancho} height={ALTO} role="img" aria-label="Gráfico de signos vitales">
        {gridY.map((v) => (
          <g key={v}>
            <line x1={PAD_IZQ} x2={ancho - PAD_DER} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth={1} />
            <text x={4} y={y(v) + 4} fontSize={10} fill="#94a3b8">
              {v}
            </text>
          </g>
        ))}

        {ordenados.map((r) => (
          <text key={r.id} x={x(r.hora)} y={ALTO - 8} fontSize={9} fill="#94a3b8" textAnchor="middle">
            {new Date(r.hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </text>
        ))}

        {/* Banda de presión arterial */}
        {lineasPAS.length > 0 && <path d={pathPAS} fill="none" stroke="#0284c7" strokeWidth={2} />}
        {lineasPAD.length > 0 && <path d={pathPAD} fill="none" stroke="#0284c7" strokeWidth={2} strokeDasharray="4 3" />}
        {lineasPAS.map((r) => (
          <polygon
            key={r.id}
            points={pointsTriangleUp(x(r.hora), y(r.pas!))}
            fill="#0284c7"
          />
        ))}
        {lineasPAD.map((r) => (
          <polygon
            key={r.id}
            points={pointsTriangleDown(x(r.hora), y(r.pad!))}
            fill="#0284c7"
          />
        ))}

        {/* Frecuencia cardíaca */}
        {lineasFC.length > 0 && <path d={pathFC} fill="none" stroke="#dc2626" strokeWidth={2} />}
        {lineasFC.map((r) => (
          <circle key={r.id} cx={x(r.hora)} cy={y(r.fc!)} r={4} fill="#dc2626" />
        ))}
      </svg>
      <div className="flex flex-wrap gap-4 border-t border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
        <Leyenda color="#dc2626" simbolo="●" label="FC (lpm)" />
        <Leyenda color="#0284c7" simbolo="▲" label="PA sistólica" />
        <Leyenda color="#0284c7" simbolo="▼" label="PA diastólica" />
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

function pointsTriangleUp(cx: number, cy: number) {
  return `${cx},${cy - 5} ${cx - 5},${cy + 4} ${cx + 5},${cy + 4}`
}

function pointsTriangleDown(cx: number, cy: number) {
  return `${cx},${cy + 5} ${cx - 5},${cy - 4} ${cx + 5},${cy - 4}`
}
