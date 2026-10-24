// Parchi tokens, copied from src/ui/styles/tokens.css (the single source of truth for the app). Do not add colours here.
import { Easing } from 'remotion'

export const C = {
  ink: '#122056',
  inkMuted: '#5C6488',
  accent: '#5B65DC',
  accentStrong: '#4A53C7',
  accentSoft: '#8D95F0',
  tint: '#EEEFFD',
  bg: '#FAFAFD',
  panel: '#F3F4FD',
  white: '#FFFFFF',
  slip: '#FBF9F3',
  border: '#DCDFF0',
  onInkMuted: '#CDD2EE',
}

export const FPS = 30
export const W = 1920
export const H = 1080
export const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"

// Motion voice: calm care. Symmetric ease-in-out, about 42f for a main move, no overshoot except the one slip landing.
export const ease = {
  inOut: Easing.bezier(0.45, 0, 0.25, 1),
  out: Easing.bezier(0.16, 0.84, 0.3, 1),
  land: Easing.bezier(0.2, 1.25, 0.3, 1),
}
