import { useMemo, useState } from 'react'
import { Anular } from '../menus/componentes/Anular'
import { FormularioMenu } from '../menus/componentes/FormularioMenu'
import { SelectorVersion } from '../menus/componentes/SelectorVersion'
import { aplicarCambio, soloVisibles } from '../menus/motor'
import type { CampoDef, RegistroMenu, Valor, Valores } from '../menus/tipos'
import { defaultsVia, estadoVia, faltantesVia, registrosVivos, SECCIONES_VIA, sugerenciaVia, tarjetaVia } from '../menus/viaAerea'
import type { CasoAnestesico } from '../types'
import { anestesiologoActual } from '../utils/caso'
import { formatHora, hhmmLocal, horaCercanaIso } from '../utils/tiempo'
import { BotonesAgregar } from './farmacos/BotonesAgregar'
import { Button, Field, Input, Section } from './ui'

type Patch = (fn: (c: CasoAnestesico) => Partial<CasoAnestesico>) => void

export function ViaAereaSection({ caso, patch }: { caso: CasoAnestesico; patch: Patch }) {
  const [borrador, setBorrador] = useState<Valores | null>(null)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [horaEdicion, setHoraEdicion] = useState('')
  const [errorEdicion, setErrorEdicion] = useState('')
  const [anulandoId, setAnulandoId] = useState<string | null>(null)
  const [verAnulados, setVerAnulados] = useState(false)
  const vivos = registrosVivos(caso)
  const anulados = caso.viaAereaMenu.registros.filter((r) => r.anulado)
  const original = caso.viaAereaMenu.registros.find((r) => r.id === editandoId)
  const estado = useMemo(() => estadoVia(caso, borrador ?? {}), [caso, borrador])
  const pendientes = borrador ? faltantesVia(estado) : []

  const cambiar = (campo: CampoDef, nuevo: Valor | undefined) => setBorrador((b) => (b ? aplicarCambio(campo, b, nuevo, new Date().toISOString()) : b))
  const aux = (clave: string, valor: Valor | undefined) =>
    setBorrador((b) => {
      if (!b) return b
      const r = { ...b }
      if (valor === undefined) delete r[clave]
      else r[clave] = valor
      return r
    })

  function cerrar() {
    setBorrador(null)
    setEditandoId(null)
    setErrorEdicion('')
  }

  const guardables = (): Valores => (borrador ? soloVisibles(SECCIONES_VIA, borrador, estado.visibilidad) : {})
  const actualizar = (fn: (r: RegistroMenu[], usuario: string) => RegistroMenu[]) =>
    patch((c) => ({ viaAereaMenu: { ...c.viaAereaMenu, registros: fn(c.viaAereaMenu.registros, anestesiologoActual(c) || 'sin definir') } }))

  function agregar(hora?: string) {
    if (!borrador || pendientes.length) return
    const registro: RegistroMenu = { id: crypto.randomUUID(), hora: hora ?? new Date().toISOString(), valores: guardables() }
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
    <Section title="Vía aérea" actions={<SelectorVersion caso={caso} onCambiar={(v) => patch(() => ({ versionMenus: v }))} />}>
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
                    aria-label="Editar dispositivo"
                    onClick={() => {
                      setEditandoId(r.id)
                      setHoraEdicion(hhmmLocal(r.hora))
                      setErrorEdicion('')
                      setBorrador({ ...defaultsVia(), ...r.valores })
                    }}
                  >
                    <p className="font-semibold text-slate-900">{tarjetaVia(r, formatHora)}</p>
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
                  <span className="line-through">{tarjetaVia(r, formatHora)}</span>
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
        {borrador ? (
          <>
            <p className="mb-3 text-sm font-semibold text-slate-700">{original ? `Editar dispositivo de las ${formatHora(original.hora)}` : 'Agregar dispositivo'}</p>
            <FormularioMenu
              secciones={SECCIONES_VIA}
              valores={estado.valores}
              version={estado.version}
              visibilidad={estado.visibilidad}
              mostrarTitulosSeccion
              onCambiar={cambiar}
              onAux={aux}
              sugerencia={(id) => sugerenciaVia(id, estado)}
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
          <Button onClick={() => setBorrador(defaultsVia())}>+ Agregar dispositivo</Button>
        )}
      </div>
    </Section>
  )
}
