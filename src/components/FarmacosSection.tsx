import { useMemo, useState } from 'react'
import type { FarmacoDef } from '../data/catalogoFarmacos'
import { CATALOGO_ELEGIBLE, CATEGORIAS_FARMACO } from '../data/catalogoFarmacos'
import { PACKS_FARMACOS } from '../data/packsFarmacos'
import type { CasoAnestesico, ItemCarrito } from '../types'
import {
  agregarFarmacoAlCarrito,
  agregarRegistroDesdeItem,
  alternarFarmacoEnCarrito,
  aplicarPack,
  editarRegistro,
  cambiarHoraRegistro,
  cambiarInfusion,
  crearItemPersonalizado,
  finalizarInfusion,
  infusionesActivas,
  registrarItems,
} from '../utils/farmacos'
import { hitosDelCaso } from '../utils/hitos'
import { AgregarEnGrafico } from './farmacos/AgregarEnGrafico'
import { Carrito } from './farmacos/Carrito'
import { Catalogo } from './farmacos/Catalogo'
import { EditorHoraFarmaco } from './farmacos/EditorHoraFarmaco'
import { HistorialFarmacos } from './farmacos/HistorialFarmacos'
import { InfusionesActivas } from './farmacos/InfusionesActivas'
import { LineaTiempoFarmacos, type DestinoAgregar } from './farmacos/LineaTiempoFarmacos'
import { Field, Section, Select } from './ui'

function IconoJeringa() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m18 2 4 4" />
      <path d="m17 7 3-3" />
      <path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" />
      <path d="m9 11 4 4" />
      <path d="m5 19-3 3" />
      <path d="m14 4 6 6" />
    </svg>
  )
}

export function FarmacosSection({
  caso,
  onActualizar,
}: {
  caso: CasoAnestesico
  onActualizar: (fn: (c: CasoAnestesico) => Partial<CasoAnestesico>) => void
}) {
  const activas = useMemo(() => infusionesActivas(caso.farmacos), [caso.farmacos])
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [agregando, setAgregando] = useState<DestinoAgregar | null>(null)
  const registroEditando = caso.farmacos.find((f) => f.id === editandoId)
  const enCarrito = useMemo(() => new Set(caso.carritoFarmacos.map((i) => i.farmacoId)), [caso.carritoFarmacos])

  function cambiarItem(item: ItemCarrito) {
    onActualizar((c) => ({ carritoFarmacos: c.carritoFarmacos.map((i) => (i.id === item.id ? item : i)) }))
  }

  return (
    <Section title="Fármacos">
      <Field label="Packs de fármacos" className="mb-4 max-w-sm">
        <Select
          value=""
          onChange={(e) => {
            const pack = PACKS_FARMACOS.find((p) => p.id === e.target.value)
            if (pack) onActualizar((c) => aplicarPack(c, pack))
          }}
        >
          <option value="">Cargar pack en el carrito…</option>
          {PACKS_FARMACOS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </Select>
      </Field>

      <InfusionesActivas
        activas={activas}
        onCambiar={(clave, valor) => onActualizar((c) => cambiarInfusion(c, clave, valor))}
        onFinalizar={(clave) => onActualizar((c) => finalizarInfusion(c, clave))}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Catalogo
          seleccionados={enCarrito}
          onAlternar={(def: FarmacoDef) => onActualizar((c) => alternarFarmacoEnCarrito(c, def))}
        />
        <Carrito
          items={caso.carritoFarmacos}
          paciente={caso.paciente}
          onCambiar={cambiarItem}
          onQuitar={(id) => onActualizar((c) => ({ carritoFarmacos: c.carritoFarmacos.filter((i) => i.id !== id) }))}
          onRegistrar={(ids, hora) => onActualizar((c) => registrarItems(c, ids, hora))}
          onVaciar={() => onActualizar(() => ({ carritoFarmacos: [] }))}
          onSoltar={(def) => onActualizar((c) => agregarFarmacoAlCarrito(c, def))}
          onAgregarPersonalizado={() =>
            onActualizar((c) => ({ carritoFarmacos: [...c.carritoFarmacos, crearItemPersonalizado()] }))
          }
        />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-700">Registro gráfico de fármacos</h3>
          <div
            title="Agregar fármaco en el gráfico"
            className="relative inline-flex h-[44px] w-[44px] items-center justify-center rounded-xl bg-sky-600 text-white transition-colors focus-within:ring-2 focus-within:ring-sky-300 hover:bg-sky-700"
          >
            <IconoJeringa />
            <span className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white text-sm font-bold leading-none text-sky-700 shadow ring-1 ring-sky-200">
              +
            </span>
            <select
              value=""
              aria-label="Agregar fármaco en el gráfico"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              onChange={(e) => {
                const def = CATALOGO_ELEGIBLE.find((f) => f.id === e.target.value)
                if (!def) return
                setEditandoId(null)
                setAgregando({ farmacoId: def.id, nombre: def.nombre, t: Date.now() })
              }}
            >
              <option value="">Agregar fármaco…</option>
              {CATEGORIAS_FARMACO.map((categoria) => (
                <optgroup key={categoria} label={categoria}>
                  {CATALOGO_ELEGIBLE.filter((f) => f.categoria === categoria).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.etiqueta}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
        {caso.farmacos.length === 0 && !agregando && (
          <p className="rounded-lg border border-dashed border-slate-300 py-5 text-center text-sm text-slate-400">
            Todavía no hay fármacos registrados. Elegí uno arriba para agregarlo directamente en el gráfico.
          </p>
        )}
        <LineaTiempoFarmacos
          registros={caso.farmacos}
          inicio={caso.horaInicioAnestesia}
          fin={caso.horaFinAnestesia}
          onCambiarHora={(id, hora) => onActualizar((c) => cambiarHoraRegistro(c, id, hora))}
          onSeleccionar={(id) => {
            setAgregando(null)
            setEditandoId(id)
          }}
          seleccionadoId={editandoId}
          onAgregarEn={(fila, t) => {
            setEditandoId(null)
            setAgregando({ ...fila, t })
          }}
          agregando={agregando}
          hitos={hitosDelCaso(caso)}
        />
        {agregando && (
          <AgregarEnGrafico
            key={`${agregando.farmacoId}:${agregando.nombre}:${agregando.t}`}
            destino={agregando}
            caso={caso}
            onAgregar={(item, hora) => {
              onActualizar((c) => agregarRegistroDesdeItem(c, item, hora))
              setAgregando(null)
            }}
            onFinalizar={(clave, hora) => {
              onActualizar((c) => finalizarInfusion(c, clave, hora))
              setAgregando(null)
            }}
            onCerrar={() => setAgregando(null)}
          />
        )}
        {registroEditando && (
          <EditorHoraFarmaco
            key={registroEditando.id}
            registro={registroEditando}
            registros={caso.farmacos}
            onGuardar={(hora, valor) => {
              onActualizar((c) => editarRegistro(c, registroEditando.id, hora, valor))
              setEditandoId(null)
            }}
            onCerrar={() => setEditandoId(null)}
          />
        )}
      </div>

      <div className="mt-5">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Historial</h3>
        <HistorialFarmacos
          registros={caso.farmacos}
          onEliminar={(id) => onActualizar((c) => ({ farmacos: c.farmacos.filter((f) => f.id !== id) }))}
        />
      </div>
    </Section>
  )
}
