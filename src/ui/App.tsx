import './styles/base.css'
import './styles/components.css'
import './styles/nav.css'
import './styles/home.css'
import './styles/review.css'
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
  // The landing page brings its own navigation and footer.
  if (route === 'home') return <HomePage />
  const Page = pages[route]
  return (
    <>
      <AppHeader route={route} />
      <main className="page">
        <Page />
      </main>
      <footer className="disclaimer">
        <span>Decision support for a pharmacist. Not a substitute for professional judgement.</span>
        <a href="#/home">About Parchi</a>
      </footer>
    </>
  )
}
