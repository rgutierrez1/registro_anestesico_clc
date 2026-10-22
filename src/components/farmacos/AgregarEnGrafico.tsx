import { useState } from 'react'
import { obtenerFarmaco } from '../../data/catalogoFarmacos'
import type { CasoAnestesico, ItemCarrito } from '../../types'
import {
  claveFarmaco,
  crearItemCarrito,
  crearItemPersonalizado,
  ETIQUETA_EVENTO,
  ID_PERSONALIZADO,
  infusionActivaEn,
  infusionesActivas,
  itemListo,
  ultimoEventoMs,
} from '../../utils/farmacos'
import { formatHora, hhmmLocal, horaCercanaIso } from '../../utils/tiempo'
import { Badge, Button, Field, Input } from '../ui'
import { CamposDosis } from './CamposDosis'
import type { DestinoAgregar } from './LineaTiempoFarmacos'

function itemInicial(destino: DestinoAgregar, caso: CasoAnestesico): ItemCarrito {
  const def = obtenerFarmaco(destino.farmacoId)
  if (def) return crearItemCarrito(def, caso.paciente)
  const previo = [...caso.farmacos].reverse().find((r) => r.farmacoId === ID_PERSONALIZADO && r.nombre === destino.nombre)
  return { ...crearItemPersonalizado(), nombre: destino.nombre, unidad: previo?.unidad ?? 'mg', via: previo?.via ?? 'IV' }
}

export function AgregarEnGrafico({
  destino,
  caso,
  onAgregar,
  onFinalizar,
  onCerrar,
}: {
  destino: DestinoAgregar
  caso: CasoAnestesico
  onAgregar: (item: ItemCarrito, hora: string) => void
  onFinalizar: (clave: string, hora: string) => void
  onCerrar: () => void
}) {
  const def = obtenerFarmaco(destino.farmacoId)
  const clave = claveFarmaco(destino.farmacoId, destino.nombre)
  const [item, setItem] = useState(() => itemInicial(destino, caso))
  const [hora, setHora] = useState(() => hhmmLocal(new Date(destino.t).toISOString()))

  const iso = hora ? horaCercanaIso(hora, new Date(destino.t).toISOString()) : null
  const t = iso ? Date.parse(iso) : null
  const futura = t !== null && t > Date.now() + 60000
  const continuo = def?.administracion === 'continuo'
  const activaAhora = infusionesActivas(caso.farmacos).some((a) => a.clave === clave)
  const ultimo = ultimoEventoMs(caso.farmacos, clave)
  const puedeFinalizar = continuo && activaAhora && t !== null && (ultimo === null || t > ultimo)
  const evento: 'bolo' | 'inicio' | 'cambio' =
    !continuo ? 'bolo' : t !== null && infusionActivaEn(caso.farmacos, clave, t) ? 'cambio' : 'inicio'
  const nombre = def?.etiqueta ?? destino.nombre

  return (
    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
      <p className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-amber-900">
        Agregar al gráfico: {nombre}
        {def && <Badge tone={continuo ? 'green' : 'sky'}>{def.modoLabel}</Badge>}
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Field label="Hora de administración">
            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </Field>
          {futura && <p className="mt-1 text-sm text-rose-700">La hora no puede ser posterior a la hora actual.</p>}
          {continuo && t !== null && !futura && (
            <p className="mt-1 text-xs text-slate-600">
              Se registrará como: <strong>{ETIQUETA_EVENTO[evento]}</strong>
            </p>
          )}
        </div>
        <div>
          <CamposDosis item={item} paciente={caso.paciente} onCambiar={setItem} etiquetaDosis="Dosis" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCerrar}>
          Cancelar
        </Button>
        {puedeFinalizar && iso && (
          <Button size="sm" variant="danger" disabled={futura} onClick={() => onFinalizar(clave, iso)}>
            Finalizar infusión a las {formatHora(iso)}
          </Button>
        )}
        <Button size="sm" disabled={!itemListo(item) || !iso || futura} onClick={() => iso && onAgregar(item, iso)}>
          {continuo ? (evento === 'cambio' ? 'Cambiar dosis' : 'Iniciar') : 'Agregar'} a las {hora || '--:--'}
        </Button>
      </div>
    </div>
  )
}
