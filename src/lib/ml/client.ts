import type { LoadProgress, WorkerRequest, WorkerResponse } from './protocol'

export interface JobCallbacks {
  onLoading?: (progress: LoadProgress) => void
  onRunning?: (device: string) => void
  onDelta?: (text: string) => void
}

type Pending = JobCallbacks & { resolve: (text: string) => void; reject: (err: Error) => void }

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, Pending>()

function getWorker(): Worker {
  if (worker) return worker
  worker = new Worker(new URL('../../workers/ml.worker.ts', import.meta.url), { type: 'module' })
  worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
    const msg = event.data
    const job = pending.get(msg.id)
    if (!job) return
    switch (msg.type) {
      case 'loading':
        job.onLoading?.(msg.progress)
        break
      case 'running':
        job.onRunning?.(msg.device)
        break
      case 'delta':
        job.onDelta?.(msg.text)
        break
      case 'result':
        pending.delete(msg.id)
        job.resolve(msg.text)
        break
      case 'error':
        pending.delete(msg.id)
        job.reject(new Error(msg.message))
        break
    }
  })
  worker.addEventListener('error', (event) => {
    for (const job of pending.values()) job.reject(new Error(event.message || 'The ML worker crashed.'))
    pending.clear()
    worker?.terminate()
    worker = null
  })
  return worker
}

type JobRequest = WorkerRequest extends infer R ? (R extends { type: 'abort' } ? never : Omit<R, 'id'>) : never

function run(request: JobRequest, callbacks: JobCallbacks, signal?: AbortSignal): Promise<string> {
  const id = nextId++
  const w = getWorker()
  return new Promise<string>((resolve, reject) => {
    pending.set(id, { ...callbacks, resolve, reject })
    signal?.addEventListener('abort', () => {
      w.postMessage({ id, type: 'abort' } satisfies WorkerRequest)
    })
    const transfer = request.type === 'transcribe' ? [request.audio.buffer as ArrayBuffer] : []
    w.postMessage({ ...request, id } as WorkerRequest, transfer)
  })
}

export function transcribeInBrowser(audio: Float32Array, model: string, callbacks: JobCallbacks = {}, language?: string): Promise<string> {
  return run({ type: 'transcribe', model, audio, language }, callbacks)
}

export function generateInBrowser(
  args: { model: string; system: string; user: string; maxNewTokens: number },
  callbacks: JobCallbacks = {},
  signal?: AbortSignal,
): Promise<string> {
  return run({ type: 'generate', ...args }, callbacks, signal)
}

export const hasWebGpu = () => typeof navigator !== 'undefined' && 'gpu' in navigator
