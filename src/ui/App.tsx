import './styles/base.css'
import './styles/components.css'
import { AppHeader } from './components/AppHeader'
import { BenchmarkPage } from './pages/BenchmarkPage'
import { CheckPage } from './pages/CheckPage'
import { DataPage } from './pages/DataPage'
import { LogPage } from './pages/LogPage'
import { useRoute, type Route } from './route'

const pages: Record<Route, () => React.JSX.Element> = {
  check: CheckPage,
  log: LogPage,
  benchmark: BenchmarkPage,
  data: DataPage,
}

export default function App() {
  const route = useRoute()
  const Page = pages[route]
  return (
    <>
      <AppHeader route={route} />
      <main className="page">
        <Page />
      </main>
      <footer className="disclaimer">Decision support for a pharmacist. Not a substitute for professional judgement.</footer>
    </>
  )
}
