import api, { shouldMock, toApiError } from '@/services/api'
import {
  mockCreateTag,
  mockDeleteTag,
  mockListTags,
  mockUpdateTag,
} from '@/mocks/tags'
import type { TagDTO } from '@/types/insight'
import type { TagKind } from '@/types/entry'

export async function listTags(kind?: TagKind): Promise<TagDTO[]> {
  if (shouldMock('tags')) {
    const data = await mockListTags(kind)
    return data.items
  }
  try {
    const { data } = await api.get('/tags', { params: kind ? { kind } : undefined })
    return (data.data.items ?? []) as TagDTO[]
  } catch (e) {
    throw toApiError(e)
  }
}

export async function createTag(input: {
  kind: TagKind
  name: string
  color?: string | null
  shape?: string | null
}): Promise<TagDTO> {
  if (shouldMock('tags')) return mockCreateTag(input)
  try {
    const { data } = await api.post('/tags', input)
    return data.data as TagDTO
  } catch (e) {
    throw toApiError(e)
  }
}

export async function updateTag(
  id: string,
  patch: Partial<Pick<TagDTO, 'name' | 'color' | 'shape' | 'sort_order'>>,
): Promise<TagDTO> {
  if (shouldMock('tags')) return mockUpdateTag(id, patch)
  try {
    const { data } = await api.patch(`/tags/${id}`, patch)
    return data.data as TagDTO
  } catch (e) {
    throw toApiError(e)
  }
}

export async function deleteTag(id: string): Promise<void> {
  if (shouldMock('tags')) {
    await mockDeleteTag(id)
    return
  }
  try {
    await api.delete(`/tags/${id}`)
  } catch (e) {
    throw toApiError(e)
  }
}

export type TagUsageDTO = {
  entry_count: number
  highlight_count: number
  content_count: number
}

export async function getTagUsage(id: string): Promise<TagUsageDTO> {
  if (shouldMock('tags')) {
    return { entry_count: 0, highlight_count: 0, content_count: 0 }
  }
  try {
    const { data } = await api.get(`/tags/${id}/usage`)
    return data.data as TagUsageDTO
  } catch (e) {
    throw toApiError(e)
  }
}
