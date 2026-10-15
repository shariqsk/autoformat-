export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export const inputClass =
  'w-full rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/60 focus:outline-none focus:ring-2 focus:ring-violet-500/20'
