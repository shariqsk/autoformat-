/** Yield the `data:` payloads of a Server-Sent Events response body. */
export async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  for await (const line of readLines(body)) {
    if (line.startsWith('data:')) yield line.slice(5).trim()
  }
}

/** Yield complete lines from a streamed response body (used for NDJSON and SSE). */
export async function* readLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let newline: number
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, '')
        buffer = buffer.slice(newline + 1)
        if (line) yield line
      }
    }
    buffer += decoder.decode()
    if (buffer.trim()) yield buffer.trim()
  } finally {
    reader.releaseLock()
  }
}

export async function errorFromResponse(res: Response, service: string): Promise<Error> {
  let detail = ''
  try {
    const text = await res.text()
    try {
      const json = JSON.parse(text)
      detail = json.error?.message ?? json.error ?? json.message ?? text
    } catch {
      detail = text
    }
  } catch {
    /* ignore */
  }
  return new Error(`${service} returned ${res.status}${detail ? `: ${String(detail).slice(0, 300)}` : ''}`)
}
