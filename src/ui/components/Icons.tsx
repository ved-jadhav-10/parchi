import type { Tier } from '../../engine/contracts'

const paths = {
  interrupt: 'M12 3 2.5 20h19L12 3Zm0 6v5m0 3v.5',
  inform: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v5m0-8v.5',
  silent: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'm6 6 12 12M18 6 6 18',
  pulse: 'M3 12h4l2-6 4 12 2-6h6',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  flask: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H3',
} as const

export type IconName = keyof typeof paths

export const Icon = ({ name, size = 18 }: { name: IconName; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={paths[name]} />
  </svg>
)

export const tierLabel: Record<Tier, string> = {
  interrupt: 'Interrupt',
  inform: 'Inform',
  silent: 'Silent',
}

export const TierBadge = ({ tier }: { tier: Tier }) => (
  <span className="tier-badge" data-tier={tier}>
    <Icon name={tier} size={14} />
    {tierLabel[tier]}
  </span>
)
