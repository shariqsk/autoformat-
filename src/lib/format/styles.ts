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
  guide: string
  /** 0 = keep every word, 3 = full formal rewrite. Drives the offline cleaner. */
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
      'A classic blog post. Open with a short hook paragraph that sets up the topic. Group the ideas into 2–5 sections, each with a descriptive "##" heading. Use short paragraphs (2–4 sentences). Finish with a brief conclusion or takeaway section.',
  },
  {
    id: 'listicle',
    label: 'Listicle',
    emoji: '🔢',
    blurb: 'Numbered takeaways with mini headings.',
    guide:
      'A listicle. One-paragraph intro, then each distinct idea becomes a numbered "### 1. Heading" item with 1–3 sentences of explanation. End with a one-paragraph wrap-up.',
  },
  {
    id: 'howto',
    label: 'How-to guide',
    emoji: '🛠️',
    blurb: 'Intro, prerequisites, numbered steps.',
    guide:
      'A step-by-step tutorial. Start with what the reader will achieve. Add a "## What you need" bullet list only if the speaker mentions prerequisites. Then "## Steps" as a numbered list where each step starts with an imperative verb. Close with "## Tips" or "## Wrapping up" if there is material for it.',
  },
  {
    id: 'essay',
    label: 'Essay',
    emoji: '🖋️',
    blurb: 'Flowing prose, no headings.',
    guide:
      'A flowing personal essay. No headings and no lists. Well-structured paragraphs with clear transitions, a strong opening line and a reflective closing paragraph.',
  },
  {
    id: 'newsletter',
    label: 'Newsletter',
    emoji: '💌',
    blurb: 'Friendly greeting, sections, sign-off.',
    guide:
      'An email newsletter issue. Start with a short friendly greeting line, then a one-paragraph overview, then sections with "##" headings. End with a warm sign-off line.',
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
      'A social media thread. Split into numbered posts ("1/", "2/", …), each a separate paragraph of at most 280 characters. The first post must be a hook. No headings.',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn post',
    emoji: '💼',
    blurb: 'Hook line, airy one-liners, hashtags.',
    guide:
      'A LinkedIn post. Strong one-line hook, then short one- or two-sentence paragraphs separated by blank lines. Optionally a short bullet list of lessons. End with a question to the reader, then 3–5 hashtags on the last line.',
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
    label: 'Verbatim',
    blurb: 'Only fix punctuation & ums.',
    strictness: 0,
    guide:
      'Keep the speaker\'s exact words. Only add punctuation, capitalisation and paragraph breaks, and remove pure filler sounds (um, uh, er). Do not rephrase anything.',
  },
  {
    id: 'natural',
    label: 'My voice',
    blurb: 'Sounds like me, minus the rambling.',
    strictness: 1,
    guide:
      'Keep the speaker\'s personality, vocabulary and humour, but remove verbal tics, false starts and repetition so it reads like they wrote it on a good day.',
  },
  {
    id: 'casual',
    label: 'Casual',
    blurb: 'Friendly and relaxed, slang trimmed.',
    strictness: 1,
    guide:
      'Friendly, conversational and relaxed. Contractions are welcome. Light slang is fine but tone down anything crude or overly bro-ish.',
  },
  {
    id: 'professional',
    label: 'Professional',
    blurb: 'Clear, confident, no slang.',
    strictness: 2,
    guide:
      'Clear, confident and professional. Replace slang and crude language with neutral equivalents, avoid hedging words, keep sentences direct. Suitable for a company blog.',
  },
  {
    id: 'academic',
    label: 'Academic',
    blurb: 'Formal, precise, no contractions.',
    strictness: 3,
    guide:
      'Formal and precise. No contractions, no slang, no rhetorical exclamations. Prefer exact terminology and measured claims.',
  },
  {
    id: 'punchy',
    label: 'Punchy',
    blurb: 'Short, bold, high energy.',
    strictness: 2,
    guide:
      'Punchy and energetic. Short sentences. Strong verbs. Vary rhythm. Cut every word that does not earn its place. No slang that would read as sloppy.',
  },
]

export const LENGTHS: LengthDef[] = [
  { id: 'concise', label: 'Concise', guide: 'Tighten aggressively: aim for roughly half the length of the transcript.' },
  { id: 'balanced', label: 'Balanced', guide: 'Keep all the substance but cut repetition: usually 70–90% of the transcript length.' },
  {
    id: 'detailed',
    label: 'Detailed',
    guide: 'Keep every point and example the speaker made. Smooth transitions are allowed, but do not invent new facts.',
  },
]

export const layoutById = (id: LayoutId): LayoutDef => LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0]
export const toneById = (id: ToneId): ToneDef => TONES.find((t) => t.id === id) ?? TONES[1]
export const lengthById = (id: LengthId): LengthDef => LENGTHS.find((l) => l.id === id) ?? LENGTHS[1]
