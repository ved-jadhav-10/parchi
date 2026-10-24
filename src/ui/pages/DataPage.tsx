import { useState } from 'react'
import { HERBAL_RULES } from '../../engine/herbal'
import { LIMITS } from '../../engine/limits'
import { ScrollRegion } from '../components/ScrollRegion'
import { parseAlertRules, type AlertRules } from '../../engine/rules'
import { Card } from '../components/Card'
import { EmptyState, PageIntro } from '../components/PageIntro'
import { useJson, type DataRow } from '../lib/dataFiles'
import { approvedCount, herbalRows, limitRows, policyRows, ruleRows, sosRows, suppressionRows, supplementRows } from '../lib/policyRows'
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

interface Filter {
  text: string
  unsignedOnly: boolean
}

const matches = (r: DataRow, f: Filter) =>
  (!f.unsignedOnly || r.approved !== true) && (f.text === '' || [r.name, r.detail, r.value, r.source].join(' ').toLowerCase().includes(f.text.toLowerCase()))

/** One table of values with a source and a pharmacist approval each. An empty list keeps its frame and says so. */
const DataTable = ({ title, description, all, filter, empty }: { title: string; description: string; all: DataRow[]; filter: Filter; empty: string }) => {
  const rows = all.filter((r) => matches(r, filter))
  const filtered = filter.text !== '' || filter.unsignedOnly
  return (
  <Card title={title} icon="shield" description={description}>
    {all.length === 0 ? (
      <EmptyState title="Nothing listed">
        <p>{empty}</p>
      </EmptyState>
    ) : (
      <>
        <p className="hint">
          {approvedCount(all)} of {all.length} signed off. Anything else is shown as not signed off and should not be relied on.
          {filtered && ` Showing ${rows.length}.`}
        </p>
        {rows.length === 0 ? (
          <p className="hint">No row here matches the filter.</p>
        ) : (
        <ScrollRegion className="xray" label={`${title}, scrolls sideways`}>
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
                    {r.approved && r.approvedBy ? <div className="hint">Signed off by {r.approvedBy}</div> : null}
                    {r.checked ? <div className="hint">{r.checked}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
        )}
      </>
    )}
  </Card>
  )
}

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
  const [filter, setFilter] = useState<Filter>({ text: '', unsignedOnly: false })
  const unreadable = 'Could not read public/data/alert_rules.json on this device. Until it loads, no alert rules are applied.'

  const limits = limitRows(LIMITS)
  const sos = sosRows(LIMITS)
  const groups = {
    limits,
    sos,
    rules: rules ? ruleRows(rules) : [],
    policy: rules ? policyRows(rules, LIMITS.windows?.default_duration_days) : [],
    suppression: rules ? suppressionRows(rules) : [],
    curated: supplement.status === 'ok' ? supplementRows(supplement.data) : [],
    herbal: herbalRows(HERBAL_RULES),
  }
  const everything = Object.values(groups).flat()
  const unsigned = everything.length - approvedCount(everything)

  return (
    <>
      <PageIntro note="What the checks rely on." title="Data and limits" />
      <div className="workspace workspace--single">
        <p className="hint" role="status">
          {unsigned} of {everything.length} numbers and rules here are not signed off yet. Each is marked, with its source. “Label quote checked” means a script found the cited sentence in the label; it is not a sign-off. {approvedCount(everything)} dose limits for everyday medicines were signed off by Dr. Sanjay Dhanushkar; less common medicines, kidney bands, paracetamol with alcohol or liver disease, and as-needed caps were not covered.
        </p>
        <div className="toolbar">
          <label className="field">
            <span className="field__label">Find</span>
            <input className="field__input" type="search" value={filter.text} placeholder="Ingredient, rule or source" onChange={(e) => setFilter({ ...filter, text: e.target.value })} />
          </label>
          <label className="decision__switch">
            <input type="checkbox" checked={filter.unsignedOnly} onChange={(e) => setFilter({ ...filter, unsignedOnly: e.target.checked })} />
            <span>Only rows not signed off</span>
          </label>
        </div>
        <DataTable title="Dose limits" description="Maximum mg/day by age and kidney function, used by the X-ray and the overdose alert" all={groups.limits} filter={filter} empty="No limits are listed, so the X-ray shows “No limit on file”." />
        <DataTable title="As-needed (SOS) caps" description="Doses a day assumed for an as-needed line that writes no maximum" all={groups.sos} filter={filter} empty="No caps are listed." />
        {rules || failed ? (
          <>
            <DataTable title="Alert rules" description="When an alert is raised, and at which tier" all={groups.rules} filter={filter} empty={unreadable} />
            <DataTable title="Policy behind the tiers and the queue" description="Stacked-burden scales, how dose facts become tiers, order status, queue ranking and refill grace" all={groups.policy} filter={filter} empty={unreadable} />
            <DataTable title="Suppression list" description="Alerts the pharmacist chose to log silently instead of showing" all={groups.suppression} filter={filter} empty={rules ? 'No alert is logged silently by choice.' : unreadable} />
          </>
        ) : null}
        <DataTable
          title="Curated interaction rules"
          description="Interactions added by hand because the DDInter data lacks them. Each applies to every pair of the listed medicines"
          all={groups.curated}
          filter={filter}
          empty="No curated rules could be read, so only DDInter pairs are checked."
        />
        <DataTable title="Herbal and Ayurvedic rules" description="A starting set of herb and medicine pairs, with how well each is supported" all={groups.herbal} filter={filter} empty="No herbal rules are listed." />
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
