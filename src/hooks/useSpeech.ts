import { useCallback, useEffect, useState } from 'react'

/** Read text aloud with the browser's built-in speech synthesis (works offline on most systems). */
export function useSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => () => void (supported && speechSynthesis.cancel()), [supported])

  const speak = useCallback(
    (text: string) => {
      if (!supported) return
      speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.02
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)
      setSpeaking(true)
      speechSynthesis.speak(utterance)
    },
    [supported],
  )

  const stop = useCallback(() => {
    if (supported) speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  return { supported, speaking, speak, stop }
}
