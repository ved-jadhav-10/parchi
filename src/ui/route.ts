import { useEffect, useState } from 'react'

export type Route = 'check' | 'log' | 'benchmark' | 'data'

export const routes: { id: Route; label: string; title: string; planned: string }[] = [
  { id: 'check', label: 'Check', title: 'Prescription check', planned: '' },
  {
    id: 'log',
    label: 'Override log',
    title: 'Override log',
    planned: 'Every override with its reason and time, stored on this device (IndexedDB), filterable by tier and date.',
  },
  {
    id: 'benchmark',
    label: 'Benchmark',
    title: 'Engine vs chatbots',
    planned: 'Precision and recall per alert type and alerts per Rx on the pharmacist gold set, against ChatGPT, Claude and Gemini.',
  },
  {
    id: 'data',
    label: 'Data & limits',
    title: 'Data and limits',
    planned: 'The dose limits and suppression rules in use, each with its source and whether a pharmacist has approved it.',
  },
]

const read = (): Route => {
  const id = location.hash.replace(/^#\//, '')
  return routes.find((r) => r.id === id)?.id ?? 'check'
}

/** Hash routing keeps the PWA static and adds no dependency. Links are plain `#/<id>` anchors. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(read)
  useEffect(() => {
    const on = () => setRoute(read())
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  return route
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    addEventListener('online', up)
    addEventListener('offline', down)
    return () => {
      removeEventListener('online', up)
      removeEventListener('offline', down)
    }
  }, [])
  return online
}
