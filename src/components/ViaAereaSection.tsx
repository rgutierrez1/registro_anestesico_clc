import { useMemo, useState } from 'react'
import { FormularioMenu } from '../menus/componentes/FormularioMenu'
import { SelectorVersion } from '../menus/componentes/SelectorVersion'
import { aplicarCambio, calcularVisibilidad, soloVisibles } from '../menus/motor'
import type { CampoDef, Valor, Valores } from '../menus/tipos'
import { DEF_VIA, defaultsVia, estadoVia, faltantesVia, SECCIONES_VIA, sugerenciaVia } from '../menus/viaAerea'
import type { CasoAnestesico } from '../types'
import { anestesiologoActual } from '../utils/caso'
import { formatHora } from '../utils/tiempo'
import { Badge, Button, Section } from './ui'

type Patch = (fn: (c: CasoAnestesico) => Partial<CasoAnestesico>) => void

export function ViaAereaSection({ caso, patch }: { caso: CasoAnestesico; patch: Patch }) {
  const guardado = caso.viaAereaMenu.valores
  const historial = caso.viaAereaMenu.historial
  const [borrador, setBorrador] = useState<Valores>(() => ({ ...defaultsVia(), ...guardado }))
  const estado = useMemo(() => estadoVia(caso, borrador), [caso, borrador])
  const pendientes = faltantesVia(estado)
  const aGuardar = soloVisibles(SECCIONES_VIA, borrador, estado.visibilidad)
  const yaGuardado = Object.keys(guardado).length > 0
  const hayCambios = JSON.stringify(aGuardar) !== JSON.stringify(soloVisibles(SECCIONES_VIA, guardado, calcularVisibilidad(DEF_VIA, guardado, estado.version)))

  const cambiar = (campo: CampoDef, nuevo: Valor | undefined) => setBorrador((b) => aplicarCambio(campo, b, nuevo, new Date().toISOString()))
  const aux = (clave: string, valor: Valor | undefined) =>
    setBorrador((b) => {
      const r = { ...b }
      if (valor === undefined) delete r[clave]
      else r[clave] = valor
      return r
    })

  function guardar() {
    if (pendientes.length || !hayCambios) return
    patch((c) => ({
      viaAereaMenu: {
        ...c.viaAereaMenu,
        valores: aGuardar,
        historial: [...c.viaAereaMenu.historial, { usuario: anestesiologoActual(c) || 'sin definir', hora: new Date().toISOString() }],
      },
    }))
  }

  const ultimo = historial[historial.length - 1]

  return (
    <Section
      title="Vía aérea"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <SelectorVersion caso={caso} onCambiar={(v) => patch(() => ({ versionMenus: v }))} />
          {yaGuardado && !hayCambios ? <Badge tone="green">Guardado</Badge> : yaGuardado ? <Badge tone="amber">Cambios sin guardar</Badge> : null}
        </div>
      }
    >
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
      {pendientes.length > 0 && <p className="mt-4 text-sm text-amber-800">Faltan: {pendientes.map((p) => p.etiqueta).join(' · ')}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-slate-500">
          {ultimo && (
            <details>
              <summary className="cursor-pointer">
                Guardado por {ultimo.usuario} a las {formatHora(ultimo.hora)}
                {historial.length > 1 ? ` · ${historial.length} versiones` : ''}
              </summary>
              <ul className="mt-1 list-disc pl-5">
                {historial.map((h, i) => (
                  <li key={i}>
                    {i === 0 ? 'Registrado' : 'Modificado'} por {h.usuario} a las {formatHora(h.hora)}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
        <Button disabled={pendientes.length > 0 || !hayCambios} onClick={guardar}>
          {yaGuardado ? 'Guardar cambios' : 'Guardar vía aérea'}
        </Button>
      </div>
    </Section>
  )
}
