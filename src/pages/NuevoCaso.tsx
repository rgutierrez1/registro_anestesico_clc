import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DatosCasoForm } from '../components/DatosCasoForm'
import { Button, Pill, Section } from '../components/ui'
import { OPCIONES_MONITORIZACION, TIPOS_ANESTESIA } from '../constants'
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
        <DatosCasoForm
          paciente={caso.paciente}
          cirugia={caso.cirugia}
          onPaciente={updatePaciente}
          onCirugia={updateCirugia}
        />

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
