import type {
  ImportJob,
  ImportPreviewEntry,
  ImportCommitResult,
} from '@/types/import'
import { mockCreateEntry } from '@/mocks/entries'
import { fileToPreviewEntries } from '@/utils/importParse'

function delay(ms = 120) {
  return new Promise((r) => setTimeout(r, ms))
}

const jobs = new Map<string, ImportJob>()

const SAMPLE_ENTRIES: ImportPreviewEntry[] = [
  {
    temp_id: 't1',
    title: '关于工作节奏',
    event_date: '2026-08-29',
    date_inferred: true,
    excerpt: '今天开完会后有点空……',
    body: '# 关于工作节奏\n今天开完会后有点空……',
  },
  {
    temp_id: 't2',
    title: '整理书桌',
    event_date: '2026-08-18',
    date_inferred: true,
    excerpt: '整理书桌时很投入……',
    body: '# 整理书桌\n整理书桌时很投入……',
  },
  {
    temp_id: 't3',
    title: '路过花店',
    event_date: '2026-08-02',
    date_inferred: false,
    excerpt: '下班路过花店，闻见桂花香……',
    body: '# 路过花店\n下班路过花店，闻见桂花香……',
  },
]

function finishPreview(id: string, entries: ImportPreviewEntry[]) {
  const current = jobs.get(id)
  if (!current || current.status !== 'parsing') return
  current.status = 'preview'
  current.preview = {
    entry_count: entries.length,
    entries: structuredClone(entries),
  }
  jobs.set(id, current)
}

function finishFailed(id: string, message: string) {
  const current = jobs.get(id)
  if (!current || current.status !== 'parsing') return
  current.status = 'failed'
  current.error_message = message
  current.preview = null
  jobs.set(id, current)
}

export async function mockCreateImport(file: File): Promise<ImportJob> {
  await delay()
  const name = file.name.toLowerCase()
  const ok =
    name.endsWith('.md') ||
    name.endsWith('.markdown') ||
    name.endsWith('.txt') ||
    name.endsWith('.docx') ||
    name.endsWith('.zip')
  if (name.includes('.') && !ok) {
    const err = new Error('不支持的文件类型') as Error & { code: number }
    err.code = 40001
    throw err
  }

  const id = crypto.randomUUID()
  const job: ImportJob = {
    id,
    filename: file.name || 'meeting-notes.md',
    status: 'parsing',
    error_message: null,
    preview: null,
    created_at: new Date().toISOString(),
  }
  jobs.set(id, job)

  // 真正读取文件并解析（Mock 阶段前端解析；后端联调任务再切服务端）
  void (async () => {
    await delay(400)
    try {
      // 「模拟上传」用的极小 demo 文件仍走样例，避免空内容
      if (file.name === 'meeting-notes.md' && file.size < 32) {
        finishPreview(id, SAMPLE_ENTRIES)
        return
      }
      const entries = await fileToPreviewEntries(file)
      finishPreview(id, entries)
    } catch (e) {
      finishFailed(id, (e as Error).message || '解析失败')
    }
  })()

  return structuredClone(job)
}

export async function mockGetImport(id: string): Promise<ImportJob> {
  await delay(80)
  const job = jobs.get(id)
  if (!job) {
    const err = new Error('导入任务不存在') as Error & { code: number }
    err.code = 40401
    throw err
  }
  return structuredClone(job)
}

export async function mockPatchImportPreview(
  id: string,
  entries: { temp_id: string; title?: string; event_date?: string }[],
): Promise<ImportJob> {
  await delay()
  const job = jobs.get(id)
  if (!job || job.status !== 'preview' || !job.preview) {
    const err = new Error('当前状态不可编辑预览') as Error & { code: number }
    err.code = 40001
    throw err
  }
  for (const patch of entries) {
    const row = job.preview.entries.find((e) => e.temp_id === patch.temp_id)
    if (!row) continue
    if (patch.title !== undefined) row.title = patch.title
    if (patch.event_date !== undefined) row.event_date = patch.event_date
  }
  return structuredClone(job)
}

export async function mockCommitImport(id: string): Promise<ImportCommitResult> {
  await delay(200)
  const job = jobs.get(id)
  if (!job || job.status !== 'preview' || !job.preview) {
    const err = new Error('当前状态不可提交') as Error & { code: number }
    err.code = 40001
    throw err
  }
  const created: string[] = []
  const failed: { temp_id: string; reason: string }[] = []
  for (const row of job.preview.entries) {
    if (!row.body.trim()) {
      failed.push({ temp_id: row.temp_id, reason: '正文为空' })
      continue
    }
    const entry = await mockCreateEntry({
      title: row.title,
      body: row.body,
      event_date: row.event_date,
    })
    created.push(entry.id)
  }
  job.status = 'committed'
  jobs.set(id, job)
  return {
    status: 'committed',
    created_entry_ids: created,
    failed,
  }
}

/** 无真实文件时的一键模拟上传 */
export async function mockSimulateImport(): Promise<ImportJob> {
  const blob = new File(['# demo'], 'meeting-notes.md', { type: 'text/markdown' })
  return mockCreateImport(blob)
}
