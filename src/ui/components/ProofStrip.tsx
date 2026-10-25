import { useEffect, useRef, useState } from 'react'

/**
 * Four figures about what the checks run on. Each comes from the app's own data files and is listed with its source on the
 * Data page; none is a claim about accuracy. The numbers count up once, when the strip scrolls into view (at once for
 * people who prefer reduced motion).
 */
const FIGURES = [
  { to: 32000, suffix: '+', label: 'brands matched to their ingredients', note: 'Indian Medicine Dataset, plus 39 checked by hand' },
  { to: 70144, suffix: '', label: 'drug pairs in the interaction data', note: 'DDInter, with the source on every alert' },
  { to: 172, suffix: '', label: 'banned combinations flagged', note: 'CDSCO notifications of 2024 and 2026' },
  { to: 0, suffix: '', label: 'network needed to run a check', note: 'After the first load it runs on the device, in the shop' },
]

const CountUp = ({ to, suffix, run }: { to: number; suffix: string; run: boolean }) => {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!run) return
    if (to === 0 || matchMedia('(prefers-reduced-motion: reduce)').matches) return setN(to)
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1400)
      setN(Math.round(to * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [run, to])
  return (
    <span className="num">
      {n.toLocaleString('en-IN')}
      {suffix}
    </span>
  )
}

export const ProofStrip = () => {
  const box = useRef<HTMLElement>(null)
  const [run, setRun] = useState(false)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setRun(true), io.disconnect()), { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <section className="home-proof" ref={box} aria-label="What the checks run on">
      <ul>
        {FIGURES.map((f) => (
          <li key={f.label}>
            <strong>
              <CountUp to={f.to} suffix={f.suffix} run={run} />
            </strong>
            <span>{f.label}</span>
            <small>{f.note}</small>
          </li>
        ))}
      </ul>
    </section>
  )
}
