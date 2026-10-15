import { diffArrays, diffWords } from 'diff'
import { stripMarkdown } from '../format/text'
import { AI_ISMS } from './aiisms'

const tokens = (text: string) =>
  stripMarkdown(text)
    .toLowerCase()
    .replace(/[’]/g, "'")
    .match(/[a-z0-9]+(?:'[a-z]+)?/g) ?? []

export interface VoiceMatch {
  /** 0–100: share of the body prose that is the speaker's own words, in their order. */
  score: number
  outputWords: number
  keptWords: number
  /** Distinct content words the editor introduced that the speaker never said. */
  newWords: string[]
  verdict: string
}

const FUNCTION_WORDS = new Set(
  'a an the and or but so to of in on at for with by from as is are was were be been it its this that these those i you we they he she me my your our their not no do does did have has had will would can could should just very tl dr'.split(
    ' ',
  ),
)

/** Body prose only: headings, the title and TL;DR summaries are structure, not the speaker's flow. */
function prose(markdown: string): string {
  return markdown
    .split('\n')
    .filter((line) => !/^\s*#{1,6}\s/.test(line) && !/^\s*>\s*\*\*TL;DR/i.test(line))
    .join('\n')
}

export function voiceMatch(transcript: string, output: string): VoiceMatch {
  const said = tokens(transcript)
  const written = tokens(prose(output))
  if (!written.length) return { score: 0, outputWords: 0, keptWords: 0, newWords: [], verdict: '' }
  // Order-aware: words kept in the speaker's sequence. Paraphrase and reshuffling both lower it.
  let kept = 0
  for (const part of diffArrays(said, written)) if (!part.added && !part.removed) kept += part.value.length
  // Vocabulary the speaker never used anywhere (including headings, which count here).
  const vocabulary = new Set(said)
  const added = new Map<string, number>()
  for (const w of tokens(output)) if (!vocabulary.has(w) && !FUNCTION_WORDS.has(w)) added.set(w, (added.get(w) ?? 0) + 1)
  const score = Math.round((kept / written.length) * 100)
  const verdict =
    score >= 85 ? 'Unmistakably you' : score >= 70 ? 'Sounds like you' : score >= 50 ? 'Partly rewritten' : 'Heavily rewritten'
  const newWords = [...added.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w)
  return { score, outputWords: written.length, keptWords: kept, newWords, verdict }
}

export interface AiIsmHit {
  start: number
  end: number
  text: string
  fix: string | null
  why: string
}

const COMPILED = AI_ISMS.map((a) => ({ ...a, re: new RegExp(`(?<![\\w-])(?:${a.pattern})(?![\\w-])`, 'gi') }))

/** Markdown that must never be highlighted or rewritten: code, link and image targets, bare URLs. */
function protectedRanges(text: string): [number, number][] {
  const ranges: [number, number][] = []
  for (const re of [/```[\s\S]*?```/g, /`[^`\n]+`/g, /\]\([^)\n]*\)/g, /<https?:[^>\s]+>/g, /\bhttps?:\/\/\S+/g])
    for (const m of text.matchAll(re)) ranges.push([m.index, m.index + m[0].length])
  return ranges
}

/** Find phrases that make writing read as machine-generated. Overlapping hits keep the earliest/longest. */
export function findAiIsms(text: string): AiIsmHit[] {
  const hits: AiIsmHit[] = []
  for (const { re, fix, why } of COMPILED) {
    re.lastIndex = 0
    for (let m = re.exec(text); m; m = re.exec(text)) hits.push({ start: m.index, end: m.index + m[0].length, text: m[0], fix, why })
  }
  // A single em dash is fine; a page full of them is a tell. Never match across a line break.
  const dashes = [...text.matchAll(/[ \t]?—[ \t]?/g)]
  if (dashes.length >= 3)
    for (const d of dashes)
      hits.push({ start: d.index, end: d.index + d[0].length, text: d[0], fix: ', ', why: 'Em dashes everywhere read as AI' })
  const skip = protectedRanges(text)
  const visible = hits.filter((h) => !skip.some(([a, b]) => h.start < b && h.end > a))
  visible.sort((a, b) => a.start - b.start || b.end - a.end)
  return visible.filter((h, i) => !visible.slice(0, i).some((p) => p.start <= h.start && h.start < p.end))
}

function matchCase(source: string, replacement: string) {
  return /^[A-Z]/.test(source) && replacement ? replacement[0].toUpperCase() + replacement.slice(1) : replacement
}

const SENTENCE_START = /(?:^|[.!?]["')]?[ \t]+|\n[ \t]*(?:[#>]+[ \t]*|[-*+][ \t]+|\d+\.[ \t]+)?)$/

/**
 * Apply every automatic fix. Tidying is local to each fix (spacing, a dangling comma, and
 * capitalising a sentence whose opening words were deleted), so nothing else on the page changes.
 */
export function fixAiIsms(text: string): string {
  let out = text
  for (const hit of findAiIsms(text).reverse()) {
    if (hit.fix === null) continue
    let before = out.slice(0, hit.start)
    let after = out.slice(hit.end)
    const replacement = matchCase(hit.text, hit.fix)
    if (!replacement.trim()) {
      // Deleted outright: close the gap and fix what used to follow it.
      after = after.replace(/^[ \t]+/, '')
      if (SENTENCE_START.test(before)) {
        after = after.replace(/^[,;][ \t]*/, '').replace(/^[a-z]/, (c) => c.toUpperCase())
      } else if (/^[,.;:!?]/.test(after)) {
        before = before.replace(/[ \t]+$/, '')
      }
      if (/\S$/.test(before) && /^\w/.test(after) && !/[ \t\n]$/.test(before)) before += ' '
    }
    out = before + replacement.trim() + (replacement.endsWith(' ') && !/^\s/.test(after) ? ' ' : '') + after
  }
  return out
}

export interface Readability {
  /** US school grade (Flesch–Kincaid). */
  grade: number
  avgSentenceWords: number
  label: string
}

function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (w.length <= 3) return 1
  const groups = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
    .replace(/^y/, '')
    .match(/[aeiouy]{1,2}/g)
  return Math.max(1, groups?.length ?? 1)
}

export function readability(markdown: string): Readability {
  const plain = stripMarkdown(markdown)
  const sentences = plain.split(/[.!?]+(?:\s|$)/).filter((s) => /[a-z]/i.test(s)).length || 1
  const words = plain.match(/[A-Za-z][A-Za-z'-]*/g) ?? []
  if (!words.length) return { grade: 0, avgSentenceWords: 0, label: '' }
  const syl = words.reduce((n, w) => n + syllables(w), 0)
  const avg = words.length / sentences
  const grade = Math.max(1, Math.round(0.39 * avg + 11.8 * (syl / words.length) - 15.59))
  const label = grade <= 6 ? 'Very easy' : grade <= 9 ? 'Easy' : grade <= 12 ? 'Moderate' : 'Dense'
  return { grade, avgSentenceWords: Math.round(avg), label }
}

export interface DiffPart {
  value: string
  added?: boolean
  removed?: boolean
}

/** Word-level changes from what was said to what was written, ignoring case. */
export function changes(transcript: string, output: string): DiffPart[] {
  return diffWords(transcript.replace(/\s+/g, ' ').trim(), stripMarkdown(output, { upperHeadings: false }).replace(/\s+/g, ' ').trim(), {
    ignoreCase: true,
  }).map((p) => ({ value: p.value, added: p.added, removed: p.removed }))
}
