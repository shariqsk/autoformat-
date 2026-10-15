import { KeyRound, Loader2, RefreshCw } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { listOllamaModels } from '../lib/llm/ollama'
import { listOpenAiModels } from '../lib/llm/openai'
import { CLAUDE_MODELS, type EngineSettings } from '../lib/llm/types'
import { hasWebGpu } from '../lib/ml/client'
import { BROWSER_LLMS, WHISPER_MODELS, type ModelOption } from '../lib/ml/models'
import type { AppSettings } from '../lib/settings'
import { cx, inputClass } from './classes'
import { Modal } from './Modal'
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
    <section className="space-y-4 border-t border-rule pt-6 first:border-0 first:pt-0">
      <div>
        <h3 className="font-display text-2xl leading-none text-ink">{title}</h3>
        {description && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">{description}</p>}
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
            value === m.id ? 'border-ink bg-paper shadow-lift' : 'border-rule hover:border-rule-strong hover:bg-paper/60',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-ink">{m.label}</span>
            <span className="font-mono text-[11px] text-ink-3">{m.size}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-ink-3">
            {m.note}
            {m.needsGpu && <Badge tone={gpu ? 'plain' : 'accent'}>{gpu ? 'WebGPU' : 'slow without WebGPU'}</Badge>}
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
        <Button onClick={refresh} title="Detect installed models" className="h-[42px]">
          {state === 'loading' ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Detect
        </Button>
      </div>
      {state === 'error' && <p className="text-xs text-accent-deep">{error}</p>}
      {state === 'idle' && models.length > 0 && <p className="text-xs text-olive">Found {models.length} models. Pick one from the list.</p>}
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
  const setEngine = <K extends keyof EngineSettings>(key: K, patch: Partial<EngineSettings[K]>) =>
    onEnginesChange({ ...engines, [key]: { ...engines[key], ...patch } })

  return (
    <Modal open={open} onClose={onClose} title="Settings" kicker="The machinery">
        <div className="space-y-8">
          <Section
            title="Speech model"
            description="OpenAI's Whisper, running entirely in your browser. Downloaded once from Hugging Face, then cached. No account, no cost, and your audio never leaves your device."
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
                Free local models. Install from ollama.com, then run <code className="rounded bg-well px-1 font-mono text-ink-2">ollama pull llama3.2</code>.
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
                  variant={engines.openai.baseUrl === p.baseUrl ? 'ink' : 'outline'}
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

          <p className="flex items-start gap-2 rounded-xl bg-well p-3 text-xs leading-relaxed text-ink-3">
            <KeyRound className="mt-0.5 size-3.5 shrink-0" />
            Settings and API keys are stored only in this browser's localStorage and are sent nowhere except the endpoint you configure.
          </p>
        </div>
    </Modal>
  )
}
