// Messages exchanged with the ML web worker.

export type WorkerRequest =
  | { id: number; type: 'transcribe'; model: string; audio: Float32Array; language?: string }
  | { id: number; type: 'generate'; model: string; system: string; user: string; maxNewTokens: number }
  | { id: number; type: 'abort' }

export interface LoadProgress {
  /** 0..1 across all files, when known. */
  fraction: number | null
  loadedBytes: number
  totalBytes: number
  file?: string
}

export type WorkerResponse =
  | { id: number; type: 'loading'; progress: LoadProgress }
  | { id: number; type: 'running'; device: string }
  | { id: number; type: 'delta'; text: string }
  | { id: number; type: 'result'; text: string }
  | { id: number; type: 'error'; message: string }
