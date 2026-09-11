import api, { shouldMock } from '@/services/api'
import {
  mockCommitImport,
  mockCreateImport,
  mockGetImport,
  mockPatchImportPreview,
  mockSimulateImport,
} from '@/mocks/imports'
import type { ImportCommitResult, ImportJob } from '@/types/import'

export async function createImport(file: File): Promise<ImportJob> {
  if (shouldMock('imports')) return mockCreateImport(file)
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/imports', form)
  return data.data as ImportJob
}

export async function simulateImport(): Promise<ImportJob> {
  if (shouldMock('imports')) return mockSimulateImport()
  throw new Error('真实环境请选择文件上传')
}

export async function getImport(id: string): Promise<ImportJob> {
  if (shouldMock('imports')) return mockGetImport(id)
  const { data } = await api.get(`/imports/${id}`)
  return data.data as ImportJob
}

export async function patchImportPreview(
  id: string,
  entries: { temp_id: string; title?: string; event_date?: string }[],
): Promise<ImportJob> {
  if (shouldMock('imports')) return mockPatchImportPreview(id, entries)
  const { data } = await api.patch(`/imports/${id}/preview`, { entries })
  return data.data as ImportJob
}

export async function commitImport(id: string): Promise<ImportCommitResult> {
  if (shouldMock('imports')) return mockCommitImport(id)
  const { data } = await api.post(`/imports/${id}/commit`, { confirm: true })
  return data.data as ImportCommitResult
}
