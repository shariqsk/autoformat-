import { AI_ISM_PROMPT_LIST } from '../analysis/aiisms'
import { EMPTY_PROFILE, MAX_SAMPLE_CHARS, type VoiceProfile } from '../voice'
import { cleanTranscript, type Strictness } from './cleanup'
import { layoutById, lengthById, toneById } from './styles'
import { wordCount } from './text'
import type { FormatOptions } from './types'

export interface Prompt {
  system: string
  user: string
}

/**
 * Run the rule-based cleaner before the model sees the transcript. Less noise in means less
 * noise out, fewer tokens, and far fewer repetition loops from small local models.
 */
export function precleanTranscript(raw: string, strictness: Strictness, keep: string[] = []): string {
  const paragraphs = cleanTranscript(raw, strictness, keep)
  return paragraphs.length ? paragraphs.map((p) => p.join(' ')).join('\n\n') : raw.trim()
}

const LENGTH_FACTOR = { concise: 0.5, balanced: 0.85, detailed: 1 } as const

/** Rough output word budget for a transcript, used to stop small models from padding. */
export function targetWords(transcript: string, options: FormatOptions): number {
  return Math.max(40, Math.round((wordCount(transcript) * LENGTH_FACTOR[options.length]) / 10) * 10)
}

const VOICE_RULES = [
  "Work from the speaker's own sentences. Prefer deleting filler and fixing grammar over rephrasing. Keep their vocabulary, idioms, humour, opinions, rhythm and first-person voice.",
  'Never add ideas, examples, statistics, transitions, summaries or conclusions the speaker did not say.',
  "Headings and list items should reuse the speaker's own words where possible.",
  `It must not read like AI wrote it. Never use: ${AI_ISM_PROMPT_LIST.join(', ')}. Avoid em dashes unless the speaker clearly paused for effect. No rhetorical sign-offs.`,
  'When a word was clearly misheard by speech recognition, use the word the speaker obviously meant.',
]

/** Build the instructions handed to whichever LLM engine is selected. */
export function buildPrompt(
  transcript: string,
  options: FormatOptions,
  { compact = false, profile = EMPTY_PROFILE }: { compact?: boolean; profile?: VoiceProfile } = {},
): Prompt {
  const layout = layoutById(options.layout)
  const tone = toneById(options.tone)
  const length = lengthById(options.length)
  const extra = options.instructions.trim()
  const keep = profile.keepWords.filter((w) => w.trim())
  const keepLine = keep.length ? `Always keep these words exactly as spoken: ${keep.join(', ')}.` : null
  const samples = profile.samples.trim().slice(0, MAX_SAMPLE_CHARS)

  if (compact) {
    // Sub-2B models follow short, concrete instructions far better than long rule lists, and pad
    // relentlessly unless given an explicit word budget.
    const budget = targetWords(transcript, options)
    const system = [
      `You turn a voice transcript into a ${layout.label.toLowerCase()} while keeping the speaker's exact voice. ${layout.guide}`,
      `Editing level: ${tone.guide}`,
      `Write about ${budget} words. Reuse the speaker's own sentences; every sentence must come from something they said.`,
      'Do not add greetings, new ideas or a conclusion. Do not repeat sentences.',
      keepLine,
      options.includeTitle ? 'Start with a title line formatted as "# Title".' : 'Do not add a title.',
      options.includeSummary ? 'After the title, add a one-sentence summary starting with "> **TL;DR:**".' : null,
      'Start directly with the content: no preamble such as "Here is". Reply with Markdown only.',
    ]
      .filter(Boolean)
      .join('\n')
    const user = `${extra ? `${extra}\n\n` : ''}Transcript:\n${transcript.trim()}`
    return { system, user }
  }

  const metadata = [
    options.includeTitle ? "title: a specific title in the speaker's own words where possible (no clickbait, no trailing period)" : null,
    "description: one sentence (max 160 characters) summarising the piece in the speaker's voice",
    options.includeTags ? 'tags: 3–6 short lowercase topic tags, as a YAML list like [one, two]' : null,
  ].filter(Boolean)

  const system = [
    'You are a copy editor for a writer who dictates instead of typing. Your job is to make their spoken words readable while keeping them unmistakably theirs: the finished piece must sound like they wrote it themselves, not like an AI rewrote it.',
    '',
    'Voice rules (most important):',
    ...VOICE_RULES.map((r) => `- ${r}`),
    keepLine ? `- ${keepLine}` : null,
    '',
    `Editing level (${tone.label}): ${tone.guide}`,
    `Layout (${layout.label}): ${layout.guide}`,
    `Length (${length.label}): ${length.guide}`,
    options.includeSummary
      ? 'Begin the body with a one- or two-sentence summary in the speaker\'s voice, formatted as a blockquote starting with "**TL;DR:**".'
      : null,
    samples
      ? `\nHere is writing the author typed themselves. Match its voice, word choice and sentence rhythm (do not reuse its content):\n<writing_samples>\n${samples}\n</writing_samples>`
      : null,
    '',
    'Output GitHub-flavoured Markdown only, with no commentary before or after and no code fences around the document.',
    'Start with YAML front matter, then the body:',
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
