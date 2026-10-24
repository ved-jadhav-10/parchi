import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion'
import { PageCam } from '../lib/PageCam'
import { focus, full, L, union } from '../lib/cam'
import { C } from '../tokens'
import { Caption, Cursor, Mask, prog, Ripple } from '../lib/ui'

/** Fades its children in over 10 frames; it sits inside a Sequence so the frame is local to the layer. */
const FadeIn: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame()
  return <AbsoluteFill style={{ opacity: prog(f, 0, 10) }}>{children}</AbsoluteFill>
}

const QueueLayer: React.FC = () => {
  const f = useCurrentFrame()
  const q = L.queue
  const rows = q.lists.rows.slice(0, 3)
  const target = union(...rows)
  const first = rows[0]
  const hit = prog(f, 34, 42)
  const px = 1000 + (1428 - 1000) * prog(f, 16, 40)
  const py = 420 + (first.y + first.h / 2 - 420) * prog(f, 16, 40)
  return (
    <PageCam src="textures/queue.png" pageH={q.pageH} keys={[full(0), focus(22, target, 1.55, 0, -40), focus(60, target, 1.6, 0, -40)]}>
      <div style={{ position: 'absolute', left: first.x - 4, top: first.y - 4, width: first.w + 8, height: first.h + 8, borderRadius: 12, border: `3px solid ${C.accent}`, opacity: hit }} />
      <Cursor x={px} y={py} press={f >= 44 && f < 50 ? 1 : 0} opacity={prog(f, 10, 18)} />
      <Ripple x={1428} y={first.y + first.h / 2} at={44} />
    </PageCam>
  )
}

/** Phase 2: the review queue, then one order's calendar and timeline. Real captures of the sample account. */
export const HistoryShot: React.FC = () => {
  const cal = L['order-calendar']
  const tl = L['order-timeline']
  const calBox = { x: 832, y: 470, w: 680, h: 520 }
  const tlBox = tl.lists.cards[3]
  return (
    <AbsoluteFill>
      <QueueLayer />
      <Sequence from={50} durationInFrames={115}>
        <FadeIn>
          <PageCam src="textures/order-calendar.png" pageH={cal.pageH} keys={[focus(0, calBox, 1.7, 0, -30), focus(58, calBox, 1.88, 0, -30)]}>
            <Mask x={400} y={230} w={424} h={1500} />
          </PageCam>
        </FadeIn>
      </Sequence>
      <Sequence from={108} durationInFrames={57}>
        <FadeIn>
          <PageCam src="textures/order-timeline.png" pageH={tl.pageH} keys={[focus(0, tlBox, 1.68, 0, -10), focus(57, tlBox, 1.8, 0, -10)]}>
            <Mask x={400} y={230} w={424} h={1500} />
          </PageCam>
        </FadeIn>
      </Sequence>
      <Caption from={5} to={50}>Orders ranked, riskiest first.</Caption>
      <Caption from={58} to={104}>Every doctor's prescription, by day.</Caption>
      <Caption from={114} to={160}>Overlapping doses are added up.</Caption>
    </AbsoluteFill>
  )
}
