import { describe, expect, it } from 'vitest'
import {
  applyReplacements,
  cleanTranscript,
  insertSentenceBreaks,
  polishSentence,
  scrub,
  splitSentences,
  stripLeadingTics,
} from './cleanup'

const flat = (raw: string, strictness: 0 | 1 | 2 | 3) => cleanTranscript(raw, strictness).flat().join(' ')

describe('scrub', () => {
  it('always removes filler sounds and stutters, even verbatim', () => {
    expect(scrub('um so I uh think the the idea is, erm, good', 0)).toBe('so I think the idea is, good')
    expect(scrub('I- I really mean it', 0)).toBe('I really mean it')
  })

  it('keeps slang in "no filter" mode', () => {
    expect(scrub("yo bro it's gonna be dope", 1)).toContain('bro')
    expect(scrub("yo bro it's gonna be dope", 1)).toContain('gonna')
  })

  it('removes verbal tics from "no filter" upward', () => {
    expect(scrub('it was, like, really good, you know, and stuff', 1)).toBe('it was, really good, and stuff')
    expect(scrub('do you know what I mean', 1)).toBe('do you know what I mean')
    expect(scrub("I hate typing, like I'll sit there", 1)).toBe("I hate typing, I'll sit there")
    expect(scrub('I like it', 1)).toBe('I like it')
  })

  it('drops crude bits in polished mode but keeps slang', () => {
    expect(scrub("bro it's fucking gonna work lol", 2)).toBe("bro it's gonna work")
  })

  it('only swaps a few words in formal mode, keeping contractions', () => {
    const out = scrub("yeah bro I'm gonna grab a bunch of stuff lol", 3)
    expect(out).toBe("I'm going to grab a lot of stuff")
    expect(scrub("it's kinda just there", 3)).toBe("it's just there")
    expect(scrub("it's kinda crazy and we can't stop", 3)).toBe("it's a bit crazy and we can't stop")
  })

  it('protects keep-words from every rule', () => {
    expect(scrub('yeah bro gonna be lit lol', 3, ['bro', 'gonna'])).toBe('bro gonna be lit')
  })

  it('removes bracketed transcription artefacts', () => {
    expect(scrub('hello [BLANK_AUDIO] world', 0)).toBe('hello world')
  })
})

describe('sentence handling', () => {
  it('inserts breaks into unpunctuated run-ons', () => {
    const runOn =
      'i started this blog last year because i wanted somewhere to write things down but honestly i never had time to type it all out so now i just talk into my laptop and it does the rest which is great'
    const out = insertSentenceBreaks(runOn)
    expect(out.split('.').length).toBeGreaterThan(2)
  })

  it('leaves punctuated text alone', () => {
    const text = 'This is fine. It already has punctuation. Nothing to do here, really.'
    expect(insertSentenceBreaks(text)).toBe(text)
  })

  it('does not split on common abbreviations', () => {
    expect(splitSentences('Use tools, e.g. Whisper. Then publish.')).toEqual(['Use tools, e.g. Whisper.', 'Then publish.'])
  })

  it('polishes casing and punctuation, detecting questions', () => {
    expect(polishSentence('what is the point', 1)).toBe('What is the point?')
    expect(polishSentence('i think the ai api is neat', 1)).toBe('I think the AI API is neat.')
    expect(polishSentence('yeah', 1)).toBeNull()
    expect(polishSentence('yeah', 0)).toBe('Yeah.')
  })

  it('strips leading tics depending on strictness', () => {
    expect(stripLeadingTics('So, anyway, here we go.', 1)).toBe('Here we go.')
    expect(stripLeadingTics('So here we go.', 0)).toBe('So here we go.')
    expect(stripLeadingTics('And then it worked.', 3)).toBe('And then it worked.')
  })
})

describe('cleanTranscript', () => {
  it('produces paragraphs and respects typed paragraph breaks', () => {
    const paragraphs = cleanTranscript('First idea here. More on it.\n\nSecond idea now. Done.', 1)
    expect(paragraphs).toHaveLength(2)
  })

  it('starts a new paragraph on topic shifts', () => {
    const raw = 'Local models are great. They are free. They are private. Anyway, the other topic is speed. It is fast.'
    const paragraphs = cleanTranscript(raw, 1)
    expect(paragraphs.length).toBe(2)
    expect(paragraphs[1][0]).toBe('The other topic is speed.')
  })

  it('returns nothing for empty input', () => {
    expect(cleanTranscript('   ', 1)).toEqual([])
    expect(flat('um uh', 1)).toBe('')
  })
})

describe('applyReplacements', () => {
  it('fixes misheard words case-insensitively on word boundaries', () => {
    expect(applyReplacements('I asked clawed and Clawed said hi, unclawed', [{ from: 'clawed', to: 'Claude' }])).toBe(
      'I asked Claude and Claude said hi, unclawed',
    )
  })

  it('ignores empty entries and escapes regex characters', () => {
    expect(
      applyReplacements('use c++ daily', [
        { from: '', to: 'x' },
        { from: 'c++', to: 'C++' },
      ]),
    ).toBe('use C++ daily')
  })
})
