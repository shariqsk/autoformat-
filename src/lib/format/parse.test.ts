import { describe, expect, it } from 'vitest'
import { parseModelOutput } from './parse'
import { DEFAULT_OPTIONS } from './types'

describe('parseModelOutput', () => {
  it('reads YAML front matter', () => {
    const doc = parseModelOutput(
      '---\ntitle: "Talking Is the New Typing"\ndescription: Why I dictate.\ntags: [voice, Writing]\n---\n\nIntro paragraph.\n\n## Section\n\nBody.',
      DEFAULT_OPTIONS,
    )
    expect(doc).toEqual({
      title: 'Talking Is the New Typing',
      description: 'Why I dictate.',
      tags: ['voice', 'writing'],
      body: 'Intro paragraph.\n\n## Section\n\nBody.',
    })
  })

  it('supports block-list tags', () => {
    const doc = parseModelOutput('---\ntitle: T\ntags:\n  - one\n  - two\n---\nBody text', DEFAULT_OPTIONS)
    expect(doc.tags).toEqual(['one', 'two'])
  })

  it('strips code fences, think blocks and a duplicated H1', () => {
    const doc = parseModelOutput(
      '<think>hmm</think>\n```markdown\n---\ntitle: Hello\n---\n# Hello\n\nThe actual body of the post goes right here.\n```',
      DEFAULT_OPTIONS,
    )
    expect(doc.title).toBe('Hello')
    expect(doc.body).toBe('The actual body of the post goes right here.')
  })

  it('falls back to H1 title and derived metadata without front matter', () => {
    const doc = parseModelOutput('# My Post\n\nThis is a reasonably long first paragraph about local models.', DEFAULT_OPTIONS)
    expect(doc.title).toBe('My Post')
    expect(doc.description).toContain('reasonably long first paragraph')
    expect(doc.tags.length).toBeGreaterThan(0)
  })

  it('drops title and tags when disabled', () => {
    const doc = parseModelOutput('---\ntitle: X\ntags: [a]\n---\nBody', { ...DEFAULT_OPTIONS, includeTitle: false, includeTags: false })
    expect(doc.title).toBe('')
    expect(doc.tags).toEqual([])
  })

  it('strips chatty preambles and labelled or bolded titles from small models', () => {
    const labelled = parseModelOutput(
      "Here's the rewritten version of your transcript as a blog post:\n\n---\n\n**Title:** Why I Talk\n\nBody text that is long enough to count.",
      DEFAULT_OPTIONS,
    )
    expect(labelled.title).toBe('Why I Talk')
    expect(labelled.body).toBe('Body text that is long enough to count.')
    const bolded = parseModelOutput('Sure! Here it is:\n\n**Why I Stopped Typing**\n\nThe body.', DEFAULT_OPTIONS)
    expect(bolded.title).toBe('Why I Stopped Typing')
    expect(bolded.body).toBe('The body.')
  })
})
