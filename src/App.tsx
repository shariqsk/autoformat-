import { AlertCircle, BookOpen, Keyboard, Moon, Settings, Sun, UserRound, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HistoryDrawer } from './components/HistoryDrawer'
import { OutputPanel } from './components/OutputPanel'
import { RecorderPanel, type RecorderControls } from './components/RecorderPanel'
import { SettingsDialog } from './components/SettingsDialog'
import { ShortcutsDialog } from './components/ShortcutsDialog'
import { StylePanel } from './components/StylePanel'
import { Button } from './components/ui'
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

function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 fill-current" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

export default function App() {
  const [settings, setSettings] = usePersistentState('autoformat:settings', DEFAULT_SETTINGS)
  const [engines, setEngines] = usePersistentState('autoformat:engines', DEFAULT_ENGINE_SETTINGS)
  const [storedOptions, setOptions] = usePersistentState<FormatOptions>('autoformat:options', DEFAULT_OPTIONS)
  const [profile, setProfile] = usePersistentState<VoiceProfile>('autoformat:voice', EMPTY_PROFILE)
  const [transcript, setTranscript] = usePersistentState('autoformat:transcript', '')
  const [history, setHistory] = usePersistentState<HistoryEntry[]>('autoformat:history', [])
  const [current, setCurrent] = usePersistentState<HistoryEntry | null>('autoformat:current', null)
  const { theme, toggle: toggleTheme } = useTheme()

  // Drafts from older versions may carry tone ids that no longer exist.
  const options = useMemo(() => ({ ...storedOptions, tone: normalizeToneId(storedOptions.tone) }), [storedOptions])

  const [formatting, setFormatting] = useState(false)
  const [loading, setLoading] = useState<LoadProgress | null>(null)
  const [liveDoc, setLiveDoc] = useState<FormattedDoc | null>(null)
  const [dialog, setDialog] = useState<'settings' | 'voice' | 'shortcuts' | 'drafts' | null>(null)
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
        toggleTheme()
      } else if (!mod && !e.altKey && !isTyping(e.target) && !dialog) {
        if (e.key === 'r' || e.key === 'R') recorderRef.current?.toggle()
        else if (e.key === ' ' && recorderRef.current?.pauseResume()) e.preventDefault()
        else if (e.key === '?') setDialog('shortcuts')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [runFormat, toggleTheme, dialog])

  const exportCtx = useMemo(
    () => ({
      createdAt: current ? new Date(current.createdAt) : sessionStart,
      layout: current?.options.layout ?? options.layout,
      tone: normalizeToneId(current?.options.tone ?? options.tone),
    }),
    [current, options.layout, options.tone, sessionStart],
  )

  const closeDialog = useCallback(() => setDialog(null), [])
  const today = sessionStart.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const navButton = 'h-9 gap-2 px-3 text-ink-2'

  return (
    <div className="min-h-full">
      <header className="mx-auto max-w-[1440px] px-4 pt-6 sm:px-8 sm:pt-8">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="small-caps hidden text-ink-3 sm:block">The dictation desk · {today}</p>
            <h1 className="mt-1 font-display text-[2.75rem] leading-[0.9] tracking-tight whitespace-nowrap text-ink sm:text-[4rem]">
              Auto<span className="text-accent italic">format</span>
              <span className="ml-1 inline-block size-2.5 animate-blink rounded-full bg-accent align-top sm:size-3" aria-hidden />
            </h1>
          </div>
          <nav className="flex shrink-0 items-center gap-0.5 pb-1" aria-label="Main">
            <Button variant="ghost" className={navButton} onClick={() => setDialog('drafts')} title="Drafts (⌘K)">
              <BookOpen className="size-4" /> <span className="hidden md:inline">Drafts</span>
              {history.length > 0 && <span className="font-mono text-[11px] text-ink-3 tabular-nums">{history.length}</span>}
            </Button>
            <Button variant="ghost" className={navButton} onClick={() => setDialog('voice')} title="Your voice profile">
              <UserRound className="size-4" /> <span className="hidden md:inline">Your voice</span>
            </Button>
            <Button variant="ghost" className={navButton} onClick={() => setDialog('settings')} title="Settings">
              <Settings className="size-4" /> <span className="hidden md:inline">Settings</span>
            </Button>
            <Button variant="ghost" className="size-9 px-0" onClick={toggleTheme} aria-label="Toggle dark mode" title="Light / dark (⌘.)">
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button
              variant="ghost"
              className="hidden size-9 px-0 sm:inline-flex"
              onClick={() => setDialog('shortcuts')}
              aria-label="Keyboard shortcuts"
              title="Shortcuts (?)"
            >
              <Keyboard className="size-4" />
            </Button>
            <a
              href="https://github.com/shariqsk/autoformat-"
              target="_blank"
              rel="noreferrer"
              className="hidden size-9 place-items-center rounded-full text-ink-2 hover:bg-well hover:text-ink sm:grid"
              aria-label="Source on GitHub"
            >
              <GithubMark />
            </a>
          </nav>
        </div>
        <div className="mt-4 border-t-2 border-ink" />
        <div className="mt-[3px] border-t border-ink" />
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2.5">
          <p className="font-serif text-[15px] text-ink-2 italic">Talk the way you talk. Get back writing that still sounds like you.</p>
          <p className="small-caps flex gap-4 text-ink-3">
            <span>Private by default</span>
            <span>Free</span>
            <span className="hidden sm:inline">Works offline</span>
          </p>
        </div>
      </header>

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
        <div className="border-t border-rule pt-4 text-xs leading-relaxed text-ink-3 sm:flex sm:justify-between">
          <p>Speech by Whisper, on your device. Nothing leaves your browser unless you choose a cloud editor.</p>
          <p className="font-serif italic">Set in Instrument Serif, Newsreader &amp; Inter Tight.</p>
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
          <div key={t.id} className="flex animate-rise items-start gap-3 rounded-2xl bg-ink p-3.5 pr-3 text-sm text-paper shadow-sheet">
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
