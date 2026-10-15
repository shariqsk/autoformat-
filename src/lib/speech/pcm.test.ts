import { describe, expect, it } from 'vitest'
import { cleanSegmentText, downsample, joinSegments, PcmBuffer, quietestCut, rms } from './pcm'

const tone = (seconds: number, amp: number, rate = 16000) =>
  Float32Array.from({ length: Math.round(seconds * rate) }, (_, i) => amp * Math.sin(i / 5))

describe('downsample', () => {
  it('reduces 48 kHz to 16 kHz and averages windows', () => {
    const out = downsample(Float32Array.from([1, 1, 1, 0, 0, 0, 3, 3, 3]), 48000)
    expect(Array.from(out)).toEqual([1, 0, 3])
  })

  it('handles non-integer ratios (44.1 kHz)', () => {
    expect(downsample(new Float32Array(44100), 44100).length).toBe(16000)
  })

  it('is a no-op at the target rate', () => {
    const a = new Float32Array(10)
    expect(downsample(a, 16000)).toBe(a)
  })
})

describe('quietestCut', () => {
  it('cuts in the pause, not mid-word', () => {
    const speech = tone(1, 0.5)
    const pause = new Float32Array(16000 * 0.3)
    const samples = new Float32Array(speech.length * 2 + pause.length)
    samples.set(speech, 0)
    samples.set(pause, speech.length)
    samples.set(speech, speech.length + pause.length)
    const cut = quietestCut(samples, 0, samples.length)
    expect(cut).toBeGreaterThan(speech.length)
    expect(cut).toBeLessThan(speech.length + pause.length)
  })
})

describe('PcmBuffer', () => {
  it('grows past its initial capacity', () => {
    const b = new PcmBuffer()
    for (let i = 0; i < 70; i++) b.push(tone(1, 0.1))
    expect(b.length).toBe(70 * 16000)
    expect(rms(b.slice(0, 16000))).toBeGreaterThan(0)
  })
})

describe('cleanSegmentText', () => {
  it('drops silence hallucinations and keeps speech', () => {
    expect(cleanSegmentText(' Thank you.')).toBe('')
    expect(cleanSegmentText('[BLANK_AUDIO]')).toBe('')
    expect(cleanSegmentText(' Thank you for reading my blog.')).toBe('Thank you for reading my blog.')
  })
})

describe('joinSegments', () => {
  it('mends sentences split at a segment boundary', () => {
    expect(joinSegments(['cleans up the likes.', 'and gives me a post.', '', 'Go try it.'])).toBe(
      'cleans up the likes and gives me a post. Go try it.',
    )
  })

  it('keeps ellipses and real sentence ends', () => {
    expect(joinSegments(['wait...', 'and then.'])).toBe('wait... and then.')
  })
})
