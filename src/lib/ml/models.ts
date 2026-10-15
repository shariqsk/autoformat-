export interface ModelOption {
  id: string
  label: string
  size: string
  note: string
  /** Only practical with WebGPU acceleration. */
  needsGpu?: boolean
}

/** Whisper checkpoints converted to ONNX; downloaded once from Hugging Face and cached by the browser. */
export const WHISPER_MODELS: ModelOption[] = [
  { id: 'onnx-community/whisper-tiny.en', label: 'Whisper Tiny · English', size: '~40 MB', note: 'Fastest, fine for quick notes' },
  { id: 'onnx-community/whisper-base.en', label: 'Whisper Base · English', size: '~80 MB', note: 'Good default on any laptop' },
  { id: 'onnx-community/whisper-small.en', label: 'Whisper Small · English', size: '~250 MB', note: 'Noticeably more accurate' },
  { id: 'onnx-community/whisper-base', label: 'Whisper Base · Multilingual', size: '~80 MB', note: '99 languages' },
  {
    id: 'onnx-community/whisper-large-v3-turbo',
    label: 'Whisper Large v3 Turbo',
    size: '~800 MB',
    note: 'Best accuracy, multilingual',
    needsGpu: true,
  },
]

/** Small instruction-tuned LLMs that run fully in the browser. Quality is decent, not GPT-level. */
export const BROWSER_LLMS: ModelOption[] = [
  { id: 'onnx-community/gemma-3-1b-it-ONNX', label: 'Gemma 3 · 1B', size: '~860 MB', note: 'Recommended — faithful and fast' },
  { id: 'onnx-community/Qwen2.5-0.5B-Instruct', label: 'Qwen 2.5 · 0.5B', size: '~790 MB', note: 'Fast, but rough — may embellish' },
  { id: 'onnx-community/Qwen2.5-1.5B-Instruct', label: 'Qwen 2.5 · 1.5B', size: '~1.8 GB', note: 'Larger, more verbose', needsGpu: true },
]
