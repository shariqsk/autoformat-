import { useEffect, useState } from 'react'

/** useState backed by localStorage. Stored objects are shallow-merged over the default to survive schema additions. */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return initial
      const parsed = JSON.parse(raw) as T
      if (initial && typeof initial === 'object' && !Array.isArray(initial)) return { ...initial, ...parsed }
      return parsed
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* storage full or disabled — keep working in memory */
    }
  }, [key, value])
  return [value, setValue] as const
}
