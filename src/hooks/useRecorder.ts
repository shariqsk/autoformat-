import { useCallback, useEffect, useRef, useState } from 'react'
import { downsample } from '../lib/speech/pcm'

export type RecorderState = 'idle' | 'recording' | 'paused'

// Collects raw microphone samples off the main thread and posts them in ~85 ms batches.
const CAPTURE_WORKLET = `
class PcmCapture extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(4096); this.n = 0 }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        this.buf[this.n++] = ch[i]
        if (this.n === this.buf.length) { this.port.postMessage(this.buf.slice(0)); this.n = 0 }
      }
    }
    return true
  }
}
registerProcessor('pcm-capture', PcmCapture)
`

interface Media {
  recorder: MediaRecorder
  stream: MediaStream
  ctx: AudioContext
  chunks: Blob[]
}

/**
 * Microphone recording. Exposes an AnalyserNode for visualisations, streams 16 kHz PCM to an
 * optional callback (for live transcription), and returns the compressed recording on stop.
 */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const media = useRef<Media | null>(null)
  const stateRef = useRef<RecorderState>('idle')
  const starting = useRef(false)
  const timing = useRef({ startedAt: 0, accumulated: 0 })
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const setBoth = (s: RecorderState) => {
    stateRef.current = s
    setState(s)
  }

  const cleanup = useCallback(() => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    if (media.current) {
      media.current.stream.getTracks().forEach((t) => t.stop())
      void media.current.ctx.close()
      media.current = null
    }
    setAnalyser(null)
  }, [])

  useEffect(() => cleanup, [cleanup])

  const start = useCallback(async ({ onPcm }: { onPcm?: (samples: Float32Array) => void } = {}) => {
    // One recording at a time: a second click while the permission prompt is open is ignored.
    if (media.current || starting.current) return
    starting.current = true
    let stream: MediaStream | null = null
    let ctx: AudioContext | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)

      ctx = new AudioContext()
      // Created after an await, so Safari/iOS may start it suspended (outside the user gesture).
      if (ctx.state === 'suspended') await ctx.resume()
      const source = ctx.createMediaStreamSource(stream)
      const node = ctx.createAnalyser()
      node.fftSize = 2048
      node.smoothingTimeConstant = 0.6
      source.connect(node)

      if (onPcm) {
        if (!ctx.audioWorklet) throw new Error('This browser cannot stream audio to Whisper live. Try Chrome, Edge or Safari 14.1+.')
        const url = URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: 'text/javascript' }))
        try {
          await ctx.audioWorklet.addModule(url)
        } finally {
          URL.revokeObjectURL(url)
        }
        const capture = new AudioWorkletNode(ctx, 'pcm-capture')
        const rate = ctx.sampleRate
        capture.port.onmessage = (e: MessageEvent<Float32Array>) => {
          if (stateRef.current === 'recording') onPcm(downsample(e.data, rate))
        }
        source.connect(capture)
      }

      media.current = { recorder, stream, ctx, chunks }
      timing.current = { startedAt: performance.now(), accumulated: 0 }
      setElapsed(0)
      timer.current = setInterval(() => {
        const t = timing.current
        setElapsed(t.accumulated + (t.startedAt ? (performance.now() - t.startedAt) / 1000 : 0))
      }, 100)
      recorder.start(1000)
      setAnalyser(node)
      setBoth('recording')
    } catch (err) {
      // Don't leave the microphone light on if anything after getUserMedia failed.
      stream?.getTracks().forEach((t) => t.stop())
      void ctx?.close()
      throw err
    } finally {
      starting.current = false
    }
  }, [])

  const pause = useCallback(() => {
    const m = media.current
    if (!m || m.recorder.state !== 'recording') return
    m.recorder.pause()
    timing.current.accumulated += (performance.now() - timing.current.startedAt) / 1000
    timing.current.startedAt = 0
    setBoth('paused')
  }, [])

  const resume = useCallback(() => {
    const m = media.current
    if (!m || m.recorder.state !== 'paused') return
    m.recorder.resume()
    timing.current.startedAt = performance.now()
    setBoth('recording')
  }, [])

  /** Stop and return the compressed recording (webm/ogg/mp4 depending on the browser). */
  const stop = useCallback((): Promise<Blob | null> => {
    const m = media.current
    if (!m) return Promise.resolve(null)
    return new Promise((resolve) => {
      m.recorder.onstop = () => {
        const blob = new Blob(m.chunks, { type: m.recorder.mimeType || 'audio/webm' })
        cleanup()
        setBoth('idle')
        resolve(blob.size ? blob : null)
      }
      m.recorder.stop()
    })
  }, [cleanup])

  return { state, elapsed, analyser, start, pause, resume, stop }
}
