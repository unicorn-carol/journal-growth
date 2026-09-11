import type { TagKind } from '@/types/entry'
import { colorForTag, tagPillStyle } from '@/utils/tagColors'

type Props = {
  name: string
  color?: string | null
  kind?: TagKind | null
  className?: string
  soft?: boolean
}

export function TagPill({ name, color, kind, className = '', soft }: Props) {
  const resolved = colorForTag(name, color, kind)
  const style = tagPillStyle(resolved, kind, soft)
  const lane = kind === 'emotion' ? 'emotion' : kind === 'thinking' ? 'thinking' : ''
  return (
    <span
      className={`pill colored${lane ? ` pill--${lane}` : ''} ${className}`.trim()}
      style={style}
    >
      {name}
    </span>
  )
}
