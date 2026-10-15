import { useEffect, useRef } from 'react'

const BAR = 3
const GAP = 3

/**
 * Scrolling level meter drawn straight to a canvas (no React re-renders per frame).
 * Bars march right-to-left like a tape deck; at rest it shows a dotted baseline.
 */
export function Waveform({ analyser, paused, className }: { analyser: AnalyserNode | null; paused: boolean; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const levels = useRef<number[]>([])

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const ctx = el.getContext('2d')!
    const buf = new Float32Array(analyser?.fftSize ?? 2048)
    let raf = 0
    let last = 0

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw)
      const dpr = window.devicePixelRatio || 1
      const { width, height } = el.getBoundingClientRect()
      if (el.width !== Math.round(width * dpr)) {
        el.width = Math.round(width * dpr)
        el.height = Math.round(height * dpr)
      }
      const slots = Math.floor(width / (BAR + GAP))
      // ~30 samples per second regardless of display refresh rate.
      if (analyser && !paused && t - last > 33) {
        last = t
        analyser.getFloatTimeDomainData(buf)
        let sum = 0
        for (const v of buf) sum += v * v
        const level = Math.min(1, Math.sqrt(sum / buf.length) * 4.5)
        levels.current.push(level)
        if (levels.current.length > slots) levels.current.splice(0, levels.current.length - slots)
      }

      const styles = getComputedStyle(el)
      const ink = styles.getPropertyValue('--ink').trim() || '#1c1a16'
      const accent = styles.getPropertyValue('--accent').trim() || '#e0452b'
      const rule = styles.getPropertyValue('--rule-strong').trim() || '#c4b8a2'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      const mid = height / 2

      // Resting baseline.
      ctx.fillStyle = rule
      for (let x = 0; x < width; x += BAR + GAP) ctx.fillRect(x, mid - 0.5, BAR, 1)

      const data = levels.current
      const offset = width - data.length * (BAR + GAP)
      data.forEach((level, i) => {
        const h = Math.max(2, Math.pow(level, 0.7) * (height - 6))
        const x = offset + i * (BAR + GAP)
        const fresh = i > data.length - 4
        ctx.globalAlpha = analyser ? 0.35 + 0.65 * (i / data.length) : 0.25
        ctx.fillStyle = fresh && analyser && !paused ? accent : ink
        ctx.beginPath()
        ctx.roundRect(x, mid - h / 2, BAR, h, BAR / 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [analyser, paused])

  // Start each recording with a clean tape.
  useEffect(() => {
    if (analyser) levels.current = []
  }, [analyser])

  return <canvas ref={canvas} className={className} aria-hidden />
}
