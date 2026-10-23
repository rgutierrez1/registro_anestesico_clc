import { useMemo, useState } from 'react'
import { Anular } from '../menus/componentes/Anular'
import { FormularioMenu } from '../menus/componentes/FormularioMenu'
import { SelectorVersion } from '../menus/componentes/SelectorVersion'
import { DEF_ACCESOS, SECCIONES_ACCESO, sugerirAcceso, tarjetaAcceso } from '../menus/accesos'
import { aplicarCambio, calcularVisibilidad, faltantes, soloVisibles } from '../menus/motor'
import { pacienteMenu, versionMenu } from '../menus/paciente'
import type { CampoDef, RegistroMenu, Valor, Valores } from '../menus/tipos'
import type { CasoAnestesico } from '../types'
import { anestesiologoActual } from '../utils/caso'
import { formatHora } from '../utils/tiempo'
import { Badge, Button, Section } from './ui'

type Patch = (fn: (c: CasoAnestesico) => Partial<CasoAnestesico>) => void

export function AccesosVascularesSection({ caso, patch }: { caso: CasoAnestesico; patch: Patch }) {
  const version = versionMenu(caso)
  const paciente = pacienteMenu(caso.paciente)
  const [borrador, setBorrador] = useState<Valores | null>(null)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [anulandoId, setAnulandoId] = useState<string | null>(null)
  const [verAnulados, setVerAnulados] = useState(false)

  // Tras elegir el tipo se muestran de una los datos comunes y los del tipo; sin tipo, solo el selector.
  const secciones = useMemo(() => SECCIONES_ACCESO.filter((s) => s.id === 'tipo' || (borrador && 'acc.tipo' in borrador && s.id !== 'tipo')), [borrador])
  const vis = useMemo(() => (borrador ? calcularVisibilidad(DEF_ACCESOS, borrador, version) : null), [borrador, version])
  const vivos = caso.accesosVasculares.filter((a) => !a.anulado).sort((a, b) => a.hora.localeCompare(b.hora))
  const anulados = caso.accesosVasculares.filter((a) => a.anulado)
  const original = caso.accesosVasculares.find((a) => a.id === editandoId)
  const pendientes = borrador && vis ? faltantes(SECCIONES_ACCESO, borrador, vis, version) : []

  function cambiar(campo: CampoDef, nuevo: Valor | undefined) {
    setBorrador((b) => (b ? aplicarCambio(campo, b, nuevo, new Date().toISOString()) : b))
  }
  function aux(clave: string, valor: Valor | undefined) {
    setBorrador((b) => {
      if (!b) return b
      const r = { ...b }
      if (valor === undefined) delete r[clave]
      else r[clave] = valor
      return r
    })
  }
  function cerrar() {
    setBorrador(null)
    setEditandoId(null)
  }

  function guardar() {
    if (!borrador || !vis || pendientes.length) return
    const valores = soloVisibles(SECCIONES_ACCESO, borrador, vis)
    const horaCampo = typeof valores['acc.hora'] === 'string' ? valores['acc.hora'] : undefined
    patch((c) => {
      const usuario = anestesiologoActual(c) || 'sin definir'
      if (original) {
        const hora = horaCampo ?? original.hora
        const historial = [...(original.historial ?? []), { usuario, hora: new Date().toISOString() }]
        return { accesosVasculares: c.accesosVasculares.map((x) => (x.id === original.id ? { ...x, hora, valores: { ...valores, 'acc.hora': hora }, historial } : x)) }
      }
      const hora = horaCampo ?? new Date().toISOString()
      return { accesosVasculares: [...c.accesosVasculares, { id: crypto.randomUUID(), hora, valores: { ...valores, 'acc.hora': hora } }] }
    })
    cerrar()
  }

  const marcar = (id: string, fn: (a: RegistroMenu, usuario: string) => RegistroMenu) =>
    patch((c) => ({ accesosVasculares: c.accesosVasculares.map((x) => (x.id === id ? fn(x, anestesiologoActual(c) || 'sin definir') : x)) }))

  return (
    <Section title="Accesos vasculares" actions={<SelectorVersion caso={caso} onCambiar={(v) => patch(() => ({ versionMenus: v }))} />}>
      {vivos.length > 0 && (
        <ul className="mb-4 flex flex-col gap-2">
          {vivos.map((a) => (
            <li key={a.id} className={`rounded-xl border px-3 py-2 ${a.retiro ? 'border-slate-200 bg-slate-100' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditandoId(a.id)
                    setBorrador({ ...a.valores })
                  }}
                  className="min-h-[44px] flex-1 text-left"
                  aria-label="Editar acceso"
                >
                  <p className={`font-semibold ${a.retiro ? 'text-slate-500' : 'text-slate-900'}`}>{tarjetaAcceso(a, formatHora)}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {a.valores['acc.estado_llegada'] === 'flebitis' && <Badge tone="amber">Flebitis</Badge>}
                    {a.valores['acc.estado_llegada'] === 'no_funciona' && <Badge tone="red">No funciona</Badge>}
                    {a.retiro && <Badge tone="slate">Retirado {formatHora(a.retiro.hora)}</Badge>}
                    {a.historial && a.historial.length > 0 && (
                      <span className="text-xs text-slate-500">
                        Modificado por {a.historial[a.historial.length - 1].usuario} a las {formatHora(a.historial[a.historial.length - 1].hora)}
                      </span>
                    )}
                  </div>
                </button>
                <div className="flex shrink-0 gap-1">
                  {!a.retiro && (
                    <button
                      type="button"
                      onClick={() => marcar(a.id, (x, usuario) => ({ ...x, retiro: { hora: new Date().toISOString(), usuario } }))}
                      className="min-h-[36px] px-2 text-xs text-sky-600"
                    >
                      Retirar
                    </button>
                  )}
                  <button type="button" onClick={() => setAnulandoId(a.id)} className="min-h-[36px] px-2 text-xs text-rose-500">
                    Borrar
                  </button>
                </div>
              </div>
              {anulandoId === a.id && (
                <Anular
                  onConfirmar={(motivo) => {
                    marcar(a.id, (x, usuario) => ({ ...x, anulado: { motivo, usuario, hora: new Date().toISOString() } }))
                    setAnulandoId(null)
                    if (editandoId === a.id) cerrar()
                  }}
                  onCancelar={() => setAnulandoId(null)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {anulados.length > 0 && (
        <div className="mb-3">
          <button type="button" className="min-h-[32px] text-xs text-slate-500 underline" onClick={() => setVerAnulados((v) => !v)}>
            {verAnulados ? 'Ocultar' : 'Ver'} accesos anulados ({anulados.length})
          </button>
          {verAnulados && (
            <ul className="mt-1 flex flex-col gap-1 text-sm text-slate-500">
              {anulados.map((a) => (
                <li key={a.id}>
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

      <div className={`rounded-xl border p-3 ${original ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
        {borrador && vis ? (
          <>
            <p className="mb-3 text-sm font-semibold text-slate-700">{original ? `Editar acceso de las ${formatHora(original.hora)}` : 'Agregar acceso'}</p>
            <FormularioMenu
              secciones={secciones}
              valores={borrador}
              version={version}
              visibilidad={vis}
              mostrarTitulosSeccion
              onCambiar={cambiar}
              onAux={aux}
              sugerencia={(id) => sugerirAcceso(id, version, paciente, borrador)}
            />
            {pendientes.length > 0 && <p className="mt-3 text-sm text-amber-800">Faltan: {pendientes.map((p) => p.etiqueta).join(' · ')}</p>}
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={cerrar}>
                Cancelar
              </Button>
              <Button disabled={pendientes.length > 0} onClick={guardar}>
                {original ? 'Guardar cambios' : 'Guardar acceso'}
              </Button>
            </div>
          </>
        ) : (
          <Button onClick={() => setBorrador({})}>+ Agregar acceso</Button>
        )}
      </div>
    </Section>
  )
}
