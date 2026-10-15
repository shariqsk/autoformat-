import { extendTailwindMerge } from 'tailwind-merge'

// Teach tailwind-merge about the app's own classes so they aren't mistaken for colours or sizes.
const merge = extendTailwindMerge({ extend: { classGroups: { 'font-size': ['small-caps', 'label'] } } })

/** Join class names, letting later Tailwind utilities override earlier ones (e.g. px-0 beats px-4). */
export function cx(...classes: (string | false | null | undefined)[]) {
  return merge(classes.filter(Boolean).join(' '))
}

/** Text inputs: styled per theme by the .field component class. */
export const inputClass = 'field'
