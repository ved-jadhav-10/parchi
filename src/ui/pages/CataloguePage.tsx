import { useRef, useState } from 'react'
import { confirmItem, importCatalogue, type CatalogueItem } from '../../engine/resolver/catalogue'
import { Card, KpiCard } from '../components/Card'
import { EmptyState, PageIntro } from '../components/PageIntro'
import { getDeps } from '../engine'
import { catalogueCsv, replaceItem, summarise, type CatalogueRecord } from '../lib/catalogueState'
import { downloadText } from '../lib/csv'
import { pct } from '../lib/format'
import { ingredientLabel } from '../lib/resolved'
import { clearCatalogue, saveCatalogue, useCatalogue } from '../storage/catalogue'

/** Rows of the review list shown at once; a long catalogue is worked through in pages. */
const PAGE = 25

const STATUS = { review: 'To review', unmatched: 'Not recognised', confirmed: 'Matched' } as const

const ReviewItem = ({ item, onConfirm }: { item: CatalogueItem; onConfirm: (i: CatalogueItem) => void }) => {
  const banned = (item.resolved.banned_fdc?.length ?? 0) > 0
  const proposed = item.resolved.proposed_composition
  const composition = item.resolved.ingredients.map(ingredientLabel).join(' + ')
  const canConfirm = !banned && (item.resolved.ingredients.length > 0 || !!proposed)
  return (
    <li className="catalogue__item" data-status={item.status}>
      <div className="catalogue__head">
        <strong>{item.name}</strong>
        <span className="chip chip--review">{STATUS[item.status]}</span>
        <span className="catalogue__row">Row {item.row}</span>
      </div>
      <ul className="catalogue__reasons">
        {item.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {composition && <p className="hint">Matched composition: {composition}.</p>}
      {!composition && proposed && (
        <p className="hint">
          Likely composition: {proposed.ingredients.map(ingredientLabel).join(' + ')} ({pct(proposed.confidence)}, unverified).{proposed.caution ? ` ${proposed.caution}.` : ''}
        </p>
      )}
      {banned ? (
        <p className="hint">Listed as a banned combination. Remove it from the catalogue rather than confirming it.</p>
      ) : canConfirm ? (
        <div className="actions">
          <button type="button" className="btn btn--secondary" onClick={() => onConfirm(item)}>
            Confirm this composition
            <span className="sr-only"> for {item.name}</span>
          </button>
        </div>
      ) : (
        <p className="hint">No composition to confirm. Correct the name, or add a composition column, and import again.</p>
      )}
    </li>
  )
}

/**
 * The buyer's product list: matched to ingredients on this device, with the rows that need a pharmacist listed first. A confirmed catalogue
 * is what "same composition in your own range" suggestions are drawn from. Nothing leaves the device.
 */
export const CataloguePage = () => {
  const { record, ready, error, setRecord } = useCatalogue()
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [shown, setShown] = useState(PAGE)
  const fileInput = useRef<HTMLInputElement>(null)

  const keep = async (next: CatalogueRecord) => {
    setRecord(next)
    try {
      await saveCatalogue(next)
      setProblem(null)
    } catch {
      setProblem('Could not save the catalogue on this device. It is shown for now and will be gone when the page closes.')
    }
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setProblem(null)
    try {
      const { resolver } = await getDeps()
      const imp = importCatalogue(await file.text(), resolver)
      if (imp.items.length === 0) {
        setProblem(imp.warnings[0] ?? 'No rows could be read from that file.')
        return
      }
      setShown(PAGE)
      await keep({ savedAt: new Date().toISOString(), fileName: file.name, columns: imp.columns as Record<string, string>, warnings: imp.warnings, items: imp.items })
    } catch {
      setProblem('Could not read that file. Use a CSV with a header row and a product-name column.')
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const confirm = (item: CatalogueItem) => {
    if (!record) return
    try {
      void keep({ ...record, items: replaceItem(record.items, confirmItem(item)) })
    } catch {
      setProblem(`Could not confirm ${item.name}: it has no composition.`)
    }
  }

  const remove = async () => {
    setRecord(null)
    try {
      await clearCatalogue()
    } catch {
      setProblem('Could not remove the saved catalogue from this device.')
    }
  }

  const s = record ? summarise(record.items) : null

  return (
    <>
      <PageIntro title="Catalogue" note="Your product list, matched to ingredients on this device. Nothing is uploaded." />
      <p className="sr-only" role="status">
        {busy ? 'Reading the catalogue.' : s ? `${s.rows} rows read, ${s.queue.length} to review.` : ''}
      </p>
      <div className="workspace workspace--single">
        <Card title="Import a catalogue" icon="download" description="A CSV exported from your billing or ERP system. It needs a product-name column; SKU, price, stock and composition columns are used when present.">
          <label className="field">
            <span className="field__label">CSV file</span>
            <input ref={fileInput} className="field__input" type="file" accept=".csv,.tsv,.txt,text/csv" onChange={(e) => void onFile(e.target.files?.[0])} disabled={busy} />
          </label>
          {busy && <p className="hint">Reading the catalogue…</p>}
          {error && <p className="hint">This browser cannot store data, so the catalogue will not be kept after you leave.</p>}
          {problem && (
            <p className="dialog__error" role="alert">
              {problem}
            </p>
          )}
        </Card>

        {ready && !record && (
          <EmptyState title="No catalogue yet">
            <p>Once imported, each row is matched to its ingredients. Rows the matcher is unsure about are listed for a pharmacist to confirm, and a confirmed catalogue lets Parchi suggest the same composition from your own range.</p>
            <p className="hint">Parchi never swaps a medicine. A suggestion is a prompt for the pharmacist to check the pack and decide.</p>
          </EmptyState>
        )}

        {record && s && (
          <>
            <div className="kpis">
              <KpiCard label="Rows" value={s.rows} hint={record.fileName} />
              <KpiCard label="Matched" value={s.matched} />
              <KpiCard label="To review" value={s.review} tier="inform" />
              <KpiCard label="Not recognised" value={s.unmatched} tier="inform" />
            </div>

            {record.warnings.length > 0 && (
              <details className="silent-log">
                <summary>{record.warnings.length} notes from the import</summary>
                <ul className="catalogue__reasons">
                  {record.warnings.slice(0, 50).map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </details>
            )}

            <Card title="To review" icon="shield" description="Most urgent first. A pharmacist confirms the composition against the pack before a row is used for suggestions.">
              {s.queue.length === 0 ? (
                <p className="hint">Every row is matched. This is not a statement that the catalogue is free of mistakes: the matches are the database's, and a confirmed row is the pharmacist's.</p>
              ) : (
                <>
                  <ol className="catalogue__list">
                    {s.queue.slice(0, shown).map((i) => (
                      <ReviewItem key={i.row} item={i} onConfirm={confirm} />
                    ))}
                  </ol>
                  {s.queue.length > shown && (
                    <div className="actions">
                      <button type="button" className="btn btn--secondary" onClick={() => setShown(shown + PAGE)}>
                        Show {Math.min(PAGE, s.queue.length - shown)} more ({s.queue.length - shown} left)
                      </button>
                    </div>
                  )}
                </>
              )}
            </Card>

            <Card title="Column mapping" description="Which header in your file was used for each field. Check it reads as you expect.">
              <dl className="catalogue__map">
                {Object.entries(record.columns).map(([field, header]) => (
                  <div key={field}>
                    <dt>{field}</dt>
                    <dd>{header}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            <div className="actions">
              <button type="button" className="btn btn--secondary" onClick={() => downloadText('catalogue-reviewed.csv', catalogueCsv(record.items), 'text/csv')}>
                Export the catalogue with its review status
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => void remove()}>
                Remove this catalogue from the device
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
