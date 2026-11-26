#!/usr/bin/env node
// Targeted playtests that need setup via debug hooks (allowed here, NOT in run.cjs):
// white-out, level-up/learn-move, full party + 7th catch, Hayes Valley escape/edges,
// input mashing, menu/talk while NPCs walk, resize, reload mid-cutscene, animation strips.
//
//   node tools/playtest/tests.cjs [--only name,name] [--no-build] [--seed N]
'use strict'
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { chromium } = require('playwright')
const { Game, serve, sleep } = require('./lib/game.cjs')
const { loadMap, findPath, DIRS } = require('./lib/maps.cjs')
const menu = require('./segments/menu.cjs')

const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const ROOT = path.resolve(__dirname, '../..')
const DIST = path.resolve(arg('--dist', path.join(__dirname, 'out/dist')))
const PORT = Number(arg('--port', '5192'))
const OUT = path.resolve(arg('--out', path.join(__dirname, 'out/tests')))
const SEED = Number(arg('--seed', '11'))
const ONLY = arg('--only', null)

const results = []
let browser

function build() {
  if (args.includes('--no-build') && fs.existsSync(path.join(DIST, 'index.html'))) return
  execSync(`npx vite build --config tools/playtest/vite.playtest.config.mjs --outDir ${JSON.stringify(DIST)}`, { cwd: ROOT, stdio: 'inherit' })
}

const PRE_RESCUE = { arrived: true, visited_2f: true, read_notebook: true, mom_lab_call: true, met_aide: true, has_satchel: true }
const POST_RESCUE = { ...PRE_RESCUE, has_satchel: false, starter: 'glm', rescue_done: true, got_dex: true, has_run: true }

/** New page booted straight onto a map with a debug-built state. */
async function setup(name, o = {}) {
  const dir = path.join(OUT, name)
  fs.mkdirSync(dir, { recursive: true })
  const q = new URLSearchParams({ map: o.map || 'overworld', new: '1' })
  if (o.spawn) q.set('spawn', o.spawn)
  if (o.x != null) { q.set('x', o.x); q.set('y', o.y) }
  const g = await Game.launch({ browser, port: PORT, outDir: dir, fast: !!o.fast, quick: true, seed: o.seed ?? SEED, query: q.toString(), viewport: o.viewport, dist: DIST })
  await g.page.waitForFunction(() => { const s = window.__ptSnap(); return s && s.info.scenes.includes('Overworld') && !s.info.busy }, null, { timeout: 20000 })
  await g.page.evaluate((o) => {
    const L = window.__llmmon
    for (const [k, v] of Object.entries(o.flags || {})) L.setFlag(k, v)
    if (o.party) {
      L.state.party.length = 0
      for (const [id, lv, mut] of o.party) { const m = L.giveMon(id, lv); if (mut) Object.assign(m, mut) }
    }
    for (const [k, v] of Object.entries(o.items || {})) L.giveItem(k, v)
    if (o.money != null) L.state.money = o.money
    if (o.healPoint) L.state.healPoint = o.healPoint
  }, o)
  // re-enter the map so NPC visibility and spawns match the flags
  if (o.rewarp !== false) await g.page.evaluate(([m, s, x, y]) => (x != null ? window.__llmmon.warp(m, x, y) : window.__llmmon.warp(m, s || 'start')), [o.map || 'overworld', o.spawn, o.x, o.y])
  await sleep(600)
  await g.waitIdle()
  return g
}

function record(name, ok, detail, extra = {}) {
  results.push({ name, ok, detail, ...extra })
  console.log(`${ok ? 'PASS' : 'FAIL'} [${name}] ${detail}`)
}

async function grindUntil(g, pred, region, maxMs = 240000) {
  const m = loadMap('overworld')
  const grass = []
  for (let y = region.y0; y <= region.y1; y++) for (let x = region.x0; x <= region.x1; x++) if (m.tileAt(x, y).grass && !m.isSolid(x, y)) grass.push({ x, y })
  const t0 = Date.now()
  let i = 0
  while (!(await pred()) && Date.now() - t0 < maxMs) {
    await g.walkTo(grass[(i * 5) % grass.length], { grassCost: 0 })
    i++
  }
}
const GRASS = { x0: 15, y0: 69, x1: 28, y1: 73 }

// ============================================================================ tests
const TESTS = {}

TESTS.whiteout = async () => {
  for (const variant of ['home', 'center']) {
    const g = await setup('whiteout_' + variant, {
      spawn: 'route_mouth', flags: { ...POST_RESCUE, ...(variant === 'center' ? { healed_at_center: true } : {}) },
      party: [['gemma_4', 2, { hp: 1 }]], money: 3001,
      healPoint: variant === 'center' ? { map: 'center', spawn: 'counter' } : undefined,
    })
    g.handlers = { planBattle: () => 'lose', battle: async (s) => { if (s.battle.phase === 'faint' && !g._ft) { g._ft = 1; await g.shot('faint', 'Our mon faints') } return false } }
    let texts = []
    g.handlers.onText = async (t) => { texts.push(t); if (/hurried|safe place/.test(t)) await g.shot('whiteout_msg', 'White-out message') }
    await grindUntil(g, async () => g.encounters.length >= 1, GRASS)
    const s = await g.waitIdle()
    await g.shot('after_whiteout', 'After white-out')
    const want = variant === 'center' ? 'center' : 'home_1f'
    record('whiteout_' + variant, s.info.map === want && s.money === 1500, `map ${s.info.map} (want ${want}) at ${s.info.x},${s.info.y}; money 3001 → ${s.money}; hp ${s.party[0].hp}; music ${s.music}; texts: ${texts.slice(-2).join(' | ')}`, { shots: g.beats.map((b) => b.file) })
    await g.close()
  }
}

TESTS.levelup = async () => {
  // GLM Lv14 with 4 moves, 1 EXP short of Lv15 (learns Summarize at 15)
  const g = await setup('levelup', { spawn: 'route_mouth', flags: POST_RESCUE, party: [['glm', 14, { exp: 2034 }]] })
  const seen = []
  g.handlers = {
    planBattle: () => 'win',
    battle: async (s) => {
      const b = s.battle
      if (['exp', 'levelup', 'learn-yesno', 'learn-pick', 'learn-stop'].includes(b.phase) && !seen.includes(b.phase)) {
        seen.push(b.phase)
        await sleep(b.phase === 'exp' ? 500 : 300)
        await g.shot(b.phase, b.phase + ': ' + (b.text || '').slice(0, 40))
      }
      return false
    },
    learn: async (s) => (s.battle.phase === 'learn-pick' ? { slot: 0 } : { forget: true }),
  }
  const before = (await g.snap()).party[0]
  await grindUntil(g, async () => g.encounters.length >= 1, GRASS)
  const s = await g.waitIdle()
  const after = s.party[0]
  const bt = (g.encounters[0] && g.encounters[0].texts) || []
  record('levelup_learn_replace', after.lv === 15 && after.moves.includes('summarize') && !after.moves.includes(before.moves[0]),
    `Lv ${before.lv} → ${after.lv}; moves ${before.moves.join(',')} → ${after.moves.join(',')}; phases ${seen.join('>')}; texts: ${bt.filter((t) => /grew|learn|forgot|Summarize|1, 2/i.test(t)).join(' | ')}`)
  await g.close()
}

TESTS.fullparty = async () => {
  const g = await setup('fullparty', {
    spawn: 'route_mouth', flags: POST_RESCUE, items: { prompt_orb: 20 },
    party: [['glm', 12], ['gemma_4', 5], ['gpt_5_4_mini', 5], ['mistral_medium', 5], ['claude_fable', 5], ['gpt_5_5', 5]],
  })
  g.handlers = { planBattle: () => 'catch', onBattleText: async (t) => { if (/box|PC|storage|sent/i.test(t)) await g.shot('sent_to_box', t.slice(0, 40)) } }
  await grindUntil(g, async () => g.encounters.some((e) => e.outcome === 'catch'), GRASS, 400000)
  const s = await g.waitIdle()
  const box = await g.page.evaluate(() => (window.__llmmon.state.box || []).map((m) => m.speciesId))
  const e = g.encounters.find((x) => x.outcome === 'catch')
  record('full_party_7th_catch', s.party.length === 6 && box.length >= 1, `party ${s.party.length}, box [${box}], battles ${g.encounters.length}; catch texts: ${e ? e.texts.slice(-4).join(' | ') : 'no catch'}`)
  await g.close()
}

TESTS.escape = async () => {
  // static: is there any walkable path from town to y<86 that avoids the trigger row?
  const m = loadMap('overworld')
  const trig = m.objectsOfType('trigger').find((t) => t.props.script === 'route.rescue')
  const avoid = new Set()
  for (let x = trig.tx; x < trig.tx + trig.tw; x++) avoid.add(`${x},${trig.ty}`)
  const p = findPath(m, { x: 13, y: 98 }, (x, y) => y < trig.ty, { avoid: new Set([...avoid].map((k) => k)), blocked: (x, y) => avoid.has(`${x},${y}`) })
  record('escape_static', !p, p ? `path north avoiding the trigger exists: ${p.map((q) => q.dir).join(',')}` : `no route north avoids trigger row y=${trig.ty} x=${trig.tx}-${trig.tx + trig.tw - 1}`)
  // dynamic: every trigger tile fires; push against every boundary tile of the town
  for (let x = trig.tx; x < trig.tx + trig.tw; x++) {
    const g = await setup('escape_x' + x, { spawn: 'route_mouth', x, y: 89, flags: { arrived: true, visited_2f: true, mom_lab_call: true }, party: [] })
    await g.walkTo({ x, y: 87 })
    await g.holdUntil('up', { x, y: 85 })
    await sleep(500)
    const s = await g.snap()
    record('escape_trigger_x' + x, s.info.busy || s.ui.dlg !== 'idle', `stepping onto ${x},${trig.ty}: busy=${s.info.busy} y=${s.info.y} text="${(s.ui.text || '').slice(0, 30)}"`)
    if (x === trig.tx) await g.shot('trigger_fires', 'Rescue trigger fires')
    await g.close()
  }
  // perimeter push test (town only, y >= 87)
  const g = await setup('escape_edges', { spawn: 'home_door', flags: { arrived: true, visited_2f: true, mom_lab_call: true }, party: [] })
  const reach = new Set()
  const q = [[13, 98]]
  reach.add('13,98')
  while (q.length) {
    const [x, y] = q.shift()
    for (const [dx, dy] of Object.values(DIRS)) {
      const nx = x + dx; const ny = y + dy; const k = `${nx},${ny}`
      if (reach.has(k) || ny < 87 || m.isSolid(nx, ny) || m.objectAt('warp', nx, ny) || m.objectAt('prop', nx, ny)) continue
      reach.add(k); q.push([nx, ny])
    }
  }
  const edges = []
  for (const k of reach) {
    const [x, y] = k.split(',').map(Number)
    for (const [d, [dx, dy]] of Object.entries(DIRS)) {
      const nx = x + dx; const ny = y + dy
      if ((!m.inBounds(nx, ny) || m.isSolid(nx, ny)) && !m.objectAt('warp', nx, ny) && !m.objectAt('sign', nx, ny) && !m.objectAt('trigger', nx, ny)) edges.push({ x, y, d })
    }
  }
  // sample: all edges on the outer ring + every 3rd elsewhere (keeps the test ~5 min)
  const sample = edges.filter((e, i) => e.x <= 11 || e.x >= 32 || e.y >= 107 || e.y <= 90 || i % 3 === 0)
  const leaks = []
  let bumps = 0
  for (const e of sample) {
    const r = await g.walkTo({ x: e.x, y: e.y }).catch((err) => ({ err }))
    if (r.err) continue
    const s0 = await g.snap()
    if (s0.info.x !== e.x || s0.info.y !== e.y) continue
    await g.page.evaluate(() => { window.__audioLog.length = 0 })
    await g.press(e.d, 300)
    await sleep(150)
    const s1 = await g.snap()
    const log = await g.page.evaluate(() => window.__audioLog.map((a) => a.id))
    if (log.includes('bump')) bumps++
    if (s1.info.x !== e.x || s1.info.y !== e.y || s1.info.map !== 'overworld') leaks.push({ ...e, to: [s1.info.map, s1.info.x, s1.info.y] })
  }
  for (const [x, y, n] of [[10, 90, 'nw'], [33, 90, 'ne'], [11, 108, 'sw'], [33, 108, 'se']]) {
    await g.walkTo({ x, y }).catch(() => {})
    await sleep(300)
    await g.shot('corner_' + n, `Hayes corner ${n}`)
  }
  record('escape_edges', leaks.length === 0, `pushed into ${sample.length} blockers from ${reach.size} reachable tiles; leaks: ${JSON.stringify(leaks)}; bump sfx on ${bumps}/${sample.length}`)
  await g.close()
}

/** Random key mashing for `ms`, returns keys pressed. */
async function mash(g, ms, keys = ['z', 'x', 'Escape', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']) {
  const t0 = Date.now()
  let n = 0
  let r = 12345
  const rnd = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff }
  while (Date.now() - t0 < ms) {
    const k = keys[Math.floor(rnd() * keys.length)]
    await g.page.keyboard.down(k)
    await sleep(15 + rnd() * 90)
    await g.page.keyboard.up(k)
    await sleep(10 + rnd() * 60)
    n++
  }
  return n
}

TESTS.mash = async () => {
  // 1) title → intro → arrival while mashing everything
  {
    const dir = path.join(OUT, 'mash_newgame')
    fs.mkdirSync(dir, { recursive: true })
    const g = await Game.launch({ browser, port: PORT, outDir: dir, quick: true, seed: SEED, query: 'new=1', dist: DIST })
    await g.page.waitForFunction(() => window.__ptSnap() && window.__ptSnap().title === 'press', null, { timeout: 20000 })
    const n = await mash(g, 45000)
    await g.shot('after_mash', 'After 45 s of mashing from the title')
    let s = await g.snap()
    let ok = true
    let err = ''
    try {
      s = await g.drive((x) => x.info.scenes.includes('Overworld') && !x.info.busy && !x.info.moving && x.flags.arrived, {}, 90000)
    } catch (e) { ok = false; err = e.message.slice(0, 300) }
    await g.shot('settled', 'Settled')
    record('mash_newgame', ok && g.errors.filter((e) => !/GL Driver|GPU stall/.test(e.s)).length === 0, `${n} keys; then ${ok ? 'reached' : 'FAILED to reach'} idle overworld; map ${s.info.map} ${s.info.x},${s.info.y} name=${await g.page.evaluate(() => window.__llmmon.state.playerName)} flags=${Object.keys(s.flags).join(',')} ${err} errors=${JSON.stringify(g.errors.filter((e) => !/GL Driver|GPU stall/.test(e.s)).map((e) => e.s.slice(0, 160)))}`)
    await g.close()
  }
  // 2) rescue cutscene + starter select + tutorial battle while mashing
  {
    const g = await setup('mash_rescue', { spawn: 'route_mouth', x: 21, y: 88, flags: PRE_RESCUE, party: [] })
    await g.holdUntil('up', { x: 21, y: 86 })
    const n = await mash(g, 60000)
    await g.shot('after_mash', 'After 60 s mashing through the rescue')
    let ok = true
    let err = ''
    let s
    try { s = await g.drive((x) => x.info.scenes.includes('Overworld') && !x.info.busy && x.flags.got_dex && !x.battle && !x.starter, {}, 120000) } catch (e) { ok = false; err = e.message.slice(0, 300); s = await g.snap() }
    record('mash_rescue', ok && s.party.length === 1, `${n} keys; ${ok ? 'finished' : 'STUCK'}: map ${s.info.map}, party ${JSON.stringify(s.party.map((p) => p.id))}, flags rescue_done=${s.flags.rescue_done} got_dex=${s.flags.got_dex} starter=${s.flags.starter} ${err} errors=${JSON.stringify(g.errors.filter((e) => !/GL Driver|GPU stall/.test(e.s)).map((e) => e.s.slice(0, 160)))}`)
    await g.close()
  }
  // 3) door warps + wild battle intro while mashing
  {
    const g = await setup('mash_doors', { spawn: 'lab_front', flags: POST_RESCUE, party: [['glm', 8]] })
    for (let i = 0; i < 3; i++) {
      await g.walkTo({ x: 28, y: 96 })
      await g.page.keyboard.down('ArrowUp')
      await sleep(250)
      await g.page.keyboard.up('ArrowUp')
      await mash(g, 3000, ['z', 'x', 'Escape', 'ArrowDown', 'ArrowUp'])
      await g.waitIdle({}, 60000).catch(() => {})
      const s = await g.snap()
      if (s.info.map === 'lab') await g.takeWarp('overworld')
      await g.waitIdle({}, 60000)
    }
    await g.walkTo({ x: 21, y: 75 })
    let battles = 0
    for (let k = 0; k < 40 && battles < 2; k++) {
      await g.page.keyboard.down(k % 2 ? 'ArrowLeft' : 'ArrowRight')
      await sleep(270)
      await g.page.keyboard.up(k % 2 ? 'ArrowLeft' : 'ArrowRight')
      const s = await g.snap()
      if (s.info.scenes.includes('Battle') || s.info.busy) { battles++; await mash(g, 25000, ['z', 'x', 'Escape', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight']); await g.waitIdle({}, 90000) }
    }
    const s = await g.snap()
    record('mash_doors_battles', !s.info.busy && g.errors.filter((e) => !/GL Driver|GPU stall/.test(e.s)).length === 0, `door mash x3 + ${battles} mashed battles; ended ${s.info.map} ${s.info.x},${s.info.y}; errors=${JSON.stringify(g.errors.filter((e) => !/GL Driver|GPU stall/.test(e.s)).map((e) => e.s.slice(0, 160)))}`)
    await g.close()
  }
}

TESTS.npcwalk = async () => {
  const g = await setup('npcwalk', { spawn: 'home_door', flags: PRE_RESCUE, party: [] })
  await g.walkTo({ x: 16, y: 102 })
  // menu while hv_woman wanders
  let opened = false
  for (let i = 0; i < 200 && !opened; i++) {
    const a = (await g.snap()).info.npcs.find((n) => n.id === 'hv_woman')
    await sleep(30)
    const b = (await g.snap()).info.npcs.find((n) => n.id === 'hv_woman')
    if (a.x !== b.x || a.y !== b.y) { await g.press('START'); opened = true }
  }
  await sleep(120)
  await g.shot('menu_while_walking', 'Start menu opened as an NPC steps')
  const p1 = (await g.snap()).info.npcs.find((n) => n.id === 'hv_woman')
  await sleep(1500)
  const p2 = (await g.snap()).info.npcs.find((n) => n.id === 'hv_woman')
  await g.shot('menu_still_open', 'Menu still open 1.5 s later')
  await g.press('B')
  await g.waitIdle()
  const frozen = p1.x === p2.x && p1.y === p2.y
  record('menu_while_npc_walks', opened, `opened=${opened}; NPC ${frozen ? 'frozen' : 'kept walking'} while the menu was open (${p1.x},${p1.y} → ${p2.x},${p2.y})`)
  // talk to a wanderer mid-step: stand still near hv_girl; press A the moment she steps next to us
  await g.walkTo({ x: 30, y: 99 })
  let talked = null
  for (let i = 0; i < 1500 && !talked; i++) {
    const s = await g.snap()
    const n = s.info.npcs.find((q) => q.id === 'hv_girl')
    const dx = n.x - s.info.x; const dy = n.y - s.info.y
    if (Math.abs(dx) + Math.abs(dy) === 1) {
      const d = dx === 1 ? 'right' : dx === -1 ? 'left' : dy === 1 ? 'down' : 'up'
      await g.tap(d)
      await g.press('A')
      await sleep(400)
      const s2 = await g.snap()
      talked = { opened: s2.ui.dlg !== 'idle' || s2.info.busy, girl: s2.info.npcs.find((q) => q.id === 'hv_girl'), me: [s2.info.x, s2.info.y], text: s2.ui.text }
      await g.shot('talk_mid_step', 'Talking to a wanderer as she arrives')
    }
    await sleep(10)
  }
  if (talked) await g.waitIdle()
  const s3 = await g.snap()
  const girl = s3.info.npcs.find((q) => q.id === 'hv_girl')
  const overlap = girl.x === s3.info.x && girl.y === s3.info.y
  record('talk_wanderer_mid_step', !!talked && talked.opened && !overlap, `talk ${JSON.stringify(talked)}; after: girl ${girl.x},${girl.y} facing ${girl.facing}, player ${s3.info.x},${s3.info.y}`)
  await g.close()
}

TESTS.resize = async () => {
  const g = await setup('resize', { spawn: 'home_door', flags: PRE_RESCUE, party: [] })
  const sizes = [[960, 640], [1000, 700], [1366, 768], [1920, 1080], [500, 400], [700, 300], [239, 159], [1280, 1024]]
  const rows = []
  g.page.keyboard.down('ArrowRight')
  for (const [w, h] of sizes) {
    await g.page.setViewportSize({ width: w, height: h })
    await sleep(400)
    const r = await g.page.evaluate(() => { const c = document.querySelector('canvas').getBoundingClientRect(); const p = document.getElementById('game').getBoundingClientRect(); return { cw: c.width, ch: c.height, cx: c.left, cy: c.top, pw: p.width, ph: p.height } })
    const sc = r.cw / 240
    const integer = Number.isInteger(sc) && r.ch / 160 === sc
    const expected = Math.max(1, Math.floor(Math.min(w / 240, h / 160)))
    rows.push({ w, h, ...r, scale: sc, integer, expected, ok: (w < 240 || h < 160) ? true : integer && sc === expected && Number.isInteger(r.cx) && Number.isInteger(r.cy) })
    await g.page.screenshot({ path: path.join(OUT, 'resize', `vp_${w}x${h}.png`) })
  }
  g.page.keyboard.up('ArrowRight')
  await g.waitIdle()
  record('resize_integer_scale', rows.every((r) => r.ok), JSON.stringify(rows.map((r) => `${r.w}x${r.h}→${r.cw}x${r.ch}@${r.scale}(want ${r.expected}) off ${r.cx},${r.cy}`)))
  await g.close()
}

TESTS.reload = async () => {
  for (const when of ['dialog', 'starter', 'battle']) {
    const g = await setup('reload_' + when, { spawn: 'route_mouth', x: 21, y: 88, flags: PRE_RESCUE, party: [] })
    await menu.save(g, { check: (ok, w, d) => { if (!ok) record('reload_save_' + when, false, w + d) }, sleep, FAST: true })
    const saved = await g.snap()
    await g.holdUntil('up', { x: 21, y: 86 })
    if (when === 'dialog') await g.page.waitForFunction(() => /H-help/.test(window.__ptSnap().ui.text), null, { timeout: 8000 })
    if (when === 'starter') await g.drive((s) => !!s.starter, {}, 60000)
    if (when === 'battle') await g.drive((s) => s.battle && s.battle.phase === 'command', {}, 90000)
    await g.shot('before_reload', 'About to reload mid-' + when)
    await g.goto('') // reload, no ?new
    await g.page.waitForFunction(() => window.__ptSnap() && window.__ptSnap().title === 'press', null, { timeout: 20000 })
    await g.press('A')
    await g.page.waitForFunction(() => { const s = window.__ptSnap(); return s.ui.top && s.ui.top.cls === 'ListMenu' }, null, { timeout: 5000 })
    await g.pick(0, 'UI')
    await g.page.waitForFunction(() => { const s = window.__ptSnap(); return s.info.scenes.includes('Overworld') && !s.info.busy }, null, { timeout: 15000 })
    await sleep(800)
    const s = await g.snap()
    await g.shot('continued', 'After Continue')
    const ghosts = s.info.npcs.filter((n) => ['prof', 'hound'].includes(n.id) && !n.hidden)
    const posOk = s.info.x === saved.info.x && s.info.y === saved.info.y
    // can the cutscene be replayed and finished?
    let finished = false
    try {
      await g.holdUntil('up', { x: 21, y: 86 })
      const e = await g.drive((x) => x.info.scenes.includes('Overworld') && !x.info.busy && x.flags.got_dex && !x.battle && !x.starter, {}, 150000)
      finished = e.info.map === 'lab' && e.party.length === 1
    } catch (err) { /* stuck */ }
    record('reload_mid_' + when, posOk && !ghosts.length && finished && !s.flags.starter, `continued at ${s.info.x},${s.info.y} (saved ${saved.info.x},${saved.info.y}); starter flag after continue=${s.flags.starter}; ghost npcs=${JSON.stringify(ghosts)}; replay finished=${finished}`)
    await g.close()
  }
}

TESTS.anims = async () => {
  const g = await setup('anims', { spawn: 'home_door', flags: POST_RESCUE, party: [['glm', 9]], items: { prompt_orb: 10 } })
  await g.walkTo({ x: 16, y: 99 })
  await g.face('left')
  await g.frames('walk_right', 12, 50, () => g.holdUntil('right', { x: 18, y: 99 }))
  await g.frames('turns', 10, 60, async () => { for (const d of ['down', 'left', 'up', 'right']) { await g.tap(d); await sleep(90) } })
  await g.walkTo({ x: 21, y: 100 })
  await g.frames('run_up', 12, 50, async () => { await g.page.keyboard.down('x'); await g.holdUntil('up', { x: 21, y: 94 }); await g.page.keyboard.up('x') })
  // door enter / exit (home)
  await g.walkTo({ x: 13, y: 98 })
  await g.face('up')
  await g.frames('door_enter', 16, 60, () => g.holdUntil('up', { x: 13, y: 97 }))
  await g.waitIdle()
  await g.frames('door_exit', 16, 60, async () => { await g.walkTo({ x: 6, y: 7 }); await g.page.keyboard.down('ArrowDown'); await sleep(300); await g.page.keyboard.up('ArrowDown') })
  await g.waitIdle()
  // grass rustle + battle intro / attack / faint
  await g.walkTo({ x: 21, y: 75 })
  let got = false
  const seen = new Set()
  g.handlers = {
    planBattle: (s) => (g.encounters.length === 0 ? 'win' : 'catch'),
    battle: async (s, gg) => {
      const b = s.battle
      const n = g.encounters.length
      if (b.phase === 'intro' && !seen.has('intro' + n)) { seen.add('intro' + n); if (n === 0) await g.frames('battle_intro', 16, 90) }
      if (b.phase === 'command' && b.top && b.top.cls === 'Grid2x2' && !seen.has('atk' + n)) {
        seen.add('atk' + n)
        if (n === 0) {
          await g.pick(0, 'Battle', true)
          await g.waitBattleTop('Grid2x2', 'moves')
          const s2 = await g.snap()
          const mi = s2.battle.me.moves.findIndex((m) => m.power > 0)
          await g.frames('attack_hp_drain', 20, 70, () => g.pick(Math.max(0, mi), 'Battle', true))
          return true
        }
        if (n === 1) {
          await g.pick(1, 'Battle', true)
          await sleep(500)
          const s2 = await g.snap()
          const i = s2.battle.top.labels.findIndex((l) => /^Prompt Orb/.test(l))
          await g.frames('catch', 30, 110, () => g.pick(i, 'Battle'))
          return true
        }
      }
      if (b.phase === 'faint' && !seen.has('faint' + n)) { seen.add('faint' + n); await g.frames('faint', 10, 50) }
      return false
    },
  }
  for (let k = 0; k < 120 && g.encounters.length < 2; k++) {
    if (!got && k === 1) { got = true; await g.frames('grass_rustle', 12, 45, () => g.holdUntil('up', { x: 21, y: 72 })) }
    await g.walkTo({ x: 18 + (k % 2) * 6, y: 72 - (k % 3) }, { grassCost: 0 })
  }
  record('anim_strips', (g.strips || []).length >= 8, (g.strips || []).map((s) => `${s.name}(${s.files.length}f, dt≈${Math.round((s.t[s.t.length - 1] - s.t[0]) / Math.max(1, s.t.length - 1))}ms)`).join(', '))
  fs.writeFileSync(path.join(OUT, 'anims', 'strips.json'), JSON.stringify({ fast: false, quick: true, seed: SEED, starter: 'glm', strips: g.strips, beats: [] }, null, 1))
  await g.close()
}

async function main() {
  build()
  fs.mkdirSync(path.join(OUT, 'resize'), { recursive: true })
  const srv = await serve(DIST, PORT)
  browser = await chromium.launch()
  const names = ONLY ? ONLY.split(',') : Object.keys(TESTS)
  for (const n of names) {
    const t0 = Date.now()
    console.log(`\n### ${n}`)
    try { await TESTS[n]() } catch (e) { record(n, false, 'test crashed: ' + e.message.split('\n')[0]); console.error(e) }
    console.log(`   (${((Date.now() - t0) / 1000).toFixed(0)} s)`)
  }
  const file = path.join(OUT, `results${ONLY ? '_' + ONLY.replace(/,/g, '_') : ''}.json`)
  fs.writeFileSync(file, JSON.stringify(results, null, 1))
  await browser.close()
  srv.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
