import type {
  AiSuggestionDTO,
  EntryDetail,
  EntryListData,
  EntryListItem,
  HighlightDTO,
  TagRef,
} from '@/types/entry'

const TAGS = {
  relation: {
    id: '11111111-1111-1111-1111-111111111101',
    kind: 'thinking' as const,
    name: '人际关系',
  },
  emotionTopic: {
    id: '11111111-1111-1111-1111-111111111102',
    kind: 'thinking' as const,
    name: '情绪',
  },
  intimacy: {
    id: '11111111-1111-1111-1111-111111111103',
    kind: 'thinking' as const,
    name: '亲密关系',
  },
  family: {
    id: '11111111-1111-1111-1111-111111111104',
    kind: 'thinking' as const,
    name: '家庭',
  },
  career: {
    id: '11111111-1111-1111-1111-111111111105',
    kind: 'thinking' as const,
    name: '职业规划',
  },
  work: {
    id: '11111111-1111-1111-1111-111111111111',
    kind: 'thinking' as const,
    name: '工作状态',
  },
  money: {
    id: '11111111-1111-1111-1111-111111111106',
    kind: 'thinking' as const,
    name: '金钱观',
  },
  values: {
    id: '11111111-1111-1111-1111-111111111107',
    kind: 'thinking' as const,
    name: '价值判断',
  },
  lifeView: {
    id: '11111111-1111-1111-1111-111111111108',
    kind: 'thinking' as const,
    name: '人生观',
  },
  worldView: {
    id: '11111111-1111-1111-1111-111111111109',
    kind: 'thinking' as const,
    name: '世界观',
  },
  health: {
    id: '11111111-1111-1111-1111-111111111110',
    kind: 'thinking' as const,
    name: '健康',
  },
  learning: {
    id: '11111111-1111-1111-1111-111111111112',
    kind: 'thinking' as const,
    name: '学习成长',
  },
  hobby: {
    id: '11111111-1111-1111-1111-111111111113',
    kind: 'thinking' as const,
    name: '兴趣爱好',
  },
  life: {
    id: '11111111-1111-1111-1111-111111111114',
    kind: 'thinking' as const,
    name: '生活探索',
  },
  death: {
    id: '11111111-1111-1111-1111-111111111115',
    kind: 'thinking' as const,
    name: '死亡',
  },
  major: {
    id: '11111111-1111-1111-1111-111111111116',
    kind: 'thinking' as const,
    name: '重大事件',
  },
  calm: { id: '22222222-2222-2222-2222-222222222222', kind: 'emotion' as const, name: '平静' },
  joy: { id: '22222222-2222-2222-2222-222222222201', kind: 'emotion' as const, name: '喜悦' },
  expect: { id: '22222222-2222-2222-2222-222222222202', kind: 'emotion' as const, name: '期待' },
  moved: { id: '22222222-2222-2222-2222-222222222203', kind: 'emotion' as const, name: '感动' },
  ease: { id: '22222222-2222-2222-2222-222222222204', kind: 'emotion' as const, name: '安心' },
  anxious: { id: '22222222-2222-2222-2222-222222222224', kind: 'emotion' as const, name: '焦虑' },
  tired: { id: '22222222-2222-2222-2222-222222222223', kind: 'emotion' as const, name: '疲惫' },
  down: { id: '22222222-2222-2222-2222-222222222205', kind: 'emotion' as const, name: '失落' },
  anger: { id: '22222222-2222-2222-2222-222222222206', kind: 'emotion' as const, name: '愤怒' },
  lonely: { id: '22222222-2222-2222-2222-222222222207', kind: 'emotion' as const, name: '孤独' },
  lost: { id: '22222222-2222-2222-2222-222222222208', kind: 'emotion' as const, name: '迷茫' },
  tense: { id: '22222222-2222-2222-2222-222222222209', kind: 'emotion' as const, name: '紧张' },
  relief: { id: '22222222-2222-2222-2222-222222222210', kind: 'emotion' as const, name: '释然' },
  wronged: { id: '22222222-2222-2222-2222-222222222211', kind: 'emotion' as const, name: '委屈' },
}

/** 兼容旧 Mock 字段名（自我认知 → 学习成长） */
export const TAGS_LEGACY_SELF = TAGS.learning


function offsets(body: string, quote: string) {
  const start = body.indexOf(quote)
  return { start_offset: start, end_offset: start + quote.length }
}

const body1 =
  '今天开完会后有点空。对着文档改了两小时。把这些碎片留下，以后还能看见自己怎么一步步想明白。'
const qEnergy = '对着文档改了两小时'
const qTopic = '把这些碎片留下'
const o1 = offsets(body1, qEnergy)
const o2 = offsets(body1, qTopic)

type StoreEntry = EntryDetail

/** Demo seed only when VITE_USE_MOCK=true; real-auth mode starts with an empty diary. */
const SEED_ENTRIES: StoreEntry[] = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    title: '关于工作节奏',
    body: body1,
    event_date: '2026-08-29',
    tags: [TAGS.work, TAGS.calm],
    highlights: [
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        kind: 'energy',
        quote_text: qEnergy,
        ...o1,
        engagement: 4,
        drain: 2,
        tags: [],
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        kind: 'topic_emotion',
        quote_text: qTopic,
        ...o2,
        engagement: null,
        drain: null,
        tags: [TAGS.work, TAGS.calm],
      },
    ],
    ai_suggestion: {
      id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      status: 'pending',
      source: 'mock',
      suggested_tags: [TAGS.learning, TAGS.tired],
    },
    created_at: '2026-08-29T10:00:00Z',
    updated_at: '2026-08-29T13:14:00Z',
  },
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab',
    title: '和朋友聊完',
    body: '聊完关系话题后有点紧，夜里反复想自己是不是太敏感。还是把这些想法记下来。',
    event_date: '2026-08-20',
    tags: [TAGS.relation, TAGS.anxious],
    highlights: [
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01',
        kind: 'energy',
        quote_text: '夜里反复想',
        ...offsets(
          '聊完关系话题后有点紧，夜里反复想自己是不是太敏感。还是把这些想法记下来。',
          '夜里反复想',
        ),
        engagement: 4,
        drain: 4,
        tags: [],
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccd',
        kind: 'topic_emotion',
        quote_text: '是不是太敏感',
        ...offsets(
          '聊完关系话题后有点紧，夜里反复想自己是不是太敏感。还是把这些想法记下来。',
          '是不是太敏感',
        ),
        engagement: null,
        drain: null,
        tags: [TAGS.relation, TAGS.anxious],
      },
    ],
    ai_suggestion: null,
    created_at: '2026-08-20T09:00:00Z',
    updated_at: '2026-08-20T21:00:00Z',
  },
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac',
    title: '周末空档',
    body: '整个人提不起劲，像一滩软泥摊在沙发上。没有安排的一天，反而让我看见自己对节奏的依赖。',
    event_date: '2026-08-10',
    tags: [TAGS.life, TAGS.tired],
    highlights: [
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02',
        kind: 'energy',
        quote_text: '像一滩软泥摊在沙发上',
        ...offsets(
          '整个人提不起劲，像一滩软泥摊在沙发上。没有安排的一天，反而让我看见自己对节奏的依赖。',
          '像一滩软泥摊在沙发上',
        ),
        engagement: 1,
        drain: 1.5,
        tags: [],
      },
    ],
    ai_suggestion: null,
    created_at: '2026-08-10T11:00:00Z',
    updated_at: '2026-08-10T18:00:00Z',
  },
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaad',
    title: '书桌与画画',
    body: '整理书桌时很投入。后来画画两小时，整个人轻下来。',
    event_date: '2026-08-18',
    tags: [TAGS.life, TAGS.calm],
    highlights: [
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03',
        kind: 'energy',
        quote_text: '整理书桌时很投入',
        ...offsets('整理书桌时很投入。后来画画两小时，整个人轻下来。', '整理书桌时很投入'),
        engagement: 5,
        drain: 2,
        tags: [],
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04',
        kind: 'energy',
        quote_text: '画画两小时',
        ...offsets('整理书桌时很投入。后来画画两小时，整个人轻下来。', '画画两小时'),
        engagement: 5,
        drain: 1,
        tags: [],
      },
    ],
    ai_suggestion: null,
    created_at: '2026-08-18T10:00:00Z',
    updated_at: '2026-08-18T20:00:00Z',
  },
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaae',
    title: '赶方案的晚上',
    body: '赶方案到很晚，脑子转得快，身体却发沉。',
    event_date: '2026-08-05',
    tags: [TAGS.work, TAGS.tired],
    highlights: [
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb05',
        kind: 'energy',
        quote_text: '赶方案到很晚',
        ...offsets('赶方案到很晚，脑子转得快，身体却发沉。', '赶方案到很晚'),
        engagement: 4.5,
        drain: 4.5,
        tags: [],
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb06',
        kind: 'energy',
        quote_text: '身体却发沉',
        ...offsets('赶方案到很晚，脑子转得快，身体却发沉。', '身体却发沉'),
        engagement: 2,
        drain: 4,
        tags: [],
      },
    ],
    ai_suggestion: null,
    created_at: '2026-08-05T09:00:00Z',
    updated_at: '2026-08-05T23:00:00Z',
  },
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaf',
    title: '路过花店',
    body: '下班路过花店，闻见桂花香，没有特别的结论，只是想记一下。',
    event_date: '2026-08-02',
    tags: [TAGS.life, TAGS.calm],
    highlights: [],
    ai_suggestion: null,
    created_at: '2026-08-02T12:00:00Z',
    updated_at: '2026-08-02T12:30:00Z',
  },
]

const store: StoreEntry[] =
  import.meta.env.VITE_USE_MOCK === 'true'
    ? SEED_ENTRIES.map((e) => structuredClone(e))
    : []

function delay(ms = 120) {
  return new Promise((r) => setTimeout(r, ms))
}

function mergeEntryTags(entry: StoreEntry, incoming: TagRef[]) {
  const map = new Map(entry.tags.map((t) => [t.id, t]))
  for (const t of incoming) map.set(t.id, t)
  entry.tags = [...map.values()]
}

/** 列表/篇级展示：篇级标签 ∪ 话题高亮标签（人工标记）∪ 已采纳的 AI 标签（已在篇级） */
function collectDisplayTags(e: StoreEntry): TagRef[] {
  const map = new Map(e.tags.map((t) => [t.id, t]))
  for (const h of e.highlights) {
    if (h.kind !== 'topic_emotion') continue
    for (const t of h.tags) map.set(t.id, t)
  }
  return [...map.values()]
}

function toListItem(e: StoreEntry): EntryListItem {
  const plain = e.body.replace(/<[^>]+>/g, '')
  return {
    id: e.id,
    title: e.title,
    excerpt: plain.slice(0, 80),
    event_date: e.event_date,
    tags: collectDisplayTags(e),
    updated_at: e.updated_at,
  }
}

export const PRESET_THINKING = [
  TAGS.relation,
  TAGS.emotionTopic,
  TAGS.intimacy,
  TAGS.family,
  TAGS.career,
  TAGS.work,
  TAGS.money,
  TAGS.values,
  TAGS.lifeView,
  TAGS.worldView,
  TAGS.health,
  TAGS.learning,
  TAGS.hobby,
  TAGS.life,
  TAGS.death,
  TAGS.major,
]

export const PRESET_EMOTION = [
  TAGS.calm,
  TAGS.joy,
  TAGS.expect,
  TAGS.moved,
  TAGS.ease,
  TAGS.anxious,
  TAGS.tired,
  TAGS.down,
  TAGS.anger,
  TAGS.lonely,
  TAGS.lost,
  TAGS.tense,
  TAGS.relief,
  TAGS.wronged,
]

export async function mockCreateHighlight(
  entryId: string,
  input: {
    kind: 'energy' | 'topic_emotion'
    quote_text: string
    engagement?: number
    drain?: number
    tags?: TagRef[]
  },
): Promise<HighlightDTO> {
  await delay()
  // Entries may already be on the real API while highlights are still Mock:
  // tolerate missing mock-store entry and return a local highlight DTO.
  const entry = store.find((e) => e.id === entryId)
  const plain = (entry?.body ?? input.quote_text).replace(/<[^>]+>/g, '')
  const start = plain.indexOf(input.quote_text)
  const hl: HighlightDTO = {
    id: crypto.randomUUID(),
    kind: input.kind,
    quote_text: input.quote_text,
    start_offset: start >= 0 ? start : 0,
    end_offset:
      start >= 0 ? start + input.quote_text.length : input.quote_text.length,
    engagement: input.kind === 'energy' ? (input.engagement ?? 0) : null,
    drain: input.kind === 'energy' ? (input.drain ?? 0) : null,
    tags: input.kind === 'topic_emotion' ? (input.tags ?? []) : [],
  }
  if (entry) {
    entry.highlights.push(hl)
    if (hl.kind === 'topic_emotion' && hl.tags.length) {
      mergeEntryTags(entry, hl.tags)
    }
    entry.updated_at = new Date().toISOString()
  }
  return structuredClone(hl)
}

export async function mockListEntries(): Promise<EntryListData> {
  await delay()
  const items = [...store]
    .sort((a, b) => b.event_date.localeCompare(a.event_date))
    .map(toListItem)
  return { items, total: items.length, page: 1, page_size: 20 }
}

export async function mockGetEntry(id: string): Promise<EntryDetail> {
  await delay()
  const entry = store.find((e) => e.id === id)
  if (!entry) {
    const err = new Error('日记不存在') as Error & { code: number }
    err.code = 40401
    throw err
  }
  return structuredClone(entry)
}

export async function mockCreateEntry(input: {
  title: string
  body: string
  event_date: string
}): Promise<EntryDetail> {
  await delay()
  const entry: StoreEntry = {
    id: crypto.randomUUID(),
    title: input.title || '无标题',
    body: input.body,
    event_date: input.event_date,
    tags: [],
    highlights: [],
    ai_suggestion: {
      id: crypto.randomUUID(),
      status: 'pending',
      source: 'mock',
      suggested_tags: [TAGS.learning],
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  store.unshift(entry)
  return structuredClone(entry)
}

export async function mockUpdateEntry(
  id: string,
  patch: Partial<{ title: string; body: string; event_date: string; tags: TagRef[] }>,
): Promise<EntryDetail> {
  await delay()
  const entry = store.find((e) => e.id === id)
  if (!entry) {
    const err = new Error('日记不存在') as Error & { code: number }
    err.code = 40401
    throw err
  }
  if (patch.title !== undefined) entry.title = patch.title
  if (patch.body !== undefined) entry.body = patch.body
  if (patch.event_date !== undefined) entry.event_date = patch.event_date
  if (patch.tags !== undefined) entry.tags = patch.tags
  entry.updated_at = new Date().toISOString()
  return structuredClone(entry)
}

export async function mockDeleteEntry(id: string): Promise<{ ok: true }> {
  await delay()
  const idx = store.findIndex((e) => e.id === id)
  if (idx < 0) {
    const err = new Error('日记不存在') as Error & { code: number }
    err.code = 40401
    throw err
  }
  store.splice(idx, 1)
  return { ok: true }
}

export async function mockUpdateHighlight(
  id: string,
  patch: Partial<HighlightDTO>,
): Promise<HighlightDTO> {
  await delay()
  for (const entry of store) {
    const hl = entry.highlights.find((h) => h.id === id)
    if (!hl) continue
    Object.assign(hl, patch)
    if (hl.kind === 'topic_emotion' && patch.tags) {
      mergeEntryTags(entry, hl.tags)
    }
    entry.updated_at = new Date().toISOString()
    return structuredClone(hl)
  }
  // Local-only highlight (real entry + mock highlights cutover): echo patch.
  return {
    id,
    kind: patch.kind ?? 'energy',
    quote_text: patch.quote_text ?? '',
    start_offset: patch.start_offset ?? 0,
    end_offset: patch.end_offset ?? 0,
    engagement: patch.engagement ?? null,
    drain: patch.drain ?? null,
    tags: patch.tags ?? [],
  }
}

export async function mockAcceptAi(
  entryId: string,
  suggestionId: string,
  tagIds?: string[],
): Promise<{ status: 'accepted'; tags: TagRef[] }> {
  await delay()
  const entry = store.find((e) => e.id === entryId)
  if (!entry?.ai_suggestion || entry.ai_suggestion.id !== suggestionId) {
    const err = new Error('建议不存在') as Error & { code: number }
    err.code = 40401
    throw err
  }
  const suggested = entry.ai_suggestion.suggested_tags
  const allow = tagIds?.length
    ? suggested.filter((t) => tagIds.includes(t.id))
    : suggested
  const map = new Map(entry.tags.map((t) => [t.id, t]))
  for (const t of allow) map.set(t.id, t)
  entry.tags = [...map.values()]
  entry.ai_suggestion = { ...entry.ai_suggestion, status: 'accepted' }
  entry.updated_at = new Date().toISOString()
  return { status: 'accepted', tags: structuredClone(entry.tags) }
}

export async function mockDismissAi(
  entryId: string,
  suggestionId: string,
): Promise<{ status: 'dismissed' }> {
  await delay()
  const entry = store.find((e) => e.id === entryId)
  if (!entry?.ai_suggestion || entry.ai_suggestion.id !== suggestionId) {
    const err = new Error('建议不存在') as Error & { code: number }
    err.code = 40401
    throw err
  }
  entry.ai_suggestion = { ...entry.ai_suggestion, status: 'dismissed' }
  return { status: 'dismissed' }
}

export type { AiSuggestionDTO }
