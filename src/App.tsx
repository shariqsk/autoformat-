import { AlertCircle, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HistoryDrawer } from './components/HistoryDrawer'
import { Masthead } from './components/Masthead'
import { OutputPanel } from './components/OutputPanel'
import { RecorderPanel, type RecorderControls } from './components/RecorderPanel'
import { SettingsDialog } from './components/SettingsDialog'
import { ShortcutsDialog } from './components/ShortcutsDialog'
import { StyleDialog } from './components/StyleDialog'
import { StylePanel } from './components/StylePanel'
import { VoiceProfileDialog } from './components/VoiceProfileDialog'
import { usePersistentState } from './hooks/usePersistentState'
import { useTheme } from './hooks/useTheme'
import { applyReplacements, type Strictness } from './lib/format/cleanup'
import { applyHeadingPlan, buildHeadingPrompt, extractSections, parseHeadingPlan } from './lib/format/headings'
import { formatLocally } from './lib/format/local'
import { parseModelOutput } from './lib/format/parse'
import { buildPrompt, precleanTranscript, targetWords } from './lib/format/prompt'
import { normalizeToneId, toneById } from './lib/format/styles'
import { stripMarkdown } from './lib/format/text'
import { DEFAULT_OPTIONS, type FormatOptions, type FormattedDoc } from './lib/format/types'
import { newEntryId, upsertHistory, type HistoryEntry } from './lib/history'
import { generate } from './lib/llm'
import type { LoadProgress } from './lib/ml/protocol'
import { DEFAULT_ENGINE_SETTINGS, DEFAULT_SETTINGS } from './lib/settings'
import { EMPTY_PROFILE, type VoiceProfile } from './lib/voice'

interface Toast {
  id: number
  message: string
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

export default function App() {
  const [settings, setSettings] = usePersistentState('autoformat:settings', DEFAULT_SETTINGS)
  const [engines, setEngines] = usePersistentState('autoformat:engines', DEFAULT_ENGINE_SETTINGS)
  const [storedOptions, setOptions] = usePersistentState<FormatOptions>('autoformat:options', DEFAULT_OPTIONS)
  const [profile, setProfile] = usePersistentState<VoiceProfile>('autoformat:voice', EMPTY_PROFILE)
  const [transcript, setTranscript] = usePersistentState('autoformat:transcript', '')
  const [history, setHistory] = usePersistentState<HistoryEntry[]>('autoformat:history', [])
  const [current, setCurrent] = usePersistentState<HistoryEntry | null>('autoformat:current', null)
  const { theme, setTheme, cycle: cycleTheme } = useTheme()

  // Drafts from older versions may carry tone ids that no longer exist.
  const options = useMemo(() => ({ ...storedOptions, tone: normalizeToneId(storedOptions.tone) }), [storedOptions])

  const [formatting, setFormatting] = useState(false)
  const [loading, setLoading] = useState<LoadProgress | null>(null)
  const [liveDoc, setLiveDoc] = useState<FormattedDoc | null>(null)
  const [dialog, setDialog] = useState<'settings' | 'voice' | 'shortcuts' | 'drafts' | 'style' | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [sessionStart] = useState(() => new Date())
  const abortRef = useRef<AbortController | null>(null)
  const recorderRef = useRef<RecorderControls>(null)
  const copyRef = useRef<(() => void) | null>(null)

  const notify = useCallback((message: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 8000)
  }, [])

  const commit = useCallback(
    (entry: HistoryEntry) => {
      setCurrent(entry)
      setHistory((h) => upsertHistory(h, entry))
    },
    [setCurrent, setHistory],
  )

  const runFormat = useCallback(async () => {
    if (!transcript.trim() || formatting) return
    const source = applyReplacements(transcript, profile.replacements)
    const base = { id: newEntryId(), createdAt: new Date().toISOString(), transcript: source, options, engine: settings.engine }

    const local = () => formatLocally(source, options, { keepWords: profile.keepWords })
    if (settings.engine === 'instant') {
      commit({ ...base, doc: local() })
      return
    }

    // Small in-browser models can't rewrite without losing the speaker's voice, so by default they
    // only name things: the page is the rule-cleaned transcript, the model adds title and headings.
    if (settings.engine === 'browser' && settings.browserMode !== 'rewrite') {
      const draft = local()
      const sections = extractSections(draft.body)
      if (!sections.length && !options.includeTitle) {
        commit({ ...base, doc: draft })
        return
      }
      const controller = new AbortController()
      abortRef.current = controller
      setFormatting(true)
      setLiveDoc(draft)
      try {
        const opening = stripMarkdown(draft.body).split(/\s+/).slice(0, 60).join(' ')
        const { system, user } = buildHeadingPrompt(sections, opening, options.includeTitle)
        const reply = await generate('browser', engines, {
          system,
          user,
          signal: controller.signal,
          maxWords: sections.length * 10 + 24,
          onLoading: setLoading,
          onDelta: () => setLoading(null),
        })
        const plan = parseHeadingPlan(reply)
        commit({
          ...base,
          doc: {
            ...draft,
            title: options.includeTitle ? plan.title || draft.title : '',
            body: applyHeadingPlan(draft.body, sections, plan),
          },
        })
      } catch (err) {
        if (!controller.signal.aborted) notify(err instanceof Error ? err.message : String(err))
        commit({ ...base, doc: draft })
      } finally {
        abortRef.current = null
        setFormatting(false)
        setLoading(null)
        setLiveDoc(null)
      }
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setFormatting(true)
    setLoading(null)
    const small = settings.engine === 'browser'
    // Big models do better with the speaker's raw voice; small ones need the noise removed first.
    const strictness = (small ? toneById(options.tone).strictness : Math.min(toneById(options.tone).strictness, 1)) as Strictness
    const cleaned = precleanTranscript(source, strictness, profile.keepWords)
    const { system, user } = buildPrompt(cleaned, options, { compact: small, profile })
    let raw = ''
    let frame = 0
    try {
      const full = await generate(settings.engine, engines, {
        system,
        user,
        signal: controller.signal,
        maxWords: Math.round(targetWords(cleaned, options) * 1.3),
        onLoading: setLoading,
        onDelta: (delta) => {
          raw += delta
          // Re-parse at most once per frame while tokens stream in.
          if (!frame)
            frame = requestAnimationFrame(() => {
              frame = 0
              setLoading(null)
              setLiveDoc(parseModelOutput(raw, options))
            })
        },
      })
      const doc = parseModelOutput(full || raw, options)
      if (!doc.body.trim()) throw new Error('The editor returned an empty page. Try again or pick another editor.')
      commit({ ...base, doc })
    } catch (err) {
      if (controller.signal.aborted) {
        if (raw.trim()) commit({ ...base, doc: parseModelOutput(raw, options) })
      } else {
        notify(err instanceof Error ? err.message : String(err))
      }
    } finally {
      cancelAnimationFrame(frame)
      abortRef.current = null
      setFormatting(false)
      setLoading(null)
      setLiveDoc(null)
    }
  }, [transcript, formatting, options, settings.engine, settings.browserMode, engines, profile, commit, notify])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'Enter') {
        e.preventDefault()
        void runFormat()
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'c' && copyRef.current) {
        e.preventDefault()
        copyRef.current()
      } else if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setDialog((d) => (d === 'drafts' ? null : 'drafts'))
      } else if (mod && e.key === '.') {
        e.preventDefault()
        cycleTheme()
      } else if (!mod && !e.altKey && !e.repeat && !isTyping(e.target) && !dialog) {
        if (e.key === 'r' || e.key === 'R') recorderRef.current?.toggle()
        else if (e.key === ' ' && recorderRef.current?.pauseResume()) e.preventDefault()
        else if (e.key === '?') setDialog('shortcuts')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [runFormat, cycleTheme, dialog])

  const exportCtx = useMemo(
    () => ({
      createdAt: current ? new Date(current.createdAt) : sessionStart,
      layout: current?.options.layout ?? options.layout,
      tone: normalizeToneId(current?.options.tone ?? options.tone),
    }),
    [current, options.layout, options.tone, sessionStart],
  )

  const closeDialog = useCallback(() => setDialog(null), [])

  return (
    <div className="min-h-full">
      <Masthead theme={theme} draftCount={history.length} onOpen={setDialog} />

      <main className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-6 px-4 pt-4 pb-16 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="space-y-6">
          <RecorderPanel
            controlRef={recorderRef}
            settings={settings}
            onSettingsChange={setSettings}
            profile={profile}
            transcript={transcript}
            onTranscriptChange={setTranscript}
            onError={notify}
            onOpenSettings={() => setDialog('settings')}
          />
          <StylePanel
            options={options}
            onOptionsChange={setOptions}
            engine={settings.engine}
            onEngineChange={(engine) => setSettings({ ...settings, engine })}
            transcript={transcript}
            keepWords={profile.keepWords}
            canFormat={transcript.trim().length > 0}
            formatting={formatting}
            onFormat={() => void runFormat()}
            onCancel={() => abortRef.current?.abort()}
            onOpenSettings={() => setDialog('settings')}
          />
        </div>
        <div className="lg:sticky lg:top-6 lg:self-start">
          <OutputPanel
            doc={liveDoc ?? current?.doc ?? null}
            onDocChange={(doc) => current && commit({ ...current, doc })}
            ctx={exportCtx}
            transcript={current?.transcript ?? transcript}
            layout={current?.options.layout ?? options.layout}
            formatting={formatting}
            loading={loading}
            copyRef={copyRef}
            keepWords={profile.keepWords}
            onKeepWord={(word) =>
              setProfile((p) => (p.keepWords.some((w) => w.toLowerCase() === word) ? p : { ...p, keepWords: [...p.keepWords, word] }))
            }
          />
        </div>
      </main>

      <footer className="mx-auto max-w-[1440px] px-4 pb-10 sm:px-8">
        <div className="border-t-(length:--bw) border-rule pt-4 text-xs leading-relaxed text-ink-3 sm:flex sm:justify-between sm:gap-8">
          <p>
            Speech by{' '}
            <a
              href="https://github.com/openai/whisper"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-edge-ctl underline-offset-2 hover:text-ink"
            >
              Whisper
            </a>{' '}
            from OpenAI, run on your device with{' '}
            <a
              href="https://github.com/huggingface/transformers.js"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-edge-ctl underline-offset-2 hover:text-ink"
            >
              Transformers.js
            </a>{' '}
            by Hugging Face. In-browser writing by Google's Gemma and Alibaba's Qwen.
          </p>
          <p className="mt-1 sm:mt-0">
            Nothing leaves your browser unless you choose a cloud editor ·{' '}
            <button
              type="button"
              onClick={() => setDialog('settings')}
              className="underline decoration-edge-ctl underline-offset-2 hover:text-ink"
            >
              All credits
            </button>
          </p>
        </div>
      </footer>

      <SettingsDialog
        open={dialog === 'settings'}
        onClose={closeDialog}
        settings={settings}
        onSettingsChange={setSettings}
        engines={engines}
        onEnginesChange={setEngines}
      />
      <VoiceProfileDialog open={dialog === 'voice'} onClose={closeDialog} profile={profile} onChange={setProfile} />
      <ShortcutsDialog open={dialog === 'shortcuts'} onClose={closeDialog} />
      <StyleDialog open={dialog === 'style'} onClose={closeDialog} theme={theme} onChange={setTheme} />
      <HistoryDrawer
        open={dialog === 'drafts'}
        onClose={closeDialog}
        entries={history}
        activeId={current?.id ?? null}
        onSelect={(entry) => {
          setCurrent(entry)
          setTranscript(entry.transcript)
          setOptions({ ...entry.options, tone: normalizeToneId(entry.options.tone) })
          closeDialog()
        }}
        onDelete={(id) => setHistory((h) => h.filter((e) => e.id !== id))}
        onClear={() => setHistory([])}
      />

      <div className="fixed bottom-5 left-1/2 z-[60] flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-4" aria-live="assertive">
        {toasts.map((t) => (
          <div key={t.id} className="surface flex animate-rise items-start gap-3 p-3.5 pr-3 text-sm text-ink shadow-pop">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-accent" />
            <p className="flex-1 leading-snug">{t.message}</p>
            <button
              type="button"
              onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
              aria-label="Dismiss"
              className="opacity-60 hover:opacity-100"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
