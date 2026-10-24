import { Composition } from 'remotion'
import { Trailer, type TrailerProps } from './Trailer'
import { FPS, H, W } from './tokens'
import { TOTAL } from './timeline'

export const Root: React.FC = () => (
  <Composition
    id="Trailer"
    component={Trailer as React.FC<TrailerProps>}
    durationInFrames={TOTAL}
    fps={FPS}
    width={W}
    height={H}
    defaultProps={{ bgm: true }}
  />
)
