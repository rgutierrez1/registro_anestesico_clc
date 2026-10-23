import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

const baseButton =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors select-none disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]'

const variants = {
  primary: 'bg-sky-600 text-white hover:bg-sky-700',
  secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
}

const sizes = {
  sm: 'text-sm px-3 py-2 min-h-[40px]',
  md: 'text-base px-4 py-3 min-h-[48px]',
  lg: 'text-lg px-6 py-4 min-h-[56px]',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`${baseButton} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
}

export function Card({ children, className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function Section({
  title,
  children,
  className = '',
  actions,
}: {
  title: string
  children: ReactNode
  className?: string
  actions?: ReactNode
}) {
  return (
    <Card className={`p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        {actions}
      </div>
      {children}
    </Card>
  )
}

export function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}

const inputClasses =
  'rounded-lg border border-slate-300 px-3 py-3 text-base focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 min-h-[44px]'

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClasses} ${className}`} {...props} />
}

export function TextArea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputClasses} ${className}`} {...props} />
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${inputClasses} ${className}`} {...props} />
}

export function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'border-sky-600 bg-sky-600 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:border-sky-400'
      }`}
    >
      {children}
    </button>
  )
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'amber' | 'sky' | 'red' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    sky: 'bg-sky-100 text-sky-800',
    red: 'bg-rose-100 text-rose-800',
  }
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>
}

export function Casilla({ etiqueta, marcada, onAlternar }: { etiqueta: string; marcada: boolean; onAlternar: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcada}
      onClick={onAlternar}
      className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
        marcada ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-800 hover:border-sky-300'
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-base font-bold leading-none ${
          marcada ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-400 bg-white text-transparent'
        }`}
        aria-hidden="true"
      >
        ✓
      </span>
      {etiqueta}
    </button>
  )
}
