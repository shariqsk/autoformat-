import { AlertCircle, History, Settings, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HistoryDrawer } from './components/HistoryDrawer'
import { OutputPanel } from './components/OutputPanel'
import { RecorderPanel } from './components/RecorderPanel'
import { SettingsDialog } from './components/SettingsDialog'
import { StylePanel } from './components/StylePanel'
import { Button } from './components/ui'
import { usePersistentState } from './hooks/usePersistentState'
import { formatLocally } from './lib/format/local'
import { parseModelOutput } from './lib/format/parse'
import { buildPrompt, precleanTranscript, targetWords } from './lib/format/prompt'
import { toneById } from './lib/format/styles'
import { DEFAULT_OPTIONS, type FormattedDoc } from './lib/format/types'
import { newEntryId, upsertHistory, type HistoryEntry } from './lib/history'
import { generate } from './lib/llm'
import type { LoadProgress } from './lib/ml/protocol'
import { DEFAULT_ENGINE_SETTINGS, DEFAULT_SETTINGS } from './lib/settings'

interface Toast {
  id: number
  message: string
}

export default function App() {
  const [settings, setSettings] = usePersistentState('autoformat:settings', DEFAULT_SETTINGS)
  const [engines, setEngines] = usePersistentState('autoformat:engines', DEFAULT_ENGINE_SETTINGS)
  const [options, setOptions] = usePersistentState('autoformat:options', DEFAULT_OPTIONS)
  const [transcript, setTranscript] = usePersistentState('autoformat:transcript', '')
  const [history, setHistory] = usePersistentState<HistoryEntry[]>('autoformat:history', [])
  const [current, setCurrent] = usePersistentState<HistoryEntry | null>('autoformat:current', null)

  const [formatting, setFormatting] = useState(false)
  const [loading, setLoading] = useState<LoadProgress | null>(null)
  const [liveDoc, setLiveDoc] = useState<FormattedDoc | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const [sessionStart] = useState(() => new Date())

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
    const base = { id: newEntryId(), createdAt: new Date().toISOString(), transcript, options, engine: settings.engine }

    if (settings.engine === 'instant') {
      commit({ ...base, doc: formatLocally(transcript, options) })
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setFormatting(true)
    setLoading(null)
    const small = settings.engine === 'browser'
    // Big models do better with the speaker's raw voice; small ones need the noise removed first.
    const strictness = small ? toneById(options.tone).strictness : Math.min(toneById(options.tone).strictness, 1)
    const cleaned = precleanTranscript(transcript, strictness as 0 | 1 | 2 | 3)
    const { system, user } = buildPrompt(cleaned, options, { compact: small })
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
      if (!doc.body.trim()) throw new Error('The model returned an empty response. Try again or pick another engine.')
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
  }, [transcript, formatting, options, settings.engine, engines, commit, notify])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        void runFormat()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [runFormat])

  const exportCtx = useMemo(
    () => ({
      createdAt: current ? new Date(current.createdAt) : sessionStart,
      layout: current?.options.layout ?? options.layout,
      tone: current?.options.tone ?? options.tone,
    }),
    [current, options.layout, options.tone, sessionStart],
  )

  return (
    <div className="min-h-full bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.15),transparent_60%)]">
      <header className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="size-9" />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">AutoFormat</h1>
            <p className="text-xs text-zinc-400">Talk it out. Publish it clean.</p>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)}>
            <History className="size-4" /> <span className="hidden sm:inline">History</span>
            {history.length > 0 && <span className="rounded-full bg-zinc-800 px-1.5 text-[10px] text-zinc-300">{history.length}</span>}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings className="size-4" /> <span className="hidden sm:inline">Settings</span>
          </Button>
          <a
            href="https://github.com/shariqsk/autoformat-"
            target="_blank"
            rel="noreferrer"
            className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white"
            aria-label="Source on GitHub"
          >
            <svg viewBox="0 0 16 16" className="size-4 fill-current" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </nav>
      </header>

      <main className="mx-auto grid max-w-[1400px] gap-5 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-5">
          <RecorderPanel
            settings={settings}
            onSettingsChange={setSettings}
            transcript={transcript}
            onTranscriptChange={setTranscript}
            onError={notify}
            onOpenSettings={() => setSettingsOpen(true)}
          />
          <StylePanel
            options={options}
            onOptionsChange={setOptions}
            engine={settings.engine}
            onEngineChange={(engine) => setSettings({ ...settings, engine })}
            canFormat={transcript.trim().length > 0}
            formatting={formatting}
            onFormat={() => void runFormat()}
            onCancel={() => abortRef.current?.abort()}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </div>
        <div className="lg:sticky lg:top-5 lg:self-start">
          <OutputPanel
            doc={liveDoc ?? current?.doc ?? null}
            onDocChange={(doc) => current && commit({ ...current, doc })}
            ctx={exportCtx}
            formatting={formatting}
            loading={loading}
          />
        </div>
      </main>

      <footer className="pb-8 text-center text-xs text-zinc-600">
        Speech recognition runs on your device with Whisper. Nothing is uploaded unless you pick a cloud engine.
      </footer>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
        engines={engines}
        onEnginesChange={setEngines}
      />
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entries={history}
        activeId={current?.id ?? null}
        onSelect={(entry) => {
          setCurrent(entry)
          setTranscript(entry.transcript)
          setOptions(entry.options)
          setHistoryOpen(false)
        }}
        onDelete={(id) => setHistory((h) => h.filter((e) => e.id !== id))}
        onClear={() => setHistory([])}
      />

      <div className="fixed bottom-4 left-1/2 z-[60] flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-4" aria-live="assertive">
        {toasts.map((t) => (
          <div key={t.id} className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-zinc-900/95 p-3 text-sm text-rose-100 shadow-2xl">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-400" />
            <p className="flex-1">{t.message}</p>
            <button type="button" onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))} aria-label="Dismiss">
              <X className="size-4 text-zinc-500 hover:text-zinc-200" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
