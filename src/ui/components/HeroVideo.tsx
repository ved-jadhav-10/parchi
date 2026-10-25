/**
 * The landing-page hero: the trailer, about 30 seconds, captions burned in, so it reads with the sound off. The page's own
 * hero (`thumb`) is the thumbnail: it shows from the first paint and the video fades in over it when it starts, five
 * seconds after the page loads, muted. It loops while on screen, stays still for people who prefer reduced motion, and
 * offers sound as a choice, never by default. The file is online-only (the service worker does not cache video); if it
 * cannot load, the thumbnail simply stays. On phones the thumbnail is hidden and the video shows its poster instead.
 * Source project: video/ (Remotion).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'

const base = import.meta.env.BASE_URL
const SRC = `${base}trailer/parchi-trailer.mp4`
const POSTER = `${base}trailer/poster.jpg`
const AUTOPLAY_MS = 5000

const svg = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

/** `thumb` is the hero shown until the video plays; `children` are the page's actions, shown beside the player controls. */
export const HeroVideo = ({ thumb, children }: { thumb: ReactNode; children: ReactNode }) => {
  const video = useRef<HTMLVideoElement>(null)
  const heldByUser = useRef(false)
  const started = useRef(false)
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [shown, setShown] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = video.current
    if (!el || failed) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) heldByUser.current = true
    let visible = true
    // after the autoplay delay, play while at least a third of it is on screen and pause when it scrolls away (unless the visitor paused it)
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (!started.current || heldByUser.current) return
        if (visible) el.play().catch(() => {})
        else el.pause()
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    const timer = window.setTimeout(() => {
      started.current = true
      if (visible && !heldByUser.current) el.play().catch(() => {})
    }, AUTOPLAY_MS)
    return () => {
      io.disconnect()
      clearTimeout(timer)
    }
  }, [failed])

  const togglePlay = () => {
    const el = video.current
    if (!el) return
    started.current = true
    if (el.paused) {
      heldByUser.current = false
      el.play().catch(() => {})
    } else {
      heldByUser.current = true
      el.pause()
    }
  }
  const toggleSound = () => {
    const el = video.current
    if (!el) return
    const next = !el.muted
    el.muted = next
    setMuted(next)
    if (!next) {
      // sound on: start from the top so the music and the captions begin together
      el.currentTime = 0
      started.current = true
      heldByUser.current = false
      el.play().catch(() => {})
    }
  }

  return (
    <section className="home-herovideo" data-shown={shown} data-failed={failed} aria-labelledby="home-title">
      <div className="home-stage">
        {thumb}
        {!failed && (
          <video
            ref={video}
            className="home-stage__video"
            src={SRC}
            poster={POSTER}
            muted
            loop
            playsInline
            preload="auto"
            aria-describedby="trailer-desc"
            onPlay={() => setPlaying(true)}
            onPlaying={() => setShown(true)}
            onPause={() => setPlaying(false)}
            onError={() => setFailed(true)}
          />
        )}
      </div>
      {!failed && (
        <p id="trailer-desc" className="sr-only">
          A short film of the product: a prescription is typed the way it arrives, Parchi finds paracetamol hidden in three medicines and adds
          it up to 4,100 mg a day, then the review queue, a customer's prescriptions on one calendar, the override log and the dose limits with
          their sources. It closes on the Parchi wordmark. Captions are in the video.
        </p>
      )}
      <div className="home-hero__bar">
        {!failed && (
          <div className="home-hero__controls">
            <button type="button" className="home-btn home-btn--sm home-btn--tint" onClick={togglePlay} aria-pressed={!playing}>
              <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2.4" {...svg}>
                {playing ? <path d="M8 5v14M16 5v14" /> : <path d="M7 4.5v15l12-7.5z" />}
              </svg>
              {playing ? 'Pause' : 'Play'}
            </button>
            <button type="button" className="home-btn home-btn--sm home-btn--tint" onClick={toggleSound} aria-pressed={!muted}>
              <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2.2" {...svg}>
                <path d="M11 5 6 9H2v6h4l5 4z" />
                {muted ? <path d="m22 9-6 6m0-6 6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />}
              </svg>
              {muted ? 'Play with sound' : 'Sound on'}
            </button>
          </div>
        )}
        <div className="home-hero__actions">{children}</div>
      </div>
    </section>
  )
}
