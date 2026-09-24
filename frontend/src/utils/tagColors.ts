import type { CSSProperties } from 'react'
import type { TagKind } from '@/types/entry'

/** Mooda-like families. Same hue = same category. Keep in sync with backend default_tags.py. */
export const ICON_COLORS = {
  joy: '#F2C14E',
  calm: '#6FBF8A',
  anger: '#E15B5B',
  tense: '#9B84D6',
  low: '#7E9CC8',
  tender: '#E8896A',
  focus: '#E87A7A',
  drain: '#F0A06A',
  primary: '#7C6FF0',
  muted: '#A39A8E',
} as const

const EMOTION_FAMILY = [
  ICON_COLORS.joy,
  ICON_COLORS.calm,
  ICON_COLORS.anger,
  ICON_COLORS.tense,
  ICON_COLORS.low,
  ICON_COLORS.tender,
] as const

const TOPIC_FAMILY = [
  ICON_COLORS.tender,
  ICON_COLORS.low,
  ICON_COLORS.tense,
  ICON_COLORS.calm,
] as const

/** 情绪按感受归类，同类同色。 */
export const EMOTION_COLORS: Record<string, string> = {
  喜悦: ICON_COLORS.joy,
  期待: ICON_COLORS.joy,
  平静: ICON_COLORS.calm,
  安心: ICON_COLORS.calm,
  释然: ICON_COLORS.calm,
  愤怒: ICON_COLORS.anger,
  焦虑: ICON_COLORS.tense,
  紧张: ICON_COLORS.tense,
  迷茫: ICON_COLORS.tense,
  失落: ICON_COLORS.low,
  疲惫: ICON_COLORS.low,
  孤独: ICON_COLORS.low,
  委屈: ICON_COLORS.low,
  感动: ICON_COLORS.tender,
}

/** 话题按生活领域归类，同类同色。 */
export const THINKING_COLORS: Record<string, string> = {
  人际关系: ICON_COLORS.tender,
  亲密关系: ICON_COLORS.tender,
  家庭: ICON_COLORS.tender,
  职业规划: ICON_COLORS.low,
  工作状态: ICON_COLORS.low,
  金钱观: ICON_COLORS.low,
  学习成长: ICON_COLORS.low,
  情绪: ICON_COLORS.tense,
  价值判断: ICON_COLORS.tense,
  人生观: ICON_COLORS.tense,
  世界观: ICON_COLORS.tense,
  死亡: ICON_COLORS.tense,
  健康: ICON_COLORS.calm,
  兴趣爱好: ICON_COLORS.calm,
  生活探索: ICON_COLORS.calm,
  重大事件: ICON_COLORS.calm,
}

const FALLBACK = ICON_COLORS.primary

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i += 1) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0
  }
  return h
}

export function thinkingColorAt(index: number): string {
  return TOPIC_FAMILY[index % TOPIC_FAMILY.length] ?? FALLBACK
}

export function colorForTag(
  name: string,
  knownColor?: string | null,
  kind?: TagKind | null,
): string {
  if (kind === 'emotion' && EMOTION_COLORS[name]) return EMOTION_COLORS[name]
  if (kind === 'thinking' && THINKING_COLORS[name]) return THINKING_COLORS[name]
  if (knownColor && knownColor.trim()) return knownColor.trim()
  const palette = kind === 'emotion' ? EMOTION_FAMILY : TOPIC_FAMILY
  return palette[hashName(name) % palette.length] ?? FALLBACK
}

export function tint(color: string, alphaHex: string): string {
  const c = color.trim()
  if (c.startsWith('#') && (c.length === 7 || c.length === 4)) {
    return `${c}${alphaHex}`
  }
  return c
}

/** 日记列表、设置页等只读标签 — 与编辑器标签栏同一套 pastel 样式 */
export function tagPillStyle(
  color: string,
  kind?: TagKind | null,
  _soft?: boolean,
): CSSProperties {
  return {
    ...selectableTagStyle(color, false, kind),
    padding: '0 12px',
  }
}

/** 篇内已选标签、侧栏卡片等展示用（非筛选 toggle） */
export function entryTagDisplayStyle(
  name: string,
  kind: TagKind,
  storedColor?: string | null,
): CSSProperties {
  return selectableTagStyle(colorForTag(name, storedColor, kind), false, kind)
}

const CLAY_RAISED =
  '4px 4px 10px rgba(58,52,46,0.08), inset 2px 2px 5px rgba(255,255,255,0.7), inset -1px -1px 3px rgba(58,52,46,0.06)'
const CLAY_PRESSED =
  '2px 2px 4px rgba(58,52,46,0.05), inset 6px 6px 12px rgba(58,52,46,0.14), inset -2px -2px 6px rgba(255,255,255,0.55)'

/**
 * Unified selectable chip: same hue off/on.
 * Off = soft pastel raised; On = richer pastel pressed (never swap to solid purple + white).
 */
export function selectableTagStyle(
  color: string,
  selected: boolean,
  kind?: TagKind | null,
): CSSProperties {
  const c = color.trim() || FALLBACK
  const softTop = selected ? tint(c, '55') : tint(c, '26')
  const softBot = selected ? tint(c, '7A') : tint(c, '42')
  return {
    background: `linear-gradient(180deg, ${softTop} 0%, ${softBot} 100%)`,
    color: c,
    border: 0,
    fontWeight: selected ? 800 : 700,
    borderRadius: kind === 'emotion' ? 999 : 16,
    boxShadow: selected ? CLAY_PRESSED : CLAY_RAISED,
  }
}

/** 「全部」等中性 chip：off 奶油凸起，on 薄荷按压（仍非白字实心紫） */
export function selectableNeutralStyle(selected: boolean): CSSProperties {
  return {
    background: selected
      ? 'linear-gradient(180deg, #ede9fe 0%, #ddd6fe 100%)'
      : '#ffffff',
    color: selected ? '#5b4fd6' : '#1f2329',
    border: 0,
    fontWeight: selected ? 800 : 700,
    borderRadius: 16,
    boxShadow: selected ? CLAY_PRESSED : CLAY_RAISED,
  }
}
