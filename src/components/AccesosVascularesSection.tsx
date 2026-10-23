import { useState } from 'react'
import { CALIBRES_VVP, TIPOS_ACCESO, UBICACIONES_ACCESO, UBICACIONES_VVC_CON_LADO } from '../constants'
import type { AccesoVascular, TipoAcceso } from '../types'
import { chequeoVVC, tituloAcceso, ubicacionAcceso } from '../utils/accesos'
import { formatHora, hhmmLocal, horaCercanaIso } from '../utils/tiempo'
import { BotonesAgregar } from './farmacos/BotonesAgregar'
import { Button, Casilla, Field, Input, Pill, Section, Select } from './ui'

interface Borrador {
  tipo: TipoAcceso | null
  ubicacion: string
  lado: AccesoVascular['lado']
  calibre: string
  tecnicaEsteril: boolean
  apoyoRadioscopia: boolean
  ecoguiado: boolean
}

const BORRADOR_VACIO: Borrador = {
  tipo: null,
  ubicacion: '',
  lado: '',
  calibre: '',
  tecnicaEsteril: false,
  apoyoRadioscopia: false,
  ecoguiado: false,
}

export function AccesosVascularesSection({
  accesos,
  onAgregar,
  onEliminar,
  onEditar,
}: {
  accesos: AccesoVascular[]
  onAgregar: (a: AccesoVascular) => void
  onEliminar: (id: string) => void
  onEditar: (a: AccesoVascular) => void
}) {
  const [borrador, setBorrador] = useState<Borrador>(BORRADOR_VACIO)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [horaEdicion, setHoraEdicion] = useState('')
  const [errorEdicion, setErrorEdicion] = useState('')
  const original = accesos.find((a) => a.id === editandoId)
  const { tipo } = borrador
  const ubicaciones = tipo ? UBICACIONES_ACCESO[tipo] : []
  const pideLado = tipo === 'VVC' && UBICACIONES_VVC_CON_LADO.includes(borrador.ubicacion)
  const listo = tipo !== null && borrador.ubicacion !== '' && (tipo !== 'VVP' || borrador.calibre !== '')
  const ordenados = [...accesos].sort((a, b) => a.hora.localeCompare(b.hora))

  function construir(id: string, hora: string): AccesoVascular | null {
    if (!tipo || !listo) return null
    return {
      id,
      hora,
      tipo,
      ubicacion: borrador.ubicacion,
      lado: pideLado ? borrador.lado : '',
      calibre: tipo === 'VVP' ? borrador.calibre : '',
      tecnicaEsteril: tipo === 'VVC' && borrador.tecnicaEsteril,
      apoyoRadioscopia: tipo === 'VVC' && borrador.apoyoRadioscopia,
      ecoguiado: tipo === 'VVC' && borrador.ecoguiado,
    }
  }

  function agregar(hora?: string) {
    const nuevo = construir(crypto.randomUUID(), hora ?? new Date().toISOString())
    if (!nuevo) return
    onAgregar(nuevo)
    setBorrador(BORRADOR_VACIO)
  }

  function empezarEdicion(a: AccesoVascular) {
    setEditandoId(a.id)
    setHoraEdicion(hhmmLocal(a.hora))
    setErrorEdicion('')
    setBorrador({
      tipo: a.tipo,
      ubicacion: a.ubicacion,
      lado: a.lado,
      calibre: a.calibre,
      tecnicaEsteril: a.tecnicaEsteril,
      apoyoRadioscopia: a.apoyoRadioscopia,
      ecoguiado: a.ecoguiado,
    })
  }

  function cancelarEdicion() {
    setEditandoId(null)
    setBorrador(BORRADOR_VACIO)
  }

  function guardarEdicion() {
    if (!original || !horaEdicion) return
    const iso = horaCercanaIso(horaEdicion, original.hora)
    if (Date.parse(iso) > Date.now() + 60000) return setErrorEdicion('La hora no puede ser posterior a la hora actual.')
    const editado = construir(original.id, iso)
    if (!editado) return
    onEditar(editado)
    cancelarEdicion()
  }

  return (
    <Section title="Accesos vasculares">
      {ordenados.length > 0 && (
        <ul className="mb-4 flex flex-col gap-2">
          {ordenados.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div>
                <p className="font-semibold text-slate-900">
                  {tituloAcceso(a)} <span className="font-normal text-slate-600">· {ubicacionAcceso(a)}</span>
                </p>
                <p className="text-sm text-slate-500">
                  Colocado a las {formatHora(a.hora)}
                  {a.tipo === 'VVC' && (
                    <>
                      {' · '}
                      {chequeoVVC(a).map((c) => `${c.etiqueta}: ${c.hecho ? 'sí' : 'no'}`).join(' · ')}
                    </>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => empezarEdicion(a)} className="min-h-[36px] px-2 text-xs text-sky-600">
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (editandoId === a.id) cancelarEdicion()
                    onEliminar(a.id)
                  }}
                  className="min-h-[36px] px-2 text-xs text-rose-500"
                >
                  Borrar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className={`rounded-xl border p-3 ${original ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
        <p className="mb-2 text-sm font-medium text-slate-600">
          {original ? `Editar acceso colocado a las ${formatHora(original.hora)}` : 'Agregar acceso'}
        </p>
        <div className="flex flex-wrap gap-2">
          {TIPOS_ACCESO.map((t) => (
            <Pill key={t.id} active={tipo === t.id} onClick={() => setBorrador({ ...BORRADOR_VACIO, tipo: t.id })}>
              {t.etiqueta}
            </Pill>
          ))}
        </div>

        {tipo && (
          <>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Ubicación">
                <Select
                  value={borrador.ubicacion}
                  onChange={(e) => setBorrador((b) => ({ ...b, ubicacion: e.target.value, lado: '' }))}
                >
                  <option value="">Seleccionar…</option>
                  {ubicaciones.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </Select>
              </Field>
              {tipo === 'VVP' && (
                <Field label="Tamaño de la vía">
                  <Select value={borrador.calibre} onChange={(e) => setBorrador((b) => ({ ...b, calibre: e.target.value }))}>
                    <option value="">Seleccionar…</option>
                    {CALIBRES_VVP.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              {pideLado && (
                <Field label="Lado (opcional)">
                  <Select
                    value={borrador.lado}
                    onChange={(e) => setBorrador((b) => ({ ...b, lado: e.target.value as Borrador['lado'] }))}
                  >
                    <option value="">Sin especificar</option>
                    <option value="Derecho">Derecho</option>
                    <option value="Izquierdo">Izquierdo</option>
                  </Select>
                </Field>
              )}
            </div>

            {tipo === 'VVC' && (
              <div className="mt-3">
                <p className="mb-2 text-sm font-medium text-slate-600">Lista de chequeo</p>
                <div className="flex flex-wrap gap-2">
                  <Casilla
                    etiqueta="Técnica estéril"
                    marcada={borrador.tecnicaEsteril}
                    onAlternar={() => setBorrador((b) => ({ ...b, tecnicaEsteril: !b.tecnicaEsteril }))}
                  />
                  <Casilla
                    etiqueta="Apoyo radioscopia"
                    marcada={borrador.apoyoRadioscopia}
                    onAlternar={() => setBorrador((b) => ({ ...b, apoyoRadioscopia: !b.apoyoRadioscopia }))}
                  />
                  <Casilla
                    etiqueta="Ecoguiado"
                    marcada={borrador.ecoguiado}
                    onAlternar={() => setBorrador((b) => ({ ...b, ecoguiado: !b.ecoguiado }))}
                  />
                </div>
              </div>
            )}

            {original ? (
              <div className="mt-3 flex flex-wrap items-end gap-2">
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
                <Button size="sm" disabled={!listo || !horaEdicion} onClick={guardarEdicion}>
                  Guardar cambios
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelarEdicion}>
                  Cancelar
                </Button>
                {errorEdicion && <p className="w-full text-sm text-rose-700">{errorEdicion}</p>}
              </div>
            ) : (
              <div className="mt-3">
                <BotonesAgregar
                  listo={listo}
                  etiquetaAhora="Agregar ahora"
                  etiquetaPersonalizada="Agregar a hora personalizada"
                  onAgregar={agregar}
                />
              </div>
            )}
          </>
        )}
      </div>
    </Section>
  )
}
