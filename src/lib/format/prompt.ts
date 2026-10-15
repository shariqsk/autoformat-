import { cleanTranscript, type Strictness } from './cleanup'
import { layoutById, lengthById, toneById } from './styles'
import type { FormatOptions } from './types'

export interface Prompt {
  system: string
  user: string
}

/**
 * Run the rule-based cleaner before the model sees the transcript. Less noise in means less
 * noise out, fewer tokens, and far fewer repetition loops from small local models.
 */
export function precleanTranscript(raw: string, strictness: Strictness): string {
  const paragraphs = cleanTranscript(raw, strictness)
  return paragraphs.length ? paragraphs.map((p) => p.join(' ')).join('\n\n') : raw.trim()
}

/** Build the instructions handed to whichever LLM engine is selected. */
export function buildPrompt(transcript: string, options: FormatOptions, { compact = false } = {}): Prompt {
  const layout = layoutById(options.layout)
  const tone = toneById(options.tone)
  const length = lengthById(options.length)
  const extra = options.instructions.trim()

  if (compact) {
    // Sub-2B models follow short, concrete instructions far better than long rule lists.
    const system = [
      `You rewrite voice transcripts into a ${layout.label.toLowerCase()}. ${layout.guide}`,
      `Tone: ${tone.guide}`,
      'Keep the speaker\'s meaning and facts. Do not add new information. Do not repeat sentences.',
      options.includeTitle ? 'Start with a title line formatted as "# Title".' : 'Do not add a title.',
      options.includeSummary ? 'After the title, add a one-sentence summary starting with "> **TL;DR:**".' : null,
      'Reply with Markdown only.',
    ]
      .filter(Boolean)
      .join('\n')
    const user = `${extra ? `${extra}\n\n` : ''}Transcript:\n${transcript.trim()}`
    return { system, user }
  }

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

  const user = [
    extra ? `Extra instructions from the author: ${extra}\n` : '',
    'Transcript:',
    '<transcript>',
    transcript.trim(),
    '</transcript>',
  ].join('\n')

  return { system, user }
}
