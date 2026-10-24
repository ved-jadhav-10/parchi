import { chromium } from 'playwright-core'
import os from 'os'; import path from 'path'
const exe = path.join(os.homedir(), 'AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe')
const b = await chromium.launch({ executablePath: exe })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:5174/#/home'); await p.reload(); await p.waitForTimeout(1500)
console.log('h264', await p.evaluate(() => document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E"')))
console.log('section present', await p.locator('.home-trailer').count())
await p.screenshot({ path: 'out/qa/home-trailer.png', fullPage: false })
await p.evaluate(() => document.querySelector('.home-trailer')?.scrollIntoView())
await p.waitForTimeout(800)
await p.screenshot({ path: 'out/qa/home-trailer2.png' })
await b.close()
