import { Component, type ReactNode } from 'react'
import { EmptyState } from './PageIntro'

/**
 * A page that cannot render must not blank the whole app. The usual cause is a page file that is missing: a tab left open
 * across an update asks for a file the new version no longer has, or the first visit happens offline before everything
 * was stored. The message says what to do; Reload fetches the current version.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <EmptyState title="This page could not load">
        <p>Parchi may have been updated, or the connection dropped before this page was stored on this device. Nothing you saved is lost.</p>
        <p>
          <button type="button" className="btn btn--primary" onClick={() => location.reload()}>
            Reload
          </button>
        </p>
      </EmptyState>
    )
  }
}
