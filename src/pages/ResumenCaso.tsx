import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { LineaTiempoFarmacos } from '../components/farmacos/LineaTiempoFarmacos'
import { VitalesChart } from '../components/VitalesChart'
import { Button, Card } from '../components/ui'
import { CHECKLIST_SEGURIDAD, TUBO_DOBLE_LUMEN } from '../constants'
import { chequeoVVC, tituloAcceso, ubicacionAcceso } from '../utils/accesos'
import { duracionesFlags, etiquetaFlag } from '../utils/flags'
import { db } from '../db'
import type { CasoAnestesico } from '../types'
import { formatDosis } from '../utils/dosis'
import { ETIQUETA_EVENTO } from '../utils/farmacos'
import { anestesiologoActual, textoAlergias } from '../utils/caso'
import { hitosDelCaso } from '../utils/hitos'
import { resumenVentilacion } from '../utils/ventilacion'
import { serieVitales } from '../utils/vitales'
import { formatFechaHora, formatHora, duracionDesde } from '../utils/tiempo'

export default function ResumenCaso() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const caso = useLiveQuery(() => (id ? db.casos.get(id) : undefined), [id])

  if (caso === undefined) return <div className="p-6 text-slate-500">Cargando…</div>
  if (caso === null) return <div className="p-6 text-slate-500">Caso no encontrado.</div>

  const { paciente, cirugia } = caso

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-6 pb-16">
      <div className="mb-4 flex items-center justify-between no-print">
        <button onClick={() => navigate('/')} className="min-h-[44px] px-2 text-slate-500">
          ← Volver a la lista
        </button>
        <div className="flex gap-2">
          {caso.estado !== 'finalizado' && (
            <Button variant="secondary" onClick={() => navigate(`/caso/${id}`)}>
              Volver al registro en vivo
            </Button>
          )}
          {caso.estado === 'finalizado' && (
            <Button
              variant="secondary"
              onClick={async () => {
                await db.casos.update(caso.id, { estado: 'en_curso', updatedAt: new Date().toISOString() })
                navigate(`/caso/${caso.id}`)
              }}
            >
              Reabrir para editar
            </Button>
          )}
          <Button onClick={() => window.print()}>Imprimir / Exportar PDF</Button>
        </div>
      </div>

      <Card className="p-6 print:shadow-none print:border-0">
        <h1 className="text-2xl font-bold text-slate-900">Registro Anestésico</h1>
        <p className="mb-4 text-sm text-slate-500">
          {cirugia.fecha} · Generado {formatFechaHora(new Date().toISOString())}
        </p>

        <SeccionResumen titulo="Paciente">
          <Grid>
            <Dato label="Nombre" valor={paciente.nombre} />
            <Dato label="Historia clínica" valor={paciente.historiaClinica} />
            <Dato label="Edad" valor={paciente.edad ? `${paciente.edad} años` : ''} />
            <Dato label="Sexo" valor={paciente.sexo} />
            <Dato label="Peso" valor={paciente.peso ? `${paciente.peso} kg` : ''} />
            <Dato label="Altura" valor={paciente.altura ? `${paciente.altura} cm` : ''} />
            <Dato label="ASA" valor={paciente.asa} />
            <Dato label="Ayuno" valor={paciente.ayuno} />
            <Dato label="Vía aérea" valor={paciente.viaAerea} />
          </Grid>
          <Dato label="Alergias conocidas" valor={textoAlergias(paciente)} full />
          {paciente.antecedentes && <Dato label="Antecedentes" valor={paciente.antecedentes} full />}
        </SeccionResumen>

        <SeccionResumen titulo="Cirugía y anestesia">
          <Grid>
            <Dato label="Diagnóstico quirúrgico" valor={cirugia.diagnostico} />
            <Dato label="Procedimiento" valor={cirugia.procedimiento} />
            <Dato label="Cirujano/a" valor={cirugia.cirujano} />
            <Dato label="Anestesiólogo/a" valor={cirugia.anestesiologo} />
            {anestesiologoActual(caso) !== cirugia.anestesiologo && (
              <Dato label="Anestesiólogo/a al cierre" valor={anestesiologoActual(caso)} />
            )}
            <Dato label="Tipo de anestesia" valor={caso.tiposAnestesia.join(', ')} />
            <Dato
              label="Inicio anestésico"
              valor={caso.horaInicioAnestesia ? formatFechaHora(caso.horaInicioAnestesia) : '—'}
            />
            <Dato
              label="Inicio de cirugía"
              valor={caso.horaInicioCirugia ? formatFechaHora(caso.horaInicioCirugia) : '—'}
            />
            <Dato label="Fin de cirugía" valor={caso.horaFinCirugia ? formatFechaHora(caso.horaFinCirugia) : '—'} />
            <Dato label="Fin anestésico" valor={caso.horaFinAnestesia ? formatFechaHora(caso.horaFinAnestesia) : '—'} />
            <Dato
              label="Duración"
              valor={
                caso.horaInicioAnestesia
                  ? duracionDesde(caso.horaInicioAnestesia, caso.horaFinAnestesia ? new Date(caso.horaFinAnestesia) : undefined)
                  : '—'
              }
            />
            <Dato
              label="Duración de cirugía"
              valor={caso.horaInicioCirugia && caso.horaFinCirugia ? duracionDesde(caso.horaInicioCirugia, new Date(caso.horaFinCirugia)) : ''}
            />
            <Dato label="Destino del paciente" valor={caso.destinoPaciente} />
          </Grid>
          <Dato label="Monitorización" valor={caso.monitorizacion.join(', ')} full />
        </SeccionResumen>

        <SeccionResumen titulo="Checklist de seguridad">
          <ul className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm text-slate-700 sm:grid-cols-2">
            {CHECKLIST_SEGURIDAD.map((item) => (
              <li key={item.id}>
                {caso.checklist.includes(item.id) ? '☑' : '☐'} {item.etiqueta}
              </li>
            ))}
          </ul>
        </SeccionResumen>

        {(caso.manejoViaAerea.tipo || caso.manejoViaAerea.dispositivosAdicionales.length > 0) && (
          <SeccionResumen titulo="Vía aérea">
            <Grid>
              <Dato label="Manejo avanzado" valor={caso.manejoViaAerea.tipo} />
              <Dato label="Tamaño del tubo" valor={caso.manejoViaAerea.tamanoTubo} />
              <Dato label="Cormack" valor={caso.manejoViaAerea.cormack} />
              <Dato label="Tamaño de la máscara" valor={caso.manejoViaAerea.tamanoMascara} />
              <Dato
                label="Dispositivos adicionales"
                valor={caso.manejoViaAerea.dispositivosAdicionales.map(describirDispositivo(caso.manejoViaAerea)).join(', ')}
              />
            </Grid>
          </SeccionResumen>
        )}

        {caso.tecnicasRegionales.length > 0 && (
          <SeccionResumen titulo="Técnicas regionales">
            <ul className="flex flex-col gap-1 text-sm text-slate-700">
              {caso.tecnicasRegionales.map((t) => (
                <li key={t.id}>
                  <span className="font-mono text-xs text-slate-400">{formatHora(t.hora)}</span> — {t.tipo}
                  {t.nivel && ` (${t.nivel})`} {t.farmaco && `· ${t.farmaco} ${t.dosis}`}{' '}
                  {t.exitosa ? '✓ exitosa' : '✗ fallida'} {t.notas && `· ${t.notas}`}
                </li>
              ))}
            </ul>
          </SeccionResumen>
        )}

        {caso.accesosVasculares.length > 0 && (
          <SeccionResumen titulo="Accesos vasculares">
            <ul className="flex flex-col gap-1 text-sm text-slate-700">
              {[...caso.accesosVasculares]
                .sort((a, b) => a.hora.localeCompare(b.hora))
                .map((a) => (
                  <li key={a.id}>
                    <span className="font-mono text-xs text-slate-400">{formatHora(a.hora)}</span> — {tituloAcceso(a)},{' '}
                    {ubicacionAcceso(a).toLowerCase()}
                    {a.tipo === 'VVC' && ` (${chequeoVVC(a).map((c) => `${c.etiqueta.toLowerCase()}: ${c.hecho ? 'sí' : 'no'}`).join(', ')})`}
                  </li>
                ))}
            </ul>
          </SeccionResumen>
        )}

        {caso.timeFlags.length > 0 && (
          <SeccionResumen titulo="Eventos temporales">
            <ul className="flex flex-col gap-1 text-sm text-slate-700">
              {(() => {
                const duraciones = duracionesFlags(caso.timeFlags, caso.horaFinAnestesia ? Date.parse(caso.horaFinAnestesia) : Date.now())
                return [...caso.timeFlags]
                  .sort((a, b) => a.hora.localeCompare(b.hora))
                  .map((f) => (
                    <li key={f.id}>
                      <span className="font-mono text-xs text-slate-400">{formatHora(f.hora)}</span> — {etiquetaFlag(f)}
                      {duraciones.get(f.id) && ` (duración: ${duraciones.get(f.id)?.minutos} min)`}
                    </li>
                  ))
              })()}
            </ul>
          </SeccionResumen>
        )}

        {caso.ventilacion.length > 0 && (
          <SeccionResumen titulo="Parámetros ventilatorios">
            <ul className="flex flex-col gap-1 text-sm text-slate-700">
              {[...caso.ventilacion]
                .sort((a, b) => a.hora.localeCompare(b.hora))
                .map((v) => (
                  <li key={v.id}>
                    <span className="font-mono text-xs text-slate-400">{formatHora(v.hora)}</span> — {resumenVentilacion(v)}
                  </li>
                ))}
            </ul>
          </SeccionResumen>
        )}

        <SeccionResumen titulo="Signos vitales">
          <VitalesChart
            serie={serieVitales(caso.signosVitales, Date.parse(caso.horaFinAnestesia ?? new Date().toISOString()))}
            inicio={caso.horaInicioAnestesia}
            hitos={hitosDelCaso(caso)}
            flags={caso.timeFlags}
            ventilacion={caso.ventilacion}
            controles={false}
          />
        </SeccionResumen>

        {caso.farmacos.length > 0 && (
          <SeccionResumen titulo="Fármacos administrados">
            <div className="mb-3">
              <LineaTiempoFarmacos
                registros={caso.farmacos}
                inicio={caso.horaInicioAnestesia}
                fin={caso.horaFinAnestesia}
                hitos={hitosDelCaso(caso)}
              />
            </div>
            <TablaSimple
              columnas={['Hora', 'Fármaco', 'Modo', 'Evento', 'Dosis', 'Vía']}
              filas={caso.farmacos
                .slice()
                .sort((a, b) => a.hora.localeCompare(b.hora))
                .map((f) => [
                  formatHora(f.hora),
                  f.nombre,
                  f.modo,
                  ETIQUETA_EVENTO[f.evento],
                  f.evento === 'fin' ? '—' : (f.dosisTexto ?? formatDosis(f.valor, f.unidad)),
                  f.via,
                ])}
            />
          </SeccionResumen>
        )}

        {caso.fluidos.length > 0 && (
          <SeccionResumen titulo="Balance de fluidos">
            <TablaSimple
              columnas={['Hora', 'Tipo', 'Volumen', 'Dirección']}
              filas={caso.fluidos
                .slice()
                .sort((a, b) => a.hora.localeCompare(b.hora))
                .map((f) => [formatHora(f.hora), f.tipo, `${f.volumenMl} ml`, f.entrada ? 'Entrada' : 'Salida'])}
            />
          </SeccionResumen>
        )}

        {caso.eventos.length > 0 && (
          <SeccionResumen titulo="Eventos e incidencias">
            <ul className="flex flex-col gap-1 text-sm text-slate-700">
              {caso.eventos
                .slice()
                .sort((a, b) => a.hora.localeCompare(b.hora))
                .map((e) => (
                  <li key={e.id}>
                    <span className="font-mono text-xs text-slate-400">{formatHora(e.hora)}</span> — {e.descripcion}
                  </li>
                ))}
            </ul>
          </SeccionResumen>
        )}

        {caso.notasFinales && (
          <SeccionResumen titulo="Notas finales">
            <p className="text-sm text-slate-700">{caso.notasFinales}</p>
          </SeccionResumen>
        )}
      </Card>
    </div>
  )
}

function describirDispositivo(via: CasoAnestesico['manejoViaAerea']) {
  return (d: string) => {
    if (d !== TUBO_DOBLE_LUMEN) return d
    const { numero, lado } = via.tuboDobleLumen
    const detalle = [numero && `N° ${numero}`, lado && lado.toLowerCase()].filter(Boolean).join(', ')
    return detalle ? `${d} (${detalle})` : d
  }
}

function SeccionResumen({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 border-t border-slate-100 pt-4 first:border-0 first:pt-0">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{titulo}</h2>
      {children}
    </section>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">{children}</div>
}

function Dato({ label, valor, full = false }: { label: string; valor: string | undefined; full?: boolean }) {
  if (!valor) return null
  return (
    <div className={full ? 'col-span-full' : ''}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm text-slate-800">{valor}</p>
    </div>
  )
}

function TablaSimple({ columnas, filas }: { columnas: string[]; filas: (string | number)[][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-slate-500">
          {columnas.map((c) => (
            <th key={c} className="py-1 pr-3 font-medium">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((fila, i) => (
          <tr key={i} className="border-b border-slate-100">
            {fila.map((valor, j) => (
              <td key={j} className="py-1 pr-3 text-slate-700">
                {valor}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
