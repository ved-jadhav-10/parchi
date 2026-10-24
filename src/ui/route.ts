import { useEffect, useState } from 'react'

export type Route = 'home' | 'check' | 'demo' | 'queue' | 'order' | 'history' | 'log' | 'benchmark' | 'data'

/** The pages with a pill in the navigation. `order` and `history` are reached from the queue, so they have none. */
export const routes: { id: Route; label: string }[] = [
  { id: 'queue', label: 'Review queue' },
  { id: 'check', label: 'Check' },
  { id: 'log', label: 'Override log' },
  { id: 'data', label: 'Data & limits' },
  { id: 'benchmark', label: 'Benchmark' },
  { id: 'demo', label: 'Demo' },
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
