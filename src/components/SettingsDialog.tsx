import { KeyRound, Loader2, RefreshCw, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { listOllamaModels } from '../lib/llm/ollama'
import { listOpenAiModels } from '../lib/llm/openai'
import { CLAUDE_MODELS, type EngineSettings } from '../lib/llm/types'
import { hasWebGpu } from '../lib/ml/client'
import { BROWSER_LLMS, WHISPER_MODELS, type ModelOption } from '../lib/ml/models'
import type { AppSettings } from '../lib/settings'
import { cx, inputClass } from './classes'
import { Badge, Button, Field } from './ui'

const OPENAI_PRESETS = [
  { label: 'LM Studio', baseUrl: 'http://localhost:1234/v1' },
  { label: 'llama.cpp', baseUrl: 'http://localhost:8080/v1' },
  { label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1' },
  { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
  { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
]

function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-white/5 pt-6 first:border-0 first:pt-0">
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function ModelPicker({ models, value, onChange }: { models: ModelOption[]; value: string; onChange: (id: string) => void }) {
  const gpu = hasWebGpu()
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {models.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(m.id)}
          aria-pressed={value === m.id}
          className={cx(
            'rounded-xl border px-3 py-2.5 text-left transition-colors',
            value === m.id ? 'border-violet-500/60 bg-violet-500/10' : 'border-white/10 bg-zinc-950/40 hover:border-white/20',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-zinc-100">{m.label}</span>
            <span className="text-[11px] text-zinc-500">{m.size}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
            {m.note}
            {m.needsGpu && <Badge tone={gpu ? 'violet' : 'amber'}>{gpu ? 'WebGPU' : 'slow without WebGPU'}</Badge>}
          </div>
        </button>
      ))}
    </div>
  )
}

function ModelListInput({
  value,
  onChange,
  load,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  load: () => Promise<string[]>
  placeholder: string
}) {
  const [models, setModels] = useState<string[]>([])
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')
  const refresh = async () => {
    setState('loading')
    try {
      setModels(await load())
      setState('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setState('error')
    }
  }
  const listId = `models-${placeholder.replace(/\W/g, '')}`
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} list={listId} aria-label="Model" className={inputClass} />
        <datalist id={listId}>
          {models.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <Button onClick={refresh} title="Detect installed models">
          {state === 'loading' ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Detect
        </Button>
      </div>
      {state === 'error' && <p className="text-xs text-rose-300">{error}</p>}
      {state === 'idle' && models.length > 0 && <p className="text-xs text-emerald-300/80">Found {models.length} models — pick one from the list.</p>}
    </div>
  )
}

export function SettingsDialog({
  open,
  onClose,
  settings,
  onSettingsChange,
  engines,
  onEnginesChange,
}: {
  open: boolean
  onClose: () => void
  settings: AppSettings
  onSettingsChange: (s: AppSettings) => void
  engines: EngineSettings
  onEnginesChange: (e: EngineSettings) => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const setEngine = <K extends keyof EngineSettings>(key: K, patch: Partial<EngineSettings[K]>) =>
    onEnginesChange({ ...engines, [key]: { ...engines[key], ...patch } })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-10" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <h2 className="font-semibold text-white">Settings</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close settings">
            <X className="size-4" />
          </Button>
        </header>

        <div className="space-y-6 px-6 py-6">
          <Section
            title="Speech-to-text model"
            description="OpenAI's Whisper, running 100% in your browser. Downloaded once from Hugging Face, then cached — no account, no cost, audio never leaves your device."
          >
            <ModelPicker models={WHISPER_MODELS} value={settings.whisperModel} onChange={(whisperModel) => onSettingsChange({ ...settings, whisperModel })} />
            <Field label="Language" hint="Multilingual Whisper models and live mode use this. Leave empty to auto-detect (Whisper) or use your browser language (live).">
              <input aria-label="Language"
                value={settings.language}
                onChange={(e) => onSettingsChange({ ...settings, language: e.target.value })}
                placeholder="e.g. english, spanish — or en-US for live mode"
                className={inputClass}
              />
            </Field>
          </Section>

          <Section
            title="In-browser AI"
            description="A small LLM that runs on your GPU via WebGPU. Free and private, but less polished than bigger models."
          >
            <ModelPicker models={BROWSER_LLMS} value={engines.browser.model} onChange={(model) => setEngine('browser', { model })} />
          </Section>

          <Section
            title="Ollama"
            description={
              <>
                Free local models. Install from ollama.com, then run <code className="text-zinc-300">ollama pull llama3.2</code>.
              </>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Server URL">
                <input aria-label="Server URL" value={engines.ollama.baseUrl} onChange={(e) => setEngine('ollama', { baseUrl: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Model">
                <ModelListInput
                  value={engines.ollama.model}
                  onChange={(model) => setEngine('ollama', { model })}
                  load={() => listOllamaModels(engines.ollama.baseUrl)}
                  placeholder="llama3.2"
                />
              </Field>
            </div>
          </Section>

          <Section title="OpenAI-compatible endpoint" description="Any server that speaks the /v1/chat/completions protocol.">
            <div className="flex flex-wrap gap-1.5">
              {OPENAI_PRESETS.map((p) => (
                <Button
                  key={p.label}
                  size="sm"
                  variant={engines.openai.baseUrl === p.baseUrl ? 'primary' : 'secondary'}
                  onClick={() => setEngine('openai', { baseUrl: p.baseUrl })}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Base URL">
                <input aria-label="Base URL" value={engines.openai.baseUrl} onChange={(e) => setEngine('openai', { baseUrl: e.target.value })} className={inputClass} />
              </Field>
              <Field label="API key" hint="Not needed for local servers.">
                <input aria-label="API key"
                  type="password"
                  value={engines.openai.apiKey}
                  onChange={(e) => setEngine('openai', { apiKey: e.target.value })}
                  placeholder="sk-…"
                  autoComplete="off"
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Model">
              <ModelListInput
                value={engines.openai.model}
                onChange={(model) => setEngine('openai', { model })}
                load={() => listOpenAiModels(engines.openai)}
                placeholder="model id"
              />
            </Field>
          </Section>

          <Section title="Claude (Anthropic)" description="Best-in-class editing. Bring your own API key from console.anthropic.com.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="API key">
                <input aria-label="API key"
                  type="password"
                  value={engines.anthropic.apiKey}
                  onChange={(e) => setEngine('anthropic', { apiKey: e.target.value })}
                  placeholder="sk-ant-…"
                  autoComplete="off"
                  className={inputClass}
                />
              </Field>
              <Field label="Model">
                <select aria-label="Model" value={engines.anthropic.model} onChange={(e) => setEngine('anthropic', { model: e.target.value })} className={inputClass}>
                  {CLAUDE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          <p className="flex items-start gap-2 rounded-lg bg-zinc-950/60 p-3 text-xs text-zinc-500">
            <KeyRound className="mt-0.5 size-3.5 shrink-0" />
            Settings and API keys are stored only in this browser's localStorage and are sent nowhere except the endpoint you configure.
          </p>
        </div>
      </div>
    </div>
  )
}
