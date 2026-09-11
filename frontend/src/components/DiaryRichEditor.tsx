import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { HighlightDTO } from '@/types/entry'
import { ClayHeart, ClayTag } from '@/components/icons/ClayIcons'

type Props = {
  entryId: string
  html: string
  onHtmlChange: (html: string) => void
  onOpenHighlight: (id: string) => void
  onRequestCreate: (
    kind: 'energy' | 'topic_emotion',
    quote: string,
    tempId: string,
  ) => void
}

function exec(cmd: string, value?: string) {
  document.execCommand(cmd, false, value)
}

export function DiaryRichEditor({
  entryId,
  html,
  onHtmlChange,
  onOpenHighlight,
  onRequestCreate,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [menu, setMenu] = useState<{
    x: number
    y: number
    quote: string
  } | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const switched = el.getAttribute('data-entry') !== entryId
    if (switched) {
      el.setAttribute('data-entry', entryId)
      el.innerHTML = html || '<div><br/></div>'
      return
    }
    if (document.activeElement !== el && el.innerHTML !== html) {
      el.innerHTML = html || '<div><br/></div>'
    }
  }, [entryId, html])

  const sync = () => {
    if (ref.current) onHtmlChange(ref.current.innerHTML)
  }

  const onMouseUp = () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !ref.current) {
      setMenu(null)
      return
    }
    if (!ref.current.contains(sel.anchorNode)) {
      setMenu(null)
      return
    }
    const quote = sel.toString().trim()
    if (!quote) {
      setMenu(null)
      return
    }
    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    setMenu({
      x: rect.left + rect.width / 2,
      y: Math.max(rect.top - 8, 8),
      quote,
    })
  }

  const onClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    const mark = target.closest('mark[data-hl-id]') as HTMLElement | null
    if (mark?.dataset.hlId) {
      e.preventDefault()
      setMenu(null)
      onOpenHighlight(mark.dataset.hlId)
    }
  }

  const createFromSelection = (kind: 'energy' | 'topic_emotion') => {
    if (!ref.current || !menu) return
    const tempId = crypto.randomUUID()
    const wrapped = wrapSelectionWithMark(ref.current, kind, tempId)
    const quote = wrapped || menu.quote
    onHtmlChange(ref.current.innerHTML)
    setMenu(null)
    onRequestCreate(kind, quote, tempId)
  }

  return (
    <div className="rich-wrap">
      <div className="rich-toolbar">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            exec('bold')
            sync()
          }}
        >
          加粗
        </button>
        <label className="color-btn">
          颜色
          <input
            type="color"
            defaultValue="#7C6FF0"
            onMouseDown={(e) => e.preventDefault()}
            onChange={(e) => {
              exec('foreColor', e.target.value)
              sync()
            }}
          />
        </label>
        <span className="toolbar-hint">Enter 换行 · 选中文字可添加标记</span>
      </div>

      <div
        ref={ref}
        className="rich-editor"
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        onMouseUp={onMouseUp}
        onClick={onClick}
        onKeyUp={onMouseUp}
      />

      {menu ? (
        <div
          className="sel-menu"
          style={{ left: menu.x, top: menu.y }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <button
            type="button"
            className="sel-menu-btn"
            onClick={() => createFromSelection('energy')}
          >
            <ClayHeart size={18} filled />
            标记能量
          </button>
          <button
            type="button"
            className="sel-menu-btn"
            onClick={() => createFromSelection('topic_emotion')}
          >
            <ClayTag size={18} filled />
            标注话题
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function buildHighlightHtml(body: string, highlights: HighlightDTO[]): string {
  if (/<[a-z][\s\S]*>/i.test(body)) return body
  const sorted = [...highlights].sort((a, b) => a.start_offset - b.start_offset)
  let html = ''
  let cursor = 0
  for (const h of sorted) {
    if (h.start_offset < cursor || h.end_offset > body.length) continue
    html += escapeText(body.slice(cursor, h.start_offset))
    const cls = h.kind === 'energy' ? 'hl hl-energy' : 'hl hl-topic'
    html += `<mark class="${cls}" data-hl-id="${h.id}">${escapeText(
      body.slice(h.start_offset, h.end_offset),
    )}</mark>`
    cursor = h.end_offset
  }
  html += escapeText(body.slice(cursor))
  return html.replace(/\n/g, '<br/>')
}

function escapeText(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function wrapSelectionWithMark(
  root: HTMLElement,
  kind: 'energy' | 'topic_emotion',
  id: string,
): string | null {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || !root.contains(sel.anchorNode)) return null
  const quote = sel.toString().trim()
  if (!quote) return null
  const range = sel.getRangeAt(0)
  const mark = document.createElement('mark')
  mark.className = kind === 'energy' ? 'hl hl-energy' : 'hl hl-topic'
  mark.dataset.hlId = id
  try {
    range.surroundContents(mark)
  } catch {
    const frag = range.extractContents()
    mark.appendChild(frag)
    range.insertNode(mark)
  }
  sel.removeAllRanges()
  return quote
}
