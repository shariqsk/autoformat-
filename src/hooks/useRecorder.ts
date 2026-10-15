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
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    })
    const recorder = new MediaRecorder(stream)
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)

    const ctx = new AudioContext()
    const source = ctx.createMediaStreamSource(stream)
    const node = ctx.createAnalyser()
    node.fftSize = 2048
    node.smoothingTimeConstant = 0.6
    source.connect(node)

    if (onPcm) {
      const url = URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: 'text/javascript' }))
      try {
        await ctx.audioWorklet.addModule(url)
      } finally {
        URL.revokeObjectURL(url)
      }
      const capture = new AudioWorkletNode(ctx, 'pcm-capture')
      capture.port.onmessage = (e: MessageEvent<Float32Array>) => {
        if (stateRef.current === 'recording') onPcm(downsample(e.data, ctx.sampleRate))
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
