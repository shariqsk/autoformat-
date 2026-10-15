import { describe, expect, it } from 'vitest'
import { applyHeadingPlan, buildHeadingPrompt, extractSections, parseHeadingPlan } from './headings'

const DOC = `Intro paragraph here.

## Free Local

The thing that surprised me most was how good the free local models have gotten.

### 2. Old Name

Second **item** text.`

describe('extractSections', () => {
  it('finds headings with their prefix and an excerpt', () => {
    const sections = extractSections(DOC, 5)
    expect(sections).toHaveLength(2)
    expect(sections[0]).toMatchObject({ line: 2, prefix: '## ', heading: 'Free Local', excerpt: 'The thing that surprised me…' })
    expect(sections[1]).toMatchObject({ prefix: '### 2. ', heading: 'Old Name', excerpt: 'Second item text.' })
  })
})

describe('buildHeadingPrompt', () => {
  it('asks for a fixed reply format and only includes TITLE when wanted', () => {
    const sections = extractSections(DOC)
    expect(buildHeadingPrompt(sections, 'Intro', true).system).toContain('TITLE:')
    const { system, user } = buildHeadingPrompt(sections, 'Intro', false)
    expect(system).not.toContain('TITLE:')
    expect(system).toContain('2: <name for section 2>')
    expect(user).toContain('Section 1: The thing that surprised me')
  })
})

describe('parseHeadingPlan', () => {
  it('reads a well-formed reply', () => {
    const plan = parseHeadingPlan('TITLE: Why I Stopped Typing\n1: How Good Free Models Got\n2: The Second Thing')
    expect(plan.title).toBe('Why I Stopped Typing')
    expect([...plan.headings.entries()]).toEqual([
      [0, 'How Good Free Models Got'],
      [1, 'The Second Thing'],
    ])
  })

  it('tolerates the usual small-model sloppiness', () => {
    const plan = parseHeadingPlan(
      'Sure!\n**Title:** "Talking Beats Typing".\nSection 1) ## Local Models Are Good\n2. *Setup*\nrandom chatter',
    )
    expect(plan.title).toBe('Talking Beats Typing')
    expect(plan.headings.get(0)).toBe('Local Models Are Good')
    expect(plan.headings.get(1)).toBe('Setup')
  })
})

describe('applyHeadingPlan', () => {
  it('renames headings, keeps levels and numbering, leaves body text alone', () => {
    const sections = extractSections(DOC)
    const out = applyHeadingPlan(DOC, sections, { title: null, headings: new Map([[1, 'New Name']]) })
    expect(out).toContain('## Free Local')
    expect(out).toContain('### 2. New Name')
    expect(out).toContain('The thing that surprised me most was how good the free local models have gotten.')
  })
})
