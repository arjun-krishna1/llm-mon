#!/usr/bin/env node
// Round-3 feature tests: name entry, nickname, options, touch (device emulation), PromptDex,
// Model Storage, rival arc per starter (win / loss + rematch / fountain), SoMa city walk,
// end card, cries + new sfx wiring. Uses debug hooks for setup only.
//
//   node tools/playtest/tests3.cjs [--only a,b] [--dist DIR] [--port N] [--seed N]
'use strict'
const fs = require('fs')
const path = require('path')
const { chromium, devices } = require('playwright')
const { Game, serve, sleep, PROBE } = require('./lib/game.cjs')
const menu = require('./segments/menu.cjs')

const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const DIST = path.resolve(arg('--dist', path.join(__dirname, 'out/dist3')))
const PORT = Number(arg('--port', '5210'))
const OUT = path.resolve(arg('--out', path.join(__dirname, 'out/tests3')))
const SEED = Number(arg('--seed', '11'))
const ONLY = arg('--only', null)
const results = []
let browser

const PRE_RESCUE = { arrived: true, visited_2f: true, read_notebook: true, mom_lab_call: true, met_rival: true, met_aide: true, has_satchel: true }
const POST = (starter) => ({ ...PRE_RESCUE, has_satchel: false, starter, rescue_done: true, got_dex: true, has_run: true })
const COUNTER = { glm: 'claude_fable', claude_fable: 'gpt_5_5', gpt_5_5: 'glm' }
const TYPE = { glm: 'logic', claude_fable: 'myth', gpt_5_5: 'tool' }
const BEATS = { myth: 'logic', logic: 'tool', tool: 'myth' } // a beats BEATS[a]

function record(name, ok, detail, extra = {}) {
  results.push({ name, ok, detail, ...extra })
  console.log(`${ok === true ? 'PASS' : ok === false ? 'FAIL' : 'INFO'} [${name}] ${detail}`)
}
const noise = (e) => /GL Driver|GPU stall/.test(e.s)
const audioLog = (g) => g.page.evaluate(() => (window.__audioLog || []).splice(0))

async function setup(name, o = {}) {
  const dir = path.join(OUT, name)
  fs.mkdirSync(dir, { recursive: true })
  const q = new URLSearchParams({ map: o.map || 'overworld', new: '1' })
  if (o.spawn) q.set('spawn', o.spawn)
  if (o.x != null) { q.set('x', o.x); q.set('y', o.y) }
  const g = await Game.launch({ browser, port: PORT, outDir: dir, quick: true, seed: o.seed ?? SEED, query: q.toString(), viewport: o.viewport, dist: DIST, smart: !!o.smart })
  await g.page.waitForFunction(() => { const s = window.__ptSnap(); return s && s.info.scenes.includes('Overworld') && !s.info.busy }, null, { timeout: 20000 })
  await g.page.evaluate((o) => {
    const L = window.__llmmon
    for (const [k, v] of Object.entries(o.flags || {})) L.setFlag(k, v)
    if (o.party) {
      L.state.party.length = 0
      for (const [id, lv, mut] of o.party) { const m = L.giveMon(id, lv); if (mut) Object.assign(m, mut) }
    }
    if (o.box) for (const [id, lv] of o.box) { const m = L.giveMon(id, lv); L.state.party.pop(); L.state.box = L.state.box || []; L.state.box.push(m) }
    for (const [k, v] of Object.entries(o.items || {})) L.giveItem(k, v)
    if (o.money != null) L.state.money = o.money
    for (const id of o.seen || []) L.state.markSeen(id)
    for (const id of o.caught || []) { L.state.markSeen(id); L.state.markCaught(id) }
  }, o)
  if (o.rewarp !== false) await g.page.evaluate(([m, s, x, y]) => (x != null ? window.__llmmon.warp(m, x, y) : window.__llmmon.warp(m, s || 'start')), [o.map || 'overworld', o.spawn, o.x, o.y])
  await sleep(700)
  await g.waitIdle()
  await audioLog(g)
  return g
}

async function waitTop(g, pred, timeout = 8000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    const s = await g.snap()
    const top = s.ui && s.ui.top
    if (top && pred(top, s)) return s
    await sleep(40)
  }
  throw new Error('waitTop timeout; top=' + JSON.stringify((await g.snap()).ui.top))
}
const topCls = (g) => g.snap().then((s) => s.ui && s.ui.top && s.ui.top.cls)
const neField = (g) => g.page.evaluate(() => { const ui = window.__llmmon.game.scene.getScene('UI'); const w = ui.stack.list[ui.stack.list.length - 1]; return w && w.name !== undefined ? { name: w.name, cx: w.cx, cy: w.cy, lower: w.lower } : null })

/** Type `text` on the NameEntryScreen at the top of the UI stack with arrows + A. */
async function typeName(g, text, scene = 'UI') {
  const UP = ['ABCDEFGHI', 'JKLMNOPQR', 'STUVWXYZ.']
  const st = () => g.page.evaluate((sc) => { const s = window.__llmmon.game.scene.getScene(sc); const w = s.stack.list[s.stack.list.length - 1]; return { name: w.name, cx: w.cx, cy: w.cy, lower: w.lower } }, scene)
  for (const ch of text) {
    let r = UP.findIndex((row) => row.includes(ch.toUpperCase()))
    const c = UP[r].indexOf(ch.toUpperCase())
    const wantLower = ch !== ch.toUpperCase()
    let s = await st()
    if (s.lower !== wantLower) { // go to the case command (row 3, index 0)
      while ((await st()).cy !== 3) { await g.press('down'); await sleep(40) }
      while ((await st()).cx !== 0) { await g.press('left'); await sleep(40) }
      await g.press('A'); await sleep(60)
    }
    for (let k = 0; k < 12 && (await st()).cy !== r; k++) { await g.press((await st()).cy < r ? 'down' : 'up'); await sleep(40) }
    for (let k = 0; k < 12 && (await st()).cx !== c; k++) { await g.press((await st()).cx < c ? 'right' : 'left'); await sleep(40) }
    await g.press('A'); await sleep(70)
  }
  return (await st()).name
}

// ============================================================================ tests
const T = {}

T.nameentry = async () => {
  const dir = path.join(OUT, 'nameentry'); fs.mkdirSync(dir, { recursive: true })
  const g = await Game.launch({ browser, port: PORT, outDir: dir, quick: true, seed: SEED, query: 'new=1', dist: DIST })
  await g.page.waitForFunction(() => window.__ptSnap() && window.__ptSnap().title === 'press', null, { timeout: 20000 })
  await g.press('A'); await sleep(600)
  let s = await g.snap()
  const tl = s.ui.top && s.ui.top.labels
  await g.shot('title_menu', 'Title menu (options?)')
  await g.pick(tl.indexOf('NEW GAME'), 'UI')
  await g.drive((x) => !!(x.ui.top && x.ui.top.cls === 'NameEntryScreen'), {})
  await sleep(500)
  await g.shot('name_entry_initial', 'Name entry opens')
  const init = (await neField(g)).name
  // B deletes everything
  for (let i = 0; i < 12; i++) { await g.press('B'); await sleep(50) }
  const empty = (await neField(g)).name
  await g.shot('name_entry_empty', 'Name cleared with B (empty + OK would fall back to the default)')
  const typed = await typeName(g, 'Zoe.Qx')
  await g.press('B'); await sleep(80) // delete the x
  await g.shot('name_entry_typed', 'Typed a custom name')
  await g.press('START'); await sleep(200)
  await g.shot('name_entry_ok', 'START jumps to OK')
  await g.press('A'); await sleep(700)
  const name = await g.page.evaluate(() => window.__llmmon.state.playerName)
  await g.drive((x) => /Zoe/.test(x.ui.text || '') && x.ui.dlg === 'waiting', {}, 40000).catch(() => {})
  await g.shot('name_used', 'Name used in dialogue')
  record('name_entry', name === 'Zoe.Q', `initial "${init}", after B×12 "${empty}"; typed "${typed}" → B → final "${name}"; line: ${(await g.snap()).ui.text.slice(0, 60)}. (Empty + OK falls back to the default name — by design.)`)
  await g.close()
}

T.nickname = async () => {
  const g = await setup('nickname', { spawn: 'route_mouth', flags: POST('glm'), party: [['glm', 9], ['gemma_4', 4]], items: { prompt_orb: 15 } })
  g.handlers = { planBattle: () => 'catch', nickname: 'Hallucinat', battle: async (s) => { if (s.battle.phase === 'nickname' && !g._nk) { g._nk = 1; await sleep(300); await g.shot('nickname_screen', 'Nickname entry') } if (s.battle.phase === 'nickname-yesno' && !g._ny) { g._ny = 1; await g.shot('nickname_yesno', 'Give a nickname?') } return false } }
  const m = g.map('overworld')
  for (let k = 0; k < 120 && !g.encounters.some((e) => e.outcome === 'catch'); k++) await g.walkTo({ x: 17 + (k % 2) * 8, y: 71 - (k % 3) }, { grassCost: 0 })
  const s = await g.waitIdle()
  const p = s.party[s.party.length - 1]
  const nick = await g.page.evaluate(() => { const L = window.__llmmon.state; return L.party.map((m) => m.nickname || null) })
  // show it in the party screen + summary
  await menu.openStart(g)
  let st = await g.snap()
  await g.pick(st.ui.top.labels.indexOf('LLMMON'), 'UI')
  await waitTop(g, (t) => t.cls === 'PartyScreen'); await sleep(600)
  await g.shot('nickname_party', 'Nickname in party')
  for (let i = 0; i < s.party.length - 1; i++) { await g.press('down'); await sleep(80) }
  await g.press('A'); await waitTop(g, (t) => t.cls === 'ListMenu' && t.labels.includes('SUMMARY')); await g.pick(0, 'UI')
  await waitTop(g, (t) => t.cls === 'SummaryScreen'); await sleep(700)
  await g.shot('nickname_summary', 'Nickname in summary')
  await g.press('B'); await sleep(500); await g.press('B'); await sleep(500); await g.press('B'); await g.waitIdle()
  record('nickname_10', nick.includes('HALLUCINAT') || nick.some((n) => n && n.length === 10), `party nicknames ${JSON.stringify(nick)}; caught ${p.id}`)
  // battle display: next encounter sends out lead; put nicknamed mon first? just look at a wild battle with it as lead
  await g.close()
}

T.options = async () => {
  // text speed: set via the stored option + reload (the screen itself is checked below), time one sign page
  const res = {}
  for (const sp of ['slow', 'mid', 'fast']) {
    const g = await setup('options_' + sp, { spawn: 'home_door', flags: PRE_RESCUE, party: [] })
    await g.page.evaluate((sp) => localStorage.setItem('llmmon_mythos_options_v1', JSON.stringify({ textSpeed: sp, music: 8, sfx: 8 })), sp)
    await g.goto('map=overworld&spawn=home_door')
    await g.page.waitForFunction(() => { const s = window.__ptSnap(); return s && s.info.scenes.includes('Overworld') && !s.info.busy }, null, { timeout: 20000 })
    await sleep(600)
    let t1 = 0
    await g.approach(14, 98, { faces: ['up'] })
    const t0 = Date.now()
    await g.interact({ onText: async () => { if (!t1) t1 = Date.now() } })
    res[sp] = t1 - t0
    await g.close()
  }
  record('options_text_speed', res.slow > res.mid && res.mid > res.fast, `mailbox first page typed in ms: ${JSON.stringify(res)}`)
  // options screen from the start menu: change music + sfx, reload, check persistence
  const g = await setup('options_screen', { spawn: 'home_door', flags: PRE_RESCUE, party: [] })
  await menu.openStart(g)
  let s = await g.snap()
  const labels = s.ui.top.labels
  await g.pick(labels.indexOf('OPTIONS'), 'UI'); await sleep(800)
  await g.shot('options_screen', 'Options screen')
  const cls = await topCls(g)
  await g.press('down'); await sleep(100); for (let i = 0; i < 5; i++) { await g.press('left'); await sleep(90) }
  await g.press('down'); await sleep(100); for (let i = 0; i < 2; i++) { await g.press('left'); await sleep(90) }
  await g.shot('options_changed', 'Options after changes')
  const before = await g.page.evaluate(() => JSON.parse(localStorage.getItem('llmmon_mythos_options_v1') || 'null'))
  await g.press('B'); await sleep(600)
  await g.goto('')
  await g.page.waitForFunction(() => window.__ptSnap() && window.__ptSnap().title === 'press', null, { timeout: 20000 })
  const after = await g.page.evaluate(() => JSON.parse(localStorage.getItem('llmmon_mythos_options_v1') || 'null'))
  await g.press('A'); await sleep(600)
  const tl = (await g.snap()).ui.top.labels
  if (tl.includes('OPTIONS')) { await g.pick(tl.indexOf('OPTIONS'), 'UI'); await sleep(800); await g.shot('options_from_title', 'Options from the title') }
  record('options_persist', !!before && JSON.stringify(before) === JSON.stringify(after) && before.music === 3 && before.sfx === 6, `start menu ${JSON.stringify(labels)}; screen ${cls}; saved ${JSON.stringify(before)} → after reload ${JSON.stringify(after)}; title menu ${JSON.stringify(tl)}`)
  await g.close()
}

T.battletextspeed = async () => {
  // battle text uses the option too? time "A wild X appeared!" typing at slow vs fast
  const out = {}
  for (const sp of ['slow', 'fast']) {
    const g = await setup('bts_' + sp, { spawn: 'route_mouth', flags: POST('glm'), party: [['glm', 9]] })
    await g.page.evaluate((sp) => { localStorage.setItem('llmmon_mythos_options_v1', JSON.stringify({ textSpeed: sp, music: 8, sfx: 8 })) }, sp)
    await g.goto('map=overworld&spawn=route_mouth') // options load at boot (keeps state? debug boot resets) – re-setup flags
    await g.page.waitForFunction(() => { const s = window.__ptSnap(); return s && s.info.scenes.includes('Overworld') && !s.info.busy }, null, { timeout: 20000 })
    await g.page.evaluate(() => { const L = window.__llmmon; for (const k of ['arrived', 'rescue_done', 'got_dex', 'has_run', 'mom_lab_call']) L.setFlag(k, true); L.setFlag('starter', 'glm') })
    let t0 = 0; let t1 = 0
    g.handlers = { planBattle: () => 'run', battle: async (s) => { if (!t0 && s.battle.box === 'typing') t0 = Date.now(); if (t0 && !t1 && s.battle.box === 'waiting') t1 = Date.now(); return false } }
    for (let k = 0; k < 80 && !g.encounters.length; k++) await g.walkTo({ x: 17 + (k % 2) * 8, y: 71 }, { grassCost: 0 })
    out[sp] = t1 - t0
    await g.close()
  }
  record('options_battle_text_speed', out.slow > out.fast * 1.5, `first battle line typing ms: ${JSON.stringify(out)}`)
}

T.touch = async () => {
  const cases = [
    ['iPhone13_portrait', devices['iPhone 13']],
    ['iPhone13_landscape', devices['iPhone 13 landscape']],
    ['GalaxyS5_portrait', devices['Galaxy S5']],
    ['desktop_touch1', null],
  ]
  for (const [name, dev] of cases) {
    const dir = path.join(OUT, 'touch_' + name); fs.mkdirSync(dir, { recursive: true })
    const ctx = await browser.newContext(dev ? { ...dev } : { viewport: { width: 1280, height: 800 } })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.addInitScript(PROBE)
    await page.goto(`http://127.0.0.1:${PORT}/?debug=1&new=1&seed=${SEED}${dev ? '' : '&touch=1'}`)
    await page.waitForFunction(() => window.__ptSnap && window.__ptSnap() && window.__ptSnap().title === 'press', null, { timeout: 20000 })
    await sleep(800)
    const lay = await page.evaluate(() => {
      const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } }
      const c = document.querySelector('canvas')
      return { vw: innerWidth, vh: innerHeight, canvas: r(c), dpad: r(document.querySelector('#touch .dpad')), a: r(document.querySelector('#touch .btn.a')), b: r(document.querySelector('#touch .btn.b')), start: r(document.querySelector('#touch .pill')), touchShown: !!document.querySelector('#touch') && getComputedStyle(document.querySelector('#touch')).display !== 'none' }
    })
    await page.screenshot({ path: path.join(dir, '01_title.png') })
    const cdp = await ctx.newCDPSession(page)
    const center = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
    const touch = async (pt, ms = 80) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pt.x, y: pt.y, id: 1 }] })
      await sleep(ms)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await sleep(60)
    }
    const snap = () => page.evaluate(() => window.__ptSnap())
    const overlaps = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
    const notes = []
    if (!lay.touchShown || !lay.a) { record('touch_' + name, false, 'touch controls not shown: ' + JSON.stringify(lay)); await ctx.close(); continue }
    const scale = lay.canvas.w / 240
    for (const k of ['dpad', 'a', 'b', 'start']) {
      const b = lay[k]
      if (b.x < 0 || b.y < 0 || b.x + b.w > lay.vw || b.y + b.h > lay.vh) notes.push(`${k} off-screen`)
      if (overlaps(b, lay.canvas)) notes.push(`${k} overlaps the game canvas`)
      if (Math.min(b.w, b.h) < 44) notes.push(`${k} smaller than 44px (${b.w}x${b.h})`)
    }
    // play: title → NEW GAME → name entry (START → OK) → intro → arrival → walk outside, touch only
    const A = center(lay.a); const B = center(lay.b); const ST = center(lay.start); const D = lay.dpad
    const dirPt = (d) => ({ x: D.x + D.w / 2 + (d === 'left' ? -D.w * 0.33 : d === 'right' ? D.w * 0.33 : 0), y: D.y + D.h / 2 + (d === 'up' ? -D.h * 0.33 : d === 'down' ? D.h * 0.33 : 0) })
    await touch(A); await sleep(600)
    let s = await snap()
    if (s.ui.top && s.ui.top.labels) { const i = s.ui.top.labels.indexOf('NEW GAME'); for (let k = 0; k < i; k++) { await touch(dirPt('down')); await sleep(100) } await touch(A) }
    const t0 = Date.now()
    let ok = false
    while (Date.now() - t0 < 150000) {
      s = await snap()
      if (s.info.scenes.includes('Overworld') && s.info.map === 'home_1f' && !s.info.busy && !s.info.moving && s.flags.arrived) { ok = true; break }
      if (s.ui.top && s.ui.top.cls === 'NameEntryScreen') { await touch(ST); await sleep(200); await touch(A); continue }
      if (s.ui.top && s.ui.top.cls === 'ListMenu') { await touch(A); continue }
      if (s.ui.dlg === 'waiting') { await touch(A); continue }
      await sleep(150)
    }
    await page.screenshot({ path: path.join(dir, '02_home.png') })
    // hold-to-walk: hold down on the dpad for ~1.2 s and count tiles moved
    let walked = 0
    if (ok) {
      // the phone rings on the first steps: step once, then tap A through the call until idle
      const p0 = dirPt('up')
      await touch(p0, 350)
      for (let i = 0; i < 200; i++) { s = await snap(); if (!s.info.busy && !s.info.moving && s.ui.dlg === 'idle') break; if (s.ui.dlg === 'waiting' || (s.ui.top && s.ui.top.cls === 'ListMenu')) await touch(A); await sleep(150) }
      const y0 = (await snap()).info
      const p = dirPt('up')
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y, id: 1 }] })
      await sleep(1200)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await sleep(400)
      for (let i = 0; i < 100; i++) { s = await snap(); if (!s.info.busy) break; if (s.ui.dlg === 'waiting') await touch(A); await sleep(150) }
      const y1 = (await snap()).info
      notes.push(`hold-walk from ${y0.x},${y0.y} to ${y1.x},${y1.y}`)
      walked = Math.abs(y1.x - y0.x) + Math.abs(y1.y - y0.y)
      // START menu via touch
      await touch(ST); await sleep(500)
      s = await snap()
      const menuOk = !!(s.ui.top && s.ui.top.labels && s.ui.top.labels.includes('SAVE'))
      await page.screenshot({ path: path.join(dir, '03_menu.png') })
      await touch(B); await sleep(500)
      notes.push(`START menu via touch: ${menuOk}`)
      // B-run outside: walk to the door with dpad (simple: hold down)
      const pd = dirPt('down')
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pd.x, y: pd.y, id: 1 }] })
      await sleep(4000)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await sleep(1500)
      for (let i = 0; i < 40; i++) { s = await snap(); if (!s.info.busy) break; if (s.ui.dlg === 'waiting') await touch(A); await sleep(150) }
      s = await snap()
      notes.push(`after holding down: ${s.info.map} ${s.info.x},${s.info.y}`)
      await page.screenshot({ path: path.join(dir, '04_after_walk.png') })
      // multi-touch: hold B + dpad (run) outside
      if (s.info.map === 'overworld') {
        await page.evaluate(() => window.__llmmon.setFlag('has_run', true))
        const pr = dirPt('right'); const x0 = s.info.x; const tt = Date.now()
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: B.x, y: B.y, id: 2 }, { x: pr.x, y: pr.y, id: 1 }] })
        await sleep(800)
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        await sleep(300)
        const x1 = (await snap()).info.x
        notes.push(`B+right 0.8 s: ${x1 - x0} tiles (walk ≈3, run ≈6)`)
      }
    }
    record('touch_' + name, ok && walked >= 2 && !errors.length, `scale ${scale} (integer ${Number.isInteger(scale)}), canvas ${JSON.stringify(lay.canvas)} vp ${lay.vw}x${lay.vh}; dpad ${JSON.stringify(lay.dpad)} A ${JSON.stringify(lay.a)} B ${JSON.stringify(lay.b)} START ${JSON.stringify(lay.start)}; reached home via touch: ${ok}; held right 1.2 s → ${walked} tiles; ${notes.join('; ')}; errors ${JSON.stringify(errors)}`)
    await ctx.close()
  }
}

T.dex = async () => {
  const g = await setup('dex', { spawn: 'route_mouth', flags: POST('glm'), party: [['glm', 9], ['gemma_4', 4]], seen: ['hallucihound', 'mistral_medium', 'gpt_5_4_mini'], caught: ['glm', 'gemma_4'] })
  await audioLog(g)
  await menu.openStart(g)
  let s = await g.snap()
  const di = s.ui.top.labels.indexOf('PROMPTDEX')
  if (di < 0) { record('dex', false, 'no PROMPTDEX entry: ' + s.ui.top.labels); await g.close(); return }
  await g.pick(di, 'UI'); await sleep(900)
  await g.shot('dex_list', 'PromptDex list')
  for (let i = 0; i < 12; i++) { await g.press('down'); await sleep(90) }
  await g.shot('dex_scrolled', 'PromptDex scrolled')
  for (let i = 0; i < 12; i++) { await g.press('up'); await sleep(60) }
  // open the first entry that is caught (GLM is #3 probably): move down until detail opens on A
  for (let i = 0; i < 3; i++) { await g.press('down'); await sleep(90) }
  await g.press('A'); await sleep(1000)
  await g.shot('dex_detail', 'PromptDex detail')
  await g.press('right'); await sleep(600)
  await g.shot('dex_detail_2', 'PromptDex detail page 2 / next')
  const log = await audioLog(g)
  await g.press('B'); await sleep(500); await g.press('B'); await sleep(500)
  // card counts
  s = await g.snap()
  if (s.ui.top && s.ui.top.labels) {
    await g.pick(s.ui.top.labels.findIndex((l) => !['LLMMON', 'PROMPTDEX', 'BAG', 'SAVE', 'OPTIONS', 'EXIT'].includes(l)), 'UI'); await sleep(800)
    await g.shot('dex_card', 'Trainer card counts')
    await g.press('B'); await sleep(500); await g.press('B')
  }
  const st = await g.page.evaluate(() => ({ seen: window.__llmmon.state.seen.length, caught: window.__llmmon.state.caught.length }))
  record('dex', log.some((a) => a.k === 'cry'), `state seen ${st.seen} caught ${st.caught}; audio: ${log.map((a) => a.k + ':' + a.id).join(',')}`)
  await g.close()
}

T.storage = async () => {
  const g = await setup('storage', { map: 'center', x: 11, y: 8, flags: POST('glm'), party: [['mistral_medium', 6, { hp: 3 }], ['claude_fable', 7], ['deepseek_flash', 5], ['gpt_5_4_mini', 4]], box: [['gemma_4', 3], ['gemini_flash', 4]] }).catch(async (e) => { throw e })
  await g.face('up')
  await audioLog(g)
  await g.press('A'); await sleep(1500)
  await g.drive((s) => s.ui.top && s.ui.top.cls === 'StorageScreen', {}, 15000).catch(() => {})
  await sleep(600)
  await g.shot('storage_open', 'Model Storage')
  const st = () => g.page.evaluate(() => { const ui = window.__llmmon.game.scene.getScene('UI'); const w = ui.stack.list.find((x) => x.constructor.name === 'StorageScreen'); const top = ui.stack.list[ui.stack.list.length - 1]; return w ? { area: w.area, col: w.col, row: w.row, pidx: w.pidx, top: top.constructor.name, labels: top.items && top.items.map((i) => i.label), names: w.partyNames.map((t) => t.text) } : null })
  const before = await st()
  // move the hand to the party column (right a lot)
  for (let i = 0; i < 8 && (await st()).area !== 'party'; i++) { await g.press('right'); await sleep(80) }
  const inParty = await st()
  await g.shot('storage_party', 'Party column (long names)')
  // deposit the damaged Mistral (party 0)
  for (let i = 0; i < 6 && (await st()).pidx !== 0; i++) { await g.press('up'); await sleep(80) }
  await g.press('A'); await sleep(400)
  let sm = await st()
  await g.shot('storage_menu', 'Party mon menu')
  const di = (sm.labels || []).indexOf('DEPOSIT')
  for (let i = 0; i < di; i++) { await g.press('down'); await sleep(80) }
  await g.press('A'); await sleep(1200)
  for (let i = 0; i < 6; i++) { const x = await g.snap(); if (x.ui.top && x.ui.top.cls === 'DialogBox') { await g.press('A'); await sleep(300) } }
  const afterDep = await g.page.evaluate(() => ({ party: window.__llmmon.state.party.map((m) => m.speciesId + ':' + m.hp), box: window.__llmmon.state.box.map((m) => m.speciesId + ':' + m.hp) }))
  await g.shot('storage_deposited', 'After deposit')
  // try depositing until the last one (refusal)
  // withdraw gemma (box 0): go left to the grid
  for (let i = 0; i < 8 && (await st()).area !== 'box'; i++) { await g.press('left'); await sleep(70) }
  for (let i = 0; i < 6 && ((await st()).row !== 0 || (await st()).area !== 'box'); i++) { await g.press((await st()).area === 'header' ? 'down' : 'up'); await sleep(70) }
  for (let i = 0; i < 6 && (await st()).col !== 0; i++) { await g.press('left'); await sleep(70) }
  await g.press('A'); await sleep(400)
  sm = await st()
  const wi = (sm.labels || []).indexOf('WITHDRAW')
  for (let i = 0; i < wi; i++) { await g.press('down'); await sleep(80) }
  await g.press('A'); await sleep(1200)
  for (let i = 0; i < 6; i++) { const x = await g.snap(); if (x.ui.top && x.ui.top.cls === 'DialogBox') { await g.press('A'); await sleep(300) } }
  const afterWd = await g.page.evaluate(() => ({ party: window.__llmmon.state.party.map((m) => m.speciesId), box: window.__llmmon.state.box.map((m) => m.speciesId) }))
  await g.shot('storage_withdrawn', 'After withdraw')
  for (let i = 0; i < 4; i++) { await g.press('B'); await sleep(400) }
  await g.waitIdle().catch(() => {})
  const log = await audioLog(g)
  // persistence: save + reload
  await menu.save(g, { check: () => {}, sleep, FAST: true })
  await g.goto('')
  await g.page.waitForFunction(() => window.__ptSnap() && window.__ptSnap().title === 'press', null, { timeout: 20000 })
  await g.press('A'); await sleep(500); await g.pick(0, 'UI')
  await g.page.waitForFunction(() => { const s = window.__ptSnap(); return s.info.scenes.includes('Overworld') && !s.info.busy }, null, { timeout: 15000 })
  const persisted = await g.page.evaluate(() => ({ party: window.__llmmon.state.party.map((m) => m.speciesId), box: (window.__llmmon.state.box || []).map((m) => m.speciesId) }))
  record('storage', JSON.stringify(persisted) === JSON.stringify(afterWd), `party names shown: ${JSON.stringify(inParty && inParty.names)}; deposit → ${JSON.stringify(afterDep)}; withdraw → ${JSON.stringify(afterWd)}; after reload ${JSON.stringify(persisted)}; sfx ${log.filter((a) => a.k === 'sfx').map((a) => a.id).join(',')}`)
  await g.close()
}

T.storage_refuse = async () => {
  const g = await setup('storage_refuse', { map: 'center', x: 11, y: 8, flags: POST('glm'), party: [['glm', 6]], box: [['gemma_4', 3]] })
  await g.face('up'); await g.press('A'); await sleep(1500)
  await g.drive((s) => s.ui.top && s.ui.top.cls === 'StorageScreen', {}, 15000).catch(() => {})
  const ar = () => g.page.evaluate(() => { const ui = window.__llmmon.game.scene.getScene('UI'); const w = ui.stack.list.find((x) => x.constructor.name === 'StorageScreen'); return w && w.area })
  for (let i = 0; i < 8 && (await ar()) !== 'party'; i++) { await g.press('right'); await sleep(70) }
  await g.press('A'); await sleep(400)
  await g.press('A'); await sleep(900) // DEPOSIT (first item)
  await g.shot('refuse_last', 'Refusal: last party member')
  const txt = await g.page.evaluate(() => { const ui = window.__llmmon.game.scene.getScene('UI'); const w = ui.stack.list.find((x) => x.constructor.name === 'StorageScreen'); return w && w.dialog && w.dialog.currentText })
  record('storage_refuse_last', /can|last|only|need/i.test(txt || ''), `refusal text: "${txt}"`)
  for (let i = 0; i < 5; i++) { await g.press('B'); await sleep(300) }
  await g.close()
}

async function rivalFight(starter, party, name, opts = {}) {
  const g = await setup(name, { smart: opts.smart, x: 21, y: 40, flags: { ...POST(starter), trainer_route_101_a_defeated: true, trainer_route_101_b_defeated: true, rival_starter: COUNTER[starter], ...(opts.flags || {}) }, party, items: opts.items || { patch: 1, prompt_orb: 3 } })
  const texts = []
  g.handlers = {
    onText: async (t) => texts.push(t),
    onBattleText: async (t) => texts.push('[b] ' + t),
    battle: async (s) => { if (s.battle.phase === 'command' && !g._c) { g._c = 1; await g.shot('rival_command', 'Rival battle') } if (s.battle.phase === 'intro' && !g._i) { g._i = 1; await sleep(900); await g.shot('rival_intro', 'Rival intro') } return false },
  }
  await audioLog(g)
  await g.walkTo({ x: 21, y: 33 }, { run: true }).catch(() => {})
  await g.waitIdle({}, 240000).catch(() => {})
  const s = await g.snap()
  const e = g.encounters.find((x) => x.kind === 'trainer')
  const all = (e && e.texts) || []
  const log = await audioLog(g)
  const se = all.filter((t) => /super effective/i.test(t)).length
  const ne = all.filter((t) => /not very effective/i.test(t)).length
  await g.shot('rival_after', 'After rival')
  return { g, s, e, texts, all, se, ne, log }
}

T.rival_smart = async () => {
  // a careful player: reads effectiveness, avoids resisted moves, Patches at <40 %; arrives with the
  // normal run's natural party shape (starter Lv8 at ~30 % HP + Lv2–4 catch, 3 Patches) and at full HP
  for (const hpMode of ['natural', 'full']) {
    for (const starter of ['glm', 'claude_fable', 'gpt_5_5']) {
      const hp = hpMode === 'natural' ? { hp: 8 } : {}
      const party = [[starter, 8, hp], ['mistral_medium', 3]]
      const { g, s, e, all, se, ne } = await rivalFight(starter, party, `rival_smart_${hpMode}_${starter}`, { smart: true, items: { patch: 3, prompt_orb: 4 } })
      record(`rival_smart_${hpMode}_${starter}`, s.flags.rival_beaten ? true : 'lost', `vs ${COUNTER[starter]}: ${e ? e.outcome : '-'} in ${e ? Math.round(e.ms / 1000) : '-'} s, turns≈${e ? e.turns : '-'}, super ×${se}, resisted ×${ne}; party after ${JSON.stringify(s.party)}; last lines: ${all.slice(-5).join(' / ').replace(/\n/g, ' ').slice(0, 300)}`)
      await g.close()
    }
  }
}

T.rival = async () => {
  for (const starter of ['glm', 'claude_fable', 'gpt_5_5']) {
    // typical arrival party: starter Lv7 + a Lv4 catch, HP as after Tiana (~70%) — mirrors the normal run
    const party = [[starter, 7, { hp: 18 }], ['gemma_4', 4]]
    const { g, s, e, texts, all, se, ne, log } = await rivalFight(starter, party, 'rival_' + starter)
    const her = COUNTER[starter]
    const counterOk = BEATS[TYPE[her]] === TYPE[starter]
    const cries = log.filter((a) => a.k === 'cry').map((a) => a.id)
    const music = [...new Set(log.filter((a) => a.k === 'playMusic').map((a) => a.id))]
    record('rival_' + starter, s.flags.rival_beaten ? true : 'lost', `her starter ${her} (${TYPE[her]} beats ${TYPE[starter]}: ${counterOk}); outcome ${e ? e.outcome : 'no battle'} in ${e ? Math.round(e.ms / 1000) : '-'} s, turns≈${e ? e.turns : '-'}; "super effective" ×${se}, "not very effective" ×${ne}; music ${music.join('>')}; cries ${cries.join(',')}; end map ${s.info.map}; party after ${JSON.stringify(s.party)}; lines: ${texts.filter((t) => !t.startsWith('[b]')).slice(0, 3).map((t) => t.slice(0, 50)).join(' | ')}`)
    await g.close()
  }
}

T.rival_loss = async () => {
  const { g, s } = await rivalFight('glm', [['glm', 5, { hp: 4 }]], 'rival_loss', { items: {} })
  const lost = !s.flags.rival_beaten
  const where = `${s.info.map} ${s.info.x},${s.info.y}`
  // rematch with a strong team (debug: walk back is tested in the main run)
  await g.page.evaluate(() => { const L = window.__llmmon; L.state.party.length = 0; L.giveMon('glm', 14) })
  await g.page.evaluate(() => window.__llmmon.warp('overworld', 21, 40)); await sleep(1500); await g.waitIdle()
  const texts = []
  g.handlers = { onText: async (t) => texts.push(t) }
  await g.walkTo({ x: 21, y: 33 }, { run: true }).catch((e) => texts.push('ERR ' + e.message))
  await g.waitIdle({}, 240000).catch(() => {})
  const s2 = await g.snap()
  await g.walkTo({ x: 19, y: 28 }, { run: true }).catch(() => {})
  await sleep(500)
  const dana = (await g.snap()).info.npcs.find((n) => n.id === 'dana' && !n.hidden)
  let ftxt = []
  if (dana) { ftxt = await g.talkTo('dana').catch(() => []); await g.shot('fountain_dana', 'Dana at the fountain') }
  record('rival_loss_rematch', lost && !!s2.flags.rival_beaten && !!dana, `lost first: ${lost} (white-out to ${where}, rival_lost_once=${s.flags.rival_lost_once}); rematch lines: ${texts.slice(0, 2).map((t) => t.slice(0, 70)).join(' | ')}; won rematch ${!!s2.flags.rival_beaten}; dana at fountain ${dana ? dana.x + ',' + dana.y : 'MISSING'}: ${ftxt.join(' | ').slice(0, 140)}`)
  await g.close()
}

T.city = async () => {
  const g = await setup('city', { x: 21, y: 33, flags: { ...POST('glm'), rival_beaten: true, rival_starter: 'claude_fable' }, party: [['glm', 9]] })
  const m = g.map('overworld')
  // every reachable walkable tile of the city (y < 37): visit a grid of points and screenshot
  const pts = []
  for (let y = 10; y <= 34; y += 4) for (let x = 9; x <= 35; x += 6) if (!m.isSolid(x, y) && !m.objectAt('warp', x, y)) pts.push({ x, y })
  let n = 0
  const unreachable = []
  for (const p of pts) {
    const r = await g.walkTo(p, { run: true, maxAttempts: 2 }).catch(() => null)
    if (!r) { unreachable.push(`${p.x},${p.y}`); continue }
    await sleep(250)
    await g.shot(`city_${p.x}_${p.y}`, `SoMa ${p.x},${p.y}`)
    n++
  }
  const signs = await g.readAllSigns()
  record('city_walk', true, `${n} street shots, ${unreachable.length} unreachable sample tiles (${unreachable.join(' ')}); signs read: ${signs.join(', ')}`)
  fs.writeFileSync(path.join(OUT, 'city', 'result.json'), JSON.stringify({ fast: false, quick: true, seed: SEED, starter: 'glm', beats: g.beats.map((b) => ({ ...b, file: path.basename(b.file), file4: path.basename(b.file4) })), strips: [] }, null, 1))
  await g.close()
}

T.endcard = async () => {
  const g = await setup('endcard', { x: 23, y: 12, flags: { ...POST('glm'), rival_beaten: true, rival_starter: 'claude_fable' }, party: [['glm', 9]] })
  await audioLog(g)
  let saveOffer = null
  const texts = []
  await g.readAt(23, 10, { onText: async (t) => texts.push(t) })
  await g.walkTo({ x: 22, y: 13 }, { stopOnInterrupt: true }).catch(() => {})
  await g.waitIdle({ onText: async (t) => texts.push(t), choice: async (p, l) => { saveOffer = { p, l }; await g.shot('end_save_offer', 'Save offer'); return 0 } }, 15000).catch(() => {})
  const frames = []
  const t0 = Date.now()
  for (let i = 0; i < 20; i++) {
    await sleep(1500)
    const sc = (await g.snap()).info.scenes
    await g.shot(`end_${String(i).padStart(2, '0')}`, `End card +${Math.round((Date.now() - t0) / 1000)} s ${sc.join('/')}`)
    frames.push(sc.join('/'))
    if ((await g.snap()).title === 'press') break
    if (i > 10) await g.press('A')
  }
  const log = await audioLog(g)
  const music = log.filter((a) => a.k === 'playMusic').map((a) => a.id)
  const atTitle = (await g.snap()).title
  // Continue after the end card
  let cont = 'n/a'
  if (atTitle === 'press') {
    await g.press('A'); await sleep(600)
    const labels = (await g.snap()).ui.top.labels
    await g.pick(0, 'UI')
    await g.page.waitForFunction(() => { const s = window.__ptSnap(); return s.info.scenes.includes('Overworld') && !s.info.busy }, null, { timeout: 15000 }).catch(() => {})
    await sleep(1500)
    const s = await g.snap()
    await g.shot('end_continue', 'Continue after the end card')
    await g.walkTo({ x: 22, y: 14 }).catch(() => {}); await g.walkTo({ x: 22, y: 12 }).catch(() => {}); await sleep(800)
    const s2 = await g.snap()
    cont = `labels ${JSON.stringify(labels)} → ${s.info.map} ${s.info.x},${s.info.y}; after walking near the road again busy=${s2.info.busy} scenes=${s2.info.scenes.join('/')}`
  }
  record('endcard', music.includes('ending') && atTitle === 'press', `save offer ${JSON.stringify(saveOffer)}; scenes ${[...new Set(frames)].join(' > ')}; music ${music.join('>')}; back at title: ${atTitle}; continue: ${cont}`)
  await g.close()
}

T.sfxwire = async () => {
  // phone + truck: fresh new game through arrival; pc_on/off: home PC; buy: mart purchase
  const dir = path.join(OUT, 'sfxwire'); fs.mkdirSync(dir, { recursive: true })
  const g = await Game.launch({ browser, port: PORT, outDir: dir, quick: true, seed: SEED, query: 'new=1', dist: DIST })
  await g.page.waitForFunction(() => window.__ptSnap() && window.__ptSnap().title === 'press', null, { timeout: 20000 })
  await g.press('A'); await sleep(500)
  await g.pick((await g.snap()).ui.top.labels.indexOf('NEW GAME'), 'UI')
  await g.drive((s) => !!(s.ui.top && s.ui.top.cls === 'NameEntryScreen'), {})
  await g.press('START'); await sleep(200); await g.press('A')
  await g.drive((s) => s.info.map === 'home_1f' && !s.info.busy && !s.info.moving, {}, 120000)
  await g.walkTo({ x: 6, y: 6 }).catch(() => {}); await g.waitIdle()
  await g.takeWarp('home_2f'); await g.readAt(3, 2)
  const log = await audioLog(g)
  const ids = log.map((a) => a.k + ':' + a.id)
  record('sfx_wiring', ['sfx:truck', 'sfx:phone', 'sfx:pc_on', 'sfx:pc_off'].every((x) => ids.includes(x)), `truck ${ids.includes('sfx:truck')}, phone ${ids.includes('sfx:phone')}, pc_on ${ids.includes('sfx:pc_on')}, pc_off ${ids.includes('sfx:pc_off')}, starter cries n/a here; 'buy' referenced in code: no (mart plays stat_up)`)
  await g.close()
}

T.cries = async () => {
  const g = await setup('cries', { spawn: 'route_mouth', flags: POST('glm'), party: [['glm', 9]] })
  g.handlers = { planBattle: () => 'win' }
  await audioLog(g)
  for (let k = 0; k < 80 && !g.encounters.length; k++) await g.walkTo({ x: 17 + (k % 2) * 8, y: 71 }, { grassCost: 0 })
  await g.waitIdle()
  const log = await audioLog(g)
  const rows = []
  for (let i = 0; i < log.length; i++) {
    const a = log[i]
    if (a.k !== 'cry') continue
    const dur = await g.page.evaluate((id) => window.__llmmonAudio.cryDurationMs(id), a.id)
    const next = log.slice(i + 1).find((b) => b.k === 'sfx' || b.k === 'cry')
    rows.push(`${a.id}@${a.t} dur ${Math.round(dur)} next ${next ? next.k + ':' + next.id + '@+' + (next.t - a.t) : '-'}${next && next.t - a.t < dur ? ' OVERLAP' : ''}`)
  }
  record('cries', rows.length >= 2, rows.join(' | ') + ' || music: ' + log.filter((a) => a.k === 'playMusic').map((a) => a.id).join('>'))
  await g.close()
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const srv = await serve(DIST, PORT)
  browser = await chromium.launch()
  const names = ONLY ? ONLY.split(',') : Object.keys(T)
  for (const n of names) {
    const t0 = Date.now()
    console.log(`\n### ${n}`)
    try { await T[n]() } catch (e) { record(n, false, 'test crashed: ' + e.message.split('\n')[0]); console.error(e) }
    console.log(`   (${((Date.now() - t0) / 1000).toFixed(0)} s)`)
  }
  fs.writeFileSync(path.join(OUT, `results${ONLY ? '_' + ONLY.replace(/,/g, '_') : ''}.json`), JSON.stringify(results, null, 1))
  await browser.close()
  srv.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
