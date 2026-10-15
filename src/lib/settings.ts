import type { EngineId, EngineSettings } from './llm/types'
import { BROWSER_LLMS, WHISPER_MODELS } from './ml/models'

export type SttEngine = 'whisper' | 'webspeech'

export interface AppSettings {
  sttEngine: SttEngine
  whisperModel: string
  /** BCP-47 tag for live speech, or a Whisper language name. Empty = auto/English. */
  language: string
  engine: EngineId
}

export const DEFAULT_SETTINGS: AppSettings = {
  sttEngine: 'whisper',
  whisperModel: WHISPER_MODELS[1].id,
  language: '',
  engine: 'instant',
}

export const DEFAULT_ENGINE_SETTINGS: EngineSettings = {
  browser: { model: BROWSER_LLMS[0].id },
  ollama: { baseUrl: 'http://localhost:11434', model: 'llama3.2' },
  openai: { baseUrl: 'http://localhost:1234/v1', apiKey: '', model: '' },
  anthropic: { apiKey: '', model: 'claude-opus-5-5' },
}
