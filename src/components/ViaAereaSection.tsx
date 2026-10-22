import {
  DISPOSITIVOS_VIA_AEREA,
  GRADOS_CORMACK,
  TAMANOS_MASCARA_LARINGEA,
  TAMANOS_TUBO,
  TIPOS_MANEJO_VIA_AEREA,
} from '../constants'
import type { Cormack, ManejoViaAerea, TipoManejoViaAerea } from '../types'
import { Field, Pill, Section, Select } from './ui'

export function ViaAereaSection({
  valor,
  onChange,
}: {
  valor: ManejoViaAerea
  onChange: (v: ManejoViaAerea) => void
}) {
  const esIntubacion = valor.tipo === 'Intubación orotraqueal' || valor.tipo === 'Intubación nasotraqueal'
  const esMascara = valor.tipo === 'Máscara laríngea'

  function cambiarTipo(tipo: TipoManejoViaAerea) {
    onChange({ ...valor, tipo, tamanoTubo: '', cormack: '', tamanoMascara: '' })
  }

  function toggleDispositivo(d: string) {
    const actuales = valor.dispositivosAdicionales
    onChange({
      ...valor,
      dispositivosAdicionales: actuales.includes(d) ? actuales.filter((x) => x !== d) : [...actuales, d],
    })
  }

  return (
    <Section title="Vía aérea">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Manejo avanzado de la vía aérea" className="sm:col-span-3">
          <Select value={valor.tipo} onChange={(e) => cambiarTipo(e.target.value as TipoManejoViaAerea)}>
            <option value="">Sin manejo avanzado</option>
            {TIPOS_MANEJO_VIA_AEREA.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>

        {esIntubacion && (
          <>
            <Field label="Tamaño del tubo">
              <Select value={valor.tamanoTubo} onChange={(e) => onChange({ ...valor, tamanoTubo: e.target.value })}>
                <option value="">Seleccionar…</option>
                {TAMANOS_TUBO.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cormack" className="sm:col-span-2">
              <Select value={valor.cormack} onChange={(e) => onChange({ ...valor, cormack: e.target.value as Cormack })}>
                <option value="">Seleccionar…</option>
                {GRADOS_CORMACK.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}

        {esMascara && (
          <Field label="Tamaño de la máscara">
            <Select
              value={valor.tamanoMascara}
              onChange={(e) => onChange({ ...valor, tamanoMascara: e.target.value })}
            >
              <option value="">Seleccionar…</option>
              {TAMANOS_MASCARA_LARINGEA.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-slate-600">Necesidad de dispositivos adicionales</p>
        <div className="flex flex-wrap gap-2">
          {DISPOSITIVOS_VIA_AEREA.map((d) => (
            <Pill key={d} active={valor.dispositivosAdicionales.includes(d)} onClick={() => toggleDispositivo(d)}>
              {d}
            </Pill>
          ))}
        </div>
      </div>
    </Section>
  )
}
