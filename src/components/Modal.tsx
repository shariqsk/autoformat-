import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { cx } from './classes'
import { Button } from './ui'

/** Centered dialog with the desk's sheet styling. Closes on Escape and backdrop click. */
export function Modal({
  open,
  onClose,
  title,
  kicker,
  children,
  footer,
  width = 'max-w-2xl',
}: {
  open: boolean
  onClose: () => void
  title: string
  kicker?: string
  children: ReactNode
  footer?: ReactNode
  width?: string
}) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previous?.focus()
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-3 backdrop-blur-[2px] sm:p-10"
      onMouseDown={onClose}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        className={cx('w-full animate-rise rounded-[1.25rem] border border-rule bg-sheet shadow-sheet focus:outline-none', width)}
      >
        <header className="flex items-start justify-between gap-4 border-b border-rule px-6 pt-5 pb-4">
          <div>
            {kicker && <p className="small-caps mb-1 text-accent">{kicker}</p>}
            <h2 className="font-display text-3xl leading-none text-ink">{title}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close" className="-mr-2 size-8 px-0">
            <X className="size-4" />
          </Button>
        </header>
        <div className="px-6 py-6">{children}</div>
        {footer && <footer className="border-t border-rule px-6 py-4">{footer}</footer>}
      </div>
    </div>
  )
}
