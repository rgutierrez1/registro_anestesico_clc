import { useMemo, useState, type ReactNode } from 'react'
import { DEF_BLOQUEOS, SECCIONES_BLOQUEO, tarjetaBloqueo, textoBloqueo, textoConcentracion } from '../menus/bloqueos'
import { DEF_NEUROAXIAL, SECCIONES_NEUROAXIAL, tarjetaNeuroaxial } from '../menus/neuroaxial'
import { Anular } from '../menus/componentes/Anular'
import { FormularioMenu } from '../menus/componentes/FormularioMenu'
import { aplicarCambio, calcularVisibilidad, faltantes, sinOpcionesInvalidas, soloVisibles, valoresPorDefecto } from '../menus/motor'
import type { CampoDef, MenuDef, RegistroMenu, SeccionDef, Valor, Valores } from '../menus/tipos'
import type { CasoAnestesico } from '../types'
import { anestesiologoActual } from '../utils/caso'
import { nuevoId } from '../utils/id'
import { formatHora, hhmmLocal, horaCercanaIso } from '../utils/tiempo'
import { BotonesAgregar } from './farmacos/BotonesAgregar'
import { Button, Field, Input, Section } from './ui'

type Patch = (fn: (c: CasoAnestesico) => Partial<CasoAnestesico>) => void

export interface ConfigRegistros {
  clave: 'bloqueos' | 'neuroaxial'
  titulo: string
  // En singular y en minúscula: "bloqueo", "técnica".
  nombre: string
  def: MenuDef
  secciones: SeccionDef[]
  tarjeta: (r: RegistroMenu, formatHora: (iso: string) => string) => string
  // Campo con detalle libre que se muestra bajo la tarjeta.
  detalle?: string
  acciones?: (id: string, valores: Valores, aux: (clave: string, valor: Valor | undefined) => void) => ReactNode
  // Campo de texto que se arma solo con lo registrado, hasta que se edita a mano (`campo#manual`).
  auto?: { campo: string; generar: (valores: Valores) => string }
}

// Lista de registros con hora (agregar, editar, anular) a partir de un menú de clic.
export function SeccionRegistrosMenu({ caso, patch, config }: { caso: CasoAnestesico; patch: Patch; config: ConfigRegistros }) {
  const { clave, def, secciones, tarjeta, nombre } = config
  const registros = caso[clave]
  const [borrador, setBorrador] = useState<Valores | null>(null)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [horaEdicion, setHoraEdicion] = useState('')
  const [errorEdicion, setErrorEdicion] = useState('')
  const [anulandoId, setAnulandoId] = useState<string | null>(null)
  const [verAnulados, setVerAnulados] = useState(false)
  const vivos = registros.filter((b) => !b.anulado).sort((a, b) => a.hora.localeCompare(b.hora))
  const anulados = registros.filter((b) => b.anulado)
  const original = registros.find((b) => b.id === editandoId)
  const vis = useMemo(() => (borrador ? calcularVisibilidad(def, borrador, 'adulto') : null), [borrador])
  const auto = config.auto
  const efectivo = useMemo(() => {
    if (!borrador || !auto || !vis || borrador[`${auto.campo}#manual`] === true) return borrador
    return { ...borrador, [auto.campo]: auto.generar(soloVisibles(secciones, borrador, vis)) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borrador, vis])
  const pendientes = efectivo && vis ? faltantes(secciones, efectivo, vis, 'adulto') : []

  const cambiar = (campo: CampoDef, nuevo: Valor | undefined) =>
    setBorrador((b) => {
      if (!b) return b
      const r = sinOpcionesInvalidas(secciones, aplicarCambio(campo, b, nuevo, new Date().toISOString()), 'adulto')
      return auto && campo.id === auto.campo ? { ...r, [`${auto.campo}#manual`]: true } : r
    })
  const aux = (clave: string, valor: Valor | undefined) =>
    setBorrador((b) => {
      if (!b) return b
      const r = { ...b }
      if (valor === undefined) delete r[clave]
      else r[clave] = valor
      return r
    })

  // Un texto que ya no coincide con el automático se considera escrito a mano.
  function valoresAlEditar(valores: Valores): Valores {
    const v = { ...valores }
    const actual = auto && v[auto.campo]
    if (auto && typeof actual === 'string' && actual && v[`${auto.campo}#manual`] !== true) {
      const visibles = calcularVisibilidad(def, v, 'adulto')
      if (auto.generar(soloVisibles(secciones, v, visibles)) !== actual) v[`${auto.campo}#manual`] = true
    }
    return v
  }

  function cerrar() {
    setBorrador(null)
    setEditandoId(null)
    setErrorEdicion('')
  }

  const guardables = (): Valores => (efectivo && vis ? soloVisibles(secciones, efectivo, vis) : {})
  const actualizar = (fn: (r: RegistroMenu[], usuario: string) => RegistroMenu[]) =>
    patch((c) => ({ [clave]: fn(c[clave], anestesiologoActual(c) || 'sin definir') }))

  function agregar(hora?: string) {
    if (!borrador || pendientes.length) return
    const registro: RegistroMenu = { id: nuevoId(), hora: hora ?? new Date().toISOString(), valores: guardables() }
    actualizar((r) => [...r, registro])
    cerrar()
  }

  function guardarEdicion() {
    if (!original || !horaEdicion || pendientes.length) return
    const iso = horaCercanaIso(horaEdicion, original.hora)
    if (Date.parse(iso) > Date.now() + 60000) return setErrorEdicion('La hora no puede ser posterior a la hora actual.')
    const valores = guardables()
    actualizar((r, usuario) =>
      r.map((x) => (x.id === original.id ? { ...x, hora: iso, valores, historial: [...(x.historial ?? []), { usuario, hora: new Date().toISOString() }] } : x)),
    )
    cerrar()
  }

  return (
    <Section title={config.titulo}>
      {vivos.length > 0 && (
        <ul className="mb-4 flex flex-col gap-2">
          {vivos.map((r) => {
            const ultimo = r.historial?.[r.historial.length - 1]
            return (
              <li key={r.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    className="min-h-[44px] flex-1 text-left"
                    aria-label={`Editar ${nombre}`}
                    onClick={() => {
                      setEditandoId(r.id)
                      setHoraEdicion(hhmmLocal(r.hora))
                      setErrorEdicion('')
                      setBorrador(valoresAlEditar(r.valores))
                    }}
                  >
                    <p className="font-semibold text-slate-900">{tarjeta(r, formatHora)}</p>
                    {config.detalle && typeof r.valores[config.detalle] === 'string' && r.valores[config.detalle] && <p className="text-sm text-slate-600">{r.valores[config.detalle] as string}</p>}
                    {ultimo && (
                      <p className="text-xs text-slate-500">
                        Modificado por {ultimo.usuario} a las {formatHora(ultimo.hora)}
                      </p>
                    )}
                  </button>
                  <button type="button" onClick={() => setAnulandoId(r.id)} className="min-h-[36px] shrink-0 px-2 text-xs text-rose-500">
                    Borrar
                  </button>
                </div>
                {anulandoId === r.id && (
                  <Anular
                    onConfirmar={(motivo) => {
                      actualizar((lista, usuario) => lista.map((x) => (x.id === r.id ? { ...x, anulado: { motivo, usuario, hora: new Date().toISOString() } } : x)))
                      setAnulandoId(null)
                      if (editandoId === r.id) cerrar()
                    }}
                    onCancelar={() => setAnulandoId(null)}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
      {anulados.length > 0 && (
        <div className="mb-3">
          <button type="button" className="min-h-[32px] text-xs text-slate-500 underline" onClick={() => setVerAnulados((v) => !v)}>
            {verAnulados ? 'Ocultar' : 'Ver'} registros anulados ({anulados.length})
          </button>
          {verAnulados && (
            <ul className="mt-1 flex flex-col gap-1 text-sm text-slate-500">
              {anulados.map((r) => (
                <li key={r.id}>
                  <span className="line-through">{tarjeta(r, formatHora)}</span>
                  <span className="ml-2 text-xs">
                    Anulado por {r.anulado?.usuario} a las {r.anulado ? formatHora(r.anulado.hora) : ''}: {r.anulado?.motivo}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className={`rounded-xl border p-3 ${original ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
        {borrador && vis ? (
          <>
            <p className="mb-3 text-sm font-semibold text-slate-700">{original ? `Editar ${nombre} de las ${formatHora(original.hora)}` : `Agregar ${nombre}`}</p>
            <FormularioMenu
              secciones={secciones}
              valores={efectivo ?? borrador}
              version="adulto"
              visibilidad={vis}
              mostrarTitulosSeccion
              onCambiar={cambiar}
              onAux={aux}
              acciones={(id) => config.acciones?.(id, guardables(), aux)}
            />
            {pendientes.length > 0 && <p className="mt-3 text-sm text-amber-800">Faltan: {pendientes.map((p) => p.etiqueta).join(' · ')}</p>}
            <div className="mt-3">
              {original ? (
                <div className="flex flex-wrap items-end gap-2">
                  <Field label="Hora">
                    <Input type="time" value={horaEdicion} onChange={(e) => setHoraEdicion(e.target.value)} />
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
          <Button onClick={() => setBorrador(valoresPorDefecto(secciones))}>+ Agregar {nombre}</Button>
        )}
      </div>
    </Section>
  )
}

export function BloqueosRegionalesSection({ caso, patch }: { caso: CasoAnestesico; patch: Patch }) {
  return (
    <SeccionRegistrosMenu
      caso={caso}
      patch={patch}
      config={{
        clave: 'bloqueos',
        titulo: 'Bloqueos regionales',
        nombre: 'bloqueo',
        def: DEF_BLOQUEOS,
        secciones: SECCIONES_BLOQUEO,
        tarjeta: tarjetaBloqueo,
        detalle: 'blq.detalle',
        auto: { campo: 'blq.texto_final', generar: textoBloqueo },
        acciones: (id, valores, aux) =>
          id === 'blq.volumen_ml' && textoConcentracion(valores) ? (
            <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-sm font-medium text-sky-900">Concentración del anestésico: {textoConcentracion(valores)}</p>
          ) : id === 'blq.texto_final' ? (
            valores['blq.texto_final#manual'] === true ? (
              <Button size="sm" variant="secondary" className="mt-2" onClick={() => aux('blq.texto_final#manual', undefined)}>
                Volver al texto automático
              </Button>
            ) : (
              <p className="mt-1 text-xs text-slate-500">Se arma solo con lo registrado arriba. Si lo editas a mano, deja de actualizarse.</p>
            )
          ) : null,
      }}
    />
  )
}

// Raquídea y peridural: se muestra solo si el plan anestésico incluye Neuroaxial (o ya hay registros).
export function NeuroaxialSection({ caso, patch }: { caso: CasoAnestesico; patch: Patch }) {
  return (
    <SeccionRegistrosMenu
      caso={caso}
      patch={patch}
      config={{
        clave: 'neuroaxial',
        titulo: 'Anestesia neuroaxial',
        nombre: 'técnica',
        def: DEF_NEUROAXIAL,
        secciones: SECCIONES_NEUROAXIAL,
        tarjeta: tarjetaNeuroaxial,
        detalle: 'neu.notas',
      }}
    />
  )
}
