import { extendTailwindMerge } from 'tailwind-merge'

// Teach tailwind-merge about the desk's custom font-size utility so it isn't mistaken for a colour.
const merge = extendTailwindMerge({ extend: { classGroups: { 'font-size': ['small-caps'] } } })

/** Join class names, letting later Tailwind utilities override earlier ones (e.g. px-0 beats px-4). */
export function cx(...classes: (string | false | null | undefined)[]) {
  return merge(classes.filter(Boolean).join(' '))
}

export const inputClass =
  'w-full rounded-xl border border-rule bg-paper/70 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 transition-colors focus:border-ink-3 focus:bg-sheet focus:outline-none'
