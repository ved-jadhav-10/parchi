import { chromium } from 'playwright-core'
import os from 'os'; import path from 'path'
const exe = path.join(os.homedir(), 'AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe')
const browser = await chromium.launch({ executablePath: exe })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
await page.goto('http://localhost:5174/#/check')
await page.waitForTimeout(800)
await page.getByRole('button', { name: 'Load demo' }).click()
await page.waitForTimeout(500)
await page.screenshot({ path: 'out/explore/check_loaded.png' })
await page.getByRole('button', { name: 'Check prescription' }).click()
await page.waitForTimeout(1500)
await page.screenshot({ path: 'out/explore/check_result.png', fullPage: true })
console.log(await page.evaluate(() => document.documentElement.scrollHeight))
const tree = await page.evaluate(() => {
  const out = []
  const walk = (el, d) => { if (d > 5) return; for (const c of el.children) { out.push('  '.repeat(d) + c.tagName.toLowerCase() + (c.className && typeof c.className === 'string' ? '.' + c.className.split(' ').join('.') : '')); walk(c, d + 1) } }
  walk(document.querySelector('main') ?? document.body, 0)
  return out.join('\n')
})
console.log(tree.slice(0, 6000))
await browser.close()
