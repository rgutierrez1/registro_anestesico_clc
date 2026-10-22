import { useMemo, useState } from 'react'
import type { FarmacoDef } from '../data/catalogoFarmacos'
import { PACKS_FARMACOS } from '../data/packsFarmacos'
import type { CasoAnestesico, ItemCarrito } from '../types'
import {
  agregarFarmacoAlCarrito,
  alternarFarmacoEnCarrito,
  aplicarPack,
  cambiarHoraRegistro,
  cambiarInfusion,
  crearItemPersonalizado,
  finalizarInfusion,
  infusionesActivas,
  registrarItems,
} from '../utils/farmacos'
import { Carrito } from './farmacos/Carrito'
import { Catalogo } from './farmacos/Catalogo'
import { EditorHoraFarmaco } from './farmacos/EditorHoraFarmaco'
import { HistorialFarmacos } from './farmacos/HistorialFarmacos'
import { InfusionesActivas } from './farmacos/InfusionesActivas'
import { LineaTiempoFarmacos } from './farmacos/LineaTiempoFarmacos'
import { Field, Section, Select } from './ui'

export function FarmacosSection({
  caso,
  onActualizar,
}: {
  caso: CasoAnestesico
  onActualizar: (fn: (c: CasoAnestesico) => Partial<CasoAnestesico>) => void
}) {
  const activas = useMemo(() => infusionesActivas(caso.farmacos), [caso.farmacos])
  const [editandoId, setEditandoId] = useState<string | null>(null)
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

      {caso.farmacos.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Registro gráfico de fármacos</h3>
          <LineaTiempoFarmacos
            registros={caso.farmacos}
            inicio={caso.horaInicioAnestesia}
            fin={caso.horaFinAnestesia}
            onCambiarHora={(id, hora) => onActualizar((c) => cambiarHoraRegistro(c, id, hora))}
            onSeleccionar={setEditandoId}
            seleccionadoId={editandoId}
          />
          {registroEditando && (
            <EditorHoraFarmaco
              key={registroEditando.id}
              registro={registroEditando}
              registros={caso.farmacos}
              onGuardar={(hora) => {
                onActualizar((c) => cambiarHoraRegistro(c, registroEditando.id, hora))
                setEditandoId(null)
              }}
              onCerrar={() => setEditandoId(null)}
            />
          )}
        </div>
      )}

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
