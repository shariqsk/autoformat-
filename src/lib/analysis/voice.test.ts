import { describe, expect, it } from 'vitest'
import { changes, findAiIsms, fixAiIsms, readability, voiceMatch } from './voice'

describe('voiceMatch', () => {
  it('scores light edits as unmistakably the speaker', () => {
    const m = voiceMatch('so um I love talking and I hate typing you know', 'I love talking and I hate typing.')
    expect(m.score).toBe(100)
    expect(m.verdict).toBe('Unmistakably you')
  })

  it('scores a rewrite low and lists introduced words', () => {
    const m = voiceMatch('I hate typing but I love talking', 'Typing feels tedious, whereas conversation energises me profoundly.')
    expect(m.score).toBeLessThan(30)
    expect(m.newWords).toEqual(expect.arrayContaining(['tedious', 'profoundly']))
    expect(m.newWords).not.toContain('me')
  })

  it('ignores markdown syntax', () => {
    expect(voiceMatch('hello there friend', '## Hello\n\n**there** friend').score).toBe(100)
  })
})

describe('AI-isms', () => {
  it('finds tells with suggested fixes', () => {
    const hits = findAiIsms("Let's delve into this. Furthermore, we leverage a robust tapestry of tools.")
    expect(hits.map((h) => h.text)).toEqual(['delve into', 'Furthermore,', 'leverage', 'robust', 'tapestry of'])
  })

  it('does not flag words inside other words', () => {
    expect(findAiIsms('The fostering of trust; unrobust; delved')).toHaveLength(2)
    expect(findAiIsms('nothing to see here')).toHaveLength(0)
  })

  it('flags em dashes only when overused', () => {
    expect(findAiIsms('One — two.')).toHaveLength(0)
    expect(findAiIsms('One — two — three — four.')).toHaveLength(3)
  })

  it('fixes tells and tidies the sentence', () => {
    expect(fixAiIsms("It's worth noting that we utilize Whisper. Moreover, it is seamless.")).toBe(
      'We use Whisper. Also, it is smooth.',
    )
    expect(fixAiIsms('In conclusion, it works.')).toBe('It works.')
  })

  it('leaves flag-only hits for a human', () => {
    expect(fixAiIsms('This will unlock the potential of blogs.')).toBe('This will unlock the potential of blogs.')
  })
})

describe('readability', () => {
  it('rates short plain sentences as easy', () => {
    const r = readability('I talk. It types. The post is done fast.')
    expect(r.grade).toBeLessThanOrEqual(4)
    expect(r.label).toBe('Very easy')
  })

  it('handles empty text', () => {
    expect(readability('').grade).toBe(0)
  })
})

describe('changes', () => {
  it('marks removed fillers and added punctuation', () => {
    const parts = changes('um I love it', 'I love it.')
    expect(parts.some((p) => p.removed && p.value.includes('um'))).toBe(true)
    expect(parts.filter((p) => !p.added && !p.removed).map((p) => p.value.trim()).join(' ')).toContain('love')
  })
})
