import { useEffect, useMemo, useState } from 'react'
import { Anular } from '../menus/componentes/Anular'
import { Colapsable } from '../menus/componentes/Colapsable'
import { FormularioMenu } from '../menus/componentes/FormularioMenu'
import { SelectorVersion } from '../menus/componentes/SelectorVersion'
import { aplicarCambio, faltantes, soloVisibles, textoValor } from '../menus/motor'
import { pesoMagro } from '../menus/paciente'
import type { CampoDef, RegistroMenu, SeccionDef, Valor, Valores } from '../menus/tipos'
import {
  activos,
  alertasViaEspeciales,
  conComplicacionesAuto,
  DEF_VIA,
  defaultsVia,
  estadoVia,
  pendientesVia,
  SECCIONES_CASO,
  SECCIONES_VIA,
  sugerenciaVia,
  valoresEfectivos,
} from '../menus/viaAerea'
import type { CasoAnestesico } from '../types'
import { anestesiologoActual } from '../utils/caso'
import { formatHora, hhmmLocal, horaCercanaIso } from '../utils/tiempo'
import { serieVitales } from '../utils/vitales'
import { BotonesAgregar } from './farmacos/BotonesAgregar'
import { Badge, Button, Field, Input, Section } from './ui'

type Patch = (fn: (c: CasoAnestesico) => Partial<CasoAnestesico>) => void

function resumenEvento(s: SeccionDef, valores: Valores): string {
  return s.campos
    .filter((c) => c.id in valores)
    .map((c) => ({ c, t: textoValor(DEF_VIA, c, valores) }))
    .filter((x) => x.t)
    .map(({ c, t }) => `${c.etiqueta}: ${t}`)
    .join(' · ')
}

export function ViaAereaSection({ caso, patch }: { caso: CasoAnestesico; patch: Patch }) {
  const via = caso.viaAereaMenu
  const estado = useMemo(() => estadoVia(caso), [caso])
  const magro = pesoMagro(estado.paciente)
  const [borrador, setBorrador] = useState<{ seccion: SeccionDef; valores: Valores } | null>(null)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [horaEdicion, setHoraEdicion] = useState('')
  const [errorEdicion, setErrorEdicion] = useState('')
  const [anulandoId, setAnulandoId] = useState<string | null>(null)
  const [verAnulados, setVerAnulados] = useState(false)

  // Valores por defecto del caso (extubación en pabellón, despierto…): se guardan una vez.
  useEffect(() => {
    const defs = defaultsVia()
    const falta = SECCIONES_CASO.flatMap((s) => s.campos).filter((c) => c.id in defs && !(c.id in via.valores))
    if (falta.length) patch((c) => ({ viaAereaMenu: { ...c.viaAereaMenu, valores: { ...Object.fromEntries(falta.map((f) => [f.id, defs[f.id]])), ...c.viaAereaMenu.valores } } }))
  }, [via.valores, patch])

  const spo2Min = useMemo(() => {
    if (!caso.horaInicioAnestesia) return null
    const t0 = Date.parse(caso.horaInicioAnestesia)
    const valores = serieVitales(caso.signosVitales, Date.now())
      .filter((r) => Date.parse(r.hora) >= t0 && r.spo2 !== null)
      .map((r) => r.spo2 as number)
    return valores.length ? Math.min(...valores) : null
  }, [caso.horaInicioAnestesia, caso.signosVitales])

  const pendientes = pendientesVia(caso)
  const vivos = activos(via.eventos)
  const anulados = via.eventos.filter((e) => e.anulado)

  function guardarCaso(fn: (v: Valores, ahora: string) => Valores) {
    patch((c) => ({ viaAereaMenu: { ...c.viaAereaMenu, valores: fn(c.viaAereaMenu.valores, new Date().toISOString()) } }))
  }
  const cambiarCaso = (campo: CampoDef, nuevo: Valor | undefined) => guardarCaso((v, ahora) => aplicarCambio(campo, v, nuevo, ahora))
  const auxCaso = (clave: string, valor: Valor | undefined) =>
    guardarCaso((v) => {
      const r = { ...v }
      if (valor === undefined) delete r[clave]
      else r[clave] = valor
      return r
    })

  // --- maniobras (ámbito evento) ---
  const estadoBorrador = borrador ? estadoVia(caso, borrador.valores, editandoId ?? undefined) : null
  const pendientesBorrador =
    borrador && estadoBorrador ? faltantes([borrador.seccion], estadoBorrador.valores, estadoBorrador.visibilidad, estadoBorrador.version) : []
  const esVad = borrador?.seccion.id === 'vad'

  function abrirNuevo(s: SeccionDef) {
    setEditandoId(null)
    const defs = defaultsVia()
    setBorrador({ seccion: s, valores: Object.fromEntries(s.campos.filter((c) => c.id in defs).map((c) => [c.id, defs[c.id]])) })
  }
  function cerrar() {
    setBorrador(null)
    setEditandoId(null)
    setErrorEdicion('')
  }
  function empezarEdicion(e: RegistroMenu) {
    const s = SECCIONES_VIA.find((x) => x.id === e.seccion)
    if (!s) return
    setEditandoId(e.id)
    setHoraEdicion(hhmmLocal(e.hora))
    setErrorEdicion('')
    setBorrador({ seccion: s, valores: { ...e.valores } })
  }
  const cambiarBorrador = (campo: CampoDef, nuevo: Valor | undefined) =>
    setBorrador((b) => (b ? { ...b, valores: aplicarCambio(campo, b.valores, nuevo, new Date().toISOString()) } : b))
  const auxBorrador = (clave: string, valor: Valor | undefined) =>
    setBorrador((b) => {
      if (!b) return b
      const r = { ...b.valores }
      if (valor === undefined) delete r[clave]
      else r[clave] = valor
      return { ...b, valores: r }
    })

  function guardables(): Valores {
    return borrador && estadoBorrador ? soloVisibles([borrador.seccion], borrador.valores, estadoBorrador.visibilidad) : {}
  }

  function conAuto(c: CasoAnestesico, eventos: RegistroMenu[]): Partial<CasoAnestesico> {
    const nuevo = { ...c.viaAereaMenu, eventos }
    const valores = conComplicacionesAuto(c.viaAereaMenu.valores, valoresEfectivos(nuevo), new Date().toISOString())
    return { viaAereaMenu: { ...nuevo, valores } }
  }

  function agregar(hora?: string) {
    if (!borrador || (pendientesBorrador.length && !esVad)) return
    const registro: RegistroMenu = {
      id: crypto.randomUUID(),
      hora: hora ?? (esVad && via.vadDeclarada ? via.vadDeclarada : new Date().toISOString()),
      seccion: borrador.seccion.id,
      valores: guardables(),
    }
    patch((c) => conAuto(c, [...c.viaAereaMenu.eventos, registro]))
    cerrar()
  }

  function guardarEdicion() {
    if (!borrador || !editandoId || !horaEdicion || (pendientesBorrador.length && !esVad)) return
    const original = via.eventos.find((e) => e.id === editandoId)
    if (!original) return
    const iso = horaCercanaIso(horaEdicion, original.hora)
    if (Date.parse(iso) > Date.now() + 60000) return setErrorEdicion('La hora no puede ser posterior a la hora actual.')
    const valores = guardables()
    patch((c) => conAuto(c, c.viaAereaMenu.eventos.map((e) => (e.id === editandoId ? { ...e, hora: iso, valores } : e))))
    cerrar()
  }

  function anular(id: string, motivo: string) {
    patch((c) => ({
      viaAereaMenu: {
        ...c.viaAereaMenu,
        eventos: c.viaAereaMenu.eventos.map((e) =>
          e.id === id ? { ...e, anulado: { motivo, usuario: anestesiologoActual(c) || 'sin definir', hora: new Date().toISOString() } } : e,
        ),
      },
    }))
    setAnulandoId(null)
    if (editandoId === id) cerrar()
  }

  const declarar = () => patch((c) => (c.viaAereaMenu.vadDeclarada ? {} : { viaAereaMenu: { ...c.viaAereaMenu, vadDeclarada: new Date().toISOString() } }))

  // Alertas fijas (p. ej., laringectomía) siempre a la vista.
  const fijas = SECCIONES_VIA.flatMap((s) => s.campos)
    .filter((c) => estado.visibilidad.campos.has(c.id))
    .flatMap((c) => (c.alertas ?? []).filter((a) => a.fija && a.si))
    .filter((a) => {
      const cond = a.si as { campo: string; op: string; valor?: unknown }
      const v = estado.valores[cond.campo]
      return cond.op === 'eq' ? v === cond.valor : cond.op === 'es_verdadero' ? v === true : false
    })

  return (
    <Section
      title="Vía aérea"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <SelectorVersion caso={caso} onCambiar={(v) => patch(() => ({ versionMenus: v }))} />
          <Button size="sm" variant="danger" onClick={declarar}>
            {via.vadDeclarada ? `VAD declarada ${formatHora(via.vadDeclarada)}` : 'Declarar VAD'}
          </Button>
        </div>
      }
    >
      {fijas.map((a) => (
        <p key={a.mensaje} role="alert" className={`mb-3 rounded-lg border px-3 py-2 text-sm font-semibold ${a.nivel === 'roja' ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
          {a.mensaje}
        </p>
      ))}
      {pendientes.length > 0 && (
        <details className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <summary className="cursor-pointer font-medium">Pendientes para cerrar la hoja: {pendientes.length}</summary>
          <ul className="mt-1 list-disc pl-5">
            {pendientes.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex flex-col gap-3">
        {SECCIONES_VIA.filter((s) => (estado.visibilidad.secciones.has(s.id) && (s.ambito === 'evento' || s.campos.some((c) => estado.visibilidad.campos.has(c.id)))) || vivos.some((e) => e.seccion === s.id)).map((s) => {
          const titulo = `${s.numero}. ${s.titulo}`
          if (s.ambito === 'caso') {
            const faltan = faltantes([s], estado.valores, estado.visibilidad, estado.version).length
            return (
              <Colapsable
                key={s.id}
                titulo={titulo}
                abiertoInicial={s.id === 'evaluacion'}
                insignia={faltan > 0 ? <Badge tone="amber">{faltan} pendiente(s)</Badge> : <Badge tone="green">Completo</Badge>}
              >
                <FormularioMenu
                  secciones={[s]}
                  valores={estado.valores}
                  version={estado.version}
                  visibilidad={estado.visibilidad}
                  onCambiar={cambiarCaso}
                  onAux={auxCaso}
                  sugerencia={(id) => sugerenciaVia(id, estado, spo2Min)}
                  alertasExtra={(id) => alertasViaEspeciales(id, estado, Boolean(magro?.aproximado))}
                />
              </Colapsable>
            )
          }
          const propios = vivos.filter((e) => e.seccion === s.id)
          const propiosAnulados = anulados.filter((e) => e.seccion === s.id)
          const abriendo = borrador?.seccion.id === s.id
          return (
            <Colapsable
              key={`${s.id}-${s.id === 'vad' && via.vadDeclarada ? 'abierta' : ''}`}
              titulo={titulo}
              abiertoInicial={s.id === 'vad' ? Boolean(via.vadDeclarada) : false}
              insignia={propios.length > 0 ? <Badge tone="sky">{propios.length} registro(s)</Badge> : <Badge tone="amber">Sin registrar</Badge>}
            >
              {propios.map((e) => (
                <div key={e.id} className="mb-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      <span className="mr-2 font-mono text-xs text-slate-500">{formatHora(e.hora)}</span>
                      {s.titulo}
                    </p>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => empezarEdicion(e)} className="min-h-[36px] px-2 text-xs text-sky-600">
                        Editar
                      </button>
                      <button type="button" onClick={() => setAnulandoId(e.id)} className="min-h-[36px] px-2 text-xs text-rose-500">
                        Anular
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{resumenEvento(s, e.valores)}</p>
                  {anulandoId === e.id && <Anular onConfirmar={(m) => anular(e.id, m)} onCancelar={() => setAnulandoId(null)} />}
                </div>
              ))}
              {propiosAnulados.length > 0 && (
                <div className="mb-2">
                  <button type="button" className="min-h-[32px] text-xs text-slate-500 underline" onClick={() => setVerAnulados((v) => !v)}>
                    {verAnulados ? 'Ocultar' : 'Ver'} anulados ({propiosAnulados.length})
                  </button>
                  {verAnulados &&
                    propiosAnulados.map((e) => (
                      <p key={e.id} className="text-xs text-slate-500">
                        <span className="line-through">
                          {formatHora(e.hora)} {s.titulo}
                        </span>{' '}
                        — anulado por {e.anulado?.usuario} a las {e.anulado ? formatHora(e.anulado.hora) : ''}: {e.anulado?.motivo}
                      </p>
                    ))}
                </div>
              )}
              {abriendo && borrador && estadoBorrador ? (
                <div className={`rounded-xl border p-3 ${editandoId ? 'border-amber-300 bg-amber-50' : 'border-sky-200 bg-sky-50'}`}>
                  <FormularioMenu
                    secciones={[s]}
                    valores={estadoBorrador.valores}
                    version={estadoBorrador.version}
                    visibilidad={estadoBorrador.visibilidad}
                    onCambiar={cambiarBorrador}
                    onAux={auxBorrador}
                    sugerencia={(id) => sugerenciaVia(id, estadoBorrador, spo2Min)}
                    alertasExtra={(id) => alertasViaEspeciales(id, estadoBorrador, Boolean(magro?.aproximado))}
                  />
                  {pendientesBorrador.length > 0 && (
                    <p className="mt-3 text-sm text-amber-800">
                      {esVad ? 'Pendiente (se puede completar después): ' : 'Faltan: '}
                      {pendientesBorrador.map((p) => p.etiqueta).join(' · ')}
                    </p>
                  )}
                  <div className="mt-3">
                    {editandoId ? (
                      <div className="flex flex-wrap items-end gap-2">
                        <Field label="Hora">
                          <Input type="time" value={horaEdicion} onChange={(e) => setHoraEdicion(e.target.value)} />
                        </Field>
                        <Button size="sm" disabled={(pendientesBorrador.length > 0 && !esVad) || !horaEdicion} onClick={guardarEdicion}>
                          Guardar cambios
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cerrar}>
                          Cancelar
                        </Button>
                        {errorEdicion && <p className="w-full text-sm text-rose-700">{errorEdicion}</p>}
                      </div>
                    ) : (
                      <>
                        {esVad ? (
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button size="sm" onClick={() => agregar()}>
                              Guardar {pendientesBorrador.length > 0 ? '(completar después)' : ''}
                            </Button>
                          </div>
                        ) : (
                          <BotonesAgregar
                            listo={pendientesBorrador.length === 0}
                            etiquetaAhora="Registrar ahora"
                            etiquetaPersonalizada="Registrar a hora personalizada"
                            onAgregar={agregar}
                          />
                        )}
                        <div className="mt-2 flex justify-end">
                          <Button size="sm" variant="ghost" onClick={cerrar}>
                            Cancelar
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => abrirNuevo(s)}>
                  + Agregar {s.titulo.toLowerCase()}
                </Button>
              )}
            </Colapsable>
          )
        })}
      </div>
    </Section>
  )
}
