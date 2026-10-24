import { chromium } from 'playwright-core'
import os from 'os'; import path from 'path'
const exe = path.join(os.homedir(), 'AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe')
const b = await chromium.launch({ executablePath: exe })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
await p.goto('http://localhost:5174/#/order/ORD-1087'); await p.reload(); await p.waitForTimeout(2500)
for (const t of ['X-ray', 'Prescriptions']) { await p.getByRole('tab', { name: new RegExp(t) }).click(); await p.waitForTimeout(600)
  console.log(t, 'coverage', await p.locator('text=/DDInter|interaction data/i').count(), 'leaflet', await p.locator('text=/leaflet/i').count()) }
await p.goto('http://localhost:5174/#/home'); await p.waitForTimeout(1500)
console.log('home sections', await p.locator('#compare').count(), await p.locator('#desk').count(), await p.locator('.home-trailer').count())
console.log('errors', errs.slice(0, 5))
await b.close()
