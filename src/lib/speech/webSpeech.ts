// Thin wrapper around the browser's built-in SpeechRecognition (Chrome, Edge, Safari).
// Gives live, word-by-word results, but note: Chrome sends audio to Google's servers.

interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: { transcript: string }
}
interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}
interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const isWebSpeechSupported = () => getCtor() !== null

export interface LiveSession {
  stop(): void
}

export function startLiveTranscription(opts: {
  lang: string
  /** Text finalised during this session, plus the current interim guess. */
  onUpdate: (finalText: string, interim: string) => void
  onError: (message: string) => void
  onEnd: () => void
}): LiveSession {
  const Ctor = getCtor()
  if (!Ctor) throw new Error("This browser doesn't support live speech recognition. Use Whisper instead.")

  let finalText = ''
  let active = true
  let recognition: SpeechRecognitionLike

  const begin = () => {
    recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = opts.lang
    recognition.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += `${r[0].transcript.trim()} `
        else interim += r[0].transcript
      }
      opts.onUpdate(finalText, interim)
    }
    recognition.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return
      active = false
      opts.onError(e.error === 'not-allowed' ? 'Microphone permission was denied.' : `Speech recognition error: ${e.error}`)
    }
    // Chrome ends sessions after a pause; keep listening until the user stops.
    recognition.onend = () => (active ? begin() : opts.onEnd())
    recognition.start()
  }
  begin()

  return {
    stop() {
      active = false
      recognition.stop()
    },
  }
}
