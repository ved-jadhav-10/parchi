// Phase 2, Track A: the buyer's catalogue (CSV) -> canonical ingredient ids, a ranked review list for the
// lines the resolver is not sure about, and "same composition in your own catalogue" alternatives.
// Deterministic and offline. Output informs a pharmacist; nothing here decides or substitutes anything.
import type { Ingredient, ProposedComposition, ResolvedBrand } from '../contracts'
import { parseName } from './normalize'
import { signature, type Resolver } from './index'

export type CatalogueStatus = 'confirmed' | 'review' | 'unmatched'

export interface CatalogueItem {
  /** 1-based data row in the CSV (header is row 0), so the buyer can find it. */
  row: number
  sku?: string
  name: string
  price?: number
  /** undefined = the CSV has no stock column. */
  in_stock?: boolean
  status: CatalogueStatus
  /** Composition used downstream: the database's for a match; empty for `unmatched` (see `resolved.proposed_composition`). */
  resolved: ResolvedBrand
  /** Why a pharmacist should look. Empty when `confirmed`. */
  reasons: string[]
  /** Lower = look first: banned FDC 0, composition disagrees 1, not recognised 2, look-alike 3, other doubt 4, minor 5. */
  priority: number
  /** true once a pharmacist confirmed it with `confirmItem`. */
  pharmacist_confirmed?: boolean
}

export interface CatalogueImport {
  items: CatalogueItem[]
  /** Items needing a look, most urgent first. */
  review: CatalogueItem[]
  stats: { rows: number; confirmed: number; review: number; unmatched: number; skipped: number }
  /** Which CSV header was used for each field, so the buyer can check the mapping. */
  columns: Partial<Record<Field, string>>
  warnings: string[]
}

export interface Alternative {
  item: CatalogueItem
  /** alternative price minus the reference price; negative = cheaper. Only when both are known. */
  price_diff?: number
  /** Things to check on the pack, e.g. a different release type. */
  cautions: string[]
}

export interface Catalogue {
  items: CatalogueItem[]
  /** Catalogue entry whose name matches `raw` exactly (case, spacing and pack size ignored). */
  lookup(raw: string): CatalogueItem | undefined
  /** Other in-stock entries with the same ingredients, strengths and form, cheapest first. Never uses unconfirmed compositions. */
  alternatives(resolved: ResolvedBrand, opts?: { referencePrice?: number; limit?: number }): Alternative[]
}

type Field = 'name' | 'sku' | 'strength' | 'form' | 'composition' | 'price' | 'stock'

const HEADERS: Record<Field, string[]> = {
  name: ['name', 'product', 'productname', 'item', 'itemname', 'brand', 'brandname', 'medicine', 'medicinename', 'drug', 'description'],
  sku: ['sku', 'skuid', 'code', 'itemcode', 'productcode', 'barcode', 'id'],
  strength: ['strength', 'potency', 'dose'],
  form: ['form', 'dosageform', 'type', 'packform'],
  composition: ['composition', 'salt', 'salts', 'saltcomposition', 'generic', 'genericname', 'content', 'contents', 'ingredients', 'molecule'],
  price: ['mrp', 'price', 'rate', 'ptr', 'sellingprice'],
  stock: ['stock', 'qty', 'quantity', 'instock', 'available', 'inventory'],
}

/** Release types that change how a medicine behaves although the mg are the same. */
const RELEASE = new Set(['sr', 'cr', 'er', 'xr', 'xl', 'mr', 'pr', 'retard', 'la', 'dt', 'gr'])

// ---- CSV -------------------------------------------------------------------------------

/** RFC 4180-style parser: quoted fields, doubled quotes, newlines inside quotes, BOM. Delimiter is , ; or tab. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '')
  const first = src.split(/\r?\n/, 1)[0] ?? ''
  const delim = [',', ';', '\t'].map((d) => [d, first.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0]
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === delim) { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((x) => x.trim())) rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x.trim())) rows.push(row)
  return rows
}

const compactHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '')

function mapColumns(header: string[]): Partial<Record<Field, number>> {
  const out: Partial<Record<Field, number>> = {}
  header.forEach((h, i) => {
    const k = compactHeader(h)
    for (const f of Object.keys(HEADERS) as Field[]) {
      if (out[f] === undefined && HEADERS[f].includes(k)) out[f] = i
    }
  })
  return out
}

// ---- cleaning --------------------------------------------------------------------------

/** "DOLO 650MG TABLET 15's" -> "DOLO 650MG TABLET". Pack sizes are not part of the product identity. */
function cleanName(name: string): string {
  return name
    .replace(/\b(?:strip|bottle|box|pack|vial|tube|packet)\s+of\s+\d+\b/gi, ' ')
    .replace(/\b\d+\s*['’`]?\s*s\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formHintOf(text: string): string | undefined {
  return parseName(`zz ${text}`).formHint
}

/** "Rs. 1,250.50" -> 1250.5 */
function parseMoney(s: string | undefined): number | undefined {
  if (!s) return undefined
  const n = parseFloat(s.replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : undefined
}

function parseStock(s: string | undefined): boolean | undefined {
  const t = s?.trim().toLowerCase()
  if (!t) return undefined
  if (/^(y|yes|true|in stock|available|instock)$/.test(t)) return true
  if (/^(n|no|false|out of stock|oos|unavailable|outofstock)$/.test(t)) return false
  const n = parseFloat(t)
  return Number.isFinite(n) ? n > 0 : undefined
}

/** Composition columns write "A 500mg, B 5mg", "A / B" or "A and B"; the resolver reads "A 500 + B 5". */
function normaliseComposition(text: string): string {
  return text
    .replace(/\s*[;,]\s*/g, ' + ')
    .replace(/\s+\/\s+/g, ' + ')
    .replace(/\s+(?:and|&)\s+/gi, ' + ')
}

const nameKey = (s: string) => parseName(cleanName(s)).tokens.join(' ') + '|' + parseName(cleanName(s)).numbers.join(',')

// ---- import ----------------------------------------------------------------------------

function ingredientSet(ings: Ingredient[]): string {
  return [...new Set(ings.map((i) => i.id))].sort().join('+')
}

function describeIngs(r: Resolver, ings: Ingredient[]): string {
  return ings.map((i) => `${r.ingredient(i.id)?.name ?? i.id}${i.mg ? ` ${i.mg} mg` : ''}`).join(' + ')
}

export function importCatalogue(csvText: string, resolver: Resolver): CatalogueImport {
  const rows = parseCsv(csvText)
  const warnings: string[] = []
  const empty: CatalogueImport = { items: [], review: [], stats: { rows: 0, confirmed: 0, review: 0, unmatched: 0, skipped: 0 }, columns: {}, warnings }
  if (rows.length < 2) { warnings.push('The file has no data rows.'); return empty }
  const header = rows[0]
  const col = mapColumns(header)
  if (col.name === undefined) {
    warnings.push(`No product-name column found. Expected a header such as: ${HEADERS.name.slice(0, 5).join(', ')}.`)
    return empty
  }
  const columns: CatalogueImport['columns'] = {}
  for (const f of Object.keys(col) as Field[]) columns[f] = header[col[f]!].trim()

  const cell = (r: string[], f: Field) => (col[f] === undefined ? undefined : r[col[f]!]?.trim() || undefined)
  const items: CatalogueItem[] = []
  const seenSku = new Set<string>()
  let skipped = 0

  rows.slice(1).forEach((r, idx) => {
    const row = idx + 1
    let name = cell(r, 'name')
    if (!name) { skipped++; warnings.push(`Row ${row}: no product name; skipped.`); return }
    const sku = cell(r, 'sku')
    if (sku) {
      if (seenSku.has(sku)) warnings.push(`Row ${row}: SKU ${sku} appears more than once.`)
      seenSku.add(sku)
    }

    // "Name (Paracetamol 500 mg)": a parenthesised composition, used when it reads as ingredients and no column gives one.
    let compText = cell(r, 'composition')
    const paren = /\(([^)]*)\)/.exec(name)
    if (paren && !compText && resolver.proposeFromComposition(normaliseComposition(paren[1]))) {
      compText = paren[1]
      name = name.replace(paren[0], ' ')
    }
    name = cleanName(name)

    const strength = cell(r, 'strength')
    const form = cell(r, 'form')
    let query = name
    if (strength && !/\d/.test(query)) query += ` ${strength}`
    if (form && formHintOf(form) && !formHintOf(query)) query += ` ${form}`

    items.push(classify(resolver, { row, sku, name: cell(r, 'name')!, query, compText, price: parseMoney(cell(r, 'price')), in_stock: parseStock(cell(r, 'stock')) }))
  })

  const review = items.filter((i) => i.status !== 'confirmed').sort((a, b) => a.priority - b.priority || a.row - b.row)
  return {
    items,
    review,
    stats: {
      rows: items.length + skipped,
      confirmed: items.filter((i) => i.status === 'confirmed').length,
      review: items.filter((i) => i.status === 'review').length,
      unmatched: items.filter((i) => i.status === 'unmatched').length,
      skipped,
    },
    columns,
    warnings,
  }
}

interface Raw { row: number; sku?: string; name: string; query: string; compText?: string; price?: number; in_stock?: boolean }

function classify(resolver: Resolver, raw: Raw): CatalogueItem {
  const resolved = resolver.resolve(raw.query)
  const base = { row: raw.row, name: raw.name, ...(raw.sku ? { sku: raw.sku } : {}), ...(raw.price !== undefined ? { price: raw.price } : {}), ...(raw.in_stock !== undefined ? { in_stock: raw.in_stock } : {}) }
  const buyer: ProposedComposition | null = raw.compText ? resolver.proposeFromComposition(normaliseComposition(raw.compText)) : null
  const reasons: string[] = []

  // Not recognised: only a proposal exists. The buyer's own composition text beats a name-based guess.
  if (resolved.match === 'none' || !resolved.brand) {
    const proposal = buyer ?? resolved.proposed_composition
    const out: ResolvedBrand = { ...resolved }
    if (proposal) out.proposed_composition = proposal
    reasons.push(
      proposal
        ? `Not in the brand database. Proposed ${describeIngs(resolver, proposal.ingredients)} (${proposal.basis === 'buyer_composition_text' ? 'from the catalogue composition column' : `closest name ${proposal.brand}`}), unverified.`
        : 'Not in the brand database and no composition given; identify the medicine.',
    )
    if (proposal?.caution) reasons.push(proposal.caution)
    return { ...base, status: 'unmatched', resolved: out, reasons, priority: 2 }
  }

  let priority = 5
  const bump = (p: number) => { priority = Math.min(priority, p) }

  if (resolved.flags.includes('banned_fdc')) {
    reasons.push(`Matches a banned fixed-dose combination (${resolved.banned_fdc?.map((b) => b.so).join(', ')}).`)
    bump(0)
  }
  if (buyer) {
    const same = ingredientSet(buyer.ingredients) === ingredientSet(resolved.ingredients)
    if (!same) {
      reasons.push(`Catalogue composition (${describeIngs(resolver, buyer.ingredients)}) differs from the database (${describeIngs(resolver, resolved.ingredients)}).`)
      bump(1)
    } else if (buyer.ingredients.some((b) => b.mg && resolved.ingredients.some((i) => i.id === b.id && i.mg && Math.abs(i.mg - b.mg) > 0.005 * i.mg))) {
      reasons.push(`Catalogue strengths (${describeIngs(resolver, buyer.ingredients)}) differ from the database (${describeIngs(resolver, resolved.ingredients)}).`)
      bump(1)
    }
  }
  if (resolved.flags.includes('lasa')) bump(3)
  if (resolved.needs_pharmacist || resolved.confidence < 0.9 || resolved.match === 'fuzzy') {
    reasons.push(...(resolved.notes ?? []))
    if (!resolved.notes?.length) reasons.push(`Matched ${resolved.brand} with ${Math.round(resolved.confidence * 100)}% confidence.`)
    bump(4)
  }
  if (resolved.composition_complete === false) {
    reasons.push('Source lists at most two ingredients for this product; check the strip for more.')
  }

  const blocking = reasons.length > 0
  // Notes that are not reasons to doubt the match (discontinued) ride along without blocking.
  if (!blocking && resolved.flags.includes('discontinued')) reasons.push(...(resolved.notes ?? []))
  const status: CatalogueStatus = blocking ? 'review' : 'confirmed'
  return { ...base, status, resolved, reasons: [...new Set(reasons)], priority: blocking ? priority : 5 }
}

/**
 * A pharmacist confirmed the item (optionally correcting the composition). Returns a new item; the original is untouched.
 * `ingredients` replaces the composition and clears the "incomplete" doubt, so it must be what the strip says.
 */
export function confirmItem(item: CatalogueItem, ingredients?: Ingredient[]): CatalogueItem {
  const resolved: ResolvedBrand = { ...item.resolved }
  if (ingredients) {
    resolved.ingredients = ingredients.map((i) => ({ ...i }))
    resolved.composition_complete = true
  } else if (item.status === 'unmatched' && item.resolved.proposed_composition) {
    resolved.ingredients = item.resolved.proposed_composition.ingredients.map((i) => ({ ...i }))
    const p = item.resolved.proposed_composition
    resolved.form = p.form
    if (p.route) resolved.route = p.route
    if (p.systemic !== undefined) resolved.systemic = p.systemic
    resolved.composition_complete = true
  }
  if (!resolved.ingredients.length) throw new Error('Nothing to confirm: no composition. Pass the ingredients from the strip.')
  delete resolved.proposed_composition
  delete resolved.needs_pharmacist
  resolved.match = 'curated'
  resolved.confidence = 1
  return { ...item, status: 'confirmed', resolved, reasons: [], priority: 5, pharmacist_confirmed: true }
}

// ---- lookup and alternatives -------------------------------------------------------------

function releaseOf(name: string): string {
  return parseName(cleanName(name)).tokens.filter((t) => RELEASE.has(t)).sort().join(',')
}

export function createCatalogue(items: CatalogueItem[]): Catalogue {
  const byName = new Map<string, CatalogueItem>()
  const byComposition = new Map<string, CatalogueItem[]>()
  for (const it of items) {
    if (it.status !== 'confirmed') continue
    byName.set(nameKey(it.name), it)
    if (it.resolved.composition_complete === false || !it.resolved.ingredients.length) continue
    const key = `${signature(it.resolved.ingredients)}#${it.resolved.form}#${it.resolved.route ?? ''}`
    const list = byComposition.get(key)
    if (list) list.push(it)
    else byComposition.set(key, [it])
  }
  return {
    items,
    lookup(raw) {
      return byName.get(nameKey(raw)) ?? items.find((i) => nameKey(i.name) === nameKey(raw))
    },
    alternatives(resolved, opts = {}) {
      if (!resolved.ingredients.length || resolved.composition_complete === false) return []
      const key = `${signature(resolved.ingredients)}#${resolved.form}#${resolved.route ?? ''}`
      const own = resolved.brand ? nameKey(resolved.brand) : ''
      const ownRelease = resolved.brand ? releaseOf(resolved.brand) : ''
      return (byComposition.get(key) ?? [])
        .filter((it) => it.in_stock !== false && !it.resolved.flags.includes('discontinued') && !it.resolved.flags.includes('banned_fdc') && nameKey(it.name) !== own)
        .map((item): Alternative => {
          const cautions: string[] = []
          if (resolved.brand && releaseOf(item.name) !== ownRelease) cautions.push('Release type may differ (SR/ER or plain); check the pack.')
          if (item.resolved.flags.includes('nsq')) cautions.push('Brand has failed batches in CDSCO lists; check the batch number.')
          const diff = item.price !== undefined && opts.referencePrice !== undefined ? Math.round((item.price - opts.referencePrice) * 100) / 100 : undefined
          return { item, ...(diff !== undefined ? { price_diff: diff } : {}), cautions }
        })
        .sort(
          (a, b) =>
            Number(b.item.in_stock === true) - Number(a.item.in_stock === true) ||
            a.cautions.length - b.cautions.length ||
            (a.item.price ?? Infinity) - (b.item.price ?? Infinity) ||
            a.item.name.localeCompare(b.item.name),
        )
        .slice(0, opts.limit ?? 5)
    },
  }
}
