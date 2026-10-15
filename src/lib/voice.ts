import type { Replacement } from './format/cleanup'

/** Everything that makes the output sound like this particular person. Stored locally. */
export interface VoiceProfile {
  /** Words and phrases that must survive every mode ("bro", "lowkey", a product name…). */
  keepWords: string[]
  /** Fixes for words speech recognition keeps getting wrong ("clawed" → "Claude"). */
  replacements: Replacement[]
  /** A few paragraphs the person has written themselves, used as a style reference by AI engines. */
  samples: string
}

export const EMPTY_PROFILE: VoiceProfile = { keepWords: [], replacements: [], samples: '' }

/** Samples are trimmed so they never crowd out the transcript in small context windows. */
export const MAX_SAMPLE_CHARS = 4000
