import { chromium } from 'playwright-core'
import os from 'os'; import path from 'path'
const exe = path.join(os.homedir(), 'AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe')
const b = await chromium.launch({ executablePath: exe })
for (const w of [1440, 768, 390]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 })
  await p.goto('http://localhost:5174/#/home'); await p.reload(); await p.waitForTimeout(1200)
  const fig = p.locator('.home-compare')
  await fig.scrollIntoViewIfNeeded(); await p.waitForTimeout(500)
  await fig.screenshot({ path: `out/qa/compare-${w}-50.png` })
  const st = await p.locator('.home-compare__stage').boundingBox()
  await p.mouse.move(st.x + st.width * 0.5, st.y + st.height / 2); await p.mouse.down()
  await p.mouse.move(st.x + st.width * 0.12, st.y + st.height / 2, { steps: 5 }); await p.mouse.up()
  await p.waitForTimeout(200)
  await fig.screenshot({ path: `out/qa/compare-${w}-drag.png` })
  console.log(w, 'stage', Math.round(st.width), 'x', Math.round(st.height), 'docW', await p.evaluate(() => document.documentElement.scrollWidth))
  await p.close()
}
// keyboard
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:5174/#/home'); await p.reload(); await p.waitForTimeout(1000)
await p.locator('.home-compare__range').focus(); for (let i = 0; i < 10; i++) await p.keyboard.press('ArrowRight')
console.log('after 10x ArrowRight', await p.locator('.home-compare__range').inputValue())
await b.close()
