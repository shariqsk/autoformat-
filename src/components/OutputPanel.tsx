import DOMPurify from 'dompurify'
import { Check, Copy, Download, Eraser, Feather } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { downloadText, useCopy } from '../hooks/useCopy'
import { changes, findAiIsms, fixAiIsms, readability, voiceMatch } from '../lib/analysis/voice'
import {
  escapeHtml,
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
import type { FormattedDoc, LayoutId } from '../lib/format/types'
import type { LoadProgress } from '../lib/ml/protocol'
import { cx } from './classes'
import { Badge, Button, Kbd, Panel, ProgressBar } from './ui'

type View = 'read' | 'edit' | 'changes' | 'export'

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

/** Wrap AI-isms in highlighter marks, skipping fenced code. */
function highlightAiIsms(markdown: string): string {
  const fences = [...markdown.matchAll(/```[\s\S]*?```/g)].map((m) => [m.index, m.index + m[0].length])
  const hits = findAiIsms(markdown).filter((h) => !fences.some(([a, b]) => h.start >= a && h.start < b))
  let out = markdown
  for (const h of [...hits].reverse()) {
    const tip = h.fix === null ? `${h.why}. Worth rewriting in your own words.` : `${h.why}. Try “${h.fix.trim() || 'cutting it'}”.`
    out = `${out.slice(0, h.start)}<mark class="ai-ism" title="${escapeHtml(tip)}">${out.slice(h.start, h.end)}</mark>${out.slice(h.end)}`
  }
  return out
}

function ScoreRing({ score }: { score: number }) {
  const r = 15
  const c = 2 * Math.PI * r
  const tone = score >= 85 ? 'stroke-olive' : score >= 60 ? 'stroke-ink' : 'stroke-accent'
  return (
    <svg viewBox="0 0 36 36" className="size-11 -rotate-90" aria-hidden>
      <circle cx="18" cy="18" r={r} className="fill-none stroke-rule" strokeWidth="3" />
      <circle
        cx="18"
        cy="18"
        r={r}
        className={cx('fill-none transition-[stroke-dashoffset] duration-700', tone)}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - score / 100)}
      />
    </svg>
  )
}

function VoiceReport({ transcript, doc, onFix }: { transcript: string; doc: FormattedDoc; onFix: () => void }) {
  const report = useMemo(() => {
    const full = `${doc.title}\n\n${doc.body}`
    return { match: voiceMatch(transcript, full), tells: findAiIsms(doc.body), read: readability(doc.body) }
  }, [transcript, doc])
  const fixable = report.tells.filter((t) => t.fix !== null).length

  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-rule bg-rule sm:grid-cols-[1.4fr_1fr_1fr]">
      <div className="flex items-center gap-3 bg-paper/70 px-4 py-3">
        <div className="relative">
          <ScoreRing score={report.match.score} />
          <span className="absolute inset-0 grid place-items-center font-mono text-[11px] font-semibold tabular-nums">{report.match.score}</span>
        </div>
        <div className="min-w-0">
          <p className="small-caps text-ink-3">Sounds like you</p>
          <p className="font-display text-xl leading-tight">{report.match.verdict}</p>
          {report.match.newWords.length > 0 && (
            <p className="truncate text-[11px] text-ink-3" title={report.match.newWords.join(', ')}>
              New words: {report.match.newWords.slice(0, 5).join(', ')}
              {report.match.newWords.length > 5 && '…'}
            </p>
          )}
        </div>
      </div>
      <div className="bg-paper/70 px-4 py-3">
        <p className="small-caps text-ink-3">AI tells</p>
        <p className="font-display text-xl leading-tight">{report.tells.length === 0 ? 'None found' : `${report.tells.length} flagged`}</p>
        {fixable > 0 ? (
          <button type="button" onClick={onFix} className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-accent-deep hover:underline">
            <Eraser className="size-3" /> Fix {fixable} automatically
          </button>
        ) : (
          <p className="text-[11px] text-ink-3">{report.tells.length ? 'Highlighted below' : 'Reads human'}</p>
        )}
      </div>
      <div className="bg-paper/70 px-4 py-3">
        <p className="small-caps text-ink-3">Reading level</p>
        <p className="font-display text-xl leading-tight">{report.read.grade ? `Grade ${report.read.grade}` : '–'}</p>
        <p className="text-[11px] text-ink-3">
          {report.read.label} · ~{report.read.avgSentenceWords} words/sentence
        </p>
      </div>
    </div>
  )
}

function ThreadView({ body }: { body: string }) {
  const { copied, copy } = useCopy()
  const posts = body.split(/\n{2,}/).filter((p) => p.trim())
  return (
    <ol className="space-y-3">
      {posts.map((post, i) => {
        const text = stripMarkdown(post)
        const over = text.length > 280
        return (
          <li key={i} className="group relative rounded-2xl border border-rule bg-paper/60 p-4 pr-12">
            <p className="font-serif text-[16px] leading-relaxed whitespace-pre-wrap text-ink">{text}</p>
            <p className={cx('mt-2 font-mono text-[11px] tabular-nums', over ? 'text-accent-deep' : 'text-ink-3')}>{text.length}/280</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copy(text, `post-${i}`)}
              className="absolute top-3 right-3 size-8 px-0"
              aria-label={`Copy post ${i + 1}`}
            >
              {copied === `post-${i}` ? <Check className="size-4 text-olive" /> : <Copy className="size-4" />}
            </Button>
          </li>
        )
      })}
    </ol>
  )
}

function ChangesView({ transcript, doc }: { transcript: string; doc: FormattedDoc }) {
  const parts = useMemo(() => changes(transcript, doc.body), [transcript, doc.body])
  const removed = parts.filter((p) => p.removed).reduce((n, p) => n + wordCount(p.value), 0)
  const added = parts.filter((p) => p.added).reduce((n, p) => n + wordCount(p.value), 0)
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-ink-3">
        <Badge tone="accent">
          <del>{removed} words cut</del>
        </Badge>
        <Badge tone="olive">{added} words added</Badge>
        <span>From what you said to what's on the page.</span>
      </div>
      <p className="font-serif text-[16px] leading-[1.9] text-ink-2">
        {parts.map((p, i) =>
          p.removed ? (
            <del key={i} className="bg-accent-wash/60 text-ink-3 decoration-accent/60">
              {p.value}
            </del>
          ) : p.added ? (
            <ins key={i} className="rounded-sm bg-olive-wash text-olive no-underline">
              {p.value}
            </ins>
          ) : (
            <span key={i}>{p.value}</span>
          ),
        )}
      </p>
    </div>
  )
}

function EmptyPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <Feather className="mb-5 size-8 text-rule-strong" strokeWidth={1.25} />
      <p className="font-display text-4xl leading-tight text-ink">A blank page, waiting.</p>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-3">
        Talk about anything. When you're done, hit <span className="text-ink-2">Format it</span> and your words show up here: cleaned up, laid out,
        and still sounding like you.
      </p>
      <div className="mt-8 grid gap-2 text-left text-xs text-ink-3">
        {[
          ['R', 'Start or stop recording'],
          ['⌘ ↵', 'Format the transcript'],
          ['⌘ ⇧ C', 'Copy the result'],
          ['?', 'All shortcuts'],
        ].map(([key, label]) => (
          <p key={key} className="flex items-center gap-3">
            <span className="w-14 text-right">
              <Kbd>{key}</Kbd>
            </span>
            {label}
          </p>
        ))}
      </div>
    </div>
  )
}

export function OutputPanel({
  doc,
  onDocChange,
  ctx,
  transcript,
  layout,
  formatting,
  loading,
  copyRef,
}: {
  doc: FormattedDoc | null
  onDocChange: (doc: FormattedDoc) => void
  ctx: ExportContext
  transcript: string
  layout: LayoutId
  formatting: boolean
  loading: LoadProgress | null | undefined
  copyRef?: { current: (() => void) | null }
}) {
  const [view, setView] = useState<View>('read')
  const [format, setFormat] = useState<ExportFormatId>('markdown')
  const { copied, copy } = useCopy()

  const html = useMemo(() => (doc ? DOMPurify.sanitize(toHtmlFragment({ ...doc, title: '', body: formatting ? doc.body : highlightAiIsms(doc.body) })) : ''), [doc, formatting])
  const exportFormat = exportFormatById(format)
  const exported = useMemo(() => (doc && view === 'export' ? exportFormat.render(doc, ctx) : ''), [doc, ctx, view, exportFormat])

  async function handleCopy() {
    if (!doc) return
    if (view === 'export') return copy(exported, 'main')
    if (view === 'edit') return copy(doc.body, 'main')
    // Rich copy pastes with formatting intact into Google Docs, Notion, Medium, WordPress…
    return copy(() => copyRich(toHtmlFragment(doc), toPlainText(doc)), 'main')
  }
  // Expose copy to the global ⌘⇧C shortcut with the current view's semantics.
  useEffect(() => {
    if (copyRef) copyRef.current = doc ? () => void handleCopy() : null
  })

  function handleDownload() {
    if (!doc) return
    const f = view === 'export' ? exportFormat : exportFormatById('markdown')
    downloadText(exportFilename(doc, f), view === 'export' ? exported : f.render(doc, ctx), f.mime)
  }

  const tabs: { id: View; label: string }[] = [
    { id: 'read', label: 'Read' },
    { id: 'edit', label: 'Edit' },
    { id: 'changes', label: 'Changes' },
    { id: 'export', label: 'Export' },
  ]

  return (
    <Panel
      number="03"
      title="Page"
      className="flex min-h-[40rem] flex-col"
      aside={
        doc && (
          <span className="hidden font-mono text-[11px] text-ink-3 tabular-nums sm:inline">
            {wordCount(stripMarkdown(doc.body))} words · {readingMinutes(doc)} min
          </span>
        )
      }
    >
      {!doc ? (
        <EmptyPage />
      ) : (
        <div className="flex flex-1 flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <div role="tablist" aria-label="Page view" className="flex gap-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={view === t.id}
                  onClick={() => setView(t.id)}
                  className={cx(
                    'relative px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                    view === t.id ? 'text-ink' : 'text-ink-3 hover:text-ink-2',
                  )}
                >
                  {t.label}
                  {view === t.id && <span className="absolute inset-x-2.5 -bottom-0.5 h-0.5 rounded bg-accent" />}
                </button>
              ))}
            </div>
            <div className="ml-auto flex gap-1.5">
              <Button size="sm" onClick={handleCopy} disabled={formatting}>
                {copied === 'main' ? <Check className="size-3.5 text-olive" /> : <Copy className="size-3.5" />}
                {copied === 'main' ? 'Copied' : 'Copy'}
              </Button>
              <Button size="sm" variant="ink" onClick={handleDownload} disabled={formatting}>
                <Download className="size-3.5" /> {view === 'export' ? `.${exportFormat.extension}` : 'Download'}
              </Button>
            </div>
          </div>

          {formatting && (
            <div className="space-y-1.5" aria-live="polite">
              <ProgressBar value={loading?.fraction ?? null} />
              <p className="text-[11px] text-ink-3">
                {loading
                  ? `Downloading the editor model${loading.totalBytes ? ` · ${Math.round(loading.loadedBytes / 1e6)} of ${Math.round(loading.totalBytes / 1e6)} MB` : ''}. One time only.`
                  : 'Writing it up…'}
              </p>
            </div>
          )}

          {!formatting && view !== 'export' && <VoiceReport transcript={transcript} doc={doc} onFix={() => onDocChange({ ...doc, body: fixAiIsms(doc.body) })} />}

          {view === 'read' && (
            <article className="animate-rise">
              <header className="mb-6 border-b border-rule pb-5">
                <textarea
                  value={doc.title}
                  onChange={(e) => onDocChange({ ...doc, title: e.target.value.replace(/\n/g, ' ') })}
                  placeholder="Untitled"
                  aria-label="Title"
                  rows={1}
                  className="field-sizing-content w-full resize-none bg-transparent font-display text-[2.6rem] leading-[1.05] tracking-tight text-ink placeholder:text-rule-strong focus:outline-none"
                />
                <textarea
                  value={doc.description}
                  onChange={(e) => onDocChange({ ...doc, description: e.target.value.replace(/\n/g, ' ') })}
                  placeholder="A one-line description for previews and search"
                  aria-label="Description"
                  rows={1}
                  className="field-sizing-content mt-2 w-full resize-none bg-transparent font-serif text-lg text-ink-2 italic placeholder:text-rule-strong focus:outline-none"
                />
                <TagsInput tags={doc.tags} onChange={(tags) => onDocChange({ ...doc, tags })} />
              </header>
              {layout === 'thread' ? (
                <ThreadView body={doc.body} />
              ) : (
                <div className="prose prose-desk max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
              )}
              {formatting && <span className="ml-0.5 inline-block h-5 w-0.5 animate-blink bg-accent align-middle" />}
            </article>
          )}

          {view === 'edit' && (
            <textarea
              value={doc.body}
              onChange={(e) => onDocChange({ ...doc, body: e.target.value })}
              className="min-h-[32rem] flex-1 resize-y rounded-xl border border-rule bg-paper/50 p-4 font-mono text-[13px] leading-relaxed text-ink-2 focus:border-ink-3 focus:outline-none"
              aria-label="Markdown body"
            />
          )}

          {view === 'changes' && <ChangesView transcript={transcript} doc={doc} />}

          {view === 'export' && (
            <div className="flex flex-1 flex-col gap-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {EXPORT_FORMATS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id)}
                    aria-pressed={format === f.id}
                    className={cx(
                      'rounded-xl border px-3 py-2.5 text-left transition-colors',
                      format === f.id ? 'border-ink bg-paper shadow-lift' : 'border-rule hover:border-rule-strong hover:bg-paper/60',
                    )}
                  >
                    <span className="flex items-center justify-between text-[13px] font-medium text-ink">
                      {f.label}
                      <span className="font-mono text-[10px] text-ink-3">.{f.extension}</span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-ink-3">{f.hint}</span>
                  </button>
                ))}
              </div>
              <pre className="max-h-[34rem] flex-1 overflow-auto rounded-xl border border-rule bg-well p-4 font-mono text-[12px] leading-relaxed break-words whitespace-pre-wrap text-ink-2">
                {exported}
              </pre>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
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
  if (draft === null)
    return (
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {tags.map((t) => (
          <span key={t} className="rounded-full bg-well px-2.5 py-0.5 font-mono text-[11px] text-ink-2">
            #{t}
          </span>
        ))}
        <button type="button" onClick={() => setDraft(tags.join(', '))} className="px-1 text-[11px] text-ink-3 hover:text-ink">
          {tags.length ? 'edit tags' : '+ add tags'}
        </button>
      </div>
    )
  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && commit(e.currentTarget.value)}
      placeholder="tags, comma separated"
      aria-label="Tags"
      className="mt-3 w-full rounded-lg border border-rule bg-paper px-3 py-1.5 font-mono text-xs text-ink focus:border-ink-3 focus:outline-none"
    />
  )
}
