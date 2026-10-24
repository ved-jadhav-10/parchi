import type { ReactNode } from 'react'
import type { Tier } from '../../engine/contracts'
import { Icon, type IconName } from './Icons'

type CardProps = { id?: string; title?: string; icon?: IconName; description?: string; children: ReactNode }

/** Card: the base container for every block of content. */
export const Card = ({ id, title, icon, description, children }: CardProps) => (
  <section className="card" id={id}>
    {title && (
      <header className="card__head">
        <h2 className="card__title">
          {icon && <Icon name={icon} size={16} />}
          {title}
        </h2>
        {description && <p className="card__desc">{description}</p>}
      </header>
    )}
    {children}
  </section>
)

type KpiProps = { label: string; value: string | number; hint?: string; tier?: Tier; short?: string; pressed?: boolean; onSelect?: () => void }

/**
 * Big-number tile. `tier` tints the number and adds the tier left bar. `short` is a one-word label a tight layout may show
 * instead; screen readers still get `label`. With `onSelect` the tile is a toggle button (a filter) and `pressed` its state.
 */
export const KpiCard = ({ label, value, hint, tier, short, pressed, onSelect }: KpiProps) => {
  const body = (
    <>
      <span className="kpi__label">
        {short ? (
          <>
            <span className="kpi__long">{label}</span>
            <span className="kpi__short" aria-hidden="true">
              {short}
            </span>
          </>
        ) : (
          label
        )}
      </span>
      <span className="kpi__value num">{value}</span>
      {hint && <span className="kpi__hint">{hint}</span>}
    </>
  )
  return onSelect ? (
    <button type="button" className="card kpi kpi--toggle" data-tier={tier} aria-pressed={!!pressed} onClick={onSelect}>
      {body}
    </button>
  ) : (
    <div className="card kpi" data-tier={tier}>
      {body}
    </div>
  )
}
