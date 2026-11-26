import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DatosBloqueoForm } from '../components/DatosBloqueoForm'
import { Button, Section } from '../components/ui'
import { db } from '../db'
import type { RegistroBloqueo } from '../types'
import { crearRegistroBloqueoVacio } from '../utils/bloqueosIndependientes'

export default function NuevoBloqueo() {
  const navigate = useNavigate()
  const [registro, setRegistro] = useState<RegistroBloqueo>(() => crearRegistroBloqueoVacio())
  const puedeGuardar = registro.paciente.nombre.trim().length > 0

  async function guardar() {
    if (!puedeGuardar) return
    await db.registrosBloqueo.add(registro)
    navigate(`/bloqueo/${registro.id}`)
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-6 pb-28">
      <header className="mb-6 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="min-h-[44px] px-2 text-slate-500" aria-label="Volver">
          ← Volver
        </button>
        <h1 className="text-xl font-bold text-slate-900">Registrar bloqueo (sin registro anestésico)</h1>
      </header>
      <Section title="Paciente">
        <DatosBloqueoForm registro={registro} onCambiar={(r) => setRegistro(r)} />
      </Section>
      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl justify-end gap-3">
          <Button variant="secondary" onClick={() => navigate('/')}>
            Cancelar
          </Button>
          <Button disabled={!puedeGuardar} onClick={guardar}>
            Guardar y registrar bloqueo
          </Button>
        </div>
      </div>
    </div>
  )
}
