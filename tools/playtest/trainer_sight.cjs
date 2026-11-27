#!/usr/bin/env node
// ENGINE regression for QA P0-1 (trainer sight soft-lock). For each far tile of
// Tiana's (row 39) and Calvin's (row 54) sight lines on `overworld`: step into the
// line, and while the player is still mid-step force an extra sight check (what a
// `look` NPC turning used to trigger). Expect exactly one battle, the trainer ending
// ADJACENT to the player, and the overworld unlocked afterwards.
//
//   node tools/playtest/trainer_sight.cjs [--no-build] [--dist DIR] [--port 5193]
'use strict'
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { chromium } = require('playwright')
const { serve, sleep } = require('./lib/game.cjs')

const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const ROOT = path.resolve(__dirname, '../..')
const DIST = path.resolve(arg('--dist', path.join(__dirname, 'out/dist')))
const PORT = Number(arg('--port', '5193'))

const CASES = [
  { id: 'rt_tiana', from: [20, 40] }, { id: 'rt_tiana', from: [21, 40] }, { id: 'rt_tiana', from: [22, 40] },
  { id: 'rt_calvin', from: [24, 55] }, { id: 'rt_calvin', from: [28, 55] }, { id: 'rt_calvin', from: [31, 55] },
]

async function runCase(browser, c) {
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`http://127.0.0.1:${PORT}/?debug=1&new=1&map=overworld&x=${c.from[0]}&y=${c.from[1]}`)
  await page.waitForFunction(() => window.__llmmon && window.__llmmon.info().scenes.includes('Overworld') && !window.__llmmon.info().busy, null, { timeout: 15000 })
  await page.evaluate(() => {
    const l = window.__llmmon
    l.setFlag('debug_no_encounters')
    l.state.party[0].level = 30
    l.heal()
    const ow = l.game.scene.getScene('Overworld')
    const orig = ow.startBattle.bind(ow)
    window.__battles = 0
    ow.startBattle = (r) => { window.__battles++; return orig(r) }
  })
  // step up into the sight line; mid-step, force the extra check a turning `look` NPC used to make
  await page.keyboard.down('ArrowUp')
  await page.waitForFunction(() => { const o = window.__llmmon.game.scene.getScene('Overworld'); return o.player.moving }, null, { timeout: 3000 })
  await page.keyboard.up('ArrowUp')
  await page.evaluate(() => window.__llmmon.game.scene.getScene('Overworld').checkTrainerSight())
  // mash A through dialogue + battle until the overworld is free again
  const t0 = Date.now()
  for (;;) {
    const s = await page.evaluate(() => window.__llmmon.info())
    if (Date.now() - t0 > 2000 && !s.busy && !s.scenes.includes('Battle')) break
    if (Date.now() - t0 > 90000) break
    await page.keyboard.press('z')
    await sleep(120)
  }
  const r = await page.evaluate((id) => {
    const o = window.__llmmon.game.scene.getScene('Overworld')
    const n = o.npcs.get(id)
    return { battles: window.__battles, lock: o.lockCount, busy: o.busy, player: [o.player.tx, o.player.ty], trainer: [n.tx, n.ty],
      defeated: Object.keys(window.__llmmon.state.flags).filter((k) => k.endsWith('_defeated')) }
  }, c.id)
  await page.close()
  const adjacent = Math.abs(r.player[0] - r.trainer[0]) + Math.abs(r.player[1] - r.trainer[1]) === 1
  const ok = r.battles === 1 && r.lock === 0 && !r.busy && adjacent && r.defeated.length === 1 && !errors.length
  return { ...c, ok, ...r, adjacent, errors }
}

;(async () => {
  if (!args.includes('--no-build') || !fs.existsSync(path.join(DIST, 'index.html'))) {
    execSync(`npx vite build --config tools/playtest/vite.playtest.config.mjs --outDir ${JSON.stringify(DIST)}`, { cwd: ROOT, stdio: 'inherit' })
  }
  const server = await serve(DIST, PORT)
  const browser = await chromium.launch()
  let fails = 0
  for (const c of CASES) {
    const r = await runCase(browser, c)
    if (!r.ok) fails++
    console.log(`${r.ok ? 'PASS' : 'FAIL'} ${c.id} from ${c.from}: battles=${r.battles} lock=${r.lock} player=${r.player} trainer=${r.trainer} adjacent=${r.adjacent}${r.errors.length ? ' errors=' + r.errors.join(' | ') : ''}`)
  }
  await browser.close()
  server.close()
  process.exit(fails ? 1 : 0)
})()
