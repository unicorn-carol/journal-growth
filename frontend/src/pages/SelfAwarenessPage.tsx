import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, message } from 'antd'
import { fetchSelfAwareness } from '@/services/insightService'
import { listTags } from '@/services/tagService'
import { TagPill } from '@/components/TagPill'
import {
  colorForTag,
  selectableNeutralStyle,
  selectableTagStyle,
} from '@/utils/tagColors'
import type { SelfAwarenessItem } from '@/types/insight'
import type { TagDTO } from '@/types/insight'
import './SelfAwarenessPage.css'

const ALL_ID = 'all'

export function SelfAwarenessPage() {
  const navigate = useNavigate()
  const [tags, setTags] = useState<TagDTO[]>([])
  const [activeTag, setActiveTag] = useState(ALL_ID)
  const [items, setItems] = useState<SelfAwarenessItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const thinking = await listTags('thinking')
        if (cancelled) return
        setTags(thinking)
        // 验收默认演示「工作状态」
        const work = thinking.find((t) => t.name === '工作状态')
        setActiveTag(work?.id ?? ALL_ID)
      } catch (e) {
        message.error((e as Error).message || '加载话题失败')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const data = await fetchSelfAwareness({
          tag_id: activeTag,
          page: 1,
          page_size: 20,
        })
        if (cancelled) return
        setItems(data.items)
      } catch (e) {
        message.error((e as Error).message || '加载时间线失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeTag])

  const openItem = (item: SelfAwarenessItem) => {
    const q = new URLSearchParams({ entry_id: item.entry_id })
    if (item.highlight_id) q.set('highlight_id', item.highlight_id)
    navigate(`/diary?${q.toString()}`)
  }

  return (
    <div className="self-page">
      <h2 className="page-title">自我认知</h2>
      <p className="page-sub">按话题横向筛选，下方用时间线回看相关想法。</p>

      <div className="topic-bar" role="tablist" aria-label="思考话题">
        <button
          type="button"
          role="tab"
          aria-selected={activeTag === ALL_ID}
          className={activeTag === ALL_ID ? 'on' : undefined}
          style={selectableNeutralStyle(activeTag === ALL_ID)}
          onClick={() => setActiveTag(ALL_ID)}
        >
          全部
        </button>
        {tags.map((t) => {
          const on = activeTag === t.id
          const color = colorForTag(t.name, t.color, 'thinking')
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={on ? 'on' : undefined}
              style={selectableTagStyle(color, on, 'thinking')}
              onClick={() => setActiveTag(t.id)}
            >
              {t.name}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="self-empty">加载中…</div>
      ) : items.length === 0 ? (
        <div className="self-empty">
          <p>这个话题下还没有想法摘录。</p>
          <Button type="primary" onClick={() => navigate('/diary')}>
            去日记标注
          </Button>
        </div>
      ) : (
        items.map((item) => (
          <article
            key={`${item.entry_id}-${item.highlight_id ?? 'body'}`}
            className="timeline-card"
            onClick={() => openItem(item)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openItem(item)
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="when">
              {item.event_date}
              {item.title ? ` · ${item.title}` : ''}
            </div>
            <div className="text">「{item.excerpt}」</div>
            {item.tag_names.length > 0 ? (
              <div className="timeline-tags">
                {item.tag_names.map((name) => {
                  const meta = tags.find((t) => t.name === name)
                  return (
                    <TagPill
                      key={name}
                      name={name}
                      color={meta?.color}
                      kind="thinking"
                    />
                  )
                })}
              </div>
            ) : null}
          </article>
        ))
      )}
    </div>
  )
}
