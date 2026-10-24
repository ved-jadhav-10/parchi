import { useState } from 'react'
import { routes, useOnline, type Route } from '../route'
import { Icon } from './Icons'
import { LogoMark } from './LogoMark'

const ConnectionPill = () => {
  const online = useOnline()
  return (
    <span className="conn-pill" data-online={online}>
      <span className="conn-pill__dot" />
      {online ? 'Online' : 'Offline: all checks still run'}
    </span>
  )
}

const PillNav = ({ route, onNavigate }: { route: Route; onNavigate: () => void }) => (
  <nav aria-label="Pages">
    <ul className="pillnav">
      {routes.map((r) => (
        <li key={r.id}>
          <a
            href={`#/${r.id}`}
            className="pillnav__link"
            aria-current={r.id === route || (r.id === 'queue' && (route === 'order' || route === 'history')) ? 'page' : undefined}
            onClick={onNavigate}
          >
            {r.label}
          </a>
        </li>
      ))}
    </ul>
  </nav>
)

export const AppHeader = ({ route }: { route: Route }) => {
  const [open, setOpen] = useState(false)
  return (
    <header className="app-header">
      <a href="#/check" className="brand">
        <span className="brand__mark">
          <LogoMark size={44} />
        </span>
        Parchi
      </a>

      <div className="app-header__nav" data-open={open}>
        <PillNav route={route} onNavigate={() => setOpen(false)} />
      </div>

      <div className="app-header__end">
        <ConnectionPill />
        <button
          className="nav-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <Icon name={open ? 'close' : 'menu'} size={22} />
        </button>
      </div>
    </header>
  )
}
