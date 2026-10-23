import { useState } from 'react'
import { VENTILACION_ESPONTANEA, VENTILACION_POR_DEFECTO } from '../../constants'
import type { CasoAnestesico, RegistroVentilacion } from '../../types'
import { pesoIdeal } from '../../utils/dosis'
import { formatHora, hhmmLocal, horaCercanaIso } from '../../utils/tiempo'
import { errorVentilacion, resumenVentilacion, valoresIniciales } from '../../utils/ventilacion'
import { BotonesAgregar } from '../farmacos/BotonesAgregar'
import { Button, Field, Input } from '../ui'
import { borradorDesde, CamposVentilacion, valoresDeBorrador, type BorradorVentilacion } from './CamposVentilacion'

export function IconoVentilacion() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v8" />
      <path d="M12 11l-3 3" />
      <path d="M12 11l3 3" />
      <path d="M9 8C6 8 3 13.5 3 18c0 2 1.3 3 3 3s3-1 3-3V9" />
      <path d="M15 8c3 0 6 5.5 6 10 0 2-1.3 3-3 3s-3-1-3-3V9" />
    </svg>
  )
}

function borradorInicial(caso: CasoAnestesico): BorradorVentilacion {
  return borradorDesde(valoresIniciales(caso))
}

export function PanelVentilacion({
  caso,
  onAgregar,
  onEditar,
  onEliminar,
  onCerrar,
}: {
  caso: CasoAnestesico
  onAgregar: (r: RegistroVentilacion) => void
  onEditar: (r: RegistroVentilacion) => void
  onEliminar: (id: string) => void
  onCerrar: () => void
}) {
  const [borrador, setBorrador] = useState<BorradorVentilacion>(() => borradorInicial(caso))
  const [editando, setEditando] = useState<RegistroVentilacion | null>(null)
  const [horaEdicion, setHoraEdicion] = useState('')
  const [error, setError] = useState('')
  const ordenados = [...caso.ventilacion].sort((a, b) => a.hora.localeCompare(b.hora))
  const listo = borrador.tipo !== ''
  const ideal = pesoIdeal(caso.paciente)

  function cambiar(clave: keyof BorradorVentilacion, valor: string) {
    setBorrador((b) => ({ ...b, [clave]: valor }))
    setError('')
  }

  function construir(id: string, hora: string): RegistroVentilacion | null {
    const valores = valoresDeBorrador(borrador)
    return valores && { id, hora, ...valores }
  }

  function agregar(hora?: string) {
    const nuevo = construir(crypto.randomUUID(), hora ?? new Date().toISOString())
    if (!nuevo) return
    const problema = errorVentilacion(nuevo)
    if (problema) return setError(problema)
    onAgregar(nuevo)
    setBorrador(borradorDesde(nuevo))
    setError('')
  }

  function empezarEdicion(r: RegistroVentilacion) {
    setEditando(r)
    setHoraEdicion(hhmmLocal(r.hora))
    setBorrador(borradorDesde(r))
    setError('')
  }

  function terminarEdicion() {
    setEditando(null)
    setBorrador(borradorInicial({ ...caso, ventilacion: caso.ventilacion }))
    setError('')
  }

  function guardarEdicion() {
    if (!editando || !horaEdicion) return
    const editado = construir(editando.id, horaCercanaIso(horaEdicion, editando.hora))
    if (!editado) return
    const problema = errorVentilacion(editado)
    if (problema) return setError(problema)
    onEditar(editado)
    terminarEdicion()
  }

  return (
    <div className={`mt-3 rounded-xl border p-3 ${editando ? 'border-amber-300 bg-amber-50' : 'border-sky-200 bg-sky-50'}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className={`text-sm font-semibold ${editando ? 'text-amber-900' : 'text-sky-900'}`}>
          {editando ? `Editar parámetros de las ${formatHora(editando.hora)}` : 'Parámetros ventilatorios'}
        </p>
        <Button size="sm" variant="ghost" onClick={onCerrar}>
          Cerrar
        </Button>
      </div>

      <CamposVentilacion borrador={borrador} onCambiar={cambiar} />
      {!editando && caso.ventilacion.length === 0 && borrador.tipo !== VENTILACION_ESPONTANEA && (
        <p className="mt-1 text-xs text-slate-500">
          Valores de partida: Vt {VENTILACION_POR_DEFECTO.vtMlPorKg} mL/kg de peso ideal
          {ideal === null ? ' (cargá altura y sexo del paciente para calcularlo)' : ` (${ideal.toFixed(1).replace('.', ',')} kg)`}, FR{' '}
          {VENTILACION_POR_DEFECTO.fr}, PEEP {VENTILACION_POR_DEFECTO.peep}, FiO2 {VENTILACION_POR_DEFECTO.fio2} %.
        </p>
      )}

      {editando ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <Field label="Hora">
            <Input
              type="time"
              value={horaEdicion}
              onChange={(e) => {
                setHoraEdicion(e.target.value)
                setError('')
              }}
            />
          </Field>
          <Button size="sm" disabled={!listo || !horaEdicion} onClick={guardarEdicion}>
            Guardar cambios
          </Button>
          <Button size="sm" variant="ghost" onClick={terminarEdicion}>
            Cancelar
          </Button>
        </div>
      ) : (
        <div className="mt-3">
          <BotonesAgregar
            listo={listo}
            etiquetaAhora="Registrar ahora"
            etiquetaPersonalizada="Registrar a hora personalizada"
            onAgregar={agregar}
          />
        </div>
      )}
      {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}

      {ordenados.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1 border-t border-sky-200 pt-3">
          {ordenados.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm">
              <span>
                <span className="mr-2 font-mono text-xs font-semibold text-slate-500">{formatHora(r.hora)}</span>
                {resumenVentilacion(r)}
              </span>
              <span className="flex shrink-0">
                <button type="button" onClick={() => empezarEdicion(r)} className="min-h-[36px] px-2 text-xs text-sky-600">
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (editando?.id === r.id) terminarEdicion()
                    onEliminar(r.id)
                  }}
                  className="min-h-[36px] px-2 text-xs text-rose-500"
                >
                  Borrar
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
