import { TIPOS_VENTILACION, VENTILACION_ESPONTANEA } from '../../constants'
import type { TipoVentilacion } from '../../types'
import type { ValoresVentilacion } from '../../utils/ventilacion'
import { Field, Input, Pill } from '../ui'

export interface BorradorVentilacion {
  tipo: TipoVentilacion | ''
  vt: string
  fr: string
  peep: string
  fio2: string
}

const CAMPOS_NUMERICOS = [
  { clave: 'vt', etiqueta: 'Vt (mL)' },
  { clave: 'fr', etiqueta: 'FR (rpm)' },
  { clave: 'peep', etiqueta: 'PEEP (cmH2O)' },
  { clave: 'fio2', etiqueta: 'FiO2 (%)' },
] as const

function aTexto(v: number | null): string {
  return v === null ? '' : String(v).replace('.', ',')
}

function aNumero(t: string): number | null {
  const n = Number.parseFloat(t.replace(',', '.'))
  return t.trim() === '' || !Number.isFinite(n) ? null : n
}

export function borradorDesde(v: { tipo: TipoVentilacion | ''; vt: number | null; fr: number | null; peep: number | null; fio2: number | null }): BorradorVentilacion {
  return { tipo: v.tipo, vt: aTexto(v.vt), fr: aTexto(v.fr), peep: aTexto(v.peep), fio2: aTexto(v.fio2) }
}

// null mientras no se haya elegido el tipo de ventilación. En espontánea solo se guarda la FiO2.
export function valoresDeBorrador(b: BorradorVentilacion): ValoresVentilacion | null {
  if (b.tipo === '') return null
  if (b.tipo === VENTILACION_ESPONTANEA) return { tipo: b.tipo, vt: null, fr: null, peep: null, fio2: aNumero(b.fio2) }
  return { tipo: b.tipo, vt: aNumero(b.vt), fr: aNumero(b.fr), peep: aNumero(b.peep), fio2: aNumero(b.fio2) }
}

export function CamposVentilacion({
  borrador,
  onCambiar,
}: {
  borrador: BorradorVentilacion
  onCambiar: (clave: keyof BorradorVentilacion, valor: string) => void
}) {
  return (
    <>
      <p className="mb-1 text-sm font-medium text-slate-600">Tipo de ventilación</p>
      <div className="flex flex-wrap gap-2">
        {TIPOS_VENTILACION.map((t) => (
          <Pill key={t.id} active={borrador.tipo === t.id} onClick={() => onCambiar('tipo', t.id)}>
            {t.id}
          </Pill>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CAMPOS_NUMERICOS.filter((c) => borrador.tipo !== VENTILACION_ESPONTANEA || c.clave === 'fio2').map((c) => (
          <Field key={c.clave} label={c.etiqueta}>
            <Input type="text" inputMode="decimal" value={borrador[c.clave]} onChange={(e) => onCambiar(c.clave, e.target.value)} />
          </Field>
        ))}
      </div>
    </>
  )
}
