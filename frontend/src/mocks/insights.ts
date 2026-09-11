import type {
  SelfAwarenessData,
  GoodTimesData,
  GoodTimesPoint,
  QuadrantId,
  QuadrantNote,
} from '@/types/insight'
import { mockGetEntry, mockListEntries } from '@/mocks/entries'
import { mockListTags } from '@/mocks/tags'

function delay(ms = 100) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function mockSelfAwareness(params: {
  tag_id?: string
  page?: number
  page_size?: number
}): Promise<SelfAwarenessData> {
  await delay()
  const page = params.page ?? 1
  const pageSize = params.page_size ?? 20
  const tagId = !params.tag_id || params.tag_id === 'all' ? null : params.tag_id
  const thinking = (await mockListTags('thinking')).items
  const filterTag = tagId ? (thinking.find((t) => t.id === tagId) ?? null) : null

  const list = await mockListEntries()
  const collected: SelfAwarenessData['items'] = []

  for (const row of list.items) {
    const entry = await mockGetEntry(row.id)
    const topicHighlights = entry.highlights.filter((h) => h.kind === 'topic_emotion')
    const coveredTagIds = new Set<string>()
    let matchedHighlight = false

    for (const h of topicHighlights) {
      const thinkingTags = h.tags.filter((t) => t.kind === 'thinking')
      if (tagId && !thinkingTags.some((t) => t.id === tagId)) continue
      matchedHighlight = true
      thinkingTags.forEach((t) => coveredTagIds.add(t.id))
      collected.push({
        entry_id: entry.id,
        highlight_id: h.id,
        event_date: entry.event_date,
        title: entry.title,
        excerpt: h.quote_text || entry.body.replace(/<[^>]+>/g, '').slice(0, 80),
        tag_names: thinkingTags.map((t) => t.name),
      })
    }

    const entryThinking = entry.tags.filter((t) => t.kind === 'thinking')
    let bodyTags = entryThinking
    if (tagId) {
      if (matchedHighlight) continue
      if (!entryThinking.some((t) => t.id === tagId)) continue
    } else {
      bodyTags = entryThinking.filter((t) => !coveredTagIds.has(t.id))
      if (bodyTags.length === 0) continue
    }

    const plain = entry.body.replace(/<[^>]+>/g, '')
    collected.push({
      entry_id: entry.id,
      highlight_id: null,
      event_date: entry.event_date,
      title: entry.title,
      excerpt: plain.slice(0, 80),
      tag_names: bodyTags.map((t) => t.name),
    })
  }

  collected.sort((a, b) => b.event_date.localeCompare(a.event_date))
  const start = (page - 1) * pageSize
  const items = collected.slice(start, start + pageSize)

  return {
    filter_tag: filterTag
      ? { id: filterTag.id, kind: filterTag.kind, name: filterTag.name }
      : null,
    items,
    total: collected.length,
    page,
    page_size: pageSize,
  }
}

function toQuadrant(
  engagement: number,
  drain: number,
  engagementSplit: number,
  drainSplit: number,
): QuadrantId {
  const highFocus = engagement >= engagementSplit
  const highDrain = drain >= drainSplit
  if (highFocus && !highDrain) return 'high_focus_low_drain'
  if (highFocus && highDrain) return 'high_focus_high_drain'
  if (!highFocus && !highDrain) return 'low_focus_low_drain'
  return 'low_focus_high_drain'
}

export async function mockGoodTimes(params: {
  limit_entries?: number
  engagement_split?: number
  drain_split?: number
  quadrant?: QuadrantId
  sort?: 'asc' | 'desc'
}): Promise<GoodTimesData> {
  await delay()
  const engagementSplit = params.engagement_split ?? 2.5
  const drainSplit = params.drain_split ?? 2.5
  const limit = params.limit_entries ?? 10
  const sort = params.sort ?? 'desc'

  const list = await mockListEntries()
  const withEnergy: { id: string; event_date: string }[] = []
  for (const row of list.items) {
    const entry = await mockGetEntry(row.id)
    if (entry.highlights.some((h) => h.kind === 'energy')) {
      withEnergy.push({ id: entry.id, event_date: entry.event_date })
    }
  }
  withEnergy.sort((a, b) => b.event_date.localeCompare(a.event_date))
  const selectedIds = new Set(withEnergy.slice(0, limit).map((e) => e.id))

  const points: GoodTimesPoint[] = []
  for (const row of list.items) {
    if (!selectedIds.has(row.id)) continue
    const entry = await mockGetEntry(row.id)
    for (const h of entry.highlights) {
      if (h.kind !== 'energy') continue
      const engagement = h.engagement ?? 0
      const drain = h.drain ?? 0
      points.push({
        highlight_id: h.id,
        entry_id: entry.id,
        title: entry.title,
        quote_text: h.quote_text,
        engagement,
        drain,
        quadrant: toQuadrant(engagement, drain, engagementSplit, drainSplit),
        event_date: entry.event_date,
      })
    }
  }

  points.sort((a, b) =>
    sort === 'asc'
      ? a.event_date.localeCompare(b.event_date)
      : b.event_date.localeCompare(a.event_date),
  )

  const slices = params.quadrant
    ? points.filter((p) => p.quadrant === params.quadrant)
    : [...points]

  return {
    engagement_split: engagementSplit,
    drain_split: drainSplit,
    points,
    slices,
  }
}

const noteStore: QuadrantNote[] = [
  {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    quadrant: 'high_focus_low_drain',
    body: '这类事往往让我又专注又轻松——多半是有完整时间块、且结果可见。',
    created_at: '2026-08-30T01:00:00Z',
    updated_at: '2026-08-30T01:00:00Z',
  },
  {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeef',
    quadrant: 'high_focus_high_drain',
    body: '赶工时专注够高，但身体透支明显，事后需要留空档。',
    created_at: '2026-08-28T01:00:00Z',
    updated_at: '2026-08-28T01:00:00Z',
  },
]

export async function mockListQuadrantNotes(
  quadrant?: QuadrantId,
): Promise<{ items: QuadrantNote[] }> {
  await delay()
  const items = quadrant ? noteStore.filter((n) => n.quadrant === quadrant) : [...noteStore]
  return { items: structuredClone(items) }
}

export async function mockCreateQuadrantNote(input: {
  quadrant: QuadrantId
  body: string
}): Promise<QuadrantNote> {
  await delay()
  const now = new Date().toISOString()
  const note: QuadrantNote = {
    id: crypto.randomUUID(),
    quadrant: input.quadrant,
    body: input.body,
    created_at: now,
    updated_at: now,
  }
  noteStore.unshift(note)
  return structuredClone(note)
}

export async function mockUpdateQuadrantNote(
  id: string,
  patch: { body?: string; quadrant?: QuadrantId },
): Promise<QuadrantNote> {
  await delay()
  const note = noteStore.find((n) => n.id === id)
  if (!note) {
    const err = new Error('观察不存在') as Error & { code: number }
    err.code = 40401
    throw err
  }
  if (patch.body !== undefined) note.body = patch.body
  if (patch.quadrant !== undefined) note.quadrant = patch.quadrant
  note.updated_at = new Date().toISOString()
  return structuredClone(note)
}
