import { Check } from 'lucide-react'
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { cx } from './classes'

type ButtonVariant = 'ink' | 'accent' | 'outline' | 'ghost' | 'danger'

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
        `btn btn-${variant}`,
        size === 'xs' && 'h-7 px-2.5 text-xs',
        size === 'sm' && 'h-8 px-3 text-[13px]',
        size === 'md' && 'h-9 px-4 text-sm',
        size === 'lg' && 'h-12 px-6 text-[15px]',
        className,
      )}
      {...props}
    />
  )
}

/**
 * A section of the workspace, headed "01 Talk". Each theme styles the heading its own way: a rule
 * line on the Desk, a tilted sticker in Yap (tinted by `tone`), a readout in Studio.
 */
export function Panel({
  number,
  title,
  tone = 1,
  aside,
  children,
  className,
}: {
  number: string
  title: string
  tone?: 1 | 2 | 3 | 4
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cx('surface', className)} style={{ '--panel-color': `var(--pop-${tone})` } as CSSProperties}>
      <header className="panel-head px-5 pt-5 pb-4 sm:px-6">
        <span className="panel-tag">
          <span className="panel-num">{number}</span>
          <h2 className="panel-title">{title}</h2>
        </span>
        <span className="panel-rule" aria-hidden />
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
    <div role="radiogroup" aria-label={label} className={cx('seg', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx('seg-opt', size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-[13px]')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** A checkbox styled as a pill. */
export function CheckChip({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} onClick={() => onChange(!checked)} className="pill">
      <span className={cx('grid size-3.5 place-items-center rounded-full', checked ? 'bg-on-chip text-chip-on' : 'ring-1 ring-edge-ctl')}>
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
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', tones[tone], className)}>
      {children}
    </span>
  )
}

export function ProgressBar({ value }: { value: number | null }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-well ring-1 ring-edge-ctl">
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
      <span className="label block text-ink-3">{label}</span>
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
