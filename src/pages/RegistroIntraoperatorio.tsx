import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Cronometro } from '../components/Cronometro'
import { EventosSection } from '../components/EventosSection'
import { RegistroFarmacosSection } from '../components/RegistroFarmacosSection'
import { RegistroFluidosSection } from '../components/RegistroFluidosSection'
import { RegistroVitalesSection } from '../components/RegistroVitalesSection'
import { TecnicasRegionalesSection } from '../components/TecnicasRegionalesSection'
import { Badge, Button, Field, Select, TextArea } from '../components/ui'
import { DESTINOS_PACIENTE } from '../constants'
import { db } from '../db'
import type {
  Evento,
  RegistroFarmaco,
  RegistroFluido,
  RegistroVital,
  TecnicaRegional,
} from '../types'

export default function RegistroIntraoperatorio() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const caso = useLiveQuery(() => (id ? db.casos.get(id) : undefined), [id])
  const [finalizando, setFinalizando] = useState(false)
  const [destino, setDestino] = useState(DESTINOS_PACIENTE[0])
  const [notas, setNotas] = useState('')

  if (caso === undefined) return <div className="p-6 text-slate-500">Cargando…</div>
  if (caso === null || !id) return <div className="p-6 text-slate-500">Caso no encontrado.</div>

  async function patch(fn: (c: NonNullable<typeof caso>) => Partial<NonNullable<typeof caso>>) {
    if (!id || !caso) return
    await db.casos.update(id, { ...fn(caso), updatedAt: new Date().toISOString() })
  }

  async function iniciarAnestesia() {
    await patch(() => ({ estado: 'en_curso', horaInicioAnestesia: new Date().toISOString() }))
  }

  function agregarVital(v: RegistroVital) {
    patch((c) => ({ signosVitales: [...c.signosVitales, v] }))
  }
  function eliminarVital(vid: string) {
    patch((c) => ({ signosVitales: c.signosVitales.filter((v) => v.id !== vid) }))
  }

  function agregarFarmaco(f: RegistroFarmaco) {
    patch((c) => ({ farmacos: [...c.farmacos, f] }))
  }
  function eliminarFarmaco(fid: string) {
    patch((c) => ({ farmacos: c.farmacos.filter((f) => f.id !== fid) }))
  }

  function agregarFluido(f: RegistroFluido) {
    patch((c) => ({ fluidos: [...c.fluidos, f] }))
  }
  function eliminarFluido(fid: string) {
    patch((c) => ({ fluidos: c.fluidos.filter((f) => f.id !== fid) }))
  }

  function agregarEvento(e: Evento) {
    patch((c) => ({ eventos: [...c.eventos, e] }))
  }
  function eliminarEvento(eid: string) {
    patch((c) => ({ eventos: c.eventos.filter((e) => e.id !== eid) }))
  }

  function agregarTecnica(t: TecnicaRegional) {
    patch((c) => ({ tecnicasRegionales: [...c.tecnicasRegionales, t] }))
  }
  function eliminarTecnica(tid: string) {
    patch((c) => ({ tecnicasRegionales: c.tecnicasRegionales.filter((t) => t.id !== tid) }))
  }

  async function confirmarFinalizacion() {
    await patch(() => ({
      estado: 'finalizado',
      horaFinAnestesia: new Date().toISOString(),
      destinoPaciente: destino,
      notasFinales: notas,
    }))
    navigate(`/caso/${id}/resumen`)
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-6 pb-10">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="min-h-[44px] px-2 text-slate-500" aria-label="Volver">
            ← Volver
          </button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              {caso.paciente.nombre || 'Paciente sin nombre'}
              <Badge tone={caso.estado === 'en_curso' ? 'amber' : 'slate'}>
                {caso.estado === 'planificado' ? 'Planificado' : 'En curso'}
              </Badge>
            </h1>
            <p className="text-sm text-slate-500">{caso.cirugia.procedimiento}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Tiempo anestésico</p>
            <Cronometro desde={caso.horaInicioAnestesia} />
          </div>
          {caso.horaInicioAnestesia === null ? (
            <Button onClick={iniciarAnestesia} size="lg">
              Iniciar anestesia
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setFinalizando(true)} size="lg">
              Finalizar caso
            </Button>
          )}
        </div>
      </header>

      {finalizando && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <h3 className="mb-3 font-semibold text-rose-900">Finalizar y cerrar el registro</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Destino del paciente">
              <Select value={destino} onChange={(e) => setDestino(e.target.value)}>
                {DESTINOS_PACIENTE.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Notas finales" className="sm:col-span-2">
              <TextArea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
            </Field>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFinalizando(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmarFinalizacion}>
              Confirmar y cerrar caso
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <RegistroVitalesSection
          registros={caso.signosVitales}
          inicio={caso.horaInicioAnestesia}
          onAgregar={agregarVital}
          onEliminar={eliminarVital}
        />
        <RegistroFarmacosSection registros={caso.farmacos} onAgregar={agregarFarmaco} onEliminar={eliminarFarmaco} />
        <TecnicasRegionalesSection
          tecnicas={caso.tecnicasRegionales}
          onAgregar={agregarTecnica}
          onEliminar={eliminarTecnica}
        />
        <RegistroFluidosSection registros={caso.fluidos} onAgregar={agregarFluido} onEliminar={eliminarFluido} />
        <EventosSection eventos={caso.eventos} onAgregar={agregarEvento} onEliminar={eliminarEvento} />
      </div>
    </div>
  )
}
