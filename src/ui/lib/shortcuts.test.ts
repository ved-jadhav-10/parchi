import { describe, expect, it } from 'vitest'
import { decisionShortcut, isRunKey, queueShortcut } from './shortcuts'

const key = (k: string, mods: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean }> = {}) => ({ key: k, ctrlKey: false, metaKey: false, altKey: false, ...mods })
const radio = { tag: 'input', type: 'radio' }
const body = { tag: 'body' }

describe('decisionShortcut', () => {
  it('chooses with 1 to 3', () => {
    expect(decisionShortcut(key('1'), body, true)).toEqual({ kind: 'choose', index: 0 })
    expect(decisionShortcut(key('3'), radio, true)).toEqual({ kind: 'choose', index: 2 })
  })
  it('ignores digits outside 1-3 and with modifiers', () => {
    expect(decisionShortcut(key('4'), body, true)).toBeNull()
    expect(decisionShortcut(key('0'), body, true)).toBeNull()
    expect(decisionShortcut(key('1', { ctrlKey: true }), body, true)).toBeNull()
    expect(decisionShortcut(key('1', { altKey: true }), body, true)).toBeNull()
  })
  it('never fires a digit while typing', () => {
    expect(decisionShortcut(key('2'), { tag: 'textarea' }, true)).toBeNull()
    expect(decisionShortcut(key('2'), { tag: 'select' }, true)).toBeNull()
    expect(decisionShortcut(key('2'), { tag: 'input', type: 'text' }, true)).toBeNull()
    expect(decisionShortcut(key('2'), { tag: 'div', editable: true }, true)).toBeNull()
  })
  it('saves on Ctrl or Cmd + Enter, even inside the note', () => {
    expect(decisionShortcut(key('Enter', { ctrlKey: true }), { tag: 'textarea' }, true)).toEqual({ kind: 'save' })
    expect(decisionShortcut(key('Enter', { metaKey: true }), body, false)).toEqual({ kind: 'save' })
    expect(decisionShortcut(key('Enter'), body, true)).toBeNull()
  })
  it('turns single keys off but keeps the modifier shortcut', () => {
    expect(decisionShortcut(key('1'), body, false)).toBeNull()
    expect(decisionShortcut(key('Enter', { ctrlKey: true }), body, false)).toEqual({ kind: 'save' })
  })
})

describe('queueShortcut', () => {
  it('moves with j and k', () => {
    expect(queueShortcut(key('j'), body, true)).toBe('next')
    expect(queueShortcut(key('k'), body, true)).toBe('previous')
  })
  it('stays out of text entry, modifiers and the off switch', () => {
    expect(queueShortcut(key('j'), { tag: 'input', type: 'search' }, true)).toBeNull()
    expect(queueShortcut(key('j', { metaKey: true }), body, true)).toBeNull()
    expect(queueShortcut(key('j'), body, false)).toBeNull()
  })
})

describe('isRunKey', () => {
  it('accepts Ctrl or Cmd + Enter only', () => {
    expect(isRunKey(key('Enter', { ctrlKey: true }))).toBe(true)
    expect(isRunKey(key('Enter', { metaKey: true }))).toBe(true)
    expect(isRunKey(key('Enter'))).toBe(false)
    expect(isRunKey(key('a', { ctrlKey: true }))).toBe(false)
  })
})
