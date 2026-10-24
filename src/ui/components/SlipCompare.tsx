/**
 * Before and after on the landing page: the slip as it is typed at the counter, and what Parchi reads in it. Drag (or use
 * the arrow keys) to move the divide. The sample is the app's demo case, so the numbers match the hero slip: three brands
 * that never say "paracetamol" add up to 4,100 mg a day. It informs; the pharmacist decides.
 */
import { useRef, useState } from 'react'

const LINES = [
  { typed: 'Dolo 650 1-1-1 x5d', brand: 'Dolo 650', reads: 'Paracetamol 650 mg, 3 a day', mg: '1,950 mg' },
  { typed: 'Crocin cold n flu max TDS', brand: 'Crocin Cold & Flu Max', reads: 'Paracetamol 500 mg, 3 a day', mg: '1,500 mg' },
  { typed: 'Zerodol P BD', brand: 'Zerodol-P', reads: 'Paracetamol 325 mg, 2 a day', mg: '650 mg' },
]

export const SlipCompare = () => {
  // a phone is too narrow to read both halves at once, so it opens on Parchi's reading with the slip at the edge
  const [pos, setPos] = useState(() => (window.matchMedia('(max-width: 600px)').matches ? 8 : 50))
  const box = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const moveTo = (clientX: number) => {
    const r = box.current?.getBoundingClientRect()
    if (!r) return
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)))
  }

  return (
    <figure className="home-compare">
      <figcaption className="home-compare__caption">
        The same slip, twice: as typed, and as Parchi reads it. Drag to compare (sample).
      </figcaption>
      <div
        ref={box}
        className="home-compare__stage"
        style={{ '--pos': `${pos}%` } as React.CSSProperties}
        onPointerDown={(e) => {
          dragging.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          moveTo(e.clientX)
        }}
        onPointerMove={(e) => dragging.current && moveTo(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <div className="home-compare__panel home-compare__panel--before" aria-hidden={pos < 8}>
          <p className="home-compare__label">As typed at the counter</p>
          <ul className="home-compare__rows">
            {LINES.map((l) => (
              <li key={l.typed}>
                <span className="home-compare__typed">{l.typed}</span>
              </li>
            ))}
          </ul>
          <p className="home-compare__foot">Three medicines. Paracetamol is not written anywhere.</p>
        </div>

        <div className="home-compare__panel home-compare__panel--after" aria-hidden={pos > 92}>
          <p className="home-compare__label">What Parchi reads</p>
          <ul className="home-compare__rows">
            {LINES.map((l) => (
              <li key={l.typed}>
                <span className="home-compare__brand">{l.brand}</span>
                <span className="home-compare__reads">
                  {l.reads} <b>{l.mg}</b>
                </span>
              </li>
            ))}
          </ul>
          <div className="home-compare__foot home-compare__total">
            <span className="home-tier-chip" data-tier="interrupt">Interrupt</span>
            <span className="home-compare__total-text">
              Paracetamol <b>4,100 mg a day</b>, above the 4,000 mg limit. For the pharmacist to review.
            </span>
          </div>
        </div>

        <div className="home-compare__handle" aria-hidden="true">
          <span className="home-compare__knob">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 6-6 6 6 6M15 6l6 6-6 6" />
            </svg>
          </span>
        </div>

        <input
          className="home-compare__range"
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(pos)}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label="Move between the slip as typed and what Parchi reads"
          aria-valuetext={pos > 50 ? 'Showing more of the slip as typed' : "Showing more of Parchi's reading"}
        />
      </div>
    </figure>
  )
}
