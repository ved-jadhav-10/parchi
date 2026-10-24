import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { PageCam } from '../lib/PageCam'
import { focus, full, L } from '../lib/cam'
import { C } from '../tokens'
import { Caption, CountUp, Mask, prog } from '../lib/ui'

const WORD = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']

/** One continuous move down the real result: the KPI row, the first alert, then the paracetamol row of the X-ray. */
export const ResultShot: React.FC = () => {
  const f = useCurrentFrame()
  const r = L['check-result']
  const row0 = r.xrayRows[0]
  const xrayTop = { x: row0.x, y: row0.y - 44, w: row0.w, h: 215 }
  const keys = [
    full(0),
    focus(32, r.boxes.kpis, 1.85, 0, -50),
    focus(70, r.boxes.kpis, 1.85, 0, -50),
    focus(92, r.boxes.alert1, 1.75, 0, -70),
    focus(124, r.boxes.alert1, 1.75, 0, -70),
    focus(150, xrayTop, 1.9, 0, -60),
    focus(210, xrayTop, 1.9, 0, -60),
  ]
  // the KPI row as captured: Interrupt, Inform, Logged, Brands to check
  const [nInt, nInf, nLog] = (r.kpi as string[]).map((v) => Number(v))
  const ring = prog(f, 156, 172)
  const pad = 6
  return (
    <AbsoluteFill>
      <PageCam src="textures/check-result.png" pageH={r.pageH} keys={keys}>
        {/* the form column and page title step back once the camera is on the result */}
        <Mask x={330} y={92} w={520} h={92} opacity={prog(f, 8, 30)} tone={C.bg} />
        <Mask x={396} y={206} w={430} h={1200} opacity={prog(f, 8, 30)} />
        <div
          style={{
            position: 'absolute',
            left: row0.x - pad,
            top: row0.y - pad,
            width: row0.w + pad * 2,
            height: row0.h + pad * 2,
            borderRadius: 12,
            border: `3px solid ${C.accent}`,
            boxShadow: `0 0 0 ${6 * ring}px rgba(91,101,220,0.18)`,
            opacity: ring,
          }}
        />
      </PageCam>
      <Caption from={8} to={66}>
        {WORD[nInt]} to act on. {WORD[nInf]} to know. {WORD[nLog]} logged.
      </Caption>
      <Caption from={76} to={122}>Every alert names its reason and source.</Caption>
      <Caption from={134} to={204}>
        Three brands, one ingredient: <CountUp from={0} to={4100} start={138} end={176} /> mg a day.
      </Caption>
    </AbsoluteFill>
  )
}
