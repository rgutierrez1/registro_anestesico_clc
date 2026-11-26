import { ANESTESIOLOGOS } from '../constants'
import type { RegistroBloqueo } from '../types'
import { RuedaNumerica, rango } from './RuedaNumerica'
import { Field, Input, Select } from './ui'

const EDADES = rango(0, 110)

// Datos mínimos del paciente para registrar un bloqueo sin registro anestésico.
export function DatosBloqueoForm({ registro, onCambiar }: { registro: RegistroBloqueo; onCambiar: (r: RegistroBloqueo) => void }) {
  const p = registro.paciente
  const fuera = registro.anestesiologo !== '' && !ANESTESIOLOGOS.includes(registro.anestesiologo)
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Nombre y apellido" className="sm:col-span-2">
        <Input value={p.nombre} onChange={(e) => onCambiar({ ...registro, paciente: { ...p, nombre: e.target.value } })} placeholder="Nombre del paciente" />
      </Field>
      <Field label="Historia clínica (opcional)">
        <Input value={p.historiaClinica} onChange={(e) => onCambiar({ ...registro, paciente: { ...p, historiaClinica: e.target.value } })} />
      </Field>
      <div className="max-w-[170px]">
        <RuedaNumerica etiqueta="Edad" unidad="años" valor={p.edad} opciones={EDADES} inicio={40} onChange={(v) => onCambiar({ ...registro, paciente: { ...p, edad: v } })} />
      </div>
      <Field label="Cirugía programada (opcional)" className="sm:col-span-2">
        <Input value={registro.procedimiento} onChange={(e) => onCambiar({ ...registro, procedimiento: e.target.value })} />
      </Field>
      <Field label="Anestesiólogo">
        <Select value={registro.anestesiologo} onChange={(e) => onCambiar({ ...registro, anestesiologo: e.target.value })}>
          <option value="">Seleccionar…</option>
          {fuera && <option value={registro.anestesiologo}>{registro.anestesiologo}</option>}
          {ANESTESIOLOGOS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Fecha">
        <Input type="date" value={registro.fecha} onChange={(e) => onCambiar({ ...registro, fecha: e.target.value })} />
      </Field>
    </div>
  )
}
