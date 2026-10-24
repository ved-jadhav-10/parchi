import type { ReactNode } from 'react'
import type { Tier } from '../../engine/contracts'
import { Icon, type IconName } from './Icons'

type CardProps = { title?: string; icon?: IconName; description?: string; children: ReactNode }

/** Frosted card: the base container for every block of content. */
export const Card = ({ title, icon, description, children }: CardProps) => (
  <section className="card">
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

type KpiProps = { label: string; value: string | number; hint?: string; tier?: Tier }

/** Big-number tile. `tier` tints the number and adds the tier left bar. */
export const KpiCard = ({ label, value, hint, tier }: KpiProps) => (
  <div className="card kpi" data-tier={tier}>
    <p className="kpi__label">{label}</p>
    <p className="kpi__value num">{value}</p>
    {hint && <p className="kpi__hint">{hint}</p>}
  </div>
)
