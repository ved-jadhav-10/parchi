// One-off: screenshot every route at 1920x1080 to plan the trailer shots.
import { chromium } from 'playwright-core'
import os from 'os'
import path from 'path'
const exe = path.join(os.homedir(), 'AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe')
const BASE = 'http://localhost:5174/'
const browser = await chromium.launch({ executablePath: exe })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
const routes = ['home', 'check', 'demo', 'queue', 'order/ORD-1087', 'history', 'log', 'data', 'benchmark']
for (const r of routes) {
  await page.goto(`${BASE}#/${r}`)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(1200)
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  await page.screenshot({ path: `out/explore/${r.replace('/', '_')}.png`, fullPage: true })
  console.log(r, h)
}
await browser.close()
