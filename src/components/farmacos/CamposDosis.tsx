import { obtenerFarmaco, type FarmacoDef } from '../../data/catalogoFarmacos'
import type { DatosPaciente, ItemCarrito } from '../../types'
import { dosisSugeridaPorPeso, formatDosis, formatNumero, pesoParaDosificar } from '../../utils/dosis'
import { ID_PERSONALIZADO } from '../../utils/farmacos'
import { Field, Input, Select } from '../ui'

export function CamposDosis({
  item,
  paciente,
  onCambiar,
  etiquetaDosis,
}: {
  item: ItemCarrito
  paciente: DatosPaciente
  onCambiar: (item: ItemCarrito) => void
  etiquetaDosis?: string
}) {
  const def = obtenerFarmaco(item.farmacoId)
  const personalizado = item.farmacoId === ID_PERSONALIZADO
  const unidad = personalizado ? item.unidad : (def?.unidad ?? '')
  const continuo = def?.administracion === 'continuo'
  const manual = item.dosisSel === 'otra'

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
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
          <Field label={etiquetaDosis ?? (continuo ? 'Dosis inicial' : 'Dosis')} className={manual ? '' : 'col-span-2'}>
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
          <Field
            label={`${personalizado ? 'Dosis' : 'Dosis manual'}${unidad ? ` (${unidad})` : ''}`}
            className={personalizado ? 'col-span-2' : ''}
          >
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
      {def?.referencia && <p className="mt-1 text-xs text-slate-500">Referencia: {def.referencia}</p>}
    </>
  )
}

function SugerenciaPeso({ def, paciente }: { def: FarmacoDef; paciente: DatosPaciente }) {
  const peso = pesoParaDosificar(paciente)
  if (!peso || !def.dosisPorKg) {
    return <p className="mt-2 text-xs text-amber-700">Falta el peso del paciente: no se pudo sugerir la dosis.</p>
  }
  const sugerida = dosisSugeridaPorPeso(def, peso.kg) ?? 0
  return (
    <p className="mt-2 text-xs text-slate-500">
      Sugerida: {def.dosisPorKg} {def.unidad}/kg × {formatNumero(Math.round(peso.kg * 10) / 10)} kg ({peso.detalle}) ={' '}
      {formatNumero(sugerida)} {def.unidad}
    </p>
  )
}
