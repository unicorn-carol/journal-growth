import { useId } from 'react'

type IconProps = {
  size?: number
  className?: string
  /** empty = soft clay gray; filled uses lane gradient */
  filled?: boolean
}

function ClayDefs({
  id,
  stops,
}: {
  id: string
  stops: [string, string]
}) {
  return (
    <defs>
      <linearGradient id={`${id}-fill`} x1="20%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stopColor={stops[0]} />
        <stop offset="100%" stopColor={stops[1]} />
      </linearGradient>
      <linearGradient id={`${id}-shine`} x1="30%" y1="0%" x2="70%" y2="80%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
        <stop offset="55%" stopColor="rgba(255,255,255,0)" />
      </linearGradient>
      <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0.6" dy="1.2" stdDeviation="0.9" floodColor="rgba(58,52,46,0.22)" />
      </filter>
    </defs>
  )
}

/** 专注度 · 粘土心形 */
export function ClayHeart({ size = 28, className = '', filled = true }: IconProps) {
  const uid = useId().replace(/:/g, '')
  const stops: [string, string] = filled ? ['#ffb0b8', '#e87a7a'] : ['#efe8de', '#d9d0c4']
  return (
    <svg
      className={`clay-icon clay-icon--heart ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden
    >
      <ClayDefs id={uid} stops={stops} />
      <path
        d="M16 27c-.4 0-.8-.15-1.1-.45C12.2 24 6.2 18.5 4.4 14.8 2.9 11.8 3.6 8 6.5 6.4c2-.9 4.3-.4 5.7 1.2L16 11l3.8-3.4c1.4-1.6 3.7-2.1 5.7-1.2 2.9 1.6 3.6 5.4 2.1 8.4-1.8 3.7-7.8 9.2-10.5 11.75-.3.3-.7.45-1.1.45z"
        fill={`url(#${uid}-fill)`}
        filter={`url(#${uid}-soft)`}
      />
      <ellipse cx="11.5" cy="11" rx="3.2" ry="2.2" fill={`url(#${uid}-shine)`} opacity="0.9" />
      <path
        d="M16 27c-.4 0-.8-.15-1.1-.45C12.2 24 6.2 18.5 4.4 14.8 2.9 11.8 3.6 8 6.5 6.4c2-.9 4.3-.4 5.7 1.2L16 11l3.8-3.4c1.4-1.6 3.7-2.1 5.7-1.2 2.9 1.6 3.6 5.4 2.1 8.4-1.8 3.7-7.8 9.2-10.5 11.75-.3.3-.7.45-1.1.45z"
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 能量消耗 · 粘土闪电 */
export function ClayBolt({ size = 28, className = '', filled = true }: IconProps) {
  const uid = useId().replace(/:/g, '')
  const stops: [string, string] = filled ? ['#ffd29a', '#f0a06a'] : ['#efe8de', '#d9d0c4']
  return (
    <svg
      className={`clay-icon clay-icon--bolt ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden
    >
      <ClayDefs id={uid} stops={stops} />
      <path
        d="M18.2 3.5c.55-.15 1.05.35.9.9L16.8 13h6.2c.7 0 1.05.85.55 1.35L13.2 28.2c-.5.55-1.4.1-1.2-.6L14.4 17H8.5c-.7 0-1.05-.9-.5-1.35L17.5 4.1c.2-.2.45-.35.7-.6z"
        fill={`url(#${uid}-fill)`}
        filter={`url(#${uid}-soft)`}
        strokeLinejoin="round"
      />
      <path
        d="M14.2 8.5c.2-.35.7-.2.65.2L14.2 13.8h3.1c.35 0 .5.4.25.65l-3.4 4.2c-.3.35-.85.05-.7-.4l1.1-3.45H12c-.35 0-.5-.45-.25-.7l2.45-5.6z"
        fill={`url(#${uid}-shine)`}
        opacity="0.75"
      />
    </svg>
  )
}

/** 中栏 · 日期筛选 */
export function ClayCalendar({ size = 20, className = '', filled = true }: IconProps) {
  const uid = useId().replace(/:/g, '')
  const stops: [string, string] = filled ? ['#cfc7fb', '#7c6ff0'] : ['#f5efe6', '#e2d8c8']
  return (
    <svg
      className={`clay-icon clay-icon--calendar ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden
    >
      <ClayDefs id={uid} stops={stops} />
      <rect
        x="4"
        y="6"
        width="24"
        height="22"
        rx="8"
        fill={`url(#${uid}-fill)`}
        filter={`url(#${uid}-soft)`}
      />
      <rect x="4" y="6" width="24" height="8" rx="8" fill="rgba(255,255,255,0.35)" />
      <circle cx="11" cy="8.5" r="1.6" fill="#fffdf9" />
      <circle cx="21" cy="8.5" r="1.6" fill="#fffdf9" />
      <rect x="9" y="17" width="4.2" height="4.2" rx="1.4" fill="#fffdf9" opacity="0.95" />
      <rect x="14" y="17" width="4.2" height="4.2" rx="1.4" fill="#fffdf9" opacity="0.75" />
      <rect x="19" y="17" width="4.2" height="4.2" rx="1.4" fill="#fffdf9" opacity="0.55" />
      <ellipse cx="12" cy="12" rx="5" ry="2.2" fill={`url(#${uid}-shine)`} />
    </svg>
  )
}

/** 中栏 · 标签筛选 */
export function ClayHash({ size = 20, className = '', filled = true }: IconProps) {
  const uid = useId().replace(/:/g, '')
  const stops: [string, string] = filled ? ['#b8f0d8', '#7ec8a3'] : ['#f5efe6', '#e2d8c8']
  return (
    <svg
      className={`clay-icon clay-icon--hash ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden
    >
      <ClayDefs id={uid} stops={stops} />
      <circle
        cx="16"
        cy="16"
        r="13"
        fill={`url(#${uid}-fill)`}
        filter={`url(#${uid}-soft)`}
      />
      <ellipse cx="11" cy="11" rx="5" ry="3" fill={`url(#${uid}-shine)`} />
      <path
        d="M12.2 9.5h2.2l-.55 3.2h3.3l.55-3.2h2.2l-.55 3.2H22v2.1h-2.85l-.45 2.6H22v2.1h-3.55l-.55 3.2h-2.2l.55-3.2h-3.3l-.55 3.2h-2.2l.55-3.2H10v-2.1h2.85l.45-2.6H10v-2.1h3.55l.65-3.2zm2.85 5.3h3.3l-.45 2.6h-3.3l.45-2.6z"
        fill="#fffdf9"
        fillOpacity="0.95"
      />
    </svg>
  )
}

/** 话题标注 · 小标签泡 */
export function ClayTag({ size = 18, className = '', filled = true }: IconProps) {
  const uid = useId().replace(/:/g, '')
  const stops: [string, string] = filled ? ['#cfc7fb', '#7c6ff0'] : ['#efe8de', '#d9d0c4']
  return (
    <svg
      className={`clay-icon clay-icon--tag ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden
    >
      <ClayDefs id={uid} stops={stops} />
      <path
        d="M14.2 5.2 26.5 6.8c1 .15 1.7 1.1 1.45 2.05L22.8 26c-.2.8-1.05 1.25-1.85 1L5.8 21.5c-.9-.3-1.3-1.3-.95-2.15L12.2 6.2c.25-.75 1-.95 2-.1z"
        fill={`url(#${uid}-fill)`}
        filter={`url(#${uid}-soft)`}
      />
      <circle cx="20.2" cy="12.2" r="2.2" fill="#fffdf9" />
      <ellipse cx="16" cy="10" rx="4" ry="2" fill={`url(#${uid}-shine)`} />
    </svg>
  )
}

/** 行内能量摘要：粘土小图标 × 数量（含半档） */
export function ClayEnergyInline({
  value,
  kind,
  size = 14,
}: {
  value: number
  kind: 'heart' | 'bolt'
  size?: number
}) {
  const full = Math.floor(value + 1e-9)
  const half = value - full >= 0.5 - 1e-9
  const Icon = kind === 'heart' ? ClayHeart : ClayBolt
  const nodes = []
  for (let i = 0; i < full; i += 1) {
    nodes.push(<Icon key={`f${i}`} size={size} filled />)
  }
  if (half) {
    nodes.push(
      <span key="half" className="clay-icon-half-wrap" style={{ width: size / 2, height: size }}>
        <Icon size={size} filled />
      </span>,
    )
  }
  return <span className="clay-energy-inline">{nodes}</span>
}
