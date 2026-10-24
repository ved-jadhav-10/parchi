import { AbsoluteFill, Audio, interpolate, Sequence, staticFile } from 'remotion'
import { useFont } from './fonts'
import { C } from './tokens'
import { SFX } from './sfx'
import { SHOTS, TOTAL, WIPES } from './timeline'
import { Hero } from './shots/Hero'
import { TypeShot } from './shots/TypeShot'
import { ResultShot } from './shots/ResultShot'
import { TiersShot } from './shots/TiersShot'
import { HistoryShot } from './shots/HistoryShot'
import { TrustShot } from './shots/TrustShot'
import { Outro } from './shots/Outro'
import { CaptionsOn, Wipe } from './lib/ui'

export type TrailerProps = { bgm: boolean; captions?: boolean }

const WIPE = 22

const bgmVolume = (f: number) =>
  0.3 * interpolate(f, [0, 30, TOTAL - 50, TOTAL - 4], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

export const Trailer: React.FC<TrailerProps> = ({ bgm, captions = true }) => {
  useFont()
  const shots: [keyof typeof SHOTS, React.FC][] = [
    ['hero', Hero],
    ['type', TypeShot],
    ['result', ResultShot],
    ['tiers', TiersShot],
    ['history', HistoryShot],
    ['trust', TrustShot],
    ['outro', Outro],
  ]
  return (
    <CaptionsOn.Provider value={captions}>
    <AbsoluteFill style={{ background: C.bg }}>
      {shots.map(([name, Comp]) => (
        <Sequence key={name} from={SHOTS[name].from} durationInFrames={SHOTS[name].dur} name={name}>
          <Comp />
        </Sequence>
      ))}
      {WIPES.map((b) => (
        <Sequence key={b} from={b - WIPE / 2} durationInFrames={WIPE} name={`wipe@${b}`}>
          <Wipe dur={WIPE} />
        </Sequence>
      ))}
      {bgm && <Audio src={staticFile('audio/bgm.mp3')} volume={bgmVolume} />}
      {SFX.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.dur ?? 60} name={s.why}>
          <Audio src={staticFile(s.src)} volume={s.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
    </CaptionsOn.Provider>
  )
}
