import { useMemo, useState } from 'react'
import type { CasoAnestesico, RegistroVital, TimeFlag, ValoresVitales } from '../types'
import { agregarFlag, editarFlag, eliminarFlag, errorFlag, posicionEn } from '../utils/flags'
import { anestesiologoActual, marcasCambiosAnestesiologo } from '../utils/caso'
import { hitosDelCaso } from '../utils/hitos'
import { formatHora } from '../utils/tiempo'
import { useAhora } from '../utils/useAhora'
import { agregarVentilacion, editarVentilacion, eliminarVentilacion } from '../utils/ventilacion'
import {
  agregarAncla,
  aplicarEdicionVital,
  CAMPOS_VITALES,
  cargarPrimerRegistro,
  eliminarRegistroVital,
  esCopia,
  formatTemp,
  prepararPrimerRegistro,
  serieVitales,
  ultimosValores,
  valoresDe,
  valoresIguales,
  type ModoEdicionVital,
} from '../utils/vitales'
import { VitalesChart, type CambioPendiente } from './VitalesChart'
import { Button, Section } from './ui'
import { FormularioVitales } from './vitales/FormularioVitales'
import { IconoReloj, PanelEventosTemporales } from './vitales/PanelEventosTemporales'
import { IconoVentilacion, PanelVentilacion } from './vitales/PanelVentilacion'

export function RegistroVitalesSection({
  caso,
  onActualizar,
}: {
  caso: CasoAnestesico
  onActualizar: (fn: (c: CasoAnestesico) => Partial<CasoAnestesico>) => void
}) {
  const ahora = useAhora(30000)
  const hasta = caso.horaFinAnestesia ? Date.parse(caso.horaFinAnestesia) : ahora
  const serie = useMemo(() => serieVitales(caso.signosVitales, hasta), [caso.signosVitales, hasta])
  const [mostrarTabla, setMostrarTabla] = useState(false)
  const [panelFlags, setPanelFlags] = useState(false)
  const [panelVentilacion, setPanelVentilacion] = useState(false)
  const [nuevosValores, setNuevosValores] = useState(false)
  const [editandoHora, setEditandoHora] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState<CambioPendiente | null>(null)

  const sinRegistros = caso.signosVitales.length === 0
  const registroEditando = serie.find((r) => r.hora === editandoHora)
  const registroPendiente = serie.find((r) => r.hora === pendiente?.hora)

  function solicitarCambio(hora: string, nuevos: ValoresVitales) {
    const actual = serie.find((r) => r.hora === hora)
    if (!actual || valoresIguales(valoresDe(actual), nuevos)) return
    setEditandoHora(null)
    setPendiente({ hora, nuevos })
  }

  function aplicar(modo: ModoEdicionVital) {
    if (!pendiente) return
    const { hora, nuevos } = pendiente
    onActualizar((c) => aplicarEdicionVital(c, hora, nuevos, modo))
    setPendiente(null)
  }

  function agregarEventoTemporal(flag: TimeFlag): string | void {
    const problema = errorFlag(caso.timeFlags, flag)
    if (problema) return problema
    onActualizar((c) => agregarFlag(c, flag))
  }

  function editarEventoTemporal(flag: TimeFlag): string | void {
    const problema = errorFlag(
      caso.timeFlags.filter((f) => f.id !== flag.id),
      flag,
    )
    if (problema) return problema
    onActualizar((c) => editarFlag(c, flag))
  }

  function seleccionar(hora: string) {
    setPendiente(null)
    setNuevosValores(false)
    setEditandoHora(hora)
  }

  return (
    <Section
      title="Signos vitales"
      actions={
        <div className="flex items-center gap-3">
          {!sinRegistros && (
            <button className="text-sm text-sky-600" onClick={() => setMostrarTabla((v) => !v)}>
              {mostrarTabla ? 'Ver gráfico' : 'Ver tabla'}
            </button>
          )}
          <button
            type="button"
            title="Parámetros ventilatorios"
            aria-label="Parámetros ventilatorios"
            aria-pressed={panelVentilacion}
            onClick={() => setPanelVentilacion((v) => !v)}
            className={`inline-flex h-[44px] w-[44px] items-center justify-center rounded-xl text-white transition-colors ${
              panelVentilacion ? 'bg-sky-800' : 'bg-sky-600 hover:bg-sky-700'
            }`}
          >
            <IconoVentilacion />
          </button>
          <button
            type="button"
            title="Eventos temporales"
            aria-label="Eventos temporales"
            aria-pressed={panelFlags}
            onClick={() => setPanelFlags((v) => !v)}
            className={`relative inline-flex h-[44px] w-[44px] items-center justify-center rounded-xl text-white transition-colors ${
              panelFlags ? 'bg-sky-800' : 'bg-sky-600 hover:bg-sky-700'
            }`}
          >
            <IconoReloj />
            <span className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white text-sm font-bold leading-none text-sky-700 shadow ring-1 ring-sky-200">
              +
            </span>
          </button>
        </div>
      }
    >
      {panelFlags && (
        <PanelEventosTemporales
          flags={caso.timeFlags}
          onAgregar={agregarEventoTemporal}
          onEditar={editarEventoTemporal}
          cambios={caso.eventos.filter((e) => e.cambioAnestesiologo)}
          anestesiologoActual={anestesiologoActual(caso)}
          onRegistrarCambio={(e) => onActualizar((c) => ({ eventos: [...c.eventos, e] }))}
          onEditarCambio={(e) => onActualizar((c) => ({ eventos: c.eventos.map((x) => (x.id === e.id ? e : x)) }))}
          onEliminarCambio={(id) => onActualizar((c) => ({ eventos: c.eventos.filter((x) => x.id !== id) }))}
          onEliminar={(id) => onActualizar((c) => eliminarFlag(c, id))}
          onCerrar={() => setPanelFlags(false)}
        />
      )}
      {panelVentilacion && (
        <PanelVentilacion
          caso={caso}
          onAgregar={(r) => onActualizar((c) => agregarVentilacion(c, r))}
          onEditar={(r) => onActualizar((c) => editarVentilacion(c, r))}
          onEliminar={(id) => onActualizar((c) => eliminarVentilacion(c, id))}
          onCerrar={() => setPanelVentilacion(false)}
        />
      )}
      {sinRegistros ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <h3 className="mb-2 font-semibold text-sky-900">Primer registro</h3>
          <FormularioVitales
            inicial={null}
            paciente={caso.paciente}
            textoGuardar="Guardar y repetir cada 5 min"
            ayuda="Estos valores se repetirán automáticamente cada 5 minutos durante toda la anestesia. Después podés editar cada registro."
            pedirInicio={!caso.horaInicioAnestesia}
            pedirFin={!caso.horaFinAnestesia}
            onGuardar={(valores, horas) => {
              const preparado = prepararPrimerRegistro(caso, horas)
              if (preparado.error) return preparado.error
              onActualizar((c) => cargarPrimerRegistro(c, valores, preparado))
            }}
          />
        </div>
      ) : (
        <>
          {mostrarTabla ? (
            <TablaVitales
              serie={serie}
              flags={caso.timeFlags}
              seleccionHora={editandoHora}
              onSeleccionar={seleccionar}
              onEliminar={(id) => onActualizar((c) => eliminarRegistroVital(c, id))}
            />
          ) : (
            <VitalesChart
              serie={serie}
              inicio={caso.horaInicioAnestesia}
              hitos={hitosDelCaso(caso)}
              flags={caso.timeFlags}
              ventilacion={caso.ventilacion}
              marcasExtra={marcasCambiosAnestesiologo(caso.eventos)}
              pendiente={pendiente}
              seleccionHora={editandoHora}
              onSolicitarCambio={solicitarCambio}
              onSeleccionar={seleccionar}
            />
          )}

          {pendiente && registroPendiente && (
            <ConfirmarEdicion registro={registroPendiente} pendiente={pendiente} onAplicar={aplicar} onCancelar={() => setPendiente(null)} />
          )}

          {registroEditando && !pendiente && (
            <EditorRegistro
              key={registroEditando.hora}
              registro={registroEditando}
              onGuardar={(nuevos) => solicitarCambio(registroEditando.hora, nuevos)}
              onCerrar={() => setEditandoHora(null)}
            />
          )}

          <div className="mt-4">
            {nuevosValores ? (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                <h3 className="mb-2 font-semibold text-sky-900">Registrar nuevos valores ahora</h3>
                <FormularioVitales
                  inicial={ultimosValores(serie, ahora)}
                  textoGuardar="Guardar y repetir desde ahora"
                  onCancelar={() => setNuevosValores(false)}
                  ayuda="Los registros automáticos siguientes copiarán estos valores."
                  onGuardar={(valores) => {
                    onActualizar((c) => agregarAncla(c, valores, new Date().toISOString()))
                    setNuevosValores(false)
                  }}
                />
              </div>
            ) : (
              <Button
                onClick={() => {
                  setEditandoHora(null)
                  setPendiente(null)
                  setNuevosValores(true)
                }}
              >
                + Registrar nuevos valores ahora
              </Button>
            )}
          </div>
        </>
      )}
    </Section>
  )
}

function etiquetaValor(clave: keyof ValoresVitales, antes: number | null, despues: number | null): string {
  const campo = CAMPOS_VITALES.find((c) => c.clave === clave)
  return `${campo?.etiqueta ?? 'PAM'} ${antes ?? '–'} → ${despues ?? '–'}`
}

function ConfirmarEdicion({
  registro,
  pendiente,
  onAplicar,
  onCancelar,
}: {
  registro: RegistroVital
  pendiente: CambioPendiente
  onAplicar: (modo: ModoEdicionVital) => void
  onCancelar: () => void
}) {
  const cambios = CAMPOS_VITALES.filter((c) => registro[c.clave] !== pendiente.nuevos[c.clave]).map((c) =>
    etiquetaValor(c.clave, registro[c.clave], pendiente.nuevos[c.clave]),
  )
  const hora = formatHora(pendiente.hora)
  return (
    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
      <p className="text-sm font-semibold text-amber-900">
        Cambio en el registro de las {hora}: {cambios.join(' · ')}
      </p>
      <p className="mb-3 text-sm text-amber-900">¿Cómo querés aplicarlo?</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onAplicar('solo')}
          className="min-h-[56px] rounded-xl border border-amber-300 bg-white p-3 text-left hover:border-amber-500"
        >
          <span className="block font-semibold text-slate-900">Solo este registro</span>
          <span className="block text-xs text-slate-600">
            Cambia únicamente el de las {hora}. Los siguientes siguen copiando los valores anteriores.
          </span>
        </button>
        <button
          type="button"
          onClick={() => onAplicar('siguientes')}
          className="min-h-[56px] rounded-xl border border-amber-300 bg-white p-3 text-left hover:border-amber-500"
        >
          <span className="block font-semibold text-slate-900">Este y los siguientes</span>
          <span className="block text-xs text-slate-600">
            Los registros automáticos desde las {hora} en adelante copiarán estos valores. Los que editaste a mano
            después se mantienen.
          </span>
        </button>
      </div>
      <div className="mt-2 flex justify-end">
        <Button size="sm" variant="ghost" onClick={onCancelar}>
          Cancelar cambio
        </Button>
      </div>
    </div>
  )
}

function EditorRegistro({
  registro,
  onGuardar,
  onCerrar,
}: {
  registro: RegistroVital
  onGuardar: (nuevos: ValoresVitales) => void
  onCerrar: () => void
}) {
  return (
    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
      <p className="mb-2 text-sm font-semibold text-amber-900">
        Editar registro de las {formatHora(registro.hora)}
      </p>
      <FormularioVitales
        inicial={valoresDe(registro)}
        textoGuardar="Guardar cambios"
        textoCancelar="Cancelar"
        onCancelar={onCerrar}
        onGuardar={onGuardar}
      />
    </div>
  )
}

function TablaVitales({
  serie,
  flags,
  seleccionHora,
  onSeleccionar,
  onEliminar,
}: {
  serie: RegistroVital[]
  flags: TimeFlag[]
  seleccionHora: string | null
  onSeleccionar: (hora: string) => void
  onEliminar: (id: string) => void
}) {
  const filas = [...serie].reverse()
  return (
    <div className="max-h-[360px] overflow-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-100 text-slate-600">
          <tr>
            <th className="px-2 py-2 text-left">Hora</th>
            <th className="px-2 py-2 text-right">PAS</th>
            <th className="px-2 py-2 text-right">PAD</th>
            <th className="px-2 py-2 text-right">PAM</th>
            <th className="px-2 py-2 text-right">FC</th>
            <th className="px-2 py-2 text-right">EtCO2</th>
            <th className="px-2 py-2 text-right">SpO2</th>
            <th className="px-2 py-2 text-right">Temp</th>
            <th className="px-2 py-2 text-left">Posición</th>
            <th className="px-2 py-2 text-left">Origen</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filas.map((r) => (
            <tr
              key={r.id}
              onClick={() => onSeleccionar(r.hora)}
              className={`cursor-pointer border-t border-slate-100 hover:bg-sky-50 ${seleccionHora === r.hora ? 'bg-amber-50' : ''}`}
            >
              <td className="px-2 py-2 font-medium text-slate-700">{formatHora(r.hora)}</td>
              {(['pas', 'pad', 'pam', 'fc', 'etco2', 'spo2', 'temp'] as const).map((c) => (
                <td key={c} className="px-2 py-2 text-right text-slate-800">
                  {c === 'temp' ? formatTemp(r[c]) : (r[c] ?? '—')}
                </td>
              ))}
              <td className="px-2 py-2 text-slate-800">{posicionEn(flags, Date.parse(r.hora))}</td>
              <td className="px-2 py-2 text-xs text-slate-500">
                {esCopia(r) ? 'Copia' : r.propaga ? 'Registrado (se repite)' : 'Registrado (solo este)'}
              </td>
              <td className="px-2 py-2 text-right">
                {!esCopia(r) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEliminar(r.id)
                    }}
                    className="text-xs text-rose-500"
                  >
                    Borrar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
