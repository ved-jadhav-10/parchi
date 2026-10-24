import { Children, useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { STACK_GAP, canStack, coverProgress, scaleAt, stackTop } from '../lib/stack'

/**
 * Stacking cards: each child sticks near the top of the window and the next one slides over it while it shrinks slightly.
 * Plain CSS sticky plus a scroll hook that sets one transform per card (no re-render per scroll). It switches itself off
 * when a card does not fit in the window (phones) or when the user prefers reduced motion; the sections then flow normally.
 */
export const StackedSections = ({ children }: { children: ReactNode }) => {
  const root = useRef<HTMLDivElement>(null)
  const items = Children.toArray(children)

  useEffect(() => {
    const el = root.current
    if (!el) return
    const cards = [...el.children] as HTMLElement[]
    const face = (c: HTMLElement) => c.firstElementChild as HTMLElement
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    let on = false
    let raf = 0

    const paint = () => {
      raf = 0
      if (!on) return
      cards.forEach((c, i) => {
        const next = cards[i + 1]
        if (!next) return
        const start = stackTop(i) + c.offsetHeight + STACK_GAP
        const p = coverProgress(next.getBoundingClientRect().top, start, stackTop(i + 1))
        face(c).style.transform = p === 0 ? '' : `scale(${scaleAt(i, cards.length, p)})`
      })
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(paint)
    }
    const evaluate = () => {
      on = canStack(cards.map((c) => c.offsetHeight), window.innerHeight, reduce.matches)
      el.dataset.stack = on ? 'on' : 'off'
      if (!on) cards.forEach((c) => (face(c).style.transform = ''))
      schedule()
    }

    evaluate()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', evaluate)
    reduce.addEventListener('change', evaluate)
    const ro = new ResizeObserver(evaluate)
    cards.forEach((c) => ro.observe(c))
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', evaluate)
      reduce.removeEventListener('change', evaluate)
      ro.disconnect()
      cancelAnimationFrame(raf)
      cards.forEach((c) => (face(c).style.transform = ''))
    }
  }, [items.length])

  return (
    <div className="home-stack" ref={root} data-stack="off">
      {items.map((child, i) => (
        <div className="home-stack__item" key={i} style={{ '--stack-top': `${stackTop(i)}px` } as CSSProperties}>
          {child}
        </div>
      ))}
    </div>
  )
}
