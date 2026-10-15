import DOMPurify from 'dompurify'
import { Check, Clipboard, Download, FileText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { downloadText, useCopy } from '../hooks/useCopy'
import {
  EXPORT_FORMATS,
  exportFilename,
  exportFormatById,
  readingMinutes,
  toHtmlFragment,
  toPlainText,
  type ExportContext,
  type ExportFormatId,
} from '../lib/export/formats'
import { stripMarkdown, wordCount } from '../lib/format/text'
import type { FormattedDoc } from '../lib/format/types'
import type { LoadProgress } from '../lib/ml/protocol'
import { cx, inputClass } from './classes'
import { Button, Card, ProgressBar } from './ui'

type View = 'preview' | 'edit' | ExportFormatId

async function copyRich(html: string, plain: string) {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      }),
    ])
  } else {
    await navigator.clipboard.writeText(plain)
  }
}

function TagsInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = (value: string) => {
    onChange(
      value
        .split(',')
        .map((t) => t.trim().replace(/^#/, '').toLowerCase())
        .filter(Boolean),
    )
    setDraft(null)
  }
  return (
    <input
      value={draft ?? tags.join(', ')}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && commit(e.currentTarget.value)}
      placeholder="tags, comma separated"
      className={cx(inputClass, 'py-1.5 text-xs')}
      aria-label="Tags"
    />
  )
}

export function OutputPanel({
  doc,
  onDocChange,
  ctx,
  formatting,
  loading,
}: {
  doc: FormattedDoc | null
  onDocChange: (doc: FormattedDoc) => void
  ctx: ExportContext
  formatting: boolean
  loading: LoadProgress | null | undefined
}) {
  const [view, setView] = useState<View>('preview')
  const { copied, copy } = useCopy()

  const html = useMemo(() => (doc ? DOMPurify.sanitize(toHtmlFragment({ ...doc, title: '' })) : ''), [doc])
  const exported = useMemo(() => {
    if (!doc || view === 'preview' || view === 'edit') return null
    const format = exportFormatById(view)
    return { format, text: format.render(doc, ctx) }
  }, [doc, ctx, view])

  const words = doc ? wordCount(stripMarkdown(doc.body)) : 0

  async function handleCopy() {
    if (!doc) return
    if (exported) return copy(exported.text, view)
    if (view === 'edit') return copy(doc.body, view)
    // Rich copy pastes with formatting intact into Google Docs, Notion, Medium, WordPress…
    return copy(() => copyRich(toHtmlFragment(doc), toPlainText(doc)), view)
  }

  function handleDownload() {
    if (!doc) return
    const format = exported?.format ?? exportFormatById('markdown')
    downloadText(exportFilename(doc, format), exported?.text ?? format.render(doc, ctx), format.mime)
  }

  const tabs: { id: View; label: string; hint?: string }[] = [
    { id: 'preview', label: 'Preview' },
    { id: 'edit', label: 'Edit' },
    ...EXPORT_FORMATS.map((f) => ({ id: f.id, label: f.label, hint: f.hint })),
  ]

  return (
    <Card
      step={3}
      title="Ship it"
      subtitle={doc ? `${words} words · ${readingMinutes(doc)} min read` : 'Copy, export, or hand it to your blog agent.'}
      className="flex min-h-[32rem] flex-col"
      actions={
        doc && (
          <>
            <Button size="sm" onClick={handleCopy} disabled={formatting}>
              {copied === view ? <Check className="size-4 text-emerald-400" /> : <Clipboard className="size-4" />}
              {copied === view ? 'Copied' : 'Copy'}
            </Button>
            <Button size="sm" onClick={handleDownload} disabled={formatting} title={exported ? `Download .${exported.format.extension}` : 'Download Markdown'}>
              <Download className="size-4" /> Download
            </Button>
          </>
        )
      }
    >
      {formatting && (
        <div className="mb-4 space-y-2" aria-live="polite">
          <ProgressBar value={loading?.fraction ?? null} />
          <p className="text-xs text-zinc-400">
            {loading
              ? `Downloading model${loading.totalBytes ? ` · ${Math.round(loading.loadedBytes / 1e6)} / ${Math.round(loading.totalBytes / 1e6)} MB` : ''} — cached after the first time`
              : 'Writing…'}
          </p>
        </div>
      )}

      {!doc ? (
        <div className="grid flex-1 place-items-center py-16 text-center">
          <div className="max-w-xs space-y-3">
            <FileText className="mx-auto size-10 text-zinc-700" />
            <p className="text-sm text-zinc-400">Your formatted post shows up here.</p>
            <p className="text-xs text-zinc-600">Record or paste something, pick a layout, then hit Auto-format.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                title={t.hint}
                onClick={() => setView(t.id)}
                className={cx(
                  'shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  view === t.id ? 'bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/40' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100',
                  t.id === 'markdown' && 'ml-3',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {(view === 'preview' || view === 'edit') && (
            <div className="space-y-2">
              <input
                value={doc.title}
                onChange={(e) => onDocChange({ ...doc, title: e.target.value })}
                placeholder="Untitled"
                aria-label="Title"
                className="w-full bg-transparent text-2xl font-bold tracking-tight text-white placeholder:text-zinc-700 focus:outline-none"
              />
              <input
                value={doc.description}
                onChange={(e) => onDocChange({ ...doc, description: e.target.value })}
                placeholder="One-line description for SEO and previews"
                aria-label="Description"
                className="w-full bg-transparent text-sm text-zinc-400 placeholder:text-zinc-700 focus:outline-none"
              />
              <TagsInput tags={doc.tags} onChange={(tags) => onDocChange({ ...doc, tags })} />
            </div>
          )}

          {view === 'preview' && (
            <article
              className="prose prose-invert prose-zinc max-w-none flex-1 prose-headings:tracking-tight prose-a:text-violet-300 prose-blockquote:border-violet-500/60"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}

          {view === 'edit' && (
            <textarea
              value={doc.body}
              onChange={(e) => onDocChange({ ...doc, body: e.target.value })}
              className={cx(inputClass, 'min-h-96 flex-1 resize-y font-mono text-[13px] leading-relaxed')}
              spellCheck
              aria-label="Markdown body"
            />
          )}

          {exported && (
            <div className="flex flex-1 flex-col gap-2">
              <p className="text-xs text-zinc-500">{exported.format.hint}</p>
              <pre className="max-h-[36rem] flex-1 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/10 bg-zinc-950/80 p-4 font-mono text-[12.5px] leading-relaxed text-zinc-300">
                {exported.text}
              </pre>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
