import { ArrowRight, Loader2, Settings2, Square } from 'lucide-react'
import { useMemo } from 'react'
import { changes } from '../lib/analysis/voice'
import { cleanTranscript } from '../lib/format/cleanup'
import { LAYOUTS, LENGTHS, TONES, toneById } from '../lib/format/styles'
import type { FormatOptions } from '../lib/format/types'
import { ENGINES, type EngineId } from '../lib/llm/types'
import { cx, inputClass } from './classes'
import { LayoutThumb } from './LayoutThumb'
import { Button, CheckChip, Field, Kbd, Panel, Segmented } from './ui'

const PRIVACY = {
  'on-device': { dot: 'bg-olive', text: 'Stays on this device' },
  'local server': { dot: 'bg-ink-3', text: 'Stays on your computer' },
  cloud: { dot: 'bg-accent', text: 'Sent to the provider you choose' },
} as const

const MESSY = /\b(?:um+|uh+|like|you know|bro|dude|gonna|wanna|kinda|sorta|lol|yeah|basically|literally|fucking|stuff|i mean|so)\b/gi
const DEFAULT_SAMPLE = "so um yeah bro honestly it's kinda crazy how good it's gotten, you know, like it's fucking wild lol"

/** The messiest sentence of the user's own transcript makes the best demonstration. */
function pickSample(transcript: string): string {
  const candidates = transcript
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => {
      const n = s.split(/\s+/).length
      return n >= 6 && n <= 32
    })
  let best = ''
  let bestScore = 1
  for (const s of candidates) {
    const score = (s.match(MESSY) ?? []).length
    if (score > bestScore) {
      best = s
      bestScore = score
    }
  }
  return best || DEFAULT_SAMPLE
}

function VoiceProof({ transcript, tone, keepWords }: { transcript: string; tone: FormatOptions['tone']; keepWords: string[] }) {
  const sample = useMemo(() => pickSample(transcript), [transcript])
  const { strictness, label } = toneById(tone)
  const parts = useMemo(() => {
    const after = cleanTranscript(sample, strictness, keepWords).flat().join(' ')
    return changes(sample, after)
  }, [sample, strictness, keepWords])

  return (
    <div className="rounded-xl border border-dashed border-rule-strong bg-paper/50 px-4 py-3">
      <p className="small-caps mb-1.5 flex items-center gap-1.5 text-ink-3">
        {sample === DEFAULT_SAMPLE ? 'Example' : 'From your transcript'} <ArrowRight className="size-3" /> {label}
      </p>
      <p className="font-serif text-[15px] leading-relaxed text-ink">
        {parts.map((p, i) =>
          p.removed ? (
            <del key={i} className="text-ink-3 decoration-accent/70 decoration-2">
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

export function StylePanel({
  options,
  onOptionsChange,
  engine,
  onEngineChange,
  transcript,
  keepWords,
  canFormat,
  formatting,
  onFormat,
  onCancel,
  onOpenSettings,
}: {
  options: FormatOptions
  onOptionsChange: (o: FormatOptions) => void
  engine: EngineId
  onEngineChange: (e: EngineId) => void
  transcript: string
  keepWords: string[]
  canFormat: boolean
  formatting: boolean
  onFormat: () => void
  onCancel: () => void
  onOpenSettings: () => void
}) {
  const set = <K extends keyof FormatOptions>(key: K, value: FormatOptions[K]) => onOptionsChange({ ...options, [key]: value })
  const activeEngine = ENGINES.find((e) => e.id === engine) ?? ENGINES[0]
  const tone = toneById(options.tone)
  const toneIndex = TONES.findIndex((t) => t.id === tone.id)

  return (
    <Panel number="02" title="Shape">
      <div className="space-y-6">
        <Field label="Layout">
          <div className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-3 sm:grid-cols-5">
            {LAYOUTS.map((layout) => {
              const active = options.layout === layout.id
              return (
                <button
                  key={layout.id}
                  type="button"
                  title={layout.blurb}
                  onClick={() => set('layout', layout.id)}
                  aria-pressed={active}
                  className={cx(
                    'group flex flex-col gap-1.5 rounded-xl border p-2 text-left transition-all',
                    active ? 'border-ink bg-paper shadow-lift' : 'border-rule hover:-translate-y-0.5 hover:border-rule-strong hover:bg-paper/60',
                  )}
                >
                  <span className={cx('rounded-lg p-1.5 transition-colors', active ? 'bg-well text-ink' : 'bg-well/60 text-ink-3 group-hover:text-ink-2')}>
                    <LayoutThumb layout={layout.id} className="h-auto w-full" />
                  </span>
                  <span className={cx('px-0.5 text-xs font-medium', active ? 'text-ink' : 'text-ink-2')}>{layout.label}</span>
                </button>
              )
            })}
          </div>
        </Field>

        <Field label="How much of you">
          {/* The voice dial: four stops on a track, from untouched to buttoned-up. */}
          <div className="relative">
            <div className="absolute top-[13px] right-[12.5%] left-[12.5%] h-0.5 rounded bg-rule" aria-hidden />
            <div
              className="absolute top-[13px] left-[12.5%] h-0.5 rounded bg-ink transition-all duration-300"
              style={{ width: `${(toneIndex / (TONES.length - 1)) * 75}%` }}
              aria-hidden
            />
            <div role="radiogroup" aria-label="Editing level" className="relative grid grid-cols-4">
              {TONES.map((t, i) => {
                const active = t.id === tone.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => set('tone', t.id)}
                    className="group flex flex-col items-center gap-2 pb-1"
                  >
                    <span
                      className={cx(
                        'grid size-7 place-items-center rounded-full border-2 transition-all',
                        active
                          ? 'scale-110 border-ink bg-ink'
                          : i < toneIndex
                            ? 'border-ink bg-sheet'
                            : 'border-rule-strong bg-sheet group-hover:border-ink-3',
                      )}
                    >
                      <span className={cx('size-2 rounded-full', active ? 'bg-accent' : 'bg-transparent')} />
                    </span>
                    <span
                      className={cx('text-center text-[13px] leading-tight font-medium', active ? 'text-ink' : 'text-ink-3 group-hover:text-ink-2')}
                    >
                      {t.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <p className="mt-3 text-[13px] text-ink-2">{tone.blurb}</p>
          <div className="mt-3">
            <VoiceProof transcript={transcript} tone={options.tone} keepWords={keepWords} />
          </div>
        </Field>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <Field label="Length">
            <Segmented
              size="sm"
              label="Length"
              value={options.length}
              onChange={(length) => set('length', length)}
              options={LENGTHS.map((l) => ({ value: l.id, label: l.label, title: l.guide }))}
            />
          </Field>
          <Field label="Extras">
            <div className="flex flex-wrap gap-1.5">
              <CheckChip checked={options.includeTitle} onChange={(v) => set('includeTitle', v)} label="Title" />
              <CheckChip checked={options.includeSummary} onChange={(v) => set('includeSummary', v)} label="TL;DR" />
              <CheckChip checked={options.includeTags} onChange={(v) => set('includeTags', v)} label="Tags" />
            </div>
          </Field>
        </div>

        <Field
          label="Note to the editor"
          hint={engine === 'instant' && options.instructions ? 'Notes are read by AI editors; Instant ignores them.' : undefined}
        >
          <input
            value={options.instructions}
            onChange={(e) => set('instructions', e.target.value)}
            aria-label="Note to the editor"
            placeholder="e.g. “audience is junior devs” or “keep the story about my dad”"
            className={inputClass}
          />
        </Field>

        <Field
          label="Editor"
          hint={
            <span className="flex items-center gap-1.5">
              <span className={cx('size-1.5 shrink-0 rounded-full', PRIVACY[activeEngine.privacy].dot)} />
              {activeEngine.tagline} {PRIVACY[activeEngine.privacy].text}.
            </span>
          }
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {ENGINES.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => onEngineChange(e.id)}
                aria-pressed={e.id === engine}
                className={cx(
                  'inline-flex h-8 items-center gap-2 rounded-full px-3 text-[13px] font-medium ring-1 ring-inset transition-colors',
                  e.id === engine ? 'bg-ink text-paper ring-ink' : 'text-ink-2 ring-rule-strong hover:bg-well',
                )}
              >
                <span className={cx('size-1.5 rounded-full', PRIVACY[e.privacy].dot)} />
                {e.label}
              </button>
            ))}
            <Button variant="ghost" size="sm" onClick={onOpenSettings} aria-label="Editor settings" title="Editor settings" className="size-8 px-0">
              <Settings2 className="size-4" />
            </Button>
          </div>
        </Field>

        {formatting ? (
          <Button variant="outline" size="lg" className="w-full" onClick={onCancel}>
            <Loader2 className="size-4 animate-spin" /> Writing it up… <Square className="ml-2 size-3 fill-current" /> Stop
          </Button>
        ) : (
          <Button variant="ink" size="lg" className="w-full" disabled={!canFormat} onClick={onFormat}>
            Format it
            <span className="ml-1 flex gap-0.5">
              <Kbd>⌘</Kbd>
              <Kbd>↵</Kbd>
            </span>
          </Button>
        )}
      </div>
    </Panel>
  )
}
