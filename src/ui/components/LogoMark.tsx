/** Parchi mark: a torn prescription slip, the last ruled line picked out in the accent. Source: public/logo.svg */
export const LogoMark = ({ size = 32, accent = 'var(--color-accent)' }: { size?: number; accent?: string }) => (
  <svg viewBox="24 8 52 80" width={(size * 52) / 80} height={size} aria-hidden="true" focusable="false">
    <path
      d="M28 16a4 4 0 0 1 4-4h36a4 4 0 0 1 4 4v70l-5.5-6-5.5 6-5.5-6-5.5 6-5.5-6-5.5 6-5.5-6-5.5 6z"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinejoin="round"
    />
    <path d="M38 33h24M38 46h24" stroke="currentColor" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" />
    <path d="M38 59h14" stroke={accent} strokeWidth="4.5" strokeLinecap="round" />
  </svg>
)
