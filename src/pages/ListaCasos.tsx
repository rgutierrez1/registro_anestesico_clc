import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card } from '../components/ui'
import { db } from '../db'
import type { EstadoCaso } from '../types'

const estadoTono: Record<EstadoCaso, 'slate' | 'green' | 'amber'> = {
  planificado: 'slate',
  en_curso: 'amber',
  finalizado: 'green',
}

const estadoLabel: Record<EstadoCaso, string> = {
  planificado: 'Planificado',
  en_curso: 'En curso',
  finalizado: 'Finalizado',
}

export default function ListaCasos() {
  const navigate = useNavigate()
  const casos = useLiveQuery(() => db.casos.orderBy('createdAt').reverse().toArray(), [])

  async function eliminarCaso(id: string, nombre: string) {
    const ok = confirm(`¿Eliminar el registro de "${nombre || 'paciente sin nombre'}"? Esta acción no se puede deshacer.`)
    if (ok) await db.casos.delete(id)
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Registro Anestésico</h1>
          <p className="text-sm text-slate-500">Casos guardados en este dispositivo</p>
        </div>
        <Button onClick={() => navigate('/nuevo')} size="lg">
          + Nuevo caso
        </Button>
      </header>

      {casos === undefined && <p className="text-slate-500">Cargando…</p>}

      {casos && casos.length === 0 && (
        <Card className="p-8 text-center text-slate-500">
          Todavía no hay casos registrados. Tocá "Nuevo caso" para empezar.
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {casos?.map((caso) => (
          <Card
            key={caso.id}
            className="flex cursor-pointer items-center justify-between p-4 hover:border-sky-300"
            onClick={() => navigate(caso.estado === 'finalizado' ? `/caso/${caso.id}/resumen` : `/caso/${caso.id}`)}
          >
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">
                  {caso.paciente.nombre || 'Paciente sin nombre'}
                </h3>
                <Badge tone={estadoTono[caso.estado]}>{estadoLabel[caso.estado]}</Badge>
              </div>
              <p className="text-sm text-slate-500">
                {caso.cirugia.procedimiento || 'Procedimiento sin definir'} · {caso.cirugia.fecha}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                eliminarCaso(caso.id, caso.paciente.nombre)
              }}
              className="min-h-[44px] min-w-[44px] rounded-lg px-3 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              aria-label="Eliminar"
            >
              Eliminar
            </button>
          </Card>
        ))}
      </div>
    </div>
  )
}
