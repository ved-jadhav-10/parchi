import { useEffect } from 'react'
import type Lenis from 'lenis'

/**
 * Smooth scrolling (Lenis, https://github.com/darkroomengineering/lenis). It is switched on for the landing page only:
 * the working screens have sticky columns, a modal dialog and scrollable tables, where inertia scrolling only gets in
 * the way. It is off under `prefers-reduced-motion`, and touch devices keep their native scrolling. The library is loaded
 * on demand, so the installed app never downloads it.
 */
let active: Lenis | null = null

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useSmoothScroll(enabled = true) {
  useEffect(() => {
    if (!enabled || reduced()) return
    let lenis: Lenis | undefined
    let cancelled = false
    Promise.all([import('lenis'), import('lenis/dist/lenis.css')])
      .then(([m]) => {
        if (cancelled) return
        lenis = new m.default({ autoRaf: true })
        active = lenis
      })
      .catch(() => undefined) // without it the page simply scrolls natively
    return () => {
      cancelled = true
      lenis?.destroy()
      active = null
    }
  }, [enabled])
}

/** Scrolls to an element or to a y offset: eased through Lenis when it is running, instant under reduced motion. */
export function scrollToTarget(target: HTMLElement | number) {
  if (active) active.scrollTo(target, { offset: 0 })
  else if (typeof target === 'number') window.scrollTo({ top: target, behavior: 'auto' })
  else target.scrollIntoView({ behavior: 'auto', block: 'start' })
}
