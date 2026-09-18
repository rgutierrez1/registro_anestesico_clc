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
