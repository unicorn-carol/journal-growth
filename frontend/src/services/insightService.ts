import api, { shouldMock } from '@/services/api'
import {
  mockSelfAwareness,
  mockGoodTimes,
  mockListQuadrantNotes,
  mockCreateQuadrantNote,
  mockUpdateQuadrantNote,
} from '@/mocks/insights'
import type {
  SelfAwarenessData,
  GoodTimesData,
  QuadrantId,
  QuadrantNote,
} from '@/types/insight'

export async function fetchSelfAwareness(params: {
  tag_id?: string
  page?: number
  page_size?: number
}): Promise<SelfAwarenessData> {
  if (shouldMock('self-awareness')) return mockSelfAwareness(params)
  const { data } = await api.get('/insights/self-awareness', {
    params: {
      tag_id: params.tag_id ?? 'all',
      page: params.page ?? 1,
      page_size: params.page_size ?? 20,
    },
  })
  return data.data as SelfAwarenessData
}

export async function fetchGoodTimes(params: {
  limit_entries?: number
  engagement_split?: number
  drain_split?: number
  quadrant?: QuadrantId
  sort?: 'asc' | 'desc'
}): Promise<GoodTimesData> {
  if (shouldMock('good-times')) return mockGoodTimes(params)
  const { data } = await api.get('/insights/good-times', { params })
  return data.data as GoodTimesData
}

export async function listQuadrantNotes(quadrant?: QuadrantId): Promise<QuadrantNote[]> {
  if (shouldMock('good-times')) {
    const data = await mockListQuadrantNotes(quadrant)
    return data.items
  }
  const { data } = await api.get('/insights/quadrant-notes', {
    params: quadrant ? { quadrant } : undefined,
  })
  return (data.data.items ?? []) as QuadrantNote[]
}

export async function createQuadrantNote(input: {
  quadrant: QuadrantId
  body: string
}): Promise<QuadrantNote> {
  if (shouldMock('good-times')) return mockCreateQuadrantNote(input)
  const { data } = await api.post('/insights/quadrant-notes', input)
  return data.data as QuadrantNote
}

export async function updateQuadrantNote(
  id: string,
  patch: { body?: string; quadrant?: QuadrantId },
): Promise<QuadrantNote> {
  if (shouldMock('good-times')) return mockUpdateQuadrantNote(id, patch)
  const { data } = await api.patch(`/insights/quadrant-notes/${id}`, patch)
  return data.data as QuadrantNote
}
