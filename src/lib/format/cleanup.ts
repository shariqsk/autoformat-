// Rule-based transcript cleanup. Works fully offline and instantly, and doubles as a
// pre-pass that makes LLM output better (less noise in, less noise out).

import { capitalize, wordCount } from './text'

export type Strictness = 0 | 1 | 2 | 3

type Rule = [pattern: RegExp, replacement: string | ((match: string, ...groups: string[]) => string)]

/** Keep the capitalisation style of the text being replaced. */
function matchCase(source: string, replacement: string): string {
  if (!replacement) return replacement
  if (source.length > 1 && source === source.toUpperCase() && /[A-Z]/.test(source)) return replacement.toUpperCase()
  if (/^[A-Z]/.test(source)) return replacement.charAt(0).toUpperCase() + replacement.slice(1)
  return replacement
}

const swap = (word: string, replacement: string): Rule => [
  new RegExp(`\\b${word}\\b`, 'gi'),
  (m: string) => matchCase(m, replacement),
]

// Pure disfluencies: always removed, even in verbatim mode.
const FILLER_SOUNDS: Rule[] = [
  [/(^|[\s,])(?:u+m+|u+h+m*|e+r+m+|a+h+|h+m+|m+h*m+)(?=[\s,.!?]|$)[,]?/gi, '$1'],
  // Stutters and doubled words: "I- I think", "the the".
  [/\b(\w+)-\s+\1\b/gi, '$1'],
  [/\b(\w+)(?:,?\s+\1\b)+/gi, '$1'],
]

// Verbal tics: removed from "my voice" upwards.
const VERBAL_TICS: Rule[] = [
  [/(^|[.!?]\s+)(?:(?:okay|ok|alright|right|yeah|well),|(?:so|okay|yeah) (?:yeah|so),?)\s+(?=\w)/gi, '$1'],
  [/,?\s*\b(?:so yeah|and yeah|yeah so|but yeah)\b[,.]?/gi, '.'],
  [/(?<!\b(?:do|did|don't|if|what|as|you|we|they|I)\s+)\byou know\b(?!\s+(?:what|that|how|why|who|when|where|the|a|it|him|her|them|this|about))[,]?\s*/gi, ''],
  [/(^|[.!?,]\s*)I mean,\s*/g, '$1'],
  [/,\s*like,/gi, ','],
  [/(^|[.!?]\s+)like,\s*/gi, '$1'],
  [/\blike,?\s+(?=like\b)/gi, ''],
  [/\b(yeah|so|and|but|okay|it's|was|is)\s+like,?\s+/gi, '$1 '],
  [/\blike,?\s+(?=(?:honestly|literally|really|totally|just|basically|actually|so|um|uh)\b)/gi, ''],
  [/\b(?:basically|literally),?\s+/gi, ''],
  [/,\s*like,?\s+(?=(?:I|I'm|I'll|I've|we|you|it|they|he|she)\b)/g, ', '],
  [/,?\s*\b(?:or something(?: like that)?|or whatever|and stuff like that|and all that)\b/gi, ''],
]

// Slang and casual register: swapped out for professional tones and above.
const SLANG: Rule[] = [
  [/(^|[.!?]\s+)(?:yeah|yep|yup|yo)\b,?\s*/gi, '$1'],
  [/(^|[,.!?]\s*|\b(?:yeah|yo|okay|ok|nah|no|like|man)\s+)(?:bro|bruh|dude|fam|homie)\b,?\s*/gi, '$1'],
  [/,?\s*\b(?:bro|bruh|dude|fam|homie|man)\b(?=\s*(?:[,.!?]|$))/gi, ''],
  [/\b(?:lol|lmao|lmfao|rofl|haha+|hehe+)\b[,.!]?\s*/gi, ''],
  [/\b(?:freaking|frickin|fricking|effing|fucking|friggin)\s+/gi, ''],
  [/\bholy (?:shit|crap)\b/gi, 'wow'],
  [/\b(?:damn|dang)\s+(?=\w)/gi, ''],
  swap('gonna', 'going to'),
  swap('wanna', 'want to'),
  swap('gotta', 'have to'),
  [/\b(?:kinda|sorta)\s+(?=just\b|like\b)/gi, ''],
  swap('kinda', 'somewhat'),
  swap('sorta', 'somewhat'),
  swap('gimme', 'give me'),
  swap('lemme', 'let me'),
  swap("y'all", 'you all'),
  swap("ain't", "isn't"),
  swap('cuz', 'because'),
  swap('coz', 'because'),
  swap('tbh', 'honestly'),
  swap('imo', 'in my opinion'),
  swap('imho', 'in my opinion'),
  swap('idk', "I don't know"),
  swap('ngl', 'honestly'),
  swap('yeah', 'yes'),
  swap('yep', 'yes'),
  swap('yup', 'yes'),
  swap('nah', 'no'),
  swap('nope', 'no'),
  swap('dope', 'great'),
  swap('insane', 'remarkable'),
  swap('pretty much', 'essentially'),
  swap('a bunch of', 'several'),
  swap('a ton of', 'a lot of'),
  swap('tons of', 'many'),
  swap('this stuff', 'this'),
  swap('that stuff', 'that'),
  swap('stuff', 'things'),
  swap('bucks', 'dollars'),
  swap('crazy', 'remarkable'),
  swap('shit', 'things'),
  [/\bsuper (?=\w)/gi, (m) => matchCase(m, 'very ')],
  [/\b(?:and stuff|and things)\b/gi, ''],
  [/\bwas like,?\s*/gi, (m) => matchCase(m, 'said, ')],
]

const CONTRACTIONS: Record<string, string> = {
  "can't": 'cannot',
  "won't": 'will not',
  "shan't": 'shall not',
  "let's": 'let us',
  "i'm": 'I am',
  "it's": 'it is',
  "that's": 'that is',
  "there's": 'there is',
  "what's": 'what is',
  "here's": 'here is',
  "who's": 'who is',
}

// Academic register: no contractions.
const FORMAL: Rule[] = [
  [/\b(\w+)n't\b/gi, (m, stem: string) => CONTRACTIONS[m.toLowerCase()] ? matchCase(m, CONTRACTIONS[m.toLowerCase()]) : `${stem} not`],
  [/\b(?:i'm|it's|that's|there's|what's|here's|who's|let's)\b/gi, (m) => matchCase(m, CONTRACTIONS[m.toLowerCase()])],
  [/\b(\w+)'re\b/gi, '$1 are'],
  [/\b(\w+)'ve\b/gi, '$1 have'],
  [/\b(\w+)'ll\b/gi, '$1 will'],
  [/\b(I|you|we|they|he|she)'d\b/gi, '$1 would'],
  swap('really', ''),
  swap('awesome', 'excellent'),
  swap('huge', 'significant'),
  swap('a lot of', 'considerable'),
]

function applyRules(text: string, rules: Rule[]): string {
  return rules.reduce((acc, [re, rep]) => acc.replace(re, rep as never), text)
}

/** Remove disfluencies and adjust register according to strictness. Returns a single string. */
export function scrub(raw: string, strictness: Strictness): string {
  let text = raw
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\[(?:BLANK_AUDIO|MUSIC|NOISE|INAUDIBLE|silence)\]|\((?:music|laughs|silence|inaudible)\)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  text = applyRules(text, FILLER_SOUNDS)
  if (strictness >= 1) text = applyRules(text, VERBAL_TICS)
  if (strictness >= 2) text = applyRules(text, SLANG)
  if (strictness >= 3) text = applyRules(text, FORMAL)
  return tidyPunctuation(text)
}

function tidyPunctuation(text: string): string {
  return text
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/([,;:])(?:\s*[,;:])+/g, '$1')
    .replace(/,\s*([.!?])/g, '$1')
    .replace(/([.!?])(?:\s*[.,])+/g, '$1')
    .replace(/(^|[.!?]\s+)[,;:]\s*/g, '$1')
    .replace(/([,;:])(?=[A-Za-z])/g, '$1 ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,.;:]+/, '')
    .trim()
}

const BREAK_MARKERS = new Set([
  'so',
  'but',
  'anyway',
  'anyways',
  'also',
  'then',
  'now',
  'and',
  'okay',
  'however',
  'plus',
  'finally',
  'next',
  'first',
  'honestly',
])

/**
 * Speech engines without punctuation (e.g. the browser's Web Speech API) produce one endless
 * run-on. Insert sentence breaks before discourse markers once a sentence is long enough.
 */
export function insertSentenceBreaks(text: string): string {
  const totalWords = wordCount(text)
  const terminators = (text.match(/[.!?](?=\s|$)/g) ?? []).length
  if (totalWords < 20 || terminators >= totalWords / 30) return text

  const tokens = text.split(/\s+/)
  const out: string[] = []
  let sinceBreak = 0
  for (const token of tokens) {
    const bare = token.toLowerCase().replace(/[^a-z']/g, '')
    const shouldBreak =
      sinceBreak >= 30 || (sinceBreak >= 9 && BREAK_MARKERS.has(bare) && bare !== 'and') || (sinceBreak >= 18 && bare === 'and')
    if (shouldBreak && out.length) {
      out[out.length - 1] = out[out.length - 1].replace(/[,;:]?$/, '.')
      sinceBreak = 0
      // "and"/"so" at the start of a new sentence adds nothing.
      if (bare === 'and' || bare === 'so') continue
    }
    out.push(sinceBreak === 0 && out.length ? capitalize(token) : token)
    sinceBreak = /[.!?]$/.test(token) ? 0 : sinceBreak + 1
  }
  return out.join(' ')
}

const ABBREVIATIONS = /\b(?:e\.g|i\.e|etc|vs|mr|mrs|ms|dr|prof|st|approx|no|u\.s|inc|ltd)\.$/i

export function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?…]["')\]]?)\s+(?=["'([]?[A-Za-z0-9])/)
  const sentences: string[] = []
  for (const part of parts) {
    const prev = sentences[sentences.length - 1]
    if (prev && ABBREVIATIONS.test(prev)) sentences[sentences.length - 1] = `${prev} ${part}`
    else sentences.push(part)
  }
  return sentences.map((s) => s.trim()).filter(Boolean)
}

const QUESTION_START = /^(?:what|why|how|when|where|who|which|is|are|was|were|do|does|did|can|could|should|would|will|have|has|isn't|aren't|don't|doesn't)\b/i
const JUNK_SENTENCE = /^(?:yeah|yes|okay|ok|so|anyway|anyways|right|alright|um|uh|and|but|like|cool|nice)[.!?]?$/i

export function polishSentence(sentence: string, strictness: Strictness): string | null {
  let s = sentence
    .replace(/^[\s,;:.-]+/, '')
    .replace(/\bi\b/g, 'I')
    .replace(/\bi'(m|ve|ll|d)\b/g, "I'$1")
    .trim()
  if (!s || /^[^A-Za-z0-9]+$/.test(s)) return null
  if (strictness >= 1 && JUNK_SENTENCE.test(s)) return null
  s = capitalize(fixCasing(s))
  if (!/[.!?…:"')\]]$/.test(s)) s += QUESTION_START.test(s) ? '?' : '.'
  return s
}

const LEADING_TICS: Record<Strictness, RegExp | null> = {
  0: null,
  1: /^(?:so|yeah|like|okay|ok|well|anyway|anyways|alright)\b,?\s+(?=\w)/i,
  2: /^(?:so|yeah|like|okay|ok|well|anyway|anyways|alright|and so|but yeah)\b,?\s+(?=\w)/i,
  3: /^(?:so|yeah|like|okay|ok|well|anyway|anyways|alright|and|and so|plus)\b,?\s+(?=\w)/i,
}

export function stripLeadingTics(sentence: string, strictness: Strictness): string | null {
  const re = LEADING_TICS[strictness]
  if (!re) return sentence
  let s = sentence
  for (let i = 0; i < 3 && re.test(s); i++) s = s.replace(re, '')
  s = capitalize(s.trim())
  return /[A-Za-z0-9]/.test(s) ? s : null
}

const PROPER_CASE: Record<string, string> = Object.fromEntries(
  'AI API UI UX SEO CSS HTML JSON URL CEO CTO LLM LLMs GPU CPU SaaS iPhone iPad macOS YouTube GitHub ChatGPT JavaScript TypeScript LinkedIn TikTok WordPress OK'
    .split(' ')
    .map((w) => [w.toLowerCase(), w]),
)

function fixCasing(s: string): string {
  return s.replace(/\b[a-z]+\b/g, (w) => (w === 'ok' ? w : PROPER_CASE[w] ?? w))
}

const TOPIC_SHIFT =
  /^(?:anyway|anyways|another thing|the other thing|moving on|next|also|secondly|second|third|thirdly|finally|lastly|first|firstly|on top of that|besides|oh and|one more thing|now|in the end|overall|so basically|to wrap up|in conclusion)\b/i

/** Group sentences into readable paragraphs. */
export function toParagraphs(sentences: string[], targetWords = 70): string[][] {
  const paragraphs: string[][] = []
  let current: string[] = []
  let words = 0
  for (const sentence of sentences) {
    const shift = TOPIC_SHIFT.test(sentence) && current.length >= 2
    const full = (words >= targetWords && current.length >= 2) || current.length >= 5
    if (current.length && (shift || full)) {
      paragraphs.push(current)
      current = []
      words = 0
    }
    current.push(sentence)
    words += wordCount(sentence)
  }
  if (current.length) {
    // Avoid a dangling one-liner at the end.
    if (current.length === 1 && paragraphs.length && wordCount(current[0]) < 12) paragraphs[paragraphs.length - 1].push(current[0])
    else paragraphs.push(current)
  }
  return paragraphs
}

/** Full offline cleanup pipeline: raw transcript in, paragraphs of polished sentences out. */
export function cleanTranscript(raw: string, strictness: Strictness): string[][] {
  // Respect paragraph breaks the user typed or pasted.
  const blocks = raw.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
  const result: string[][] = []
  for (const block of blocks) {
    const scrubbed = insertSentenceBreaks(scrub(block, strictness))
    const sentences = splitSentences(scrubbed)
      .map((s) => polishSentence(s, strictness))
      .filter((s): s is string => s !== null)
    // Leading tics are stripped only after paragraphing, since "Anyway, ..." marks a topic shift.
    const paragraphs = toParagraphs(sentences).map((p) =>
      p.map((s) => stripLeadingTics(s, strictness)).filter((s): s is string => s !== null),
    )
    result.push(...paragraphs.filter((p) => p.length))
  }
  return result
}
