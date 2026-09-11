export type ImportStatus =
  | 'uploaded'
  | 'parsing'
  | 'preview'
  | 'committed'
  | 'failed'

export type ImportPreviewEntry = {
  temp_id: string
  title: string
  event_date: string
  date_inferred: boolean
  excerpt: string
  body: string
}

export type ImportJob = {
  id: string
  filename: string
  status: ImportStatus
  error_message: string | null
  preview: {
    entry_count: number
    entries: ImportPreviewEntry[]
  } | null
  created_at: string
}

export type ImportCommitResult = {
  status: 'committed'
  created_entry_ids: string[]
  failed: { temp_id: string; reason: string }[]
}
