import type { Action, Target } from './scenarios'

export const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** The visible element a target names, or null. Hidden elements (display: none) never match. */
export const findTarget = (t: Target, root: ParentNode = document): HTMLElement | null => {
  const all = Array.from(root.querySelectorAll<HTMLElement>(t.css)).filter((el) => el.getClientRects().length > 0)
  const hits = t.text ? all.filter((el) => (el.textContent ?? '').includes(t.text!)) : all
  return hits[t.nth ?? 0] ?? null
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Polls until a target is in the page, because pages and results arrive a moment after a route change or a click. */
export const waitFor = async (t: Target, timeout = 4000, signal?: { cancelled: boolean }) => {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    if (signal?.cancelled) return null
    const el = findTarget(t)
    if (el) return el
    await sleep(80)
  }
  return null
}

/* The pointer: a cursor that glides to what the story is about to touch, presses, and leaves a ripple, so the visitor sees who is doing what. */
const ARROW =
  '<svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3l14 8-6 1.6L10 19z" fill="#122056" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>'
let cursor: HTMLElement | null = null
/** The pointer only shows while a story plays by itself. When the visitor drives, or has paused it, things happen without it. */
let visual = false
export const setVisual = (on: boolean) => {
  visual = on
  if (!on) hideCursor()
}

const ensureCursor = () => {
  if (cursor) return cursor
  cursor = document.createElement('div')
  cursor.className = 'tour__cursor'
  cursor.setAttribute('aria-hidden', 'true')
  cursor.innerHTML = ARROW
  cursor.style.transition = 'none'
  cursor.style.transform = `translate(${innerWidth * 0.72}px, ${innerHeight * 0.85}px)`
  document.body.appendChild(cursor)
  void cursor.offsetWidth
  cursor.style.transition = ''
  return cursor
}

export const hideCursor = () => {
  cursor?.remove()
  cursor = null
}

const glideTo = async (el: HTMLElement, signal: { cancelled: boolean }, side: 'center' | 'start' = 'center') => {
  el.scrollIntoView({ block: 'center', behavior: 'auto' })
  if (!visual) return
  await sleep(120)
  if (signal.cancelled || !visual) return
  const c = ensureCursor()
  const r = el.getBoundingClientRect()
  const x = side === 'start' ? r.left + 28 : r.left + Math.min(r.width / 2, 140)
  const y = side === 'start' ? r.top + 28 : r.top + r.height / 2
  c.style.transform = `translate(${x}px, ${y}px)`
  await sleep(reducedMotion() ? 0 : 820)
}

const press = async () => {
  const c = cursor
  if (!c || !visual) return
  c.classList.add('is-press')
  const ring = document.createElement('span')
  ring.className = 'tour__ripple'
  c.appendChild(ring)
  await sleep(reducedMotion() ? 0 : 200)
  c.classList.remove('is-press')
  setTimeout(() => ring.remove(), 600)
}

/** The visitor-visible click: glide, press, then click for real. */
export const clickWithCursor = async (el: HTMLElement, signal: { cancelled: boolean } = { cancelled: false }) => {
  await glideTo(el, signal)
  if (signal.cancelled) return
  await press()
  el.click()
}

/** Sets a field the way a person would, so React sees an input event and updates its state. */
const setValue = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

const typeInto = async (el: HTMLInputElement | HTMLTextAreaElement, text: string, signal: { cancelled: boolean }) => {
  el.focus({ preventScroll: true })
  setValue(el, '')
  if (reducedMotion() || text.length < 4) return setValue(el, text)
  const per = Math.max(14, Math.min(55, 1500 / text.length))
  for (let i = 1; i <= text.length; i++) {
    if (signal.cancelled) return
    setValue(el, text.slice(0, i))
    await sleep(per)
  }
}

export const runAction = async (a: Action, signal: { cancelled: boolean }) => {
  if ('wait' in a) return sleep(a.wait)
  const t = 'click' in a ? a.click : a.type
  const el = await waitFor(t, 4000, signal)
  if (!el || signal.cancelled) return
  if ('click' in a) return clickWithCursor(el, signal)
  await glideTo(el, signal, 'start')
  if (signal.cancelled) return
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    await press()
    await typeInto(el, a.text, signal)
  }
}
