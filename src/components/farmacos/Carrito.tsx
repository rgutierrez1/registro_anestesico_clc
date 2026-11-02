import { useState } from 'react'
import { ANTIBIOTICOS, obtenerFarmaco, type FarmacoDef } from '../../data/catalogoFarmacos'
import { VIAS_FARMACO } from '../../constants'
import type { DatosPaciente, ItemCarrito, ViaFarmaco } from '../../types'
import { alergicoPenicilina } from '../../utils/caso'
import { crearItemCarrito, ID_PERSONALIZADO, itemListo } from '../../utils/farmacos'
import { Badge, Button, Field, Input, Select } from '../ui'
import { BotonesAgregar } from './BotonesAgregar'
import { CamposDosis } from './CamposDosis'
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
  const continuo = def?.administracion === 'continuo'

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

      {personalizado && (
        <div className="mb-2 grid grid-cols-2 gap-2">
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
        </div>
      )}

      {def?.grupo === 'antibiotico' && (
        <div className="mb-2">
          <Field label="Antibiótico">
            <Select
              value={def.oculto ? '' : def.id}
              onChange={(e) => {
                const nuevo = obtenerFarmaco(e.target.value || 'antibiotico')
                if (!nuevo) return
                const reemplazo = { ...crearItemCarrito(nuevo, paciente), id: item.id }
                onCambiar(nuevo.oculto ? { ...reemplazo, dosisSel: '' } : reemplazo)
              }}
            >
              <option value="">Elegir…</option>
              {ANTIBIOTICOS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </Select>
          </Field>
          {alergicoPenicilina(paciente) && (
            <p className="mt-1 text-xs text-amber-700">
              {def.oculto ? 'Alergia a penicilina: elegí un antibiótico alternativo.' : def.id === 'cefazolina' ? 'Atención: el paciente tiene alergia a penicilina.' : ''}
            </p>
          )}
        </div>
      )}

      <CamposDosis item={item} paciente={paciente} onCambiar={onCambiar} />

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
