import { useState } from 'react'
import type { DatosCirugia, DatosPaciente } from '../types'
import { DatosCasoForm } from './DatosCasoForm'
import { Button } from './ui'

export function EditarDatosCaso({
  paciente,
  cirugia,
  onGuardar,
  onCancelar,
}: {
  paciente: DatosPaciente
  cirugia: DatosCirugia
  onGuardar: (paciente: DatosPaciente, cirugia: DatosCirugia) => void
  onCancelar: () => void
}) {
  const [pac, setPac] = useState(paciente)
  const [cir, setCir] = useState(cirugia)

  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3">
      <p className="mb-3 text-sm font-semibold text-amber-900">Editar datos del caso</p>
      <div className="flex flex-col gap-4">
        <DatosCasoForm
          paciente={pac}
          cirugia={cir}
          onPaciente={(k, v) => setPac((p) => ({ ...p, [k]: v }))}
          onCirugia={(k, v) => setCir((c) => ({ ...c, [k]: v }))}
        />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button onClick={() => onGuardar(pac, cir)} disabled={!pac.nombre.trim() || !cir.procedimiento.trim()}>
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}
