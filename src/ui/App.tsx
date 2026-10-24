import './styles/base.css'
import './styles/components.css'
import './styles/nav.css'
import './styles/home.css'
import './styles/review.css'
import { lazy, Suspense, useEffect, useRef, type ComponentType } from 'react'
import { AppHeader } from './components/AppHeader'
import { ErrorBoundary } from './components/ErrorBoundary'
import { UpdateToast } from './components/UpdateToast'
import { Tour } from './tour/Tour'
import { HomePage } from './pages/HomePage'
import { CLINICAL_DATA_VERSION } from '../engine/rules'
import { routes, useRoute, useRouteParam, type Route } from './route'

/** "Review queue - Parchi"; an order or a history edit names its id. The landing page is just the name. */
const pageTitle = (route: Route, param: string) => {
  if (route === 'home') return 'Parchi: a second look at every prescription'
  if (route === 'order') return `${param ? `Order ${param}` : 'Order'} - Parchi`
  if (route === 'history') return `${param ? `Edit order ${param}` : 'Add an order'} - Parchi`
  return `${routes.find((r) => r.id === route)?.label ?? 'Check'} - Parchi`
}

// The working pages load on demand: the landing page (and a first visit) does not pay for the engine, the history form or the data tables.
// Every chunk is in the service worker's precache, so a page still opens offline.
// A failed load is tried once more before the error boundary takes over (a dropped connection often recovers within a second).
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => load().catch(() => new Promise((r) => setTimeout(r, 800)).then(load)).then((m) => ({ default: m[name] })))

const pages: Record<Exclude<Route, 'home'>, ComponentType> = {
  check: page(() => import('./pages/CheckPage'), 'CheckPage'),
  demo: page(() => import('./pages/DemoPage'), 'DemoPage'),
  queue: page(() => import('./pages/QueuePage'), 'QueuePage'),
  order: page(() => import('./pages/OrderPage'), 'OrderPage'),
  history: page(() => import('./pages/HistoryPage'), 'HistoryPage'),
  log: page(() => import('./pages/LogPage'), 'LogPage'),
  benchmark: page(() => import('./pages/BenchmarkPage'), 'BenchmarkPage'),
  data: page(() => import('./pages/DataPage'), 'DataPage'),
  catalogue: page(() => import('./pages/CataloguePage'), 'CataloguePage'),
}

export default function App() {
  const route = useRoute()
  const main = useRef<HTMLElement>(null)

  // A hash change swaps the page without a load, so do what a load would: a title for the new page, the top of it in view,
  // and focus on it (screen readers and keyboard users otherwise stay on the link they pressed, in the old page's place).
  // The first render is a load already, so it only sets the title. Running after render also covers arriving from the
  // landing page, whose <main> did not exist when the hash changed.
  const param = useRouteParam()
  const first = useRef(true)
  useEffect(() => {
    document.title = pageTitle(route, param)
    if (first.current) {
      first.current = false
      return
    }
    scrollTo(0, 0)
    if (route === 'home') document.getElementById('home-title')?.focus({ preventScroll: true })
    else main.current?.focus({ preventScroll: true })
  }, [route, param])

  // Once someone is in the app, read the brand and rule data in the background so the first check does not wait on about 2 MB of JSON.
  useEffect(() => {
    if (route === 'home') return
    const idle = window.requestIdleCallback ?? ((f: () => void) => setTimeout(f, 1500))
    idle(() => void import('./engine').then((m) => m.getDeps()).catch(() => {}))
  }, [route])

  // The landing page brings its own navigation and footer.
  if (route === 'home') {
    return (
      <>
        <HomePage />
        <UpdateToast />
      <Tour />
      </>
    )
  }
  const Page = pages[route]
  return (
    <>
      {/* Not href="#main": the hash is the router. */}
      <a
        className="skip-link"
        href="#/"
        onClick={(e) => {
          e.preventDefault()
          main.current?.focus()
        }}
      >
        Skip to content
      </a>
      <AppHeader route={route} />
      <main className="page" id="main" ref={main} tabIndex={-1}>
        <ErrorBoundary key={route}>
          <Suspense fallback={<p className="hint" role="status">Loading…</p>}>
            <Page />
          </Suspense>
        </ErrorBoundary>
      </main>
      <footer className="disclaimer">
        <span>
          Decision support for a pharmacist. Not a substitute for professional judgement. Dose limits and alert rules are drafts until a pharmacist signs them off; an alert marked
          “Approved rule” is the exception (data version {CLINICAL_DATA_VERSION}).
        </span>
        <a href="#/home">About Parchi</a>
      </footer>
      <UpdateToast />
      <Tour />
    </>
  )
}
