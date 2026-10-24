import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion'
import { C, FONT, ease } from '../tokens'
import { L } from '../lib/cam'
import { prog, Scribble } from '../lib/ui'

/** Opening: one subject (the sample slip), one arc: rise with a small overshoot, hover, settle. Real slip capture, transparent. */
export const Hero: React.FC = () => {
  const f = useCurrentFrame()
  const slip = L['home-full'].boxes.slip as { w: number; h: number }
  const S = 1.9
  const w = slip.w * S
  const h = slip.h * S
  const rise = prog(f, 14, 54, ease.land)
  const y = (1 - rise) * 720
  const rot = (1 - rise) * 5
  const bob = f > 54 ? Math.sin(((f - 54) / 64) * Math.PI * 2) * 4 * Math.min(1, (f - 54) / 20) : 0
  const lift = 18 + 14 * Math.min(1, rise)
  const line = (i: number, text: string) => {
    const t = prog(f, 20 + i * 8, 38 + i * 8, ease.out)
    return <div style={{ opacity: t, transform: `translateY(${(1 - t) * 34}px)` }}>{text}</div>
  }
  const badge = prog(f, 48, 62, ease.out)
  return (
    <AbsoluteFill style={{ background: C.accent }}>
      <Scribble start={0} />
      <div style={{ position: 'absolute', left: 132, top: 330, fontFamily: FONT, color: '#fff' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
            padding: '10px 26px 10px 14px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.16)',
            fontSize: 32,
            fontWeight: 600,
            opacity: badge,
            transform: `translateY(${(1 - badge) * 12}px)`,
            marginBottom: 34,
          }}
        >
          <span style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
              <path d="m8.5 8.5 7 7" />
            </svg>
          </span>
          Made for the chemist's counter
        </div>
        <div style={{ fontSize: 104, lineHeight: 1.06, fontWeight: 700, letterSpacing: '-0.035em' }}>
          {line(0, 'A second look at')}
          {line(1, 'every parchi.')}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 1030, top: 168 + y + bob, width: w, height: h, transform: `rotate(${rot}deg)` }}>
        <Img src={staticFile('textures/slip.png')} style={{ width: w, height: h, filter: `drop-shadow(0 ${lift}px ${lift * 1.8}px rgba(18,32,86,0.34))` }} />
      </div>
    </AbsoluteFill>
  )
}
