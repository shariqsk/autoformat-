import { describe, expect, it } from 'vitest'
import { buildPrompt, precleanTranscript, targetWords } from './prompt'
import { DEFAULT_OPTIONS } from './types'

describe('buildPrompt', () => {
  it('embeds layout, tone and transcript', () => {
    const { system, user } = buildPrompt('  hello world  ', { ...DEFAULT_OPTIONS, layout: 'listicle', tone: 'academic' })
    expect(system).toContain('Layout — Listicle')
    expect(system).toContain('Tone — Academic')
    expect(user).toContain('<transcript>\nhello world\n</transcript>')
  })

  it('includes optional sections only when enabled', () => {
    const on = buildPrompt('x', { ...DEFAULT_OPTIONS, includeSummary: true, instructions: 'mention my podcast' })
    expect(on.system).toContain('TL;DR')
    expect(on.user).toContain('mention my podcast')
    const off = buildPrompt('x', { ...DEFAULT_OPTIONS, includeTitle: false, includeTags: false })
    expect(off.system).not.toContain('title:')
    expect(off.system).not.toContain('tags:')
  })
})

describe('compact prompt', () => {
  it('is much shorter and asks for an H1 title instead of front matter', () => {
    const full = buildPrompt('hello', DEFAULT_OPTIONS)
    const compact = buildPrompt('hello', DEFAULT_OPTIONS, { compact: true })
    expect(compact.system.length).toBeLessThan(full.system.length * 0.75)
    expect(compact.system).toContain('# Title')
    expect(compact.system).not.toContain('---')
  })
})

describe('precleanTranscript', () => {
  it('removes fillers but keeps paragraphs', () => {
    expect(precleanTranscript('um so the the idea is good\n\nuh second part here', 1)).toBe('The idea is good.\n\nSecond part here.')
  })

  it('falls back to the raw text when nothing survives cleaning', () => {
    expect(precleanTranscript('  um  ', 1)).toBe('um')
  })
})

describe('targetWords', () => {
  it('scales with length preset and has a floor', () => {
    const t = 'word '.repeat(200)
    expect(targetWords(t, { ...DEFAULT_OPTIONS, length: 'concise' })).toBe(100)
    expect(targetWords(t, { ...DEFAULT_OPTIONS, length: 'detailed' })).toBe(200)
    expect(targetWords('hi', DEFAULT_OPTIONS)).toBe(40)
  })
})
