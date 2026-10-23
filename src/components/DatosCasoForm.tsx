import { ALERGIA_OTROS, ALERGIAS_OPCIONES, ANESTESIOLOGOS, GRUPOS_SANGUINEOS, OPCIONES_ASA } from '../constants'
import type { DatosCirugia, DatosPaciente } from '../types'
import { Field, Input, Pill, Section, Select } from './ui'

const numero = (valor: string): number | '' => (valor === '' ? '' : Number(valor))

export function DatosCasoForm({
  paciente,
  cirugia,
  onPaciente,
  onCirugia,
}: {
  paciente: DatosPaciente
  cirugia: DatosCirugia
  onPaciente: <K extends keyof DatosPaciente>(key: K, value: DatosPaciente[K]) => void
  onCirugia: <K extends keyof DatosCirugia>(key: K, value: DatosCirugia[K]) => void
}) {
  function alternarAlergia(a: string) {
    const lista = paciente.alergiasLista
    const nueva = lista.includes(a) ? lista.filter((x) => x !== a) : [...lista, a]
    onPaciente('alergiasLista', nueva)
    if (a === ALERGIA_OTROS && lista.includes(a)) onPaciente('alergiasOtros', '')
  }

  const anestesiologoFueraDeLista = cirugia.anestesiologo !== '' && !ANESTESIOLOGOS.includes(cirugia.anestesiologo)

  return (
    <>
      <Section title="Paciente">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Nombre y apellido" className="col-span-2 sm:col-span-4">
            <Input
              value={paciente.nombre}
              onChange={(e) => onPaciente('nombre', e.target.value)}
              placeholder="Nombre del paciente"
            />
          </Field>
          <Field label="Edad">
            <Input
              type="number"
              inputMode="numeric"
              value={paciente.edad}
              onChange={(e) => onPaciente('edad', numero(e.target.value))}
            />
          </Field>
          <Field label="Sexo">
            <Select value={paciente.sexo} onChange={(e) => onPaciente('sexo', e.target.value as DatosPaciente['sexo'])}>
              <option value="">Seleccionar…</option>
              <option value="F">Femenino</option>
              <option value="M">Masculino</option>
              <option value="Otro">Otro</option>
            </Select>
          </Field>
          <Field label="Peso (kg)">
            <Input
              type="number"
              inputMode="decimal"
              value={paciente.peso}
              onChange={(e) => onPaciente('peso', numero(e.target.value))}
            />
          </Field>
          <Field label="Talla (cm)">
            <Input
              type="number"
              inputMode="numeric"
              value={paciente.altura}
              onChange={(e) => onPaciente('altura', numero(e.target.value))}
            />
          </Field>
          <Field label="ASA" className="col-span-2">
            <Select value={paciente.asa} onChange={(e) => onPaciente('asa', e.target.value as DatosPaciente['asa'])}>
              <option value="">Seleccionar…</option>
              {OPCIONES_ASA.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Grupo sanguíneo" className="col-span-2">
            <Select value={paciente.grupoSanguineo} onChange={(e) => onPaciente('grupoSanguineo', e.target.value)}>
              <option value="">Seleccionar…</option>
              {GRUPOS_SANGUINEOS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </Field>
          <div className="col-span-2 sm:col-span-4">
            <p className="mb-2 text-sm font-medium text-slate-600">Alergias conocidas</p>
            <div className="flex flex-wrap gap-2">
              {ALERGIAS_OPCIONES.map((a) => (
                <Pill key={a} active={paciente.alergiasLista.includes(a)} onClick={() => alternarAlergia(a)}>
                  {a}
                </Pill>
              ))}
            </div>
            {paciente.alergiasLista.includes(ALERGIA_OTROS) && (
              <Field label="¿Cuáles?" className="mt-3">
                <Input
                  value={paciente.alergiasOtros}
                  onChange={(e) => onPaciente('alergiasOtros', e.target.value)}
                  placeholder="Escribí la alergia"
                />
              </Field>
            )}
          </div>
        </div>
      </Section>

      <Section title="Cirugía">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Diagnóstico quirúrgico" className="sm:col-span-2">
            <Input value={cirugia.diagnostico} onChange={(e) => onCirugia('diagnostico', e.target.value)} />
          </Field>
          <Field label="Cirugía" className="sm:col-span-2">
            <Input value={cirugia.procedimiento} onChange={(e) => onCirugia('procedimiento', e.target.value)} />
          </Field>
          <Field label="Cirujano/a" className="sm:col-span-2">
            <Input value={cirugia.cirujano} onChange={(e) => onCirugia('cirujano', e.target.value)} />
          </Field>
          <Field label="Anestesiólogo">
            <Select value={cirugia.anestesiologo} onChange={(e) => onCirugia('anestesiologo', e.target.value)}>
              <option value="">Seleccionar…</option>
              {anestesiologoFueraDeLista && <option value={cirugia.anestesiologo}>{cirugia.anestesiologo}</option>}
              {ANESTESIOLOGOS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha">
            <Input type="date" value={cirugia.fecha} onChange={(e) => onCirugia('fecha', e.target.value)} />
          </Field>
        </div>
      </Section>
    </>
  )
}
