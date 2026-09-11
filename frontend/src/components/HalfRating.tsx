import { ClayBolt, ClayHeart } from '@/components/icons/ClayIcons'

type HalfRatingProps = {
  value: number
  onChange: (v: number) => void
  icon: 'heart' | 'bolt'
  label: string
}

/** 0–5，步进 0.5；点击图标左半=半颗，右半=整颗 */
export function HalfRating({ value, onChange, icon, label }: HalfRatingProps) {
  const tone = icon === 'heart' ? 'focus' : 'drain'
  const Icon = icon === 'heart' ? ClayHeart : ClayBolt

  return (
    <div className="half-rating">
      <div className="rate-label">
        <span className="rate-label-icon" aria-hidden>
          <Icon size={18} filled />
        </span>
        {label}
        <span className="rate-value">{value.toFixed(1)}</span>
      </div>
      <div className="rate-row" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => {
          const full = value >= n - 1e-9
          const half = !full && value >= n - 0.5 - 1e-9
          return (
            <span key={n} className={`star-slot clay-rate-slot ${tone}`}>
              <button
                type="button"
                className="star-half left"
                aria-label={`${n - 0.5}`}
                onClick={() => onChange(n - 0.5)}
              />
              <button
                type="button"
                className="star-half right"
                aria-label={`${n}`}
                onClick={() => onChange(n)}
              />
              <span className="star-face clay-rate-face" aria-hidden>
                <Icon className="star-empty" size={28} filled={false} />
                <span className={`star-fill${full ? ' full' : half ? ' half' : ''}`}>
                  <Icon size={28} filled />
                </span>
              </span>
            </span>
          )
        })}
        <button type="button" className="rate-clear" onClick={() => onChange(0)}>
          清零
        </button>
      </div>
    </div>
  )
}

export { ClayEnergyInline as formatEnergyIcons } from '@/components/icons/ClayIcons'

/** 纯文本兜底（日志等）；UI 优先用 formatEnergyIcons */
export function formatEnergy(n: number, icon: 'heart' | 'bolt') {
  const full = Math.floor(n + 1e-9)
  const half = n - full >= 0.5 - 1e-9
  const g = icon === 'heart' ? '♡' : '⚡'
  return `${g.repeat(full)}${half ? '½' : ''}`
}
