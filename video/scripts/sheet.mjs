// usage: node scripts/sheet.mjs out.png frame...   (stills are out/qa/v2-<frame>.png) -> 2-column contact sheet via the headless browser
import { chromium } from 'playwright-core'
import fs from 'fs'
import os from 'os'
import path from 'path'
const [out, ...frames] = process.argv.slice(2)
const exe = path.join(os.homedir(), 'AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe')
const cols = 2
const cell = 960
const html = `<body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(${cols},${cell}px);gap:6px">${frames
  .map((f) => `<div style="position:relative"><img width="${cell}" src="data:image/${process.env.EXT ?? "png"};base64,${fs.readFileSync(`out/qa/${process.env.PFX ?? "v2-"}${f}.${process.env.EXT ?? "png"}`).toString('base64')}"><b style="position:absolute;left:8px;top:6px;color:#f0f;font:700 22px monospace">${f}</b></div>`)
  .join('')}</body>`
const b = await chromium.launch({ executablePath: exe })
const p = await b.newPage({ viewport: { width: cols * cell + 6, height: 600 } })
await p.setContent(html)
await p.waitForTimeout(300)
await p.screenshot({ path: out, fullPage: true })
await b.close()
