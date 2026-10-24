import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion'
import { PageCam } from '../lib/PageCam'
import { focus, L, union } from '../lib/cam'
import { Caption, prog } from '../lib/ui'

const FadeIn: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame()
  return <AbsoluteFill style={{ opacity: prog(f, 0, 10) }}>{children}</AbsoluteFill>
}

/** The accountability screens: the override reason, the log it lands in, and the dose limits with their sources. */
export const TrustShot: React.FC = () => {
  const dlg = L['override-filled'].boxes.dialog
  const log = L.log
  const logBox = union(log.lists.cards[0], log.lists.cards[3])
  const dataBox = { x: 408, y: 254, w: 1104, h: 430 }
  return (
    <AbsoluteFill>
      <PageCam src="textures/override-filled.png" pageH={1080} keys={[focus(0, dlg, 1.06, 0, -40), focus(54, dlg, 1.12, 0, -40)]} />
      <Sequence from={46} durationInFrames={104}>
        <FadeIn>
          <PageCam src="textures/log.png" pageH={log.pageH} keys={[focus(0, logBox, 1.45, 0, -40), focus(58, logBox, 1.55, 0, -40)]} />
        </FadeIn>
      </Sequence>
      <Sequence from={96} durationInFrames={54}>
        <FadeIn>
          <PageCam src="textures/data.png" pageH={1080} keys={[focus(0, dataBox, 1.5, 0, -30), focus(54, dataBox, 1.6, 0, -30)]} />
        </FadeIn>
      </Sequence>
      <Caption from={6} to={46}>An override needs a reason.</Caption>
      <Caption from={52} to={92}>Every one is logged.</Caption>
      <Caption from={102} to={146}>Every limit shows its source.</Caption>
    </AbsoluteFill>
  )
}
