import type { KeyboardEvent } from 'react'

export type TabItem<T extends string> = { id: T; label: string; count?: number }

export const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`
export const panelId = (prefix: string) => `${prefix}-panel`

type TabsProps<T extends string> = { prefix: string; label: string; items: TabItem<T>[]; value: T; onChange: (id: T) => void }

/** Tabs that split a long page into one view at a time. Arrow keys move between tabs; the panel is rendered by the caller. */
export function Tabs<T extends string>({ prefix, label, items, value, onChange }: TabsProps<T>) {
  const move = (e: KeyboardEvent<HTMLDivElement>) => {
    const at = items.findIndex((t) => t.id === value)
    const next = e.key === 'ArrowRight' ? at + 1 : e.key === 'ArrowLeft' ? at - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : null
    if (next === null) return
    e.preventDefault()
    const to = items[(next + items.length) % items.length]
    onChange(to.id)
    document.getElementById(tabId(prefix, to.id))?.focus()
  }

  return (
    <div className="tabs" role="tablist" aria-label={label} onKeyDown={move}>
      {items.map((t) => (
        <button
          key={t.id}
          id={tabId(prefix, t.id)}
          type="button"
          role="tab"
          className="tabs__tab"
          aria-selected={t.id === value}
          aria-controls={panelId(prefix)}
          tabIndex={t.id === value ? 0 : -1}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count !== undefined && <span className="tabs__count">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}
