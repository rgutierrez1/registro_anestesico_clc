import { useState } from 'react'
import { obtenerFarmaco, type FarmacoDef } from '../../data/catalogoFarmacos'
import { VIAS_FARMACO } from '../../constants'
import type { DatosPaciente, ItemCarrito, ViaFarmaco } from '../../types'
import { formatDosis, formatNumero, pesoParaDosificar } from '../../utils/dosis'
import { ID_PERSONALIZADO, itemListo } from '../../utils/farmacos'
import { Badge, Button, Field, Input, Select } from '../ui'
import { BotonesAgregar } from './BotonesAgregar'
import { TIPO_DRAG_FARMACO } from './Catalogo'

export function Carrito({
  items,
  paciente,
  onCambiar,
  onQuitar,
  onRegistrar,
  onVaciar,
  onSoltar,
  onAgregarPersonalizado,
}: {
  items: ItemCarrito[]
  paciente: DatosPaciente
  onCambiar: (item: ItemCarrito) => void
  onQuitar: (id: string) => void
  onRegistrar: (ids: string[], hora?: string) => void
  onVaciar: () => void
  onSoltar: (def: FarmacoDef) => void
  onAgregarPersonalizado: () => void
}) {
  const [arrastrando, setArrastrando] = useState(false)
  const listos = items.filter(itemListo)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setArrastrando(true)
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => {
        e.preventDefault()
        setArrastrando(false)
        const def = obtenerFarmaco(e.dataTransfer.getData(TIPO_DRAG_FARMACO))
        if (def) onSoltar(def)
      }}
      className={`flex min-h-[200px] flex-col gap-3 rounded-xl border-2 border-dashed p-3 transition-colors ${
        arrastrando ? 'border-sky-500 bg-sky-50' : 'border-slate-300 bg-slate-50'
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Carrito ({items.length})</h3>
        {items.length > 0 && (
          <button type="button" onClick={onVaciar} className="min-h-[36px] px-2 text-xs text-rose-500">
            Vaciar
          </button>
        )}
      </div>

      {items.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-400">
          Tocá o arrastrá fármacos acá para prepararlos, completá las dosis y registrá.
        </p>
      )}

      {items.map((item) => (
        <FilaCarrito
          key={item.id}
          item={item}
          paciente={paciente}
          onCambiar={onCambiar}
          onQuitar={() => onQuitar(item.id)}
          onRegistrar={(hora) => onRegistrar([item.id], hora)}
        />
      ))}

      <div>
        <Button variant="secondary" size="sm" onClick={onAgregarPersonalizado}>
          + Fármaco no listado
        </Button>
      </div>

      {listos.length > 1 && (
        <div className="border-t border-slate-200 pt-3">
          <BotonesAgregar
            listo
            etiquetaAhora={`Agregar todos ahora (${listos.length})`}
            etiquetaPersonalizada="Agregar todos a hora personalizada"
            onAgregar={(hora) => onRegistrar(listos.map((i) => i.id), hora)}
          />
        </div>
      )}
    </div>
  )
}

function FilaCarrito({
  item,
  paciente,
  onCambiar,
  onQuitar,
  onRegistrar,
}: {
  item: ItemCarrito
  paciente: DatosPaciente
  onCambiar: (item: ItemCarrito) => void
  onQuitar: () => void
  onRegistrar: (hora?: string) => void
}) {
  const def = obtenerFarmaco(item.farmacoId)
  const personalizado = item.farmacoId === ID_PERSONALIZADO
  const listo = itemListo(item)
  const unidad = personalizado ? item.unidad : (def?.unidad ?? '')
  const continuo = def?.administracion === 'continuo'
  const manual = item.dosisSel === 'otra'

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900">{personalizado ? 'Fármaco no listado' : def?.etiqueta}</span>
          {def && <Badge tone={continuo ? 'green' : 'sky'}>{def.modoLabel}</Badge>}
        </div>
        <button
          type="button"
          onClick={onQuitar}
          aria-label="Quitar del carrito"
          className="min-h-[36px] min-w-[36px] rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {personalizado && (
          <>
            <Field label="Nombre" className="col-span-2">
              <Input value={item.nombre} onChange={(e) => onCambiar({ ...item, nombre: e.target.value })} />
            </Field>
            <Field label="Unidad">
              <Input value={item.unidad} onChange={(e) => onCambiar({ ...item, unidad: e.target.value })} />
            </Field>
            <Field label="Vía">
              <Select value={item.via} onChange={(e) => onCambiar({ ...item, via: e.target.value as ViaFarmaco })}>
                {VIAS_FARMACO.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}

        {def?.presentaciones && (
          <Field label="Modo" className="col-span-2">
            <Select value={item.presentacionId} onChange={(e) => onCambiar({ ...item, presentacionId: e.target.value })}>
              <option value="">Seleccionar…</option>
              {def.presentaciones.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {!personalizado && def && def.dosis.length > 0 && (
          <Field label={continuo ? 'Dosis inicial' : 'Dosis'} className={manual ? '' : 'col-span-2'}>
            <Select value={item.dosisSel} onChange={(e) => onCambiar({ ...item, dosisSel: e.target.value })}>
              <option value="">Seleccionar…</option>
              {def.dosis.map((d) => (
                <option key={d} value={String(d)}>
                  {formatDosis(d, def.unidad)}
                </option>
              ))}
              <option value="otra">Otra (ingreso manual)</option>
            </Select>
          </Field>
        )}

        {manual && (
          <Field label={`${personalizado ? 'Dosis' : 'Dosis manual'}${unidad ? ` (${unidad})` : ''}`} className={personalizado ? 'col-span-2' : ''}>
            <Input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              value={item.dosisManual}
              onChange={(e) => onCambiar({ ...item, dosisManual: e.target.value })}
            />
          </Field>
        )}
      </div>

      {def?.dosisPorKg && <SugerenciaPeso def={def} paciente={paciente} />}

      <div className="mt-3">
        <BotonesAgregar
          listo={listo}
          etiquetaAhora={continuo ? 'Iniciar ahora' : 'Agregar ahora'}
          etiquetaPersonalizada={continuo ? 'Iniciar a hora personalizada' : 'Agregar a hora personalizada'}
          onAgregar={onRegistrar}
        />
      </div>
    </div>
  )
}

function SugerenciaPeso({ def, paciente }: { def: FarmacoDef; paciente: DatosPaciente }) {
  const peso = pesoParaDosificar(paciente)
  if (!peso || !def.dosisPorKg) {
    return <p className="mt-2 text-xs text-amber-700">Falta el peso del paciente: no se pudo sugerir la dosis.</p>
  }
  const calculada = def.dosisPorKg * peso.kg
  return (
    <p className="mt-2 text-xs text-slate-500">
      Sugerida: {def.dosisPorKg} {def.unidad}/kg × {formatNumero(Math.round(peso.kg * 10) / 10)} kg ({peso.detalle}) ={' '}
      {formatNumero(Math.round(calculada))} {def.unidad}
    </p>
  )
}
