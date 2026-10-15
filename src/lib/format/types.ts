export type LayoutId =
  | 'blog'
  | 'listicle'
  | 'howto'
  | 'essay'
  | 'newsletter'
  | 'qa'
  | 'thread'
  | 'linkedin'
  | 'notes'
  | 'journal'

export type ToneId = 'verbatim' | 'natural' | 'casual' | 'professional' | 'academic' | 'punchy'

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
  tone: 'natural',
  length: 'balanced',
  includeTitle: true,
  includeSummary: false,
  includeTags: true,
  instructions: '',
}
