import { useState } from 'react'
import { Button, Input } from '../../components/ui'

// Nunca se elimina un dato clínico: se anula con motivo, usuario y hora.
export function Anular({ onConfirmar, onCancelar }: { onConfirmar: (motivo: string) => void; onCancelar: () => void }) {
  const [motivo, setMotivo] = useState('')
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2">
      <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm text-rose-900">
        Motivo de la anulación
        <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </label>
      <Button size="sm" variant="danger" disabled={!motivo.trim()} onClick={() => onConfirmar(motivo.trim())}>
        Anular registro
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancelar}>
        Cancelar
      </Button>
    </div>
  )
}
