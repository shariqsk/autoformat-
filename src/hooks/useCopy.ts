import { useCallback, useState } from 'react'

export function useCopy(resetMs = 1600) {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = useCallback(
    async (text: string, key = 'default') => {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied((c) => (c === key ? null : c)), resetMs)
    },
    [resetMs],
  )
  return { copied, copy }
}

export function downloadText(filename: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
