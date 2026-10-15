import { wordCount } from '../format/text'
import { generateInBrowser } from '../ml/client'
import { generateWithClaude } from './anthropic'
import { generateWithOllama } from './ollama'
import { generateWithOpenAi } from './openai'
import type { EngineId, EngineSettings, GenerateArgs } from './types'

/** Run the selected LLM engine, streaming text through args.onDelta. */
export function generate(engine: Exclude<EngineId, 'instant'>, settings: EngineSettings, args: GenerateArgs): Promise<string> {
  switch (engine) {
    case 'browser':
      return generateInBrowser(
        {
          model: settings.browser.model,
          system: args.system,
          user: args.user,
          // Roughly 1.4 tokens per word, plus headroom for headings and the title.
          maxNewTokens: Math.min(2048, Math.round(wordCount(args.user) * 1.8) + 200),
        },
        { onDelta: args.onDelta, onLoading: args.onLoading },
        args.signal,
      )
    case 'ollama':
      return generateWithOllama(settings.ollama, args)
    case 'openai':
      return generateWithOpenAi(settings.openai, args)
    case 'anthropic':
      return generateWithClaude(settings.anthropic, args)
  }
}

export * from './types'
