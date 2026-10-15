// Everything AutoFormat is built on, credited in Settings and the README.

export interface Credit {
  name: string
  by: string
  what: string
  license: string
  url: string
}

export const MODEL_CREDITS: Credit[] = [
  {
    name: 'Whisper',
    by: 'OpenAI',
    what: 'Speech recognition, running on your device',
    license: 'MIT',
    url: 'https://github.com/openai/whisper',
  },
  {
    name: 'Gemma 3',
    by: 'Google',
    what: 'In-browser titles and headings',
    license: 'Gemma Terms of Use',
    url: 'https://ai.google.dev/gemma',
  },
  { name: 'Qwen 2.5', by: 'Alibaba Qwen', what: 'Alternative in-browser models', license: 'Apache 2.0', url: 'https://qwenlm.github.io' },
  {
    name: 'ONNX model conversions',
    by: 'Hugging Face onnx-community',
    what: 'Browser-ready versions of the models above',
    license: 'Same as each model',
    url: 'https://huggingface.co/onnx-community',
  },
]

export const SOFTWARE_CREDITS: Credit[] = [
  {
    name: 'Transformers.js',
    by: 'Hugging Face',
    what: 'Runs the models in your browser',
    license: 'Apache 2.0',
    url: 'https://github.com/huggingface/transformers.js',
  },
  {
    name: 'ONNX Runtime Web',
    by: 'Microsoft',
    what: 'WebGPU and WebAssembly inference',
    license: 'MIT',
    url: 'https://onnxruntime.ai',
  },
  { name: 'React, Vite & Tailwind CSS', by: 'their maintainers', what: 'The app itself', license: 'MIT', url: 'https://react.dev' },
  { name: 'Electron', by: 'OpenJS Foundation', what: 'The desktop app', license: 'MIT', url: 'https://www.electronjs.org' },
  {
    name: 'Unbounded, Bricolage Grotesque, Space Grotesk, Geist, Instrument Serif, Newsreader, Inter Tight & friends',
    by: 'their type designers, via Fontsource',
    what: 'Typefaces',
    license: 'SIL Open Font License',
    url: 'https://fontsource.org',
  },
]
