import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, InputNumber, Modal, message } from 'antd'
import {
  createQuadrantNote,
  fetchGoodTimes,
  listQuadrantNotes,
  updateQuadrantNote,
} from '@/services/insightService'
import type { GoodTimesPoint, QuadrantId, QuadrantNote } from '@/types/insight'
import { ClayEnergyInline } from '@/components/icons/ClayIcons'
import './GoodTimesPage.css'

const QUADRANTS: { id: QuadrantId; label: string }[] = [
  { id: 'high_focus_low_drain', label: '高专注 · 低消耗' },
  { id: 'high_focus_high_drain', label: '高专注 · 高消耗' },
  { id: 'low_focus_low_drain', label: '低专注 · 低消耗' },
  { id: 'low_focus_high_drain', label: '低专注 · 高消耗' },
]

function formatMd(date: string) {
  return date.slice(5)
}

function formatNoteTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

function dotPosition(
  point: GoodTimesPoint,
  engagementSplit: number,
  drainSplit: number,
): { left: string; top: string } {
  const max = 5
  let xNorm: number
  let yNorm: number
  if (point.quadrant.includes('high_drain')) {
    xNorm = (point.drain - drainSplit) / Math.max(max - drainSplit, 0.01)
  } else {
    xNorm = point.drain / Math.max(drainSplit, 0.01)
  }
  if (point.quadrant.includes('high_focus')) {
    yNorm = (point.engagement - engagementSplit) / Math.max(max - engagementSplit, 0.01)
  } else {
    yNorm = point.engagement / Math.max(engagementSplit, 0.01)
  }
  xNorm = Math.min(1, Math.max(0, xNorm))
  yNorm = Math.min(1, Math.max(0, yNorm))
  return {
    left: `${12 + xNorm * 76}%`,
    top: `${78 - yNorm * 66}%`,
  }
}

export function GoodTimesPage() {
  const navigate = useNavigate()
  const [activeQuad, setActiveQuad] = useState<QuadrantId>('high_focus_low_drain')
  const [sort, setSort] = useState<'asc' | 'desc'>('desc')
  const [limit, setLimit] = useState(10)
  const [limitOpen, setLimitOpen] = useState(false)
  const [draftLimit, setDraftLimit] = useState(10)
  const [points, setPoints] = useState<GoodTimesPoint[]>([])
  const [slices, setSlices] = useState<GoodTimesPoint[]>([])
  const [splitE, setSplitE] = useState(2.5)
  const [splitD, setSplitD] = useState(2.5)
  const [notes, setNotes] = useState<QuadrantNote[]>([])
  const [noteDraft, setNoteDraft] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [activePointId, setActivePointId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [noteSaving, setNoteSaving] = useState(false)

  const activeLabel =
    QUADRANTS.find((q) => q.id === activeQuad)?.label ?? '高专注 · 低消耗'

  const loadChart = async (quad: QuadrantId, nextSort = sort, nextLimit = limit) => {
    const data = await fetchGoodTimes({
      limit_entries: nextLimit,
      quadrant: quad,
      sort: nextSort,
    })
    setPoints(data.points)
    setSlices(data.slices)
    setSplitE(data.engagement_split)
    setSplitD(data.drain_split)
  }

  const loadNotes = async (quad: QuadrantId) => {
    const items = await listQuadrantNotes(quad)
    setNotes(items)
    const first = items[0]
    if (first) {
      setEditingNoteId(first.id)
      setNoteDraft(first.body)
    } else {
      setEditingNoteId(null)
      setNoteDraft('')
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        await loadChart(activeQuad)
        if (cancelled) return
        await loadNotes(activeQuad)
      } catch (e) {
        message.error((e as Error).message || '加载失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectQuadrant = async (quad: QuadrantId) => {
    setActiveQuad(quad)
    setActivePointId(null)
    setLoading(true)
    try {
      await loadChart(quad)
      await loadNotes(quad)
    } catch (e) {
      message.error((e as Error).message || '切换失败')
    } finally {
      setLoading(false)
    }
  }

  const selectPoint = async (point: GoodTimesPoint) => {
    setActivePointId(point.highlight_id)
    if (point.quadrant !== activeQuad) {
      await selectQuadrant(point.quadrant)
      setActivePointId(point.highlight_id)
    }
  }

  const toggleSort = async () => {
    const next = sort === 'desc' ? 'asc' : 'desc'
    setSort(next)
    await loadChart(activeQuad, next, limit)
  }

  const saveNote = async () => {
    const body = noteDraft.trim()
    if (!body) {
      message.warning('请先写下观察')
      return
    }
    setNoteSaving(true)
    try {
      if (editingNoteId) {
        const updated = await updateQuadrantNote(editingNoteId, { body })
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
        message.success('观察已更新')
      } else {
        const created = await createQuadrantNote({ quadrant: activeQuad, body })
        setNotes((prev) => [created, ...prev])
        setEditingNoteId(created.id)
        message.success('观察已保存')
      }
    } catch (e) {
      message.error((e as Error).message || '保存失败')
    } finally {
      setNoteSaving(false)
    }
  }

  const openSlice = (point: GoodTimesPoint) => {
    const q = new URLSearchParams({
      entry_id: point.entry_id,
      highlight_id: point.highlight_id,
    })
    navigate(`/diary?${q.toString()}`)
  }

  const displayedSlices = useMemo(() => {
    if (!activePointId) return slices
    const hit = slices.filter((s) => s.highlight_id === activePointId)
    return hit.length > 0 ? hit : slices
  }, [slices, activePointId])

  return (
    <div className="good-page">
      <h2 className="page-title">美好时光</h2>
      <p className="page-sub">上四宫格，下切片列表；另可为每个象限记录观察与共性。</p>

      <div className="quad-wrap">
        <div className="quad-tools">
          <span className="range-pill">默认近 {limit} 篇</span>
          <button
            type="button"
            className="btn-soft"
            onClick={() => {
              setDraftLimit(limit)
              setLimitOpen(true)
            }}
          >
            改篇数
          </button>
          <button type="button" className="btn-soft" onClick={toggleSort}>
            {sort === 'desc' ? '切片倒序' : '切片正序'}
          </button>
        </div>
        <div className="quad-grid">
          {QUADRANTS.map((q) => (
            <div
              key={q.id}
              className={`quad-cell${activeQuad === q.id ? ' active' : ''}`}
              onClick={() => selectQuadrant(q.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  selectQuadrant(q.id)
                }
              }}
            >
              <div className="name">{q.label}</div>
              {points
                .filter((p) => p.quadrant === q.id)
                .map((p) => {
                  const pos = dotPosition(p, splitE, splitD)
                  return (
                    <button
                      key={p.highlight_id}
                      type="button"
                      className={`quad-dot${
                        p.quadrant.includes('high_drain') ? ' drain' : ''
                      }${activePointId === p.highlight_id ? ' on' : ''}`}
                      style={{ left: pos.left, top: pos.top }}
                      title={p.quote_text}
                      onClick={(e) => {
                        e.stopPropagation()
                        void selectPoint(p)
                      }}
                    />
                  )
                })}
            </div>
          ))}
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <h5>
            切片 · {activeLabel}
            {loading ? ' …' : ''}
          </h5>
          {displayedSlices.length === 0 ? (
            <div className="empty-hint">
              <p>这个象限暂时没有能量标记。</p>
              <Button type="link" onClick={() => navigate('/diary')}>
                去日记标注能量
              </Button>
            </div>
          ) : (
            displayedSlices.map((s) => (
              <button
                key={s.highlight_id}
                type="button"
                className={`slice${activePointId === s.highlight_id ? ' on' : ''}`}
                onClick={() => openSlice(s)}
              >
                {formatMd(s.event_date)} · 「{s.quote_text}」 ·{' '}
                <ClayEnergyInline value={s.engagement} kind="heart" size={12} />{' '}
                <ClayEnergyInline value={s.drain} kind="bolt" size={12} />
              </button>
            ))
          )}
        </div>

        <div className="panel">
          <h5>象限观察记录</h5>
          <div className="zone-line">
            当前归属：<strong>{activeLabel}</strong>
          </div>
          <textarea
            className="note-input"
            placeholder="记录这个象限里的共性或想法…"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
          />
          <div className="note-actions">
            <Button type="primary" loading={noteSaving} onClick={() => void saveNote()}>
              保存观察
            </Button>
          </div>
          {notes.map((n) => (
            <div
              key={n.id}
              className={`note-item${editingNoteId === n.id ? ' editing' : ''}`}
              onClick={() => {
                setEditingNoteId(n.id)
                setNoteDraft(n.body)
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setEditingNoteId(n.id)
                  setNoteDraft(n.body)
                }
              }}
            >
              <div className="note-time">
                提交于 {formatNoteTime(n.updated_at || n.created_at)}
              </div>
              <div className="note-body">{n.body}</div>
            </div>
          ))}
        </div>
      </div>

      <Modal
        title="改篇数"
        open={limitOpen}
        onCancel={() => setLimitOpen(false)}
        onOk={async () => {
          const next = draftLimit || 10
          setLimit(next)
          setLimitOpen(false)
          await loadChart(activeQuad, sort, next)
        }}
        okText="使用这个篇数"
        cancelText="取消"
      >
        <p className="zone-line">最近含能量标记的日记篇数</p>
        <InputNumber min={1} max={50} value={draftLimit} onChange={(v) => setDraftLimit(v ?? 10)} />
      </Modal>
    </div>
  )
}
