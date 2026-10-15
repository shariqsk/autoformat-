import { transcribeInBrowser, type JobCallbacks } from '../ml/client'
import { cleanSegmentText, joinSegments, PcmBuffer, quietestCut, rms, SAMPLE_RATE, SILENCE_RMS } from './pcm'

const TARGET_SECONDS = 12
const MIN_FINAL_SECONDS = 0.4

/**
 * Transcribes a recording while it is still being made. Audio is cut into ~12 s segments at the
 * quietest moment near each boundary, and segments are transcribed one at a time in order, so the
 * transcript grows as you talk and is almost complete the moment you stop.
 */
export class LiveWhisper {
  private buffer = new PcmBuffer()
  private cursor = 0
  private texts: string[] = []
  private queue: Promise<void> = Promise.resolve()
  private failed: Error | null = null

  private readonly model: string
  private readonly language: string | undefined
  private readonly onText: (text: string) => void
  private readonly callbacks: JobCallbacks & { onError?: (err: Error) => void }

  constructor(
    model: string,
    language: string | undefined,
    onText: (text: string) => void,
    callbacks: JobCallbacks & { onError?: (err: Error) => void } = {},
  ) {
    this.model = model
    this.language = language
    this.onText = onText
    this.callbacks = callbacks
  }

  get text() {
    return joinSegments(this.texts)
  }

  /** Seconds of audio captured but not yet sent for transcription. */
  get pendingSeconds() {
    return (this.buffer.length - this.cursor) / SAMPLE_RATE
  }

  push(chunk: Float32Array) {
    this.buffer.push(chunk)
    if (this.buffer.length - this.cursor >= TARGET_SECONDS * SAMPLE_RATE) {
      const cut = quietestCut(this.buffer.view(), this.cursor, this.buffer.length)
      this.enqueue(this.cursor, cut)
      this.cursor = cut
    }
  }

  /** Transcribe whatever is left and resolve with the full transcript. */
  async finish(): Promise<string> {
    if (this.buffer.length - this.cursor >= MIN_FINAL_SECONDS * SAMPLE_RATE) this.enqueue(this.cursor, this.buffer.length)
    this.cursor = this.buffer.length
    await this.queue
    if (this.failed) throw this.failed
    return this.text
  }

  /** The full recording at 16 kHz, e.g. to re-transcribe with a bigger model. */
  audio(): Float32Array {
    return this.buffer.slice(0)
  }

  private enqueue(start: number, end: number) {
    const audio = this.buffer.slice(start, end)
    const index = this.texts.push('') - 1
    if (rms(audio) < SILENCE_RMS) return
    this.queue = this.queue.then(async () => {
      if (this.failed) return
      try {
        const text = await transcribeInBrowser(audio, this.model, this.callbacks, this.language)
        this.texts[index] = cleanSegmentText(text)
        this.onText(this.text)
      } catch (err) {
        this.failed = err instanceof Error ? err : new Error(String(err))
        // Tell the UI now rather than at Stop, so nobody talks for minutes into a broken pipeline.
        this.callbacks.onError?.(this.failed)
      }
    })
  }
}
