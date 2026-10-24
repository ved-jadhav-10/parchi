import { useSyncExternalStore } from 'react'

/** Whether a media query matches, kept current as the window changes. False where `matchMedia` does not exist (tests, old browsers). */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (typeof matchMedia === 'undefined') return () => undefined
      const mq = matchMedia(query)
      mq.addEventListener('change', notify)
      return () => mq.removeEventListener('change', notify)
    },
    () => typeof matchMedia !== 'undefined' && matchMedia(query).matches,
    () => false,
  )
}
