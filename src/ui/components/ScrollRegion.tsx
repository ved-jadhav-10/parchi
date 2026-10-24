import type { ReactNode } from 'react'

/** A wide table or chart that scrolls sideways. Focusable and named, so a keyboard user can scroll it and a screen reader knows what it is. */
export const ScrollRegion = ({ label, className, children }: { label: string; className?: string; children: ReactNode }) => (
  <div className={className} tabIndex={0} role="region" aria-label={label}>
    {children}
  </div>
)
