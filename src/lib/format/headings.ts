// "Your words, AI headings": a small model only names things. The body text is the speaker's own
// sentences (cleaned by the rule engine), so voice fidelity is guaranteed even with a 1B model.

import type { Prompt } from './prompt'
import { stripMarkdown } from './text'

export interface Section {
  /** Line index of the heading in the markdown. */
  line: number
  /** "## " / "### " marker plus any "3. " list numbering, kept as-is when renaming. */
  prefix: string
  heading: string
  /** Opening words of the section, for the model to read. */
  excerpt: string
}

const HEADING = /^(#{2,3}\s+(?:\d+\.\s+)?)(.+)$/

export function extractSections(markdown: string, excerptWords = 50): Section[] {
  const lines = markdown.split('\n')
  const sections: Section[] = []
  lines.forEach((line, i) => {
    const m = line.match(HEADING)
    if (!m) return
    const body: string[] = []
    for (let j = i + 1; j < lines.length && !HEADING.test(lines[j]); j++) body.push(lines[j])
    const words = stripMarkdown(body.join(' ')).split(/\s+/).filter(Boolean)
    sections.push({
      line: i,
      prefix: m[1],
      heading: m[2],
      excerpt: words.slice(0, excerptWords).join(' ') + (words.length > excerptWords ? '…' : ''),
    })
  })
  return sections
}

export function buildHeadingPrompt(sections: Section[], opening: string, wantTitle: boolean): Prompt {
  const system = [
    'You name the sections of a blog post someone else wrote. Never rewrite their text; you only write names.',
    "Each name is 2 to 7 words, plain and specific, using the author's own words where possible. No clickbait, no colons, no emoji.",
    'Reply in exactly this format and nothing else:',
    wantTitle ? 'TITLE: <title for the whole post>' : null,
    ...sections.map((_, i) => `${i + 1}: <name for section ${i + 1}>`),
  ]
    .filter(Boolean)
    .join('\n')
  const user = [`Opening of the post: ${opening}`, '', ...sections.map((s, i) => `Section ${i + 1}: ${s.excerpt}`)].join('\n')
  return { system, user }
}

export interface HeadingPlan {
  title: string | null
  headings: Map<number, string>
}

const tidy = (s: string) => s.replace(/^["'“”*_#\s]+|["'“”*_.:;\s]+$/g, '').trim()

export function parseHeadingPlan(text: string): HeadingPlan {
  const plan: HeadingPlan = { title: null, headings: new Map() }
  for (const line of text.split('\n')) {
    const title = line.match(/^\s*\**title\**\s*:\s*(.+)$/i)
    if (title) {
      plan.title = tidy(title[1]) || null
      continue
    }
    const numbered = line.match(/^\s*(?:section\s*)?(\d{1,2})\s*[:.)-]\s*(.+)$/i)
    if (numbered) {
      const name = tidy(numbered[2])
      if (name && name.split(/\s+/).length <= 12) plan.headings.set(Number(numbered[1]) - 1, name)
    }
  }
  return plan
}

/** Swap in the planned names, keeping heading levels and list numbering. Unplanned headings stay. */
export function applyHeadingPlan(markdown: string, sections: Section[], plan: HeadingPlan): string {
  const lines = markdown.split('\n')
  sections.forEach((s, i) => {
    const name = plan.headings.get(i)
    if (name) lines[s.line] = `${s.prefix}${name}`
  })
  return lines.join('\n')
}
