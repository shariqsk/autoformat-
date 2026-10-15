import { History, Trash2, X } from 'lucide-react'
import { layoutById, toneById } from '../lib/format/styles'
import type { HistoryEntry } from '../lib/history'
import { cx } from './classes'
import { Button } from './ui'

export function HistoryDrawer({
  open,
  onClose,
  entries,
  activeId,
  onSelect,
  onDelete,
  onClear,
}: {
  open: boolean
  onClose: () => void
  entries: HistoryEntry[]
  activeId: string | null
  onSelect: (entry: HistoryEntry) => void
  onDelete: (id: string) => void
  onClear: () => void
}) {
  return (
    <>
      <div
        className={cx('fixed inset-0 z-40 bg-black/50 transition-opacity', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
        onClick={onClose}
      />
      <aside
        aria-label="History"
        aria-hidden={!open}
        className={cx(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-white/10 bg-zinc-900 shadow-2xl transition-transform',
          open ? 'translate-x-0' : 'invisible translate-x-full',
        )}
      >
        <header className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold text-white">
            <History className="size-4" /> History
          </h2>
          <div className="flex gap-1">
            {entries.length > 0 && (
              <Button variant="danger" size="sm" onClick={() => confirm('Delete all saved drafts?') && onClear()}>
                Clear all
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close history">
              <X className="size-4" />
            </Button>
          </div>
        </header>
        <ul className="flex-1 divide-y divide-white/5 overflow-y-auto">
          {entries.length === 0 && <li className="p-6 text-center text-sm text-zinc-500">Formatted drafts are saved here, in this browser only.</li>}
          {entries.map((entry) => (
            <li key={entry.id} className={cx('group flex items-start gap-2 px-5 py-3 hover:bg-white/5', entry.id === activeId && 'bg-violet-500/10')}>
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelect(entry)}>
                <p className="truncate text-sm font-medium text-zinc-100">{entry.doc.title || entry.doc.description || 'Untitled'}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {new Date(entry.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} ·{' '}
                  {layoutById(entry.options.layout).label} · {toneById(entry.options.tone).label}
                </p>
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 focus:opacity-100"
                onClick={() => onDelete(entry.id)}
                aria-label="Delete draft"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      </aside>
    </>
  )
}
