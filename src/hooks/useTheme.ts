import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_THEME, isThemeId, THEME_KEY, THEMES, type ThemeId } from '../lib/themes'

function initialTheme(): ThemeId {
  const saved = localStorage.getItem(THEME_KEY)
  return isThemeId(saved) ? saved : DEFAULT_THEME
}

/** The app's look. Applied as data-theme on <html>; every token in styles/themes.css keys off it. */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(initialTheme)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    const paper = getComputedStyle(root).getPropertyValue('--paper').trim()
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', paper)
  }, [theme])

  const setTheme = useCallback((next: ThemeId) => {
    localStorage.setItem(THEME_KEY, next)
    setThemeState(next)
  }, [])

  /** Step to the next look (⌘.). */
  const cycle = useCallback(() => {
    setThemeState((current) => {
      const next = THEMES[(THEMES.findIndex((t) => t.id === current) + 1) % THEMES.length].id
      localStorage.setItem(THEME_KEY, next)
      return next
    })
  }, [])

  return { theme, setTheme, cycle }
}
