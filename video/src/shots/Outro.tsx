import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { C, FONT, ease } from '../tokens'
import { prog, Scribble } from '../lib/ui'

const Mark: React.FC<{ h: number }> = ({ h }) => (
  <svg viewBox="24 8 52 80" width={(h * 52) / 80} height={h} aria-hidden="true">
    <path d="M28 16a4 4 0 0 1 4-4h36a4 4 0 0 1 4 4v70l-5.5-6-5.5 6-5.5-6-5.5 6-5.5-6-5.5 6-5.5-6-5.5 6z" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinejoin="round" />
    <path d="M38 33h24M38 46h24" stroke="#fff" strokeOpacity=".5" strokeWidth="3" strokeLinecap="round" />
    <path d="M38 59h14" stroke={C.ink} strokeWidth="4.5" strokeLinecap="round" />
  </svg>
)

/** Close: the line, then the slip mark shrinks into the wordmark lockup and holds for a full second. */
export const Outro: React.FC = () => {
  const f = useCurrentFrame()
  const head = prog(f, 4, 26, ease.out) * (1 - prog(f, 54, 68))
  const sub = prog(f, 20, 40, ease.out) * (1 - prog(f, 54, 68))
  const lock = prog(f, 62, 94, ease.inOut)
  const word = prog(f, 80, 100, ease.out)
  const tag = prog(f, 98, 114, ease.out)
  const markH = interpolate(lock, [0, 1], [520, 210])
  return (
    <AbsoluteFill style={{ background: C.accent, fontFamily: FONT, color: '#fff' }}>
      <div style={{ opacity: 1 - 0.85 * prog(f, 58, 90) }}>
        <Scribble start={-60} transform="translate(760 -40) scale(1.5)" />
      </div>
      <div style={{ position: 'absolute', left: 132, top: 290, opacity: head, transform: `translateY(${(1 - head) * 30}px)` }}>
        <div style={{ fontSize: 128, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.04 }}>Put it on<br />the counter.</div>
      </div>
      <div style={{ position: 'absolute', left: 136, top: 650, opacity: sub, fontSize: 42, maxWidth: 800, fontWeight: 500, color: C.onInkMuted, transform: `translateY(${(1 - sub) * 18}px)` }}>
        Installs on a phone or the counter PC. Works offline.
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', opacity: prog(f, 60, 72) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 44 }}>
          <Mark h={markH} />
          <div style={{ fontSize: 190, fontWeight: 700, letterSpacing: '-0.04em', opacity: word, transform: `translateX(${(1 - word) * -40}px)` }}>Parchi</div>
        </div>
        <div style={{ position: 'absolute', top: 720, fontSize: 44, fontWeight: 500, color: C.onInkMuted, opacity: tag, transform: `translateY(${(1 - tag) * 14}px)` }}>
          Decision support for a pharmacist.
        </div>
      </div>
    </AbsoluteFill>
  )
}
