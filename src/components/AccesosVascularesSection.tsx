import { useState } from 'react'
import { CALIBRES_VVP, TIPOS_ACCESO, UBICACIONES_ACCESO, UBICACIONES_VVC_CON_LADO } from '../constants'
import type { AccesoVascular, TipoAcceso } from '../types'
import { chequeoVVC, tituloAcceso, ubicacionAcceso } from '../utils/accesos'
import { formatHora } from '../utils/tiempo'
import { BotonesAgregar } from './farmacos/BotonesAgregar'
import { Field, Pill, Section, Select } from './ui'

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
}: {
  accesos: AccesoVascular[]
  onAgregar: (a: AccesoVascular) => void
  onEliminar: (id: string) => void
}) {
  const [borrador, setBorrador] = useState<Borrador>(BORRADOR_VACIO)
  const { tipo } = borrador
  const ubicaciones = tipo ? UBICACIONES_ACCESO[tipo] : []
  const pideLado = tipo === 'VVC' && UBICACIONES_VVC_CON_LADO.includes(borrador.ubicacion)
  const listo = tipo !== null && borrador.ubicacion !== '' && (tipo !== 'VVP' || borrador.calibre !== '')
  const ordenados = [...accesos].sort((a, b) => a.hora.localeCompare(b.hora))

  function agregar(hora?: string) {
    if (!tipo || !listo) return
    onAgregar({
      id: crypto.randomUUID(),
      hora: hora ?? new Date().toISOString(),
      tipo,
      ubicacion: borrador.ubicacion,
      lado: pideLado ? borrador.lado : '',
      calibre: tipo === 'VVP' ? borrador.calibre : '',
      tecnicaEsteril: tipo === 'VVC' && borrador.tecnicaEsteril,
      apoyoRadioscopia: tipo === 'VVC' && borrador.apoyoRadioscopia,
      ecoguiado: tipo === 'VVC' && borrador.ecoguiado,
    })
    setBorrador(BORRADOR_VACIO)
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
              <button type="button" onClick={() => onEliminar(a.id)} className="min-h-[36px] shrink-0 px-2 text-xs text-rose-500">
                Borrar
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-slate-200 p-3">
        <p className="mb-2 text-sm font-medium text-slate-600">Agregar acceso</p>
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

            <div className="mt-3">
              <BotonesAgregar
                listo={listo}
                etiquetaAhora="Agregar ahora"
                etiquetaPersonalizada="Agregar a hora personalizada"
                onAgregar={agregar}
              />
            </div>
          </>
        )}
      </div>
    </Section>
  )
}

function Casilla({ etiqueta, marcada, onAlternar }: { etiqueta: string; marcada: boolean; onAlternar: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcada}
      onClick={onAlternar}
      className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
        marcada ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-800 hover:border-sky-300'
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-base font-bold leading-none ${
          marcada ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-400 bg-white text-transparent'
        }`}
        aria-hidden="true"
      >
        ✓
      </span>
      {etiqueta}
    </button>
  )
}
