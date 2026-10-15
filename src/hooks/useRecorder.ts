import { useCallback, useEffect, useRef, useState } from 'react'

export type RecorderState = 'idle' | 'recording' | 'paused'

/** Microphone recording with a live input level and elapsed time. */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [level, setLevel] = useState(0)
  const media = useRef<{ recorder: MediaRecorder; stream: MediaStream; ctx: AudioContext; chunks: Blob[] } | null>(null)
  const timing = useRef({ startedAt: 0, accumulated: 0 })
  const raf = useRef(0)

  const cleanup = useCallback(() => {
    cancelAnimationFrame(raf.current)
    if (media.current) {
      media.current.stream.getTracks().forEach((t) => t.stop())
      void media.current.ctx.close()
      media.current = null
    }
    setLevel(0)
  }, [])

  useEffect(() => cleanup, [cleanup])

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
    const recorder = new MediaRecorder(stream)
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)

    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    ctx.createMediaStreamSource(stream).connect(analyser)
    const buf = new Uint8Array(analyser.fftSize)
    const tick = () => {
      analyser.getByteTimeDomainData(buf)
      let sum = 0
      for (const v of buf) sum += ((v - 128) / 128) ** 2
      setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4))
      const t = timing.current
      setElapsed(t.accumulated + (t.startedAt ? (performance.now() - t.startedAt) / 1000 : 0))
      raf.current = requestAnimationFrame(tick)
    }

    media.current = { recorder, stream, ctx, chunks }
    timing.current = { startedAt: performance.now(), accumulated: 0 }
    recorder.start(1000)
    tick()
    setState('recording')
  }, [])

  const pause = useCallback(() => {
    const m = media.current
    if (!m || m.recorder.state !== 'recording') return
    m.recorder.pause()
    timing.current.accumulated += (performance.now() - timing.current.startedAt) / 1000
    timing.current.startedAt = 0
    setState('paused')
  }, [])

  const resume = useCallback(() => {
    const m = media.current
    if (!m || m.recorder.state !== 'paused') return
    m.recorder.resume()
    timing.current.startedAt = performance.now()
    setState('recording')
  }, [])

  /** Stop and return the recorded audio. */
  const stop = useCallback((): Promise<Blob | null> => {
    const m = media.current
    if (!m) return Promise.resolve(null)
    return new Promise((resolve) => {
      m.recorder.onstop = () => {
        const blob = new Blob(m.chunks, { type: m.recorder.mimeType || 'audio/webm' })
        cleanup()
        setState('idle')
        resolve(blob.size ? blob : null)
      }
      m.recorder.stop()
    })
  }, [cleanup])

  return { state, elapsed, level, start, pause, resume, stop }
}
