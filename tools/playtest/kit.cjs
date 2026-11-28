#!/usr/bin/env node
// ENGINE-F regression: plays the engine kit map (_kit / _kit_east, tools/maps/kitmap.py)
// with real key presses and checks every foundation: graph floor + autodiff, switches /
// gates / blocks / reset, statues + key + beams, ice / conveyor / spinner / one-way /
// teleport, letter tiles + budget counter, timer + rank, dark room + Dilate, the eight field
// skills, EVAL light NPC variants, interface tamper hooks + Probe meter, seamless map
// connection + snow footprints, notebook unlock, badge get + badge case, town map, travel
// cutscene, Attend, weather per zone, save/load of puzzle state, options.
//
//   node tools/playtest/kit.cjs [--no-build] [--dist DIR] [--port 5201] [--shots DIR] [--only name,name]
//
// Exit code 1 on any failed check or page error. Screenshots (3x device pixels, game at 1x)
// go to --shots (default tools/playtest/out/kit).
'use strict'
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { chromium } = require('playwright')
const { serve } = require('./lib/game.cjs')

const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const ROOT = path.resolve(__dirname, '../..')
const DIST = path.resolve(arg('--dist', path.join(__dirname, 'out/dist')))
const PORT = Number(arg('--port', '5201'))
const SHOTS = path.resolve(arg('--shots', path.join(__dirname, 'out/kit')))
const ONLY = arg('--only', '') ? arg('--only', '').split(',') : null
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const KEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', A: 'z', B: 'x', START: 'Escape', SELECT: 'c' }
const VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }

let fails = 0
const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
}

class Kit {
  constructor(page) {
    this.page = page
    this.errors = []
    page.on('pageerror', (e) => this.errors.push(`[pageerror] ${e.message}`))
    page.on('console', (m) => {
      const t = m.text()
      if (m.type() === 'error' && !/Failed to load resource|GL Driver/.test(t)) this.errors.push(`[console.error] ${t}`)
    })
  }

  ev(fn, a) { return this.page.evaluate(fn, a) }
  info() { return this.ev(() => window.__llmmon.info()) }
  pz(expr) { return this.ev((e) => { const ow = window.__llmmon.game.scene.getScene('Overworld'); return new Function('ow', 'pm', `return (${e})`)(ow, ow.puzzle) }, expr) }

  async boot(query = '') {
    await this.page.goto(`http://127.0.0.1:${PORT}/?debug=1&new=1&fast=1&seed=5&map=_kit${query}`)
    await this.page.waitForFunction(() => window.__llmmon && window.__llmmon.info().scenes.includes('Overworld') && !window.__llmmon.info().busy, null, { timeout: 30000 })
    await this.ev(() => {
      window.__llmmon.setFlag('debug_no_encounters')
      window.__llmmon.state.party[0].level = 40
    })
  }

  async idle(timeout = 8000) {
    await this.page.waitForFunction(() => { const i = window.__llmmon.info(); return !i.busy && !i.moving }, null, { timeout }).catch(() => {})
  }

  async tap(k, hold = 40) {
    await this.page.keyboard.down(KEY[k])
    await sleep(hold)
    await this.page.keyboard.up(KEY[k])
    await sleep(30)
  }

  /** Press A until the overworld is free (dialogs, yes/no defaults to YES on the first A). */
  async mash(max = 40, key = 'A') {
    for (let i = 0; i < max; i++) {
      const s = await this.info()
      if (!s.busy && !s.moving) return
      await this.tap(key)
      await sleep(60)
    }
  }

  /** One step (or bump) in a direction. */
  async step(d) {
    await this.idle()
    const before = await this.info()
    await this.page.keyboard.down(KEY[d])
    await this.page.waitForFunction((b) => { const i = window.__llmmon.info(); return i.moving || i.x !== b.x || i.y !== b.y || i.busy }, before, { timeout: 400 }).catch(() => {})
    await this.page.keyboard.up(KEY[d])
    await this.idle()
  }

  /** Turn in place (a short tap only turns when not already facing that way). */
  async face(d) {
    await this.idle()
    if ((await this.info()).facing === d) return
    await this.tap(d, 25)
    await this.idle()
  }

  /** Labels of the list menu on top of the UI stack (null if none yet). */
  menu() {
    return this.ev(() => {
      const top = window.__llmmon.game.scene.getScene('UI').stack.list.at(-1)
      return top && Array.isArray(top.items) ? top.items.map((i) => i.label) : null
    })
  }

  /** Wait for a list menu, move the cursor to `label` and press A. */
  async pick(label) {
    let items = null
    for (let i = 0; i < 60 && !(items = await this.menu()); i++) await sleep(50)
    if (!items) throw new Error(`no menu for ${label}`)
    const idx = items.indexOf(label)
    if (idx < 0) throw new Error(`no '${label}' in ${items.join(',')}`)
    const cur = await this.ev(() => window.__llmmon.game.scene.getScene('UI').stack.list.at(-1).index ?? 0)
    for (let i = 0; i < idx - cur; i++) await this.tap('down')
    for (let i = 0; i < cur - idx; i++) await this.tap('up')
    await this.tap('A')
    await sleep(60)
  }

  async walk(path) {
    for (const part of path.split(',')) {
      const [d, n] = part.trim().split(/\s+/)
      for (let i = 0; i < Number(n ?? 1); i++) await this.step(d)
    }
  }

  async tp(x, y, facing, map = '_kit') {
    await this.ev(([m, x, y]) => window.__llmmon.warp(m, x, y), [map, x, y])
    await sleep(80)
    await this.idle()
    if (facing) await this.face(facing)
  }

  /** BFS on the live collision (ow.blocked) and walk there. */
  async walkTo(x, y) {
    const dirs = await this.ev(([tx, ty]) => {
      const ow = window.__llmmon.game.scene.getScene('Overworld')
      const p = ow.player
      const V = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
      const seen = new Map([[`${p.tx},${p.ty}`, null]])
      const q = [[p.tx, p.ty]]
      while (q.length) {
        const [cx, cy] = q.shift()
        if (cx === tx && cy === ty) break
        for (const [d, [dx, dy]] of Object.entries(V)) {
          const nx = cx + dx
          const ny = cy + dy
          const k = `${nx},${ny}`
          if (seen.has(k) || ow.blocked(p, nx, ny)) continue
          const f = ow.puzzle && ow.puzzle.floorAt(nx, ny)
          if (f && (f.ice || f.conveyor || f.spinner || f.oneway)) continue
          if (ow.map.tileAt(nx, ny).ledge) continue
          seen.set(k, [cx, cy, d])
          q.push([nx, ny])
        }
      }
      const out = []
      let k = `${tx},${ty}`
      if (!seen.has(k)) return null
      while (seen.get(k)) {
        const [px, py, d] = seen.get(k)
        out.unshift(d)
        k = `${px},${py}`
      }
      return out
    }, [x, y])
    if (!dirs) throw new Error(`no path to ${x},${y}`)
    for (const d of dirs) await this.step(d)
  }

  async shot(name) {
    fs.mkdirSync(SHOTS, { recursive: true })
    await sleep(120)
    await this.page.screenshot({ path: path.join(SHOTS, `${name}.png`) })
  }

  async at(x, y) {
    const i = await this.info()
    return i.x === x && i.y === y
  }
}

// ------------------------------------------------------------------ the checks
const TESTS = {
  async graph(k) {
    await k.tp(21, 10)
    await k.tap('A')
    await sleep(150)
    await k.shot('graph_nudge')
    await k.tap('up')
    await sleep(80)
    await k.tap('up')
    await sleep(80)
    await k.tap('A')
    await k.mash()
    const r = await k.pz('({ out: pm.graph("g").value("o"), solved: !!pm.S.solved.g, gate: pm.resolve("g_gate"), ga: pm.graph("g").grad("a"), gb: pm.graph("g").grad("b"), gc: pm.graph("g").grad("c") })')
    check('graph: nudging c to 6 drives out to 0', r.out === 0, JSON.stringify(r))
    check('graph: solved → gate opens', r.solved && r.gate === true)
    check('graph: reverse-mode grads (da=b, db=a, dc=1)', r.ga === -3 && r.gb === 2 && r.gc === 1)
    check('graph: notebook page from onSolve script', await k.ev(() => window.__llmmon.state.flag('nb_kit_gradients')))
    await k.pz('pm.setShowGrad("g", true)')
    await k.tp(22, 8)
    await k.shot('graph_grads')
  },

  async switches(k) {
    await k.tp(36, 4, 'up')
    await k.step('up')
    check('toggle switch flips on entry, gate opens', await k.pz('pm.resolve("sw_t") === true && pm.resolve("gate_t") === true'))
    await k.tp(37, 6, 'right')
    await k.tap('right', 12) // push (holding on walks after the block and pushes again)
    await k.idle()
    await k.step('right')
    await k.tap('right', 12)
    await k.idle()
    const b = await k.pz('({ x: pm.ent("blk_w").x, w: pm.resolve("sw_w"), g: pm.resolve("gate_w") })')
    check('push block onto weight plate → gate opens', b.x === 40 && b.w === true && b.g === true, JSON.stringify(b))
    await k.tp(38, 10, 'up')
    await k.step('up')
    const m1 = await k.pz('pm.resolve("sw_m") && pm.resolve("gate_m")')
    await k.step('down')
    const m2 = await k.pz('({ sw: pm.resolve("sw_m"), gate: pm.resolve("gate_m") })')
    check('momentary switch: held opens, latched gate stays open', !!m1 && m2.sw === false && m2.gate === true, JSON.stringify(m2))
    await k.shot('switches')
    await k.walkTo(44, 10)
    await k.step('down')
    await sleep(300)
    await k.idle()
    const r = await k.pz('({ x: pm.ent("blk_w").x, t: pm.resolve("sw_t") })')
    check('reset pad restores blocks + switches', r.x === 38 && r.t === false, JSON.stringify(r))
  },

  async statues(k) {
    await k.tp(50, 8, 'down')
    await k.step('down')
    check('floor key picked up (carry K)', await k.pz('pm.S.carry === "K"'))
    await k.tp(52, 9, 'right')
    await k.tap('A')
    await k.mash()
    await k.tp(49, 5, 'up')
    await k.tap('A')
    await k.mash()
    check('statue gives its key Q', await k.pz('pm.S.carry === "Q"'))
    await k.tp(53, 4, 'up')
    await k.tap('A')
    await k.mash()
    const r = await k.pz('({ b: pm.resolve("st_b"), c: pm.resolve("st_c"), g: pm.resolve("gate_s") })')
    check('statues accept keys → beams + gate', r.b === true && r.c === true && r.g === true, JSON.stringify(r))
    await k.tp(53, 6)
    await k.shot('statues_beams')
  },

  async floors(k) {
    await k.tp(4, 21, 'up')
    await k.step('up')
    const ice = await k.info()
    check('ice: slides across and off the ice', ice.x === 4 && ice.y === 16, `${ice.x},${ice.y}`)
    await k.tp(10, 16, 'down')
    await k.step('down')
    await k.idle()
    const conv = await k.info()
    check('conveyor carries to its end', conv.x === 10 && conv.y === 23, `${conv.x},${conv.y}`)
    await k.tp(11, 18, 'right')
    await k.step('right')
    const sp = await k.info()
    check('spinner sends the player on', sp.x === 13 && sp.y === 18 && sp.facing === 'right', JSON.stringify(sp))
    await k.tp(14, 19, 'right')
    await k.step('right')
    check('one-way floor blocks entry from the side', await k.at(14, 19))
    await k.tp(15, 22, 'up')
    await k.step('up')
    check('one-way floor lets you in along the arrow', (await k.info()).y < 22)
    await k.tp(3, 24, 'down')
    await k.step('down')
    await k.idle()
    check('teleport pad', await k.at(15, 25))
    check('conditional floor: pit open while the switch is off', await k.pz('pm.floorAt(12, 23).gap === true'))
    await k.tp(12, 26, 'up')
    await k.step('up')
    check('conditional floor: toggle closes the pit', await k.pz('!pm.floorAt(12, 23).gap'))
    await k.tp(6, 24, 'right')
    await k.shot('floors')
  },

  async letters(k) {
    await k.tp(22, 17, 'down')
    await k.step('down')
    await k.step('right')
    await k.step('right')
    await k.mash()
    const r = await k.pz('({ w: pm.resolve("w.word"), c: pm.counterGet("surprise"), sp: pm.resolve("spelled"), g: pm.resolve("gate_l") })')
    check('letters spell CAT, SURPRISE counter, gate', r.w === 'CAT' && r.c === 3 && r.sp === true && r.g === true, JSON.stringify(r))
    const hud = await k.ev(() => window.__llmmon.game.scene.getScene('UI').hud.counters.map((c) => `${c.label} ${c.value}/${c.max}`))
    check('HUD counter "SURPRISE 3/12"', hud.includes('SURPRISE 3/12'), hud.join('|'))
    await k.shot('letters_budget')
    await k.tp(23, 24, 'right')
    await k.tap('A')
    await k.mash()
    const f = await k.pz('({ g: (pm.ents.find((e) => e.id === "fz_t+fz_o") || {}).glyph, gone: pm.ent("fz_t").gone })')
    check('fuse: letterpress blocks merge into "TO" (no skill needed)', f.g === 'TO' && f.gone === true, JSON.stringify(f))
  },

  async timer(k) {
    await k.tp(37, 16, 'down')
    await k.step('down')
    const started = await k.ev(() => window.__llmmon.game.scene.getScene('UI').hud.timers.length)
    check('timer starts on entering its area', started === 1)
    await k.shot('timer_running')
    await k.walkTo(44, 24)
    await k.step('down')
    await k.idle()
    const r = await k.pz('({ rank: pm.S.vars && pm.S.vars["run.rank"], ms: pm.S.timers && pm.S.timers.run })')
    check('timer stops on the goal switch with a rank', ['S', 'A', 'B', 'C'].includes(r.rank) && r.ms > 0, JSON.stringify(r))
  },

  async dark(k) {
    await k.tp(49, 17, 'down')
    let i = await k.info()
    check('dark zone: light radius 1', i.dark === true && i.lightTiles <= 1.5, JSON.stringify({ dark: i.dark, r: i.lightTiles }))
    await k.shot('dark_r1')
    await k.ev(() => window.__llmmon.setFlag('skill_dilate'))
    await k.tap('SELECT')
    await k.mash()
    await sleep(600)
    i = await k.info()
    check('Dilate: radius grows to 4', i.lightTiles >= 3.5, String(i.lightTiles))
    await k.shot('dark_dilate')
    await k.walkTo(52, 24)
    await k.face('down')
    await k.tap('A')
    await k.mash()
    check('Dilate reveals a hidden item', await k.ev(() => window.__llmmon.state.flag('kit_hidden_2')))
  },

  async skills(k) {
    // Backprop
    await k.tp(5, 34, 'up')
    await k.step('up')
    check('ledge blocks walking up without Backprop', await k.at(5, 34))
    await k.ev(() => { for (const s of ['backprop', 'sample', 'embed', 'normalize', 'chain', 'merge', 'attend']) window.__llmmon.setFlag(`skill_${s}`) })
    await k.step('up')
    await k.idle()
    check('Backprop: hop up the ledge', await k.at(5, 32))
    // Sample (grass zone; quick key SELECT picks it from context)
    await k.tp(5, 37, 'down')
    await k.tap('SELECT')
    await k.mash()
    check('Sample: next encounter pre-rolled', await k.pz('!!ow.skills.sampled'))
    await k.shot('sample')
    // Embed: like attracts like
    await k.tp(14, 32, 'down')
    await k.tap('A')
    await k.mash()
    const e = await k.pz('pm.ent("emb_a1").x')
    check('Embed: block slides to its own kind', e === 21, String(e))
    // Embed pull (no kin in line): block b1 at (18,37), player below at (18,38)? b2 is in line → slides
    await k.tp(19, 37, 'left')
    await k.tap('A')
    await k.mash()
    const b = await k.pz('({ x: pm.ent("emb_b1").x, y: pm.ent("emb_b1").y })')
    check('Embed: B block attracted to B (vertical)', b.x === 18 && b.y === 39, JSON.stringify(b))
    await k.shot('embed')
    // Normalize: raft across rough water
    await k.tp(28, 33, 'down')
    await k.tap('A')
    await k.mash()
    let i = await k.info()
    check('Normalize: on a raft on rough water', i.rafting && i.y === 34, JSON.stringify({ r: i.rafting, y: i.y }))
    await k.step('down')
    await k.shot('normalize_raft')
    await k.walk('down 3')
    i = await k.info()
    check('Normalize: step ashore drops the raft', !i.rafting && i.y === 38, JSON.stringify({ r: i.rafting, y: i.y }))
    // Chain Rule
    await k.tp(39, 33, 'down')
    await k.tap('A')
    await k.mash()
    check('Chain Rule: grapple over the gap to the anchor', await k.at(39, 36))
    // Merge → bridge
    await k.tp(44, 32, 'down')
    await k.tap('A')
    await k.mash()
    const m = await k.pz('({ o: pm.S.over, gone: pm.ent("bo_1").gone })')
    check('Merge: two boulders become a bridge', !!m.o && m.o['44,34'] === 'bridge' && m.o['44,35'] === 'bridge' && m.gone, JSON.stringify(m))
    await k.walk('down 4')
    check('Merge bridge is walkable', await k.at(44, 36))
    await k.shot('merge_bridge')
  },

  async eval(k) {
    await k.tp(50, 33, 'up')
    const n0 = await k.ev(() => window.__llmmon.info().npcs.filter((n) => n.id.startsWith('kit_eval_mon')).map((n) => `${n.id}:${n.hidden}`).join(','))
    await k.tap('A')
    await k.mash()
    const r = await k.ev(() => ({ on: window.__llmmon.state.flag('eval_light'), npcs: window.__llmmon.info().npcs.filter((n) => n.id.startsWith('kit_eval_mon')).map((n) => `${n.id}:${n.hidden}`).join(','), lamp: window.__llmmon.game.scene.getScene('UI').hud.lampOn }))
    check('EVAL light on (lamp lit)', r.on === true && r.lamp === true)
    check('creature swaps by light state (hideWhen/showWhen)', n0 === 'kit_eval_mon:false,kit_eval_mon_good:true' && r.npcs === 'kit_eval_mon:true,kit_eval_mon_good:false', `${n0} → ${r.npcs}`)
    await k.tp(51, 35, 'up')
    await k.tap('A')
    await sleep(200)
    const txt = await k.ev(() => window.__llmmon.info().dialogText)
    check('NPC evalText while watched', /always follow the rules/i.test(txt), txt)
    await k.shot('eval_on')
    await k.mash()
  },

  async tamper(k) {
    const term = async (label) => {
      await k.tp(55, 33, 'up')
      await k.tap('A')
      await k.pick(label)
    }
    await term('SCRAMBLE')
    await sleep(300)
    await k.shot('tamper_scramble')
    await k.tap('A')
    await k.pick('RESTORE')
    await k.tap('A')
    await k.pick('BYE')
    await k.idle()
    await term('RELABEL')
    await k.tap('A')
    await k.pick('BYE')
    await k.idle()
    await k.tap('START')
    await sleep(200)
    const labels = await k.menu()
    await k.shot('tamper_relabel_menu')
    const shown = await k.ev(() => window.__llmmon.game.scene.getScene('UI').children.list.filter((o) => o.type === 'BitmapText' && o.visible).map((o) => o.text))
    check('relabel: start menu shows SURRENDER', shown.includes('SURRENDER') && labels.includes('BAG'), shown.filter((t) => t.length > 2).slice(0, 10).join('|'))
    await k.tap('B')
    await k.idle()
    await term('FAKE METER')
    await sleep(200)
    await k.shot('tamper_meter_fake')
    await k.tap('SELECT')
    await sleep(300)
    await k.shot('tamper_meter_probe')
    const p = await k.ev(() => window.__llmmon.game.scene.getScene('UI').children.list.filter((o) => o.type === 'BitmapText').some((o) => /TRUE 28%/.test(o.text)))
    check('Probe reveals the true meter value', p)
    await k.tap('A')
    await k.pick('PROBE')
    await k.tap('A')
    await k.pick('GREY MENU')
    await k.tap('A')
    await k.pick('BYE')
    await k.idle()
    await k.tap('START')
    await sleep(200)
    await k.shot('tamper_grey_menu')
    await k.pick('BAG')
    await sleep(200)
    const still = await k.menu()
    check('greyed BAG entry does not open', Array.isArray(still) && still.includes('BAG'))
    await k.tap('B')
    await k.idle()
    await term('RESTORE')
    await k.tap('A')
    await k.pick('BYE')
    await k.idle()
    const t = await k.ev(() => ({ n: window.__llmmon.game.scene.getScene('UI').children.list.filter((o) => o.type === 'BitmapText').length }))
    check('tamper restore leaves the overworld free', !(await k.info()).busy, JSON.stringify(t))
  },

  async connection(k) {
    await k.tp(57, 13, 'right')
    await k.page.keyboard.down(KEY.right)
    await k.page.waitForFunction(() => window.__llmmon.info().map === '_kit_east', null, { timeout: 6000 }).catch(() => {})
    await sleep(500)
    await k.page.keyboard.up(KEY.right)
    await k.idle()
    const i = await k.info()
    check('seamless connection east → _kit_east', i.map === '_kit_east' && i.y === 13 && i.x >= 0 && i.x < 8, JSON.stringify({ m: i.map, x: i.x, y: i.y }))
    check('weather snow in Kit East', i.weather === 'snow')
    await k.walk('down 3, right 2')
    const fp = await k.pz('ow.footprints.length')
    check('snow footprints', fp >= 3, String(fp))
    await k.shot('connection_snow')
    await k.tp(1, 13, 'left', '_kit_east')
    await k.step('left')
    await k.step('left')
    await k.idle()
    const j = await k.info()
    check('walk back west into _kit', j.map === '_kit' && j.x === 59, JSON.stringify({ m: j.map, x: j.x }))
    await k.tp(58, 13, 'right')
    await k.shot('connection_edge_view')
  },

  async weather(k) {
    const zones = [['leaves', 5, 37], ['fog', 30, 32], ['rain', 53, 35], ['', 6, 7]]
    for (const [w, x, y] of zones) {
      await k.tp(x, y)
      const i = await k.info()
      check(`weather ${w || 'none'} at ${i.zone}`, i.weather === w, i.weather)
    }
    await k.tp(30, 32)
    await k.shot('weather_fog')
    await k.tp(53, 36)
    await k.shot('weather_rain')
    await k.tp(7, 24, 'right')
    await k.step('right')
    check('puddle splash particles', (await k.pz('ow.particles.length')) > 0)
  },

  async notebook_badges(k) {
    await k.ev(() => { const h = window.__llmmon.game.scene.getScene('UI').hud; window.__toasts = []; const f = h.toast.bind(h); h.toast = (t, i) => { window.__toasts.push(t); f(t, i) } })
    await k.tp(3, 10, 'up')
    await k.tap('A')
    await k.mash()
    const toast = (await k.ev(() => window.__toasts)).join('|')
    check('unlockPage: page found + toast', /NOTEBOOK/.test(toast) && await k.ev(() => window.__llmmon.state.flag('nb_kit_gradients')), toast)
    await k.tap('START')
    await sleep(150)
    const entries = await k.ev(() => window.__llmmon.game.scene.getScene('UI').stack.list.at(-1).items.map((i) => i.label))
    const ni = entries.indexOf('NOTEBOOK')
    check('start menu lists NOTEBOOK', ni >= 0, entries.join(','))
    for (let i = 0; i < ni; i++) await k.tap('down')
    await k.tap('A')
    await sleep(500)
    await k.shot('notebook_list')
    await k.tap('A')
    await sleep(150)
    await k.shot('notebook_page')
    await k.tap('B')
    await k.tap('right')
    await sleep(100)
    await k.shot('notebook_safety_tab')
    await k.tap('B')
    await sleep(400)
    await k.tap('B')
    await k.idle()
    // badges (not ?fast: watch the badge scene)
    await k.page.goto(`http://127.0.0.1:${PORT}/?debug=1&new=1&seed=5&map=_kit&x=9&y=5`)
    await k.page.waitForFunction(() => window.__llmmon && window.__llmmon.info().scenes.includes('Overworld') && !window.__llmmon.info().busy, null, { timeout: 30000 })
    await k.face('up')
    await k.tap('A')
    await sleep(900)
    await k.tap('A')
    await sleep(1500)
    await k.shot('badge_get')
    for (let i = 0; i < 30; i++) {
      const s = await k.info()
      if (!s.busy) break
      await k.tap('A')
      await sleep(250)
    }
    check('giveBadge sets badge_gradient', await k.ev(() => window.__llmmon.state.flag('badge_gradient')))
    await k.ev(() => { for (const b of ['likelihood', 'embedding', 'chain', 'merge']) window.__llmmon.state.setFlag(`badge_${b}`) })
    await k.tap('START')
    await k.pick(await k.ev(() => window.__llmmon.state.playerName.toUpperCase()))
    await sleep(700)
    await k.shot('card_front')
    await k.tap('A')
    await sleep(700)
    await k.shot('card_badge_case')
    await k.tap('B')
    await sleep(500)
    await k.tap('B')
    await sleep(500)
    await k.boot()
  },

  async travel(k) {
    await k.tp(10, 9, 'right')
    await k.tap('A')
    await sleep(100)
    await k.tap('A') // TRAIN EAST
    await k.mash()
    await k.page.waitForFunction(() => window.__llmmon.info().map === '_kit_east', null, { timeout: 8000 }).catch(() => {})
    await k.idle()
    const i = await k.info()
    check('travelCutscene(train) arrives in Kit East', i.map === '_kit_east', i.map)
    // Town map (guide) + Attend back to Kit Plaza
    await k.ev(() => { window.__llmmon.setFlag('skill_attend'); window.__llmmon.giveItem('town_map', 1) })
    await k.tap('START')
    await sleep(150)
    const entries = await k.ev(() => window.__llmmon.game.scene.getScene('UI').stack.list.at(-1).items.map((x) => x.label))
    const ti = entries.indexOf('TOWN MAP')
    check('start menu lists TOWN MAP (item town_map)', ti >= 0, entries.join(','))
    for (let n = 0; n < ti; n++) await k.tap('down')
    await k.tap('A')
    await sleep(500)
    await k.shot('town_map')
    await k.tap('B')
    await sleep(400)
    await k.tap('B')
    await k.idle()
    // FIELD → ATTEND
    await k.tap('START')
    await k.pick('FIELD')
    await sleep(100)
    await k.shot('field_menu')
    await k.pick('ATTEND')
    await k.pick('USE')
    await sleep(500)
    await k.shot('attend_map')
    // pick Kit Plaza: cursor starts on the current town; move until the name matches
    for (let n = 0; n < 6; n++) {
      const nm = await k.ev(() => { const top = window.__llmmon.game.scene.getScene('UI').stack.list.at(-1); return top.cursor && top.cursor.id })
      if (nm === 'kit_plaza') break
      await k.tap('left')
      await sleep(80)
    }
    await k.tap('A')
    await k.page.waitForFunction(() => window.__llmmon.info().map === '_kit', null, { timeout: 8000 }).catch(() => {})
    await k.mash()
    const j = await k.info()
    check('Attend flies back to Kit Plaza', j.map === '_kit' && j.x === 6 && j.y === 7, JSON.stringify({ m: j.map, x: j.x, y: j.y }))
  },

  /** Real-speed visuals (no ?fast): badge-get scene, travel cards, skill cut-in, options. */
  async visuals(k) {
    await k.page.goto(`http://127.0.0.1:${PORT}/?debug=1&new=1&seed=5&map=_kit&x=6&y=7`)
    await k.page.waitForFunction(() => window.__llmmon && window.__llmmon.info().scenes.includes('Overworld') && !window.__llmmon.info().busy, null, { timeout: 30000 })
    const ui = 'window.__llmmon.game.scene.getScene("UI")'
    await k.ev((u) => { window.__done = false; new Function(`return ${u}`)().badgeGet('wave', 'van den Oord').then(() => { window.__done = true }) }, ui)
    await sleep(900)
    await k.shot('vis_badge_spin')
    await sleep(900)
    await k.shot('vis_badge_landed')
    for (let i = 0; i < 20 && !(await k.ev(() => window.__done)); i++) { await k.tap('A'); await sleep(300) }
    for (const kind of ['train', 'plane', 'ferry']) {
      await k.ev(([u, kd]) => { window.__done = false; const x = new Function(`return ${u}`)(); x.travelCard(kd, 'Kit Plaza', 'Kit East').then(() => x.fade(0, 100)).then(() => { window.__done = true }) }, [ui, kind])
      await sleep(1900)
      await k.shot(`vis_travel_${kind}`)
      await k.page.waitForFunction(() => window.__done, null, { timeout: 8000 })
    }
    await k.ev(() => { window.__done = false; window.__llmmon.game.scene.getScene('Overworld').skills.cutIn('merge').then(() => { window.__done = true }) })
    await sleep(380)
    await k.shot('vis_skill_cutin')
    await k.page.waitForFunction(() => window.__done, null, { timeout: 5000 })
    await k.tap('START')
    await k.pick('OPTIONS')
    await sleep(400)
    await k.shot('vis_options')
    for (let i = 0; i < 5; i++) await k.tap('down')
    await k.tap('A')
    await sleep(400)
    await k.shot('vis_controls')
    // pause on blur (opted in with ?pausetest=1 under webdriver)
    await k.page.goto(`http://127.0.0.1:${PORT}/?debug=1&new=1&seed=5&map=_kit&x=6&y=7&pausetest=1`)
    await k.page.waitForFunction(() => window.__llmmon && window.__llmmon.info().scenes.includes('Overworld') && !window.__llmmon.info().busy, null, { timeout: 30000 })
    await k.ev(() => window.dispatchEvent(new Event('blur')))
    await sleep(400)
    await k.shot('vis_paused')
    const slept = await k.ev(() => window.__llmmon.game.loop.running === false)
    await k.tap('A')
    await sleep(300)
    const woke = await k.ev(() => window.__llmmon.game.loop.running && !window.__llmmon.info().busy)
    check('pause on window blur, resume on a key', slept === true && woke === true, JSON.stringify({ slept, woke }))
    check('visuals captured', true)
    await k.boot()
  },

  async save(k) {
    await k.tp(36, 4, 'up')
    await k.step('up')
    const r = await k.ev(() => {
      const L = window.__llmmon
      L.state.save()
      const raw = JSON.parse(localStorage.getItem('llmmon_mythos_save_v1'))
      return { has: !!(raw.mapState && raw.mapState._kit && raw.mapState._kit.sw && raw.mapState._kit.sw.sw_t), ok: L.state.load() }
    })
    check('puzzle state saved + save reloads (readSave → migrateSave)', r.has && r.ok, JSON.stringify(r))
  },

  async options(k) {
    const r = await k.ev(() => {
      const ow = window.__llmmon.game.scene.getScene('Overworld')
      return { hasRun: typeof ow.running === 'function' }
    })
    check('options: run toggle wired', r.hasRun)
  },
}

;(async () => {
  if (!args.includes('--no-build') || !fs.existsSync(path.join(DIST, 'index.html'))) {
    execSync(`npx vite build --config tools/playtest/vite.playtest.config.mjs --outDir ${JSON.stringify(DIST)} --logLevel warn`, { cwd: ROOT, stdio: 'inherit' })
  }
  const server = await serve(DIST, PORT)
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 240, height: 160 }, deviceScaleFactor: 3 })
  const k = new Kit(page)
  for (const [name, fn] of Object.entries(TESTS)) {
    if (ONLY && !ONLY.includes(name)) continue
    await k.boot()
    try {
      await fn(k)
    } catch (e) {
      check(`${name} (threw)`, false, e.message.split('\n')[0])
      await k.shot(`error_${name}`).catch(() => {})
    }
  }
  check('no page errors', k.errors.length === 0, k.errors.slice(0, 5).join(' | '))
  await browser.close()
  server.close()
  console.log(`\n${results.length - fails}/${results.length} passed. Screenshots: ${SHOTS}`)
  process.exit(fails ? 1 : 0)
})()
