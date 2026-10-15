import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateWithClaude } from './anthropic'

const sse = (events: object[]) => events.map((e) => `event: ${(e as { type: string }).type}\ndata: ${JSON.stringify(e)}\n\n`).join('')

function claudeStream(text: string[], stopReason = 'end_turn') {
  const message = {
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    model: 'claude-opus-5-5',
    content: [],
    stop_reason: null,
    usage: { input_tokens: 1, output_tokens: 0 },
  }
  return sse([
    { type: 'message_start', message },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    ...text.map((t) => ({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: t } })),
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', delta: { stop_reason: stopReason }, usage: { output_tokens: 5 } },
    { type: 'message_stop' },
  ])
}

afterEach(() => vi.unstubAllGlobals())

describe('generateWithClaude', () => {
  it('streams text and sends the expected request', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(claudeStream(['# Hi', '\n\nBody']), { headers: { 'content-type': 'text/event-stream' } }))
    vi.stubGlobal('fetch', fetchMock)
    const onDelta = vi.fn()
    const out = await generateWithClaude(
      { apiKey: 'sk-ant-test', model: 'claude-opus-5-5' },
      { system: 'sys', user: 'usr', signal: new AbortController().signal, onDelta },
    )
    expect(out).toBe('# Hi\n\nBody')
    expect(onDelta).toHaveBeenCalledTimes(2)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/v1/messages')
    const body = JSON.parse(init.body)
    expect(body).toMatchObject({
      model: 'claude-opus-5-5',
      system: 'sys',
      stream: true,
      fallbacks: 'default',
      output_config: { effort: 'low' },
    })
    const headers = new Headers(init.headers)
    expect(headers.get('anthropic-beta')).toContain('server-side-fallback-2026-07-01')
    expect(headers.get('anthropic-dangerous-direct-browser-access')).toBe('true')
  })

  it('reports refusals', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(claudeStream([], 'refusal'), { headers: { 'content-type': 'text/event-stream' } })),
    )
    await expect(
      generateWithClaude(
        { apiKey: 'k', model: 'claude-opus-5-5' },
        { system: '', user: '', signal: new AbortController().signal, onDelta: () => {} },
      ),
    ).rejects.toThrow(/declined/)
  })

  it('requires an API key', async () => {
    await expect(
      generateWithClaude(
        { apiKey: '', model: 'claude-opus-5-5' },
        { system: '', user: '', signal: new AbortController().signal, onDelta: () => {} },
      ),
    ).rejects.toThrow(/API key/)
  })
})
