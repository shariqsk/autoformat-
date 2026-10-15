import { errorFromResponse, readLines } from './sse'
import type { EngineSettings, GenerateArgs } from './types'

const trimSlash = (url: string) => url.replace(/\/+$/, '')

export async function listOllamaModels(baseUrl: string, signal?: AbortSignal): Promise<string[]> {
  const res = await fetch(`${trimSlash(baseUrl)}/api/tags`, { signal })
  if (!res.ok) throw await errorFromResponse(res, 'Ollama')
  const json = (await res.json()) as { models?: { name: string }[] }
  return (json.models ?? []).map((m) => m.name).sort()
}

export async function generateWithOllama(settings: EngineSettings['ollama'], args: GenerateArgs): Promise<string> {
  let res: Response
  try {
    res = await fetch(`${trimSlash(settings.baseUrl)}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: args.signal,
      body: JSON.stringify({
        model: settings.model,
        stream: true,
        options: { temperature: 0.3 },
        messages: [
          { role: 'system', content: args.system },
          { role: 'user', content: args.user },
        ],
      }),
    })
  } catch (err) {
    if (args.signal.aborted) throw err
    throw new Error(
      `Couldn't reach Ollama at ${settings.baseUrl}. Is it running (\`ollama serve\`)? If this page isn't on localhost, start Ollama with OLLAMA_ORIGINS="*".`,
    )
  }
  if (!res.ok || !res.body) throw await errorFromResponse(res, 'Ollama')

  let full = ''
  for await (const line of readLines(res.body)) {
    const chunk = JSON.parse(line) as { message?: { content?: string }; error?: string; done?: boolean }
    if (chunk.error) throw new Error(`Ollama: ${chunk.error}`)
    const text = chunk.message?.content ?? ''
    if (text) {
      full += text
      args.onDelta(text)
    }
  }
  return full
}
