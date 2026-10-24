import { AbsoluteFill } from 'remotion'
import { PageCam } from '../lib/PageCam'
import { L } from '../lib/cam'
import { Caption } from '../lib/ui'

/** The dark "It informs. The pharmacist decides." section of the landing page, with the three tiers. */
export const TiersShot: React.FC = () => (
  <AbsoluteFill>
    <PageCam
      src="textures/home-full.png"
      pageH={L['home-full'].pageH}
      keys={[
        { frame: 0, cx: 960, cy: 1640, zoom: 1.28 },
        { frame: 75, cx: 960, cy: 1672, zoom: 1.46 },
      ]}
    />
    <Caption from={8} to={68}>Three tiers. Interrupts stay rare.</Caption>
  </AbsoluteFill>
)
