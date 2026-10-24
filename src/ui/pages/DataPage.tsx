import { LIMITS } from '../../engine/limits'
import { ScrollRegion } from '../components/ScrollRegion'
import { parseAlertRules, type AlertRules } from '../../engine/rules'
import { Card } from '../components/Card'
import { EmptyState, PageIntro } from '../components/PageIntro'
import { useJson, type DataRow } from '../lib/dataFiles'
import { approvedCount, limitRows, ruleRows, sosRows, suppressionRows, supplementRows } from '../lib/policyRows'
import { SOURCES } from '../lib/sources'

const Approval = ({ approved }: { approved: boolean | undefined }) =>
  approved === true ? (
    <span className="tier-badge" data-tier="silent">
      Signed off
    </span>
  ) : (
    <span className="tier-badge" data-tier="inform">
      {approved === false ? 'Not signed off' : 'Unknown'}
    </span>
  )

/** One table of values with a source and a pharmacist approval each. An empty list keeps its frame and says so. */
const DataTable = ({ title, description, rows, empty }: { title: string; description: string; rows: DataRow[]; empty: string }) => (
  <Card title={title} icon="shield" description={description}>
    {rows.length === 0 ? (
      <EmptyState title="Nothing listed">
        <p>{empty}</p>
      </EmptyState>
    ) : (
      <>
        <p className="hint">
          {approvedCount(rows)} of {rows.length} signed off by a pharmacist. Anything else is shown as not signed off and should not be relied on.
        </p>
        <ScrollRegion className="xray" label="Limits and rules, scrolls sideways">
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
        </ScrollRegion>
      </>
    )}
  </Card>
)

/** The alert policy is fetched (service-worker cached); a file that cannot be read is said so, never shown as empty rules. */
const useRules = (): { rules: AlertRules | null; failed: boolean } => {
  const { status, data } = useJson('/data/alert_rules.json')
  if (status !== 'ok') return { rules: null, failed: status === 'missing' }
  try {
    return { rules: parseAlertRules(data), failed: false }
  } catch {
    return { rules: null, failed: true }
  }
}

export const DataPage = () => {
  const { rules, failed } = useRules()
  const supplement = useJson('/data/ddi_supplement.json')
  const unreadable = 'Could not read public/data/alert_rules.json on this device. Until it loads, no alert rules are applied.'
  return (
    <>
      <PageIntro note="What the checks rely on." title="Data and limits" />
      <div className="workspace workspace--single">
        <p className="hint">Every number here needs a source and a pharmacist sign-off. Anything without one is marked.</p>
        <DataTable title="Dose limits" description="Maximum mg/day by age and kidney function, used by the X-ray and the overdose alert" rows={limitRows(LIMITS)} empty="No limits are listed, so the X-ray shows “No limit on file”." />
        <DataTable title="As-needed (SOS) caps" description="Doses a day assumed for an as-needed line that writes no maximum" rows={sosRows(LIMITS)} empty="No caps are listed." />
        {rules || failed ? (
          <>
            <DataTable title="Alert rules" description="When an alert is raised, and at which tier" rows={rules ? ruleRows(rules) : []} empty={unreadable} />
            <DataTable title="Suppression list" description="Alerts the pharmacist chose to log silently instead of showing" rows={rules ? suppressionRows(rules) : []} empty={rules ? 'No alert is logged silently by choice.' : unreadable} />
          </>
        ) : null}
        <DataTable
          title="Curated interaction rules"
          description="Interactions added by hand because the DDInter data lacks them. Each applies to every pair of the listed medicines"
          rows={supplement.status === 'ok' ? supplementRows(supplement.data) : []}
          empty="No curated rules could be read, so only DDInter pairs are checked."
        />
        <Card title="Sources and licences" icon="shield" description="Where the brand, ban, batch and interaction data comes from, and on what terms">
          <ScrollRegion className="xray" label="Sources and licences, scrolls sideways">
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
          </ScrollRegion>
        </Card>
      </div>
    </>
  )
}
