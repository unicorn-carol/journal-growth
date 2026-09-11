import api, { shouldMock, toApiError } from '@/services/api'
import { mockCreateHighlight, mockUpdateHighlight } from '@/mocks/entries'
import type { HighlightDTO, TagRef } from '@/types/entry'

export async function createHighlight(
  entryId: string,
  input: {
    kind: 'energy' | 'topic_emotion'
    quote_text: string
    engagement?: number
    drain?: number
    tags?: TagRef[]
    start_offset?: number
    end_offset?: number
  },
): Promise<HighlightDTO> {
  if (shouldMock('highlights')) return mockCreateHighlight(entryId, input)
  try {
    const { data } = await api.post(`/entries/${entryId}/highlights`, {
      kind: input.kind,
      quote_text: input.quote_text,
      start_offset: input.start_offset ?? 0,
      end_offset: input.end_offset ?? input.quote_text.length,
      engagement: input.engagement,
      drain: input.drain,
      tag_ids: input.tags?.map((t) => t.id),
    })
    return data.data as HighlightDTO
  } catch (e) {
    throw toApiError(e)
  }
}

export async function updateHighlight(
  id: string,
  patch: Partial<HighlightDTO>,
): Promise<HighlightDTO> {
  if (shouldMock('highlights')) return mockUpdateHighlight(id, patch)
  try {
    const { data } = await api.patch(`/highlights/${id}`, {
      quote_text: patch.quote_text,
      start_offset: patch.start_offset,
      end_offset: patch.end_offset,
      engagement: patch.engagement,
      drain: patch.drain,
      tag_ids: patch.tags?.map((t) => t.id),
    })
    return data.data as HighlightDTO
  } catch (e) {
    throw toApiError(e)
  }
}

export async function deleteHighlight(id: string): Promise<void> {
  if (shouldMock('highlights')) {
    // Mock path: no-op store delete; caller removes from local detail.
    return
  }
  try {
    await api.delete(`/highlights/${id}`)
  } catch (e) {
    throw toApiError(e)
  }
}
