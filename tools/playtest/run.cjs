#!/usr/bin/env node
// Full-slice autopilot: plays LLMMON Mythos from a fresh save to the end sign,
// saves, reloads and verifies Continue — with real key presses only.
// Read-only hooks used: __llmmon.info(), battleInfo(), starterInfo(), state (read).
//
//   node tools/playtest/run.cjs [--fast] [--seed N] [--starter glm|claude_fable|gpt_5_5]
//        [--dist DIR] [--port 5191] [--out DIR] [--until SEGMENT] [--no-build]
'use strict'
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { Game, serve, sleep } = require('./lib/game.cjs')

const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const GAME_FAST = args.includes('--fast')
const FAST = GAME_FAST || args.includes('--quick') // harness: skip reading pauses
const SEED = Number(arg('--seed', '7'))
const STARTER = arg('--starter', 'glm')
const ROOT = path.resolve(__dirname, '../..')
const DIST = path.resolve(arg('--dist', path.join(__dirname, 'out/dist')))
const PORT = Number(arg('--port', '5191'))
const OUT = path.resolve(arg('--out', path.join(__dirname, 'out', GAME_FAST ? 'run_fast' : FAST ? 'run_quick' : 'run')))
const UNTIL = arg('--until', null)

function build() {
  if (args.includes('--no-build') && fs.existsSync(path.join(DIST, 'index.html'))) return
  console.log('building snapshot →', DIST)
  execSync(`npx vite build --config tools/playtest/vite.playtest.config.mjs --outDir ${JSON.stringify(DIST)}`, { cwd: ROOT, stdio: 'inherit' })
}

/** onText hook: screenshot once when a dialogue line matches. */
function shootOn(g, pairs) {
  const done = new Set()
  return async (text) => {
    for (const [re, name] of pairs) {
      if (!done.has(name) && re.test(text)) { done.add(name); await g.shot(name, text.split(/\n|\f/)[0].slice(0, 38)) }
    }
  }
}
const pickLabel = (labels, re, dflt = 0) => { const i = labels.findIndex((l) => re.test(l)); return i >= 0 ? i : dflt }

async function main() {
  build()
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })
  const srv = await serve(DIST, PORT)
  const g = await Game.launch({ port: PORT, outDir: OUT, fast: GAME_FAST, quick: FAST, seed: SEED, starter: STARTER, query: 'new=1', dist: DIST })
  const tStart = Date.now()
  const checks = []
  const check = (ok, what, detail = '') => { checks.push({ ok, what, detail, seg: g.segment && g.segment.name }); console.log(`   ${ok ? 'PASS' : 'FAIL'} ${what} ${detail}`) }
  const musicIs = async (id, what) => { await sleep(FAST ? 100 : 600); const s = await g.snap(); check(s.music === id, `music ${id} ${what || ''}`, `(got ${s.music})`) }
  let stop = false
  const seg = async (name, fn) => {
    if (stop) return
    g.begin(name)
    try { await fn() } catch (e) {
      g.note('P0', `segment ${name} crashed the autopilot: ${e.message.split('\n')[0]}`)
      await g.shot('error_' + name).catch(() => {})
      console.error(e)
      stop = true
    }
    await g.end()
    if (UNTIL && name === UNTIL) stop = true
  }

  // ======================================================== title
  await seg('title', async () => {
    await g.page.waitForFunction(() => window.__ptSnap() && window.__ptSnap().title === 'press', null, { timeout: 20000 })
    await sleep(FAST ? 200 : 2500)
    await g.shot('title', 'Title: PRESS START')
    await musicIs('title')
    await g.press('A')
    await g.page.waitForFunction(() => { const s = window.__ptSnap(); return s.ui.top && s.ui.top.cls === 'ListMenu' }, null, { timeout: 5000 })
    await sleep(300)
    await g.shot('title_menu', 'Title menu')
    const s = await g.snap()
    check(!s.ui.top.labels.includes('CONTINUE'), 'fresh save: no CONTINUE')
    await g.pick(pickLabel(s.ui.top.labels, /NEW GAME/), 'UI')
  })

  // ======================================================== intro
  await seg('intro', async () => {
    await g.page.waitForFunction(() => window.__ptSnap().info.scenes.includes('Intro'), null, { timeout: 10000 })
    await musicIs('intro')
    const onText = shootOn(g, [
      [/^Hello there/, 'intro_prof'], [/creatures called LLMMON/, 'intro_mon'], [/Very low perplexity/, 'intro_named'], [/about to begin/, 'intro_player'],
    ])
    await g.drive((s) => s.info.scenes.includes('Overworld') && s.ui.dlg === 'waiting', {
      onText,
      choice: async (prompt, labels) => { await g.shot('intro_name', 'Name choice'); return pickLabel(labels, /^Maya$/) },
    })
  })

  // ======================================================== arrival cutscene
  await seg('arrival', async () => {
    await g.shot('arrival', 'Arrival: Mom by the truck')
    await musicIs('hayes_valley', 'on arrival')
    await g.drive((s) => s.info.map === 'home_1f' && !s.info.busy && !s.info.moving, {
      onText: shootOn(g, [[/This is Hayes Valley/, 'arrival_mom'], [/Ta-da! Home/, 'home_1f_mom']]),
    })
    const s = await g.snap()
    check(!!s.flags.arrived, 'flag arrived')
    await g.shot('home_1f', 'Home 1F after arrival')
    await musicIs('home', 'in house')
  })

  // ======================================================== home
  await seg('home_1f', async () => {
    await g.talkTo('mom')
    await g.shot('home_1f_room_hint', 'after talking to Mom')
    const m = g.map('home_1f')
    const seen = new Set()
    for (const o of m.objectsOfType('sign')) {
      if (seen.has(o.props.script)) continue
      seen.add(o.props.script)
      await g.readAt(o.tx, o.ty, { onText: o.props.script === 'home.tv' ? shootOn(g, [[/weather/, 'home_tv']]) : undefined })
    }
    await g.takeWarp('home_2f')
    await g.shot('home_2f', 'Home 2F')
  })
  await seg('home_2f', async () => {
    const pages = ['MOVING', 'TALKING', 'MENU', 'BATTLES', 'CLOSE']
    for (const p of pages) {
      await g.readAt(4, 2, {
        choice: async (prompt, labels) => { if (p === 'MOVING') await g.shot('notebook', 'Notebook pages'); return pickLabel(labels, new RegExp('^' + p)) },
        onText: shootOn(g, [[/HOW TO BE A TRAINER/, 'notebook_cover'], [/BATTLES: Wild/, 'notebook_battles']]),
      })
    }
    for (const [x, y] of [[3, 2], [1, 2], [5, 2], [1, 7], [7, 2]]) await g.readAt(x, y, { onText: shootOn(g, [[/47 browser tabs/, 'home_pc']]) })
    const s = await g.snap()
    check(!!s.flags.visited_2f, 'flag visited_2f')
    check(!!s.flags.read_notebook, 'flag read_notebook')
    await g.takeWarp('home_1f')
  })
  await seg('mom_lab_call', async () => {
    // the trigger sits one tile below the stairs spawn
    g.handlers = { onText: shootOn(g, [[/lab just called/, 'mom_lab_call']]) }
    await g.walkTo({ x: 10, y: 4 }, { onInterrupt: async () => 'stop' })
    await g.waitIdle()
    g.handlers = {}
    const s = await g.snap()
    check(!!s.flags.mom_lab_call, 'Mom lab call fired on the way down')
    if (!s.flags.mom_lab_call) { await g.talkTo('mom') }
    await g.takeWarp('overworld')
    await g.shot('hayes_outside', 'Hayes Valley, leaving home')
  })

  if (stop) return finish()
  require('./segments/world.cjs')({ g, seg, check, musicIs, shootOn, pickLabel, FAST, sleep, getStop: () => stop })
    .then(finish)

  async function finish() {
    await g.end()
    const total = Date.now() - tStart
    const res = {
      fast: GAME_FAST, quick: FAST, seed: SEED, starter: STARTER, totalMs: total, completed: !stop,
      segments: g.segments.map((s) => ({ name: s.name, ms: s.ms, music: [...new Set(s.audio.filter((a) => a.k === 'playMusic').map((a) => a.id))], sfx: countBy(s.audio.filter((a) => a.k === 'sfx').map((a) => a.id)) })),
      checks, notes: g.notes, encounters: g.encounters.map((e) => ({ ...e, last: undefined })), errors: g.errors.filter((e) => !/GL Driver Message|GPU stall/.test(e.s)),
      beats: g.beats.map((b) => ({ ...b, file: path.relative(OUT, b.file), file4: path.relative(OUT, b.file4) })), strips: g.strips || [], texts: g.texts || [],
    }
    fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(res, null, 1))
    console.log(`\nTOTAL ${(total / 60000).toFixed(1)} min, completed=${!stop}, checks failed=${checks.filter((c) => !c.ok).length}, errors=${res.errors.length}`)
    await g.close()
    srv.close()
  }
}
function countBy(a) { const o = {}; for (const x of a) o[x] = (o[x] || 0) + 1; return o }

main().catch((e) => { console.error(e); process.exit(1) })
