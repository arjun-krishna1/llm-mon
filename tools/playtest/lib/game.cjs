// Autopilot: drives the real game in Chromium with real key presses.
// Reads state only through window.__llmmon.info()/battleInfo()/starterInfo()
// and read-only introspection of the UI widget stacks; never mutates state.
'use strict'
const fs = require('fs')
const path = require('path')
const http = require('http')
const { chromium } = require('playwright')
const { loadMap, findPath, DIRS } = require('./maps.cjs')

const KEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', A: 'z', B: 'x', START: 'Escape' }
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' }

// ------------------------------------------------------------------ static server
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.tmj': 'application/json', '.tsj': 'application/json', '.svg': 'image/svg+xml', '.xml': 'text/xml', '.fnt': 'text/plain' }
function serve(dir, port) {
  return new Promise((res, rej) => {
    const srv = http.createServer((req, resp) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
      if (p.endsWith('/')) p += 'index.html'
      const f = path.join(dir, p)
      if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { resp.writeHead(404); resp.end('404'); return }
      resp.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' })
      fs.createReadStream(f).pipe(resp)
    })
    srv.on('error', rej)
    srv.listen(port, '127.0.0.1', () => res(srv))
  })
}

// ------------------------------------------------------------------ in-page probe
const PROBE = () => {
  const topOf = (stack) => {
    const l = stack && stack.list
    if (!l || !l.length) return null
    const w = l[l.length - 1]
    const o = { cls: w.constructor && w.constructor.name, depth: l.length }
    if (Array.isArray(w.items)) o.labels = w.items.map((i) => i.label)
    if (w.o && Array.isArray(w.o.labels)) o.labels = w.o.labels.slice()
    if (Array.isArray(w.moves)) o.labels = w.moves.map((m) => m && (m.name || m.id))
    if (typeof w.index === 'number') o.index = w.index
    if (w.ids && Array.isArray(w.ids)) o.ids = w.ids.slice()
    if (w.list && Array.isArray(w.list.items)) { o.labels = w.list.items.map((i) => i.label); o.index = w.list.index }
    return o
  }
  window.__ptSnap = () => {
    const L = window.__llmmon
    if (!L) return null
    const g = L.game
    const ui = g.scene.getScene('UI')
    const active = (k) => g.scene.isActive(k)
    const info = L.info()
    const out = {
      t: Math.round(performance.now()),
      info,
      ui: ui && ui.dialog ? { dlg: ui.dialog.phase, text: ui.dialog.currentText || '', top: topOf(ui.stack), menuOpen: !!ui.menuOpen } : null,
      battle: null,
      starter: null,
      music: window.__llmmonAudio ? window.__llmmonAudio.currentMusic() : null,
      money: L.state.money,
      flags: { ...L.state.flags },
      party: L.state.party.map((m) => ({ id: m.speciesId, lv: m.level, hp: m.hp, max: m.maxHp ?? m.stats?.hp, moves: (m.moves || []).map((x) => x.id) })),
      bag: { ...L.state.bag },
      title: active('Title') ? (g.scene.getScene('Title').phase || 'x') : null,
    }
    if (active('Battle') && L.battleInfo) {
      const b = L.battleInfo()
      const sc = g.scene.getScene('Battle')
      out.battle = { phase: b.phase, text: b.text, box: b.box, prompt: b.prompt, outcome: b.outcome, top: topOf(sc.stack),
        me: b.view && b.view.player && { name: b.view.player.name, hp: b.view.player.hp, maxHp: b.view.player.maxHp, lv: b.view.player.level, moves: (b.view.player.moves || []).map((m) => ({ name: m.name, pp: m.pp, power: m.power, type: m.type, id: m.id })) },
        foe: b.view && b.view.enemy && { name: b.view.enemy.name, hp: b.view.enemy.hp, maxHp: b.view.enemy.maxHp, lv: b.view.enemy.level, id: b.view.enemy.speciesId },
        canRun: b.view && b.view.canRun, canCatch: b.view && b.view.canCatch, kind: b.view && b.view.kind }
    }
    if (active('StarterSelect') && L.starterInfo) out.starter = L.starterInfo()
    return out
  }
  /** Capture n native-resolution frames, one every `everyMs`, via the renderer. */
  window.__ptFrames = (n, everyMs) => new Promise((resolve) => {
    const r = window.__llmmon.game.renderer
    const shots = []
    const t0 = performance.now()
    let i = 0
    const take = () => {
      r.snapshot((img) => {
        shots.push({ t: Math.round(performance.now() - t0), src: img.src })
        i++
        if (i >= n) resolve(shots)
        else setTimeout(take, Math.max(0, t0 + i * everyMs - performance.now()))
      })
    }
    take()
  })
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

class Game {
  constructor(page, opts) {
    this.page = page
    this.o = opts
    this.fast = !!opts.fast
    this.out = opts.outDir
    this.beats = []
    this.logs = []
    this.errors = []
    this.shotN = 0
    this.encounters = []
    this.notes = []
    this.segment = null
    this.segments = []
    this.handlers = {}
    this.mapCache = {}
    page.on('console', (m) => {
      const s = `[${m.type()}] ${m.text()}`
      this.logs.push({ t: Date.now(), seg: this.segment && this.segment.name, s })
      if (m.type() === 'error' || m.type() === 'warning') this.errors.push({ seg: this.segment && this.segment.name, s })
    })
    page.on('pageerror', (e) => this.errors.push({ seg: this.segment && this.segment.name, s: `[pageerror] ${e.message}\n${(e.stack || '').split('\n').slice(0, 4).join('\n')}` }))
  }

  static async launch(o) {
    const browser = o.browser || await chromium.launch()
    const ctx = await browser.newContext({ viewport: o.viewport || { width: 960, height: 640 }, deviceScaleFactor: 1 })
    const page = await ctx.newPage()
    await page.addInitScript(PROBE)
    const g = new Game(page, o)
    g.browser = browser
    g.ctx = ctx
    fs.mkdirSync(o.outDir, { recursive: true })
    await g.goto(o.query || '')
    return g
  }

  async goto(query) {
    const base = `http://127.0.0.1:${this.o.port}/`
    const params = new URLSearchParams(query)
    params.set('debug', '1')
    if (this.fast) params.set('fast', '1')
    if (this.o.seed != null && !params.has('seed')) params.set('seed', String(this.o.seed))
    await this.page.goto(base + '?' + params.toString())
    await this.page.waitForFunction(() => window.__llmmon && window.__ptSnap, null, { timeout: 20000 })
  }

  async close() { await this.ctx.close(); if (!this.o.browser) await this.browser.close() }

  // ---------------------------------------------------------------- state
  snap() { return this.page.evaluate(() => window.__ptSnap()) }
  async info() { return (await this.snap()).info }
  map(id) { return loadMap(id) }

  // ---------------------------------------------------------------- input
  async press(btn, ms = 50) {
    const k = KEY[btn] || btn
    await this.page.keyboard.down(k)
    await sleep(ms)
    await this.page.keyboard.up(k)
    await sleep(35)
  }
  async tap(btn) { return this.press(btn, 30) }
  /** Time a first-time player spends reading a fully typed box. */
  readMs(text) {
    if (this.fast) return 40
    const n = (text || '').length
    return Math.min(4200, 350 + n * 28)
  }

  // ---------------------------------------------------------------- segments / evidence
  begin(name) {
    this.end()
    this.segment = { name, t0: Date.now(), shots: [], music: new Set(), sfx: {} }
    this.audioMark = 0
    console.log(`\n== ${name}`)
  }
  async end() {
    if (!this.segment) return
    const s = this.segment
    s.ms = Date.now() - s.t0
    try {
      const log = await this.page.evaluate(() => (window.__audioLog || []).splice(0))
      s.audio = log
    } catch { s.audio = [] }
    this.segments.push({ name: s.name, ms: s.ms, shots: s.shots, audio: s.audio })
    console.log(`   (${(s.ms / 1000).toFixed(1)} s)`)
    this.segment = null
  }
  note(sev, text, extra = {}) {
    const n = { sev, text, seg: this.segment && this.segment.name, ...extra }
    this.notes.push(n)
    console.log(`   NOTE[${sev}] ${text}`)
  }

  /** 4x canvas capture + true 1x framebuffer snapshot. */
  async shot(name, label) {
    const n = String(++this.shotN).padStart(3, '0')
    const base = `${n}_${name}`
    const canvas = await this.page.$('canvas')
    const p4 = path.join(this.out, `${base}_4x.png`)
    await canvas.screenshot({ path: p4 })
    const src = await this.page.evaluate(() => new Promise((r) => window.__llmmon.game.renderer.snapshot((img) => r(img.src))))
    const p1 = path.join(this.out, `${base}_1x.png`)
    fs.writeFileSync(p1, Buffer.from(src.split(',')[1], 'base64'))
    const s = await this.snap()
    const beat = { file: p1, file4: p4, name, label: label || name, seg: this.segment && this.segment.name, map: s.info.map, x: s.info.x, y: s.info.y, music: s.music, t: Date.now() }
    this.beats.push(beat)
    if (this.segment) this.segment.shots.push(beat)
    return beat
  }

  /** n frames at `every` ms from the renderer, saved as name_fNN.png (1x). Optionally run `action` concurrently. */
  async frames(name, n = 8, every = 50, action) {
    const pr = this.page.evaluate(([n, e]) => window.__ptFrames(n, e), [n, every])
    if (action) await sleep(5).then(action)
    const shots = await pr
    const files = shots.map((s, i) => {
      const f = path.join(this.out, `strip_${name}_f${String(i).padStart(2, '0')}.png`)
      fs.writeFileSync(f, Buffer.from(s.src.split(',')[1], 'base64'))
      return f
    })
    this.strips = this.strips || []
    this.strips.push({ name, files, t: shots.map((s) => s.t) })
    return files
  }

  // ---------------------------------------------------------------- generic driver
  /**
   * Service dialogs/menus/battles until `until(snap)` is true.
   * handlers: { choice(prompt, labels, snap) → index|null, battle(snap) → keys handled, starter(snap) }
   */
  async drive(until, h = {}, timeout = 180000) {
    const H = { ...this.handlers, ...h }
    const t0 = Date.now()
    let lastText = null
    let lastKey = ''
    let still = 0
    while (Date.now() - t0 < timeout) {
      const s = await this.snap()
      if (until(s)) return s
      const key = JSON.stringify([s.info.busy, s.ui && s.ui.dlg, s.ui && s.ui.text, s.ui && s.ui.top, s.battle && [s.battle.phase, s.battle.box, s.battle.text, s.battle.top], s.starter, s.info.x, s.info.y, s.info.map, s.title])
      if (key === lastKey) still++
      else { still = 0; lastKey = key }
      if (still > 600) throw new Error('drive: no progress for a long time; snap=' + JSON.stringify(summ(s)))
      if (s.battle) {
        await this.battleStep(s, H)
      } else if (s.starter) {
        await this.starterStep(s, H)
      } else if (s.ui && s.ui.top && s.ui.top.cls === 'ListMenu') {
        const idx = H.choice ? await H.choice(s.ui.text, s.ui.top.labels, s) : 0
        await this.pick(idx == null ? 0 : idx, 'UI')
      } else if (s.ui && s.ui.dlg === 'waiting') {
        if (s.ui.text !== lastText) {
          lastText = s.ui.text
          if (H.onText) await H.onText(s.ui.text, s)
          this.textLog(s.ui.text)
          await sleep(this.readMs(s.ui.text))
        }
        await this.press('A')
        await sleep(60)
      } else if (s.ui && s.ui.top && /Screen|PlayerCard/.test(s.ui.top.cls || '')) {
        if (H.screen) await H.screen(s)
        else await this.press('B')
      } else {
        await sleep(30)
      }
    }
    throw new Error('drive timeout')
  }
  textLog(t) {
    this.texts = this.texts || []
    this.texts.push({ seg: this.segment && this.segment.name, t })
    console.log('   > ' + t.replace(/\n/g, ' / ').replace(/\f/g, ' // '))
  }
  waitIdle(h, timeout) { return this.drive((s) => !s.battle && !s.starter && !s.info.busy && !s.info.moving && s.info.scenes.includes('Overworld'), h, timeout) }

  /** Move a list/grid cursor in scene `where` ('UI' | 'Battle') to `idx` and press A. */
  async pick(idx, where = 'UI', grid = false) {
    for (let i = 0; i < 20; i++) {
      const s = await this.snap()
      const top = where === 'Battle' ? s.battle && s.battle.top : s.ui && s.ui.top
      if (!top || typeof top.index !== 'number') { await sleep(40); continue }
      if (top.index === idx) {
        await sleep(this.fast ? 20 : 250)
        await this.press('A')
        return
      }
      if (grid) {
        const [r0, c0] = [Math.floor(top.index / 2), top.index % 2]
        const [r1, c1] = [Math.floor(idx / 2), idx % 2]
        await this.press(r1 !== r0 ? (r1 > r0 ? 'down' : 'up') : (c1 > c0 ? 'right' : 'left'))
      } else {
        await this.press(idx > top.index ? 'down' : 'up')
      }
      await sleep(this.fast ? 20 : 110)
    }
    throw new Error(`pick(${idx}) failed in ${where}`)
  }

  // ---------------------------------------------------------------- battle
  /** Default battle policy: strongest damaging move with PP. Override via handlers.battle. */
  async battleStep(s, H) {
    const b = s.battle
    if (H.battle) { const r = await H.battle(s, this); if (r === true) return }
    const top = b.top || {}
    if (b.phase === 'command' && top.cls === 'Grid2x2') {
      const plan = H.battleAction ? await H.battleAction(s) : { action: 'fight' }
      if (plan.action === 'fight') {
        await this.pick(0, 'Battle', true)
        await this.waitBattleTop('Grid2x2', 'moves')
        const s2 = await this.snap()
        const mi = plan.move ?? bestMove(s2.battle)
        await this.pick(mi, 'Battle', true)
      } else if (plan.action === 'run') {
        await this.pick(3, 'Battle', true)
      } else if (plan.action === 'bag') {
        await this.pick(1, 'Battle', true)
        this.pendingBag = plan
      } else if (plan.action === 'party') {
        await this.pick(2, 'Battle', true)
        this.pendingParty = plan
      }
      await sleep(80)
      return
    }
    if ((b.phase === 'bag' || b.phase === 'bag-party') && top.cls) {
      await sleep(this.fast ? 40 : 400)
      const plan = this.pendingBag || {}
      if (b.phase === 'bag' && top.labels) {
        const want = top.labels.findIndex((l) => plan.item && l.toLowerCase().startsWith(plan.item.toLowerCase()))
        if (want >= 0) await this.pick(want, 'Battle')
        else await this.press('B')
      } else if (b.phase === 'bag-party' || top.cls === 'PartyScreen') {
        await this.press('A')
        await sleep(200)
        const s2 = await this.snap()
        if (s2.battle && s2.battle.top && s2.battle.top.cls === 'ListMenu') await this.press('A')
        this.pendingBag = null
      }
      return
    }
    if ((b.phase === 'party') && top.cls === 'PartyScreen') {
      const plan = this.pendingParty || {}
      const want = plan.index ?? firstAlive(s, top.index)
      if (top.index !== want) { await this.press(want > top.index ? 'down' : 'up'); return }
      await sleep(this.fast ? 40 : 400)
      await this.press('A')
      await sleep(200)
      const s2 = await this.snap()
      // party submenu (SWITCH / SUMMARY / CANCEL)
      if (s2.battle && s2.battle.top && s2.battle.top.cls === 'ListMenu') {
        const i = s2.battle.top.labels.findIndex((l) => /SWITCH|SHIFT|SEND/i.test(l))
        await this.pick(i >= 0 ? i : 0, 'Battle')
      }
      this.pendingParty = null
      return
    }
    if (top.cls === 'ListMenu' && /^learn/.test(b.phase)) {
      const ans = H.learn ? await H.learn(s) : { forget: true }
      if (b.phase === 'learn-yesno') await this.pick(ans.forget ? 0 : 1, 'Battle')
      else if (b.phase === 'learn-stop') await this.pick(0, 'Battle')
      else await this.pick(0, 'Battle')
      return
    }
    if (top.cls === 'ForgetMoveScreen') {
      const ans = H.learn ? await H.learn(s) : { slot: 0 }
      const slot = ans.slot ?? 0
      if ((top.index ?? 0) !== slot) { await this.press(slot > top.index ? 'down' : 'up'); await sleep(80); return }
      await sleep(this.fast ? 40 : 600)
      await this.press('A')
      return
    }
    if (top.cls === 'ListMenu') { // some other yes/no
      await sleep(this.fast ? 30 : 400)
      await this.press('A')
      return
    }
    if ((b.box === 'waiting' && b.phase !== 'command') || top.cls === 'WaitA' || b.phase === 'levelup') {
      if (b.text !== this.lastBattleText) {
        this.lastBattleText = b.text
        this.textLog('[battle] ' + b.text)
        if (H.onBattleText) await H.onBattleText(b.text, s)
        await sleep(this.fast ? 30 : Math.min(2200, 300 + (b.text || '').length * 22))
      } else await sleep(60)
      await this.press('A')
      return
    }
    await sleep(25)
  }
  async waitBattleTop(cls, phase, timeout = 5000) {
    const t0 = Date.now()
    while (Date.now() - t0 < timeout) {
      const s = await this.snap()
      if (s.battle && s.battle.phase === phase && s.battle.top && s.battle.top.cls === cls) return s
      await sleep(30)
    }
    throw new Error('waitBattleTop ' + cls + ' ' + phase)
  }

  // ---------------------------------------------------------------- starter select
  async starterStep(s, H) {
    const st = s.starter
    const want = H.starterId || this.o.starter || 'glm'
    if (st.phase === 'browse') {
      const ids = ['claude_fable', 'gpt_5_5', 'glm']
      const wi = ids.indexOf(want)
      if (st.index !== wi) {
        if (H.onStarterBrowse) await H.onStarterBrowse(s)
        await sleep(this.fast ? 40 : 900)
        await this.press(wi > st.index ? 'right' : 'left')
        await sleep(this.fast ? 40 : 600)
        return
      }
      await sleep(this.fast ? 40 : 1200)
      await this.press('A')
      await sleep(150)
      return
    }
    if (st.phase === 'confirm') {
      const s2 = await this.snap()
      const top = s2.starter && s2.starter.phase === 'confirm'
      if (H.onStarterConfirm && !this.confirmShot) { this.confirmShot = true; await H.onStarterConfirm(s2) }
      await sleep(this.fast ? 40 : 800)
      // YES/NO menu lives on the starter scene's stack; YES is index 0 and the default
      await this.page.keyboard.press('z')
      await sleep(200)
      return top
    }
    await sleep(40)
  }

  // ---------------------------------------------------------------- walking
  blockersFn(s, map, extra = []) {
    const npcs = (s.info.npcs || []).filter((n) => !n.hidden)
    const items = map.objectsOfType('item').filter((o) => !o.props.hidden && !s.flags[o.props.flag || `item_${map.id}_${o.id}`])
    const props = map.objectsOfType('prop').filter((o) => {
      const p = o.props
      if (p.solid === false) return false
      if (p.hideIfFlag && s.flags[p.hideIfFlag]) return false
      if (p.showIfFlag && !s.flags[p.showIfFlag]) return false
      return true
    })
    return (x, y) => npcs.some((n) => n.x === x && n.y === y) || items.some((o) => o.tx === x && o.ty === y) ||
      props.some((o) => x >= o.tx && y >= o.ty && x < o.tx + o.tw && y < o.ty + o.th) || extra.some((e) => e.x === x && e.y === y)
  }

  /**
   * Walk to a tile (or to any tile satisfying goal) on the current map.
   * opts: run, grassCost (default 4: prefer paths outside grass), avoid (Set "x,y"), stopOnInterrupt
   */
  async walkTo(goal, opts = {}) {
    const goalFn = typeof goal === 'function' ? goal : (x, y) => x === goal.x && y === goal.y
    const startMap = (await this.info()).map
    for (let attempt = 0; attempt < 60; attempt++) {
      let s = await this.snap()
      if (s.info.busy || s.battle || s.starter) {
        if (opts.stopOnInterrupt) return { interrupted: true, snap: s }
        s = await this.waitIdle()
        if (opts.onInterrupt) { const r = await opts.onInterrupt(s); if (r === 'stop') return { interrupted: true } }
      }
      if (s.info.map !== startMap) return { mapChanged: true, snap: s }
      if (goalFn(s.info.x, s.info.y)) return { ok: true, snap: s }
      const map = this.map(s.info.map)
      const path = findPath(map, { x: s.info.x, y: s.info.y }, goalFn, {
        blocked: this.blockersFn(s, map, opts.extraBlock), grassCost: opts.grassCost ?? 4, avoid: opts.avoid,
      })
      if (!path) {
        // maybe an NPC blocks the only way: wait a bit
        if (attempt > 8) throw new Error(`no path on ${map.id} from ${s.info.x},${s.info.y}`)
        await sleep(400)
        continue
      }
      // take the first straight run (hops alone)
      const first = path[0]
      let n = 1
      if (!first.hop) while (n < path.length && path[n].dir === first.dir && !path[n].hop && n < (opts.maxRun || 6)) n++
      const target = path[n - 1].to
      const res = await this.holdUntil(first.dir, target, opts.run && !map.props.indoor && s.flags.has_run)
      if (res === 'interrupted' && opts.stopOnInterrupt) return { interrupted: true }
    }
    throw new Error('walkTo: too many attempts')
  }

  /** Hold a direction until the player's logical tile equals target (or something interrupts). */
  async holdUntil(dir, target, run = false) {
    const k = KEY[dir]
    if (run) await this.page.keyboard.down('x')
    await this.page.keyboard.down(k)
    let result = 'ok'
    try {
      const t0 = Date.now()
      let last = null
      let lastMove = Date.now()
      for (;;) {
        const i = await this.page.evaluate(() => { const i = window.__llmmon.info(); return { x: i.x, y: i.y, map: i.map, busy: i.busy, moving: i.moving, b: window.__llmmon.game.scene.isActive('Battle') } })
        if (i.x === target.x && i.y === target.y) break
        if (i.b || i.map !== this.curMapHint) { /* fall through to checks */ }
        const pos = `${i.x},${i.y},${i.map}`
        if (pos !== last) { last = pos; lastMove = Date.now() }
        if (i.busy && !i.moving) { result = 'interrupted'; break }
        if (i.b) { result = 'interrupted'; break }
        if (Date.now() - lastMove > 900) { result = 'stuck'; break }
        if (Date.now() - t0 > 15000) { result = 'stuck'; break }
        await sleep(8)
      }
    } finally {
      await this.page.keyboard.up(k)
      if (run) await this.page.keyboard.up('x')
    }
    // let the current step finish
    await this.page.waitForFunction(() => !window.__llmmon.info().moving, null, { timeout: 5000 }).catch(() => {})
    return result
  }

  /** Face a direction (tap = turn only). */
  async face(dir) {
    for (let i = 0; i < 4; i++) {
      const inf = await this.info()
      if (inf.facing === dir) return true
      await this.tap(dir)
      await sleep(60)
    }
    return (await this.info()).facing === dir
  }

  /** Stand next to tile (tx,ty) (or across a counter) and face it. Returns the facing dir. */
  async approach(tx, ty, opts = {}) {
    for (let tries = 0; tries < 8; tries++) {
      const s = await this.snap()
      const map = this.map(s.info.map)
      const stands = []
      for (const [d, [dx, dy]] of Object.entries(DIRS)) {
        // stand at (tx-dx, ty-dy) facing d
        const sx = tx - dx
        const sy = ty - dy
        stands.push({ x: sx, y: sy, face: d })
        if (map.tileAt(sx, sy).counter) stands.push({ x: sx - dx, y: sy - dy, face: d })
      }
      const ok = stands.filter((p) => map.inBounds(p.x, p.y) && (!map.isSolid(p.x, p.y)) && !map.objectAt('warp', p.x, p.y) && !(map.tileAt(p.x, p.y).ledge))
      const goal = (x, y) => ok.some((p) => p.x === x && p.y === y)
      const r = await this.walkTo(goal, opts)
      if (r.interrupted || r.mapChanged) return null
      const inf = await this.info()
      const st = ok.find((p) => p.x === inf.x && p.y === inf.y)
      if (!st) continue
      if (opts.recheck) { const t = await opts.recheck(); if (t && (t.x !== tx || t.y !== ty)) { tx = t.x; ty = t.y; continue } }
      await this.face(st.face)
      return st.face
    }
    return null
  }

  /** Talk to an NPC by id (follows wanderers). Returns the texts shown. */
  async talkTo(id, h = {}) {
    for (let tries = 0; tries < 6; tries++) {
      const s = await this.snap()
      const n = s.info.npcs.find((q) => q.id === id)
      if (!n || n.hidden) throw new Error(`npc ${id} not present on ${s.info.map}`)
      const f = await this.approach(n.x, n.y, { ...h.walk })
      if (!f) continue
      // still there?
      const s2 = await this.snap()
      const n2 = s2.info.npcs.find((q) => q.id === id)
      const [dx, dy] = DIRS[f]
      const map = this.map(s2.info.map)
      let fx = s2.info.x + dx
      let fy = s2.info.y + dy
      if (map.tileAt(fx, fy).counter) { fx += dx; fy += dy }
      if (!n2 || n2.x !== fx || n2.y !== fy) continue
      return this.interact(h)
    }
    throw new Error('talkTo failed: ' + id)
  }
  async readAt(x, y, h = {}) {
    const f = await this.approach(x, y, h.walk || {})
    if (!f) throw new Error(`cannot approach ${x},${y}`)
    return this.interact(h)
  }
  async interact(h = {}) {
    const before = (this.texts || []).length
    await sleep(this.fast ? 20 : 200)
    await this.press('A')
    // wait for something to happen
    const t0 = Date.now()
    while (Date.now() - t0 < 1500) {
      const s = await this.snap()
      if (s.info.busy || s.battle) break
      await sleep(30)
    }
    if (h.onOpen) await h.onOpen()
    await this.waitIdle(h)
    return (this.texts || []).slice(before).map((x) => x.t)
  }

  /** Walk onto a warp tile (door / stairs / exit mat) and wait for the new map. */
  async takeWarp(match, opts = {}) {
    const s = await this.snap()
    const map = this.map(s.info.map)
    const warps = map.objectsOfType('warp').filter((w) => (typeof match === 'function' ? match(w) : w.props.toMap === match))
    if (!warps.length) throw new Error('no warp ' + match + ' on ' + map.id)
    const goal = (x, y) => warps.some((w) => x >= w.tx && y >= w.ty && x < w.tx + w.tw && y < w.ty + w.th)
    const r = await this.walkTo(goal, { ...opts, stopOnInterrupt: false })
    if (!r.mapChanged) {
      // standing on the arrival tile of a warp — step off and back
      await this.page.waitForFunction((m) => window.__llmmon.info().map !== m, map.id, { timeout: 5000 }).catch(() => {})
    }
    const s2 = await this.waitIdle(opts)
    return s2
  }
}

function bestMove(b) {
  const moves = (b.me && b.me.moves) || []
  let bi = 0
  let bp = -1
  moves.forEach((m, i) => { const p = (m.pp > 0 ? (m.power || 0) : -1); if (p > bp) { bp = p; bi = i } })
  return bi
}
function firstAlive(s, cur) { const i = s.party.findIndex((m, k) => k !== 0 && m.hp > 0); return i < 0 ? cur : i }
function summ(s) { return { info: { ...s.info, npcs: undefined }, ui: s.ui, battle: s.battle && { ...s.battle, me: undefined, foe: undefined }, starter: s.starter, title: s.title } }

module.exports = { Game, serve, sleep, KEY, OPP, bestMove, summ }
