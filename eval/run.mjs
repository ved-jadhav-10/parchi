// npm run eval: rebuild gold.json, run the engine over the gold set, then score every system in eval/outputs/ into public/data/benchmark.json.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const run = (cmd, args, env = {}) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env }, shell: process.platform === 'win32' && cmd === 'npx' })
  if (r.error || r.status !== 0) process.exit(r.status ?? 1)
}

run('node', ['eval/build_gold.mjs'])
run('npx', ['vitest', 'run', 'eval/engine.test.ts'], { EVAL_RUN: '1' })

const python = ['.venv/Scripts/python.exe', '.venv/bin/python'].find(existsSync) ?? (process.platform === 'win32' ? 'py' : 'python3')
run(python, ['eval/score.py'])
