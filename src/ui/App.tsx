import './styles/base.css'
import './styles/components.css'
import './styles/nav.css'
import './styles/home.css'
import './styles/review.css'
import { useEffect, useRef } from 'react'
import { AppHeader } from './components/AppHeader'
import { BenchmarkPage } from './pages/BenchmarkPage'
import { CheckPage } from './pages/CheckPage'
import { DataPage } from './pages/DataPage'
import { DemoPage } from './pages/DemoPage'
import { HomePage } from './pages/HomePage'
import { HistoryPage } from './pages/HistoryPage'
import { LogPage } from './pages/LogPage'
import { OrderPage } from './pages/OrderPage'
import { QueuePage } from './pages/QueuePage'
import { routes, useRoute, useRouteParam, type Route } from './route'

/** "Review queue - Parchi"; an order or a history edit names its id. The landing page is just the name. */
const pageTitle = (route: Route, param: string) => {
  if (route === 'home') return 'Parchi: a second look at every prescription'
  if (route === 'order') return `${param ? `Order ${param}` : 'Order'} - Parchi`
  if (route === 'history') return `${param ? `Edit order ${param}` : 'Add an order'} - Parchi`
  return `${routes.find((r) => r.id === route)?.label ?? 'Check'} - Parchi`
}

const pages: Record<Exclude<Route, 'home'>, () => React.JSX.Element> = {
  check: CheckPage,
  demo: DemoPage,
  queue: QueuePage,
  order: OrderPage,
  history: HistoryPage,
  log: LogPage,
  benchmark: BenchmarkPage,
  data: DataPage,
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

  // The landing page brings its own navigation and footer.
  if (route === 'home') return <HomePage />
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
        <Page />
      </main>
      <footer className="disclaimer">
        <span>Decision support for a pharmacist. Not a substitute for professional judgement.</span>
        <a href="#/home">About Parchi</a>
      </footer>
    </>
  )
}
