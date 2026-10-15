import type { EngineId } from './llm/types'
import type { FormatOptions, FormattedDoc } from './format/types'

export interface HistoryEntry {
  id: string
  createdAt: string
  transcript: string
  doc: FormattedDoc
  options: FormatOptions
  engine: EngineId
}

export const HISTORY_LIMIT = 50

/** Insert or replace an entry (newest first), capped at HISTORY_LIMIT. */
export function upsertHistory(history: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  return [entry, ...history.filter((h) => h.id !== entry.id)].slice(0, HISTORY_LIMIT)
}

export function newEntryId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
