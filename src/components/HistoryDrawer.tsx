import { Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { layoutById, toneById } from '../lib/format/styles'
import { stripMarkdown, wordCount } from '../lib/format/text'
import type { HistoryEntry } from '../lib/history'
import { cx } from './classes'
import { LayoutThumb } from './LayoutThumb'
import { Button } from './ui'

function relativeDay(iso: string) {
  const d = new Date(iso)
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days < 1 && new Date().getDate() === d.getDate())
    return `Today, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
  if (days < 2) return 'Yesterday'
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: 'long' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

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
  const [query, setQuery] = useState('')
  const search = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    search.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter((e) => `${e.doc.title} ${e.doc.description} ${e.doc.tags.join(' ')} ${e.doc.body}`.toLowerCase().includes(q))
  }, [entries, query])

  return (
    <>
      <div
        className={cx(
          'fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px] transition-opacity',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />
      <aside
        aria-label="Drafts"
        aria-hidden={!open}
        className={cx(
          'surface fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col rounded-none border-y-0 border-r-0 shadow-pop transition-[transform,visibility] duration-300 ease-out',
          open ? 'translate-x-0' : 'invisible translate-x-full',
        )}
      >
        <header className="border-b border-rule px-6 pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="label mb-1.5 text-accent">The archive</p>
              <h2 className="font-display text-3xl leading-none">Drafts</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close drafts" className="-mr-2 size-8 px-0">
              <X className="size-4" />
            </Button>
          </div>
          <label className="field mt-4 flex items-center gap-2 rounded-full py-0 focus-within:border-edge">
            <Search className="size-3.5 text-ink-3" />
            <input
              ref={search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your drafts"
              aria-label="Search drafts"
              className="h-9 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-3 focus:outline-none"
            />
          </label>
        </header>

        <ul className="flex-1 overflow-y-auto px-3 py-2">
          {entries.length === 0 && (
            <li className="px-4 py-16 text-center">
              <p className="font-display text-2xl text-ink-2">Nothing here yet.</p>
              <p className="mt-1 text-sm text-ink-3">Every piece you format is saved here, in this browser only.</p>
            </li>
          )}
          {entries.length > 0 && filtered.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-ink-3">No drafts match “{query}”.</li>
          )}
          {filtered.map((entry) => (
            <li key={entry.id} className="group relative">
              <button
                type="button"
                onClick={() => onSelect(entry)}
                className={cx(
                  'flex w-full gap-3 rounded-xl px-3 py-3 text-left transition-colors',
                  entry.id === activeId ? 'bg-well' : 'hover:bg-paper',
                )}
              >
                <span className="mt-0.5 w-12 shrink-0 rounded-md bg-sheet p-1 text-ink-3 ring-1 ring-edge-ctl">
                  <LayoutThumb layout={entry.options.layout} />
                </span>
                <span className="min-w-0 flex-1 pr-6">
                  <span className="block truncate font-display text-lg leading-tight text-ink">
                    {entry.doc.title || entry.doc.description || 'Untitled'}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-ink-3">
                    {stripMarkdown(entry.doc.body).slice(0, 160)}
                  </span>
                  <span className="mt-1.5 block font-mono text-[10px] tracking-wide text-ink-3 uppercase">
                    {relativeDay(entry.createdAt)} · {layoutById(entry.options.layout).label} · {toneById(entry.options.tone).label} ·{' '}
                    {wordCount(stripMarkdown(entry.doc.body))}w
                  </span>
                </span>
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-3 right-2 size-7 px-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                onClick={() => onDelete(entry.id)}
                aria-label="Delete draft"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>

        {entries.length > 0 && (
          <footer className="flex items-center justify-between border-t border-rule px-6 py-3 text-xs text-ink-3">
            {entries.length} saved · newest first
            <Button variant="danger" size="xs" onClick={() => confirm('Delete all saved drafts? This cannot be undone.') && onClear()}>
              Clear all
            </Button>
          </footer>
        )}
      </aside>
    </>
  )
}
