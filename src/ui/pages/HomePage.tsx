/**
 * The landing page: what Parchi is, two ways in (check a prescription, see the worked example) and a plain account of
 * how a prescription is checked. It carries no results or figures of its own; the sample slip is the app's demo case
 * and is labelled as a sample. Design preview: docs/design/parchi-landing-preview.html.
 *
 * It brings its own navigation and footer (see App.tsx). In-page links are buttons-as-anchors that scroll, because
 * a plain `#how` would be read by the hash router as an unknown route.
 */
import { useState } from 'react'
import { LogoMark } from '../components/LogoMark'
import { scrollToTarget, useSmoothScroll } from '../lib/smoothScroll'
import { SlipCompare } from '../components/SlipCompare'
import { StackedSections } from '../components/StackedSections'
import { TrailerVideo } from '../components/TrailerVideo'
import { useOnline } from '../route'

const SECTIONS = [
  { id: 'how', label: 'How it works' },
  { id: 'checks', label: 'What it checks' },
  { id: 'evidence', label: 'Evidence' },
]

const STEPS = [
  { title: 'Read the slip', text: 'Brand names and doses are matched the way they are written, misspellings included, and each medicine is split into its ingredients.' },
  { title: 'Add it up', text: 'Every ingredient is totalled per day across all brands, so a drug hidden inside a cold tablet still counts.' },
  { title: 'Compare', text: 'Totals are held against dose limits and rules that come from data files, each with a source and whether a pharmacist approved it.' },
  { title: 'Alert, sparingly', text: 'Three tiers: Interrupt, Inform and Silent. Interrupts are kept rare, and overriding one needs a reason that is logged.' },
]

const CHECKS = [
  { title: 'Daily totals', text: 'Each ingredient added up across every brand on the slip, against the limit on file.' },
  { title: 'Age and kidney function', text: 'Weight or creatinine is asked for only when a medicine needs it.' },
  { title: 'Interactions', text: 'With a severity and the source it comes from.' },
  { title: 'Duplicate classes', text: 'Two NSAIDs, two PPIs, or any other pair from one class.' },
  { title: 'Banned combinations', text: 'Fixed-dose combinations on the banned list.' },
]

const PROOF = [
  { title: 'The same prescriptions, every system', text: 'The engine and each chatbot are given the same slips and scored the same way.' },
  { title: 'Alert load counts', text: 'Alerts per prescription and false alarms on clean ones are measured, because too many alerts get ignored.' },
  { title: 'Every limit has a source', text: 'Dose limits and rules are shown with where they come from, and whether a pharmacist has approved them.' },
]

/** The torn bottom edge of the slip: 20 teeth, 12px deep. */
const TORN = (() => {
  const pts = ['0 0', '100% 0']
  for (let i = 20; i >= 0; i--) pts.push(`${i * 5}% ${i % 2 ? 'calc(100% - 12px)' : '100%'}`)
  return `polygon(${pts.join(',')})`
})()

const scrollToId = (id: string) => {
  const el = document.getElementById(id)
  if (!el) return
  scrollToTarget(el)
  el.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
}

const svg = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

const PillIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2.2" {...svg}>
    <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
    <path d="m8.5 8.5 7 7" />
  </svg>
)
const WifiIcon = ({ size, off }: { size: number; off?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...svg}>
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <path d="M12 20h.01" />
    {off && <path d="M3 3l18 18" />}
  </svg>
)
const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2.2" {...svg}>
    <path d="M5 12h14m-5-5 5 5-5 5" />
  </svg>
)
const AlertIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2.3" {...svg}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
)
const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" strokeWidth="2.4" {...svg}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
)
const BellOffIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" strokeWidth="2.4" {...svg}>
    <path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5" />
    <path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    <path d="m2 2 20 20" />
  </svg>
)

/** The paracetamol limit bar from the demo case: 4,100 of 4,000 mg, the tick at the limit. */
const Limit = ({ withLabel, bare }: { withLabel?: boolean; bare?: boolean }) => (
  <div className="home-limit">
    <div className="home-limit__track">
      <div className="home-limit__fill" />
      <div className="home-limit__mark" />
    </div>
    {!bare && <div className="home-limit__text">{withLabel ? <><strong>4,100 / 4,000 mg</strong> a day</> : '4,100 / 4,000 mg'}</div>}
  </div>
)

export const HomePage = () => {
  useSmoothScroll()
  const online = useOnline()
  const [open, setOpen] = useState(false)

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    setOpen(false)
    scrollToId(id)
  }
  const top = (e: React.MouseEvent) => {
    e.preventDefault()
    setOpen(false)
    scrollToTarget(0)
  }

  return (
    <div className="home">
      <div className="home-page">
        <div className="home-frame">
          <header className="home-nav">
            <a className="home-circle home-circle--brand" href="#/home" onClick={top} aria-label="Parchi home">
              <LogoMark size={34} accent="var(--color-accent-soft)" />
            </a>
            <span
              className="home-circle home-circle--status"
              data-online={online}
              role="img"
              aria-label={online ? 'Online' : 'Offline: all checks still run'}
              title={online ? 'Online' : 'Offline: all checks still run'}
            >
              <WifiIcon size={22} />
              <span className="home-status-dot" />
            </span>

            <nav className="home-navbar" id="home-navbar" data-open={open} aria-label="Main">
              <a href="#/home" aria-current="page" onClick={top}>Home</a>
              <span className="home-navbar__line" aria-hidden="true" />
              <span className="home-navbar__links">
                {SECTIONS.map((s) => (
                  <a key={s.id} href="#/home" onClick={go(s.id)}>{s.label}</a>
                ))}
              </span>
              <a className="home-btn home-btn--accent" href="#/check">Open the checker</a>
            </nav>

            <a className="home-btn home-btn--accent home-nav__cta" href="#/check">Open the checker</a>
            <button
              className="home-circle home-menu-btn"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="home-navbar"
              onClick={() => setOpen(!open)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" strokeWidth="2" {...svg}>
                <path d={open ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} />
              </svg>
            </button>
          </header>

          <section className="home-hero" aria-labelledby="home-title">
            {/* the doctor's scribble, resolving into the clean lines on the slip */}
            <svg className="home-hero__art" viewBox="0 0 760 640" preserveAspectRatio="xMaxYMid slice" fill="none" stroke="#fff" strokeLinecap="round" aria-hidden="true">
              <path className="home-draw" pathLength="1" strokeWidth="2.2" d="M250 36C410 78 590 140 760 238C610 262 450 228 346 262C276 288 292 340 410 366C530 390 654 408 760 452" />
              <path className="home-draw home-draw--2" pathLength="1" strokeWidth="1.6" strokeOpacity=".6" d="M262 540C330 494 424 496 522 528C620 558 702 592 760 612" />
              <path className="home-draw home-draw--3" pathLength="1" strokeWidth="2.2" d="M270 640C262 572 320 526 408 538C524 554 642 600 760 640" />
              <path className="home-draw home-draw--2" pathLength="1" strokeWidth="1.4" strokeOpacity=".45" d="M300 150C400 140 500 160 580 196" />
              <circle cx="620" cy="150" r="11" fill="#fff" stroke="none" />
              <circle cx="694" cy="476" r="8" fill="#fff" stroke="none" />
              <circle cx="318" cy="596" r="5" fill="#fff" stroke="none" />
            </svg>

            <div className="home-hero__copy">
              <p className="home-badge">
                <span className="home-badge__icon"><PillIcon size={16} /></span>
                Made for the chemist's counter
              </p>
              <h1 id="home-title">A second look at every parchi, before it leaves the counter.</h1>
              <div className="home-hero__rule" aria-hidden="true" />
              <p className="home-hero__text">
                Type a prescription the way it arrives. Parchi splits each brand into its ingredients, adds up the day's dose across every brand, and shows a
                pharmacist what needs a closer look. It works offline.
              </p>
              <div className="home-actions">
                <a className="home-btn home-btn--white" href="#/check">Check a prescription <ArrowIcon /></a>
                <a className="home-btn home-btn--ghost" href="#/demo">See a worked example</a>
              </div>
            </div>

            <div className="home-hero__visual">
              <span className="home-float home-float--a" aria-hidden="true"><PillIcon size={28} /></span>
              <span className="home-float home-float--b" aria-hidden="true"><WifiIcon size={24} off /></span>
              <div
                className="home-slip"
                style={{ clipPath: TORN }}
                role="img"
                aria-label="Sample prescription. Paracetamol totals 4,100 milligrams a day across three brands, above the 4,000 milligram limit. Interrupt."
              >
                <div className="home-slip__head"><span>Sample prescription</span><span><b>68 y</b> · Male · 55 kg</span></div>
                <ul className="home-slip__rows">
                  <li><span>Dolo 650</span><span>1-1-1 × 5 days</span></li>
                  <li><span>Crocin Cold &amp; Flu Max</span><span>TDS</span></li>
                  <li><span>Zerodol-P</span><span>BD</span></li>
                </ul>
                <div className="home-alert">
                  <span className="home-tier">Interrupt · Overdose</span>
                  <p>Paracetamol totals 4,100 mg/day across 3 brands, above the 4,000 mg/day limit. Review.</p>
                  <Limit bare />
                </div>
                <p className="home-slip__foot">Decision support for a pharmacist.</p>
              </div>
            </div>
          </section>
        </div>

        <TrailerVideo />

        <StackedSections>
        <section className="home-section home-section--white home-how" id="how" aria-labelledby="how-title">
          <div className="home-how__head">
            <h2 id="how-title" tabIndex={-1}>How a prescription is checked</h2>
            <p className="home-lead">A drug hidden inside a cold tablet still counts. Every ingredient is totalled per day, across all the brands on the slip.</p>
          </div>
          <ol className="home-how__grid">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="home-how__tile" aria-hidden="true">{i + 1}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="home-how__foot" role="img" aria-label="Example: paracetamol across three brands totals 4,100 milligrams a day against a 4,000 milligram limit">
            <div>
              <div className="home-xray__label">Paracetamol, from three brands (sample)</div>
              <div className="home-chips"><span>Dolo 650</span><span>Crocin Cold &amp; Flu Max</span><span>Zerodol-P</span></div>
            </div>
            <Limit withLabel />
          </div>
        </section>

        <section className="home-section home-section--white home-compare-section" id="compare" aria-labelledby="compare-title">
          <div className="home-compare-section__head">
            <h2 id="compare-title" tabIndex={-1}>Three brands. One ingredient.</h2>
            <p className="home-lead">Paracetamol is never written on this slip. Parchi finds it in all three brands and adds it up.</p>
          </div>
          <SlipCompare />
        </section>

        <section className="home-section home-section--ink" id="checks" aria-labelledby="checks-title">
          <div>
            <h2 id="checks-title" tabIndex={-1} className="home-big">It informs. The pharmacist decides.</h2>
            <p className="home-lead">Parchi never approves or blocks a prescription. It shows what is worth a second look, and why, with the source beside it.</p>
            <ul className="home-tiers" aria-label="The three alert tiers">
              <li><span className="home-tier-chip" data-tier="interrupt"><AlertIcon size={14} />Interrupt</span><span>Act before dispensing</span></li>
              <li><span className="home-tier-chip" data-tier="inform"><InfoIcon />Inform</span><span>Worth knowing, no action required</span></li>
              <li><span className="home-tier-chip" data-tier="silent"><BellOffIcon />Silent</span><span>Logged only, collapsed by default</span></li>
            </ul>
          </div>
          <ul className="home-checks">
            {CHECKS.map((c) => (
              <li key={c.title}><h3>{c.title}</h3><p>{c.text}</p></li>
            ))}
          </ul>
        </section>

        <section className="home-section home-section--tint" id="evidence" aria-labelledby="evidence-title">
          <div>
            <h2 id="evidence-title" tabIndex={-1}>Measured, not claimed</h2>
            <p className="home-lead">Parchi is tested against pharmacist-labelled prescriptions, and against the chatbots a counter might reach for instead.</p>
          </div>
          <div>
            <ul className="home-evidence">
              {PROOF.map((p) => (
                <li key={p.title}><h3>{p.title}</h3><p>{p.text}</p></li>
              ))}
            </ul>
            <a className="home-btn home-btn--ink" href="#/benchmark">See the benchmark</a>
          </div>
        </section>
        </StackedSections>

        <section className="home-cta" aria-labelledby="cta-title">
          <svg className="home-cta__art" viewBox="0 0 700 420" preserveAspectRatio="xMaxYMid slice" fill="none" stroke="#fff" strokeLinecap="round" aria-hidden="true">
            <path strokeWidth="2" d="M60 30C260 60 460 110 700 190C520 220 340 180 220 230C130 268 160 330 320 346C470 360 600 372 700 396" />
            <path strokeWidth="1.5" strokeOpacity=".5" d="M120 380C220 330 360 340 500 382" />
            <circle cx="560" cy="90" r="9" fill="#fff" stroke="none" />
            <circle cx="640" cy="330" r="6" fill="#fff" stroke="none" />
          </svg>
          <h2 id="cta-title">Put it on the counter.</h2>
          <p>Install Parchi on a phone or the counter PC. After the first load it works without a connection.</p>
          <div className="home-actions">
            <a className="home-btn home-btn--white" href="#/check">Check a prescription</a>
            <a className="home-btn home-btn--ghost" href="#/demo">See a worked example</a>
          </div>
        </section>

        <footer className="home-footer">
          <div>
            <div className="home-footer__brand">
              <LogoMark size={34} />
              Parchi
            </div>
            <p>Decision support for a pharmacist. Not a substitute for professional judgement.</p>
          </div>
          <nav aria-label="App">
            <a href="#/check">Check</a>
            <a href="#/demo">Demo</a>
            <a href="#/log">Override log</a>
            <a href="#/benchmark">Benchmark</a>
            <a href="#/data">Data &amp; limits</a>
          </nav>
        </footer>
      </div>
    </div>
  )
}
