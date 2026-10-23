import { useMemo, useState } from 'react'
import { Anular } from '../menus/componentes/Anular'
import { Colapsable } from '../menus/componentes/Colapsable'
import { FormularioMenu } from '../menus/componentes/FormularioMenu'
import { SelectorVersion } from '../menus/componentes/SelectorVersion'
import {
  alertasEspeciales,
  calculadosAcceso,
  complicacionesAcceso,
  defaultsAcceso,
  DEF_ACCESOS,
  extremidadRestringida,
  SECCION_ANTES,
  SECCIONES_ACCESO,
  sugerirAcceso,
  tarjetaAcceso,
} from '../menus/accesos'
import { aplicarCambio, calcularVisibilidad, faltantes, soloVisibles, textoValor } from '../menus/motor'
import { pacienteMenu, versionMenu } from '../menus/paciente'
import type { CampoDef, RegistroMenu, Valor, Valores } from '../menus/tipos'
import type { CasoAnestesico } from '../types'
import { anestesiologoActual } from '../utils/caso'
import { formatHora, hhmmLocal, horaCercanaIso } from '../utils/tiempo'
import { BotonesAgregar } from './farmacos/BotonesAgregar'
import { Badge, Button, Field, Input, Section } from './ui'

type Patch = (fn: (c: CasoAnestesico) => Partial<CasoAnestesico>) => void

export function AccesosVascularesSection({ caso, patch }: { caso: CasoAnestesico; patch: Patch }) {
  const version = versionMenu(caso)
  const paciente = pacienteMenu(caso.paciente)
  const [borrador, setBorrador] = useState<Valores | null>(null)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [horaEdicion, setHoraEdicion] = useState('')
  const [errorEdicion, setErrorEdicion] = useState('')
  const [anulandoId, setAnulandoId] = useState<string | null>(null)
  const [verAnulados, setVerAnulados] = useState(false)

  const visCaso = useMemo(() => calcularVisibilidad(DEF_ACCESOS, caso.accesosCaso, version), [caso.accesosCaso, version])
  const visBorrador = useMemo(() => (borrador ? calcularVisibilidad(DEF_ACCESOS, borrador, version) : null), [borrador, version])
  const vivos = caso.accesosVasculares.filter((a) => !a.anulado).sort((a, b) => a.hora.localeCompare(b.hora))
  const anulados = caso.accesosVasculares.filter((a) => a.anulado)
  const original = caso.accesosVasculares.find((a) => a.id === editandoId)
  const pendientes = borrador && visBorrador ? faltantes(SECCIONES_ACCESO, borrador, visBorrador, version) : []
  const pendientesCaso = faltantes([SECCION_ANTES], caso.accesosCaso, visCaso, version)

  function cambiarCaso(campo: CampoDef, nuevo: Valor | undefined) {
    patch((c) => ({ accesosCaso: aplicarCambio(campo, c.accesosCaso, nuevo, new Date().toISOString()) }))
  }
  function auxCaso(clave: string, valor: Valor | undefined) {
    patch((c) => {
      const r = { ...c.accesosCaso }
      if (valor === undefined) delete r[clave]
      else r[clave] = valor
      return { accesosCaso: r }
    })
  }

  function cambiarBorrador(campo: CampoDef, nuevo: Valor | undefined) {
    setBorrador((b) => {
      if (!b) return b
      // Arteria umbilical: redirige al tipo "Catéter umbilical" (sección 10).
      if (campo.id === 'art.arteria' && nuevo === 'umbilical') {
        const r: Valores = { ...b, 'acc.tipo': 'umbilical' }
        delete r['art.arteria']
        return r
      }
      return aplicarCambio(campo, b, nuevo, new Date().toISOString())
    })
  }
  function auxBorrador(clave: string, valor: Valor | undefined) {
    setBorrador((b) => {
      if (!b) return b
      const r = { ...b }
      if (valor === undefined) delete r[clave]
      else r[clave] = valor
      return r
    })
  }

  function abrirNuevo() {
    setEditandoId(null)
    setBorrador(defaultsAcceso())
  }
  function cerrar() {
    setBorrador(null)
    setEditandoId(null)
    setErrorEdicion('')
  }
  function empezarEdicion(a: RegistroMenu) {
    setEditandoId(a.id)
    setHoraEdicion(hhmmLocal(a.hora))
    setErrorEdicion('')
    setBorrador({ ...defaultsAcceso(), ...a.valores })
  }

  function valoresGuardables(): Valores {
    return borrador && visBorrador ? soloVisibles(SECCIONES_ACCESO, borrador, visBorrador) : {}
  }

  function agregar(hora?: string) {
    if (!borrador || pendientes.length) return
    const nuevo: RegistroMenu = { id: crypto.randomUUID(), hora: hora ?? new Date().toISOString(), valores: valoresGuardables() }
    patch((c) => ({ accesosVasculares: [...c.accesosVasculares, nuevo] }))
    cerrar()
  }

  function guardarEdicion() {
    if (!original || !horaEdicion || pendientes.length) return
    const iso = horaCercanaIso(horaEdicion, original.hora)
    if (Date.parse(iso) > Date.now() + 60000) return setErrorEdicion('La hora no puede ser posterior a la hora actual.')
    const valores = valoresGuardables()
    patch((c) => ({ accesosVasculares: c.accesosVasculares.map((x) => (x.id === original.id ? { ...x, hora: iso, valores } : x)) }))
    cerrar()
  }

  function anular(id: string, motivo: string) {
    patch((c) => ({
      accesosVasculares: c.accesosVasculares.map((x) =>
        x.id === id ? { ...x, anulado: { motivo, usuario: anestesiologoActual(c) || 'sin definir', hora: new Date().toISOString() } } : x,
      ),
    }))
    setAnulandoId(null)
    if (editandoId === id) cerrar()
  }

  const efectivosBorrador: Valores = { ...caso.accesosCaso, ...borrador }
  const horaRegistro = original?.hora

  return (
    <Section title="Accesos vasculares" actions={<SelectorVersion caso={caso} onCambiar={(v) => patch(() => ({ versionMenus: v }))} />}>
      <Colapsable
        titulo={`${SECCION_ANTES.numero}. ${SECCION_ANTES.titulo}`}
        abiertoInicial
        insignia={pendientesCaso.length > 0 ? <Badge tone="amber">{pendientesCaso.length} pendiente(s)</Badge> : <Badge tone="green">Completo</Badge>}
      >
        <FormularioMenu
          secciones={[SECCION_ANTES]}
          valores={caso.accesosCaso}
          version={version}
          visibilidad={visCaso}
          onCambiar={cambiarCaso}
          onAux={auxCaso}
        />
      </Colapsable>

      {vivos.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {vivos.map((a) => {
            const calc = calculadosAcceso(a.valores)
            const comp = complicacionesAcceso(a.valores)
            const alertasIO = alertasEspeciales('io.posicion_confirmada', a.valores, caso.accesosCaso, a.hora)
            return (
              <li key={a.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{tarjetaAcceso(a, formatHora)}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {calc.exitoPrimerIntento === true && <Badge tone="green">Éxito 1.er intento</Badge>}
                      {calc.dificilReal === true && <Badge tone="amber">Acceso difícil</Badge>}
                      {calc.flebitis === true && <Badge tone="amber">Flebitis (VIP ≥2): retirar y reinstalar</Badge>}
                      {calc.cvcSeguro === false && <Badge tone="red">CVC sin los 3 puntos de seguridad</Badge>}
                      {comp.length > 0 && <Badge tone="red">Complicaciones: {comp.length}</Badge>}
                      {extremidadRestringida(a.valores, caso.accesosCaso) && <Badge tone="red">Extremidad restringida</Badge>}
                      {alertasIO.map((x) => (
                        <Badge key={x.mensaje} tone="amber">
                          {x.mensaje}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => empezarEdicion(a)} className="min-h-[36px] px-2 text-xs text-sky-600">
                      Editar
                    </button>
                    <button type="button" onClick={() => setAnulandoId(a.id)} className="min-h-[36px] px-2 text-xs text-rose-500">
                      Anular
                    </button>
                  </div>
                </div>
                <details className="mt-1 text-sm text-slate-600">
                  <summary className="cursor-pointer text-xs text-slate-500">Detalle</summary>
                  <ul className="mt-1 list-disc pl-5">
                    {SECCIONES_ACCESO.flatMap((s) => s.campos)
                      .filter((c) => c.id in a.valores)
                      .map((c) => ({ c, t: textoValor(DEF_ACCESOS, c, a.valores) }))
                      .filter((x) => x.t)
                      .map(({ c, t }) => (
                        <li key={c.id}>
                          {c.etiqueta}: {t}
                        </li>
                      ))}
                  </ul>
                </details>
                {anulandoId === a.id && <Anular onConfirmar={(m) => anular(a.id, m)} onCancelar={() => setAnulandoId(null)} />}
              </li>
            )
          })}
        </ul>
      )}
      {anulados.length > 0 && (
        <div className="mt-2">
          <button type="button" className="min-h-[32px] text-xs text-slate-500 underline" onClick={() => setVerAnulados((v) => !v)}>
            {verAnulados ? 'Ocultar' : 'Ver'} accesos anulados ({anulados.length})
          </button>
          {verAnulados && (
            <ul className="mt-1 flex flex-col gap-1 text-sm text-slate-500">
              {anulados.map((a) => (
                <li key={a.id} className="line-through-container">
                  <span className="line-through">{tarjetaAcceso(a, formatHora)}</span>
                  <span className="ml-2 text-xs">
                    Anulado por {a.anulado?.usuario} a las {a.anulado ? formatHora(a.anulado.hora) : ''}: {a.anulado?.motivo}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className={`mt-4 rounded-xl border p-3 ${original ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
        {borrador && visBorrador ? (
          <>
            <p className="mb-3 text-sm font-semibold text-slate-700">{original ? `Editar acceso colocado a las ${formatHora(original.hora)}` : 'Agregar acceso'}</p>
            <FormularioMenu
              secciones={SECCIONES_ACCESO}
              valores={efectivosBorrador}
              version={version}
              visibilidad={visBorrador}
              mostrarTitulosSeccion
              onCambiar={cambiarBorrador}
              onAux={auxBorrador}
              sugerencia={(id) => sugerirAcceso(id, version, paciente, efectivosBorrador)}
              alertasExtra={(id) => alertasEspeciales(id, efectivosBorrador, caso.accesosCaso, horaRegistro)}
            />
            {pendientes.length > 0 && (
              <p className="mt-3 text-sm text-amber-800">Faltan: {pendientes.map((p) => p.etiqueta).join(' · ')}</p>
            )}
            <div className="mt-3">
              {original ? (
                <div className="flex flex-wrap items-end gap-2">
                  <Field label="Hora de colocación">
                    <Input
                      type="time"
                      value={horaEdicion}
                      onChange={(e) => {
                        setHoraEdicion(e.target.value)
                        setErrorEdicion('')
                      }}
                    />
                  </Field>
                  <Button size="sm" disabled={pendientes.length > 0 || !horaEdicion} onClick={guardarEdicion}>
                    Guardar cambios
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cerrar}>
                    Cancelar
                  </Button>
                  {errorEdicion && <p className="w-full text-sm text-rose-700">{errorEdicion}</p>}
                </div>
              ) : (
                <>
                  <BotonesAgregar listo={pendientes.length === 0} etiquetaAhora="Agregar ahora" etiquetaPersonalizada="Agregar a hora personalizada" onAgregar={agregar} />
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" variant="ghost" onClick={cerrar}>
                      Cancelar
                    </Button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <Button onClick={abrirNuevo}>+ Agregar acceso</Button>
        )}
      </div>
    </Section>
  )
}
