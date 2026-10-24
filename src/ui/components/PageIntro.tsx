/** Screen title first, then one grey sentence about what the screen holds. */
export const PageIntro = ({ title, note }: { title: string; note: string }) => (
  <div className="intro">
    <h1>{title}</h1>
    <p className="intro__note">{note}</p>
  </div>
)

export const EmptyState = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="empty">
    <p className="empty__title">{title}</p>
    {children}
  </div>
)
