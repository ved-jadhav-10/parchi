export const PageIntro = ({ eyebrow, title }: { eyebrow: string; title: string }) => (
  <div className="intro">
    <p className="intro__eyebrow">{eyebrow}</p>
    <h1>{title}</h1>
  </div>
)

export const EmptyState = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="empty">
    <p className="empty__title">{title}</p>
    {children}
  </div>
)
