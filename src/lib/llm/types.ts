import type { LoadProgress } from '../ml/protocol'

export type EngineId = 'instant' | 'browser' | 'ollama' | 'openai' | 'anthropic'

export interface EngineSettings {
  browser: { model: string }
  ollama: { baseUrl: string; model: string }
  openai: { baseUrl: string; apiKey: string; model: string }
  anthropic: { apiKey: string; model: string }
}

export interface GenerateArgs {
  system: string
  user: string
  signal: AbortSignal
  /** Called with each streamed chunk of text. */
  onDelta: (text: string) => void
  onLoading?: (progress: LoadProgress) => void
  /** Hard cap on generated length for on-device models. */
  maxWords?: number
}

export interface EngineInfo {
  id: EngineId
  label: string
  tagline: string
  /** Shown as a badge: does any data leave the machine? */
  privacy: 'on-device' | 'local server' | 'cloud'
  cost: 'free' | 'paid'
}

export const ENGINES: EngineInfo[] = [
  { id: 'instant', label: 'Instant', tagline: 'Rule-based cleanup. No model, no wait.', privacy: 'on-device', cost: 'free' },
  {
    id: 'browser',
    label: 'In-browser AI',
    tagline: 'A small model on your GPU writes the title and headings; every sentence stays yours.',
    privacy: 'on-device',
    cost: 'free',
  },
  { id: 'ollama', label: 'Ollama', tagline: 'Any local model: Llama, Qwen, Gemma, Mistral…', privacy: 'local server', cost: 'free' },
  {
    id: 'openai',
    label: 'OpenAI-compatible',
    tagline: 'LM Studio, Groq, OpenRouter, OpenAI: any /v1 endpoint.',
    privacy: 'cloud',
    cost: 'paid',
  },
  { id: 'anthropic', label: 'Claude', tagline: "Anthropic's Claude models with your own API key.", privacy: 'cloud', cost: 'paid' },
]

export const engineById = (id: EngineId) => ENGINES.find((e) => e.id === id) ?? ENGINES[0]

export const CLAUDE_MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 · best writing quality' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 · fast and sharp' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 · fastest, cheapest' },
]
