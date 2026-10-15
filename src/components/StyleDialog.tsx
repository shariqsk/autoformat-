import { Check } from 'lucide-react'
import type { CSSProperties } from 'react'
import { THEMES, type ThemeId } from '../lib/themes'
import { cx } from './classes'
import { Modal } from './Modal'

// Previews set data-theme on their own subtree, so every colour, font, border and shadow below
// resolves to that theme's tokens. They deliberately avoid the shared component classes, whose
// theme-specific selectors key off the page's theme rather than the nearest one.

const box: CSSProperties = {
  border: 'var(--bw) solid var(--edge)',
  borderRadius: 'calc(var(--r-panel) * 0.6)',
  boxShadow: 'var(--shadow-panel)',
  background: 'var(--sheet)',
}

function Tag({ id }: { id: ThemeId }) {
  if (id === 'yap')
    return (
      <span
        className="inline-flex -rotate-2 items-center gap-1.5 rounded-lg bg-pop-1 px-2 py-0.5 font-display text-[10px] text-ink uppercase"
        style={{ border: 'var(--bw) solid var(--edge)', boxShadow: '2px 2px 0 var(--edge)' }}
      >
        <span className="font-mono">01</span> Talk
      </span>
    )
  if (id === 'studio')
    return (
      <span className="flex items-baseline gap-1.5">
        <span className="font-mono text-[9px] tracking-[0.16em] text-accent">01 /</span>
        <span className="font-display text-sm font-semibold text-ink">Talk</span>
      </span>
    )
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-mono text-[9px] tracking-[0.14em] text-accent">01</span>
      <span className="font-display text-base text-ink">Talk</span>
    </span>
  )
}

function Preview({ id }: { id: ThemeId }) {
  const bars = [4, 9, 6, 14, 10, 18, 12, 7, 15, 9, 5, 11, 16, 8, 4]
  return (
    <div data-theme={id} className="rounded-xl p-3" style={{ background: 'var(--backdrop), var(--paper)' }}>
      <div className="space-y-2.5 p-3" style={box}>
        <div className="flex items-center gap-2">
          <Tag id={id} />
          <span className="h-px flex-1 bg-rule" />
        </div>
        <div className="flex items-center gap-2.5 rounded-lg bg-well p-2" style={{ border: 'var(--bw) solid var(--edge-ctl)' }}>
          <span className="grid size-7 place-items-center rounded-full bg-sheet" style={{ border: 'var(--bw) solid var(--edge)' }}>
            <span className="size-3.5 rounded-full bg-rec" />
          </span>
          <span className="flex h-5 flex-1 items-center gap-[2px]">
            {bars.map((h, i) => (
              <span
                key={i}
                className="w-[3px] rounded-full"
                style={{ height: h, background: i > 11 ? 'var(--wave-hot)' : 'var(--wave)' }}
              />
            ))}
          </span>
          <span className="font-mono text-[10px] text-ink-2">00:12</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="rounded-full bg-chip-on px-2 py-0.5 text-[10px] font-semibold text-on-chip"
            style={{ border: 'var(--bw) solid var(--edge)' }}
          >
            No filter
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-ink-3"
            style={{ border: 'var(--bw) solid var(--edge-ctl)' }}
          >
            Formal
          </span>
          <span
            className="ml-auto rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-on-primary"
            style={{ border: 'var(--bw) solid var(--edge)', boxShadow: 'var(--shadow-ctl)' }}
          >
            Format it
          </span>
        </div>
        <p className="font-serif text-[11px] leading-snug text-ink-2">
          <span className="font-display text-ink">Why I stopped typing.</span> Bro, honestly I hate typing…
        </p>
      </div>
    </div>
  )
}

export function StyleDialog({
  open,
  onClose,
  theme,
  onChange,
}: {
  open: boolean
  onClose: () => void
  theme: ThemeId
  onChange: (t: ThemeId) => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Pick a look" kicker="Style" width="max-w-3xl">
      <div className="grid gap-4 sm:grid-cols-2">
        {THEMES.map((t) => {
          const active = t.id === theme
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              aria-pressed={active}
              className={cx(
                'group rounded-2xl p-2 text-left transition-transform hover:-translate-y-0.5',
                active ? 'bg-well ring-2 ring-accent' : 'ring-1 ring-edge-ctl hover:ring-ink-3',
              )}
            >
              <Preview id={t.id} />
              <div className="flex items-start justify-between gap-3 px-2 pt-3 pb-1">
                <div>
                  <p className="font-display text-lg leading-tight text-ink">{t.name}</p>
                  <p className="mt-0.5 text-xs leading-snug text-ink-3">{t.vibe}</p>
                </div>
                {active && (
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
      <p className="mt-5 text-xs text-ink-3">
        Tip: press <kbd className="font-semibold text-ink-2">⌘ .</kbd> anywhere to flip through looks.
      </p>
    </Modal>
  )
}
