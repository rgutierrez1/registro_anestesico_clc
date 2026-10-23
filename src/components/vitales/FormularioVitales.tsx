import { useState, type ReactNode } from 'react'
import type { ValoresVitales } from '../../types'
import { hhmmLocal } from '../../utils/tiempo'
import { calcularPam, CAMPOS_VITALES, conPam, validarValores, type ClaveVital } from '../../utils/vitales'
import { Button, Field, Input } from '../ui'

type Textos = Record<ClaveVital, string>

function aTextos(v: ValoresVitales | null): Textos {
  const t = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n))
  return { pas: t(v?.pas), pad: t(v?.pad), fc: t(v?.fc), etco2: t(v?.etco2), spo2: t(v?.spo2), temp: t(v?.temp) }
}

function aNumero(s: string): number | null {
  const n = Number.parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const ORDEN: (ClaveVital | 'pam')[] = ['pas', 'pad', 'pam', 'fc', 'etco2', 'spo2', 'temp']

export interface HorasPrimerRegistro {
  inicio?: string
  fin?: string
}

export function FormularioVitales({
  inicial,
  textoGuardar,
  onGuardar,
  onCancelar,
  textoCancelar = 'Cancelar',
  ayuda,
  autoFocus = false,
  pedirInicio = false,
  pedirFin = false,
}: {
  inicial: ValoresVitales | null
  textoGuardar: string
  onGuardar: (v: ValoresVitales, horas: HorasPrimerRegistro) => string | void
  onCancelar?: () => void
  textoCancelar?: string
  ayuda?: ReactNode
  autoFocus?: boolean
  pedirInicio?: boolean
  pedirFin?: boolean
}) {
  const [textos, setTextos] = useState<Textos>(() => aTextos(inicial))
  const [error, setError] = useState('')
  const [inicioHora, setInicioHora] = useState(() => hhmmLocal(new Date().toISOString()))
  const [finHora, setFinHora] = useState('')

  const parcial = {
    pas: aNumero(textos.pas),
    pad: aNumero(textos.pad),
    fc: aNumero(textos.fc),
    etco2: aNumero(textos.etco2),
    spo2: aNumero(textos.spo2),
    temp: aNumero(textos.temp),
  }
  const pam = calcularPam(parcial.pas, parcial.pad)

  function enviar() {
    const valores = conPam(parcial)
    const problema = validarValores(valores)
    if (problema) return setError(problema)
    if (pedirInicio && !inicioHora) return setError('Indicá la hora de inicio de anestesia.')
    const errorExterno = onGuardar(valores, {
      inicio: pedirInicio ? inicioHora : undefined,
      fin: pedirFin && finHora ? finHora : undefined,
    })
    if (errorExterno) setError(errorExterno)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        enviar()
      }}
    >
      {ayuda && <div className="mb-3 text-sm text-slate-600">{ayuda}</div>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ORDEN.map((clave, i) => {
          if (clave === 'pam') {
            return (
              <div key="pam" className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-600">PAM (calculada)</span>
                <div className="flex min-h-[44px] items-center rounded-lg border border-slate-200 bg-slate-100 px-3 text-lg font-semibold text-slate-800">
                  {pam ?? '—'} <span className="ml-1 text-xs font-normal text-slate-500">mmHg</span>
                </div>
              </div>
            )
          }
          const campo = CAMPOS_VITALES.find((c) => c.clave === clave)!
          return (
            <Field key={clave} label={`${campo.etiqueta} (${campo.unidad})`}>
              <Input
                type="number"
                inputMode={campo.paso < 1 ? 'decimal' : 'numeric'}
                min={campo.min}
                max={campo.max}
                step={campo.paso}
                autoFocus={autoFocus && i === 0}
                value={textos[clave]}
                onChange={(e) => {
                  setTextos((t) => ({ ...t, [clave]: e.target.value }))
                  setError('')
                }}
              />
            </Field>
          )
        })}
      </div>
      {(pedirInicio || pedirFin) && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-sm font-medium text-slate-600">
            Horario de la anestesia: los valores parten desde el inicio y se repiten cada 5 minutos hasta ahora
            {pedirFin ? ', o hasta el fin si la anestesia ya terminó' : ''}.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pedirInicio && (
              <Field label="Hora de inicio de anestesia">
                <Input
                  type="time"
                  value={inicioHora}
                  onChange={(e) => {
                    setInicioHora(e.target.value)
                    setError('')
                  }}
                />
              </Field>
            )}
            {pedirFin && (
              <Field label="Hora de fin de anestesia (opcional, si ya terminó)">
                <Input
                  type="time"
                  value={finHora}
                  onChange={(e) => {
                    setFinHora(e.target.value)
                    setError('')
                  }}
                />
              </Field>
            )}
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {onCancelar && (
          <Button type="button" variant="ghost" onClick={onCancelar}>
            {textoCancelar}
          </Button>
        )}
        <Button type="submit">{textoGuardar}</Button>
      </div>
    </form>
  )
}

export function ModalSignosIniciales({
  onGuardar,
  onCerrar,
  pedirFin = false,
}: {
  onGuardar: (v: ValoresVitales, horas: HorasPrimerRegistro) => string | void
  onCerrar: () => void
  pedirFin?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Primer registro de signos vitales"
    >
      <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="mb-1 text-lg font-bold text-slate-900">Primer registro de signos vitales</h2>
        <FormularioVitales
          inicial={null}
          autoFocus
          pedirFin={pedirFin}
          textoGuardar="Guardar y repetir cada 5 min"
          textoCancelar="Más tarde"
          onCancelar={onCerrar}
          onGuardar={onGuardar}
          ayuda="Estos valores se repetirán automáticamente cada 5 minutos durante toda la anestesia. Después podés editar cada registro."
        />
      </div>
    </div>
  )
}
