import api, { shouldMock, toApiError } from '@/services/api'
import {
  mockCreateEntry,
  mockDeleteEntry,
  mockGetEntry,
  mockListEntries,
  mockUpdateEntry,
} from '@/mocks/entries'
import type { EntryDetail, EntryListData, TagRef } from '@/types/entry'

export type ListEntriesParams = {
  page?: number
  page_size?: number
  tag_ids?: string[]
  event_date_from?: string
  event_date_to?: string
}

export async function listEntries(
  params: ListEntriesParams = {},
): Promise<EntryListData> {
  if (shouldMock('entries')) return mockListEntries()
  try {
    const { data } = await api.get('/entries', {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? 50,
        tag_ids: params.tag_ids?.length ? params.tag_ids.join(',') : undefined,
        event_date_from: params.event_date_from,
        event_date_to: params.event_date_to,
      },
    })
    return data.data as EntryListData
  } catch (e) {
    throw toApiError(e)
  }
}

export async function getEntry(id: string): Promise<EntryDetail> {
  if (shouldMock('entries')) return mockGetEntry(id)
  try {
    const { data } = await api.get(`/entries/${id}`)
    return data.data as EntryDetail
  } catch (e) {
    throw toApiError(e)
  }
}

export async function createEntry(input: {
  title: string
  body: string
  event_date: string
  tag_ids?: string[]
}): Promise<EntryDetail> {
  if (shouldMock('entries')) return mockCreateEntry(input)
  try {
    const { data } = await api.post('/entries', input)
    return data.data as EntryDetail
  } catch (e) {
    throw toApiError(e)
  }
}

export async function updateEntry(
  id: string,
  patch: Partial<{ title: string; body: string; event_date: string; tags: TagRef[] }>,
): Promise<EntryDetail> {
  if (shouldMock('entries')) return mockUpdateEntry(id, patch)
  try {
    const body = {
      title: patch.title,
      body: patch.body,
      event_date: patch.event_date,
      tag_ids: patch.tags?.map((t) => t.id),
    }
    const { data } = await api.patch(`/entries/${id}`, body)
    return data.data as EntryDetail
  } catch (e) {
    throw toApiError(e)
  }
}

export async function deleteEntry(id: string): Promise<void> {
  if (shouldMock('entries')) {
    await mockDeleteEntry(id)
    return
  }
  try {
    await api.delete(`/entries/${id}`)
  } catch (e) {
    throw toApiError(e)
  }
}
