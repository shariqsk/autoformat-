import { Check } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from './classes'

type ButtonVariant = 'ink' | 'accent' | 'outline' | 'ghost' | 'danger'

const VARIANTS: Record<ButtonVariant, string> = {
  ink: 'bg-ink text-paper hover:bg-ink-2 shadow-lift disabled:bg-ink-3 disabled:shadow-none',
  accent: 'bg-accent text-white hover:bg-accent-deep shadow-lift disabled:opacity-40 disabled:shadow-none',
  outline: 'bg-sheet text-ink ring-1 ring-inset ring-rule-strong hover:bg-well disabled:text-ink-3',
  ghost: 'text-ink-2 hover:bg-well hover:text-ink disabled:text-ink-3',
  danger: 'text-accent-deep hover:bg-accent-wash',
}

export function Button({
  variant = 'outline',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-[background-color,color,box-shadow,transform] active:translate-y-px disabled:cursor-not-allowed disabled:active:translate-y-0',
        size === 'xs' && 'h-7 px-2.5 text-xs',
        size === 'sm' && 'h-8 px-3 text-[13px]',
        size === 'md' && 'h-9 px-4 text-sm',
        size === 'lg' && 'h-12 px-6 text-[15px]',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  )
}

/** Section of the desk, headed like a newspaper section: "01 — Talk". */
export function Panel({
  number,
  title,
  aside,
  children,
  className,
}: {
  number: string
  title: string
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cx('rounded-[1.25rem] border border-rule bg-sheet shadow-sheet', className)}>
      <header className="flex items-center gap-3 px-5 pt-4 pb-3 sm:px-6">
        <span className="small-caps text-accent">{number}</span>
        <h2 className="font-display text-[1.65rem] leading-none text-ink">{title}</h2>
        <span className="h-px flex-1 bg-rule" aria-hidden />
        {aside}
      </header>
      <div className="px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
    </section>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
  label,
  className,
}: {
  value: T
  options: { value: T; label: ReactNode; title?: string }[]
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  label: string
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx('inline-flex rounded-full bg-well p-0.5 ring-1 ring-rule ring-inset', className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-full font-medium whitespace-nowrap transition-all',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-[13px]',
            value === o.value ? 'bg-sheet text-ink shadow-lift' : 'text-ink-3 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** A checkbox styled as a little stamp-like chip. */
export function CheckChip({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx(
        'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium ring-1 transition-colors ring-inset',
        checked ? 'bg-ink text-paper ring-ink' : 'text-ink-2 ring-rule-strong hover:bg-well',
      )}
    >
      <span className={cx('grid size-3.5 place-items-center rounded-full', checked ? 'bg-paper text-ink' : 'ring-1 ring-rule-strong')}>
        {checked && <Check className="size-2.5" strokeWidth={4} />}
      </span>
      {label}
    </button>
  )
}

export function Badge({
  children,
  tone = 'plain',
  className,
}: {
  children: ReactNode
  tone?: 'plain' | 'olive' | 'accent' | 'marker'
  className?: string
}) {
  const tones = {
    plain: 'bg-well text-ink-2',
    olive: 'bg-olive-wash text-olive',
    accent: 'bg-accent-wash text-accent-deep',
    marker: 'bg-marker text-ink',
  }
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', tones[tone], className)}>
      {children}
    </span>
  )
}

export function ProgressBar({ value }: { value: number | null }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-well">
      {value === null ? (
        <div className="h-full w-1/3 animate-[indeterminate_1.2s_ease-in-out_infinite] rounded-full bg-accent" />
      ) : (
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${Math.round(value * 100)}%` }} />
      )}
    </div>
  )
}

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    // A group, not a <label>: a label would forward clicks on its caption to the first control
    // inside (e.g. silently selecting the first layout).
    <div role="group" aria-label={label} className={cx('space-y-2', className)}>
      <span className="small-caps block text-ink-3">{label}</span>
      <div>{children}</div>
      {hint && <div className="text-xs leading-relaxed text-ink-3">{hint}</div>}
    </div>
  )
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cx(
        'inline-grid h-[18px] min-w-[18px] place-items-center rounded-[5px] border border-b-2 border-current/30 px-1 font-sans text-[10px] font-semibold opacity-80',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
