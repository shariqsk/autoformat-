export type LayoutId = 'blog' | 'listicle' | 'howto' | 'essay' | 'newsletter' | 'qa' | 'thread' | 'linkedin' | 'notes' | 'journal'

/** How much of the raw speech survives. Every mode keeps the speaker's voice. */
export type ToneId = 'verbatim' | 'raw' | 'polished' | 'formal'

export type LengthId = 'concise' | 'balanced' | 'detailed'

export interface FormatOptions {
  layout: LayoutId
  tone: ToneId
  length: LengthId
  includeTitle: boolean
  includeSummary: boolean
  includeTags: boolean
  /** Free-form guidance, e.g. "audience is junior devs" or "mention my newsletter at the end". */
  instructions: string
}

/** A formatted piece of writing, independent of any export format. */
export interface FormattedDoc {
  title: string
  description: string
  tags: string[]
  /** Markdown body, without the top-level title heading. */
  body: string
}

export const DEFAULT_OPTIONS: FormatOptions = {
  layout: 'blog',
  tone: 'raw',
  length: 'balanced',
  includeTitle: true,
  includeSummary: false,
  includeTags: true,
  instructions: '',
}
