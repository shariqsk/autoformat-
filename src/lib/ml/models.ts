export interface ModelOption {
  id: string
  /** Plain-language name shown first. */
  label: string
  /** The model's real name, credited wherever it's offered. */
  name: string
  /** Who made it. */
  maker: string
  /** The original model's page. */
  url: string
  size: string
  note: string
  /** Only practical with WebGPU acceleration. */
  needsGpu?: boolean
}

/** OpenAI's Whisper, as ONNX conversions by the Hugging Face community. Downloaded once and cached
 *  by the browser. Sizes are for WebGPU; the CPU (WASM) variants are smaller. */
export const WHISPER_MODELS: ModelOption[] = [
  {
    id: 'onnx-community/whisper-tiny.en',
    label: 'Quick',
    name: 'Whisper Tiny (English)',
    maker: 'OpenAI',
    url: 'https://huggingface.co/openai/whisper-tiny.en',
    size: '65 MB',
    note: 'Fastest, fine for quick notes',
  },
  {
    id: 'onnx-community/whisper-base.en',
    label: 'Balanced',
    name: 'Whisper Base (English)',
    maker: 'OpenAI',
    url: 'https://huggingface.co/openai/whisper-base.en',
    size: '135 MB',
    note: 'The best start for most laptops',
  },
  {
    id: 'onnx-community/whisper-small.en',
    label: 'Accurate',
    name: 'Whisper Small (English)',
    maker: 'OpenAI',
    url: 'https://huggingface.co/openai/whisper-small.en',
    size: '510 MB',
    note: 'Catches more words, a little slower',
  },
  {
    id: 'onnx-community/whisper-base',
    label: 'Any language',
    name: 'Whisper Base (99 languages)',
    maker: 'OpenAI',
    url: 'https://huggingface.co/openai/whisper-base',
    size: '135 MB',
    note: 'For speaking languages other than English',
  },
  {
    id: 'onnx-community/whisper-large-v3-turbo',
    label: 'Best quality',
    name: 'Whisper Large v3 Turbo',
    maker: 'OpenAI',
    url: 'https://huggingface.co/openai/whisper-large-v3-turbo',
    size: '1.1 GB',
    note: 'Most accurate, any language',
    needsGpu: true,
  },
]

/** Small instruction-tuned LLMs that run fully in the browser. Quality is decent, not GPT-level. */
export const BROWSER_LLMS: ModelOption[] = [
  {
    id: 'onnx-community/gemma-3-1b-it-ONNX',
    label: 'Recommended',
    name: 'Gemma 3 1B',
    maker: 'Google',
    url: 'https://huggingface.co/google/gemma-3-1b-it',
    size: '860 MB',
    note: 'Faithful and fast',
    needsGpu: true,
  },
  {
    id: 'onnx-community/Qwen2.5-0.5B-Instruct',
    label: 'Lightest',
    name: 'Qwen 2.5 0.5B',
    maker: 'Alibaba Qwen',
    url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct',
    size: '790 MB',
    note: 'Fast, but rough; may embellish',
  },
  {
    id: 'onnx-community/Qwen2.5-1.5B-Instruct',
    label: 'Larger',
    name: 'Qwen 2.5 1.5B',
    maker: 'Alibaba Qwen',
    url: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct',
    size: '1.8 GB',
    note: 'More capable, more verbose',
    needsGpu: true,
  },
]
