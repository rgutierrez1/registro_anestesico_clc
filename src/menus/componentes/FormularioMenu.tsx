import { useEffect, useState, type ReactNode } from 'react'
import { Input } from '../../components/ui'
import { hhmmLocal, horaPersonalizadaIso } from '../../utils/tiempo'
import { alertasDeCampo, claveTexto, CODIGOS_CON_TEXTO, esObligatorio, opcionesVisibles, type Visibilidad } from '../motor'
import type { Sugerencia } from '../sugerencias'
import type { Alerta, CampoDef, ItemChecklist, OpcionDef, SeccionDef, Valor, Valores, VersionMenu } from '../tipos'

const ESTILO_ALERTA: Record<Alerta['nivel'], string> = {
  roja: 'border-rose-300 bg-rose-50 text-rose-800',
  amarilla: 'border-amber-300 bg-amber-50 text-amber-900',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  bloqueo: 'border-rose-400 bg-rose-100 font-semibold text-rose-900',
}

function Chip({
  activo,
  onClick,
  children,
  color,
  sugerido = false,
}: {
  activo: boolean
  onClick: () => void
  children: ReactNode
  color?: string
  sugerido?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`min-h-[44px] rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        activo ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-sky-400'
      } ${sugerido && !activo ? 'ring-2 ring-emerald-300' : ''}`}
    >
      {color && <span className="mr-2 inline-block h-3 w-3 rounded-full border border-slate-400 align-middle" style={{ background: color }} aria-hidden="true" />}
      {children}
    </button>
  )
}

function CampoNumero({ campo, valor, onChange }: { campo: CampoDef; valor: Valor | undefined; onChange: (v: Valor | undefined) => void }) {
  const alternativo = campo.boton_alternativo
  const numero = typeof valor === 'number' ? valor : undefined
  const [texto, setTexto] = useState(numero === undefined ? '' : String(numero).replace('.', ','))
  useEffect(() => {
    setTexto(numero === undefined ? '' : String(numero).replace('.', ','))
  }, [numero])
  const elegidoAlt = alternativo && valor === alternativo.codigo
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="text"
        inputMode="decimal"
        className="w-28"
        value={elegidoAlt ? '' : texto}
        disabled={Boolean(elegidoAlt)}
        onChange={(e) => {
          setTexto(e.target.value)
          const n = Number.parseFloat(e.target.value.replace(',', '.'))
          onChange(e.target.value.trim() === '' || !Number.isFinite(n) ? undefined : n)
        }}
      />
      {campo.unidad && <span className="text-sm text-slate-600">{campo.unidad}</span>}
      {alternativo && (
        <Chip activo={Boolean(elegidoAlt)} onClick={() => onChange(elegidoAlt ? undefined : alternativo.codigo)}>
          {alternativo.etiqueta}
        </Chip>
      )}
      {(campo.min !== undefined || campo.max !== undefined) && (
        <span className="text-xs text-slate-400">
          ({campo.min ?? ''}–{campo.max ?? ''})
        </span>
      )}
    </div>
  )
}

function CampoHora({ valor, onChange }: { valor: Valor | undefined; onChange: (v: Valor | undefined) => void }) {
  const [abierto, setAbierto] = useState(false)
  const [hora, setHora] = useState('')
  const iso = typeof valor === 'string' ? valor : undefined
  return (
    <div className="flex flex-wrap items-center gap-2">
      {iso && <span className="rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm font-semibold text-slate-800">{hhmmLocal(iso)}</span>}
      <Chip activo={false} onClick={() => onChange(new Date().toISOString())}>
        Ahora
      </Chip>
      <Chip
        activo={abierto}
        onClick={() => {
          setHora(hhmmLocal(iso ?? new Date().toISOString()))
          setAbierto((a) => !a)
        }}
      >
        Hora personalizada
      </Chip>
      {abierto && (
        <>
          <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          <Chip
            activo={false}
            onClick={() => {
              if (!hora) return
              onChange(horaPersonalizadaIso(hora))
              setAbierto(false)
            }}
          >
            Fijar
          </Chip>
        </>
      )}
    </div>
  )
}

function SiNo({ valor, onChange }: { valor: Valor | undefined; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      <Chip activo={valor === true} onClick={() => onChange(true)}>
        Sí
      </Chip>
      <Chip activo={valor === false} onClick={() => onChange(false)}>
        No
      </Chip>
    </div>
  )
}

interface Props {
  secciones: SeccionDef[]
  // Valores efectivos (incluye lo que se está editando, lo del caso y los calculados).
  valores: Valores
  version: VersionMenu
  visibilidad: Visibilidad
  onCambiar: (campo: CampoDef, nuevo: Valor | undefined) => void
  onAux: (clave: string, valor: Valor | undefined) => void
  sugerencia?: (campoId: string) => Sugerencia | null
  alertasExtra?: (campoId: string) => Alerta[]
  mostrarTitulosSeccion?: boolean
  // Campos que ya no se piden (p. ej., ocultos por una regla propia de la hoja)
  ocultos?: Set<string>
}

export function FormularioMenu({ secciones, valores, version, visibilidad, onCambiar, onAux, sugerencia, alertasExtra, mostrarTitulosSeccion = false }: Props) {
  const ctx = { version, valores }
  return (
    <div className="flex flex-col gap-5">
      {secciones
        .filter((s) => visibilidad.secciones.has(s.id))
        .map((s) => {
          const campos = s.campos.filter((c) => visibilidad.campos.has(c.id))
          if (campos.length === 0) return null
          return (
            <div key={s.id}>
              {mostrarTitulosSeccion && (
                <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                  {s.numero}. {s.titulo}
                </h4>
              )}
              <div className="flex flex-col gap-4">
                {campos.map((c) => (
                  <CampoMenu
                    key={c.id}
                    campo={c}
                    valores={valores}
                    version={version}
                    obligatorio={esObligatorio(c, ctx)}
                    sugerencia={sugerencia?.(c.id) ?? null}
                    alertas={[...alertasDeCampo(c, ctx), ...(alertasExtra?.(c.id) ?? [])]}
                    onCambiar={(v) => onCambiar(c, v)}
                    onAux={onAux}
                  />
                ))}
              </div>
            </div>
          )
        })}
    </div>
  )
}

function CampoMenu({
  campo,
  valores,
  version,
  obligatorio,
  sugerencia,
  alertas,
  onCambiar,
  onAux,
}: {
  campo: CampoDef
  valores: Valores
  version: VersionMenu
  obligatorio: boolean
  sugerencia: Sugerencia | null
  alertas: Alerta[]
  onCambiar: (v: Valor | undefined) => void
  onAux: (clave: string, valor: Valor | undefined) => void
}) {
  const v = valores[campo.id]
  const opciones = opcionesVisibles(campo, { version, valores })
  const sugeridos = new Set(sugerencia?.codigos ?? [])
  const elegidos = campo.tipo === 'unica' ? (typeof v === 'string' ? [v] : []) : Array.isArray(v) ? v : []
  const horas = (valores[`${campo.id}#horas`] ?? {}) as Record<string, string>

  const textoDe = (o: OpcionDef) =>
    (CODIGOS_CON_TEXTO.includes(o.codigo) || o.pide_texto) && elegidos.includes(o.codigo) ? (
      <Input
        className="mt-2 w-full"
        placeholder={o.pide_texto ?? 'Especificar'}
        value={typeof valores[claveTexto(campo.id, o.codigo)] === 'string' ? (valores[claveTexto(campo.id, o.codigo)] as string) : ''}
        onChange={(e) => onAux(claveTexto(campo.id, o.codigo), e.target.value)}
      />
    ) : null

  function alternar(codigo: string) {
    if (campo.tipo === 'unica') return onCambiar(v === codigo ? undefined : codigo)
    const lista = Array.isArray(v) ? v : []
    onCambiar(lista.includes(codigo) ? lista.filter((x) => x !== codigo) : [...lista, codigo])
  }

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-slate-700">
        <span className="mr-1 font-mono text-xs text-slate-400">{campo.numero}</span>
        {campo.etiqueta}
        {obligatorio && <span className="ml-1 text-rose-500" title="Obligatorio">*</span>}
      </p>

      {(campo.tipo === 'unica' || campo.tipo === 'multiple') && (
        <>
          <div className="flex flex-wrap gap-2">
            {opciones.map((o) => (
              <Chip key={o.codigo} activo={elegidos.includes(o.codigo)} onClick={() => alternar(o.codigo)} color={o.color_hex} sugerido={sugeridos.has(o.codigo)}>
                {o.etiqueta}
                {campo.tipo === 'multiple' && horas[o.codigo] && elegidos.includes(o.codigo) && (
                  <span className="ml-2 font-mono text-xs opacity-80">{hhmmLocal(horas[o.codigo])}</span>
                )}
              </Chip>
            ))}
          </div>
          {opciones.map((o) => (
            <div key={`t-${o.codigo}`}>{textoDe(o)}</div>
          ))}
        </>
      )}
      {campo.tipo === 'numero' && <CampoNumero campo={campo} valor={v} onChange={onCambiar} />}
      {campo.tipo === 'si_no' && <SiNo valor={v} onChange={onCambiar} />}
      {campo.tipo === 'hora' && <CampoHora valor={v} onChange={onCambiar} />}
      {campo.tipo === 'texto' && (
        <Input className="w-full" value={typeof v === 'string' ? v : ''} onChange={(e) => onCambiar(e.target.value)} />
      )}
      {campo.tipo === 'checklist' && (
        <ChecklistCampo campo={campo} valor={v} onChange={onCambiar} />
      )}

      {sugerencia && (
        <p className="mt-2 text-sm text-emerald-800">
          Sugerido: {sugerencia.texto}
          {sugerencia.valor !== undefined && campo.tipo === 'numero' && (
            <button type="button" className="ml-2 font-semibold underline" onClick={() => onCambiar(sugerencia.valor)}>
              Usar {String(sugerencia.valor).replace('.', ',')}
            </button>
          )}
        </p>
      )}
      {campo.ayuda && <p className="mt-1 text-xs text-slate-500">{campo.ayuda}</p>}
      {campo.nota_ped && version === 'ped' && <p className="mt-1 text-xs text-slate-500">{campo.nota_ped}</p>}
      {campo.significa && (
        <p className="mt-1 text-xs text-slate-500">
          Incluye: {Array.isArray(campo.significa) ? campo.significa.join(', ') : campo.significa}.
        </p>
      )}
      {alertas.map((a, i) => (
        <p key={i} role="alert" className={`mt-2 rounded-lg border px-3 py-2 text-sm ${ESTILO_ALERTA[a.nivel]}`}>
          {a.mensaje}
        </p>
      ))}
    </div>
  )
}

function ChecklistCampo({ campo, valor, onChange }: { campo: CampoDef; valor: Valor | undefined; onChange: (v: Valor | undefined) => void }) {
  const r = (valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {}) as Record<string, string | boolean>
  const poner = (i: ItemChecklist, x: string | boolean) => onChange({ ...r, [i.codigo]: x })
  return (
    <div className="flex flex-col gap-2">
      {(campo.items ?? []).map((i) => (
        <div key={i.codigo} className="rounded-lg border border-slate-200 bg-white p-2">
          <p className="mb-1 text-sm text-slate-800">{i.etiqueta}</p>
          {i.nota && <p className="mb-1 text-xs text-slate-500">{i.nota}</p>}
          {i.tipo === 'texto' ? (
            <Input className="w-full" value={typeof r[i.codigo] === 'string' ? (r[i.codigo] as string) : ''} onChange={(e) => poner(i, e.target.value)} />
          ) : (
            <SiNo valor={typeof r[i.codigo] === 'boolean' ? (r[i.codigo] as boolean) : undefined} onChange={(x) => poner(i, x)} />
          )}
        </div>
      ))}
    </div>
  )
}
