// "Instant" engine: deterministic, offline layout formatting built on the rule-based cleaner.
// It can't rewrite like an LLM, but it is free, private and runs in a few milliseconds.

import { cleanTranscript } from './cleanup'
import { toneById } from './styles'
import { capitalize, extractKeywords, isStopword, termFrequencies, titleCase, truncate, wordCount } from './text'
import type { FormatOptions, FormattedDoc, LayoutId } from './types'

type Paragraphs = string[][]

const joinP = (p: string[]) => p.join(' ')

/** Most frequent pair of adjacent meaningful words, e.g. "local models". */
function topBigram(text: string, used: Set<string>): string | null {
  const counts = new Map<string, number>()
  for (const sentence of text.toLowerCase().split(/[.!?,;:]+/)) {
    const ws = sentence.match(/[a-z][a-z'-]*/g) ?? []
    for (let i = 0; i < ws.length - 1; i++) {
      const [a, b] = [ws[i], ws[i + 1]]
      if (a.length < 3 || b.length < 4 || isStopword(a) || isStopword(b) || used.has(`${a} ${b}`)) continue
      counts.set(`${a} ${b}`, (counts.get(`${a} ${b}`) ?? 0) + 1)
    }
  }
  const best = [...counts.entries()].sort((x, y) => y[1] - x[1])[0]
  return best ? best[0] : null
}

const CLAUSE_BREAK = /^(?:was|is|are|were|because|so|but|and|which|when|if)$/i

/** The first 3–7 word clause of a sentence (up to a comma or a linking word), if it has one. */
export function clauseHead(sentence: string): string | null {
  const words = sentence.replace(/[.!?]+$/, '').split(/\s+/)
  for (let i = 3; i <= Math.min(7, words.length - 1); i++) {
    if (/[,;:]$/.test(words[i - 1])) return words.slice(0, i).join(' ').slice(0, -1)
    if (CLAUSE_BREAK.test(words[i])) return words.slice(0, i).join(' ')
  }
  return null
}

/** Section heading: a short opening sentence if there is one, else the chunk's key phrase. */
function headingFor(chunk: string, corpus: string, used: Set<string>): string {
  const first = (chunk.split(/(?<=[.!?])\s+/)[0] ?? '').replace(
    /^(?:and|but|so|also|then|now|plus|oh|finally|first|firstly|next|lastly)\b,?\s+/i,
    '',
  )
  const n = wordCount(first)
  // A short statement or question the speaker opened with makes the most natural heading.
  if (n >= 2 && n <= 7 && /[.?]$/.test(first)) return titleCase(capitalize(first.replace(/\.$/, '')))
  // Otherwise the speaker's own opening clause usually names the topic:
  // "The thing that surprised me most was how good…" → "The Thing That Surprised Me Most".
  const clause = clauseHead(first)
  if (clause) return titleCase(capitalize(clause))
  const bigram = topBigram(chunk, used)
  if (bigram) {
    used.add(bigram)
    return titleCase(bigram)
  }
  const global = termFrequencies(corpus)
  const local = [...termFrequencies(chunk).entries()]
    .filter(([w]) => !used.has(w))
    .map(([w, n]) => [w, n / Math.sqrt(global.get(w) ?? 1)] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([w]) => w)
  local.forEach((w) => used.add(w))
  if (!local.length) return 'More Thoughts'
  return titleCase(local.join(' and '))
}

const TITLE_LEADS =
  /^(?:so\s+)?(?:today\s+)?(?:I\s+(?:want|wanted|'d like|would like)\s+to\s+(?:talk|write|chat|rant|tell you)\s+about|let's\s+talk\s+about|this\s+(?:post|is)\s+(?:is\s+)?about|I'm\s+going\s+to\s+talk\s+about)\s+/i

export function deriveTitle(paragraphs: Paragraphs): string {
  const sentences = paragraphs.flat()
  for (const s of sentences.slice(0, 4)) {
    if (TITLE_LEADS.test(s)) {
      const topic = s
        .replace(TITLE_LEADS, '')
        .replace(/[.!?]+$/, '')
        .split(/,|\band\s+(?:how|why)\b/)[0]
      if (wordCount(topic) >= 1 && wordCount(topic) <= 10) return titleCase(capitalize(topic))
    }
  }
  const short = sentences.slice(0, 3).find((s) => wordCount(s) >= 4 && wordCount(s) <= 11 && !s.endsWith('?'))
  if (short) return titleCase(short.replace(/[.!]+$/, ''))
  const kws = extractKeywords(sentences.join(' '), 2)
  return kws.length ? `Thoughts on ${titleCase(kws.join(' and '))}` : 'Untitled'
}

/** Pick the most representative sentences (keyword density), kept in original order. */
export function summarize(paragraphs: Paragraphs, count = 2): string {
  const sentences = paragraphs.flat()
  const freq = termFrequencies(sentences.join(' '))
  const scored = sentences.map((s, i) => {
    const terms = termFrequencies(s)
    let score = 0
    terms.forEach((_, w) => (score += freq.get(w) ?? 0))
    return { s, i, score: score / Math.sqrt(wordCount(s) + 1) + (i === 0 ? 1 : 0) }
  })
  return scored
    .filter((x) => wordCount(x.s) >= 5 && !x.s.endsWith('?'))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.s)
    .join(' ')
}

function sectioned(paragraphs: Paragraphs, corpus: string, opts: { closing?: string; maxPerSection?: number } = {}): string {
  if (paragraphs.length < 4) return paragraphs.map(joinP).join('\n\n')
  const [intro, ...rest] = paragraphs
  const closing = opts.closing && rest.length >= 3 ? rest.pop() : undefined
  const per = opts.maxPerSection ?? 2
  const used = new Set<string>()
  const out = [joinP(intro)]
  for (let i = 0; i < rest.length; i += per) {
    const group = rest.slice(i, i + per).map((p) => [...p])
    const heading = headingFor(group.map(joinP).join(' '), corpus, used)
    // A short opening sentence promoted to a heading shouldn't be repeated underneath it.
    if (group[0].length > 1 && group[0][0].replace(/\.$/, '').toLowerCase() === heading.toLowerCase()) group[0].shift()
    out.push(`## ${heading}`, ...group.map(joinP))
  }
  if (closing) out.push(`## ${opts.closing}`, joinP(closing))
  return out.join('\n\n')
}

function listicle(paragraphs: Paragraphs, corpus: string): string {
  let items = paragraphs.slice(1)
  let intro = paragraphs[0] ?? []
  if (items.length < 3) {
    const sentences = paragraphs.flat()
    intro = sentences.slice(0, 1)
    items = sentences.slice(1).map((s) => [s])
  }
  const used = new Set<string>()
  const body = items.map((p, i) => `### ${i + 1}. ${headingFor(joinP(p), corpus, used)}\n\n${joinP(p)}`)
  return [joinP(intro), ...body].join('\n\n')
}

const STEP_MARKER =
  /^(?:first(?:ly)?|first of all|to start|start by|then|next|after that|afterwards|once that's done|once (?:you|that)|now|finally|lastly|step (?:\w+)|second(?:ly)?|third(?:ly)?)\b,?\s*/i

function howto(paragraphs: Paragraphs): string {
  const sentences = paragraphs.flat()
  let firstStep = sentences.findIndex((s) => STEP_MARKER.test(s))
  if (firstStep < 0) firstStep = Math.min(1, sentences.length - 1)
  const intro = sentences.slice(0, firstStep)
  const steps: string[] = []
  for (const s of sentences.slice(firstStep)) {
    if (STEP_MARKER.test(s) || !steps.length) steps.push(capitalize(s.replace(STEP_MARKER, '')))
    else steps[steps.length - 1] += ` ${s}`
  }
  if (steps.length < 2) {
    steps.length = 0
    steps.push(...sentences.slice(firstStep))
  }
  return [intro.join(' '), '## Steps', steps.map((s, i) => `${i + 1}. ${s}`).join('\n')].filter(Boolean).join('\n\n')
}

function qa(paragraphs: Paragraphs, corpus: string): string {
  const sentences = paragraphs.flat()
  const blocks: string[] = []
  let answer: string[] = []
  let question: string | null = null
  const flush = () => {
    if (question) blocks.push(`### ${question}`, answer.join(' ') || '_No answer recorded._')
    else if (answer.length) blocks.push(answer.join(' '))
    answer = []
  }
  for (const s of sentences) {
    if (s.endsWith('?')) {
      flush()
      question = s
    } else answer.push(s)
  }
  flush()
  if (sentences.some((s) => s.endsWith('?'))) return blocks.join('\n\n')
  // No explicit questions: turn each paragraph into an implied one.
  const used = new Set<string>()
  return paragraphs.map((p) => `### What about ${headingFor(joinP(p), corpus, used).toLowerCase()}?\n\n${joinP(p)}`).join('\n\n')
}

function thread(paragraphs: Paragraphs): string {
  const LIMIT = 270
  const posts: string[] = []
  let current = ''
  for (const s of paragraphs.flat()) {
    const pieces = s.length > LIMIT ? (s.match(new RegExp(`.{1,${LIMIT}}(?:\\s|$)`, 'g')) ?? [s]) : [s]
    for (const piece of pieces.map((p) => p.trim())) {
      if (current && `${current} ${piece}`.length > LIMIT) {
        posts.push(current)
        current = piece
      } else current = current ? `${current} ${piece}` : piece
    }
  }
  if (current) posts.push(current)
  return posts.map((p, i) => `${i + 1}/${posts.length} ${p}`).join('\n\n')
}

function linkedin(paragraphs: Paragraphs, tags: string[]): string {
  const sentences = paragraphs.flat()
  const [hook, ...rest] = sentences
  const lines: string[] = []
  for (let i = 0; i < rest.length; i++) {
    const s = rest[i]
    const next = rest[i + 1]
    if (next && wordCount(s) + wordCount(next) < 22) {
      lines.push(`${s} ${next}`)
      i++
    } else lines.push(s)
  }
  if (!sentences.some((s) => s.endsWith('?'))) lines.push('What do you think?')
  const hashtags = tags.map((t) => `#${titleCase(t).replace(/[^A-Za-z0-9]/g, '')}`).join(' ')
  return [hook ? `**${hook}**` : '', ...lines, hashtags].filter(Boolean).join('\n\n')
}

function notes(paragraphs: Paragraphs, corpus: string): string {
  const used = new Set<string>()
  return paragraphs
    .map((p) => {
      const bullets = p.map((s) => `- ${capitalize(s.replace(/^(?:and|but|so|also|then)\s+/i, ''))}`).join('\n')
      return paragraphs.length > 1 ? `## ${headingFor(joinP(p), corpus, used)}\n\n${bullets}` : bullets
    })
    .join('\n\n')
}

function journal(paragraphs: Paragraphs, now: Date): string {
  const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  return [`*${date}*`, ...paragraphs.map(joinP)].join('\n\n')
}

function renderLayout(layout: LayoutId, paragraphs: Paragraphs, corpus: string, tags: string[], now: Date): string {
  switch (layout) {
    case 'blog':
      return sectioned(paragraphs, corpus, { closing: 'Wrapping Up' })
    case 'listicle':
      return listicle(paragraphs, corpus)
    case 'howto':
      return howto(paragraphs)
    case 'essay':
      return paragraphs.map(joinP).join('\n\n')
    case 'newsletter':
      return ['Hey friends,', sectioned(paragraphs, corpus, { closing: 'Before You Go' }), 'Until next time,'].join('\n\n')
    case 'qa':
      return qa(paragraphs, corpus)
    case 'thread':
      return thread(paragraphs)
    case 'linkedin':
      return linkedin(paragraphs, tags)
    case 'notes':
      return notes(paragraphs, corpus)
    case 'journal':
      return journal(paragraphs, now)
  }
}

export function formatLocally(
  transcript: string,
  options: FormatOptions,
  { now = new Date(), keepWords = [] }: { now?: Date; keepWords?: string[] } = {},
): FormattedDoc {
  const tone = toneById(options.tone)
  let paragraphs = cleanTranscript(transcript, tone.strictness, keepWords)
  if (!paragraphs.length) return { title: '', description: '', tags: [], body: '' }

  // "Concise" keeps only the most informative sentences of each paragraph.
  if (options.length === 'concise') {
    paragraphs = paragraphs.map((p) => (p.length > 2 ? summarize([p], Math.ceil(p.length / 2)).split(/(?<=[.!?])\s+/) : p))
  }

  const corpus = paragraphs.flat().join(' ')
  const tags = options.includeTags ? extractKeywords(corpus, 5) : []
  let body = renderLayout(options.layout, paragraphs, corpus, tags, now)
  if (options.includeSummary && paragraphs.flat().length > 3) body = `> **TL;DR:** ${summarize(paragraphs)}\n\n${body}`

  return {
    title: options.includeTitle ? deriveTitle(paragraphs) : '',
    description: truncate(summarize(paragraphs, 1) || corpus, 160),
    tags,
    body,
  }
}
