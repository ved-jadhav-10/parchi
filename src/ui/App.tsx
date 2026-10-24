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
import { useRoute, type Route } from './route'

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

  // A hash change swaps the page without a load, so move focus to the new page as a load would (screen readers and
  // keyboard users otherwise stay on the link they pressed, in the old page's place).
  useEffect(() => {
    const onHash = () => main.current?.focus()
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

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
