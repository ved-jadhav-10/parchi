import { Card } from '../components/Card'
import { EmptyState, PageIntro } from '../components/PageIntro'
import { normalizeRows, useJson, type DataRow } from '../lib/dataFiles'
import { SOURCES } from '../lib/sources'

const Approval = ({ approved }: { approved: boolean | undefined }) =>
  approved === true ? (
    <span className="tier-badge" data-tier="silent" style={{ color: 'var(--status-ok)', background: 'var(--status-ok-bg)' }}>
      Approved
    </span>
  ) : (
    <span className="tier-badge" data-tier="inform">
      {approved === false ? 'Not approved' : 'Unknown'}
    </span>
  )

const DataSection = ({ title, file, meanwhile, description }: { title: string; file: string; meanwhile: string; description: string }) => {
  const { status, data } = useJson(`/data/${file}`)
  const rows: DataRow[] = status === 'ok' ? normalizeRows(data) : []
  const approved = rows.filter((r) => r.approved === true).length

  return (
    <Card title={title} icon="shield" description={description}>
      {status === 'loading' ? null : rows.length === 0 ? (
        <EmptyState title="Nothing loaded on this device yet">
          <p>
            {meanwhile} Expected at <code>public/data/{file}</code>.
          </p>
        </EmptyState>
      ) : (
        <>
          <p className="hint">
            {approved} of {rows.length} approved by a pharmacist. Anything else is shown as not approved and should not be relied on.
          </p>
          <div className="xray">
            <table>
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Applies to</th>
                  <th scope="col">Value</th>
                  <th scope="col">Source</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <th scope="row">{r.name}</th>
                    <td>{r.detail || '—'}</td>
                    <td className="num">{r.value || '—'}</td>
                    <td>{r.source || '—'}</td>
                    <td>
                      <Approval approved={r.approved} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  )
}

export const DataPage = () => (
  <>
    <PageIntro note="What the checks rely on." title="Data and limits" />
    <div className="workspace workspace--single">
      <p className="hint">Every number here needs a source and a pharmacist sign-off. Anything without one is marked.</p>
      <DataSection
        title="Dose limits"
        file="limits.json"
        meanwhile="Until limits are added, the X-ray shows “No limit on file” for every ingredient."
        description="Maximum mg/day and SOS caps used by the X-ray and overdose alerts"
      />
      <DataSection
        title="Suppression list"
        file="suppression.json"
        meanwhile="Until then, no alert is logged silently by choice."
        description="Alerts the pharmacist chose to log silently instead of showing"
      />
      <Card title="Sources and licences" icon="shield" description="Where the brand, ban, batch and interaction data comes from, and on what terms">
        <div className="xray">
          <table>
            <thead>
              <tr>
                <th scope="col">Source</th>
                <th scope="col">Used for</th>
                <th scope="col">As of</th>
                <th scope="col">Terms</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map((s) => (
                <tr key={s.name}>
                  <th scope="row">{s.name}</th>
                  <td>{s.usedFor}</td>
                  <td>{s.asOf}</td>
                  <td>{s.terms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </>
)
