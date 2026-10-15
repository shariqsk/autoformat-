import { describe, expect, it } from 'vitest'
import { buildPrompt } from './prompt'
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
