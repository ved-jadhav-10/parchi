import { useSyncExternalStore } from 'react'
import { scenarioById } from './scenarios'

interface TourState {
  id: string | null
  index: number
  /** The story advances by itself, like a film; the visitor can pause it at any step */
  auto: boolean
}

let state: TourState = { id: null, index: 0, auto: false }
const listeners = new Set<() => void>()
const set = (next: TourState) => {
  state = next
  listeners.forEach((l) => l())
}

export const startTour = (id: string, auto = false) => scenarioById(id) && set({ id, index: 0, auto })
export const exitTour = () => set({ id: null, index: 0, auto: false })
export const setAuto = (auto: boolean) => set({ ...state, auto })
export const goToStep = (index: number) => {
  const s = state.id ? scenarioById(state.id) : undefined
  if (s) set({ ...state, index: Math.max(0, Math.min(index, s.steps.length - 1)) })
}
export const nextStep = () => goToStep(state.index + 1)
export const backStep = () => goToStep(state.index - 1)

export const useTour = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
