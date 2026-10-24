// Captures the real Parchi UI (dev server) as 2x textures + a layout.json of element boxes for the trailer.
// Run: start the app (`npm run dev -- --port 5174` in the repo root), then `npm run capture`.
// Data is the app's own sample account and demo case (fictional); nothing is typed that is not in the demo files.
import { chromium } from 'playwright-core'
import fs from 'fs'
import os from 'os'
import path from 'path'

const BASE = process.env.BASE ?? 'http://localhost:5174/'
const OUT = 'public/textures'
const exe = path.join(os.homedir(), 'AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe')
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: exe })
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
const layout = { pageW: 1920 }

const settle = async (ms = 700) => {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(ms)
}
const go = async (hash, ms) => {
  await page.goto(`${BASE}#/${hash}`)
  await page.reload()
  await settle(ms)
}
/** Box of the first match, page coordinates (the capture never scrolls, so page = viewport). */
const box = async (sel) => {
  const el = page.locator(sel).first()
  if (!(await el.count())) return null
  const b = await el.boundingBox()
  return b && { x: b.x, y: b.y, w: b.width, h: b.height }
}
const all = (sel) => page.locator(sel).evaluateAll((els) => els.map((e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y + scrollY, w: b.width, h: b.height } }))
const shot = async (name, { full = false, clip, boxes = {}, lists = {} } = {}) => {
  const entry = { pageH: await page.evaluate(() => document.documentElement.scrollHeight), boxes: {}, lists: {} }
  for (const [k, sel] of Object.entries(boxes)) entry.boxes[k] = await box(sel)
  for (const [k, sel] of Object.entries(lists)) entry.lists[k] = await all(sel)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full, clip })
  layout[name] = entry
  console.log('captured', name, entry.pageH)
}
const tab = async (name) => {
  const t = page.getByRole('tab', { name: new RegExp(name) })
  if (await t.count()) await t.first().click()
  else await page.getByRole('button', { name: new RegExp(name) }).first().click()
  await settle(600)
}

// ---- landing page ----
await go('home', 1500)
await shot('home-full', {
  full: true,
  boxes: { nav: '.home-nav', hero: '.home-hero', title: '#home-title', slip: '.home-slip', how: '#how', steps: '.home-how__grid', xray: '.home-how__foot', checks: '#checks', tiers: '.home-tiers', evidence: '#evidence', cta: '.home-cta', footer: '.home-footer' },
})

// the sample slip on its own, transparent, for the opening shot
await page.addStyleTag({ content: '.home-hero, .home-frame, .home-page, .home, body, html { background: transparent !important } .home-hero__art, .home-float { display: none !important }' })
await page.locator('.home-slip').screenshot({ path: `${OUT}/slip.png`, omitBackground: true })
console.log('captured slip')

// ---- check page: the typed prescription, then the result ----
const MEDS = ['Dolo 650 1-1-1 x5d', 'Crocin cold n flu max TDS', 'Zerodol P BD', 'Brufan 400 SOS', 'Ecosprin 75 OD', 'Pan D OD', 'Omez 20 OD']
await go('check', 1200)
const ta = page.locator('textarea.rx-input')
const checkBoxes = { header: 'header', intro: '.intro', rx: 'textarea.rx-input', rxCard: '.workspace__input .card', patient: '.workspace__input .card:nth-of-type(2)', button: '.actions .btn--primary', result: '.workspace__result' }
await shot('check-empty', { boxes: checkBoxes })
for (let k = 1; k <= MEDS.length; k++) {
  await ta.fill(MEDS.slice(0, k).join('; '))
  await page.waitForTimeout(150)
  await shot(`check-type-${k}`, { boxes: checkBoxes })
}
await page.locator('input.field__input').first().fill('68')
await page.locator('select.field__input').selectOption({ label: 'Male' }).catch(() => {})
await page.waitForTimeout(200)
await shot('check-ready', { boxes: checkBoxes })
await page.locator('.actions .btn--primary').click()
await settle(1500)
await shot('check-result', {
  full: true,
  boxes: { kpis: '.kpis', alert1: '.alerts .alert:nth-child(1)', alert2: '.alerts .alert:nth-child(2)', alerts: '.alerts', xray: '.xray', xrayCard: '.workspace__result section.card:nth-of-type(1)', matches: '.matches', rxCard: '.workspace__input .card', header: 'header' },
})
const xrayRows = await page.locator('.xray tbody tr').evaluateAll((rs) => rs.map((r) => { const b = r.getBoundingClientRect(); return { x: b.x, y: b.y + scrollY, w: b.width, h: b.height } }))
layout['check-result'].xrayRows = xrayRows
layout['check-result'].kpi = await page.locator('.kpi__value').allInnerTexts()

// ---- override dialog + log ----
await page.locator('.alerts .alert__action').first().click()
await settle(500)
await shot('override-dialog', { boxes: { dialog: 'dialog' } })
await page.locator('dialog input[value="Prescriber confirmed"]').check()
await page.waitForTimeout(300)
await shot('override-filled', { boxes: { dialog: 'dialog' } })
console.log('dialog buttons', await page.locator('dialog button').allInnerTexts())
await page.locator('dialog button[type=submit]').click()
await settle(800)

// ---- override log (now holds the override just made) ----
await go('log', 1200)
await shot('log', { boxes: { header: 'header', main: 'main' }, lists: { cards: 'main .card', row: 'main tbody tr' } })

// ---- demo walkthrough ----
await go('demo', 1200)
for (let i = 1; i <= 5; i++) {
  await shot(`demo-${i}`, { full: true, boxes: { card: '.card', main: 'main' } })
  if (i < 5) { await page.getByRole('button', { name: 'Next' }).click(); await settle(600) }
}

// ---- review queue + one order ----
await go('queue', 1200)
await shot('queue', { boxes: { header: 'header', kpis: '.kpis', main: 'main' }, lists: { cards: 'main .card', rows: 'main li' } })
await go('order/ORD-1087', 1500)
await shot('order-alerts', { full: true, boxes: { header: 'header', title: 'h1', tabs: '[role=tablist]', main: 'main' }, lists: { cards: 'main .card' } })
for (const t of ['Calendar', 'Timeline', 'X-ray', 'Prescriptions']) {
  await tab(t)
  await shot(`order-${t.toLowerCase().replace('-', '')}`, { full: true, boxes: { header: 'header', title: 'h1', tabs: '[role=tablist]', main: 'main' }, lists: { cards: 'main .card' } })
}

// ---- data and limits (top of a long page only) ----
await go('data', 1500)
await shot('data', { clip: { x: 0, y: 0, width: 1920, height: 1080 }, boxes: { header: 'header', main: 'main' }, lists: { cards: 'main .card', rows: 'main tbody tr' } })
await go('history', 1200)
await shot('history', { full: true, boxes: { header: 'header', main: 'main' } })
await browser.close()
fs.writeFileSync('src/layout.json', JSON.stringify(layout, null, 1))
