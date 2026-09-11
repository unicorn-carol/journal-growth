import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, DatePicker, Input, Modal, Popover, message } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import {
  createEntry,
  deleteEntry,
  getEntry,
  listEntries,
  updateEntry,
} from '@/services/entryService'
import { createHighlight, deleteHighlight, updateHighlight } from '@/services/highlightService'
import {
  acceptAiSuggestion,
  dismissAiSuggestion,
  requestAiSuggestion,
} from '@/services/aiSuggestService'
import {
  DiaryRichEditor,
  buildHighlightHtml,
} from '@/components/DiaryRichEditor'
import { HalfRating } from '@/components/HalfRating'
import {
  ClayCalendar,
  ClayEnergyInline,
  ClayHash,
} from '@/components/icons/ClayIcons'
import { TagPill } from '@/components/TagPill'
import { createTag, listTags } from '@/services/tagService'
import {
  colorForTag,
  selectableNeutralStyle,
  selectableTagStyle,
} from '@/utils/tagColors'
import type {
  EntryDetail,
  EntryListItem,
  HighlightDTO,
  TagKind,
  TagRef,
} from '@/types/entry'
import type { TagDTO } from '@/types/insight'
import './DiaryWorkspace.css'

function weekdayLabel(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`)
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
}

function dayNum(dateStr: string) {
  return String(Number(dateStr.slice(8, 10)))
}

function monthTitle(dateStr: string) {
  const [y, m] = dateStr.split('-')
  return `${y}年${Number(m)}月`
}

export function DiaryWorkspacePage() {
  const [params, setParams] = useSearchParams()
  const [list, setList] = useState<EntryListItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [detail, setDetail] = useState<EntryDetail | null>(null)
  const [editorHtml, setEditorHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [energyOpen, setEnergyOpen] = useState<HighlightDTO | null>(null)
  const [topicOpen, setTopicOpen] = useState<HighlightDTO | null>(null)
  const [creatingKind, setCreatingKind] = useState<'energy' | 'topic_emotion' | null>(
    null,
  )
  const [pendingQuote, setPendingQuote] = useState('')
  const [pendingTempId, setPendingTempId] = useState<string | null>(null)
  const [draftEngagement, setDraftEngagement] = useState(0)
  const [draftDrain, setDraftDrain] = useState(0)
  const [draftTags, setDraftTags] = useState<TagRef[]>([])
  const [thinkingTags, setThinkingTags] = useState<TagDTO[]>([])
  const [emotionTags, setEmotionTags] = useState<TagDTO[]>([])
  const [newTagOpen, setNewTagOpen] = useState<TagKind | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const [filterDate, setFilterDate] = useState<string | null>(null)
  const [filterTagIds, setFilterTagIds] = useState<string[]>([])
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false)
  const [entryTagPopoverOpen, setEntryTagPopoverOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [selectedAiTagIds, setSelectedAiTagIds] = useState<string[]>([])
  const [tagSaving, setTagSaving] = useState(false)
  const editorRootRef = useRef<HTMLDivElement>(null)
  const aiRequestSeq = useRef(0)

  const reloadLexicon = useCallback(async () => {
    const [thinking, emotion] = await Promise.all([
      listTags('thinking'),
      listTags('emotion'),
    ])
    setThinkingTags(thinking)
    setEmotionTags(emotion)
    return { thinking, emotion }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await reloadLexicon()
      } catch (e) {
        if (!cancelled) message.error((e as Error).message || '加载标签词库失败')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reloadLexicon])

  const loadList = useCallback(async () => {
    const data = await listEntries()
    setList(data.items)
    return data.items
  }, [])

  const openEntry = useCallback(
    async (id: string, highlightId?: string | null) => {
      setActiveId(id)
      const next = new URLSearchParams({ entry_id: id })
      if (highlightId) next.set('highlight_id', highlightId)
      setParams(next)
      const entry = await getEntry(id)
      setDetail(entry)
      setSelectedAiTagIds(
        entry.ai_suggestion?.status === 'pending'
          ? entry.ai_suggestion.suggested_tags.map((t) => t.id)
          : [],
      )
      setAiLoading(false)
      const html = buildHighlightHtml(entry.body, entry.highlights)
      setEditorHtml(html)
      if (highlightId) {
        // 下一帧滚动到对应 mark
        requestAnimationFrame(() => {
          const mark = document.querySelector(
            `mark[data-hl-id="${highlightId}"]`,
          ) as HTMLElement | null
          mark?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })
      }
    },
    [setParams],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const items = await loadList()
        if (cancelled) return
        const fromUrl = params.get('entry_id')
        const hlId = params.get('highlight_id')
        const first =
          fromUrl && items.some((i) => i.id === fromUrl) ? fromUrl : items[0]?.id
        if (first) await openEntry(first, hlId)
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

  const tagColorById = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of [...thinkingTags, ...emotionTags]) {
      if (t.color) map.set(t.id, t.color)
    }
    return map
  }, [thinkingTags, emotionTags])

  const entryDates = useMemo(() => new Set(list.map((i) => i.event_date)), [list])

  const filteredList = useMemo(() => {
    return list.filter((item) => {
      if (filterDate && item.event_date !== filterDate) return false
      if (
        filterTagIds.length > 0 &&
        !filterTagIds.every((id) => item.tags.some((t) => t.id === id))
      ) {
        return false
      }
      return true
    })
  }, [list, filterDate, filterTagIds])

  const energyHighlights = useMemo(
    () => detail?.highlights.filter((h) => h.kind === 'energy') ?? [],
    [detail],
  )

  /** 篇级标签（标签栏可增删；话题高亮标签仍在划线上） */
  const entryTags = detail?.tags ?? []

  const grouped = useMemo(() => {
    const map = new Map<string, EntryListItem[]>()
    for (const item of filteredList) {
      const key = monthTitle(item.event_date)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return [...map.entries()]
  }, [filteredList])

  const hasActiveFilter = Boolean(filterDate || filterTagIds.length)

  const toggleFilterTag = (id: string) => {
    setFilterTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const clearFilters = () => {
    setFilterDate(null)
    setFilterTagIds([])
  }

  const onPickFilterDate = (value: Dayjs | null) => {
    if (!value) {
      setFilterDate(null)
      return
    }
    const key = value.format('YYYY-MM-DD')
    if (!entryDates.has(key)) {
      message.info('该日暂无日记')
      return
    }
    setFilterDate(key)
  }

  const tagFilterContent = (
    <div className="filter-tags">
      <div className="filter-tags-hint">多选为同时满足（AND）</div>
      <div className="filter-tags-section thinking">思考类</div>
      <div className="filter-tags-row thinking">
        {thinkingTags.map((t) => {
          const on = filterTagIds.includes(t.id)
          const color = colorForTag(t.name, t.color, 'thinking')
          return (
            <button
              key={t.id}
              type="button"
              className={`filter-chip thinking${on ? ' on' : ''}`}
              style={selectableTagStyle(color, on, 'thinking')}
              onClick={() => toggleFilterTag(t.id)}
            >
              {t.name}
            </button>
          )
        })}
      </div>
      <div className="filter-tags-section emotion">情绪类</div>
      <div className="filter-tags-row emotion">
        {emotionTags.map((t) => {
          const on = filterTagIds.includes(t.id)
          const color = colorForTag(t.name, t.color, 'emotion')
          return (
            <button
              key={t.id}
              type="button"
              className={`filter-chip emotion${on ? ' on' : ''}`}
              style={selectableTagStyle(color, on, 'emotion')}
              onClick={() => toggleFilterTag(t.id)}
            >
              {t.name}
            </button>
          )
        })}
      </div>
      <div className="filter-actions">
        <button type="button" className="filter-clear" onClick={() => setFilterTagIds([])}>
          清除标签
        </button>
      </div>
    </div>
  )

  const onOpenHighlight = (id: string) => {
    const h = detail?.highlights.find((x) => x.id === id)
    if (!h) return
    if (h.kind === 'energy') {
      setDraftEngagement(h.engagement ?? 0)
      setDraftDrain(h.drain ?? 0)
      setCreatingKind(null)
      setEnergyOpen(h)
    } else {
      setDraftTags(h.tags)
      setCreatingKind(null)
      setTopicOpen(h)
    }
  }

  const onRequestCreate = (
    kind: 'energy' | 'topic_emotion',
    quote: string,
    tempId: string,
  ) => {
    setPendingQuote(quote)
    setPendingTempId(tempId)
    setCreatingKind(kind)
    if (kind === 'energy') {
      setDraftEngagement(3)
      setDraftDrain(2.5)
      setEnergyOpen({
        id: '',
        kind: 'energy',
        quote_text: quote,
        start_offset: 0,
        end_offset: quote.length,
        engagement: 3,
        drain: 2.5,
        tags: [],
      })
    } else {
      // 新建话题标记：不预选任何标签，由用户主动点选
      setDraftTags([])
      setTopicOpen({
        id: '',
        kind: 'topic_emotion',
        quote_text: quote,
        start_offset: 0,
        end_offset: quote.length,
        engagement: null,
        drain: null,
        tags: [],
      })
    }
  }

  const applyEditorHtml = (html: string) => {
    setEditorHtml(html)
    const root = editorRootRef.current?.querySelector(
      '.rich-editor',
    ) as HTMLElement | null
    if (root) {
      if (root.innerHTML !== html) root.innerHTML = html
      if (detail) root.setAttribute('data-entry', detail.id)
    }
  }

  const replaceTempId = (html: string, realId: string) => {
    if (!pendingTempId) return html
    return html.split(pendingTempId).join(realId)
  }

  const saveEnergy = async () => {
    if (!detail || !energyOpen) return
    try {
      if (creatingKind === 'energy' || !energyOpen.id) {
        const created = await createHighlight(detail.id, {
          kind: 'energy',
          quote_text: pendingQuote || energyOpen.quote_text,
          engagement: draftEngagement,
          drain: draftDrain,
        })
        const html = replaceTempId(editorHtml, created.id)
        applyEditorHtml(html)
        const nextDetail = {
          ...detail,
          body: html,
          highlights: [...detail.highlights, created],
        }
        await updateEntry(detail.id, {
          title: detail.title,
          body: html,
          event_date: detail.event_date,
          tags: detail.tags,
        })
        setDetail(nextDetail)
      } else {
        const updated = await updateHighlight(energyOpen.id, {
          engagement: draftEngagement,
          drain: draftDrain,
        })
        setDetail({
          ...detail,
          highlights: detail.highlights.map((h) =>
            h.id === updated.id
              ? {
                  ...h,
                  ...updated,
                  engagement: draftEngagement,
                  drain: draftDrain,
                }
              : h,
          ),
        })
      }
      setEnergyOpen(null)
      setCreatingKind(null)
      setPendingTempId(null)
      message.success('能量标记已保存')
    } catch (e) {
      message.error((e as Error).message || '能量标记保存失败')
      throw e
    }
  }

  const saveTopic = async () => {
    if (!detail || !topicOpen) return
    try {
      if (creatingKind === 'topic_emotion' || !topicOpen.id) {
        const created = await createHighlight(detail.id, {
          kind: 'topic_emotion',
          quote_text: pendingQuote || topicOpen.quote_text,
          tags: draftTags,
        })
        const html = replaceTempId(editorHtml, created.id)
        applyEditorHtml(html)
        const tagMap = new Map(detail.tags.map((t) => [t.id, t]))
        for (const t of draftTags) tagMap.set(t.id, t)
        const nextTags = [...tagMap.values()]
        await updateEntry(detail.id, {
          title: detail.title,
          body: html,
          event_date: detail.event_date,
          tags: nextTags,
        })
        setDetail({
          ...detail,
          body: html,
          tags: nextTags,
          highlights: [...detail.highlights, { ...created, tags: draftTags }],
        })
      } else {
        const updated = await updateHighlight(topicOpen.id, { tags: draftTags })
        const tagMap = new Map(detail.tags.map((t) => [t.id, t]))
        for (const t of draftTags) tagMap.set(t.id, t)
        const nextTags = [...tagMap.values()]
        await updateEntry(detail.id, {
          title: detail.title,
          body: detail.body,
          event_date: detail.event_date,
          tags: nextTags,
        })
        setDetail({
          ...detail,
          tags: nextTags,
          highlights: detail.highlights.map((h) =>
            h.id === updated.id ? { ...h, tags: draftTags } : h,
          ),
        })
      }
      setTopicOpen(null)
      setCreatingKind(null)
      setPendingTempId(null)
      await loadList()
      message.success('话题标记已保存')
    } catch (e) {
      message.error((e as Error).message || '话题标记保存失败')
      throw e
    }
  }

  const cancelCreateOrClose = (kind: 'energy' | 'topic') => {
    if (pendingTempId) {
      const html = editorHtml.replace(
        new RegExp(
          `<mark[^>]*data-hl-id="${pendingTempId}"[^>]*>([\\s\\S]*?)</mark>`,
          'i',
        ),
        '$1',
      )
      applyEditorHtml(html)
    }
    setPendingTempId(null)
    setCreatingKind(null)
    if (kind === 'energy') setEnergyOpen(null)
    else setTopicOpen(null)
  }

  const unwrapMarkHtml = (html: string, hlId: string) =>
    html.replace(
      new RegExp(
        `<mark[^>]*data-hl-id="${hlId}"[^>]*>([\\s\\S]*?)</mark>`,
        'i',
      ),
      '$1',
    )

  const removeOpenHighlight = async (kind: 'energy' | 'topic') => {
    const open = kind === 'energy' ? energyOpen : topicOpen
    if (!detail || !open?.id) return
    try {
      await deleteHighlight(open.id)
      const html = unwrapMarkHtml(editorHtml, open.id)
      applyEditorHtml(html)
      const nextHighlights = detail.highlights.filter((h) => h.id !== open.id)
      await updateEntry(detail.id, {
        title: detail.title,
        body: html,
        event_date: detail.event_date,
        tags: detail.tags,
      })
      setDetail({
        ...detail,
        body: html,
        highlights: nextHighlights,
      })
      if (kind === 'energy') setEnergyOpen(null)
      else setTopicOpen(null)
      setCreatingKind(null)
      setPendingTempId(null)
      await loadList()
      message.success('标记已删除')
    } catch (e) {
      message.error((e as Error).message || '删除标记失败')
    }
  }

  const toggleTag = (tag: TagRef) => {
    setDraftTags((prev) =>
      prev.some((t) => t.id === tag.id)
        ? prev.filter((t) => t.id !== tag.id)
        : [...prev, tag],
    )
  }

  const saveNewTag = async () => {
    if (!newTagOpen) return
    const name = newTagName.trim()
    if (!name) {
      message.warning('请输入标签名')
      return
    }
    try {
      const created = await createTag({ kind: newTagOpen, name })
      await reloadLexicon()
      toggleTag({ id: created.id, kind: created.kind, name: created.name })
      setNewTagOpen(null)
      setNewTagName('')
      message.success('已新增标签')
    } catch (e) {
      message.error((e as Error).message || '新增失败')
    }
  }

  const onAcceptAi = async () => {
    if (!detail?.ai_suggestion || detail.ai_suggestion.status !== 'pending') return
    if (selectedAiTagIds.length === 0) {
      message.warning('请先选择要采纳的标签')
      return
    }
    try {
      const res = await acceptAiSuggestion(
        detail.id,
        detail.ai_suggestion.id,
        selectedAiTagIds,
      )
      setDetail({
        ...detail,
        tags: res.tags,
        ai_suggestion: { ...detail.ai_suggestion, status: 'accepted' },
      })
      setSelectedAiTagIds([])
      await loadList()
      message.success('已采纳所选标签')
    } catch (e) {
      message.error((e as Error).message || '采纳失败')
    }
  }

  const onDismissAi = async () => {
    if (!detail?.ai_suggestion || detail.ai_suggestion.status !== 'pending') return
    try {
      await dismissAiSuggestion(detail.id, detail.ai_suggestion.id)
      setDetail({
        ...detail,
        ai_suggestion: { ...detail.ai_suggestion, status: 'dismissed' },
      })
      setSelectedAiTagIds([])
      message.success('已忽略建议')
    } catch (e) {
      message.error((e as Error).message || '忽略失败')
    }
  }

  const toggleAiTag = (id: string) => {
    setSelectedAiTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const persistEntryTags = async (nextTags: TagRef[]) => {
    if (!detail) return
    setTagSaving(true)
    try {
      const updated = await updateEntry(detail.id, {
        title: detail.title,
        body: editorHtml,
        event_date: detail.event_date,
        tags: nextTags,
      })
      setDetail({
        ...detail,
        tags: updated.tags,
        updated_at: updated.updated_at,
      })
      await loadList()
    } catch (e) {
      message.error((e as Error).message || '标签更新失败')
    } finally {
      setTagSaving(false)
    }
  }

  const removeEntryTag = (id: string) => {
    if (!detail) return
    void persistEntryTags(detail.tags.filter((t) => t.id !== id))
  }

  const toggleEntryTag = (tag: TagDTO) => {
    if (!detail) return
    const exists = detail.tags.some((t) => t.id === tag.id)
    const next = exists
      ? detail.tags.filter((t) => t.id !== tag.id)
      : [
          ...detail.tags,
          { id: tag.id, kind: tag.kind, name: tag.name },
        ]
    void persistEntryTags(next)
  }

  const onSave = async () => {
    if (!detail) return
    setSaving(true)
    try {
      const updated = await updateEntry(detail.id, {
        title: detail.title,
        body: editorHtml,
        event_date: detail.event_date,
        tags: detail.tags,
      })
      setDetail({
        ...updated,
        highlights: detail.highlights,
        ai_suggestion: detail.ai_suggestion,
      })
      setEditorHtml(
        updated.body.includes('<')
          ? updated.body
          : buildHighlightHtml(updated.body, detail.highlights),
      )
      await loadList()
      message.success('已保存')

      // 文本先落库；AI 建议异步拉取，不阻塞保存体验
      const seq = ++aiRequestSeq.current
      const entryId = detail.id
      setAiLoading(true)
      void (async () => {
        try {
          const ai = await requestAiSuggestion(entryId, true)
          if (aiRequestSeq.current !== seq) return
          setDetail((prev) =>
            prev && prev.id === entryId
              ? { ...prev, ai_suggestion: ai }
              : prev,
          )
          setSelectedAiTagIds(ai.suggested_tags.map((t) => t.id))
        } catch {
          // ignore — 建议失败不影响已保存文本
        } finally {
          if (aiRequestSeq.current === seq) setAiLoading(false)
        }
      })()
    } catch (e) {
      message.error((e as Error).message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const onWrite = async () => {
    const today = new Date().toISOString().slice(0, 10)
    const entry = await createEntry({
      title: '无标题',
      body: '',
      event_date: today,
    })
    await loadList()
    await openEntry(entry.id)
  }

  const onDelete = () => {
    if (!detail) return
    Modal.confirm({
      title: '删除日记',
      content: `确定删除「${detail.title || '无标题'}」？删除后可从列表中消失（软删除）。`,
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      centered: true,
      onOk: async () => {
        await deleteEntry(detail.id)
        setDetail(null)
        setActiveId(null)
        setEditorHtml('')
        setParams({})
        await loadList()
        message.success('日记已删除')
      },
    })
  }

  if (loading) {
    return <div className="diary-loading">加载日记…</div>
  }

  return (
    <div className="diary-workspace">
      <section className="diary-mid">
        <div className="mid-tools">
          <DatePicker
            className="editor-date-picker filter-date-picker"
            popupClassName="clay-picker-dropdown"
            variant="borderless"
            value={filterDate ? dayjs(filterDate) : null}
            allowClear
            inputReadOnly
            placeholder="筛选日期"
            suffixIcon={<ClayCalendar size={16} filled />}
            format={(d) => d.format('MM-DD')}
            disabledDate={(d) => !entryDates.has(d.format('YYYY-MM-DD'))}
            cellRender={(current, info) => {
              if (info.type !== 'date') return info.originNode
              const d = dayjs(current)
              const key = d.format('YYYY-MM-DD')
              const has = entryDates.has(key)
              return (
                <div
                  className={`ant-picker-cell-inner${has ? ' clay-day-has-entry' : ''}`}
                >
                  {d.date()}
                </div>
              )
            }}
            onChange={onPickFilterDate}
          />
          <Popover
            trigger="click"
            open={tagPopoverOpen}
            onOpenChange={setTagPopoverOpen}
            placement="bottomLeft"
            classNames={{ root: 'clay-popover' }}
            content={tagFilterContent}
          >
            <button
              type="button"
              className={`icon-btn${filterTagIds.length ? ' is-active' : ''}`}
              title="按标签筛选"
              aria-label="按标签筛选"
            >
              <ClayHash size={20} filled />
            </button>
          </Popover>
          <span className="spacer" />
          <button type="button" className="btn-write" onClick={onWrite}>
            写日记
          </button>
        </div>
        {hasActiveFilter ? (
          <div className="filter-bar">
            {filterDate ? (
              <span className="filter-chip on" style={selectableNeutralStyle(true)}>
                日期 {filterDate}
              </span>
            ) : null}
            {filterTagIds.map((id) => {
              const t = [...thinkingTags, ...emotionTags].find((x) => x.id === id)
              return t ? (
                <TagPill key={id} name={t.name} color={t.color} kind={t.kind} />
              ) : null
            })}
            <button type="button" className="filter-clear" onClick={clearFilters}>
              清空筛选
            </button>
          </div>
        ) : null}
        <div className="entry-list">
          {list.length === 0 ? (
            <div className="list-empty">还没有日记。点右上角「写日记」开始。</div>
          ) : null}
          {list.length > 0 && filteredList.length === 0 ? (
            <div className="list-empty">没有符合筛选的日记。</div>
          ) : null}
          {grouped.map(([month, items]) => (
            <div key={month} className="month-block">
              <div className="month-label">{month}</div>
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`entry-card${activeId === item.id ? ' is-active' : ''}`}
                  onClick={() => openEntry(item.id)}
                >
                  <div className="datebox">
                    <div className="w">{weekdayLabel(item.event_date)}</div>
                    <div className="n">{dayNum(item.event_date)}</div>
                  </div>
                  <div className="entry-body">
                    <h4 title={item.title}>{item.title}</h4>
                    {item.tags.length > 0 ? (
                      <div className="entry-tags">
                        {item.tags.map((t) => (
                          <TagPill
                            key={t.id}
                            name={t.name}
                            color={tagColorById.get(t.id)}
                            kind={t.kind}
                          />
                        ))}
                      </div>
                    ) : null}
                    <p>{item.excerpt}</p>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="diary-editor" ref={editorRootRef}>
        {detail ? (
          <>
            <header className="editor-head">
              <div className="editor-head-main">
                <div className="editor-date-row">
                  <DatePicker
                    className="editor-date-picker"
                    popupClassName="clay-picker-dropdown"
                    variant="borderless"
                    value={dayjs(detail.event_date)}
                    allowClear={false}
                    inputReadOnly
                    suffixIcon={<ClayCalendar size={16} filled />}
                    format={(d) =>
                      `${d.format('YYYY-MM-DD')} · ${weekdayLabel(d.format('YYYY-MM-DD'))}`
                    }
                    onChange={(d) => {
                      if (!d) return
                      setDetail({ ...detail, event_date: d.format('YYYY-MM-DD') })
                    }}
                  />
                </div>
                <Input.TextArea
                  className="editor-title"
                  variant="borderless"
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  value={detail.title}
                  onChange={(e) => setDetail({ ...detail, title: e.target.value })}
                />
              </div>
              <div className="editor-actions">
                <Button size="small" danger ghost onClick={onDelete}>
                  删除
                </Button>
                <Button size="small" loading={saving} onClick={onSave}>
                  保存
                </Button>
              </div>
            </header>

            <div className={`tag-row${tagSaving ? ' is-saving' : ''}`}>
              {entryTags.length === 0 ? (
                <span className="tag-empty">点击「+ 标签」添加；也可在正文划选标注话题</span>
              ) : (
                entryTags.map((t) => (
                  <span
                    key={t.id}
                    className="entry-tag-pill"
                    style={selectableTagStyle(
                      colorForTag(t.name, tagColorById.get(t.id), t.kind),
                      true,
                      t.kind,
                    )}
                  >
                    <span>{t.name}</span>
                    <button
                      type="button"
                      className="entry-tag-x"
                      aria-label={`移除 ${t.name}`}
                      onClick={() => removeEntryTag(t.id)}
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
              <Popover
                trigger="click"
                open={entryTagPopoverOpen}
                onOpenChange={setEntryTagPopoverOpen}
                placement="bottomLeft"
                content={
                  <div className="entry-tag-picker">
                    <div className="filter-tags-hint">点击切换添加/移除（即时保存）</div>
                    <div className="filter-tags-section thinking">思考类</div>
                    <div className="filter-tags-row thinking">
                      {thinkingTags.map((t) => {
                        const on = entryTags.some((x) => x.id === t.id)
                        const color = colorForTag(t.name, t.color, 'thinking')
                        return (
                          <button
                            key={t.id}
                            type="button"
                            className={`filter-chip${on ? ' on' : ''}`}
                            style={
                              on
                                ? selectableTagStyle(color, true, 'thinking')
                                : selectableNeutralStyle(false)
                            }
                            onClick={() => toggleEntryTag(t)}
                          >
                            {t.name}
                          </button>
                        )
                      })}
                    </div>
                    <div className="filter-tags-section emotion">情绪类</div>
                    <div className="filter-tags-row emotion">
                      {emotionTags.map((t) => {
                        const on = entryTags.some((x) => x.id === t.id)
                        const color = colorForTag(t.name, t.color, 'emotion')
                        return (
                          <button
                            key={t.id}
                            type="button"
                            className={`filter-chip${on ? ' on' : ''}`}
                            style={
                              on
                                ? selectableTagStyle(color, true, 'emotion')
                                : selectableNeutralStyle(false)
                            }
                            onClick={() => toggleEntryTag(t)}
                          >
                            {t.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                }
              >
                <button type="button" className="entry-tag-add">
                  + 标签
                </button>
              </Popover>
            </div>

            {aiLoading ? (
              <div className="ai-bar loading">
                <span className="ai-label">AI 建议生成中…</span>
              </div>
            ) : null}

            {!aiLoading && detail.ai_suggestion?.status === 'pending' ? (
              <div className="ai-bar">
                <span className="ai-label">AI 建议：</span>
                <div className="ai-suggest-tags">
                  {detail.ai_suggestion.suggested_tags.map((t) => {
                    const on = selectedAiTagIds.includes(t.id)
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={`ai-chip${on ? ' on' : ''}`}
                        onClick={() => toggleAiTag(t.id)}
                      >
                        {t.name}
                      </button>
                    )
                  })}
                </div>
                <span className="spacer" />
                <button type="button" className="ai-act" onClick={onAcceptAi}>
                  采纳所选
                </button>
                <button type="button" className="ai-act ghost" onClick={onDismissAi}>
                  忽略
                </button>
                <p className="ai-hint">点击标签可勾选/取消，再点「采纳所选」</p>
              </div>
            ) : null}

            <DiaryRichEditor
              entryId={detail.id}
              html={editorHtml}
              onHtmlChange={setEditorHtml}
              onOpenHighlight={onOpenHighlight}
              onRequestCreate={onRequestCreate}
            />

            <div className="editor-meta">
              最近更新：{detail.updated_at.replace('T', ' ').replace('Z', '')}
            </div>

            {energyHighlights.length > 0 ? (
              <div className="energy-card">
                <div className="energy-title">本篇能量标记</div>
                <div className="energy-rows">
                  {energyHighlights.map((h) => (
                    <div key={h.id} className="energy-row">
                      <span>摘录：{h.quote_text}</span>
                      <span className="focus energy-metric">
                        专注度 <ClayEnergyInline value={h.engagement ?? 0} kind="heart" size={14} />{' '}
                        ({(h.engagement ?? 0).toFixed(1)})
                      </span>
                      <span className="drain energy-metric">
                        能量消耗 <ClayEnergyInline value={h.drain ?? 0} kind="bolt" size={14} />{' '}
                        ({(h.drain ?? 0).toFixed(1)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="diary-empty">还没有选中的日记。点「写日记」开始，或从左侧列表打开一篇。</div>
        )}
      </section>

      <Modal
        title="标记能量"
        open={!!energyOpen}
        onCancel={() => cancelCreateOrClose('energy')}
        onOk={saveEnergy}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
        footer={(_, { OkBtn, CancelBtn }) => (
          <div className="modal-footer-row">
            {energyOpen?.id ? (
              <Button danger type="link" onClick={() => void removeOpenHighlight('energy')}>
                删除标记
              </Button>
            ) : (
              <span />
            )}
            <div className="modal-footer-actions">
              <CancelBtn />
              <OkBtn />
            </div>
          </div>
        )}
      >
        {energyOpen ? (
          <div className="popover-energy">
            <p className="quote">「{energyOpen.quote_text || pendingQuote}」</p>
            <HalfRating
              label="专注度"
              icon="heart"
              value={draftEngagement}
              onChange={setDraftEngagement}
            />
            <HalfRating
              label="能量消耗"
              icon="bolt"
              value={draftDrain}
              onChange={setDraftDrain}
            />
            <p className="hint">点击图标左半为半档，右半为整档（0–5，步进 0.5）</p>
          </div>
        ) : null}
      </Modal>

      <Modal
        title="标注话题 / 情绪"
        open={!!topicOpen}
        onCancel={() => cancelCreateOrClose('topic')}
        onOk={saveTopic}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
        footer={(_, { OkBtn, CancelBtn }) => (
          <div className="modal-footer-row">
            {topicOpen?.id ? (
              <Button danger type="link" onClick={() => void removeOpenHighlight('topic')}>
                删除标记
              </Button>
            ) : (
              <span />
            )}
            <div className="modal-footer-actions">
              <CancelBtn />
              <OkBtn />
            </div>
          </div>
        )}
      >
        {topicOpen ? (
          <div className="popover-topic">
            <p className="quote">「{topicOpen.quote_text || pendingQuote}」</p>
            <div className="rate-label lane-topic">思考标签</div>
            <div className="chip-row">
              {thinkingTags.map((t) => {
                const on = draftTags.some((x) => x.id === t.id)
                const color = colorForTag(t.name, t.color, 'thinking')
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`pill-btn thinking${on ? ' on' : ''}`}
                    style={selectableTagStyle(color, on, 'thinking')}
                    onClick={() => toggleTag(t)}
                  >
                    {t.name}
                  </button>
                )
              })}
              <button
                type="button"
                className="pill-btn add"
                onClick={() => {
                  setNewTagOpen('thinking')
                  setNewTagName('')
                }}
              >
                + 新增
              </button>
            </div>
            <div className="rate-label lane-emotion">情绪标签</div>
            <div className="chip-row">
              {emotionTags.map((t) => {
                const on = draftTags.some((x) => x.id === t.id)
                const color = colorForTag(t.name, t.color, 'emotion')
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`pill-btn emotion${on ? ' on' : ''}`}
                    style={selectableTagStyle(color, on, 'emotion')}
                    onClick={() => toggleTag(t)}
                  >
                    {t.name}
                  </button>
                )
              })}
              <button
                type="button"
                className="pill-btn add"
                onClick={() => {
                  setNewTagOpen('emotion')
                  setNewTagName('')
                }}
              >
                + 新增
              </button>
            </div>
            <p className="hint">可选多个；与能量标记相互独立。新增会写入个人词库</p>
          </div>
        ) : null}
      </Modal>

      <Modal
        title={newTagOpen === 'thinking' ? '新增思考标签' : '新增情绪标签'}
        open={!!newTagOpen}
        onCancel={() => setNewTagOpen(null)}
        onOk={saveNewTag}
        okText="添加"
        cancelText="取消"
        destroyOnHidden
      >
        <Input
          placeholder="标签名称"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onPressEnter={saveNewTag}
        />
      </Modal>
    </div>
  )
}
