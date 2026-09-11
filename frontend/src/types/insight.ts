import type { TagKind, TagRef } from '@/types/entry'

export type TagDTO = TagRef & {
  color: string | null
  shape: string | null
  sort_order: number
  is_system_default: boolean
}

export type SelfAwarenessItem = {
  entry_id: string
  highlight_id: string | null
  event_date: string
  title: string
  excerpt: string
  tag_names: string[]
}

export type SelfAwarenessData = {
  filter_tag: (TagRef & { kind: TagKind }) | null
  items: SelfAwarenessItem[]
  total: number
  page: number
  page_size: number
}

export type QuadrantId =
  | 'high_focus_low_drain'
  | 'high_focus_high_drain'
  | 'low_focus_low_drain'
  | 'low_focus_high_drain'

export type GoodTimesPoint = {
  highlight_id: string
  entry_id: string
  title: string
  quote_text: string
  engagement: number
  drain: number
  quadrant: QuadrantId
  event_date: string
}

export type GoodTimesData = {
  engagement_split: number
  drain_split: number
  points: GoodTimesPoint[]
  slices: GoodTimesPoint[]
}

export type QuadrantNote = {
  id: string
  quadrant: QuadrantId
  body: string
  created_at: string
  updated_at: string
}
