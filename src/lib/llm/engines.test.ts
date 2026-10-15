import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateWithOllama } from './ollama'
import { generateWithOpenAi } from './openai'
import { readLines } from './sse'

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      chunks.forEach((c) => controller.enqueue(enc.encode(c)))
      controller.close()
    },
  })
}

const args = () => ({ system: 'sys', user: 'usr', signal: new AbortController().signal, onDelta: vi.fn() })

afterEach(() => vi.unstubAllGlobals())

describe('readLines', () => {
  it('reassembles lines split across chunks', async () => {
    const lines: string[] = []
    for await (const l of readLines(streamOf('a\nb', 'c\r\n', '\nd'))) lines.push(l)
    expect(lines).toEqual(['a', 'bc', 'd'])
  })
})

describe('generateWithOllama', () => {
  it('streams NDJSON chat chunks', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(streamOf('{"message":{"content":"Hel"}}\n{"message":{"content":"lo"}}\n', '{"done":true}\n')),
    )
    vi.stubGlobal('fetch', fetchMock)
    const a = args()
    const out = await generateWithOllama({ baseUrl: 'http://localhost:11434/', model: 'llama3.2' }, a)
    expect(out).toBe('Hello')
    expect(a.onDelta).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:11434/api/chat')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ model: 'llama3.2', stream: true })
  })

  it('explains connection failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(generateWithOllama({ baseUrl: 'http://localhost:11434', model: 'x' }, args())).rejects.toThrow(/ollama serve/)
  })
})

describe('generateWithOpenAi', () => {
  it('streams SSE deltas and sends the bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        streamOf(
          'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":" there"}}]}\n\ndata: [DONE]\n\n',
        ),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const out = await generateWithOpenAi({ baseUrl: 'https://api.example.com/v1', apiKey: 'sk-test', model: 'm' }, args())
    expect(out).toBe('Hi there')
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ Authorization: 'Bearer sk-test' })
  })

  it('surfaces API error messages', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":{"message":"bad key"}}', { status: 401 })))
    await expect(generateWithOpenAi({ baseUrl: 'https://x/v1', apiKey: '', model: 'm' }, args())).rejects.toThrow('401: bad key')
  })
})
