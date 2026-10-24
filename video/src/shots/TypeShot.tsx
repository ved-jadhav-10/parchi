import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { PageCam } from '../lib/PageCam'
import { focus, full, L } from '../lib/cam'
import { Caption, Cursor, prog, Ripple } from '../lib/ui'
import { ease } from '../tokens'

const kAt = (f: number) => (f < 30 ? 0 : Math.min(7, 1 + Math.floor((f - 30) / 10)))
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** The typed prescription (real states captured line by line), the patient's age, then the click that runs the check. */
export const TypeShot: React.FC = () => {
  const f = useCurrentFrame()
  const b = L['check-empty'].boxes
  const k = kAt(f)
  const src = f >= 100 ? 'textures/check-ready.png' : k === 0 ? 'textures/check-empty.png' : `textures/check-type-${k}.png`
  const lower = { x: b.rxCard.x, y: 500, w: b.rxCard.w, h: 260 }

  const keys = [
    full(0),
    focus(22, b.rxCard, 1.7, -150, -20),
    focus(92, b.rxCard, 1.7, -150, -20),
    focus(112, lower, 1.55, -150, -20),
    focus(119, lower, 1.55, -150, -20),
    full(134),
  ]

  // pointer in page space: rests by the textarea, visits the age field, then the button
  const T = [18, 30, 92, 104, 112, 118]
  const px = interpolate(f, T, [760, 700, 700, 500, 500, 540], { ...clamp, easing: ease.inOut })
  const py = interpolate(f, T, [330, 360, 440, 722, 722, 528], { ...clamp, easing: ease.inOut })
  const press = f >= 118 && f < 124 ? 1 : 0
  const showResult = prog(f, 126, 135)

  return (
    <AbsoluteFill>
      <PageCam src={src} pageH={1080} keys={keys}>
        <Cursor x={px} y={py} press={press} opacity={prog(f, 16, 24)} />
        <Ripple x={540} y={528} at={118} />
      </PageCam>
      {showResult > 0 && (
        <AbsoluteFill style={{ opacity: showResult }}>
          <PageCam src="textures/check-result.png" pageH={L['check-result'].pageH} keys={[full(0)]} />
        </AbsoluteFill>
      )}
      <Caption from={8} to={118}>Type it the way it arrives.</Caption>
    </AbsoluteFill>
  )
}
