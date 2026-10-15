import Anthropic from '@anthropic-ai/sdk'
import type { EngineSettings, GenerateArgs } from './types'

export async function generateWithClaude(settings: EngineSettings['anthropic'], args: GenerateArgs): Promise<string> {
  if (!settings.apiKey) throw new Error('Add your Anthropic API key in Settings to use Claude.')
  // The key is supplied by the user and stays in their browser; requests go straight to Anthropic.
  const client = new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true })

  const stream = client.beta.messages.stream(
    {
      model: settings.model,
      max_tokens: 64000,
      // Editing a transcript is routine work: keep thinking light so the draft starts streaming quickly.
      output_config: { effort: 'low' },
      // If a request is declined, let the API retry on its default fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: args.system,
      messages: [{ role: 'user', content: args.user }],
    },
    { signal: args.signal },
  )
  stream.on('text', (delta) => args.onDelta(delta))

  try {
    const message = await stream.finalMessage()
    if (message.stop_reason === 'refusal') throw new Error('Claude declined to format this transcript.')
    return message.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('')
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new Error('Anthropic rejected the API key. Check it in Settings.')
    if (err instanceof Anthropic.RateLimitError) throw new Error('Anthropic rate limit hit — wait a moment and try again.')
    if (err instanceof Anthropic.NotFoundError) throw new Error(`Model "${settings.model}" isn't available on this API key.`)
    throw err
  }
}
