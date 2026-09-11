import api, { shouldMock, toApiError } from '@/services/api'
import { mockAcceptAi, mockDismissAi } from '@/mocks/entries'
import type { AiSuggestionDTO, TagRef } from '@/types/entry'

export async function requestAiSuggestion(
  entryId: string,
  force = true,
): Promise<NonNullable<AiSuggestionDTO>> {
  if (shouldMock('ai')) {
    // Mock entries already attach a pending suggestion on create; synthesize one.
    return {
      id: crypto.randomUUID(),
      status: 'pending',
      source: 'mock',
      suggested_tags: [],
    }
  }
  try {
    const { data } = await api.post(`/entries/${entryId}/ai-tag-suggestions`, {
      force,
    })
    return data.data as NonNullable<AiSuggestionDTO>
  } catch (e) {
    throw toApiError(e)
  }
}

export async function acceptAiSuggestion(
  entryId: string,
  suggestionId: string,
  tagIds?: string[],
): Promise<{ status: 'accepted'; tags: TagRef[] }> {
  if (shouldMock('ai')) return mockAcceptAi(entryId, suggestionId, tagIds)
  try {
    const { data } = await api.post(
      `/entries/${entryId}/ai-tag-suggestions/${suggestionId}/accept`,
      tagIds?.length ? { tag_ids: tagIds } : {},
    )
    return data.data as { status: 'accepted'; tags: TagRef[] }
  } catch (e) {
    throw toApiError(e)
  }
}

export async function dismissAiSuggestion(
  entryId: string,
  suggestionId: string,
): Promise<{ status: 'dismissed' }> {
  if (shouldMock('ai')) return mockDismissAi(entryId, suggestionId)
  try {
    const { data } = await api.post(
      `/entries/${entryId}/ai-tag-suggestions/${suggestionId}/dismiss`,
    )
    return data.data as { status: 'dismissed' }
  } catch (e) {
    throw toApiError(e)
  }
}
