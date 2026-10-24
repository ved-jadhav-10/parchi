import { useState } from 'react'
import type { ResolvedBrand, Sig } from '../../engine/contracts'
import { downloadText } from '../lib/csv'
import { LEAFLET_LANGUAGES, leafletRequest } from '../lib/leaflet'
import { useOnline } from '../route'
import { Card } from './Card'

type Phase = { kind: 'idle' } | { kind: 'working' } | { kind: 'done'; text: string } | { kind: 'error'; message: string }

const errorFor = (status: number, retry: string | null): string =>
  status === 503
    ? 'Leaflets are not set up on this server.'
    : status === 429
      ? `Too many requests. Try again in ${retry ?? 'a minute'} seconds.`
      : 'The leaflet could not be written just now. Try again, or write the instructions by hand.'

/**
 * A plain-language leaflet for the customer in their language. Online only (the model runs on the server) and written
 * only from the medicine names, how each is taken and the points typed here; it never decides an alert.
 */
export const LeafletCard = ({ lines, inDetails }: { lines: { resolved: ResolvedBrand; sig: Sig | null }[]; inDetails?: boolean }) => {
  const online = useOnline()
  const [language, setLanguage] = useState('hi')
  const [points, setPoints] = useState('')
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [copied, setCopied] = useState(false)
  const request = leafletRequest(language, lines, points)

  const write = async () => {
    setPhase({ kind: 'working' })
    setCopied(false)
    try {
      const res = await fetch('/api/leaflet', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request), signal: AbortSignal.timeout(30_000) })
      if (!res.ok) return setPhase({ kind: 'error', message: errorFor(res.status, res.headers.get('retry-after')) })
      const data = (await res.json()) as { leaflet?: string }
      setPhase(typeof data.leaflet === 'string' && data.leaflet ? { kind: 'done', text: data.leaflet } : { kind: 'error', message: errorFor(502, null) })
    } catch {
      setPhase({ kind: 'error', message: errorFor(0, null) })
    }
  }

  const copy = async () => {
    if (phase.kind !== 'done') return
    try {
      await navigator.clipboard.writeText(phase.text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const body = (
    <>
      {request.medicines.length === 0 ? (
        <p className="hint">No recognised medicine to write about yet.</p>
      ) : (
        <>
          <div className="fields">
            <label className="field">
              <span className="field__label">Language</span>
              <select className="field__input" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LEAFLET_LANGUAGES.map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span className="field__label">Points to tell the customer (optional, one per line)</span>
            <textarea className="rx-input" rows={3} value={points} onChange={(e) => setPoints(e.target.value)} placeholder="Take Pan 40 half an hour before food" />
          </label>
          <div className="actions">
            <button type="button" className="btn btn--secondary" onClick={write} disabled={!online || phase.kind === 'working'}>
              {phase.kind === 'working' ? 'Writing…' : 'Write the leaflet'}
            </button>
          </div>
          {!online && <p className="hint">You are offline. The leaflet is written online; everything else here keeps working.</p>}
          <p className="sr-only" role="status">
            {phase.kind === 'done' ? 'Leaflet written.' : phase.kind === 'working' ? 'Writing the leaflet.' : ''}
          </p>
          <div>
            {phase.kind === 'error' && (
              <p className="dialog__error" role="alert">
                {phase.message}
              </p>
            )}
            {phase.kind === 'done' && (
              <>
                <pre className="leaflet" lang={language}>
                  {phase.text}
                </pre>
                <p className="hint">Draft written by an AI model from the medicine names, how each is taken and your points only. Read it before it is shared; it adds no advice of its own.</p>
                <div className="actions">
                  <button type="button" className="btn btn--secondary" onClick={copy}>
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button type="button" className="btn btn--secondary" onClick={() => downloadText(`leaflet-${language}.txt`, phase.text, 'text/plain;charset=utf-8')}>
                    Download as text
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  )

  return inDetails ? (
    <details className="card order__tools">
      <summary>Customer leaflet (needs a connection)</summary>
      <div className="order__tools-body">{body}</div>
    </details>
  ) : (
    <Card title="Customer leaflet" icon="download" description="How to take each medicine, in the customer's language. Needs an internet connection.">
      {body}
    </Card>
  )
}
