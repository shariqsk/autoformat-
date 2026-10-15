/// <reference lib="webworker" />
// Runs Whisper (speech-to-text) and small chat LLMs entirely in the browser via transformers.js.
// Models are fetched from the Hugging Face Hub on first use and cached in the browser Cache API.

import {
  InterruptableStoppingCriteria,
  pipeline,
  TextStreamer,
  type DataType,
  type DeviceType,
  type ProgressInfo,
} from '@huggingface/transformers'
import type { LoadProgress, WorkerRequest, WorkerResponse } from '../lib/ml/protocol'

declare const self: DedicatedWorkerGlobalScope

const post = (msg: WorkerResponse) => self.postMessage(msg)

interface Accel {
  device: DeviceType
  fp16: boolean
}

let accelPromise: Promise<Accel> | null = null
function detectAccel(): Promise<Accel> {
  accelPromise ??= (async () => {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ features: Set<string> } | null> } }).gpu
    try {
      const adapter = await gpu?.requestAdapter()
      if (adapter) return { device: 'webgpu', fp16: adapter.features.has('shader-f16') }
    } catch {
      /* fall through to WASM */
    }
    return { device: 'wasm', fp16: false }
  })()
  return accelPromise
}

function progressReporter(id: number) {
  return (info: ProgressInfo) => {
    if (info.status !== 'progress_total') return
    const progress: LoadProgress = {
      fraction: info.total ? info.loaded / info.total : null,
      loadedBytes: info.loaded,
      totalBytes: info.total,
    }
    post({ id, type: 'loading', progress })
  }
}

// Pipelines are expensive to build, so keep the most recently used one per task.
type Cached<T> = { model: string; instance: Promise<T> } | null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let asr: Cached<any> = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let llm: Cached<any> = null
const stopper = new InterruptableStoppingCriteria()

async function getAsr(id: number, model: string) {
  if (asr?.model !== model) {
    const { device } = await detectAccel()
    const dtype: Record<string, DataType> =
      device === 'webgpu'
        ? { encoder_model: 'fp32', decoder_model_merged: 'q4' }
        : { encoder_model: 'q8', decoder_model_merged: 'q8' }
    asr = {
      model,
      instance: pipeline('automatic-speech-recognition', model, { device, dtype, progress_callback: progressReporter(id) }),
    }
    asr.instance.catch(() => (asr = null))
  }
  return asr.instance
}

async function getLlm(id: number, model: string) {
  if (llm?.model !== model) {
    const { device, fp16 } = await detectAccel()
    const dtype: DataType = device === 'webgpu' && fp16 ? 'q4f16' : 'q4'
    llm = {
      model,
      instance: pipeline('text-generation', model, { device, dtype, progress_callback: progressReporter(id) }),
    }
    llm.instance.catch(() => (llm = null))
  }
  return llm.instance
}

async function transcribe(req: Extract<WorkerRequest, { type: 'transcribe' }>) {
  const transcriber = await getAsr(req.id, req.model)
  post({ id: req.id, type: 'running', device: (await detectAccel()).device })
  const multilingual = !req.model.endsWith('.en')
  const output = await transcriber(req.audio, {
    chunk_length_s: 30,
    stride_length_s: 5,
    ...(multilingual ? { language: req.language || null, task: 'transcribe' } : {}),
  })
  const text = (Array.isArray(output) ? output.map((o) => o.text).join(' ') : output.text) as string
  post({ id: req.id, type: 'result', text: text.trim() })
}

async function generate(req: Extract<WorkerRequest, { type: 'generate' }>) {
  const generator = await getLlm(req.id, req.model)
  post({ id: req.id, type: 'running', device: (await detectAccel()).device })
  stopper.reset()
  let full = ''
  const streamer = new TextStreamer(generator.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (text: string) => {
      full += text
      post({ id: req.id, type: 'delta', text })
    },
  })
  await generator(
    [
      { role: 'system', content: req.system },
      { role: 'user', content: req.user },
    ],
    { max_new_tokens: req.maxNewTokens, do_sample: false, repetition_penalty: 1.05, streamer, stopping_criteria: stopper },
  )
  post({ id: req.id, type: 'result', text: full })
}

self.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  const req = event.data
  if (req.type === 'abort') {
    stopper.interrupt()
    return
  }
  try {
    if (req.type === 'transcribe') await transcribe(req)
    else await generate(req)
  } catch (err) {
    post({ id: req.id, type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
})
