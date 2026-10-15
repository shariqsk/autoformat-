import { describe, expect, it } from 'vitest'
import { clauseHead, deriveTitle, formatLocally } from './local'
import { LAYOUTS } from './styles'
import { DEFAULT_OPTIONS, type FormatOptions } from './types'

const TRANSCRIPT = `so um today I want to talk about why I started using local AI models for my blog. yeah bro honestly it's kinda crazy how good they've gotten.
I used to pay twenty bucks a month for this stuff, but now I just download a model and it runs on my laptop. the best part is privacy because nothing leaves my machine.
anyway another thing is speed. whisper transcribes faster than I can talk. first you download the model. then you hit record. finally you export the markdown.
what's the catch? honestly there isn't much of one, the setup takes five minutes. so yeah that's pretty much it lol`

const opts = (o: Partial<FormatOptions> = {}): FormatOptions => ({ ...DEFAULT_OPTIONS, ...o })
const NOW = new Date('2026-10-15T12:00:00Z')

describe('formatLocally', () => {
  it('produces a titled blog post with tags and description', () => {
    const doc = formatLocally(TRANSCRIPT, opts(), { now: NOW })
    expect(doc.title).toBe('Why I Started Using Local AI Models for My Blog')
    expect(doc.tags.length).toBeGreaterThan(0)
    expect(doc.description.length).toBeLessThanOrEqual(160)
    expect(doc.body).not.toMatch(/\bum\b/)
  })

  it('renders every layout without throwing and with non-empty output', () => {
    for (const layout of LAYOUTS) {
      const doc = formatLocally(TRANSCRIPT, opts({ layout: layout.id }), { now: NOW })
      expect(doc.body.trim().length, layout.id).toBeGreaterThan(50)
    }
  })

  it('turns sequencing words into numbered steps for how-tos', () => {
    const doc = formatLocally(TRANSCRIPT, opts({ layout: 'howto' }), { now: NOW })
    expect(doc.body).toContain('## Steps')
    expect(doc.body).toMatch(/1\. You download the model\./)
    expect(doc.body).toMatch(/2\. You hit record\./)
  })

  it('uses spoken questions as Q&A headings', () => {
    const doc = formatLocally(TRANSCRIPT, opts({ layout: 'qa' }), { now: NOW })
    expect(doc.body).toContain("### What's the catch?")
  })

  it('keeps thread posts within the character limit', () => {
    const doc = formatLocally(TRANSCRIPT.repeat(3), opts({ layout: 'thread' }), { now: NOW })
    const posts = doc.body.split('\n\n')
    expect(posts.length).toBeGreaterThan(1)
    for (const post of posts) expect(post.length).toBeLessThanOrEqual(280)
    expect(posts[0]).toMatch(/^1\/\d+ /)
  })

  it('swaps slang in formal mode but keeps contractions and sentences', () => {
    const doc = formatLocally(TRANSCRIPT, opts({ tone: 'formal' }), { now: NOW })
    expect(doc.body).not.toMatch(/\b(bro|lol|kinda|bucks)\b/i)
    expect(doc.body).toContain("I used to pay twenty dollars a month")
    expect(doc.body).toMatch(/\b(?:isn't|they've)\b/)
  })

  it('keeps slang and jokes in no-filter mode', () => {
    const doc = formatLocally(TRANSCRIPT, opts({ tone: 'raw' }), { now: NOW })
    expect(doc.body).toMatch(/\bbro\b/i)
    expect(doc.body).toMatch(/\blol\b/)
    expect(doc.body).not.toMatch(/\bum\b/)
  })

  it('never touches protected words', () => {
    const doc = formatLocally(TRANSCRIPT, opts({ tone: 'formal' }), { now: NOW, keepWords: ['bro', 'kinda'] })
    expect(doc.body).toMatch(/\bbro\b/i)
    expect(doc.body).toMatch(/\bkinda\b/)
  })

  it('respects title, tag and summary toggles', () => {
    const doc = formatLocally(TRANSCRIPT, opts({ includeTitle: false, includeTags: false, includeSummary: true }), { now: NOW })
    expect(doc.title).toBe('')
    expect(doc.tags).toEqual([])
    expect(doc.body.startsWith('> **TL;DR:**')).toBe(true)
  })

  it('handles empty input', () => {
    expect(formatLocally('', opts(), { now: NOW }).body).toBe('')
  })
})

describe('deriveTitle', () => {
  it('falls back to keywords when no sentence fits', () => {
    const long = 'Whisper models transcribe speech locally and the transcription quality of whisper models keeps improving every single release cycle.'
    expect(deriveTitle([[long]])).toMatch(/^Thoughts on /)
  })
})

describe('clauseHead', () => {
  it('takes the opening clause before a verb or comma', () => {
    expect(clauseHead('The thing that surprised me most was how good the free local models have gotten.')).toBe(
      'The thing that surprised me most',
    )
    expect(clauseHead('My favourite part, honestly, is the price.')).toBe('My favourite part')
  })

  it('gives up on sentences without a short clause', () => {
    expect(clauseHead('I went to the shop to buy some bread for my mum yesterday.')).toBeNull()
  })
})
