// Keyboard shortcuts as pure decisions, so the rules are tested without a browser. A handler passes in what the key event
// says and what it landed on; this says what to do. Single-character keys can be switched off (WCAG 2.1.4); modifier
// shortcuts (Ctrl or Cmd + Enter) are exempt.
import { useCallback, useSyncExternalStore } from 'react'

export interface KeyInfo {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
}

/** What the key landed on: its tag, input type, and whether it is a contenteditable area. */
export interface KeyTarget {
  tag: string
  type?: string
  editable?: boolean
}

export const targetOf = (el: EventTarget | null): KeyTarget => {
  const t = el as HTMLElement | null
  return { tag: t?.tagName?.toLowerCase() ?? '', type: (t as HTMLInputElement | null)?.type, editable: t?.isContentEditable === true }
}

/** Typing into a text box: single-character shortcuts must not fire. A radio or checkbox is not text entry. */
const typing = (t: KeyTarget) =>
  t.editable === true || t.tag === 'textarea' || t.tag === 'select' || (t.tag === 'input' && t.type !== 'radio' && t.type !== 'checkbox' && t.type !== 'button' && t.type !== 'submit')

export type DecisionAction = { kind: 'choose'; index: number } | { kind: 'save' } | null

/**
 * Keys inside the decision form: 1 to 3 choose a decision, Ctrl or Cmd + Enter saves and opens the next order. The form
 * binds this on itself, so a key pressed in another part of the page, or in the override dialog, never reaches it.
 */
export function decisionShortcut(e: KeyInfo, target: KeyTarget, singleKeysOn: boolean, choices = 3): DecisionAction {
  if (e.altKey) return null
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) return { kind: 'save' }
  if (e.ctrlKey || e.metaKey || !singleKeysOn || typing(target)) return null
  const n = Number(e.key)
  return Number.isInteger(n) && n >= 1 && n <= choices ? { kind: 'choose', index: n - 1 } : null
}

/** j and k move between the queue's orders, as in a mail list. Never while typing, never with a modifier. */
export function queueShortcut(e: KeyInfo, target: KeyTarget, singleKeysOn: boolean): 'next' | 'previous' | null {
  if (!singleKeysOn || e.ctrlKey || e.metaKey || e.altKey || typing(target)) return null
  return e.key === 'j' ? 'next' : e.key === 'k' ? 'previous' : null
}

/** Ctrl or Cmd + Enter in a text area runs the check. */
export const isRunKey = (e: KeyInfo) => e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.altKey

const STORE = 'parchi.shortcuts'
const listeners = new Set<() => void>()

const read = () => {
  try {
    return localStorage.getItem(STORE) !== 'off'
  } catch {
    return true
  }
}

/** Single-character shortcuts on or off, remembered on this device. A private window forgets it, which is fine. */
export function useSingleKeys(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    read,
    () => true,
  )
  const set = useCallback((next: boolean) => {
    try {
      localStorage.setItem(STORE, next ? 'on' : 'off')
    } catch {
      /* not remembered */
    }
    listeners.forEach((l) => l())
  }, [])
  return [on, set]
}
