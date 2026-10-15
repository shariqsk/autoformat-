import { marked } from 'marked'
import { layoutById, toneById } from '../format/styles'
import { slugify, stripMarkdown, wordCount } from '../format/text'
import type { FormattedDoc, LayoutId, ToneId } from '../format/types'

export interface ExportContext {
  createdAt: Date
  layout: LayoutId
  tone: ToneId
}

export type ExportFormatId = 'markdown' | 'html' | 'html-page' | 'text' | 'json' | 'agent'

export interface ExportFormat {
  id: ExportFormatId
  label: string
  hint: string
  extension: string
  mime: string
  /** Syntax used for the code view. */
  language: 'markdown' | 'html' | 'text' | 'json'
  render: (doc: FormattedDoc, ctx: ExportContext) => string
}

const yamlString = (value: string) => JSON.stringify(value)
const isoDate = (d: Date) => d.toISOString().slice(0, 10)

export const readingMinutes = (doc: FormattedDoc) => Math.max(1, Math.round(wordCount(stripMarkdown(doc.body)) / 225))

export function toMarkdown(doc: FormattedDoc, ctx: ExportContext, { frontmatter = true } = {}): string {
  const parts: string[] = []
  if (frontmatter) {
    const fm = ['---']
    if (doc.title) fm.push(`title: ${yamlString(doc.title)}`)
    fm.push(`date: ${isoDate(ctx.createdAt)}`)
    if (doc.description) fm.push(`description: ${yamlString(doc.description)}`)
    if (doc.tags.length) fm.push(`tags: [${doc.tags.map(yamlString).join(', ')}]`)
    if (doc.title) fm.push(`slug: ${slugify(doc.title)}`)
    fm.push('---')
    parts.push(fm.join('\n'))
  }
  if (doc.title) parts.push(`# ${doc.title}`)
  parts.push(doc.body.trim())
  return `${parts.join('\n\n')}\n`
}

/** HTML for the body (and title), ready to paste into a CMS. Not sanitised: sanitise before injecting into a DOM. */
export function toHtmlFragment(doc: FormattedDoc): string {
  const title = doc.title ? `<h1>${escapeHtml(doc.title)}</h1>\n` : ''
  return `${title}${marked.parse(doc.body.trim(), { async: false, gfm: true })}`.trim()
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export function toHtmlPage(doc: FormattedDoc, ctx: ExportContext): string {
  const title = escapeHtml(doc.title || 'Untitled')
  const tags = doc.tags.length
    ? `\n    <ul class="tags">${doc.tags.map((t) => `<li>#${escapeHtml(t)}</li>`).join('')}</ul>`
    : ''
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${escapeHtml(doc.description)}" />
    <meta name="keywords" content="${escapeHtml(doc.tags.join(', '))}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${escapeHtml(doc.description)}" />
    <style>
      :root { color-scheme: light dark; --fg: #1f2328; --muted: #656d76; --accent: #7c3aed; --bg: #fff; }
      @media (prefers-color-scheme: dark) { :root { --fg: #e6edf3; --muted: #9198a1; --accent: #a78bfa; --bg: #0d1117; } }
      body { margin: 0; background: var(--bg); color: var(--fg); font: 18px/1.7 Georgia, 'Iowan Old Style', serif; }
      article { max-width: 680px; margin: 0 auto; padding: 64px 24px; }
      h1, h2, h3 { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; line-height: 1.25; }
      h1 { font-size: 2.4rem; margin: 0 0 .5rem; }
      .meta { color: var(--muted); font: 14px system-ui, sans-serif; margin-bottom: 2.5rem; }
      a { color: var(--accent); }
      blockquote { margin: 1.5rem 0; padding: .25rem 1.25rem; border-left: 4px solid var(--accent); color: var(--muted); }
      code { font-size: .9em; }
      .tags { list-style: none; padding: 0; display: flex; gap: .5rem; flex-wrap: wrap; font: 14px system-ui, sans-serif; }
      .tags li { color: var(--accent); }
    </style>
  </head>
  <body>
    <article>
      ${doc.title ? `<h1>${title}</h1>` : ''}
      <p class="meta">${ctx.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · ${readingMinutes(doc)} min read</p>
      ${marked.parse(doc.body.trim(), { async: false, gfm: true }).trim()}${tags}
    </article>
  </body>
</html>
`
}

export function toPlainText(doc: FormattedDoc): string {
  return `${[doc.title, stripMarkdown(doc.body)].filter(Boolean).join('\n\n')}\n`
}

export function toJson(doc: FormattedDoc, ctx: ExportContext): string {
  const payload = {
    title: doc.title,
    slug: slugify(doc.title || doc.description),
    description: doc.description,
    tags: doc.tags,
    date: ctx.createdAt.toISOString(),
    readingMinutes: readingMinutes(doc),
    wordCount: wordCount(stripMarkdown(doc.body)),
    style: { layout: ctx.layout, tone: ctx.tone },
    markdown: doc.body.trim(),
    html: marked.parse(doc.body.trim(), { async: false, gfm: true }).trim(),
  }
  return `${JSON.stringify(payload, null, 2)}\n`
}

/** A self-contained brief you can paste straight into a coding agent that maintains your blog. */
export function toAgentBrief(doc: FormattedDoc, ctx: ExportContext): string {
  const slug = slugify(doc.title || doc.description)
  return `# Task: publish a new blog post

Please add the post below to my blog.

1. Follow the existing conventions in the repository (content folder, file naming, front matter fields, components). If the blog uses MDX, a CMS, or a database instead of Markdown files, adapt accordingly.
2. Use the slug \`${slug}\` unless that clashes with an existing post.
3. Map the metadata below onto whatever front matter the blog already uses. Don't invent fields that aren't used elsewhere.
4. Keep the wording of the post exactly as written — only adjust formatting if the blog's renderer requires it.
5. Run the blog's build or lint step to make sure nothing breaks, then summarise what you changed.

## Metadata

| Field | Value |
| --- | --- |
| Title | ${doc.title || '_(choose one based on the content)_'} |
| Slug | \`${slug}\` |
| Date | ${isoDate(ctx.createdAt)} |
| Description | ${doc.description.replace(/\|/g, '\\|')} |
| Tags | ${doc.tags.join(', ') || '_(none)_'} |
| Style | ${layoutById(ctx.layout).label}, ${toneById(ctx.tone).label.toLowerCase()} tone |
| Reading time | ~${readingMinutes(doc)} min |

## Post content (Markdown)

\`\`\`\`markdown
${toMarkdown(doc, ctx, { frontmatter: false }).trim()}
\`\`\`\`
`
}

export const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'markdown',
    label: 'Markdown',
    hint: 'With YAML front matter — drop into Astro, Next.js, Hugo, Jekyll…',
    extension: 'md',
    mime: 'text/markdown',
    language: 'markdown',
    render: (doc, ctx) => toMarkdown(doc, ctx),
  },
  {
    id: 'html',
    label: 'HTML',
    hint: 'Clean HTML fragment for WordPress, Ghost, Substack or any CMS.',
    extension: 'html',
    mime: 'text/html',
    language: 'html',
    render: (doc) => `${toHtmlFragment(doc)}\n`,
  },
  {
    id: 'html-page',
    label: 'Web page',
    hint: 'Standalone, styled HTML page with SEO meta tags.',
    extension: 'html',
    mime: 'text/html',
    language: 'html',
    render: toHtmlPage,
  },
  {
    id: 'text',
    label: 'Plain text',
    hint: 'No formatting — for emails, notes or social posts.',
    extension: 'txt',
    mime: 'text/plain',
    language: 'text',
    render: (doc) => toPlainText(doc),
  },
  {
    id: 'json',
    label: 'JSON',
    hint: 'Structured payload (metadata + markdown + html) for APIs and headless CMSs.',
    extension: 'json',
    mime: 'application/json',
    language: 'json',
    render: toJson,
  },
  {
    id: 'agent',
    label: 'Agent brief',
    hint: 'Paste into Claude Code / Cursor / any coding agent to publish it on your blog.',
    extension: 'md',
    mime: 'text/markdown',
    language: 'markdown',
    render: toAgentBrief,
  },
]

export const exportFormatById = (id: ExportFormatId) => EXPORT_FORMATS.find((f) => f.id === id) ?? EXPORT_FORMATS[0]

export function exportFilename(doc: FormattedDoc, format: ExportFormat): string {
  const base = slugify(doc.title || doc.description || 'autoformat-post')
  return format.id === 'agent' ? `${base}.agent-brief.md` : `${base}.${format.extension}`
}
