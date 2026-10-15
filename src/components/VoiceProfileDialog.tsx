import { ArrowRight, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { MAX_SAMPLE_CHARS, type VoiceProfile } from '../lib/voice'
import { cx, inputClass } from './classes'
import { Modal } from './Modal'
import { Button } from './ui'

function Section({ title, children, description }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-rule pt-6 first:border-0 first:pt-0">
      <div>
        <h3 className="font-display text-2xl leading-none text-ink">{title}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">{description}</p>
      </div>
      {children}
    </section>
  )
}

function KeepWords({ words, onChange }: { words: string[]; onChange: (w: string[]) => void }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const next = draft
      .split(',')
      .map((w) => w.trim())
      .filter((w) => w && !words.some((x) => x.toLowerCase() === w.toLowerCase()))
    if (next.length) onChange([...words, ...next])
    setDraft('')
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-rule bg-paper/70 p-2 focus-within:border-ink-3">
      {words.map((w) => (
        <span key={w} className="inline-flex items-center gap-1 rounded-full bg-ink py-1 pr-1 pl-3 text-[13px] text-paper">
          {w}
          <button type="button" onClick={() => onChange(words.filter((x) => x !== w))} aria-label={`Remove ${w}`} className="rounded-full p-0.5 hover:bg-paper/20">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add()
          } else if (e.key === 'Backspace' && !draft && words.length) onChange(words.slice(0, -1))
        }}
        onBlur={add}
        aria-label="Add a word to keep"
        placeholder={words.length ? 'Add another…' : 'bro, lowkey, no cap, y’all…'}
        className="min-w-32 flex-1 bg-transparent px-2 py-1 text-sm text-ink placeholder:text-ink-3 focus:outline-none"
      />
    </div>
  )
}

export function VoiceProfileDialog({
  open,
  onClose,
  profile,
  onChange,
}: {
  open: boolean
  onClose: () => void
  profile: VoiceProfile
  onChange: (p: VoiceProfile) => void
}) {
  const rows = profile.replacements.length ? profile.replacements : [{ from: '', to: '' }]
  const setRow = (i: number, patch: Partial<{ from: string; to: string }>) =>
    onChange({ ...profile, replacements: rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) })

  return (
    <Modal open={open} onClose={onClose} title="Your voice" kicker="Voice profile">
      <div className="space-y-8">
        <p className="-mt-2 font-serif text-lg leading-relaxed text-ink-2 italic">
          Teach the editor what makes you sound like you. All of this stays in your browser.
        </p>

        <Section
          title="Words that stay"
          description="Your catchphrases and the slang you actually want on the page. No editing level and no AI editor is allowed to remove or change these."
        >
          <KeepWords words={profile.keepWords} onChange={(keepWords) => onChange({ ...profile, keepWords })} />
        </Section>

        <Section
          title="Words Whisper gets wrong"
          description="Names, brands and jargon that speech recognition keeps mishearing. Fixed automatically in every transcript."
        >
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={r.from}
                  onChange={(e) => setRow(i, { from: e.target.value })}
                  placeholder="clawed"
                  aria-label="Misheard as"
                  className={cx(inputClass, 'font-mono text-[13px]')}
                />
                <ArrowRight className="size-4 shrink-0 text-ink-3" />
                <input
                  value={r.to}
                  onChange={(e) => setRow(i, { to: e.target.value })}
                  placeholder="Claude"
                  aria-label="Should be"
                  className={cx(inputClass, 'font-mono text-[13px]')}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-9 px-0"
                  aria-label="Remove fix"
                  onClick={() => onChange({ ...profile, replacements: rows.filter((_, j) => j !== i) })}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => onChange({ ...profile, replacements: [...rows, { from: '', to: '' }] })}>
              <Plus className="size-3.5" /> Add a fix
            </Button>
          </div>
        </Section>

        <Section
          title="How you write"
          description="Paste a few paragraphs you typed yourself: an old post, a long message, anything. AI editors use it to match your rhythm and word choice. (Instant ignores it.)"
        >
          <textarea
            value={profile.samples}
            onChange={(e) => onChange({ ...profile, samples: e.target.value })}
            aria-label="Writing samples"
            placeholder="Paste something you wrote…"
            className={cx(inputClass, 'min-h-40 resize-y font-serif text-[15px] leading-relaxed')}
          />
          <p className={cx('text-right font-mono text-[11px]', profile.samples.length > MAX_SAMPLE_CHARS ? 'text-accent-deep' : 'text-ink-3')}>
            {profile.samples.length.toLocaleString()} / {MAX_SAMPLE_CHARS.toLocaleString()}
            {profile.samples.length > MAX_SAMPLE_CHARS && ' (the rest is ignored)'}
          </p>
        </Section>
      </div>
    </Modal>
  )
}
