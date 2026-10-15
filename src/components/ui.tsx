import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from './classes'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-900/30 disabled:bg-violet-600/40',
  secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 ring-1 ring-inset ring-white/10 disabled:text-zinc-500',
  ghost: 'text-zinc-300 hover:bg-white/5 hover:text-white disabled:text-zinc-600',
  danger: 'text-rose-300 hover:bg-rose-500/10 hover:text-rose-200',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 disabled:cursor-not-allowed',
        size === 'sm' && 'h-8 px-2.5 text-xs',
        size === 'md' && 'h-9 px-3.5 text-sm',
        size === 'lg' && 'h-11 px-5 text-sm',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  )
}

export function Card({
  step,
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  step?: number
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cx('rounded-2xl border border-white/10 bg-zinc-900/60 shadow-xl shadow-black/20 backdrop-blur', className)}>
      <header className="flex items-center justify-between gap-3 border-b border-white/5 px-5 py-3.5">
        <div className="flex items-center gap-3">
          {step !== undefined && (
            <span className="grid size-6 place-items-center rounded-full bg-violet-500/15 text-xs font-semibold text-violet-300 ring-1 ring-violet-400/30">
              {step}
            </span>
          )}
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
            {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-1.5">{actions}</div>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
}: {
  value: T
  options: { value: T; label: ReactNode; title?: string }[]
  onChange: (value: T) => void
  size?: 'sm' | 'md'
}) {
  return (
    <div role="radiogroup" className="inline-flex flex-wrap gap-1 rounded-lg bg-zinc-950/60 p-1 ring-1 ring-inset ring-white/10">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-md font-medium transition-colors',
            size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            value === o.value ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-zinc-100',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm text-zinc-300">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative h-5 w-9 rounded-full transition-colors',
          checked ? 'bg-violet-500' : 'bg-zinc-700',
        )}
      >
        <span
          className={cx('absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform', checked && 'translate-x-4')}
        />
      </button>
      {label}
    </label>
  )
}

export function Badge({ children, tone = 'zinc' }: { children: ReactNode; tone?: 'zinc' | 'green' | 'amber' | 'violet' | 'sky' }) {
  const tones = {
    zinc: 'bg-zinc-800 text-zinc-300 ring-white/10',
    green: 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/20',
    amber: 'bg-amber-500/10 text-amber-300 ring-amber-400/20',
    violet: 'bg-violet-500/10 text-violet-300 ring-violet-400/20',
    sky: 'bg-sky-500/10 text-sky-300 ring-sky-400/20',
  }
  return <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', tones[tone])}>{children}</span>
}

export function ProgressBar({ value }: { value: number | null }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
      {value === null ? (
        <div className="h-full w-1/3 animate-[indeterminate_1.2s_ease-in-out_infinite] rounded-full bg-violet-500" />
      ) : (
        <div className="h-full rounded-full bg-violet-500 transition-[width]" style={{ width: `${Math.round(value * 100)}%` }} />
      )}
    </div>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    // A group, not a <label>: a label would forward clicks on its caption to the first control
    // inside (e.g. silently selecting the first layout).
    <div role="group" aria-label={label} className="space-y-1.5">
      <span className="block text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</span>
      <div>{children}</div>
      {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
    </div>
  )
}
