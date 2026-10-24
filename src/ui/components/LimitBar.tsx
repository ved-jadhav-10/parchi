import { limitState, mg } from '../lib/format'

/** total_mg_day against limit_mg_day. No limit on file -> dashed outline, never a guessed limit. */
export const LimitBar = ({ total, limit }: { total: number; limit?: number }) => {
  if (limit === undefined) {
    return (
      <div className="limit">
        <div className="limit__track limit__track--none" aria-hidden="true" />
        <span className="limit__text num">{mg(total)} mg · No limit on file</span>
      </div>
    )
  }
  const state = limitState(total, limit)
  const scale = Math.max(limit * 1.25, total)
  return (
    <div className="limit">
      <div className="limit__track" aria-hidden="true">
        <div className="limit__fill" data-state={state} style={{ width: `${(total / scale) * 100}%` }} />
        <div className="limit__marker" style={{ left: `${(limit / scale) * 100}%` }} />
      </div>
      <span className="limit__text num">
        {mg(total)} / {mg(limit)} mg
      </span>
    </div>
  )
}
