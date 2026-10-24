import { useEffect, useRef, useState } from 'react'
import '../styles/tour.css'
import { clickWithCursor, findTarget, hideCursor, reducedMotion, runAction, sleep, waitFor } from './dom'
import { scenarioById } from './scenarios'
import { backStep, exitTour, nextStep, setAuto, useTour } from './store'

interface Box {
  top: number
  left: number
  width: number
  height: number
}

const PAD = 8
const POP_W = 380

const measure = (el: HTMLElement): Box => {
  const r = el.getBoundingClientRect()
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + 2 * PAD, height: r.height + 2 * PAD }
}
const same = (a: Box | null, b: Box) => !!a && Math.abs(a.top - b.top) < 1 && Math.abs(a.left - b.left) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1

/** Where the card goes: beside the lit area when there is room, docked to the bottom on a phone or when the area is tall. */
const place = (box: Box | null): React.CSSProperties => {
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (vw < 640) return { left: 12, right: 12, bottom: 12 }
  const width = Math.min(POP_W, vw - 32)
  if (!box) return { left: (vw - width) / 2, top: Math.max(24, vh * 0.28), width }
  const left = Math.min(Math.max(16, box.left), vw - width - 16)
  if (box.top + box.height < vh * 0.55) return { left, top: box.top + box.height + 16, width }
  if (box.top > vh * 0.45) return { left, bottom: vh - box.top + 16, width }
  return { right: 24, bottom: 24, width }
}

/** Spotlight tour over the real app. A story moves between pages, types and clicks for the visitor, and lights up what it is describing. */
export const Tour = () => {
  const { id, index, auto } = useTour()
  const scenario = id ? scenarioById(id) : undefined
  const step = scenario?.steps[index]
  const [busy, setBusy] = useState(true)
  const [box, setBox] = useState<Box | null>(null)
  const popover = useRef<HTMLDivElement>(null)

  // Open the step: go to its page, do what it says for the visitor, wait for what it points at, bring that into view.
  useEffect(() => {
    if (!step) return
    const signal = { cancelled: false }
    setBusy(true)
    setBox(null)
    const run = async () => {
      if (step.route && location.hash !== `#/${step.route}`) {
        location.hash = `#/${step.route}`
        await sleep(250)
      }
      for (const a of step.before ?? []) await runAction(a, signal)
      if (signal.cancelled) return
      if (step.target) {
        const el = await waitFor(step.target, 5000, signal)
        if (signal.cancelled) return
        if (el) {
          el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' })
          await sleep(reducedMotion() ? 0 : 380)
        }
      }
      if (!signal.cancelled) setBusy(false)
    }
    void run()
    return () => {
      signal.cancelled = true
    }
  }, [id, index, step])

  // Follow the lit element: it can move, be replaced by a fresh render, or resize while the page settles.
  useEffect(() => {
    if (!step?.target || busy) return
    const tick = () => {
      const el = findTarget(step.target!)
      if (!el) return setBox(null)
      const next = measure(el)
      setBox((prev) => (same(prev, next) ? prev : next))
    }
    tick()
    const t = setInterval(tick, 120)
    addEventListener('resize', tick)
    return () => {
      clearInterval(t)
      removeEventListener('resize', tick)
    }
  }, [step, busy])

  // "Press it yourself": the visitor's own click moves the story on.
  useEffect(() => {
    if (!step?.userClicks || busy) return
    const target = step.userClicks
    const onClick = (e: MouseEvent) => {
      const el = findTarget(target)
      if (el && e.target instanceof Node && el.contains(e.target)) setTimeout(nextStep, 350)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [step, busy])

  useEffect(() => {
    if (!step || busy) return
    popover.current?.focus({ preventScroll: true })
  }, [step, busy])

  useEffect(() => {
    if (!scenario) hideCursor()
    return hideCursor
  }, [scenario])

  // Autoplay: read time scales with the words on the card; a step that waits for a click gets one after a beat.
  const dwell = step ? (step.userClicks ? 1600 : Math.min(7500, 2200 + (step.title.length + step.body.length) * 26)) : 0
  const lastStep = !!scenario && index === scenario.steps.length - 1
  useEffect(() => {
    if (!auto || busy || !step || lastStep) return
    const t = setTimeout(() => {
      if (step.userClicks) {
        const el = findTarget(step.userClicks)
        if (el) void clickWithCursor(el)
        else nextStep()
      } else nextStep()
    }, dwell)
    return () => clearTimeout(t)
  }, [auto, busy, step, lastStep, dwell])

  useEffect(() => {
    if (!lastStep) return
    if (auto) setAuto(false)
    hideCursor()
  }, [auto, lastStep])

  useEffect(() => {
    if (!scenario) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitTour()
      else if (e.key === 'ArrowRight' && !step?.userClicks) nextStep()
      else if (e.key === 'ArrowLeft') backStep()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [scenario, step])

  if (!scenario || !step) return null

  const last = index === scenario.steps.length - 1
  const lit = !busy && box
  const backToStories = () => {
    exitTour()
    location.hash = '#/demo'
  }
  const doIt = () => {
    const el = step.userClicks && findTarget(step.userClicks)
    if (el) void clickWithCursor(el)
    else nextStep()
  }

  return (
    <div className="tour" data-lit={lit ? 'true' : 'false'}>
      {lit ? (
        <>
          <div className="tour__dim" style={{ top: 0, left: 0, right: 0, height: Math.max(0, box.top) }} />
          <div className="tour__dim" style={{ top: box.top + box.height, left: 0, right: 0, bottom: 0 }} />
          <div className="tour__dim" style={{ top: box.top, left: 0, width: Math.max(0, box.left), height: box.height }} />
          <div className="tour__dim" style={{ top: box.top, left: box.left + box.width, right: 0, height: box.height }} />
          {!step.userClicks && <div className="tour__dim tour__dim--clear" style={box} />}
          <div className="tour__ring" style={box} />
        </>
      ) : (
        <div className="tour__dim tour__dim--all" />
      )}

      {busy ? (
        <p className="tour__busy" role="status">
          Working on it…
        </p>
      ) : (
        <div key={`${id}-${index}`} ref={popover} className="tour__card" style={place(lit ? box : null)} role="dialog" aria-modal="false" aria-labelledby="tour-title" tabIndex={-1}>
          <div className="tour__top">
            <p className="tour__eyebrow">
              {scenario.title} · {index + 1} of {scenario.steps.length}
            </p>
            {!lastStep && (
              <button type="button" className="tour__auto" onClick={() => setAuto(!auto)} aria-pressed={auto}>
                {auto ? 'Pause' : 'Autoplay'}
              </button>
            )}
            <button type="button" className="tour__x" onClick={exitTour} aria-label="Leave the tour">
              ×
            </button>
          </div>
          {step.cta && (
            <svg className="tour__done" width="44" height="44" viewBox="0 0 48 48" aria-hidden="true">
              <circle cx="24" cy="24" r="21" />
              <path d="m14 25 7 7 14-15" />
            </svg>
          )}
          <h2 id="tour-title" className="tour__title">
            {step.title}
          </h2>
          <p className="tour__body" aria-live="polite">
            {step.body}
          </p>
          {auto && !lastStep && <div className="tour__timer" key={`t${index}`} style={{ animationDuration: `${dwell}ms` }} aria-hidden="true" />}
          <div className="tour__dots" aria-hidden="true">
            {scenario.steps.map((s, i) => (
              <span key={s.title} data-on={i <= index} />
            ))}
          </div>
          <div className="tour__actions">
            {index > 0 && (
              <button type="button" className="btn btn--ghost" onClick={backStep}>
                Back
              </button>
            )}
            {step.userClicks ? (
              <button type="button" className="btn btn--secondary" onClick={doIt}>
                Do it for me
              </button>
            ) : last ? (
              <>
                {step.cta && (
                  <a className="btn btn--primary" href={step.cta.href} onClick={exitTour}>
                    {step.cta.label}
                  </a>
                )}
                <button type="button" className="btn btn--secondary" onClick={backToStories}>
                  More stories
                </button>
              </>
            ) : (
              <button type="button" className="btn btn--primary" onClick={nextStep}>
                Next
              </button>
            )}
          </div>
          {step.userClicks && <p className="tour__hint">Or press the lit button yourself.</p>}
        </div>
      )}
    </div>
  )
}
