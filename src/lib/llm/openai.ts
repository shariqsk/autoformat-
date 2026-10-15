import { errorFromResponse, readSse } from './sse'
import type { EngineSettings, GenerateArgs } from './types'

// Works with anything that speaks the OpenAI Chat Completions protocol:
// LM Studio (http://localhost:1234/v1), llama.cpp server, vLLM, Groq, OpenRouter, Together, OpenAI…

const trimSlash = (url: string) => url.replace(/\/+$/, '')
const headers = (apiKey: string): HeadersInit => ({
  'Content-Type': 'application/json',
  ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
})

export async function listOpenAiModels(settings: EngineSettings['openai'], signal?: AbortSignal): Promise<string[]> {
  const res = await fetch(`${trimSlash(settings.baseUrl)}/models`, { headers: headers(settings.apiKey), signal })
  if (!res.ok) throw await errorFromResponse(res, 'Endpoint')
  const json = (await res.json()) as { data?: { id: string }[] }
  return (json.data ?? []).map((m) => m.id).sort()
}

export async function generateWithOpenAi(settings: EngineSettings['openai'], args: GenerateArgs): Promise<string> {
  let res: Response
  try {
    res = await fetch(`${trimSlash(settings.baseUrl)}/chat/completions`, {
      method: 'POST',
      headers: headers(settings.apiKey),
      signal: args.signal,
      body: JSON.stringify({
        model: settings.model,
        stream: true,
        temperature: 0.3,
        messages: [
          { role: 'system', content: args.system },
          { role: 'user', content: args.user },
        ],
      }),
    })
  } catch (err) {
    if (args.signal.aborted) throw err
    throw new Error(`Couldn't reach ${settings.baseUrl}. Check the URL, that the server is running, and that it allows browser (CORS) requests.`)
  }
  if (!res.ok || !res.body) throw await errorFromResponse(res, 'Endpoint')

  let full = ''
  for await (const data of readSse(res.body)) {
    if (data === '[DONE]') break
    const chunk = JSON.parse(data) as { choices?: { delta?: { content?: string } }[]; error?: { message?: string } }
    if (chunk.error) throw new Error(chunk.error.message ?? 'Endpoint returned an error')
    const text = chunk.choices?.[0]?.delta?.content ?? ''
    if (text) {
      full += text
      args.onDelta(text)
    }
  }
  return full
}
