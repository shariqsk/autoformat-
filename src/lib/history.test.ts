import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS } from './format/types'
import { HISTORY_LIMIT, upsertHistory, type HistoryEntry } from './history'

const entry = (id: string): HistoryEntry => ({
  id,
  createdAt: new Date().toISOString(),
  transcript: 't',
  doc: { title: id, description: '', tags: [], body: '' },
  options: DEFAULT_OPTIONS,
  engine: 'instant',
})

describe('upsertHistory', () => {
  it('puts the newest entry first and replaces by id', () => {
    const h = upsertHistory(upsertHistory([entry('a')], entry('b')), { ...entry('a'), transcript: 'updated' })
    expect(h.map((e) => e.id)).toEqual(['a', 'b'])
    expect(h[0].transcript).toBe('updated')
  })

  it('caps the list', () => {
    let h: HistoryEntry[] = []
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) h = upsertHistory(h, entry(String(i)))
    expect(h).toHaveLength(HISTORY_LIMIT)
    expect(h[0].id).toBe(String(HISTORY_LIMIT + 4))
  })
})
