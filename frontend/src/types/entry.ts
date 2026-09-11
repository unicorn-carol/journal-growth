export type TagKind = 'thinking' | 'emotion'

export type TagRef = {
  id: string
  kind: TagKind
  name: string
}

export type EntryListItem = {
  id: string
  title: string
  excerpt: string
  event_date: string
  tags: TagRef[]
  updated_at: string
}

export type HighlightDTO = {
  id: string
  kind: 'energy' | 'topic_emotion'
  quote_text: string
  start_offset: number
  end_offset: number
  engagement: number | null
  drain: number | null
  tags: TagRef[]
}

export type AiSuggestionDTO = {
  id: string
  status: 'pending' | 'accepted' | 'dismissed'
  source: 'mock' | 'deepseek'
  suggested_tags: TagRef[]
} | null

export type EntryDetail = {
  id: string
  title: string
  body: string
  event_date: string
  tags: TagRef[]
  highlights: HighlightDTO[]
  ai_suggestion: AiSuggestionDTO
  created_at: string
  updated_at: string
}

export type EntryListData = {
  items: EntryListItem[]
  total: number
  page: number
  page_size: number
}
