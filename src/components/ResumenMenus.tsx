import { DEF_ACCESOS, SECCIONES_ACCESO, tarjetaAcceso } from '../menus/accesos'
import { calcularVisibilidad, textoValor } from '../menus/motor'
import { versionMenu } from '../menus/paciente'
import type { MenuDef, SeccionDef, Valores } from '../menus/tipos'
import { DEF_VIA, SECCIONES_VIA } from '../menus/viaAerea'
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
  const valores = caso.viaAereaMenu.valores
  const vis = calcularVisibilidad(DEF_VIA, valores, versionMenu(caso))
  const ultimo = caso.viaAereaMenu.historial[caso.viaAereaMenu.historial.length - 1]
  return (
    <div className="flex flex-col gap-3">
      {SECCIONES_VIA.filter((s) => vis.secciones.has(s.id)).map((s) => {
        const l = lineas(DEF_VIA, s, valores, vis.campos)
        return l.length ? (
          <div key={s.id}>
            <p className="text-sm font-semibold text-slate-800">
              {s.numero}. {s.titulo}
            </p>
            <Lista items={l} />
          </div>
        ) : null
      })}
      {ultimo && (
        <p className="text-xs text-slate-500">
          Guardado por {ultimo.usuario} a las {formatHora(ultimo.hora)}
        </p>
      )}
    </div>
  )
}
