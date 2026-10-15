// Small, dependency-free text helpers shared by the offline formatter and exporters.

const STOPWORDS = new Set(
  `a about above actually after again against all almost also although always am an and another any anyone anything anyway
  are aren around as at away back basically be because been before being below between both bro but by came can cannot
  could couldn did didn do does doesn doing don done down dude during each else even ever every everything few first for
  from further get gets getting go goes going gonna good got gotta guess had hadn has hasn have haven having he her here
  hers herself him himself his honestly how however i if im in into is isn it its itself just kind kinda know last least
  let lets like literally lot lots made make makes making many maybe me mean might more most much must my myself need
  needs never new next no nor not nothing now of off often oh ok okay on once one only or other others our ours
  ourselves out over own pretty probably put quite rather really right said same saw say saying says see seem seems
  she should shouldn since so some something sometimes sort still stuff such sure take than that thats the their
  theirs them themselves then there these they thing things think this those though thought through to today too
  totally took toward try trying um uh under until up upon us use used using very want wanna wants was wasn way we
  well went were weren what whatever when where whether which while who whole whom why will with within without won
  would wouldn yeah yes yet you your yours yourself yourselves talk talking essentially honestly remarkable somewhat started start gotten able bucks dollars five ten twenty hundred thousand three four catch wow furthermore moreover sentence sentences minute minutes thing`
    .split(/\s+/)
    .filter(Boolean),
)

export const isStopword = (word: string): boolean => STOPWORDS.has(word.toLowerCase())

export function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z][a-z0-9'-]*/g) ?? []
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

/** Term frequencies of meaningful words (stopwords and very short words removed, simple plural folding). */
export function termFrequencies(text: string): Map<string, number> {
  const freq = new Map<string, number>()
  for (const raw of words(text)) {
    let w = raw.replace(/'s$/, '').replace(/'/g, '')
    if (w.length < 4 || isStopword(w)) continue
    if (w.endsWith('ies') && w.length > 5) w = `${w.slice(0, -3)}y`
    else if (w.endsWith('s') && !w.endsWith('ss') && w.length > 4) w = w.slice(0, -1)
    freq.set(w, (freq.get(w) ?? 0) + 1)
  }
  return freq
}

export function extractKeywords(text: string, limit = 5): string[] {
  return [...termFrequencies(text).entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([w]) => w)
}

const SMALL_WORDS = new Set('a an and as at but by for in nor of on or per the to vs via with from into'.split(' '))

export function titleCase(text: string): string {
  return text
    .split(/(\s+)/)
    .map((part, i, all) => {
      if (/^\s+$/.test(part) || !part) return part
      const isEdge = i === 0 || i === all.length - 1
      if (!isEdge && SMALL_WORDS.has(part.toLowerCase())) return part.toLowerCase()
      // Leave acronyms / mixed-case words (e.g. "API", "iPhone") alone.
      if (/[A-Z]/.test(part.slice(1))) return part
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join('')
}

export function capitalize(text: string): string {
  const i = text.search(/[A-Za-z]/)
  if (i < 0) return text
  return text.slice(0, i) + text.charAt(i).toUpperCase() + text.slice(i + 1)
}

export function slugify(text: string): string {
  return (
    text
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .replace(/-+$/, '') || 'untitled'
  )
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.-]+$/, '')}…`
}

/** Convert Markdown into readable plain text (headings, emphasis, links and code fences flattened). */
export function stripMarkdown(md: string, { upperHeadings = true } = {}): string {
  return md
    .replace(/```[^\n]*\n([\s\S]*?)```/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+(.*)$/gm, (_, h: string) => (upperHeadings ? h.toUpperCase() : h))
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(^|[^*\w])[*_]([^*_\n]+)[*_](?=[^*\w]|$)/g, '$1$2')
    .replace(/^-{3,}$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
