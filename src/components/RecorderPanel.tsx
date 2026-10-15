import { AudioLines, Download, FileAudio, Pause, Play, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { useRecorder } from '../hooks/useRecorder'
import { applyReplacements } from '../lib/format/cleanup'
import { wordCount } from '../lib/format/text'
import { transcribeInBrowser } from '../lib/ml/client'
import { WHISPER_MODELS } from '../lib/ml/models'
import type { LoadProgress } from '../lib/ml/protocol'
import { SAMPLE_TRANSCRIPT } from '../lib/sample'
import type { AppSettings } from '../lib/settings'
import { decodeToWhisperPcm } from '../lib/speech/audio'
import { LiveWhisper } from '../lib/speech/liveWhisper'
import { isWebSpeechSupported, startLiveTranscription, type LiveSession } from '../lib/speech/webSpeech'
import type { VoiceProfile } from '../lib/voice'
import { cx, inputClass } from './classes'
import { Button, Kbd, Panel, ProgressBar, Segmented } from './ui'
import { Waveform } from './Waveform'

type Phase = 'idle' | 'recording' | 'finishing' | 'file'

export interface RecorderControls {
  toggle(): void
  /** Pause or resume; returns false when not recording so the key can do its normal job. */
  pauseResume(): boolean
}

const joinText = (prev: string, text: string) => (prev.trim() ? `${prev.trimEnd()}\n\n${text.trim()}` : text.trim())

function timecode(seconds: number) {
  const s = Math.max(0, seconds)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}.${Math.floor((s % 1) * 10)}`
}

function megabytes(bytes: number) {
  return bytes > 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.round(bytes / 1e6)} MB`
}

export function RecorderPanel({
  settings,
  onSettingsChange,
  profile,
  transcript,
  onTranscriptChange,
  onError,
  onOpenSettings,
  controlRef,
}: {
  settings: AppSettings
  onSettingsChange: (s: AppSettings) => void
  profile: VoiceProfile
  transcript: string
  onTranscriptChange: (update: (prev: string) => string) => void
  onError: (message: string) => void
  onOpenSettings: () => void
  controlRef?: Ref<RecorderControls>
}) {
  const recorder = useRecorder()
  const [phase, setPhase] = useState<Phase>('idle')
  const [loading, setLoading] = useState<LoadProgress | null>(null)
  const [device, setDevice] = useState<string | null>(null)
  const [interim, setInterim] = useState('')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const live = useRef<LiveSession | null>(null)
  const whisper = useRef<LiveWhisper | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const model = WHISPER_MODELS.find((m) => m.id === settings.whisperModel) ?? WHISPER_MODELS[0]
  const webSpeech = settings.sttEngine === 'webspeech'
  const recording = recorder.state !== 'idle'
  const fix = (text: string) => applyReplacements(text, profile.replacements)
  const callbacks = {
    onLoading: (p: LoadProgress) => setLoading(p),
    onRunning: (d: string) => {
      setLoading(null)
      setDevice(d)
    },
  }

  useEffect(() => () => void (audioUrl && URL.revokeObjectURL(audioUrl)), [audioUrl])

  async function transcribeFile(file: Blob) {
    setPhase('file')
    try {
      const pcm = await decodeToWhisperPcm(file)
      const text = await transcribeInBrowser(pcm, model.id, callbacks, settings.language || undefined)
      if (text.trim()) onTranscriptChange((prev) => joinText(prev, fix(text)))
      else onError("Whisper didn't hear any speech in that file.")
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    } finally {
      setPhase('idle')
      setLoading(null)
    }
  }

  async function start() {
    if (phase !== 'idle') return
    const base = transcript
    try {
      if (webSpeech) {
        await recorder.start()
        live.current = startLiveTranscription({
          lang: settings.language || navigator.language || 'en-US',
          onUpdate: (finalText, interimText) => {
            if (finalText) onTranscriptChange(() => joinText(base, fix(finalText)))
            setInterim(interimText)
          },
          onError: (message) => {
            onError(message)
            void stop()
          },
          onEnd: () => setInterim(''),
        })
      } else {
        const session = new LiveWhisper(
          model.id,
          settings.language || undefined,
          (text) => onTranscriptChange(() => joinText(base, fix(text))),
          callbacks,
        )
        whisper.current = session
        await recorder.start({ onPcm: (samples) => session.push(samples) })
      }
      setPhase('recording')
    } catch (err) {
      const denied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
      onError(
        denied
          ? 'Microphone access was blocked. Allow it in your browser and try again.'
          : err instanceof Error
            ? err.message
            : String(err),
      )
      whisper.current = null
      void recorder.stop()
    }
  }

  async function stop() {
    const blob = await recorder.stop()
    if (blob) setAudioUrl(URL.createObjectURL(blob))
    if (live.current) {
      live.current.stop()
      live.current = null
      setInterim('')
      setPhase('idle')
      return
    }
    const session = whisper.current
    whisper.current = null
    if (!session) return setPhase('idle')
    setPhase('finishing')
    try {
      const text = await session.finish()
      if (!text.trim()) onError("Whisper didn't catch any speech. Check your microphone and try again.")
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    } finally {
      setPhase('idle')
      setLoading(null)
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file || recording || phase !== 'idle') return
    if (/^(audio|video)\//.test(file.type)) return void transcribeFile(file)
    if (/^text\//.test(file.type) || /\.(md|markdown|txt)$/i.test(file.name)) {
      const text = await file.text()
      return onTranscriptChange((prev) => joinText(prev, text))
    }
    onError(`Can't use “${file.name}”. Drop an audio or video file to transcribe, or a .txt/.md file to add its text.`)
  }

  const toggle = () => void (recording ? stop() : start())
  useImperativeHandle(controlRef, () => ({
    toggle,
    pauseResume() {
      if (recorder.state === 'recording' && !webSpeech) recorder.pause()
      else if (recorder.state === 'paused') recorder.resume()
      else return false
      return true
    },
  }))

  const status = (() => {
    if (phase === 'finishing') return 'Catching the last few words…'
    if (phase === 'file') return loading ? 'Loading the speech model…' : 'Transcribing your file…'
    if (recorder.state === 'paused') return 'Paused. Pick up where you left off.'
    if (recording) return webSpeech ? 'Listening, words appear as you speak' : 'Listening, transcribing as you talk'
    return null
  })()

  return (
    <div
      className="relative"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDragging(false)}
      onDrop={handleDrop}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-[1.25rem] border-2 border-dashed border-accent bg-sheet/90 backdrop-blur-sm">
          <div className="text-center">
            <p className="font-display text-3xl text-ink">Drop it here</p>
            <p className="mt-1 text-sm text-ink-3">Audio or video gets transcribed on your device. Text files are added as-is.</p>
          </div>
        </div>
      )}
      <Panel
        number="01"
        title="Talk"
        aside={
          <Segmented
            size="sm"
            label="Speech engine"
            value={settings.sttEngine}
            onChange={(sttEngine) => !recording && onSettingsChange({ ...settings, sttEngine })}
            options={[
              { value: 'whisper', label: 'Whisper', title: 'Private: runs on your device' },
              {
                value: 'webspeech',
                label: 'Browser',
                title: isWebSpeechSupported()
                  ? "Your browser's speech service (Chrome sends audio to Google)"
                  : 'Not supported in this browser',
              },
            ]}
          />
        }
      >
        {/* The deck: waveform, transport and timecode. */}
        <div className="rounded-2xl bg-well p-4 ring-1 ring-rule ring-inset sm:p-5">
          <Waveform analyser={recorder.analyser} paused={recorder.state === 'paused'} className="h-16 w-full sm:h-20" />

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="flex min-w-0 items-center gap-4">
              <button
                type="button"
                onClick={toggle}
                disabled={phase === 'finishing' || phase === 'file'}
                aria-label={recording ? 'Stop recording' : 'Start recording'}
                className="group relative grid size-16 shrink-0 place-items-center rounded-full bg-sheet shadow-lift ring-1 ring-rule-strong transition-transform hover:scale-[1.04] active:scale-95 disabled:opacity-50"
              >
                {recording && <span className="absolute inset-0 animate-ping rounded-full bg-accent/20 [animation-duration:2s]" />}
                <span
                  className={cx(
                    'bg-accent transition-all duration-200',
                    recording ? 'size-5 rounded-[5px]' : 'size-9 rounded-full group-hover:size-10',
                  )}
                />
              </button>

              <div className="min-w-0">
                <p className={cx('font-mono text-[1.65rem] leading-none tabular-nums', recording ? 'text-ink' : 'text-ink-3')}>
                  {timecode(recorder.elapsed)}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-3">
                  {recorder.state === 'recording' && (
                    <span className="mr-1.5 inline-block size-1.5 animate-blink rounded-full bg-accent align-middle" />
                  )}
                  {status ?? (
                    <>
                      <span className="sm:hidden">Tap to start talking</span>
                      <span className="hidden sm:inline">
                        Tap the button or press <Kbd>R</Kbd> to start talking
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-1">
              {recording && !webSpeech && (
                <Button variant="outline" size="sm" onClick={recorder.state === 'recording' ? recorder.pause : recorder.resume}>
                  {recorder.state === 'recording' ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                  {recorder.state === 'recording' ? 'Pause' : 'Resume'}
                </Button>
              )}
              {!recording && phase === 'idle' && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => fileInput.current?.click()} title="Transcribe an audio or video file">
                    <FileAudio className="size-3.5" /> Upload
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onTranscriptChange(() => SAMPLE_TRANSCRIPT)}
                    title="Load an example ramble"
                  >
                    <Sparkles className="size-3.5" /> Sample
                  </Button>
                </>
              )}
            </div>
          </div>

          {(loading || phase === 'file' || phase === 'finishing') && (
            <div className="mt-4 space-y-1.5" aria-live="polite">
              <ProgressBar value={loading?.fraction ?? null} />
              {loading && (
                <p className="text-[11px] text-ink-3">
                  Downloading {model.label}
                  {loading.totalBytes ? ` · ${megabytes(loading.loadedBytes)} of ${megabytes(loading.totalBytes)}` : ''}. One time only,
                  then it lives in your browser.
                </p>
              )}
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
              if (file) void transcribeFile(file)
            }}
          />
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-1 text-left text-[11px] text-ink-3 hover:text-ink"
        >
          <AudioLines className="size-3.5 shrink-0" />
          {webSpeech ? (
            <span>Browser speech · fast live text, but audio goes to your browser vendor's servers</span>
          ) : (
            <span>
              {model.label} · {model.size} · runs on your {device === 'wasm' ? 'CPU' : 'device'}, audio never leaves it ·{' '}
              <span className="underline decoration-rule-strong underline-offset-2">change</span>
            </span>
          )}
        </button>

        <div className="mt-5 flex items-center gap-3">
          <span className="small-caps text-ink-3">Transcript</span>
          <span className="font-mono text-[11px] text-ink-3 tabular-nums">{wordCount(transcript)} words</span>
          <span className="h-px flex-1 bg-rule" aria-hidden />
          {audioUrl && !recording && (
            <a
              href={audioUrl}
              download="autoformat-recording.webm"
              className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-ink-2 hover:bg-well hover:text-ink"
            >
              <Download className="size-3.5" /> Save audio
            </a>
          )}
          {transcript && (
            <Button variant="danger" size="xs" onClick={() => onTranscriptChange(() => '')} disabled={recording}>
              <Trash2 className="size-3.5" /> Clear
            </Button>
          )}
        </div>
        <textarea
          value={transcript}
          onChange={(e) => onTranscriptChange(() => e.target.value)}
          aria-label="Transcript"
          placeholder="Your words land here as you talk. You can also paste, type, or drop in an audio or text file."
          className={cx(inputClass, 'notepad mt-2 min-h-56 resize-y bg-paper/40 px-4 font-mono text-[13px] text-ink-2')}
          spellCheck={false}
        />
        {interim && <p className="mt-2 font-mono text-[13px] text-ink-3 italic">{interim}…</p>}
      </Panel>
    </div>
  )
}
