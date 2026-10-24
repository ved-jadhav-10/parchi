import { Card, KpiCard } from '../components/Card'
import { EmptyState, PageIntro } from '../components/PageIntro'
import { normalizeBenchmark, useJson, type SystemResult } from '../lib/dataFiles'
import { pct, titleCase } from '../lib/format'

const num = (n?: number) => (n == null ? '—' : n.toFixed(1))

const MetricBar = ({ label, value }: { label: string; value?: number }) => (
  <div className="metric">
    <span className="metric__label">{label}</span>
    <div className="limit__track" aria-hidden="true">
      {value != null && <div className="limit__fill metric__fill" style={{ width: `${Math.min(value, 1) * 100}%` }} />}
    </div>
    <span className="num metric__value">{pct(value)}</span>
  </div>
)

export const BenchmarkPage = () => {
  const { status, data } = useJson('/data/benchmark.json')
  const bench = status === 'ok' ? normalizeBenchmark(data) : null

  if (status === 'loading') return <PageIntro note="Measured, not claimed." title="Engine vs chatbots" />

  if (!bench) {
    return (
      <>
        <PageIntro note="Measured, not claimed." title="Engine vs chatbots" />
        <EmptyState title="No benchmark results yet">
          <p>
            Results appear here once the benchmark has run: the engine and each chatbot on the same labelled prescriptions, so nothing shown is
            estimated.
          </p>
          <ul className="checks">
            <li>
              <strong>Alerts per prescription</strong>
              <span>How many alerts each system raises on the same prescriptions.</span>
            </li>
            <li>
              <strong>Interrupts per prescription</strong>
              <span>The target is 1 or fewer.</span>
            </li>
            <li>
              <strong>False alarms on clean prescriptions</strong>
              <span>Alerts raised where the pharmacist found nothing to flag.</span>
            </li>
            <li>
              <strong>Precision and recall, by alert type</strong>
              <span>Scored against the labelled set.</span>
            </li>
          </ul>
          <p className="hint">
            To produce them, run the benchmark in <code>eval/</code>; it writes <code>public/data/benchmark.json</code>.
          </p>
        </EmptyState>
      </>
    )
  }

  const engine = bench.systems.find((s) => /engine|parchi/i.test(s.name)) ?? bench.systems[0]
  const types = [...new Set(bench.systems.flatMap((s) => Object.keys(s.by_type)))]
  const cell = (s: SystemResult, t: string, k: 'precision' | 'recall') => s.by_type[t]?.[k]

  return (
    <>
      <PageIntro note="Measured, not claimed." title="Engine vs chatbots" />
      <div className="workspace workspace--single">
        {bench.label_status?.startsWith('draft') && (
          <p className="mock-note">
            The expected alerts in this set are a draft: written from drug labels and guidelines, not yet reviewed by a pharmacist. Read the numbers as a test of the engine, not as
            clinical validation.
          </p>
        )}
        {bench.systems.length < 2 && (
          <p className="mock-note">
            Only the engine is scored so far. Chatbot results appear here once their answers to the same prescriptions are saved in <code>eval/outputs/</code> (see{' '}
            <code>eval/README.md</code>).
          </p>
        )}
        <div className="kpis">
          <KpiCard label="Prescriptions" value={bench.n_rx ?? '—'} hint={bench.label_status?.startsWith('draft') ? 'Gold set, draft labels' : 'Pharmacist-labelled gold set'} />
          <KpiCard label="Alerts per Rx" value={num(engine.alerts_per_rx)} hint={engine.name} />
          <KpiCard label="Interrupts per Rx" value={num(engine.interrupts_per_rx)} hint="Target: 1 or fewer" tier="interrupt" />
          <KpiCard label="Agreement (kappa)" value={bench.kappa?.toFixed(2) ?? '—'} hint={bench.kappa == null ? 'Needs a second rater' : 'Between two raters'} />
        </div>

        <Card title="Alert load" description="Fewer alerts and fewer false alarms on clean prescriptions mean less alert fatigue">
          <div className="xray">
            <table>
              <thead>
                <tr>
                  <th scope="col">System</th>
                  <th scope="col">Alerts per Rx</th>
                  <th scope="col">Interrupts per Rx</th>
                  <th scope="col">False alarms on clean Rx</th>
                  <th scope="col">Median time</th>
                </tr>
              </thead>
              <tbody>
                {bench.systems.map((s) => (
                  <tr key={s.name}>
                    <th scope="row">{s.name}</th>
                    <td className="num">{num(s.alerts_per_rx)}</td>
                    <td className="num">{num(s.interrupts_per_rx)}</td>
                    <td className="num">{pct(s.clean_fp_rate)}</td>
                    <td className="num">{s.median_ms == null ? '—' : `${s.median_ms} ms`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {types.map((t) => (
          <Card key={t} title={titleCase(t)} description="Precision and recall against the gold set">
            <div className="metrics">
              {bench.systems.map((s) => (
                <div key={s.name} className="metrics__system">
                  <p className="metrics__name">{s.name}</p>
                  <MetricBar label="Precision" value={cell(s, t, 'precision')} />
                  <MetricBar label="Recall" value={cell(s, t, 'recall')} />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
