import { Loader2, Settings2, Square, Wand2 } from 'lucide-react'
import { LAYOUTS, LENGTHS, TONES } from '../lib/format/styles'
import type { FormatOptions } from '../lib/format/types'
import { ENGINES, type EngineId } from '../lib/llm/types'
import { cx, inputClass } from './classes'
import { Badge, Button, Card, Field, Segmented, Toggle } from './ui'

const PRIVACY_TONE = { 'on-device': 'green', 'local server': 'sky', cloud: 'amber' } as const

export function StylePanel({
  options,
  onOptionsChange,
  engine,
  onEngineChange,
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
  canFormat: boolean
  formatting: boolean
  onFormat: () => void
  onCancel: () => void
  onOpenSettings: () => void
}) {
  const set = <K extends keyof FormatOptions>(key: K, value: FormatOptions[K]) => onOptionsChange({ ...options, [key]: value })
  const activeEngine = ENGINES.find((e) => e.id === engine) ?? ENGINES[0]

  return (
    <Card step={2} title="Shape it" subtitle="Pick a layout, a tone and an engine.">
      <div className="space-y-5">
        <Field label="Layout">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {LAYOUTS.map((layout) => (
              <button
                key={layout.id}
                type="button"
                title={layout.blurb}
                onClick={() => set('layout', layout.id)}
                aria-pressed={options.layout === layout.id}
                className={cx(
                  'flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors',
                  options.layout === layout.id
                    ? 'border-violet-500/60 bg-violet-500/10 ring-1 ring-violet-500/40'
                    : 'border-white/10 bg-zinc-950/40 hover:border-white/20 hover:bg-zinc-800/50',
                )}
              >
                <span className="text-lg leading-none">{layout.emoji}</span>
                <span className="text-xs font-medium text-zinc-100">{layout.label}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Tone" hint={TONES.find((t) => t.id === options.tone)?.blurb}>
          <Segmented value={options.tone} onChange={(tone) => set('tone', tone)} options={TONES.map((t) => ({ value: t.id, label: t.label }))} />
        </Field>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <Field label="Length">
            <Segmented
              size="sm"
              value={options.length}
              onChange={(length) => set('length', length)}
              options={LENGTHS.map((l) => ({ value: l.id, label: l.label, title: l.guide }))}
            />
          </Field>
          <div className="flex flex-wrap gap-x-5 gap-y-2 pb-1">
            <Toggle checked={options.includeTitle} onChange={(v) => set('includeTitle', v)} label="Title" />
            <Toggle checked={options.includeSummary} onChange={(v) => set('includeSummary', v)} label="TL;DR" />
            <Toggle checked={options.includeTags} onChange={(v) => set('includeTags', v)} label="Tags" />
          </div>
        </div>

        <Field label="Extra instructions (optional)">
          <input
            value={options.instructions}
            onChange={(e) => set('instructions', e.target.value)}
            aria-label="Extra instructions"
            placeholder='e.g. "audience is beginner devs", "end with a plug for my newsletter"'
            className={inputClass}
          />
        </Field>

        <Field
          label="Engine"
          hint={
            <span className="flex flex-wrap items-center gap-2">
              {activeEngine.tagline}
              <Badge tone={PRIVACY_TONE[activeEngine.privacy]}>{activeEngine.privacy}</Badge>
              <Badge tone={activeEngine.cost === 'free' ? 'green' : 'zinc'}>{activeEngine.cost}</Badge>
              {engine === 'instant' && options.instructions && <span className="text-amber-400/80">Extra instructions need an AI engine.</span>}
            </span>
          }
        >
          <div className="flex gap-2">
            <select value={engine} aria-label="Engine" onChange={(e) => onEngineChange(e.target.value as EngineId)} className={cx(inputClass, 'flex-1')}>
              {ENGINES.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
            <Button onClick={onOpenSettings} title="Engine settings" aria-label="Engine settings">
              <Settings2 className="size-4" />
            </Button>
          </div>
        </Field>

        {formatting ? (
          <Button variant="secondary" size="lg" className="w-full" onClick={onCancel}>
            <Loader2 className="size-4 animate-spin" /> Formatting… <Square className="ml-1 size-3 fill-current" /> Stop
          </Button>
        ) : (
          <Button variant="primary" size="lg" className="w-full" disabled={!canFormat} onClick={onFormat}>
            <Wand2 className="size-4" /> Auto-format
            <kbd className="ml-1 rounded bg-white/15 px-1.5 py-0.5 font-sans text-[10px]">⌘↵</kbd>
          </Button>
        )}
      </div>
    </Card>
  )
}
