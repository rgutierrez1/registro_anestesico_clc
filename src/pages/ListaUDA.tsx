import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card } from '../components/ui'
import { descripcionTecnica, diaPostop, tituloTecnica, usePacientesUDA, type PacienteUDA } from '../utils/uda'
import { formatFechaHora } from '../utils/tiempo'

function TarjetaPaciente({ p, onAbrir }: { p: PacienteUDA; onAbrir: () => void }) {
  const hoy = new Date()
  const visitas = (p.ficha?.visitas ?? []).filter((v) => !v.anulada).sort((a, b) => b.hora.localeCompare(a.hora))
  const ultima = visitas[0]
  const pop = diaPostop(p.fechaCirugia, hoy.toISOString())
  const visitadoHoy = !!ultima && new Date(ultima.hora).toDateString() === hoy.toDateString()
  return (
    <Card className="cursor-pointer p-4 hover:border-sky-300" onClick={onAbrir}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-slate-900">{p.nombre || 'Paciente sin nombre'}</h3>
        {p.retirado ? (
          <Badge tone="slate">Retirado {p.ficha?.retiro ? formatFechaHora(p.ficha.retiro.hora) : ''}</Badge>
        ) : (
          <>
            {pop !== null && <Badge tone="sky">POP {pop}</Badge>}
            {visitadoHoy ? <Badge tone="green">Visitado hoy</Badge> : <Badge tone="amber">Sin visita hoy</Badge>}
            {pop !== null && pop >= 4 && <Badge tone="red">Evaluar con Dolor Crónico</Badge>}
          </>
        )}
      </div>
      <p className="text-sm text-slate-600">
        {tituloTecnica(p.tipo)} · {descripcionTecnica(p)}
      </p>
      <p className="text-sm text-slate-500">
        {p.procedimiento || 'Cirugía sin definir'} · {p.fechaCirugia}
        {p.historiaClinica && ` · HC ${p.historiaClinica}`}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {ultima
          ? `Última visita ${formatFechaHora(ultima.hora)} (${ultima.visitador || 'sin visitador'}) · EVA reposo ${ultima.evaReposo ?? '—'} / dinámico ${ultima.evaDinamico ?? '—'} · ${visitas.length} visita(s)`
          : 'Todavía sin visitas'}
      </p>
    </Card>
  )
}

export default function ListaUDA() {
  const navigate = useNavigate()
  const pacientes = usePacientesUDA()
  const [verRetirados, setVerRetirados] = useState(false)
  const activos = (pacientes ?? []).filter((p) => !p.retirado)
  const retirados = (pacientes ?? []).filter((p) => p.retirado)

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-6">
      <header className="mb-6 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="min-h-[44px] px-2 text-slate-500" aria-label="Volver">
          ← Volver
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">UDA · Unidad de Dolor Agudo</h1>
          <p className="text-sm text-slate-500">Pacientes con catéter (bloqueo periférico o epidural) en seguimiento</p>
        </div>
      </header>

      {pacientes === undefined && <p className="text-slate-500">Cargando…</p>}

      {pacientes && activos.length === 0 && (
        <Card className="p-8 text-center text-slate-500">
          No hay pacientes en seguimiento. Entran solos a esta lista cuando un registro marca un bloqueo con catéter o una epidural con catéter.
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {activos.map((p) => (
          <TarjetaPaciente key={p.id} p={p} onAbrir={() => navigate(`/uda/${p.id}`)} />
        ))}
      </div>

      {retirados.length > 0 && (
        <section className="mt-8">
          <Button variant="ghost" onClick={() => setVerRetirados(!verRetirados)}>
            {verRetirados ? 'Ocultar' : 'Ver'} seguimientos terminados ({retirados.length})
          </Button>
          {verRetirados && (
            <div className="mt-3 flex flex-col gap-3">
              {retirados.map((p) => (
                <TarjetaPaciente key={p.id} p={p} onAbrir={() => navigate(`/uda/${p.id}`)} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
