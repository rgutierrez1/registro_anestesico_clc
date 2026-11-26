import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FormularioVisita } from '../components/uda/FormularioVisita'
import { Badge, Button, Card, Field, Input, Pill, Section, Select } from '../components/ui'
import { VISITADORES_UDA } from '../constants'
import { Anular } from '../menus/componentes/Anular'
import type { FichaUDA, VisitaUDA } from '../types'
import { actualizarFicha, datosCateter, descripcionTecnica, diaPostop, nuevaFicha, nuevaVisita, tituloTecnica, usePacientesUDA } from '../utils/uda'
import { formatFechaHora, hhmmLocal } from '../utils/tiempo'

const SEDACION = ['Ninguna', 'Leve', 'Moderada', 'Severa']
const BROMAGE = ['Sin bloqueo', 'Parcial', 'Casi completo', 'Sin movimiento']

const etiquetaSiNo = (v: string) => (v === 'si' ? 'Sí' : v === 'no' ? 'No' : '')
const dosNum = (n: number) => String(n).padStart(2, '0')
const aFechaLocal = (d: Date) => `${d.getFullYear()}-${dosNum(d.getMonth() + 1)}-${dosNum(d.getDate())}`

// Todo lo cargado en una visita, para verlo completo sin volver a abrir el formulario.
function detalleVisita(v: VisitaUDA): { etiqueta: string; valor: string }[] {
  const f: { etiqueta: string; valor: string }[] = []
  const add = (etiqueta: string, valor: string | number | null) => valor !== null && valor !== '' && f.push({ etiqueta, valor: String(valor) })
  add('EVA reposo', v.evaReposo)
  add('EVA dinámico', v.evaDinamico)
  add('Programación', v.progPCA)
  add('Cambio de PCA', etiquetaSiNo(v.cambioPCA))
  add('Volumen a infundir', v.volInfundir)
  add('Bolos demandados', v.boloDemandado)
  add('Bolos administrados', v.boloAdministrado)
  add('N° de bolsa', v.nBolsa)
  add('Shift', v.shift)
  add('Terapia PCT', v.terapiaPCT)
  add('AINE infusión', v.aineInf)
  add('ICOX-2', v.icox2)
  add('AINE SOS', v.aineSOS)
  add('Tramal', v.tramal)
  add('Morfina', v.morfina)
  add('Hipnóticos / BZD / Psiquiátricos', v.hipBzdPsiq)
  add('Otro fármaco', v.otroFarmaco)
  add('Sedación', v.sedacion === null ? null : `${v.sedacion} · ${SEDACION[v.sedacion]}`)
  add('Náuseas / vómito', etiquetaSiNo(v.nauseasVomito))
  add('Prurito', etiquetaSiNo(v.prurito))
  add('Retención de orina', etiquetaSiNo(v.retOrina))
  add('Constipación', etiquetaSiNo(v.constipacion))
  add('Otro efecto colateral', v.efectoOtro)
  add('Estado del catéter', [v.estadoCateter, v.estadoCateterNota].filter(Boolean).join(' · '))
  add('Bloqueo motor (Bromage)', v.bloqueoMotor === null ? null : `${v.bloqueoMotor} · ${BROMAGE[v.bloqueoMotor]}`)
  add('Tromboprofilaxis', v.trombofilaxis)
  add('Plan', v.plan)
  return f
}

// Alertas clínicas de la visita: dolor alto, sedación, bloqueo motor, catéter con problemas.
function alertasVisita(v: VisitaUDA): string[] {
  const a: string[] = []
  if ((v.evaReposo ?? 0) >= 4 || (v.evaDinamico ?? 0) >= 6) a.push('Dolor mal controlado')
  if ((v.sedacion ?? 0) >= 2) a.push('Sedación moderada o mayor')
  if ((v.bloqueoMotor ?? 0) >= 2) a.push('Bloqueo motor importante')
  if (v.estadoCateter && v.estadoCateter !== 'Funcionando bien') a.push(v.estadoCateter)
  return a
}

export default function FichaSeguimientoUDA() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const pacientes = usePacientesUDA()
  const [visitaEnEdicion, setVisitaEnEdicion] = useState<VisitaUDA | null>(null)
  const [esNueva, setEsNueva] = useState(false)
  const [anulando, setAnulando] = useState<string | null>(null)
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({})
  const [editandoIngreso, setEditandoIngreso] = useState<FichaUDA | null>(null)
  const [retirando, setRetirando] = useState<{ quien: string; fecha: string; hora: string } | null>(null)

  if (pacientes === undefined) return <div className="p-6 text-slate-500">Cargando…</div>
  const p = pacientes.find((x) => x.id === id)
  if (!p) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <button className="min-h-[44px] text-slate-500" onClick={() => navigate('/uda')}>
          ← Volver a UDA
        </button>
        <p className="mt-4 text-slate-500">Este paciente ya no está en seguimiento: el catéter se anuló o se quitó del registro.</p>
      </div>
    )
  }

  const ficha = p.ficha
  const visitas = [...(ficha?.visitas ?? [])].sort((a, b) => b.hora.localeCompare(a.hora))
  const visitasVigentes = visitas.filter((v) => !v.anulada)
  const hoyPop = diaPostop(p.fechaCirugia, new Date().toISOString())
  const guardarFicha = (cambiar: (f: FichaUDA) => FichaUDA) => actualizarFicha(p, cambiar)
  const base = ficha ?? nuevaFicha(p)
  const ingreso = editandoIngreso ?? base
  const cateter = datosCateter(p)

  const guardarVisita = async () => {
    if (!visitaEnEdicion) return
    const v = visitaEnEdicion
    await guardarFicha((f) => ({ ...f, visitas: f.visitas.some((x) => x.id === v.id) ? f.visitas.map((x) => (x.id === v.id ? v : x)) : [...f.visitas, v] }))
    setVisitaEnEdicion(null)
  }

  const anular = (visitaId: string, motivo: string) => {
    const quien = visitas.find((v) => v.id === visitaId)?.visitador || 'sin definir'
    return guardarFicha((f) => ({ ...f, visitas: f.visitas.map((v) => (v.id === visitaId ? { ...v, anulada: { motivo, usuario: quien, hora: new Date().toISOString() } } : v)) }))
  }

  const confirmarRetiro = async () => {
    if (!retirando || !retirando.quien) return
    await guardarFicha((f) => ({ ...f, retiro: { hora: new Date(`${retirando.fecha}T${retirando.hora}`).toISOString(), usuario: retirando.quien } }))
    setRetirando(null)
  }

  const abrirRegistro = () => navigate(p.origen.tipo === 'caso' ? `/caso/${p.origen.id}` : `/bloqueo/${p.origen.id}`)

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-6 pb-16">
      <header className="mb-4 flex items-start gap-3">
        <button onClick={() => navigate('/uda')} className="min-h-[44px] px-2 text-slate-500" aria-label="Volver">
          ← UDA
        </button>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{p.nombre || 'Paciente sin nombre'}</h1>
            {p.retirado ? <Badge tone="slate">Seguimiento terminado</Badge> : <Badge tone="green">En seguimiento</Badge>}
          </div>
          <p className="text-sm text-slate-500">
            {tituloTecnica(p.tipo)}
            {p.procedimiento && ` · ${p.procedimiento}`} · cirugía {p.fechaCirugia}
            {hoyPop !== null && !p.retirado && ` · hoy POP ${hoyPop}`}
          </p>
        </div>
      </header>

      {!p.retirado && hoyPop !== null && hoyPop >= 4 && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Desde el 4.º día postoperatorio: evaluar con el Equipo de Dolor Crónico.
        </div>
      )}

      <div className="flex flex-col gap-4">
        <Section
          title="Datos del paciente y del catéter"
          actions={
            <Button size="sm" variant="ghost" onClick={abrirRegistro}>
              Abrir el registro
            </Button>
          }
        >
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {[
              ['Historia clínica', p.historiaClinica],
              ['Edad', p.edad === '' ? '' : `${p.edad} años`],
              ['Peso / talla', [p.peso !== '' ? `${p.peso} kg` : '', p.altura !== '' ? `${p.altura} cm` : ''].filter(Boolean).join(' / ')],
              ['Alergias', p.alergias],
              ['Diagnóstico', p.diagnostico],
              ['Cirugía', p.procedimiento],
              ['Cirujano', p.cirujano],
              ['Anestesiólogo', p.anestesiologo],
              ['Tipo de anestesia', p.tiposAnestesia.join(', ')],
              ['Técnica', descripcionTecnica(p)],
              ...cateter.map((d) => [d.etiqueta, d.valor]),
            ]
              .filter(([, valor]) => valor)
              .map(([etiqueta, valor]) => (
                <div key={etiqueta} className="flex gap-2 border-b border-slate-100 py-1">
                  <dt className="w-44 shrink-0 text-slate-500">{etiqueta}</dt>
                  <dd className="font-medium text-slate-900">{valor}</dd>
                </div>
              ))}
          </dl>
        </Section>

        <Section
          title="Ingreso a UDA"
          actions={
            editandoIngreso ? null : (
              <Button size="sm" variant="secondary" onClick={() => setEditandoIngreso(base)}>
                Editar
              </Button>
            )
          }
        >
          {editandoIngreso ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="ASA">
                  <Select value={editandoIngreso.asa} onChange={(e) => setEditandoIngreso({ ...editandoIngreso, asa: e.target.value })}>
                    <option value="">Sin definir</option>
                    {['I', 'II', 'III', 'IV', 'V', 'VI'].map((a) => (
                      <option key={a} value={a}>
                        ASA {a}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Función renal">
                  <Input value={editandoIngreso.funcionRenal} onChange={(e) => setEditandoIngreso({ ...editandoIngreso, funcionRenal: e.target.value })} />
                </Field>
                <Field label="Contraindicación de AINEs">
                  <Input value={editandoIngreso.contraindAines} onChange={(e) => setEditandoIngreso({ ...editandoIngreso, contraindAines: e.target.value })} />
                </Field>
                <Field label="Patologías">
                  <Input value={editandoIngreso.patologias} onChange={(e) => setEditandoIngreso({ ...editandoIngreso, patologias: e.target.value })} />
                </Field>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-slate-600">Infusor</p>
                <div className="flex gap-2">
                  {(
                    [
                      ['bolsa', 'Bolsa'],
                      ['elastomerica', 'Elastomérica'],
                    ] as const
                  ).map(([cod, texto]) => (
                    <Pill key={cod} active={editandoIngreso.infusor === cod} onClick={() => setEditandoIngreso({ ...editandoIngreso, infusor: editandoIngreso.infusor === cod ? '' : cod })}>
                      {texto}
                    </Pill>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditandoIngreso(null)}>
                  Cancelar
                </Button>
                <Button
                  onClick={async () => {
                    const e = editandoIngreso
                    await guardarFicha((f) => ({ ...f, asa: e.asa, funcionRenal: e.funcionRenal, contraindAines: e.contraindAines, patologias: e.patologias, infusor: e.infusor }))
                    setEditandoIngreso(null)
                  }}
                >
                  Guardar
                </Button>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {[
                ['ASA', ingreso.asa],
                ['Función renal', ingreso.funcionRenal],
                ['Contraindicación de AINEs', ingreso.contraindAines],
                ['Patologías', ingreso.patologias],
                ['Infusor', ingreso.infusor === 'bolsa' ? 'Bolsa' : ingreso.infusor === 'elastomerica' ? 'Elastomérica' : ''],
              ].map(([etiqueta, valor]) => (
                <div key={etiqueta} className="flex gap-2 border-b border-slate-100 py-1">
                  <dt className="w-44 shrink-0 text-slate-500">{etiqueta}</dt>
                  <dd className="font-medium text-slate-900">{valor || <span className="font-normal text-slate-400">Sin completar</span>}</dd>
                </div>
              ))}
            </dl>
          )}
        </Section>

        <Section
          title={`Visitas (${visitasVigentes.length})`}
          actions={
            !p.retirado && !visitaEnEdicion ? (
              <Button
                size="sm"
                onClick={() => {
                  setEsNueva(true)
                  setVisitaEnEdicion(nuevaVisita(p))
                }}
              >
                + Nueva visita
              </Button>
            ) : null
          }
        >
          {visitaEnEdicion && (
            <Card className="mb-4 border-sky-200 p-4">
              <h3 className="mb-3 font-semibold text-slate-800">{esNueva ? 'Nueva visita' : 'Editar visita'}</h3>
              <FormularioVisita visita={visitaEnEdicion} onCambiar={setVisitaEnEdicion} diaPostop={diaPostop(p.fechaCirugia, visitaEnEdicion.hora)} />
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setVisitaEnEdicion(null)}>
                  Cancelar
                </Button>
                <Button disabled={visitaEnEdicion.visitador === ''} onClick={guardarVisita}>
                  Guardar visita
                </Button>
              </div>
              {visitaEnEdicion.visitador === '' && <p className="mt-1 text-right text-xs text-slate-500">Elige quién realiza la visita para guardar.</p>}
            </Card>
          )}

          {visitas.length === 0 && !visitaEnEdicion && <p className="text-sm text-slate-500">Todavía no hay visitas. Registra la primera con "+ Nueva visita".</p>}

          <ul className="flex flex-col gap-2">
            {visitas.map((v) => {
              const pop = diaPostop(p.fechaCirugia, v.hora)
              const alertas = v.anulada ? [] : alertasVisita(v)
              const abierta = abiertas[v.id]
              return (
                <li key={v.id} className={`rounded-xl border px-3 py-2 ${v.anulada ? 'border-slate-200 bg-slate-100' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className={`font-semibold ${v.anulada ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                        {formatFechaHora(v.hora)} · {pop === null ? '' : `POP ${pop} · `}
                        {v.visitador || 'Sin visitador'}
                      </p>
                      {!v.anulada && (
                        <p className="text-sm text-slate-600">
                          EVA reposo {v.evaReposo ?? '—'} · dinámico {v.evaDinamico ?? '—'}
                          {v.sedacion !== null && ` · sedación ${v.sedacion}`}
                          {v.bloqueoMotor !== null && ` · Bromage ${v.bloqueoMotor}`}
                          {v.estadoCateter && ` · ${v.estadoCateter}`}
                        </p>
                      )}
                      {v.anulada && (
                        <p className="text-xs text-slate-500">
                          Anulada por {v.anulada.usuario} el {formatFechaHora(v.anulada.hora)}: {v.anulada.motivo}
                        </p>
                      )}
                      {alertas.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {alertas.map((a) => (
                            <Badge key={a} tone="red">
                              {a}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {!v.anulada && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setAbiertas({ ...abiertas, [v.id]: !abierta })}>
                          {abierta ? 'Ocultar' : 'Ver todo'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEsNueva(false)
                            setVisitaEnEdicion(v)
                          }}
                        >
                          Editar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setAnulando(v.id)}>
                          Anular
                        </Button>
                      </div>
                    )}
                  </div>
                  {abierta && !v.anulada && (
                    <dl className="mt-2 grid grid-cols-1 gap-x-6 text-sm sm:grid-cols-2">
                      {detalleVisita(v).map((d) => (
                        <div key={d.etiqueta} className="flex gap-2 border-b border-slate-200 py-1">
                          <dt className="w-44 shrink-0 text-slate-500">{d.etiqueta}</dt>
                          <dd className="font-medium text-slate-900">{d.valor}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {anulando === v.id && (
                    <Anular
                      onCancelar={() => setAnulando(null)}
                      onConfirmar={async (motivo) => {
                        await anular(v.id, motivo)
                        setAnulando(null)
                      }}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </Section>

        <Section title="Retiro del catéter">
          {p.retirado && ficha?.retiro ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-700">
                Catéter retirado el {formatFechaHora(ficha.retiro.hora)} por {ficha.retiro.usuario}. El seguimiento terminó.
              </p>
              <Button size="sm" variant="ghost" onClick={() => guardarFicha(({ retiro: _r, ...f }) => f)}>
                Deshacer el retiro
              </Button>
            </div>
          ) : retirando ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-600">Al retirar el catéter el paciente sale de la lista de seguimiento y su ficha queda guardada.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Fecha">
                  <Input type="date" value={retirando.fecha} onChange={(e) => setRetirando({ ...retirando, fecha: e.target.value })} />
                </Field>
                <Field label="Hora">
                  <Input type="time" value={retirando.hora} onChange={(e) => setRetirando({ ...retirando, hora: e.target.value })} />
                </Field>
                <Field label="Quién lo retira">
                  <Select value={retirando.quien} onChange={(e) => setRetirando({ ...retirando, quien: e.target.value })}>
                    <option value="">Seleccionar…</option>
                    {VISITADORES_UDA.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setRetirando(null)}>
                  Cancelar
                </Button>
                <Button variant="danger" disabled={!retirando.quien || !retirando.fecha || !retirando.hora} onClick={confirmarRetiro}>
                  Confirmar retiro
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              onClick={() => {
                const ahora = new Date()
                setRetirando({ quien: visitasVigentes[0]?.visitador ?? '', fecha: aFechaLocal(ahora), hora: hhmmLocal(ahora.toISOString()) })
              }}
            >
              Retirar catéter
            </Button>
          )}
        </Section>
      </div>
    </div>
  )
}
