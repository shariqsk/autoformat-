export type ThemeId = 'yap' | 'studio' | 'desk' | 'desk-night'

export interface ThemeDef {
  id: ThemeId
  name: string
  vibe: string
  dark: boolean
}

export const THEMES: ThemeDef[] = [
  { id: 'yap', name: 'Yap', vibe: 'Loud, tactile, sticker-book. Ink outlines and chunky shadows.', dark: false },
  { id: 'studio', name: 'Studio', vibe: 'A dark audio plugin with an acid-lime glow.', dark: true },
  { id: 'desk', name: 'Desk', vibe: 'Editorial paper and ink with one on-air red.', dark: false },
  { id: 'desk-night', name: 'Night Desk', vibe: 'The desk after dark.', dark: true },
]

export const DEFAULT_THEME: ThemeId = 'yap'
export const THEME_KEY = 'autoformat:style'

export const isThemeId = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v)
