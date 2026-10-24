import { createContext, useContext } from 'react'
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion'
import { C, FONT, ease } from '../tokens'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
export const prog = (f: number, a: number, b: number, easing: (t: number) => number = ease.inOut) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing })

/** Set false to render the film with no narration captions (the on-screen headlines of the opening and close stay). */
export const CaptionsOn = createContext(true)

/**
 * Narration caption. A white pill so it reads over any screenshot, 56px type (>= 5% of frame height, aesthetic rule Q11).
 * Times are local to the enclosing Sequence.
 */
export const Caption: React.FC<{ from: number; to: number; children: React.ReactNode; bottom?: number }> = ({ from, to, children, bottom = 62 }) => {
  const on = useContext(CaptionsOn)
  const f = useCurrentFrame()
  const inT = prog(f, from, from + 10, ease.out)
  const outT = 1 - prog(f, to - 8, to)
  const o = inT * outT
  if (!on || f < from - 1 || f > to + 1) return null
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom, display: 'flex', justifyContent: 'center', pointerEvents: 'none', opacity: o, transform: `translateY(${(1 - inT) * 16}px)` }}>
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 56,
          lineHeight: 1.15,
          letterSpacing: '-0.01em',
          color: C.ink,
          background: 'rgba(255,255,255,0.97)',
          padding: '18px 44px 20px',
          borderRadius: 999,
          boxShadow: '0 0 0 1px rgba(18,32,86,0.08), 0 14px 36px rgba(18,32,86,0.16)',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </div>
    </div>
  )
}

/** A count-up in en-IN grouping, e.g. 4,100. */
export const CountUp: React.FC<{ to: number; from: number; start: number; end: number }> = ({ to, from, start, end }) => {
  const f = useCurrentFrame()
  const v = Math.round(interpolate(f, [start, end], [from, to], { ...clamp, easing: Easing.bezier(0.25, 0.8, 0.25, 1) }))
  return <span>{v.toLocaleString('en-IN')}</span>
}

/** Pointer in page space. `press` 0..1 squeezes it on a click. */
export const Cursor: React.FC<{ x: number; y: number; press?: number; opacity?: number; size?: number }> = ({ x, y, press = 0, opacity = 1, size = 26 }) => (
  <svg
    width={size}
    height={size * 1.4}
    viewBox="0 0 20 28"
    style={{ position: 'absolute', left: x, top: y, opacity, transform: `scale(${1 - press * 0.12})`, transformOrigin: '0 0', filter: 'drop-shadow(0 3px 5px rgba(18,32,86,0.35))', pointerEvents: 'none' }}
  >
    <path d="M2 2v21l5.2-5 3.6 8 3.2-1.5-3.6-7.6H18z" fill="#fff" stroke={C.ink} strokeWidth="2" strokeLinejoin="round" />
  </svg>
)

/** Two concentric accent rings from a click point (type-and-filter grammar: staggered 3f, 10f each). */
export const Ripple: React.FC<{ x: number; y: number; at: number }> = ({ x, y, at }) => {
  const f = useCurrentFrame()
  return (
    <>
      {[0, 3].map((d) => {
        const t = prog(f, at + d, at + d + 14, ease.out)
        if (f < at + d || t >= 1) return null
        const r = 14 + t * (d ? 78 : 54)
        return <div key={d} style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', border: `3px solid ${C.accent}`, opacity: 1 - t, pointerEvents: 'none' }} />
      })}
    </>
  )
}

/** The brand wipe: an ink panel with a soft-indigo leading edge crossing the frame, fully covering it at the cut. */
export const Wipe: React.FC<{ dur?: number }> = ({ dur = 22 }) => {
  const f = useCurrentFrame()
  const t = prog(f, 0, dur, Easing.bezier(0.6, 0, 0.3, 1))
  const x = interpolate(t, [0, 1], [-112, 112])
  return (
    <AbsoluteFill style={{ overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, width: '112%', left: `${x}%`, background: C.ink }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, right: '100%', width: 40, background: C.accentSoft }} />
      </div>
    </AbsoluteFill>
  )
}

/** The doctor's scribble from the landing hero, drawn on with pathLength. White on indigo. */
export const SCRIBBLE = [
  { d: 'M250 36C410 78 590 140 760 238C610 262 450 228 346 262C276 288 292 340 410 366C530 390 654 408 760 452', w: 2.2, o: 1, a: 0, b: 44 },
  { d: 'M262 540C330 494 424 496 522 528C620 558 702 592 760 612', w: 1.6, o: 0.6, a: 6, b: 40 },
  { d: 'M270 640C262 572 320 526 408 538C524 554 642 600 760 640', w: 2.2, o: 1, a: 12, b: 50 },
  { d: 'M300 150C400 140 500 160 580 196', w: 1.4, o: 0.45, a: 16, b: 46 },
]
export const Scribble: React.FC<{ start?: number; transform?: string }> = ({ start = 0, transform = 'translate(500 -40) scale(1.8)' }) => {
  const f = useCurrentFrame() - start
  return (
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0 }} fill="none" stroke="#fff" strokeLinecap="round">
      <g transform={transform}>
        {SCRIBBLE.map((p, i) => (
          <path key={i} d={p.d} pathLength={1} strokeWidth={p.w} strokeOpacity={p.o} strokeDasharray="1 1" strokeDashoffset={1 - prog(f, p.a, p.b, ease.out)} />
        ))}
        {[[620, 150, 11, 30], [694, 476, 8, 38], [318, 596, 5, 44]].map(([cx, cy, r, a], i) => (
          <circle key={i} cx={cx} cy={cy} r={r * prog(f, a, a + 12, ease.out)} fill="#fff" stroke="none" />
        ))}
      </g>
    </svg>
  )
}

/** Page-space patch in the workspace panel tone, to keep a neighbouring card out of a close-up. */
export const Mask: React.FC<{ x: number; y: number; w: number; h: number; opacity?: number; tone?: string }> = ({ x, y, w, h, opacity = 1, tone = C.panel }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: tone, opacity }} />
)
