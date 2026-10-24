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

  if (status === 'loading') return <PageIntro eyebrow="Measured, not claimed," title="Engine vs chatbots" />

  if (!bench) {
    return (
      <>
        <PageIntro eyebrow="Measured, not claimed," title="Engine vs chatbots" />
        <EmptyState title="No benchmark results yet">
          <p>
            Run the benchmark in <code>eval/</code> to write <code>public/data/benchmark.json</code>. The page shows the engine and each chatbot on the same
            pharmacist-labelled prescriptions, so nothing here is estimated.
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
      <PageIntro eyebrow="Measured, not claimed," title="Engine vs chatbots" />
      <div className="workspace workspace--single">
        <div className="kpis">
          <KpiCard label="Prescriptions" value={bench.n_rx ?? '—'} hint="Pharmacist-labelled gold set" />
          <KpiCard label="Alerts per Rx" value={num(engine.alerts_per_rx)} hint={engine.name} />
          <KpiCard label="Interrupts per Rx" value={num(engine.interrupts_per_rx)} hint="Target: 1 or fewer" tier="interrupt" />
          <KpiCard label="Agreement (kappa)" value={bench.kappa?.toFixed(2) ?? '—'} hint="Between two raters" />
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
                </tr>
              </thead>
              <tbody>
                {bench.systems.map((s) => (
                  <tr key={s.name}>
                    <th scope="row">{s.name}</th>
                    <td className="num">{num(s.alerts_per_rx)}</td>
                    <td className="num">{num(s.interrupts_per_rx)}</td>
                    <td className="num">{pct(s.clean_fp_rate)}</td>
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
