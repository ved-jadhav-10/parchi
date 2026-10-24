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

/** Sets a field the way a person would, so React sees an input event and updates its state. */
const setValue = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

const typeInto = async (el: HTMLInputElement | HTMLTextAreaElement, text: string, signal: { cancelled: boolean }) => {
  setValue(el, '')
  if (reducedMotion() || text.length < 4) return setValue(el, text)
  const per = Math.max(10, Math.min(45, 1400 / text.length))
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
  if ('click' in a) return el.click()
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) await typeInto(el, a.text, signal)
}
