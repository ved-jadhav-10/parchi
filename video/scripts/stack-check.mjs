import { chromium } from 'playwright-core'
import os from 'os'; import path from 'path'
const exe = path.join(os.homedir(), 'AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe')
const b = await chromium.launch({ executablePath: exe })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:5174/#/home'); await p.reload(); await p.waitForTimeout(1200)
console.log('stack', await p.evaluate(() => document.querySelector('[data-stack]')?.dataset.stack))
const top = await p.evaluate(() => document.getElementById('compare').getBoundingClientRect().top + scrollY)
for (const [i, dy] of [[1, -200], [2, 300], [3, 700]].entries()) {
  await p.evaluate((y) => window.scrollTo(0, y), top + dy[1]); await p.waitForTimeout(500)
  await p.screenshot({ path: `out/qa/stack-${i}.png` })
}
console.log('docW', await p.evaluate(() => document.documentElement.scrollWidth))
await b.close()
