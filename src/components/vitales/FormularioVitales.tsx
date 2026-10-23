import { useState, type ReactNode } from 'react'
import type { DatosPaciente, ValoresVitales } from '../../types'
import { hhmmLocal } from '../../utils/tiempo'
import { valoresDePartida, type ValoresVentilacion } from '../../utils/ventilacion'
import { calcularPam, CAMPOS_VITALES, conPam, validarValores, type ClaveVital } from '../../utils/vitales'
import { Button, Field, Input } from '../ui'
import { borradorDesde, CamposVentilacion, valoresDeBorrador, type BorradorVentilacion } from './CamposVentilacion'
import { DeslizadorVertical } from './DeslizadorVertical'

type Numeros = Record<ClaveVital, number | null>

// Valores con los que parte el primer registro; después se ajustan con los deslizadores.
const PARTIDA: Record<ClaveVital, number> = { pas: 120, pad: 70, fc: 70, etco2: 35, spo2: 98, temp: 36 }

// Rango de cada deslizador (más acotado que el rango válido, para tener precisión al arrastrar).
const RANGO_DESLIZADOR: Record<ClaveVital, [number, number]> = {
  pas: [40, 240],
  pad: [20, 150],
  fc: [20, 200],
  etco2: [0, 60],
  spo2: [50, 100],
  temp: [30, 42],
}

function aNumeros(v: ValoresVitales | null): Numeros {
  if (!v) return { ...PARTIDA }
  return { pas: v.pas, pad: v.pad, fc: v.fc, etco2: v.etco2, spo2: v.spo2, temp: v.temp ?? null }
}

const ORDEN: ClaveVital[] = ['pas', 'pad', 'fc', 'etco2', 'spo2', 'temp']

export interface HorasPrimerRegistro {
  inicio?: string
  fin?: string
  ventilacion?: ValoresVentilacion
}

export function FormularioVitales({
  inicial,
  textoGuardar,
  onGuardar,
  onCancelar,
  textoCancelar = 'Cancelar',
  ayuda,
  pedirInicio = false,
  pedirFin = false,
  paciente,
}: {
  inicial: ValoresVitales | null
  textoGuardar: string
  onGuardar: (v: ValoresVitales, horas: HorasPrimerRegistro) => string | void
  onCancelar?: () => void
  textoCancelar?: string
  ayuda?: ReactNode
  pedirInicio?: boolean
  pedirFin?: boolean
  // Si se indica, se piden también los parámetros ventilatorios de partida (primer registro).
  paciente?: DatosPaciente
}) {
  const [numeros, setNumeros] = useState<Numeros>(() => aNumeros(inicial))
  const [error, setError] = useState('')
  const [inicioHora, setInicioHora] = useState(() => hhmmLocal(new Date().toISOString()))
  const [finHora, setFinHora] = useState('')
  const [ventilacion, setVentilacion] = useState<BorradorVentilacion | null>(() => (paciente ? borradorDesde(valoresDePartida(paciente)) : null))

  const pam = calcularPam(numeros.pas, numeros.pad)

  function enviar() {
    const valores = conPam(numeros)
    const problema = validarValores(valores)
    if (problema) return setError(problema)
    if (pedirInicio && !inicioHora) return setError('Indicá la hora de inicio de anestesia.')
    const errorExterno = onGuardar(valores, {
      inicio: pedirInicio ? inicioHora : undefined,
      fin: pedirFin && finHora ? finHora : undefined,
      ventilacion: (ventilacion && valoresDeBorrador(ventilacion)) ?? undefined,
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
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {ORDEN.map((clave) => {
          const campo = CAMPOS_VITALES.find((c) => c.clave === clave)!
          const [min, max] = RANGO_DESLIZADOR[clave]
          return (
            <DeslizadorVertical
              key={clave}
              etiqueta={campo.etiqueta}
              unidad={campo.unidad}
              valor={numeros[clave]}
              min={min}
              max={max}
              paso={campo.paso}
              porDefecto={PARTIDA[clave]}
              onChange={(v) => {
                setNumeros((n) => ({ ...n, [clave]: v }))
                setError('')
              }}
            />
          )
        })}
      </div>
      <p className="mt-2 text-sm text-slate-600">
        PAM (calculada): <span className="font-semibold text-slate-800">{pam ?? '—'}</span> mmHg
      </p>
      {ventilacion && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-sm font-medium text-slate-600">
            Parámetros ventilatorios de partida (en ventilación espontánea solo se registra la FiO2).
          </p>
          <CamposVentilacion
            borrador={ventilacion}
            onCambiar={(clave, valor) => {
              setVentilacion((b) => b && { ...b, [clave]: valor })
              setError('')
            }}
          />
        </div>
      )}
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
  paciente,
}: {
  onGuardar: (v: ValoresVitales, horas: HorasPrimerRegistro) => string | void
  onCerrar: () => void
  pedirFin?: boolean
  paciente?: DatosPaciente
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Primer registro de signos vitales"
    >
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="mb-1 text-lg font-bold text-slate-900">Primer registro de signos vitales</h2>
        <FormularioVitales
          inicial={null}
          paciente={paciente}
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
