import { useEffect, useState } from 'react'

export type Route = 'check' | 'demo' | 'log' | 'benchmark' | 'data'

export const routes: { id: Route; label: string }[] = [
  { id: 'check', label: 'Check' },
  { id: 'demo', label: 'Demo' },
  { id: 'log', label: 'Override log' },
  { id: 'benchmark', label: 'Benchmark' },
  { id: 'data', label: 'Data & limits' },
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
