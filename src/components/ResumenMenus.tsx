import { DEF_ACCESOS, SECCIONES_ACCESO, tarjetaAcceso } from '../menus/accesos'
import { calcularVisibilidad, textoValor } from '../menus/motor'
import { versionMenu } from '../menus/paciente'
import type { MenuDef, SeccionDef, Valores } from '../menus/tipos'
import { DEF_VIA, registrosVivos, SECCIONES_VIA, tarjetaVia } from '../menus/viaAerea'
import type { CasoAnestesico } from '../types'
import { formatHora } from '../utils/tiempo'

function lineas(def: MenuDef, s: SeccionDef, valores: Valores, visibles?: Set<string>): { etiqueta: string; texto: string }[] {
  return s.campos
    .filter((c) => c.id in valores && (!visibles || visibles.has(c.id)))
    .map((c) => ({ etiqueta: c.etiqueta, texto: textoValor(def, c, valores) }))
    .filter((l) => l.texto)
}

function Lista({ items }: { items: { etiqueta: string; texto: string }[] }) {
  return (
    <ul className="ml-4 list-disc text-sm text-slate-700">
      {items.map((l) => (
        <li key={l.etiqueta}>
          {l.etiqueta}: {l.texto}
        </li>
      ))}
    </ul>
  )
}

export function ResumenAccesos({ caso }: { caso: CasoAnestesico }) {
  const vivos = caso.accesosVasculares.filter((a) => !a.anulado).sort((a, b) => a.hora.localeCompare(b.hora))
  const anulados = caso.accesosVasculares.filter((a) => a.anulado)
  return (
    <div className="flex flex-col gap-2">
      {vivos.map((a) => (
        <div key={a.id}>
          <p className="text-sm font-semibold text-slate-800">
            {tarjetaAcceso(a, formatHora)}
            {a.retiro && <span className="ml-2 font-normal text-slate-500">· retirado {formatHora(a.retiro.hora)}</span>}
          </p>
          <Lista items={SECCIONES_ACCESO.flatMap((s) => lineas(DEF_ACCESOS, s, a.valores)).filter((l) => !['Tipo de acceso', 'Hora de instalación'].includes(l.etiqueta))} />
          {a.historial && a.historial.length > 0 && (
            <p className="text-xs text-slate-500">
              Modificado por {a.historial[a.historial.length - 1].usuario} a las {formatHora(a.historial[a.historial.length - 1].hora)}
            </p>
          )}
        </div>
      ))}
      {anulados.map((a) => (
        <p key={a.id} className="text-xs text-slate-500">
          <span className="line-through">{tarjetaAcceso(a, formatHora)}</span> — anulado por {a.anulado?.usuario} a las {a.anulado ? formatHora(a.anulado.hora) : ''}: {a.anulado?.motivo}
        </p>
      ))}
    </div>
  )
}

export function ResumenViaAerea({ caso }: { caso: CasoAnestesico }) {
  const version = versionMenu(caso)
  const vivos = registrosVivos(caso)
  const anulados = caso.viaAereaMenu.registros.filter((r) => r.anulado)
  return (
    <div className="flex flex-col gap-3">
      {vivos.map((r) => {
        const vis = calcularVisibilidad(DEF_VIA, r.valores, version)
        const ultimo = r.historial?.[r.historial.length - 1]
        return (
          <div key={r.id}>
            <p className="text-sm font-semibold text-slate-800">{tarjetaVia(r, formatHora)}</p>
            <Lista items={SECCIONES_VIA.filter((s) => vis.secciones.has(s.id)).flatMap((s) => lineas(DEF_VIA, s, r.valores, vis.campos)).filter((l) => l.etiqueta !== 'Vía aérea')} />
            {ultimo && (
              <p className="text-xs text-slate-500">
                Modificado por {ultimo.usuario} a las {formatHora(ultimo.hora)}
              </p>
            )}
          </div>
        )
      })}
      {anulados.map((r) => (
        <p key={r.id} className="text-xs text-slate-500">
          <span className="line-through">{tarjetaVia(r, formatHora)}</span> — anulado por {r.anulado?.usuario} a las {r.anulado ? formatHora(r.anulado.hora) : ''}: {r.anulado?.motivo}
        </p>
      ))}
    </div>
  )
}
