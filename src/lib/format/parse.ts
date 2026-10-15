import { extractKeywords, stripMarkdown, truncate } from './text'
import type { FormatOptions, FormattedDoc } from './types'

function parseFrontmatterValue(value: string): string {
  return value
    .trim()
    .replace(/^(["'])(.*)\1$/, '$2')
    .trim()
}

function parseTags(value: string, listLines: string[]): string[] {
  const inline = value.trim()
  const items = inline ? inline.replace(/^\[|\]$/g, '').split(',') : listLines.map((l) => l.replace(/^\s*-\s*/, ''))
  return items.map((t) => parseFrontmatterValue(t).replace(/^#/, '').toLowerCase()).filter(Boolean)
}

/**
 * Turn raw LLM output into a FormattedDoc. Small local models are sloppy, so this is lenient:
 * code fences, missing front matter and a duplicated H1 title are all handled.
 */
export function parseModelOutput(raw: string, options: FormatOptions): FormattedDoc {
  let text = raw.trim()
  // Reasoning models sometimes leak their scratchpad.
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  // Chatty preambles: "Here's the rewritten version as a blog post:" / "Sure! ...:"
  text = text.replace(/^(?:here(?:'s| is)|sure|certainly|of course|okay)\b[^\n]*:\s*\n+/i, '').trim()
  const fenced = text.match(/^```(?:markdown|md|mdx)?\s*\n([\s\S]*?)\n```\s*$/i)
  if (fenced) text = fenced[1].trim()

  let title = ''
  let description = ''
  let tags: string[] = []

  const fm = text.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/)
  if (fm) {
    const lines = fm[1].split('\n')
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^(\w+):\s*(.*)$/)
      if (!m) continue
      const [, key, value] = m
      if (key === 'title') title = parseFrontmatterValue(value)
      else if (key === 'description') description = parseFrontmatterValue(value)
      else if (key === 'tags') {
        const listLines: string[] = []
        while (!value.trim() && lines[i + 1]?.match(/^\s*-\s+/)) listLines.push(lines[++i])
        tags = parseTags(value, listLines)
      }
    }
    text = text.slice(fm[0].length).trim()
  }

  // A bare horizontal rule left over after a stripped preamble.
  text = text.replace(/^-{3,}\s*\n+/, '').trim()
  // "**Title:** Something" or "Title: Something" instead of a heading.
  const labelled = text.match(/^(?:\*\*)?title:?(?:\*\*)?:?\s*(.+)\n*/i)
  if (labelled) {
    if (!title) title = labelled[1].replace(/\*\*/g, '').trim()
    text = text.slice(labelled[0].length).trim()
  }
  // Some models bold the title instead of using a heading.
  const bolded = text.match(/^\*\*([^*\n]{3,120})\*\*\s*\n\n/)
  if (bolded && !title) {
    title = bolded[1].trim()
    text = text.slice(bolded[0].length).trim()
  }

  const h1 = text.match(/^#\s+(.+)\n*/)
  if (h1) {
    if (!title) title = h1[1].trim()
    if (h1[1].trim() === title) text = text.slice(h1[0].length).trim()
  }

  const plain = stripMarkdown(text)
  if (!description) description = truncate(plain.split(/\n\n/).find((p) => p.length > 40) ?? plain, 160)
  if (options.includeTags && !tags.length) tags = extractKeywords(plain, 5)

  return {
    title: options.includeTitle ? title.replace(/[.]$/, '') : '',
    description,
    tags: options.includeTags ? tags : [],
    body: text,
  }
}
