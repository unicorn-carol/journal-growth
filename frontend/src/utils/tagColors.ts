import type { CSSProperties } from 'react'
import type { TagKind } from '@/types/entry'

/**
 * Mooda candy hues + clay chips.
 * Lanes: energy (CSS) · thinking (soft indigo/mint clay) · emotion (blob pills).
 */

export const ICON_COLORS = {
  calm: '#7EC8A3',
  joy: '#F5D56B',
  low: '#6B9BD1',
  anxious: '#B8A4E8',
  focus: '#E87A7A',
  drain: '#F0A06A',
  primary: '#7C6FF0',
  muted: '#A39A8E',
  sky: '#7EB6D9',
  indigo: '#6B5CEF',
  violet: '#A78BFA',
  teal: '#6FCFB2',
} as const

const THINKING_PALETTE = [
  ICON_COLORS.teal,
  ICON_COLORS.violet,
  ICON_COLORS.indigo,
  ICON_COLORS.sky,
  ICON_COLORS.primary,
  ICON_COLORS.calm,
  ICON_COLORS.joy,
  ICON_COLORS.drain,
  ICON_COLORS.low,
  ICON_COLORS.anxious,
  ICON_COLORS.teal,
  ICON_COLORS.indigo,
  ICON_COLORS.joy,
  ICON_COLORS.sky,
  ICON_COLORS.muted,
  ICON_COLORS.focus,
]

/** Mooda-aligned emotion candy */
export const EMOTION_COLORS: Record<string, string> = {
  平静: ICON_COLORS.calm,
  喜悦: ICON_COLORS.joy,
  期待: ICON_COLORS.joy,
  感动: ICON_COLORS.focus,
  安心: ICON_COLORS.calm,
  焦虑: ICON_COLORS.anxious,
  疲惫: ICON_COLORS.low,
  失落: ICON_COLORS.low,
  愤怒: ICON_COLORS.drain,
  孤独: ICON_COLORS.muted,
  迷茫: ICON_COLORS.anxious,
  紧张: ICON_COLORS.anxious,
  释然: ICON_COLORS.calm,
  委屈: ICON_COLORS.focus,
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
  return THINKING_PALETTE[index % THINKING_PALETTE.length] ?? FALLBACK
}

export function colorForTag(
  name: string,
  knownColor?: string | null,
  kind?: TagKind | null,
): string {
  if (knownColor && knownColor.trim()) return knownColor
  if (kind === 'emotion') {
    return EMOTION_COLORS[name] ?? ICON_COLORS.anxious
  }
  return THINKING_PALETTE[hashName(name) % THINKING_PALETTE.length] ?? FALLBACK
}

export function tint(color: string, alphaHex: string): string {
  const c = color.trim()
  if (c.startsWith('#') && (c.length === 7 || c.length === 4)) {
    return `${c}${alphaHex}`
  }
  return c
}

/** Clay pill — no left accent stripe; emotion = fuller blob, thinking = soft clay chip. */
export function tagPillStyle(
  color: string,
  kind?: TagKind | null,
  soft?: boolean,
): CSSProperties {
  const fill = soft ? tint(color, '28') : tint(color, '48')
  const common: CSSProperties = {
    background: `linear-gradient(180deg, ${tint(color, soft ? '22' : '3A')} 0%, ${fill} 100%)`,
    color: color,
    border: 0,
    fontWeight: 700,
    boxShadow:
      '4px 4px 10px rgba(58,52,46,0.08), inset 2px 2px 5px rgba(255,255,255,0.65), inset -1px -1px 3px rgba(58,52,46,0.06)',
  }

  if (kind === 'emotion') {
    return {
      ...common,
      borderRadius: 999,
      padding: '0 12px',
    }
  }

  return {
    ...common,
    borderRadius: 16,
    padding: '0 12px',
  }
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
      ? 'linear-gradient(180deg, #ddd6fe 0%, #cfc7fb 100%)'
      : 'linear-gradient(180deg, #ffffff 0%, #fff6ea 100%)',
    color: selected ? '#5b4fd6' : '#3a342e',
    border: 0,
    fontWeight: selected ? 800 : 700,
    borderRadius: 16,
    boxShadow: selected ? CLAY_PRESSED : CLAY_RAISED,
  }
}
