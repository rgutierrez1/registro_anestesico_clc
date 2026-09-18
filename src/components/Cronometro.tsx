import { useEffect, useState } from 'react'
import { duracionDesde } from '../utils/tiempo'

export function Cronometro({ desde, hasta }: { desde: string | null; hasta?: string | null }) {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (hasta) return
    const id = setInterval(() => setTick((t) => t + 1), 1000 * 15)
    return () => clearInterval(id)
  }, [hasta])

  if (!desde) return <span className="font-mono text-lg text-slate-400">--:--</span>

  const fin = hasta ? new Date(hasta) : new Date()
  return <span className="font-mono text-lg font-semibold text-slate-800">{duracionDesde(desde, fin)}</span>
}
