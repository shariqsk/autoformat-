export const WHISPER_SAMPLE_RATE = 16000

/** Decode any browser-supported audio/video blob into 16 kHz mono PCM, as Whisper expects. */
export async function decodeToWhisperPcm(blob: Blob): Promise<Float32Array> {
  const data = await blob.arrayBuffer()
  const ctx = new AudioContext()
  let decoded: AudioBuffer
  try {
    decoded = await ctx.decodeAudioData(data)
  } catch {
    throw new Error("Couldn't decode that audio. Try a WAV, MP3, M4A, OGG or WebM file.")
  } finally {
    void ctx.close()
  }
  if (!decoded.length) throw new Error('The recording is empty.')

  // Resample + downmix in one pass with an OfflineAudioContext.
  const frames = Math.ceil(decoded.duration * WHISPER_SAMPLE_RATE)
  const offline = new OfflineAudioContext(1, frames, WHISPER_SAMPLE_RATE)
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start()
  const rendered = await offline.startRendering()
  return rendered.getChannelData(0)
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
