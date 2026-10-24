import { routes, type Route } from '../route'

export const PlannedPage = ({ route }: { route: Route }) => {
  const page = routes.find((r) => r.id === route)!
  return (
    <>
      <div className="intro">
        <p className="intro__eyebrow">Planned,</p>
        <h1>{page.title}</h1>
      </div>
      <div className="empty">
        <p>{page.planned}</p>
      </div>
    </>
  )
}
