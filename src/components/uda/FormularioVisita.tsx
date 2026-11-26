import type { ReactNode } from 'react'
import { VISITADORES_UDA } from '../../constants'
import type { EscalaSedacion, SiNo, VisitaUDA } from '../../types'
import { hhmmLocal } from '../../utils/tiempo'
import { Field, Input, Pill, Select, TextArea } from '../ui'

const dos = (n: number) => String(n).padStart(2, '0')
export const fechaLocal = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
}

export const ESTADOS_CATETER = ['Funcionando bien', 'Filtración en el punto de entrada', 'Desplazado', 'Obstruido o acodado', 'Sospecha de infección', 'Otro']

export const ESCALA_SEDACION: { valor: EscalaSedacion; texto: string }[] = [
  { valor: 0, texto: '0 · Ninguna' },
  { valor: 1, texto: '1 · Leve (responde a la voz o duerme)' },
  { valor: 2, texto: '2 · Moderada (responde al tacto)' },
  { valor: 3, texto: '3 · Severa (sin respuesta)' },
]

// Escala de Bromage de la planilla UDA.
export const ESCALA_BROMAGE: { valor: EscalaSedacion; texto: string }[] = [
  { valor: 0, texto: '0 · Sin bloqueo (deambula)' },
  { valor: 1, texto: '1 · Parcial (mueve rodillas y pies)' },
  { valor: 2, texto: '2 · Casi completo (mueve solo pies)' },
  { valor: 3, texto: '3 · Sin movimiento' },
]

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-slate-200 p-3">
      <legend className="px-1 text-sm font-semibold text-slate-700">{titulo}</legend>
      <div className="flex flex-col gap-3">{children}</div>
    </fieldset>
  )
}

function Fila({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-slate-600">{etiqueta}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function EscalaEVA({ valor, onChange }: { valor: number | null; onChange: (v: number | null) => void }) {
  return (
    <>
      {Array.from({ length: 11 }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(valor === i ? null : i)}
          className={`min-h-[44px] min-w-[44px] rounded-xl border text-base font-semibold transition-colors ${
            valor === i ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-sky-400'
          }`}
          aria-pressed={valor === i}
        >
          {i}
        </button>
      ))}
    </>
  )
}

function SiNoFila({ etiqueta, valor, onChange }: { etiqueta: string; valor: SiNo; onChange: (v: SiNo) => void }) {
  return (
    <Fila etiqueta={etiqueta}>
      <Pill active={valor === 'no'} onClick={() => onChange(valor === 'no' ? '' : 'no')}>
        No
      </Pill>
      <Pill active={valor === 'si'} onClick={() => onChange(valor === 'si' ? '' : 'si')}>
        Sí
      </Pill>
    </Fila>
  )
}

function Escala({ etiqueta, opciones, valor, onChange }: { etiqueta: string; opciones: { valor: EscalaSedacion; texto: string }[]; valor: EscalaSedacion | null; onChange: (v: EscalaSedacion | null) => void }) {
  return (
    <Fila etiqueta={etiqueta}>
      {opciones.map((o) => (
        <Pill key={o.valor} active={valor === o.valor} onClick={() => onChange(valor === o.valor ? null : o.valor)}>
          {o.texto}
        </Pill>
      ))}
    </Fila>
  )
}

function Conteo({ etiqueta, valor, onChange }: { etiqueta: string; valor: number | null; onChange: (v: number | null) => void }) {
  return (
    <Field label={etiqueta}>
      <Input inputMode="numeric" value={valor ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Math.max(0, Math.round(Number(e.target.value.replace(/\D/g, '')))))} />
    </Field>
  )
}

// Una visita de seguimiento: lo que la planilla UDA registra en cada columna de día.
export function FormularioVisita({ visita: v, onCambiar, diaPostop }: { visita: VisitaUDA; onCambiar: (v: VisitaUDA) => void; diaPostop: number | null }) {
  const set = <K extends keyof VisitaUDA>(campo: K, valor: VisitaUDA[K]) => onCambiar({ ...v, [campo]: valor })
  const fuera = v.visitador !== '' && !VISITADORES_UDA.includes(v.visitador)
  const texto = (campo: 'terapiaPCT' | 'aineInf' | 'icox2' | 'aineSOS' | 'tramal' | 'morfina' | 'hipBzdPsiq' | 'otroFarmaco', etiqueta: string, ph = '') => (
    <Field label={etiqueta}>
      <Input value={v[campo]} placeholder={ph} onChange={(e) => set(campo, e.target.value)} />
    </Field>
  )

  return (
    <div className="flex flex-col gap-4">
      <Grupo titulo="Visita">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Fecha">
            <Input
              type="date"
              value={fechaLocal(v.hora)}
              onChange={(e) => e.target.value && set('hora', new Date(`${e.target.value}T${hhmmLocal(v.hora)}`).toISOString())}
            />
          </Field>
          <Field label="Hora">
            <Input
              type="time"
              value={hhmmLocal(v.hora)}
              onChange={(e) => e.target.value && set('hora', new Date(`${fechaLocal(v.hora)}T${e.target.value}`).toISOString())}
            />
          </Field>
          <Field label="Día postoperatorio">
            <div className="flex min-h-[44px] items-center rounded-lg bg-slate-100 px-3 text-base font-semibold text-slate-700">{diaPostop === null ? '—' : diaPostop < 0 ? 'Previo a la cirugía' : `POP ${diaPostop}`}</div>
          </Field>
        </div>
        <Field label="Quién realiza la visita">
          <Select value={v.visitador} onChange={(e) => set('visitador', e.target.value)}>
            <option value="">Seleccionar…</option>
            {fuera && <option value={v.visitador}>{v.visitador}</option>}
            {VISITADORES_UDA.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </Field>
      </Grupo>

      <Grupo titulo="Dolor (EVA)">
        <Fila etiqueta="EVA en reposo">
          <EscalaEVA valor={v.evaReposo} onChange={(x) => set('evaReposo', x)} />
        </Fila>
        <Fila etiqueta="EVA dinámico (al movimiento o tos)">
          <EscalaEVA valor={v.evaDinamico} onChange={(x) => set('evaDinamico', x)} />
        </Fila>
      </Grupo>

      <Grupo titulo="Bomba de infusión">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Programación (continuo / bolo / lockout)">
            <Input value={v.progPCA} placeholder="Ej.: 8/5/20" onChange={(e) => set('progPCA', e.target.value)} />
          </Field>
          <Field label="Volumen a infundir (mL)">
            <Input value={v.volInfundir} onChange={(e) => set('volInfundir', e.target.value)} />
          </Field>
          <Conteo etiqueta="Bolos demandados" valor={v.boloDemandado} onChange={(x) => set('boloDemandado', x)} />
          <Conteo etiqueta="Bolos administrados" valor={v.boloAdministrado} onChange={(x) => set('boloAdministrado', x)} />
          <Field label="N° de bolsa">
            <Input value={v.nBolsa} onChange={(e) => set('nBolsa', e.target.value)} />
          </Field>
          <Field label="Shift">
            <Input value={v.shift} onChange={(e) => set('shift', e.target.value)} />
          </Field>
        </div>
        <SiNoFila etiqueta="¿Hubo cambio de PCA?" valor={v.cambioPCA} onChange={(x) => set('cambioPCA', x)} />
      </Grupo>

      <Grupo titulo="Analgesia complementaria">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {texto('terapiaPCT', 'Terapia PCT')}
          {texto('aineInf', 'AINE infusión')}
          {texto('icox2', 'ICOX-2')}
          {texto('aineSOS', 'AINE SOS')}
          {texto('tramal', 'Tramal')}
          {texto('morfina', 'Morfina')}
          {texto('hipBzdPsiq', 'Hipnóticos / BZD / Psiquiátricos')}
          {texto('otroFarmaco', 'Otro')}
        </div>
      </Grupo>

      <Grupo titulo="Efectos colaterales">
        <Escala etiqueta="Sedación" opciones={ESCALA_SEDACION} valor={v.sedacion} onChange={(x) => set('sedacion', x)} />
        <SiNoFila etiqueta="Náuseas / vómito" valor={v.nauseasVomito} onChange={(x) => set('nauseasVomito', x)} />
        <SiNoFila etiqueta="Prurito" valor={v.prurito} onChange={(x) => set('prurito', x)} />
        <SiNoFila etiqueta="Retención de orina" valor={v.retOrina} onChange={(x) => set('retOrina', x)} />
        <SiNoFila etiqueta="Constipación" valor={v.constipacion} onChange={(x) => set('constipacion', x)} />
        <Field label="Otro efecto colateral">
          <Input value={v.efectoOtro} onChange={(e) => set('efectoOtro', e.target.value)} />
        </Field>
      </Grupo>

      <Grupo titulo="Catéter">
        <Fila etiqueta="Estado del catéter">
          {ESTADOS_CATETER.map((e) => (
            <Pill key={e} active={v.estadoCateter === e} onClick={() => set('estadoCateter', v.estadoCateter === e ? '' : e)}>
              {e}
            </Pill>
          ))}
        </Fila>
        {v.estadoCateter && v.estadoCateter !== ESTADOS_CATETER[0] && (
          <Field label="Detalle del estado del catéter">
            <Input value={v.estadoCateterNota} onChange={(e) => set('estadoCateterNota', e.target.value)} />
          </Field>
        )}
        <Escala etiqueta="Bloqueo motor (Bromage)" opciones={ESCALA_BROMAGE} valor={v.bloqueoMotor} onChange={(x) => set('bloqueoMotor', x)} />
      </Grupo>

      <Grupo titulo="Tromboprofilaxis y plan">
        <Field label="Tromboprofilaxis (dosis / hora)">
          <Input value={v.trombofilaxis} onChange={(e) => set('trombofilaxis', e.target.value)} />
        </Field>
        <Field label="Plan">
          <TextArea rows={3} value={v.plan} onChange={(e) => set('plan', e.target.value)} />
        </Field>
      </Grupo>
    </div>
  )
}
