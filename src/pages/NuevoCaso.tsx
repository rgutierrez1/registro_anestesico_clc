import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Field, Input, Pill, Section, Select } from '../components/ui'
import { ANESTESIOLOGOS, OPCIONES_ASA, OPCIONES_MONITORIZACION, TIPOS_ANESTESIA } from '../constants'
import { crearCasoVacio, db } from '../db'
import type { CasoAnestesico, TipoAnestesia } from '../types'

export default function NuevoCaso() {
  const navigate = useNavigate()
  const [caso, setCaso] = useState<CasoAnestesico>(() => crearCasoVacio())

  function updatePaciente<K extends keyof CasoAnestesico['paciente']>(key: K, value: CasoAnestesico['paciente'][K]) {
    setCaso((c) => ({ ...c, paciente: { ...c.paciente, [key]: value } }))
  }

  function updateCirugia<K extends keyof CasoAnestesico['cirugia']>(key: K, value: CasoAnestesico['cirugia'][K]) {
    setCaso((c) => ({ ...c, cirugia: { ...c.cirugia, [key]: value } }))
  }

  function toggleAnestesia(tipo: TipoAnestesia) {
    setCaso((c) => ({
      ...c,
      tiposAnestesia: c.tiposAnestesia.includes(tipo)
        ? c.tiposAnestesia.filter((t) => t !== tipo)
        : [...c.tiposAnestesia, tipo],
    }))
  }

  function toggleMonitor(opcion: string) {
    setCaso((c) => ({
      ...c,
      monitorizacion: c.monitorizacion.includes(opcion)
        ? c.monitorizacion.filter((m) => m !== opcion)
        : [...c.monitorizacion, opcion],
    }))
  }

  const numero = (valor: string): number | '' => (valor === '' ? '' : Number(valor))
  const puedeGuardar = caso.paciente.nombre.trim().length > 0 && caso.cirugia.procedimiento.trim().length > 0

  async function guardarYContinuar() {
    if (!puedeGuardar) return
    await db.casos.add(caso)
    navigate(`/caso/${caso.id}`)
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-6 pb-28">
      <header className="mb-6 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="min-h-[44px] px-2 text-slate-500" aria-label="Volver">
          ← Volver
        </button>
        <h1 className="text-xl font-bold text-slate-900">Nuevo caso</h1>
      </header>

      <div className="flex flex-col gap-4">
        <Section title="Paciente">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Nombre y apellido" className="col-span-2 sm:col-span-4">
              <Input
                value={caso.paciente.nombre}
                onChange={(e) => updatePaciente('nombre', e.target.value)}
                placeholder="Nombre del paciente"
              />
            </Field>
            <Field label="Edad">
              <Input
                type="number"
                inputMode="numeric"
                value={caso.paciente.edad}
                onChange={(e) => updatePaciente('edad', numero(e.target.value))}
              />
            </Field>
            <Field label="Sexo">
              <Select
                value={caso.paciente.sexo}
                onChange={(e) => updatePaciente('sexo', e.target.value as CasoAnestesico['paciente']['sexo'])}
              >
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
                value={caso.paciente.peso}
                onChange={(e) => updatePaciente('peso', numero(e.target.value))}
              />
            </Field>
            <Field label="Talla (cm)">
              <Input
                type="number"
                inputMode="numeric"
                value={caso.paciente.altura}
                onChange={(e) => updatePaciente('altura', numero(e.target.value))}
              />
            </Field>
            <Field label="ASA" className="col-span-2 sm:col-span-4">
              <Select
                value={caso.paciente.asa}
                onChange={(e) => updatePaciente('asa', e.target.value as CasoAnestesico['paciente']['asa'])}
              >
                <option value="">Seleccionar…</option>
                {OPCIONES_ASA.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Section>

        <Section title="Cirugía">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Cirugía" className="sm:col-span-2">
              <Input value={caso.cirugia.procedimiento} onChange={(e) => updateCirugia('procedimiento', e.target.value)} />
            </Field>
            <Field label="Anestesiólogo">
              <Select value={caso.cirugia.anestesiologo} onChange={(e) => updateCirugia('anestesiologo', e.target.value)}>
                <option value="">Seleccionar…</option>
                {ANESTESIOLOGOS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Fecha">
              <Input type="date" value={caso.cirugia.fecha} onChange={(e) => updateCirugia('fecha', e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Tipo de anestesia">
          <p className="mb-3 text-sm text-slate-500">Se puede seleccionar más de una.</p>
          <div className="flex flex-wrap gap-2">
            {TIPOS_ANESTESIA.map((tipo) => (
              <Pill key={tipo} active={caso.tiposAnestesia.includes(tipo)} onClick={() => toggleAnestesia(tipo)}>
                {tipo}
              </Pill>
            ))}
          </div>
        </Section>

        <Section title="Monitorización">
          <div className="flex flex-wrap gap-2">
            {OPCIONES_MONITORIZACION.map((opcion) => (
              <Pill key={opcion} active={caso.monitorizacion.includes(opcion)} onClick={() => toggleMonitor(opcion)}>
                {opcion}
              </Pill>
            ))}
          </div>
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl justify-end gap-3">
          <Button variant="secondary" onClick={() => navigate('/')} size="lg">
            Cancelar
          </Button>
          <Button onClick={guardarYContinuar} disabled={!puedeGuardar} size="lg">
            Guardar y comenzar registro
          </Button>
        </div>
      </div>
    </div>
  )
}
