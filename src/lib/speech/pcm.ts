// Pure PCM helpers for live transcription: resampling, energy and segmentation.

export const SAMPLE_RATE = 16000

/** Downsample by averaging each output sample's input window (a cheap low-pass that's fine for speech). */
export function downsample(input: Float32Array, fromRate: number, toRate = SAMPLE_RATE): Float32Array {
  if (fromRate === toRate) return input
  const ratio = fromRate / toRate
  const out = new Float32Array(Math.floor(input.length / ratio))
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio)
    const end = Math.min(input.length, Math.floor((i + 1) * ratio))
    let sum = 0
    for (let j = start; j < end; j++) sum += input[j]
    out[i] = sum / Math.max(1, end - start)
  }
  return out
}

export function rms(samples: Float32Array, start = 0, end = samples.length): number {
  let sum = 0
  for (let i = start; i < end; i++) sum += samples[i] * samples[i]
  return Math.sqrt(sum / Math.max(1, end - start))
}

/** Below this RMS a chunk is treated as silence (Whisper hallucinates "Thank you." on silence). */
export const SILENCE_RMS = 0.006

/**
 * Pick where to cut a live recording so no word is split: the quietest 30 ms window in the
 * final `searchSeconds` before `end`.
 */
export function quietestCut(samples: Float32Array, from: number, end: number, searchSeconds = 2.5, rate = SAMPLE_RATE): number {
  const win = Math.round(rate * 0.03)
  const searchStart = Math.max(from, end - Math.round(searchSeconds * rate))
  let best = end
  let bestEnergy = Infinity
  for (let i = searchStart; i + win <= end; i += Math.round(win / 2)) {
    const e = rms(samples, i, i + win)
    if (e < bestEnergy) {
      bestEnergy = e
      best = i + Math.round(win / 2)
    }
  }
  return best
}

/** Growable Float32 buffer. */
export class PcmBuffer {
  private data = new Float32Array(SAMPLE_RATE * 60)
  length = 0

  push(chunk: Float32Array) {
    if (this.length + chunk.length > this.data.length) {
      const bigger = new Float32Array(Math.max(this.data.length * 2, this.length + chunk.length))
      bigger.set(this.data.subarray(0, this.length))
      this.data = bigger
    }
    this.data.set(chunk, this.length)
    this.length += chunk.length
  }

  slice(start: number, end = this.length): Float32Array {
    return this.data.slice(start, end)
  }

  view(): Float32Array {
    return this.data.subarray(0, this.length)
  }
}

const HALLUCINATIONS = /^(?:\[[^\]]*\]|\([^)]*\)|thank you\.?|thanks for watching!?|you|bye\.?|\.+)$/i

/** Drop the stock phrases Whisper invents for near-silent audio. */
export function cleanSegmentText(text: string): string {
  const t = text.trim()
  return HALLUCINATIONS.test(t) ? '' : t
}

/**
 * Join consecutive segment transcripts. Whisper ends every segment with a full stop, so when the
 * next segment starts in lowercase the cut fell mid-sentence: drop that stray period.
 */
export function joinSegments(texts: string[]): string {
  return texts.filter(Boolean).reduce((acc, next) => {
    if (!acc) return next
    if (/^[a-z]/.test(next) && /[^.]\.$/.test(acc)) return `${acc.slice(0, -1)} ${next}`
    return `${acc} ${next}`
  }, '')
}
