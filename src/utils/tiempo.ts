export function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function duracionDesde(iso: string, hasta: Date = new Date()): string {
  const ms = hasta.getTime() - new Date(iso).getTime()
  const totalMin = Math.max(0, Math.floor(ms / 60000))
  const horas = Math.floor(totalMin / 60)
  const min = totalMin % 60
  return `${horas.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
}

export function hhmmLocal(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function conHora(base: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(base)
  d.setHours(h, m, 0, 0)
  return d
}

// Hora de hoy; si resulta futura se asume el día anterior (cirugías que cruzan la medianoche).
export function horaPersonalizadaIso(hhmm: string, ahora: Date = new Date()): string {
  const d = conHora(ahora, hhmm)
  if (d.getTime() > ahora.getTime() + 60000) d.setDate(d.getDate() - 1)
  return d.toISOString()
}

// Fecha más cercana a la referencia que tenga esa hora del día (al corregir una hora ya registrada).
export function horaCercanaIso(hhmm: string, referenciaIso: string): string {
  const ref = new Date(referenciaIso)
  const candidatos = [-1, 0, 1].map((delta) => {
    const d = conHora(ref, hhmm)
    d.setDate(d.getDate() + delta)
    return d
  })
  candidatos.sort((a, b) => Math.abs(a.getTime() - ref.getTime()) - Math.abs(b.getTime() - ref.getTime()))
  return candidatos[0].toISOString()
}
