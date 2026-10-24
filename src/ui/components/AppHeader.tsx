import { useEffect, useRef, useState } from 'react'
import { routes, useOnline, type Route } from '../route'
import { Icon } from './Icons'
import { LogoMark } from './LogoMark'

const ConnectionPill = () => {
  const online = useOnline()
  return (
    <span className="conn-pill" data-online={online} role="status">
      <span className="conn-pill__dot" />
      <span className="conn-pill__label">
        {online ? 'Online' : 'Offline'}
        {!online && <span className="conn-pill__more">: all checks still run</span>}
      </span>
    </span>
  )
}

/** The queue pill stays lit on the order and history pages it leads to. */
const current = (route: Route, id: Route) => id === route || (id === 'queue' && (route === 'order' || route === 'history'))

const MORE_ICON: Partial<Record<Route, 'chart' | 'log' | 'shield'>> = { benchmark: 'chart', catalogue: 'log', data: 'shield' }

const PillNav = ({ route, onNavigate }: { route: Route; onNavigate: () => void }) => {
  const [more, setMore] = useState(false)
  const box = useRef<HTMLLIElement>(null)
  const main = routes.filter((r) => r.group === 'main')
  const rest = routes.filter((r) => r.group === 'more')

  // The More list closes on Escape and on a click anywhere else.
  useEffect(() => {
    if (!more) return
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setMore(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMore(false)
    addEventListener('mousedown', onDown)
    addEventListener('keydown', onKey)
    return () => {
      removeEventListener('mousedown', onDown)
      removeEventListener('keydown', onKey)
    }
  }, [more])

  const link = (r: (typeof routes)[number]) => (
    <a href={`#/${r.id}`} className={`pillnav__link${r.id === 'demo' ? ' pillnav__link--demo' : ''}`} aria-current={current(route, r.id) ? 'page' : undefined} onClick={() => (setMore(false), onNavigate())}>
      {r.id === 'demo' && <Icon name="play" size={13} />}
      {r.label}
    </a>
  )

  return (
    <nav aria-label="Pages">
      <ul className="pillnav">
        {main.map((r) => (
          <li key={r.id}>{link(r)}</li>
        ))}
        <li ref={box} className="pillnav__more" data-open={more}>
          <button
            type="button"
            className="pillnav__link pillnav__toggle"
            aria-expanded={more}
            aria-current={rest.some((r) => current(route, r.id)) ? 'page' : undefined}
            onClick={() => setMore(!more)}
          >
            More
            <Icon name={more ? 'close' : 'menu'} size={14} />
          </button>
          <ul className="pillnav__list">
            {rest.map((r) => (
              <li key={r.id}>
                <a
                  href={`#/${r.id}`}
                  className="pillnav__item"
                  aria-current={current(route, r.id) ? 'page' : undefined}
                  onClick={() => (setMore(false), onNavigate())}
                >
                  <span className="pillnav__icon">
                    <Icon name={MORE_ICON[r.id] ?? 'log'} size={18} />
                  </span>
                  <span className="pillnav__text">
                    <strong>{r.label}</strong>
                    {r.hint && <small>{r.hint}</small>}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </li>
      </ul>
    </nav>
  )
}

export const AppHeader = ({ route }: { route: Route }) => {
  const [open, setOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)

  // Escape closes the open menu and hands focus back to the button that opened it.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      toggle.current?.focus()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [open])
  return (
    <header className="app-header">
      <a href="#/queue" className="brand">
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
          ref={toggle}
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
