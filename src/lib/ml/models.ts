export interface ModelOption {
  id: string
  /** Plain-language name shown first. */
  label: string
  /** The technical name, for people who care. */
  detail?: string
  size: string
  note: string
  /** Only practical with WebGPU acceleration. */
  needsGpu?: boolean
}

/** Whisper checkpoints converted to ONNX; downloaded once from Hugging Face and cached by the browser.
 *  Sizes are for WebGPU; the CPU (WASM) variants are smaller. */
export const WHISPER_MODELS: ModelOption[] = [
  {
    id: 'onnx-community/whisper-tiny.en',
    label: 'Quick',
    detail: 'Whisper Tiny · English',
    size: '65 MB',
    note: 'Fastest, fine for quick notes',
  },
  {
    id: 'onnx-community/whisper-base.en',
    label: 'Balanced',
    detail: 'Whisper Base · English',
    size: '135 MB',
    note: 'The best start for most laptops',
  },
  {
    id: 'onnx-community/whisper-small.en',
    label: 'Accurate',
    detail: 'Whisper Small · English',
    size: '510 MB',
    note: 'Catches more words, a little slower',
  },
  {
    id: 'onnx-community/whisper-base',
    label: 'Any language',
    detail: 'Whisper Base · 99 languages',
    size: '135 MB',
    note: 'For speaking languages other than English',
  },
  {
    id: 'onnx-community/whisper-large-v3-turbo',
    label: 'Best quality',
    detail: 'Whisper Large v3 Turbo',
    size: '1.1 GB',
    note: 'Most accurate, any language',
    needsGpu: true,
  },
]

/** Small instruction-tuned LLMs that run fully in the browser. Quality is decent, not GPT-level. */
export const BROWSER_LLMS: ModelOption[] = [
  {
    id: 'onnx-community/gemma-3-1b-it-ONNX',
    label: 'Gemma 3 · 1B',
    size: '~860 MB',
    note: 'Recommended: faithful and fast',
    needsGpu: true,
  },
  { id: 'onnx-community/Qwen2.5-0.5B-Instruct', label: 'Qwen 2.5 · 0.5B', size: '~790 MB', note: 'Fast, but rough; may embellish' },
  { id: 'onnx-community/Qwen2.5-1.5B-Instruct', label: 'Qwen 2.5 · 1.5B', size: '~1.8 GB', note: 'Larger, more verbose', needsGpu: true },
]
