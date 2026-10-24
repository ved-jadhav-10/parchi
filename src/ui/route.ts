import { useEffect, useState } from 'react'

export type Route = 'home' | 'check' | 'demo' | 'queue' | 'order' | 'history' | 'log' | 'benchmark' | 'data' | 'catalogue'

/**
 * The pages in the navigation. `main` are the pharmacist's daily tools and sit in the bar; `more` (the walkthrough, the
 * measured comparison and the data behind the checks) sit under "More". `order` and `history` are reached from the queue.
 */
export const routes: { id: Route; label: string; group: 'main' | 'more' }[] = [
  { id: 'queue', label: 'Review queue', group: 'main' },
  { id: 'check', label: 'Check', group: 'main' },
  { id: 'demo', label: 'Demo', group: 'main' },
  { id: 'log', label: 'Override log', group: 'main' },
  { id: 'benchmark', label: 'Benchmark', group: 'more' },
  { id: 'catalogue', label: 'Catalogue', group: 'more' },
  { id: 'data', label: 'Data & limits', group: 'more' },
]

/** `#/order/ORD-1087` -> ['order', 'ORD-1087']. Only `order` and `history` take a second segment. */
const split = (): [string, string] => {
  const [id = '', param = ''] = location.hash.replace(/^#\/?/, '').split('/')
  return [id, decodeURIComponent(param)]
}

/** No hash (or `#/home`) is the landing page. Home is not in `routes`, so it has no nav pill. An unknown hash is Check. */
const read = (): Route => {
  const [id] = split()
  if (id === '' || id === 'home') return 'home'
  if (id === 'order' || id === 'history') return id
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

/** The id after the page name: the order on `#/order/<id>`, or the order being edited on `#/history/<id>`. */
export function useRouteParam(): string {
  const [param, setParam] = useState(() => split()[1])
  useEffect(() => {
    const on = () => setParam(split()[1])
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  return param
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
