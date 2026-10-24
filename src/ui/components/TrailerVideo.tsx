/**
 * The landing-page trailer: about 30 seconds, captions burned in, so it reads with the sound off. It autoplays muted and
 * loops while on screen, stays still for people who prefer reduced motion, and offers sound as a choice, never by default.
 * The file is online-only (the service worker does not cache video); if it cannot load, the whole section hides itself
 * rather than showing a broken player. Source project: video/ (Remotion).
 */
import { useEffect, useRef, useState } from 'react'

const base = import.meta.env.BASE_URL
const SRC = `${base}trailer/parchi-trailer.mp4`
const POSTER = `${base}trailer/poster.jpg`

const svg = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

export const TrailerVideo = () => {
  const video = useRef<HTMLVideoElement>(null)
  const heldByUser = useRef(false)
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = video.current
    if (!el || failed) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) heldByUser.current = true
    // play while at least a third of it is on screen, pause when it scrolls away (unless the visitor paused it)
    const io = new IntersectionObserver(
      ([entry]) => {
        if (heldByUser.current) return
        if (entry.isIntersecting) el.play().catch(() => {})
        else el.pause()
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [failed])

  if (failed) return null

  const togglePlay = () => {
    const el = video.current
    if (!el) return
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
      heldByUser.current = false
      el.play().catch(() => {})
    }
  }

  return (
    <section className="home-trailer" aria-labelledby="trailer-title">
      <div className="home-trailer__bar">
        <h2 id="trailer-title">See it in about 30 seconds</h2>
        <div className="home-trailer__actions">
          <button type="button" className="home-btn home-btn--sm home-btn--tint" onClick={togglePlay} aria-pressed={!playing}>
            <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2.4" {...svg}>
              {playing ? <path d="M8 5v14M16 5v14" /> : <path d="M7 4.5v15l12-7.5z" />}
            </svg>
            {playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" className="home-btn home-btn--sm home-btn--ink" onClick={toggleSound} aria-pressed={!muted}>
            <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2.2" {...svg}>
              <path d="M11 5 6 9H2v6h4l5 4z" />
              {muted ? <path d="m22 9-6 6m0-6 6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />}
            </svg>
            {muted ? 'Play with sound' : 'Sound on'}
          </button>
        </div>
      </div>
      <video
        ref={video}
        className="home-trailer__video"
        src={SRC}
        poster={POSTER}
        muted
        loop
        playsInline
        preload="metadata"
        aria-describedby="trailer-desc"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />
      <p id="trailer-desc" className="sr-only">
        A short film of the product: a prescription is typed the way it arrives, Parchi finds paracetamol hidden in three medicines and adds
        it up to 4,100 mg a day, then the review queue, a customer's prescriptions on one calendar, the override log and the dose limits with
        their sources. It closes on the Parchi wordmark. Captions are in the video.
      </p>
    </section>
  )
}
