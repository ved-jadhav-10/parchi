// sample the page's video pixel vs the site's hero accent
import { chromium } from 'playwright-core'
import os from 'os'; import path from 'path'
const exe = path.join(os.homedir(), 'AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe')
const b = await chromium.launch({ executablePath: exe })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:5174/#/home'); await p.reload(); await p.waitForTimeout(1200)
await p.evaluate(() => { const v = document.querySelector('video'); v.currentTime = 1.5; })
await p.waitForTimeout(800)
console.log(await p.evaluate(() => {
  const v = document.querySelector('video'); const c = document.createElement('canvas'); c.width = 20; c.height = 20
  const x = c.getContext('2d'); x.drawImage(v, 20, 20, 40, 40, 0, 0, 20, 20)
  const d = x.getImageData(5, 5, 1, 1).data
  const hero = getComputedStyle(document.querySelector('.home-hero')).backgroundColor
  return { video: [...d].slice(0, 3), heroCss: hero }
}))
await b.close()
