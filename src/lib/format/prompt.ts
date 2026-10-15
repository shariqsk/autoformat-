import { layoutById, lengthById, toneById } from './styles'
import type { FormatOptions } from './types'

export interface Prompt {
  system: string
  user: string
}

/** Build the instructions handed to whichever LLM engine is selected. */
export function buildPrompt(transcript: string, options: FormatOptions): Prompt {
  const layout = layoutById(options.layout)
  const tone = toneById(options.tone)
  const length = lengthById(options.length)

  const metadata = [
    options.includeTitle ? 'title: a specific, compelling title (no clickbait, no trailing period)' : null,
    'description: one sentence (max 160 characters) summarising the piece, suitable for SEO',
    options.includeTags ? 'tags: 3–6 short lowercase topic tags, as a YAML list like [one, two]' : null,
  ].filter(Boolean)

  const system = [
    'You are a meticulous editor who turns spoken, rambling voice transcripts into polished written pieces.',
    '',
    'Ground rules:',
    '- The transcript came from speech-to-text. Expect filler words, false starts, repetition, missing punctuation and misheard words. Silently fix them; when a word is clearly misheard, use the word the speaker obviously meant.',
    '- Preserve the speaker\'s meaning, opinions, facts, numbers, names and examples. Never invent facts, quotes, statistics or links.',
    '- Write in the first person when the speaker talks about themselves.',
    '- Output GitHub-flavoured Markdown only. No commentary before or after, no code fences around the document.',
    '',
    `Layout — ${layout.label}: ${layout.guide}`,
    `Tone — ${tone.label}: ${tone.guide}`,
    `Length — ${length.label}: ${length.guide}`,
    options.includeSummary
      ? 'Begin the body with a one- or two-sentence summary formatted as a blockquote starting with "**TL;DR:**".'
      : null,
    '',
    'Output format — start with YAML front matter, then the body:',
    '---',
    ...metadata,
    '---',
    options.includeTitle
      ? 'Then the body. Do not repeat the title as a heading; the first line of the body is regular content.'
      : 'Then the body. Do not add a top-level title heading.',
  ]
    .filter((line): line is string => line !== null)
    .join('\n')

  const extra = options.instructions.trim()
  const user = [
    extra ? `Extra instructions from the author: ${extra}\n` : '',
    'Transcript:',
    '<transcript>',
    transcript.trim(),
    '</transcript>',
  ].join('\n')

  return { system, user }
}
