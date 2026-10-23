import { DEF_ACCESOS, SECCION_ANTES, SECCIONES_ACCESO, tarjetaAcceso } from '../menus/accesos'
import { textoValor } from '../menus/motor'
import type { MenuDef, SeccionDef, Valores } from '../menus/tipos'
import { activos, DEF_VIA, estadoVia, SECCIONES_CASO, SECCIONES_EVENTO, seccionDeEvento } from '../menus/viaAerea'
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
  const antes = lineas(DEF_ACCESOS, SECCION_ANTES, caso.accesosCaso)
  const vivos = caso.accesosVasculares.filter((a) => !a.anulado).sort((a, b) => a.hora.localeCompare(b.hora))
  const anulados = caso.accesosVasculares.filter((a) => a.anulado)
  return (
    <div className="flex flex-col gap-2">
      {antes.length > 0 && <Lista items={antes} />}
      {vivos.map((a) => (
        <div key={a.id}>
          <p className="text-sm font-semibold text-slate-800">{tarjetaAcceso(a, formatHora)}</p>
          <Lista items={SECCIONES_ACCESO.flatMap((s) => lineas(DEF_ACCESOS, s, a.valores)).filter((l) => !['Tipo de acceso'].includes(l.etiqueta))} />
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
  const estado = estadoVia(caso)
  const vivos = activos(caso.viaAereaMenu.eventos)
  const anulados = caso.viaAereaMenu.eventos.filter((e) => e.anulado)
  return (
    <div className="flex flex-col gap-3">
      {SECCIONES_CASO.filter((s) => estado.visibilidad.secciones.has(s.id)).map((s) => {
        const l = lineas(DEF_VIA, s, estado.valores, estado.visibilidad.campos)
        return l.length ? (
          <div key={s.id}>
            <p className="text-sm font-semibold text-slate-800">
              {s.numero}. {s.titulo}
            </p>
            <Lista items={l} />
          </div>
        ) : null
      })}
      {SECCIONES_EVENTO.map((s) =>
        vivos
          .filter((e) => e.seccion === s.id)
          .map((e) => (
            <div key={e.id}>
              <p className="text-sm font-semibold text-slate-800">
                <span className="mr-2 font-mono text-xs text-slate-400">{formatHora(e.hora)}</span>
                {s.numero}. {s.titulo}
              </p>
              <Lista items={lineas(DEF_VIA, s, e.valores)} />
            </div>
          )),
      )}
      {anulados.map((e) => (
        <p key={e.id} className="text-xs text-slate-500">
          <span className="line-through">
            {formatHora(e.hora)} {seccionDeEvento(e)?.titulo}
          </span>{' '}
          — anulado por {e.anulado?.usuario} a las {e.anulado ? formatHora(e.anulado.hora) : ''}: {e.anulado?.motivo}
        </p>
      ))}
    </div>
  )
}
