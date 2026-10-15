import { describe, expect, it } from 'vitest'
import type { FormattedDoc } from '../format/types'
import { EXPORT_FORMATS, exportFilename, exportFormatById, toAgentBrief, toHtmlFragment, toHtmlPage, toJson, toMarkdown, toPlainText } from './formats'

const doc: FormattedDoc = {
  title: 'Talking Is "the New" Typing',
  description: 'Why I stopped typing my blog posts.',
  tags: ['voice', 'writing'],
  body: 'I hate typing.\n\n## The fix\n\n- Talk\n- **Format**\n\n> quote',
}
const ctx = { createdAt: new Date('2026-10-15T09:00:00Z'), layout: 'blog' as const, tone: 'raw' as const }

describe('exporters', () => {
  it('writes markdown with escaped YAML front matter', () => {
    const md = toMarkdown(doc, ctx)
    expect(md).toContain('title: "Talking Is \\"the New\\" Typing"')
    expect(md).toContain('date: 2026-10-15')
    expect(md).toContain('tags: ["voice", "writing"]')
    expect(md).toContain('slug: talking-is-the-new-typing')
    expect(md).toContain('# Talking Is "the New" Typing\n\nI hate typing.')
    expect(toMarkdown(doc, ctx, { frontmatter: false }).startsWith('# ')).toBe(true)
  })

  it('renders an HTML fragment with an escaped title', () => {
    const html = toHtmlFragment(doc)
    expect(html).toContain('<h1>Talking Is &quot;the New&quot; Typing</h1>')
    expect(html).toContain('<h2>The fix</h2>')
    expect(html).toContain('<strong>Format</strong>')
  })

  it('renders a standalone page with meta tags', () => {
    const page = toHtmlPage(doc, ctx)
    expect(page.startsWith('<!doctype html>')).toBe(true)
    expect(page).toContain('<meta name="description" content="Why I stopped typing my blog posts." />')
    expect(page).toContain('1 min read')
  })

  it('flattens markdown to plain text', () => {
    const text = toPlainText(doc)
    expect(text).not.toMatch(/[#*>]/)
    expect(text).toContain('THE FIX')
  })

  it('emits a parseable JSON payload', () => {
    const json = JSON.parse(toJson(doc, ctx))
    expect(json).toMatchObject({ slug: 'talking-is-the-new-typing', tags: ['voice', 'writing'], style: { layout: 'blog' } })
    expect(json.html).toContain('<li>Talk</li>')
  })

  it('builds an agent brief that embeds the post', () => {
    const brief = toAgentBrief(doc, ctx)
    expect(brief).toContain('# Task: publish a new blog post')
    expect(brief).toContain('`talking-is-the-new-typing`')
    expect(brief).toContain('````markdown\n# Talking Is "the New" Typing')
  })

  it('names files from the title', () => {
    expect(exportFilename(doc, exportFormatById('markdown'))).toBe('talking-is-the-new-typing.md')
    expect(exportFilename(doc, exportFormatById('agent'))).toBe('talking-is-the-new-typing.agent-brief.md')
    expect(exportFilename({ ...doc, title: '', description: '' }, exportFormatById('json'))).toBe('autoformat-post.json')
  })

  it('every format renders something', () => {
    for (const f of EXPORT_FORMATS) expect(f.render(doc, ctx).length, f.id).toBeGreaterThan(20)
  })
})
