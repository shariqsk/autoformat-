import { FileAudio, Mic, Pause, Play, Settings2, Sparkles, Square, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useRecorder } from '../hooks/useRecorder'
import { wordCount } from '../lib/format/text'
import { transcribeInBrowser } from '../lib/ml/client'
import { WHISPER_MODELS } from '../lib/ml/models'
import type { LoadProgress } from '../lib/ml/protocol'
import { SAMPLE_TRANSCRIPT } from '../lib/sample'
import type { AppSettings } from '../lib/settings'
import { decodeToWhisperPcm, formatDuration } from '../lib/speech/audio'
import { isWebSpeechSupported, startLiveTranscription, type LiveSession } from '../lib/speech/webSpeech'
import { cx, inputClass } from './classes'
import { Badge, Button, Card, ProgressBar, Segmented } from './ui'

type Phase =
  | { kind: 'idle' }
  | { kind: 'decoding' }
  | { kind: 'loading'; progress: LoadProgress | null }
  | { kind: 'transcribing'; device: string }

const appendText = (prev: string, text: string) => (prev.trim() ? `${prev.trimEnd()}\n\n${text.trim()}` : text.trim())

function formatBytes(bytes: number) {
  return bytes > 1e9 ? `${(bytes / 1e9).toFixed(2)} GB` : `${Math.round(bytes / 1e6)} MB`
}

export function RecorderPanel({
  settings,
  onSettingsChange,
  transcript,
  onTranscriptChange,
  onError,
  onOpenSettings,
}: {
  settings: AppSettings
  onSettingsChange: (s: AppSettings) => void
  transcript: string
  onTranscriptChange: (update: (prev: string) => string) => void
  onError: (message: string) => void
  onOpenSettings: () => void
}) {
  const recorder = useRecorder()
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [interim, setInterim] = useState('')
  const live = useRef<LiveSession | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const model = WHISPER_MODELS.find((m) => m.id === settings.whisperModel) ?? WHISPER_MODELS[0]
  const recording = recorder.state !== 'idle'
  const busy = phase.kind !== 'idle'
  const webSpeech = settings.sttEngine === 'webspeech'

  async function transcribeBlob(blob: Blob) {
    try {
      setPhase({ kind: 'decoding' })
      const pcm = await decodeToWhisperPcm(blob)
      setPhase({ kind: 'loading', progress: null })
      const text = await transcribeInBrowser(
        pcm,
        model.id,
        {
          onLoading: (progress) => setPhase({ kind: 'loading', progress }),
          onRunning: (device) => setPhase({ kind: 'transcribing', device }),
        },
        settings.language || undefined,
      )
      if (text) onTranscriptChange((prev) => appendText(prev, text))
      else onError("Whisper didn't hear any speech in that recording.")
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    } finally {
      setPhase({ kind: 'idle' })
    }
  }

  async function start() {
    try {
      await recorder.start()
    } catch {
      onError('Microphone access was blocked. Allow it in your browser and try again.')
      return
    }
    if (!webSpeech) return
    const base = transcript
    try {
      live.current = startLiveTranscription({
        lang: settings.language || navigator.language || 'en-US',
        onUpdate: (finalText, interimText) => {
          if (finalText) onTranscriptChange(() => appendText(base, finalText))
          setInterim(interimText)
        },
        onError: (message) => {
          onError(message)
          void stop()
        },
        onEnd: () => setInterim(''),
      })
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
      void recorder.stop()
    }
  }

  async function stop() {
    if (live.current) {
      live.current.stop()
      live.current = null
      await recorder.stop()
      return
    }
    const blob = await recorder.stop()
    if (blob) await transcribeBlob(blob)
  }

  const statusLine = (() => {
    switch (phase.kind) {
      case 'decoding':
        return { text: 'Preparing audio…', value: null }
      case 'loading': {
        const p = phase.progress
        const detail = p?.totalBytes ? ` · ${formatBytes(p.loadedBytes)} / ${formatBytes(p.totalBytes)}` : ''
        return { text: `Loading ${model.label}${detail} (first run downloads once, then it's cached)`, value: p?.fraction ?? null }
      }
      case 'transcribing':
        return { text: `Transcribing on ${phase.device === 'webgpu' ? 'your GPU (WebGPU)' : 'CPU (WASM)'}…`, value: null }
      default:
        return null
    }
  })()

  return (
    <Card
      step={1}
      title="Talk"
      subtitle="Ramble freely — it gets cleaned up in step 2."
      actions={
        <Button variant="ghost" size="sm" onClick={onOpenSettings} title="Speech settings">
          <Settings2 className="size-4" />
        </Button>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          size="sm"
          value={settings.sttEngine}
          onChange={(sttEngine) => onSettingsChange({ ...settings, sttEngine })}
          options={[
            { value: 'whisper', label: 'Whisper · private', title: 'Runs on your device. Transcribes when you stop.' },
            {
              value: 'webspeech',
              label: 'Live · browser',
              title: isWebSpeechSupported() ? 'Words appear as you speak. Chrome sends audio to Google.' : 'Not supported in this browser',
            },
          ]}
        />
        {webSpeech ? (
          <Badge tone="amber">Live text · uses your browser's cloud service</Badge>
        ) : (
          <button type="button" onClick={onOpenSettings} className="text-left">
            <Badge tone="green">
              {model.label} · {model.size} · on-device
            </Badge>
          </button>
        )}
      </div>

      <div className="my-6 flex flex-col items-center gap-3">
        <div className="relative">
          {recording && (
            <span
              className="absolute inset-0 rounded-full bg-rose-500/30 transition-transform duration-75"
              style={{ transform: `scale(${1.1 + recorder.level * 0.6})` }}
            />
          )}
          <button
            type="button"
            disabled={busy}
            onClick={recording ? stop : start}
            aria-label={recording ? 'Stop recording' : 'Start recording'}
            className={cx(
              'relative grid size-20 place-items-center rounded-full text-white shadow-2xl transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400 disabled:opacity-40',
              recording ? 'bg-rose-600 hover:bg-rose-500' : 'bg-violet-600 hover:scale-105 hover:bg-violet-500',
            )}
          >
            {recording ? <Square className="size-7 fill-current" /> : <Mic className="size-8" />}
          </button>
        </div>
        <div className="flex h-8 items-center gap-2 text-sm text-zinc-400">
          {recording ? (
            <>
              <span className={cx('size-2 rounded-full', recorder.state === 'recording' ? 'animate-pulse bg-rose-500' : 'bg-zinc-500')} />
              <span className="font-mono tabular-nums text-zinc-200">{formatDuration(recorder.elapsed)}</span>
              {!webSpeech && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={recorder.state === 'recording' ? recorder.pause : recorder.resume}
                  aria-label={recorder.state === 'recording' ? 'Pause' : 'Resume'}
                >
                  {recorder.state === 'recording' ? <Pause className="size-4" /> : <Play className="size-4" />}
                </Button>
              )}
            </>
          ) : (
            <span>{busy ? 'Working…' : 'Tap to start talking'}</span>
          )}
        </div>
        {!recording && !busy && (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => fileInput.current?.click()}>
              <FileAudio className="size-4" /> Upload audio
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onTranscriptChange(() => SAMPLE_TRANSCRIPT)}>
              <Sparkles className="size-4" /> Try a sample
            </Button>
          </div>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="audio/*,video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void transcribeBlob(file)
          }}
        />
      </div>

      {statusLine && (
        <div className="mb-4 space-y-2" aria-live="polite">
          <ProgressBar value={statusLine.value} />
          <p className="text-xs text-zinc-400">{statusLine.text}</p>
        </div>
      )}

      <div className="relative">
        <textarea
          value={transcript}
          onChange={(e) => onTranscriptChange(() => e.target.value)}
          placeholder="Your words show up here. You can also paste or type anything you want formatted."
          className={cx(inputClass, 'min-h-48 resize-y font-mono text-[13px] leading-relaxed')}
          spellCheck={false}
        />
        {interim && <p className="mt-2 text-sm italic text-zinc-500">{interim}…</p>}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
        <span>{wordCount(transcript)} words</span>
        {transcript && (
          <Button size="sm" variant="danger" onClick={() => onTranscriptChange(() => '')} disabled={recording}>
            <Trash2 className="size-3.5" /> Clear
          </Button>
        )}
      </div>
    </Card>
  )
}
