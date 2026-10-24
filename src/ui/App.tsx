import './styles/base.css'
import './styles/components.css'
import { AppHeader } from './components/AppHeader'
import { CheckPage } from './pages/CheckPage'
import { PlannedPage } from './pages/PlannedPage'
import { useRoute } from './route'

export default function App() {
  const route = useRoute()
  return (
    <>
      <AppHeader route={route} />
      <main className="page">{route === 'check' ? <CheckPage /> : <PlannedPage route={route} />}</main>
      <footer className="disclaimer">Decision support for a pharmacist. Not a substitute for professional judgement.</footer>
    </>
  )
}
