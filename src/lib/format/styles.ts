import type { LayoutId, LengthId, ToneId } from './types'

export interface LayoutDef {
  id: LayoutId
  label: string
  emoji: string
  blurb: string
  /** Instructions handed to an LLM describing the structure to produce. */
  guide: string
}

export interface ToneDef {
  id: ToneId
  label: string
  blurb: string
  /** Shown in the picker so people can see what each mode does to a sentence. */
  example: string
  guide: string
  /** 0 = keep every word, 3 = a few formal word swaps. Drives the offline cleaner. */
  strictness: 0 | 1 | 2 | 3
}

export interface LengthDef {
  id: LengthId
  label: string
  guide: string
}

export const LAYOUTS: LayoutDef[] = [
  {
    id: 'blog',
    label: 'Blog post',
    emoji: '📝',
    blurb: 'Hook intro, H2 sections, clean wrap-up.',
    guide:
      'A classic blog post. Open with the speaker\'s own opening as the intro. Group what they said into sections with "##" headings (use as many as the material naturally has, often 2–4). Short paragraphs. End where the speaker ended; don\'t add a conclusion they didn\'t give.',
  },
  {
    id: 'listicle',
    label: 'Listicle',
    emoji: '🔢',
    blurb: 'Numbered takeaways with mini headings.',
    guide:
      'A listicle. A short intro from the speaker\'s opening, then each distinct point they made becomes a numbered "### 1. Heading" item followed by their explanation. Only add a wrap-up if they gave one.',
  },
  {
    id: 'howto',
    label: 'How-to guide',
    emoji: '🛠️',
    blurb: 'Intro, prerequisites, numbered steps.',
    guide:
      'A step-by-step tutorial. Start with the speaker\'s own framing of what this is for. Add "## What you need" only if they mention prerequisites. Then "## Steps" as a numbered list in the order they described. Add "## Tips" only for advice they actually gave.',
  },
  {
    id: 'essay',
    label: 'Essay',
    emoji: '🖋️',
    blurb: 'Flowing prose, no headings.',
    guide:
      'A flowing personal essay. No headings and no lists. Well-formed paragraphs in the order the speaker said things; transitions only where they are needed to make sense.',
  },
  {
    id: 'newsletter',
    label: 'Newsletter',
    emoji: '💌',
    blurb: 'Friendly greeting, sections, sign-off.',
    guide:
      'An email newsletter issue. A short greeting in the speaker\'s own style, then their content in sections with "##" headings, then a one-line sign-off in their style.',
  },
  {
    id: 'qa',
    label: 'Q&A',
    emoji: '💬',
    blurb: 'Questions as headings, crisp answers.',
    guide:
      'A Q&A / FAQ. Identify the questions the speaker raises or implicitly answers. Render each as a "### Question?" heading followed by a direct answer paragraph.',
  },
  {
    id: 'thread',
    label: 'X / Threads',
    emoji: '🧵',
    blurb: 'Numbered posts, each under 280 chars.',
    guide:
      'A social media thread. Split into numbered posts ("1/", "2/", …), each a separate paragraph of at most 280 characters. Lead with the speaker\'s most gripping line. No headings.',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn post',
    emoji: '💼',
    blurb: 'Hook line, airy one-liners, hashtags.',
    guide:
      'A LinkedIn post. The speaker\'s strongest line first as the hook, then short one- or two-sentence paragraphs separated by blank lines. If they asked the audience something, end with it. 3–5 hashtags on the last line.',
  },
  {
    id: 'notes',
    label: 'Notes / outline',
    emoji: '🗂️',
    blurb: 'Bulleted outline grouped by topic.',
    guide:
      'Structured notes. Group points under "##" topic headings, with concise nested bullet points. Keep the speaker\'s key phrases. No long prose.',
  },
  {
    id: 'journal',
    label: 'Journal entry',
    emoji: '📔',
    blurb: 'Personal, first-person, lightly tidied.',
    guide:
      'A personal journal entry written in the first person. Plain paragraphs, no headings, keep it intimate and reflective.',
  },
]

export const TONES: ToneDef[] = [
  {
    id: 'verbatim',
    label: 'Word for word',
    blurb: 'Every word you said. Just punctuation, paragraphs and the ums gone.',
    strictness: 0,
    example: "Yeah bro, honestly it's kinda crazy how good it's gotten, lol.",
    guide:
      'Do not change, add, reorder or remove any words except pure filler sounds (um, uh, er) and stuttered repeats. Only add punctuation, capitalisation and paragraph breaks.',
  },
  {
    id: 'raw',
    label: 'No filter',
    blurb: 'Still 100% you. Slang, jokes and swearing stay; only the stumbles go.',
    strictness: 1,
    example: "Bro, honestly it's kinda crazy how good it's gotten, lol.",
    guide:
      'Fix the flow only: remove false starts, repeated words, verbal tics ("you know", "like", "I mean", "so yeah") and turn run-ons into sentences. Keep every word choice, slang term, swear word, joke and aside. Do not swap words for "better" ones.',
  },
  {
    id: 'polished',
    label: 'Polished',
    blurb: 'You on a good day. Tighter, cleaner, nothing crude.',
    strictness: 2,
    example: "Bro, honestly it's kinda crazy how good it's gotten.",
    guide:
      'Everything in "fix the flow", plus: tighten rambling passages by cutting repetition, and drop crude bits ("lol", "fucking", "holy shit") where they add nothing. Keep the speaker\'s vocabulary, contractions, humour and rhythm. Do not rephrase sentences that already work.',
  },
  {
    id: 'formal',
    label: 'Formal',
    blurb: 'You in a blazer. A few words swapped, same person talking.',
    strictness: 3,
    example: "Honestly, it's a bit crazy how good it's gotten.",
    guide:
      'Everything in "polished", plus: swap slang and crude words for neutral equivalents ("gonna" → "going to", "kinda" → "a bit", drop "bro"/"dude"). Keep contractions, first person, opinions, sentence structure and personality. This should read like the same person writing for work, not like a corporate press release.',
  },
]

/** Older drafts used different tone ids; map them onto the current voice modes. */
export function normalizeToneId(id: string): ToneId {
  if (TONES.some((t) => t.id === id)) return id as ToneId
  if (id === 'professional' || id === 'punchy') return 'polished'
  if (id === 'academic') return 'formal'
  return 'raw'
}

export const LENGTHS: LengthDef[] = [
  { id: 'concise', label: 'Tight', guide: 'Cut tangents, asides and repetition, aiming for roughly half the length. What remains should still be the speaker\'s own sentences.' },
  { id: 'balanced', label: 'Balanced', guide: 'Keep everything of substance; remove only noise and repetition.' },
  { id: 'detailed', label: 'Everything', guide: 'Keep every point, aside and example the speaker made, in their order.' },
]

export const layoutById = (id: LayoutId): LayoutDef => LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0]
export const toneById = (id: ToneId | string): ToneDef => TONES.find((t) => t.id === normalizeToneId(id)) ?? TONES[1]
export const lengthById = (id: LengthId): LengthDef => LENGTHS.find((l) => l.id === id) ?? LENGTHS[1]
