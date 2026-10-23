import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AccesosVascularesSection } from '../components/AccesosVascularesSection'
import { ChecklistSection } from '../components/ChecklistSection'
import { Cronometro } from '../components/Cronometro'
import { EditarDatosCaso } from '../components/EditarDatosCaso'
import { TipoAnestesiaSection } from '../components/TipoAnestesiaSection'
import { EventosSection } from '../components/EventosSection'
import { LaboratorioSection } from '../components/LaboratorioSection'
import { FarmacosSection } from '../components/FarmacosSection'
import { HitosSection } from '../components/HitosSection'
import { RegistroFluidosSection } from '../components/RegistroFluidosSection'
import { RegistroVitalesSection } from '../components/RegistroVitalesSection'
import { ModalSignosIniciales } from '../components/vitales/FormularioVitales'
import { TecnicasRegionalesSection } from '../components/TecnicasRegionalesSection'
import { ViaAereaSection } from '../components/ViaAereaSection'
import { pendientesAccesos } from '../menus/accesos'
import { pendientesVia } from '../menus/viaAerea'
import { Badge, Button, Field, Input, Select, TextArea } from '../components/ui'
import { CHECKLIST_SEGURIDAD, DESTINOS_PACIENTE } from '../constants'
import { db } from '../db'
import { anestesiologoActual, textoAlergias } from '../utils/caso'
import { cambiarHito, errorHito, type ClaveHito } from '../utils/hitos'
import { formatHora, hhmmLocal, horaPersonalizadaIso } from '../utils/tiempo'
import { cargarPrimerRegistro, prepararPrimerRegistro } from '../utils/vitales'
import type {
  CasoAnestesico,
  Evento,
  RegistroFluido,
  TecnicaRegional,
} from '../types'

export default function RegistroIntraoperatorio() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const caso = useLiveQuery(() => (id ? db.casos.get(id) : undefined), [id])
  const [finalizando, setFinalizando] = useState(false)
  const [editandoDatos, setEditandoDatos] = useState(false)
  const [destino, setDestino] = useState(DESTINOS_PACIENTE[0])
  const [notas, setNotas] = useState('')
  const [finHora, setFinHora] = useState('')
  const [errorFin, setErrorFin] = useState('')
  const [promptVitales, setPromptVitales] = useState(false)

  if (caso === undefined) return <div className="p-6 text-slate-500">Cargando…</div>
  if (caso === null || !id) return <div className="p-6 text-slate-500">Caso no encontrado.</div>

  function patch(fn: (c: CasoAnestesico) => Partial<CasoAnestesico>) {
    if (!id) return Promise.resolve()
    return db.transaction('rw', db.casos, async () => {
      const actual = await db.casos.get(id)
      if (!actual) return
      await db.casos.update(id, { ...fn(actual), updatedAt: new Date().toISOString() })
    })
  }

  async function registrarHito(clave: ClaveHito, iso: string | null) {
    await patch((c) => cambiarHito(c, clave, iso))
    if (clave === 'inicioAnestesia' && iso && caso && caso.signosVitales.length === 0) setPromptVitales(true)
  }

  async function iniciarAnestesia() {
    await registrarHito('inicioAnestesia', new Date().toISOString())
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

  function abrirFinalizar() {
    setFinHora(hhmmLocal(new Date().toISOString()))
    setErrorFin('')
    setFinalizando(true)
  }

  async function confirmarFinalizacion() {
    let fin = caso?.horaFinAnestesia ?? null
    if (!fin && caso) {
      const iso = horaPersonalizadaIso(finHora)
      const problema = errorHito(caso, 'finAnestesia', iso)
      if (problema) return setErrorFin(problema)
      fin = iso
    }
    await patch((c) => ({
      estado: 'finalizado',
      horaFinAnestesia: c.horaFinAnestesia ?? fin,
      destinoPaciente: destino,
      notasFinales: notas,
    }))
    navigate(`/caso/${id}/resumen`)
  }

  // También se muestra si ya hay datos cargados (por ejemplo, tras una conversión a otro tipo).
  const requiereViaAerea =
    caso.tiposAnestesia.includes('General') ||
    caso.viaAereaMenu.eventos.length > 0 ||
    Object.keys(caso.viaAereaMenu.valores).some((k) => !k.startsWith('ext.')) ||
    caso.viaAereaMenu.vadDeclarada !== null

  // La hoja no se cierra con campos obligatorios vacíos ni con bloqueos de las pestañas de clic.
  const pendientesCierre = [...pendientesAccesos(caso), ...(requiereViaAerea ? pendientesVia(caso) : [])]


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
            <p className="text-sm text-slate-500">
              {caso.cirugia.diagnostico && `${caso.cirugia.diagnostico} · `}
              {caso.cirugia.procedimiento}
            </p>
            <p className="text-xs text-slate-500">
              {caso.cirugia.cirujano && `Cirujano/a: ${caso.cirugia.cirujano} · `}
              {anestesiologoActual(caso) && `Anestesiólogo/a: ${anestesiologoActual(caso)}`}
            </p>
            {(textoAlergias(caso.paciente) || caso.paciente.grupoSanguineo) && (
              <p className="mt-1 flex flex-wrap gap-2">
                {caso.paciente.grupoSanguineo && <Badge tone="sky">Grupo: {caso.paciente.grupoSanguineo}</Badge>}
                {textoAlergias(caso.paciente) && <Badge tone="red">Alergias: {textoAlergias(caso.paciente)}</Badge>}
              </p>
            )}
            <button
              type="button"
              onClick={() => setEditandoDatos((v) => !v)}
              className="mt-1 min-h-[32px] text-xs font-medium text-sky-600"
            >
              {editandoDatos ? 'Cerrar edición' : 'Editar datos del caso'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-wide" style={{ color: '#4f46e5' }}>
              Tiempo anestésico
            </p>
            <Cronometro desde={caso.horaInicioAnestesia} hasta={caso.horaFinAnestesia} />
          </div>
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-wide" style={{ color: '#a21caf' }}>
              Tiempo quirúrgico
            </p>
            <Cronometro
              desde={caso.horaInicioCirugia}
              hasta={caso.horaFinCirugia ?? caso.horaFinAnestesia}
            />
          </div>
          {caso.horaInicioAnestesia === null ? (
            <Button onClick={iniciarAnestesia} size="lg">
              Iniciar anestesia
            </Button>
          ) : (
            <Button variant="danger" onClick={abrirFinalizar} size="lg">
              Finalizar caso
            </Button>
          )}
        </div>
      </header>

      {editandoDatos && (
        <EditarDatosCaso
          paciente={caso.paciente}
          cirugia={caso.cirugia}
          onCancelar={() => setEditandoDatos(false)}
          onGuardar={(paciente, cirugia) => {
            patch(() => ({ paciente, cirugia }))
            setEditandoDatos(false)
          }}
        />
      )}

      {finalizando && pendientesCierre.length > 0 && (
        <div className="mb-4 rounded-xl border border-rose-300 bg-rose-100 p-4" role="alert">
          <h3 className="mb-2 font-semibold text-rose-900">No se puede cerrar la hoja: faltan datos obligatorios</h3>
          <ul className="mb-3 list-disc pl-5 text-sm text-rose-900">
            {pendientesCierre.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <Button variant="secondary" onClick={() => setFinalizando(false)}>
            Volver al registro
          </Button>
        </div>
      )}

      {finalizando && pendientesCierre.length === 0 && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <h3 className="mb-3 font-semibold text-rose-900">Finalizar y cerrar el registro</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {caso.horaFinAnestesia ? (
              <p className="text-sm text-rose-900 sm:col-span-2">
                Fin de anestesia registrado: <strong>{formatHora(caso.horaFinAnestesia)}</strong>. Cerrar el caso no
                modifica esa hora.
              </p>
            ) : (
              <div className="sm:col-span-2">
                <Field label="Hora de fin de anestesia (todavía no la registraste)">
                  <Input
                    type="time"
                    value={finHora}
                    onChange={(e) => {
                      setFinHora(e.target.value)
                      setErrorFin('')
                    }}
                  />
                </Field>
                {errorFin && <p className="mt-1 text-sm text-rose-700">{errorFin}</p>}
              </div>
            )}
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
        <TipoAnestesiaSection
          tipos={caso.tiposAnestesia}
          onCambiar={(nuevos, motivo, hora) =>
            patch((c) => {
              const evento =
                c.tiposAnestesia.length > 0
                  ? [
                      {
                        id: crypto.randomUUID(),
                        hora: hora ?? new Date().toISOString(),
                        descripcion: `Conversión del tipo de anestesia: ${c.tiposAnestesia.join(' + ')} → ${nuevos.join(' + ')}${motivo ? `. Motivo: ${motivo}` : ''}`,
                      },
                    ]
                  : []
              return { tiposAnestesia: nuevos, eventos: [...c.eventos, ...evento] }
            })
          }
        />
        <ChecklistSection
          marcados={caso.checklist}
          onAlternar={(id) =>
            patch((c) => ({
              checklist: c.checklist.includes(id) ? c.checklist.filter((x) => x !== id) : [...c.checklist, id],
            }))
          }
          onMarcarTodas={(marcar) => patch(() => ({ checklist: marcar ? CHECKLIST_SEGURIDAD.map((i) => i.id) : [] }))}
        />
        <HitosSection caso={caso} onCambiar={registrarHito} />
        {requiereViaAerea && <ViaAereaSection caso={caso} patch={patch} />}
        <AccesosVascularesSection caso={caso} patch={patch} />
        <RegistroVitalesSection caso={caso} onActualizar={patch} />
        <FarmacosSection caso={caso} onActualizar={patch} />
        <TecnicasRegionalesSection
          tecnicas={caso.tecnicasRegionales}
          onAgregar={agregarTecnica}
          onEliminar={eliminarTecnica}
          onEditar={(t) => patch((c) => ({ tecnicasRegionales: c.tecnicasRegionales.map((x) => (x.id === t.id ? t : x)) }))}
        />
        <RegistroFluidosSection
          registros={caso.fluidos}
          onAgregar={agregarFluido}
          onEliminar={eliminarFluido}
          onEditar={(f) => patch((c) => ({ fluidos: c.fluidos.map((x) => (x.id === f.id ? f : x)) }))}
        />
        <LaboratorioSection
          examenes={caso.laboratorio}
          onAgregar={(e) => patch((c) => ({ laboratorio: [...c.laboratorio, e] }))}
          onEditar={(e) => patch((c) => ({ laboratorio: c.laboratorio.map((x) => (x.id === e.id ? e : x)) }))}
          onEliminar={(id) => patch((c) => ({ laboratorio: c.laboratorio.filter((x) => x.id !== id) }))}
        />
        <EventosSection
          eventos={caso.eventos}
          onAgregar={agregarEvento}
          onEliminar={eliminarEvento}
          onEditar={(nuevo) => patch((c) => ({ eventos: c.eventos.map((e) => (e.id === nuevo.id ? nuevo : e)) }))}
        />
      </div>
      {promptVitales && caso.signosVitales.length === 0 && (
        <ModalSignosIniciales
          paciente={caso.paciente}
          pedirFin={!caso.horaFinAnestesia}
          onCerrar={() => setPromptVitales(false)}
          onGuardar={(valores, horas) => {
            const preparado = prepararPrimerRegistro(caso, horas)
            if (preparado.error) return preparado.error
            patch((c) => cargarPrimerRegistro(c, valores, preparado))
            setPromptVitales(false)
          }}
        />
      )}
    </div>
  )
}
