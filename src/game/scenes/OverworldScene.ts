// Overworld: map, grid movement, NPCs, warps, triggers, zones, encounters.
// Implements WorldApi for the script runner. Logic runs at a fixed 60 Hz.

import Phaser from 'phaser'
import {
  DEFAULT_ENCOUNTER_RATE, DEPTH, DIR_VEC, FADE_MS, H, OPPOSITE, PLAYER_SCREEN_X, PLAYER_SCREEN_Y,
  RUN_FRAMES, TILE, TURN_FRAMES, W, WALK_FRAMES, type Dir,
} from '../config'
import { controls } from '../controls'
import { audio } from '../audio'
import { state } from '../state'
import { ms } from '../params'
import { rng, randInt, pick } from '../rng'
import type { BattleRequest, BattleResult } from '../types'
import { encounterRate, rollEncounter, trainerInfo, wildRequest } from '../adapters/monInfo'
import { GameMap, ensureMapLoaded, mapConnections, type MapObject } from '../world/TiledMap'
import { Actor } from '../world/Actor'
import { content, runScript, scriptsRunning } from '../script'
import type { EmoteKind, NpcDef, WorldApi } from '../script'
import { getUI, setAreaNameProvider, type UIScene } from './UIScene'
import { ensureTexture, isPlaceholder } from '../assets'
import { options } from '../options'
import { PuzzleManager, drawStaticFloors } from '../world/Puzzle'
import { Lighting, Weather, type WeatherKind } from '../world/Atmosphere'
import { FieldSkills } from '../world/FieldSkills'
import { evalCond } from '../world/cond'
import { noteVisit } from '../systems/locations'
import { onFlagChange } from '../state'
import { tamper } from '../systems/tamper'

export interface OverworldData {
  map?: string
  spawn?: string
  x?: number
  y?: number
  facing?: Dir
  /** Run content.newGameScript after arrival. */
  newGame?: boolean
}

interface GroundItem {
  obj: MapObject
  img?: Phaser.GameObjects.Image
  hidden: boolean
}

/** A static world sprite (map `prop` object or spawned by a script). */
interface Prop {
  id: string
  img: Phaser.GameObjects.Image
  /** Pixel top-left of the collision footprint. */
  x: number
  y: number
  tw: number
  th: number
  solid: boolean
  depthMode: 'y' | 'ground' | 'over'
  data: Record<string, unknown>
  fromMap: boolean
  scriptHidden: boolean
}

interface Particle {
  r: Phaser.GameObjects.Rectangle
  vx: number
  vy: number
  life: number
  max: number
}

interface Fx {
  img: Phaser.GameObjects.Image
  t: number
  frames: number
  rate: number
}

const FALLBACK_WILD = ['gemma_4', 'gpt_5_4_mini', 'mistral_medium']

export interface PropOptions {
  frame?: number | string
  solid?: boolean
  depth?: 'y' | 'ground' | 'over'
  /** Collision footprint in tiles (default: image width, 1 row; 2 rows if ≥ 32px tall). */
  w?: number
  h?: number
  offsetX?: number
  offsetY?: number
  script?: string
  text?: string
}

export class OverworldScene extends Phaser.Scene implements WorldApi {
  map?: GameMap
  player!: Actor
  npcs = new Map<string, Actor>()
  private items: GroundItem[] = []
  props = new Map<string, Prop>()
  private particles: Particle[] = []
  private runSteps = 0
  private doorFx?: Phaser.GameObjects.Graphics
  private spotting = false
  private fxs: Fx[] = []
  ui!: UIScene
  /** Puzzle kit for the current map (world/Puzzle.ts). */
  puzzle?: PuzzleManager
  /** Field skills (world/FieldSkills.ts). */
  skills!: FieldSkills
  light!: Lighting
  weather!: Weather
  /** Neighbour maps drawn at the edges (map property `connections`). */
  neighbours: Array<{ dir: 'north' | 'south' | 'east' | 'west'; map: GameMap; ox: number; oy: number; floors: Phaser.GameObjects.Graphics }> = []
  /** Script overrides: weather / darkness (null = follow the map/zone). */
  weatherOverride: WeatherKind | null = null
  darkOverride: boolean | null = null
  private footprints: Array<{ img: Phaser.GameObjects.Graphics; life: number }> = []
  private ready = false
  private lockCount = 0
  private transitioning = false
  private turnTimer = 0
  private turnDir: Dir | null = null
  private bumpSfxCooldown = 0
  private edgeA = false
  private edgeStart = false
  private camOffset = { x: 0, y: 0 }
  private zoneObj?: MapObject
  private zoneName = ''
  private lastBanner = ''
  private currentMusic = ''
  private stepsSinceBattle = 99
  private initData: OverworldData = {}

  constructor() {
    super({ key: 'Overworld' })
  }

  get mapId(): string {
    return this.map?.id ?? ''
  }

  init(data: OverworldData): void {
    this.initData = data ?? {}
    this.ready = false
    this.npcs = new Map()
    this.props = new Map()
    this.particles = []
    this.items = []
    this.fxs = []
    this.lockCount = 0
    this.spotting = false
    this.transitioning = false
    this.lastBanner = ''
    this.currentMusic = ''
    this.camOffset = { x: 0, y: 0 }
  }

  create(): void {
    this.ui = getUI(this.game)
    this.cameras.main.setBackgroundColor(0x000000)
    this.cameras.main.setRoundPixels(true)
    this.player = new Actor(this, { id: 'player', sprite: 'player', x: 0, y: 0 })
    this.player.grassAt = (x, y) => this.map?.grassFrameAt(x, y) ?? null
    if (this.textures.exists('chars/player_run') && !isPlaceholder('chars/player_run')) this.player.runTexKey = 'chars/player_run'
    setAreaNameProvider(() => this.zoneName || String(this.map?.props.name ?? ''))
    this.light = new Lighting(this)
    this.weather = new Weather(this)
    this.skills = new FieldSkills(this)
    this.footprints = []
    this.neighbours = []
    this.weatherOverride = null
    this.darkOverride = null
    // EVAL light / flags: NPC variants and visibility conditions follow every flag change
    const offFlags = onFlagChange((k) => {
      if (!this.ready) return
      if (k === 'eval_light') {
        this.applyEvalVariants()
        this.puzzle?.refresh()
      }
      this.refreshNpcVisibility()
    })
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offFlags()
      this.puzzle?.destroy()
      this.puzzle = undefined
      this.weather.destroy()
      this.light.destroy()
      this.skills.destroy()
      for (const n of this.neighbours) {
        n.map.destroy()
        n.floors.destroy()
      }
      this.neighbours = []
      this.map?.destroy()
      this.map = undefined
      this.ready = false
      // a script may still be awaiting when the scene stops (e.g. s.endCard()); leave nothing to touch
      this.npcs.clear()
      this.props.clear()
      this.items = []
    })
    void this.boot()
  }

  private async boot(): Promise<void> {
    const d = this.initData
    const mapId = d.map ?? state.map ?? content.startMap ?? '_test'
    this.lockCount++
    this.ui.fade(1, 0)
    const target = d.spawn ?? (d.x !== undefined && d.y !== undefined ? { x: d.x, y: d.y } : state.pendingSpawn ?? { x: state.x, y: state.y })
    await this.loadMap(mapId, target, d.facing ?? state.facing)
    this.ready = true
    await this.ui.fade(0, FADE_MS)
    await this.runOnEnter()
    this.lockCount--
    if (d.newGame && content.newGameScript) await this.run(content.newGameScript)
  }

  // ================================================================ map loading

  private async loadMap(id: string, target: string | { x: number; y: number }, facing?: Dir, o: { seamless?: boolean } = {}): Promise<void> {
    let raw = await ensureMapLoaded(this, id)
    if (!raw && id !== '_test') {
      id = '_test'
      raw = await ensureMapLoaded(this, id)
    }
    if (!raw) throw new Error(`map ${id} missing`)
    // neighbours (map connections) are loaded before anything is torn down, so a seamless
    // crossing never shows a half-built frame
    const conns = mapConnections(raw)
    const nraw: Array<Awaited<ReturnType<typeof ensureMapLoaded>>> = []
    for (const c of conns) nraw.push(await ensureMapLoaded(this, c.map)) // one loader run at a time
    const fresh = id !== this.map?.id
    // teardown
    this.puzzle?.destroy()
    this.puzzle = undefined
    for (const n of this.neighbours) {
      n.map.destroy()
      n.floors.destroy()
    }
    this.neighbours = []
    for (const f of this.footprints) f.img.destroy()
    this.footprints = []
    this.skills.onMapChange(o.seamless ?? false)
    this.map?.destroy()
    for (const n of this.npcs.values()) n.destroy()
    this.npcs.clear()
    for (const it of this.items) it.img?.destroy()
    this.items = []
    for (const f of this.fxs) f.img.destroy()
    this.fxs = []
    for (const pr of this.props.values()) pr.img.destroy()
    this.props.clear()
    for (const pt of this.particles) pt.r.destroy()
    this.particles = []

    const map = new GameMap(this, id, raw)
    this.map = map
    state.map = id
    conns.forEach((c, i) => {
      const r = nraw[i]
      if (!r) {
        console.warn(`[overworld] ${id}: connected map '${c.map}' missing`)
        return
      }
      const nm = new GameMap(this, c.map, r)
      const ox = c.dir === 'west' ? -nm.width : c.dir === 'east' ? map.width : c.offset
      const oy = c.dir === 'north' ? -nm.height : c.dir === 'south' ? map.height : c.offset
      nm.setOrigin(ox, oy)
      // its puzzle floors (ice, snow, gaps…) as a static frame, so nothing pops in on crossing
      const floors = this.add.graphics().setDepth(DEPTH.ground + 0.5).setPosition(ox * TILE, oy * TILE)
      drawStaticFloors(floors, nm.objects)
      this.neighbours.push({ dir: c.dir, map: nm, ox, oy, floors })
    })
    // player position
    let pos: { x: number; y: number } | null = null
    if (typeof target === 'string') {
      const sp = map.objects.find((o) => o.type === 'spawn' && o.name === target)
        ?? map.objects.find((o) => o.name === target)
      if (sp) pos = { x: sp.tx, y: sp.ty }
      else console.warn(`[overworld] spawn '${target}' not found in ${id}`)
    } else pos = target
    if (!pos || !map.inBounds(pos.x, pos.y)) {
      const sp = map.objectsOfType('spawn')[0]
      pos = sp ? { x: sp.tx, y: sp.ty } : { x: Math.floor(map.width / 2), y: Math.floor(map.height / 2) }
    }
    const spawnObj = typeof target === 'string' ? map.objects.find((o) => o.type === 'spawn' && o.name === target) : undefined
    const onOutdoorDoor = !!map.tileAt(pos.x, pos.y).door && !map.props.indoor
    const f = (facing ?? (spawnObj?.props.facing as Dir | undefined) ?? (onOutdoorDoor ? 'down' : this.player.facing)) as Dir
    this.player.place(pos.x, pos.y, f)
    state.x = pos.x
    state.y = pos.y
    state.facing = f
    state.pendingSpawn = null

    // objects
    for (const o of map.objects) {
      if (o.type === 'npc') this.spawnFromObject(o)
      else if (o.type === 'prop') {
        const pr = o.props
        const id = String(pr.id ?? (o.name || `prop${o.id}`))
        const sized = (o.tw > 1 || o.th > 1) || pr.w !== undefined
        this.addProp(id, String(pr.sprite ?? pr.texture ?? 'fx/satchel'), o.tx, o.ty, {
          frame: pr.frame as number | undefined,
          solid: pr.solid === undefined ? true : !!pr.solid,
          depth: (pr.depth as Prop['depthMode']) ?? 'y',
          w: sized ? Number(pr.w ?? o.tw) : undefined,
          h: sized ? Number(pr.h ?? o.th) : undefined,
          offsetX: Number(pr.offsetX ?? 0),
          offsetY: Number(pr.offsetY ?? 0),
          data: { ...pr },
          fromMap: true,
        })
      } else if (o.type === 'item') {
        const flag = String(o.props.flag ?? `item_${id}_${o.id}`)
        if (state.flag(flag)) continue
        const hidden = !!o.props.hidden
        const img = hidden ? undefined : this.add.image(o.tx * TILE, o.ty * TILE, 'fx/item_ball').setOrigin(0, 0).setDepth(DEPTH.charBase + o.ty * TILE + TILE - 1)
        this.items.push({ obj: o, img, hidden })
      }
    }
    this.puzzle = new PuzzleManager(this, id, map.objects, fresh)
    this.applyEvalVariants()
    this.refreshNpcVisibility()
    this.updateCamera()
    this.updateZone(true, o.seamless ?? false)
  }

  /** Destroy and rebuild the puzzle kit from the (already reset) saved state. */
  rebuildPuzzle(): void {
    if (!this.map) return
    this.puzzle?.destroy()
    this.puzzle = new PuzzleManager(this, this.map.id, this.map.objects, false)
  }

  private spawnFromObject(o: MapObject): void {
    const p = o.props
    const id = String(p.id ?? (o.name || `npc${o.id}`))
    const a = new Actor(this, { id, sprite: String(p.sprite ?? 'boy'), x: o.tx, y: o.ty, facing: (p.facing as Dir) ?? 'down' })
    a.movement = (String(p.movement ?? 'static') as Actor['movement'])
    a.data = { ...p, obj: o }
    a.grassAt = (x, y) => this.map?.grassFrameAt(x, y) ?? null
    a.aiTimer = randInt(60, 200)
    this.npcs.set(id, a)
  }

  /** Condition names in map objects (`showWhen`, `hideWhen`, puzzle `when`): puzzle signals, `flag:x`, `eval`. */
  resolveCond = (n: string): number | boolean | string | undefined => {
    if (this.puzzle) return this.puzzle.resolve(n)
    if (n.startsWith('flag:')) return state.flag(n.slice(5))
    if (n === 'eval') return state.evalLight
    return undefined
  }

  private visibleByProps(d: Record<string, unknown>): boolean {
    const show = d.showIfFlag ? state.flag(String(d.showIfFlag)) : true
    const hide = d.hideIfFlag ? state.flag(String(d.hideIfFlag)) : false
    const showW = d.showWhen ? evalCond(String(d.showWhen), this.resolveCond) : true
    const hideW = d.hideWhen ? evalCond(String(d.hideWhen), this.resolveCond) : false
    const ev = d.evalOnly === undefined ? true : !!d.evalOnly === state.evalLight
    return show && !hide && showW && !hideW && ev
  }

  /** Apply showIfFlag / hideIfFlag / showWhen / hideWhen / evalOnly after flags change. */
  refreshNpcVisibility(): void {
    for (const a of this.npcs.values()) {
      if (a.data.obj) a.setHidden(!this.visibleByProps(a.data) || !!a.data.scriptHidden)
    }
    for (const pr of this.props.values()) {
      pr.img.setVisible(this.visibleByProps(pr.data) && !pr.scriptHidden)
    }
  }

  /**
   * EVAL light variants of map NPCs: `evalSprite`, `evalFacing`, `evalMovement` replace the
   * normal values while the light is on (`evalText` / `evalScript` are read when talking).
   */
  applyEvalVariants(): void {
    const on = state.evalLight
    for (const a of this.npcs.values()) {
      const d = a.data
      if (!d.obj) continue
      if (d.evalSprite) a.setTexture(String(on ? d.evalSprite : d.sprite ?? 'boy'))
      if (d.evalFacing && !a.moving && !d.talking) a.face(String(on ? d.evalFacing : d.facing ?? 'down') as Dir)
      if (d.evalMovement) a.movement = String(on ? d.evalMovement : d.movement ?? 'static') as Actor['movement']
    }
  }

  // ================================================================ props

  /** Create a prop whose collision footprint's top-left tile is (tx, ty). The image sits on the footprint's bottom-left. */
  addProp(id: string, key: string, tx: number, ty: number, o: {
    frame?: number | string; solid?: boolean; depth?: 'y' | 'ground' | 'over'; w?: number; h?: number
    offsetX?: number; offsetY?: number; data?: Record<string, unknown>; fromMap?: boolean
  } = {}): void {
    this.props.get(id)?.img.destroy()
    const tex = ensureTexture(this, key, 16, 16)
    const img = this.add.image(0, 0, tex, o.frame).setOrigin(0, 1)
    const tw = Math.max(1, o.w ?? Math.ceil(img.width / TILE))
    const th = Math.max(1, o.h ?? (img.height >= 32 ? 2 : 1))
    const pr: Prop = {
      id, img, x: tx * TILE, y: ty * TILE, tw, th, solid: o.solid ?? true, depthMode: o.depth ?? 'y',
      data: { ...(o.data ?? {}), offsetX: o.offsetX ?? 0, offsetY: o.offsetY ?? 0 }, fromMap: !!o.fromMap, scriptHidden: false,
    }
    this.props.set(id, pr)
    this.placeProp(pr)
    this.refreshNpcVisibility()
  }

  private placeProp(pr: Prop): void {
    const bottom = Math.round(pr.y) + pr.th * TILE
    pr.img.setPosition(Math.round(pr.x) + Number(pr.data.offsetX ?? 0), bottom + Number(pr.data.offsetY ?? 0))
    pr.img.setDepth(pr.depthMode === 'ground' ? DEPTH.shadow - 1 : pr.depthMode === 'over' ? DEPTH.over + 50 : DEPTH.charBase + bottom - 1)
  }

  private propAt(x: number, y: number, solidOnly: boolean): Prop | undefined {
    for (const pr of this.props.values()) {
      if (!pr.img.visible || (solidOnly && !pr.solid)) continue
      const px = x * TILE
      const py = y * TILE
      if (px < pr.x + pr.tw * TILE && px + TILE > pr.x && py < pr.y + pr.th * TILE && py + TILE > pr.y) return pr
    }
    return undefined
  }

  // ================================================================ main loop

  update(): void {
    if (!this.ready || !this.map) return
    controls.each(() => {
      this.edgeA = controls.justPressed('A')
      this.edgeStart = controls.justPressed('START')
      this.edgeSelect = controls.justPressed('SELECT')
      this.logicTick()
    })
    this.map.update(this.time.now)
    for (const n of this.neighbours) n.map.update(this.time.now)
    this.updateCamera()
    const cam = this.cameras.main
    this.puzzle?.follow(this.player.px, this.player.py - (this.player.isHopping ? 4 : 0), this.player.sprite.depth)
    this.skills.render()
    this.light.update(this.player.px + TILE / 2 - cam.scrollX, this.player.py + TILE / 2 - 4 - cam.scrollY)
    this.weather.update(cam.scrollX, cam.scrollY)
    this.ui.hud.lampShown = state.flag('eval_lamp') || state.itemCount('eval_suite') > 0 || tamper.isFaked('eval_lamp')
    this.ui.hud.lampOn = tamper.isFaked('eval_lamp') && !tamper.probe ? tamper.shown('eval_lamp', 0) > 0 : state.evalLight
    if (!this.player.moving && !this.transitioning) {
      state.x = this.player.tx
      state.y = this.player.ty
      state.facing = this.player.facing
    }
  }

  /** Locked: scripts, warps, menus, dialog. */
  get busy(): boolean {
    return this.lockCount > 0 || scriptsRunning() > 0 || this.transitioning || this.ui.busy
  }

  private logicTick(): void {
    this.tickPlayer()
    for (const n of this.npcs.values()) {
      n.tick()
      if (!this.busy) this.npcAI(n)
    }
    for (const f of this.fxs) {
      f.t++
      const fr = Math.floor(f.t / f.rate)
      if (fr >= f.frames) f.img.destroy()
      else f.img.setFrame(fr)
    }
    this.fxs = this.fxs.filter((f) => f.img.active)
    for (const pt of this.particles) {
      pt.life++
      pt.r.x += pt.vx
      pt.r.y += pt.vy
      pt.r.setAlpha(Math.max(0, 0.95 * (1 - (pt.life / pt.max) ** 1.5)))
      if (pt.life >= pt.max) pt.r.destroy()
    }
    this.particles = this.particles.filter((pt) => pt.r.active)
    for (const f of this.footprints) {
      f.life--
      if (f.life < 60) f.img.setAlpha(Math.max(0, f.life / 60) * 0.8)
      if (f.life <= 0) f.img.destroy()
    }
    this.footprints = this.footprints.filter((f) => f.life > 0)
    if (this.bumpSfxCooldown > 0) this.bumpSfxCooldown--
    if (this.pushCooldown > 0) this.pushCooldown--
    this.puzzle?.tick()
    this.skills.tick()
  }

  private tickPlayer(): void {
    const p = this.player
    if (p.moving) {
      const landed = p.tick()
      if (landed && this.playerStepping) {
        this.playerStepping = false
        const stopped = this.onPlayerLanded()
        if (!stopped && !this.busy) {
          const d = controls.dir()
          if (d) this.tryStep(d, true)
        }
      }
      return
    }
    p.tick()
    if (this.busy) {
      this.turnTimer = 0
      return
    }
    if (this.edgeStart) {
      this.edgeStart = false
      this.edgeA = false
      controls.consume('A', 'START')
      void this.ui.openStartMenu()
      return
    }
    if (this.edgeA) {
      this.edgeA = false
      controls.consume('A')
      this.interact()
      return
    }
    if (this.edgeSelect) {
      this.edgeSelect = false
      controls.consume('SELECT')
      void this.skills.quickKey()
      return
    }
    const d = controls.dir()
    if (!d) {
      this.turnTimer = 0
      this.turnDir = null
      return
    }
    if (d !== p.facing && this.turnDir !== d) {
      // tap-to-turn: face now, only walk if still held after TURN_FRAMES
      p.face(d)
      this.turnDir = d
      this.turnTimer = 0
      this.checkTrainerSight()
      return
    }
    if (this.turnDir === d && this.turnTimer < TURN_FRAMES) {
      this.turnTimer++
      if (this.turnTimer < TURN_FRAMES) return
    }
    this.tryStep(d, false)
  }

  private playerStepping = false
  private edgeSelect = false
  /** Forced moves in a row (ice / conveyors / spinners); a safety stop for loops. */
  private forcedSteps = 0

  private running(): boolean {
    if (!state.flag('has_run') || this.map?.props.indoor || this.skills.rafting) return false
    // Options → RUNNING: HOLD B (default) or AUTO (run unless B is held)
    return options.run === 'auto' ? !controls.isDown('B') : controls.isDown('B')
  }

  private bumpInto(d: Dir): void {
    const p = this.player
    p.face(d)
    if (!p.bumping) {
      p.bump(d)
      if (this.bumpSfxCooldown <= 0) {
        audio.sfx('bump')
        this.bumpSfxCooldown = 16
      }
    }
  }

  /** A connected neighbour map covering the out-of-bounds tile (x, y) of the current map. */
  neighbourAt(x: number, y: number): (typeof this.neighbours)[number] | undefined {
    return this.neighbours.find((n) => x >= n.ox && x < n.ox + n.map.width && y >= n.oy && y < n.oy + n.map.height)
  }

  /** Water the raft can float on: water tiles, `rough_water` floors (not bridged). */
  isWaterish(x: number, y: number): boolean {
    if (!this.map?.inBounds(x, y)) return false
    const f = this.puzzle?.floorAt(x, y)
    if (f?.bridged) return false
    return !!(this.map.tileAt(x, y).water || f?.rough_water || f?.water)
  }

  /** Attempt a player step (or bump / ledge hop / block push / map-edge crossing). */
  private tryStep(d: Dir, chained: boolean): void {
    const p = this.player
    const map = this.map!
    const v = DIR_VEC[d]
    const tx = p.tx + v.x
    const ty = p.ty + v.y
    this.turnDir = d
    this.turnTimer = TURN_FRAMES
    // off the edge: walk into a connected neighbour map
    if (!map.inBounds(tx, ty)) {
      const nb = this.neighbourAt(tx, ty)
      const lx = tx - (nb?.ox ?? 0)
      const ly = ty - (nb?.oy ?? 0)
      if (!nb || nb.map.isSolid(lx, ly) || nb.map.tileAt(lx, ly).ledge || this.puzzle?.floorAt(p.tx, p.ty).oneway) {
        this.bumpInto(d)
        return
      }
      this.beginStep(d, chained, !!nb.map.tileAt(lx, ly).grass, tx, ty)
      return
    }
    const tile = map.tileAt(tx, ty)
    // ledge hop
    if (tile.ledge === d) {
      const lx = tx + v.x
      const ly = ty + v.y
      if (!this.blocked(p, lx, ly)) {
        audio.sfx('ledge')
        this.playerStepping = true
        void p.hop(d)
        if (chained) p.tick()
        return
      }
    }
    // Backprop: walk back UP a one-way ledge
    if (tile.ledge && tile.ledge === OPPOSITE[d] && this.skills.canBackprop(d)) {
      this.playerStepping = true
      this.skills.backprop(d)
      if (chained) p.tick()
      return
    }
    const pz = this.puzzle
    if (pz) {
      // one-way floors: enter and leave only along the arrow
      const here = pz.floorAt(p.tx, p.ty)
      const there = pz.floorAt(tx, ty)
      if ((there.oneway && there.oneway !== d) || (here.oneway && here.oneway !== d)) {
        this.bumpInto(d)
        return
      }
      // pushable blocks / boulders
      const blk = pz.blockAt(tx, ty)
      if (blk) {
        this.bumpInto(d)
        // one push per 16 frames of pushing (holding the direction keeps pushing, like Strength)
        if (!this.pushing && this.pushCooldown <= 0) void this.pushBlock(blk, d)
        return
      }
    }
    const warpHere = map.objectAt('warp', tx, ty)
    if (tile.ledge || (this.blocked(p, tx, ty) && !(warpHere && map.inBounds(tx, ty) && !this.actorAt(tx, ty, p)))) {
      this.bumpInto(d)
      return
    }
    if (warpHere && tile.door && !map.props.indoor) {
      void this.enterDoor(d, warpHere)
      return
    }
    this.beginStep(d, chained, !!tile.grass, tx, ty)
  }

  private beginStep(d: Dir, chained: boolean, grass: boolean, tx: number, ty: number): void {
    const p = this.player
    const frames = this.running() ? RUN_FRAMES : WALK_FRAMES
    if (grass) this.rustle(tx, ty)
    else if (frames === RUN_FRAMES && this.runSteps++ % 2 === 0) this.dust(p.tx, p.ty, d)
    if (frames !== RUN_FRAMES) this.runSteps = 0
    this.leaveTile(p.tx, p.ty, d)
    this.playerStepping = true
    if (chained) p.chain(d, frames)
    else void p.step(d, frames)
  }

  private pushing = false
  private pushCooldown = 0

  /** Walked into a block: push it (heavy ones need Embed). */
  private async pushBlock(blk: NonNullable<ReturnType<PuzzleManager['blockAt']>>, d: Dir): Promise<void> {
    if (!this.puzzle) return
    this.pushing = true
    this.lockCount++
    try {
      const r = await this.puzzle.push(blk, d, this.skills.has('embed'))
      if (r === 'heavy' && !this.heavyHinted) {
        this.heavyHinted = true
        await this.runInline(async (s) => s.say(blk.type === 'boulder' ? 'A huge boulder. It won’t budge.' : 'A heavy block. It won’t budge…\nSomething could move it toward its own kind.'))
      }
    } finally {
      this.lockCount--
      this.pushing = false
      this.pushCooldown = 16
    }
  }

  private heavyHinted = false

  /** Snow footprints / puddle splashes on the tile being left or entered. */
  private leaveTile(x: number, y: number, d: Dir): void {
    if (!this.map?.inBounds(x, y)) return
    const f = this.puzzle?.floorAt(x, y)
    const t = this.map.tileAt(x, y)
    const snowy = !!(f?.snow || t.snow || (this.currentWeather() === 'snow' && !this.map.props.indoor && !t.grass && !f?.ice && !this.isWaterish(x, y)))
    if (snowy) {
      const g = this.add.graphics().setDepth(DEPTH.shadow - 3)
      const v = DIR_VEC[d]
      g.fillStyle(0xa8b0c4, 0.9)
      if (v.y) {
        g.fillRect(x * TILE + 5, y * TILE + 9 + v.y, 2, 3)
        g.fillRect(x * TILE + 9, y * TILE + 6 + v.y, 2, 3)
      } else {
        g.fillRect(x * TILE + 6 + v.x, y * TILE + 10, 3, 2)
        g.fillRect(x * TILE + 7 + v.x, y * TILE + 13, 3, 2)
      }
      this.footprints.push({ img: g, life: 240 })
      if (this.footprints.length > 40) this.footprints.shift()?.img.destroy()
    }
  }

  /** Splash on landing in a puddle. */
  private splash(x: number, y: number): void {
    audio.sfx(audio.sfxIds.includes('splash') ? 'splash' : 'grass')
    const depth = DEPTH.charBase + y * TILE + TILE + 1
    const parts: Array<[number, number, number, number]> = [[3, 12, -0.35, -0.5], [12, 12, 0.35, -0.5], [5, 13, -0.2, -0.8], [10, 13, 0.2, -0.8], [7, 14, 0, -0.9]]
    for (const [dx, dy, vx, vy] of parts) {
      const r = this.add.rectangle(x * TILE + dx, y * TILE + dy, 1, 1, dx === 7 ? 0xfcfaf0 : 0xb4e0f8).setOrigin(0, 0).setDepth(depth)
      this.particles.push({ r, vx, vy, life: 0, max: 12 })
    }
  }

  /** Effective weather (script override, zone, map). */
  currentWeather(): WeatherKind {
    if (this.weatherOverride !== null) return this.weatherOverride
    if (this.map?.props.indoor) return ''
    return String(this.zoneObj?.props.weather ?? this.map?.props.weather ?? '') as WeatherKind
  }

  /** Effective darkness (script override, zone, map). */
  isDark(): boolean {
    if (this.darkOverride !== null) return this.darkOverride
    const z = this.zoneObj?.props.dark
    return z !== undefined ? !!z : !!this.map?.props.dark
  }

  /** Re-apply weather + light after a zone / map / skill change. */
  updateAtmosphere(instant = false): void {
    this.weather.set(this.currentWeather(), Number(this.zoneObj?.props.weatherIntensity ?? this.map?.props.weatherIntensity ?? 1))
    const base = Number(this.zoneObj?.props.lightRadius ?? this.map?.props.lightRadius ?? 1)
    this.light.set(this.isDark(), this.skills.dilating ? Math.max(base, 4) : base, instant)
  }

  /** Dust puff at the heels (running, outdoors, not in tall grass): a 3-4px soft cluster that spreads and fades over ~10 frames. */
  private dust(x: number, y: number, d: Dir): void {
    if (this.map?.props.indoor) return
    const v = DIR_VEC[d]
    const cx = x * TILE + 7 - v.x * 5
    const cy = y * TILE + 13 - v.y * 2
    const depth = DEPTH.charBase + y * TILE + TILE - 0.5
    // [dx, dy, size, colour, alpha, vx, vy]
    const parts: Array<[number, number, number, number, number, number, number]> = [
      [0, 0, 2, 0xfcf6e2, 0.95, 0, -0.08],
      [-2, 1, 2, 0xf2e6c4, 0.85, -0.22, -0.04],
      [2, 1, 2, 0xf2e6c4, 0.85, 0.22, -0.04],
      [-1, -1, 1, 0xfcf6e2, 0.8, -0.1, -0.16],
      [2, -1, 1, 0xfcf6e2, 0.8, 0.12, -0.15],
    ]
    for (const [dx, dy, sz, col, a, vx, vy] of parts) {
      const r = this.add.rectangle(cx + dx, cy + dy, sz, sz, col).setOrigin(0, 0).setDepth(depth).setAlpha(a)
      this.particles.push({ r, vx: vx - v.x * 0.12, vy, life: 0, max: 10 + Math.abs(dx) })
    }
  }

  /** Procedural door-open overlay on a door tile: a dark opening that grows downward (k: 0 closed → 1 open). */
  private drawDoor(g: Phaser.GameObjects.Graphics, x: number, y: number, k: number): void {
    g.clear()
    // Stamp doors are ~10px wide and rise ~10px into the tile above the door tile (house/mart/
    // lab art); open from the top down like a roller door. Stays open until the fade (QA P2).
    const top = y * TILE - 10
    const h = Math.round(23 * k)
    if (h <= 0) return
    g.fillStyle(0x28222e, 0.94)
    g.fillRect(x * TILE + 3, top, 10, h)
    g.fillStyle(0x4a3f4f, 0.9)
    g.fillRect(x * TILE + 3, top + h - 1, 10, 1)
  }

  private animateDoor(g: Phaser.GameObjects.Graphics, x: number, y: number, from: number, to: number): Promise<void> {
    const d = ms(135)
    if (!d) {
      this.drawDoor(g, x, y, to)
      return Promise.resolve()
    }
    const t = { k: from }
    return new Promise((res) => this.tweens.add({
      targets: t, k: to, duration: d, onUpdate: () => this.drawDoor(g, x, y, Math.round(t.k * 4) / 4), onComplete: () => {
        this.drawDoor(g, x, y, to)
        res()
      },
    }))
  }

  /** Walk into an outdoor door: open animation, step into the doorway, then warp. */
  private async enterDoor(d: Dir, warp: MapObject): Promise<void> {
    const p = this.player
    const v = DIR_VEC[d]
    const dx = p.tx + v.x
    const dy = p.ty + v.y
    this.lockCount++
    try {
      p.face(d)
      audio.sfx(String(warp.props.sfx ?? 'door'))
      const g = this.add.graphics().setDepth(DEPTH.shadow - 2)
      this.doorFx = g
      await this.animateDoor(g, dx, dy, 0, 1)
      await p.step(d, WALK_FRAMES)
      state.x = p.tx
      state.y = p.ty
    } finally {
      this.lockCount--
    }
    await this.warp(String(warp.props.toMap ?? warp.props.map), String(warp.props.toSpawn ?? warp.props.spawn ?? ''),
      (warp.props.facing as Dir) || undefined)
  }

  private async runOnEnter(): Promise<void> {
    const id = this.map?.props.onEnter
    if (id) await this.run(String(id))
  }

  private rustle(x: number, y: number): void {
    audio.sfx('grass')
    // under every character (the feet overlay covers the walker); never over a torso
    const img = this.add.image(x * TILE, y * TILE, 'fx/grass_rustle', 0).setOrigin(0, 0)
      .setDepth(DEPTH.shadow + 1)
    this.fxs.push({ img, t: 0, frames: 4, rate: 4 })
  }

  /** Is the tile blocked for this actor (map, other actors, ground items, props, puzzle solids and floors)? */
  blocked(self: Actor, x: number, y: number): boolean {
    const map = this.map!
    if (!map.inBounds(x, y)) return true
    const raft = self === this.player && this.skills.rafting && this.isWaterish(x, y)
    if (raft) {
      const t = map.tileAt(x, y)
      if (t.solid && !t.water) return true
    } else if (map.isSolid(x, y)) return true
    if (this.actorAt(x, y, self)) return true
    if (this.items.some((i) => !i.hidden && i.obj.tx === x && i.obj.ty === y)) return true
    if (this.propAt(x, y, true)) return true
    if (this.puzzle) {
      if (this.puzzle.solidAt(x, y)) return true
      const f = this.puzzle.floorAt(x, y)
      if (f.gap && !f.bridged) return true
      if (f.rough_water && !raft) return true
    }
    return false
  }

  /** Map grid, ground items and solid props only (what a pushed block collides with besides puzzle objects). */
  baseBlocked(x: number, y: number): boolean {
    const map = this.map
    if (!map || !map.inBounds(x, y) || map.isSolid(x, y)) return true
    if (this.items.some((i) => !i.hidden && i.obj.tx === x && i.obj.ty === y)) return true
    return !!this.propAt(x, y, true)
  }

  /** Any visible actor (player included) on or entering (x, y). */
  actorOn(x: number, y: number): Actor | undefined {
    return this.actorAt(x, y)
  }

  /** A visible NPC on or entering (x, y). */
  npcOn(x: number, y: number): Actor | undefined {
    return this.npcAt(x, y)
  }

  private actorAt(x: number, y: number, except?: Actor): Actor | undefined {
    const all = [this.player, ...this.npcs.values()]
    return all.find((a) => a !== except && !a.hidden && ((a.tx === x && a.ty === y) || (a.moving && a.fromX === x && a.fromY === y)))
  }

  private npcAt(x: number, y: number): Actor | undefined {
    for (const n of this.npcs.values()) if (!n.hidden && ((n.tx === x && n.ty === y) || (n.moving && n.fromX === x && n.fromY === y))) return n
    return undefined
  }

  // ================================================================ step events

  /** Returns true if something took over (warp/trigger/battle). */
  private onPlayerLanded(): boolean {
    const p = this.player
    const map = this.map!
    if (!map.inBounds(p.tx, p.ty)) {
      void this.crossEdge()
      return true
    }
    state.x = p.tx
    state.y = p.ty
    state.facing = p.facing
    this.stepsSinceBattle++
    const repel = Number(state.getFlag('repel_steps') ?? 0)
    if (repel > 0) {
      state.setFlag('repel_steps', repel - 1 || false)
      if (repel === 1) {
        void this.runInline(async (s) => s.say('The Firewall\u2019s effect wore off\u2026'))
        return true
      }
    }
    // warp
    const warp = map.objectAt('warp', p.tx, p.ty)
    if (warp) {
      const tile = map.tileAt(p.tx, p.ty)
      const sfx = String(warp.props.sfx ?? (map.props.indoor ? 'exit' : tile.door ? 'door' : 'stairs'))
      void this.warp(String(warp.props.toMap ?? warp.props.map), String(warp.props.toSpawn ?? warp.props.spawn ?? ''),
        (warp.props.facing as Dir) || undefined, sfx)
      return true
    }
    // triggers
    for (const t of map.objects) {
      if (t.type !== 'trigger') continue
      if (p.tx < t.tx || p.tx >= t.tx + t.tw || p.ty < t.ty || p.ty >= t.ty + t.th) continue
      const pr = t.props
      if (pr.ifFlag && !state.flag(String(pr.ifFlag))) continue
      if (pr.unlessFlag && state.flag(String(pr.unlessFlag))) continue
      if (pr.once && state.flag(String(pr.once))) continue
      if (pr.once) state.setFlag(String(pr.once))
      if (pr.script) {
        void this.run(String(pr.script), undefined, { trigger: t })
        return true
      }
    }
    // floor effects, raft, puzzle kit (switches, keys, letters, forced moves, teleports)
    const tileHere = map.tileAt(p.tx, p.ty)
    const floorHere = this.puzzle?.floorAt(p.tx, p.ty)
    if (tileHere.puddle || floorHere?.puddle) this.splash(p.tx, p.ty)
    if (this.skills.rafting && !this.isWaterish(p.tx, p.ty)) this.skills.dismount()
    const forced = this.puzzle?.onLand(p.tx, p.ty, p.facing)
    if (forced?.teleport) {
      p.holdStand = false
      void this.teleport(forced.teleport.x, forced.teleport.y)
      return true
    }
    if (forced?.force && this.forcedSteps < 200 && this.forceStep(forced.force, !!forced.slide)) return true
    this.forcedSteps = 0
    p.holdStand = false
    this.updateZone(false)
    this.skills.onStep()
    if (this.checkTrainerSight()) return true
    // encounters: tall grass, or open water while rafting (zone/map `waterEncounters`)
    const onWater = this.skills.rafting && this.isWaterish(p.tx, p.ty)
    if ((tileHere.grass || onWater) && this.stepsSinceBattle > 2 && state.party.some((m) => m.hp > 0) && !state.flag('debug_no_encounters')) {
      const zp = this.zoneObj?.props ?? {}
      const key = onWater ? 'waterEncounters' : 'encounters'
      const evalKey = onWater ? 'evalWaterEncounters' : 'evalEncounters'
      const table = String((state.evalLight ? zp[evalKey] ?? map.props[evalKey] : undefined) ?? zp[key] ?? map.props[key] ?? '')
      const rate = table ? (encounterRate(table) ?? DEFAULT_ENCOUNTER_RATE) : 0
      if (table && rng() < rate) {
        const sampled = this.skills.takeSample()
        const req = wildRequest(sampled ?? rollEncounter(table) ?? pick(FALLBACK_WILD), randInt(2, 4))
        const lead = state.party.find((m) => m.hp > 0)
        if (Number(state.getFlag('repel_steps') ?? 0) > 0 && lead && req.enemyParty[0].level < lead.level) return false
        void this.runInline(async () => {
          await this.startBattle(req)
        })
        return true
      }
    }
    return false
  }

  /** Ice / conveyor / spinner: keep moving in `d` without input. Returns false if blocked (the slide ends). */
  private forceStep(d: Dir, slide: boolean): boolean {
    const p = this.player
    const v = DIR_VEC[d]
    const tx = p.tx + v.x
    const ty = p.ty + v.y
    p.face(d)
    const pz = this.puzzle
    const there = pz?.floorAt(tx, ty)
    if (!this.map!.inBounds(tx, ty) || this.blocked(p, tx, ty) || (there?.oneway && there.oneway !== d) || this.map!.tileAt(tx, ty).ledge || pz?.blockAt(tx, ty)) return false
    this.forcedSteps++
    p.holdStand = slide
    this.playerStepping = true
    p.chain(d, slide ? 8 : WALK_FRAMES)
    return true
  }

  /** Teleport pad: sparkle out, move, sparkle in. */
  private async teleport(x: number, y: number): Promise<void> {
    this.lockCount++
    try {
      audio.sfx('pc_on')
      await this.ui.flash(0xbca8f0, 180)
      this.player.place(x, y, this.player.facing)
      state.x = x
      state.y = y
      this.updateCamera()
      await this.ui.flash(0xbca8f0, 180)
      this.puzzle?.refresh()
      this.updateZone(false)
    } finally {
      this.lockCount--
    }
  }

  /** Stepped across the map edge into a connected neighbour: swap maps without a fade. */
  private async crossEdge(): Promise<void> {
    const p = this.player
    const nb = this.neighbourAt(p.tx, p.ty)
    if (!nb) {
      p.place(Phaser.Math.Clamp(p.tx, 0, this.map!.width - 1), Phaser.Math.Clamp(p.ty, 0, this.map!.height - 1))
      return
    }
    const lx = p.tx - nb.ox
    const ly = p.ty - nb.oy
    const camX = this.cameras.main.scrollX - nb.ox * TILE
    const camY = this.cameras.main.scrollY - nb.oy * TILE
    this.lockCount++
    this.transitioning = true
    try {
      await this.loadMap(nb.map.id, { x: lx, y: ly }, p.facing, { seamless: true })
      this.cameras.main.setScroll(Math.round(camX), Math.round(camY))
      this.updateCamera()
    } finally {
      this.lockCount--
      this.transitioning = false
    }
    await this.runOnEnter()
    const d = controls.dir()
    if (d && !this.busy) this.tryStep(d, false)
  }

  // ================================================================ zones / music

  private updateZone(arrival: boolean, seamless = false): void {
    const map = this.map!
    const p = this.player
    const zones = map.objectsOfType('zone').filter((z) => p.tx >= z.tx && p.tx < z.tx + z.tw && p.ty >= z.ty && p.ty < z.ty + z.th)
    zones.sort((a, b) => a.tw * a.th - b.tw * b.th) // smallest wins
    const z = zones[0]
    this.zoneObj = z
    const name = String(z?.props.name ?? z?.name ?? map.props.name ?? '')
    const changed = name !== this.zoneName
    const zoneChanged = z !== this.lastZoneObj
    this.lastZoneObj = z
    this.zoneName = name
    if (changed || arrival) this.playMapMusic()
    if (name && !map.props.indoor && name !== this.lastBanner) {
      this.ui.showBanner(name)
      this.lastBanner = name
    }
    if (changed || arrival) noteVisit(map.id, name)
    if (zoneChanged || arrival) {
      this.skills.onZoneChange(z)
      this.updateAtmosphere(arrival && !seamless)
    }
  }

  private lastZoneObj?: MapObject

  playMapMusic(): void {
    const m = String(this.zoneObj?.props.music ?? this.map?.props.music ?? '')
    if (m && m !== this.currentMusic) {
      audio.playMusic(m, { fadeMs: 600 })
      this.currentMusic = m
    } else if (m) {
      audio.playMusic(m, { fadeMs: 300 })
    }
  }

  // ================================================================ interaction

  private interact(): void {
    const p = this.player
    const map = this.map!
    const f = p.front()
    // puzzle kit: graph node under the feet, statue in front; field-skill objects in front
    if (this.puzzle?.interactHere(p.tx, p.ty)) return
    if (this.puzzle?.interactFacing(f.x, f.y)) return
    if (this.skills.interactFront()) return
    let npc = this.npcAt(f.x, f.y)
    if (!npc && map.tileAt(f.x, f.y).counter) {
      const v = DIR_VEC[p.facing]
      npc = this.npcAt(f.x + v.x, f.y + v.y)
    }
    if (npc) {
      void this.talk(npc)
      return
    }
    const item = this.items.find((i) => i.obj.tx === f.x && i.obj.ty === f.y)
    if (item && (!item.hidden || !this.isDark() || this.skills.lit(f.x, f.y))) {
      void this.pickUp(item)
      return
    }
    const prop = this.propAt(f.x, f.y, false)
    if (prop && (prop.data.script || prop.data.text)) {
      if (prop.data.script) void this.run(String(prop.data.script), undefined, { prop: prop.id })
      else void this.runInline(async (s) => s.say(unescape(String(prop.data.text))))
      return
    }
    const sign = map.objectAt('sign', f.x, f.y)
    // signs are read from below (facing up) unless the object sets `anySide`
    if (sign && (p.facing === 'up' || sign.props.anySide)) {
      const pr = sign.props
      if (pr.script) void this.run(String(pr.script), undefined, { sign })
      else if (pr.text) void this.runInline(async (s) => s.say(unescape(String(pr.text))))
      return
    }
  }

  private async talk(npc: Actor): Promise<void> {
    this.lockCount++
    try {
      npc.data.talking = true
      while (npc.moving) await this.nextFrame()
      if (!npc.data.noFace) npc.face(OPPOSITE[this.player.facing])
      const trainer = npc.data.trainer ? String(npc.data.trainer) : ''
      if (trainer && !this.trainerDefeated(npc)) {
        await this.trainerBattleFlow(npc)
      } else if (state.evalLight && (npc.data.evalScript || npc.data.evalText)) {
        // EVAL light on: the NPC's "observed" behaviour
        if (npc.data.evalScript) await this.run(String(npc.data.evalScript), npc.id)
        else await this.runInline(async (s) => s.say(unescape(String(npc.data.evalText))))
      } else if (npc.data.script) {
        await this.run(String(npc.data.script), npc.id)
      } else if (trainer && (npc.data.afterText || trainerInfo(trainer).defeated)) {
        await this.runInline(async (s) => s.say(unescape(String(npc.data.afterText ?? trainerInfo(trainer).defeated))))
      } else if (npc.data.text) {
        await this.runInline(async (s) => s.say(unescape(String(npc.data.text))))
      }
    } finally {
      npc.data.talking = false
      this.lockCount--
    }
  }

  private async pickUp(item: GroundItem): Promise<void> {
    const o = item.obj
    const id = String(o.props.itemId ?? 'patch')
    const count = Number(o.props.count ?? 1)
    state.setFlag(String(o.props.flag ?? `item_${this.mapId}_${o.id}`))
    item.img?.destroy()
    this.items = this.items.filter((i) => i !== item)
    await this.runInline(async (s) => s.giveItem(id, count, { verb: 'found' }))
  }

  /** Hidden ground items (tiles) still on the map: Dilate's light reveals them. */
  hiddenItemTiles(): Array<{ x: number; y: number }> {
    return this.items.filter((i) => i.hidden).map((i) => ({ x: i.obj.tx, y: i.obj.ty }))
  }

  // ================================================================ trainers

  private trainerFlag(npc: Actor): string {
    return String(npc.data.defeatedFlag ?? `trainer_${npc.data.trainer}_defeated`)
  }

  private trainerDefeated(npc: Actor): boolean {
    return state.flag(this.trainerFlag(npc))
  }

  /**
   * After a player step / turn (or a trainer turning): does any trainer see the player?
   * Only while the player stands still on a tile and nothing else is running, so one
   * sighting can never start a second approach (QA P0: double flows over-walked onto the
   * player and leaked a lock).
   */
  private checkTrainerSight(): boolean {
    const p = this.player
    if (p.moving || this.spotting || this.lockCount > 0 || scriptsRunning() > 0 || this.transitioning) return false
    for (const n of this.npcs.values()) {
      const sight = Number(n.data.sight ?? 0)
      if (!sight || n.hidden || !n.data.trainer || this.trainerDefeated(n) || n.moving || n.data.talking) continue
      const v = DIR_VEC[n.facing]
      for (let k = 1; k <= sight; k++) {
        const x = n.tx + v.x * k
        const y = n.ty + v.y * k
        if (p.tx === x && p.ty === y) {
          void this.trainerSpotted(n, k - 1)
          return true
        }
        if (this.map!.isSolid(x, y) || this.npcAt(x, y) || this.puzzle?.solidAt(x, y)) break
      }
    }
    return false
  }

  private async trainerSpotted(npc: Actor, steps: number): Promise<void> {
    this.spotting = true
    this.lockCount++
    try {
      npc.data.talking = true
      while (this.player.moving) await this.nextFrame()
      audio.playMusic('encounter_trainer')
      await this.emote(npc.id, 'exclaim')
      // Walk until adjacent, re-measured every step; never onto the player or through a blocker.
      const v = DIR_VEC[npc.facing]
      for (let i = 0; i < steps + 1; i++) {
        const dist = Math.abs(this.player.tx - npc.tx) + Math.abs(this.player.ty - npc.ty)
        if (dist <= 1 || this.blocked(npc, npc.tx + v.x, npc.ty + v.y)) break
        await npc.step(npc.facing, WALK_FRAMES)
      }
      this.player.face(OPPOSITE[npc.facing])
      await this.trainerBattleFlow(npc)
    } finally {
      npc.data.talking = false
      this.spotting = false
      this.lockCount--
    }
  }

  private async trainerBattleFlow(npc: Actor): Promise<void> {
    const trainerId = String(npc.data.trainer)
    if (npc.data.sightScript || npc.data.script) {
      await this.run(String(npc.data.sightScript ?? npc.data.script), npc.id)
      return
    }
    await this.runInline(async (s) => {
      const intro = String(npc.data.seeText ?? trainerInfo(trainerId).intro ?? '')
      if (intro) await s.say(unescape(intro))
      await s.trainerBattle(trainerId)
    }, npc.id)
  }

  // ================================================================ NPC AI

  private npcAI(n: Actor): void {
    if (n.hidden || n.moving || n.data.talking || n.movement === 'static') return
    if (--n.aiTimer > 0) return
    if (n.movement === 'look') {
      n.face(pick(['down', 'up', 'left', 'right'] as Dir[]))
      n.aiTimer = randInt(90, 240)
      this.checkTrainerSight()
      return
    }
    // wander
    n.aiTimer = randInt(60, 180)
    const d = pick(['down', 'up', 'left', 'right'] as Dir[])
    const v = DIR_VEC[d]
    const x = n.tx + v.x
    const y = n.ty + v.y
    const r = Number(n.data.radius ?? 2)
    if (Math.abs(x - n.homeX) > r || Math.abs(y - n.homeY) > r || this.blocked(n, x, y) || this.map!.objectAt('warp', x, y)) {
      n.face(d)
      return
    }
    void n.step(d, WALK_FRAMES)
  }

  // ================================================================ scripts

  private nextFrame(): Promise<void> {
    return new Promise((r) => this.time.delayedCall(0, r))
  }

  /** Run a registered script, then refresh NPC visibility. */
  async run(id: string, self?: string, ctx?: Record<string, unknown>): Promise<void> {
    await runScript(this.game, id, { self, ctx })
    this.refreshNpcVisibility()
  }

  async runInline(fn: Parameters<typeof runScript>[1], self?: string): Promise<void> {
    await runScript(this.game, fn, { self })
    this.refreshNpcVisibility()
  }

  // ================================================================ WorldApi

  private actor(id: string): Actor | undefined {
    return id === 'player' ? this.player : this.npcs.get(id)
  }

  hasActor(id: string): boolean {
    return !!this.actor(id)
  }

  actorPos(id: string): { x: number; y: number; facing: Dir } | null {
    const a = this.actor(id)
    return a ? { x: a.tx, y: a.ty, facing: a.facing } : null
  }

  async moveActor(id: string, dirs: Dir[], opts: { speed?: 'walk' | 'run' | 'slow'; collide?: boolean } = {}): Promise<void> {
    const a = this.actor(id)
    if (!a) {
      console.warn(`[script] move: no actor '${id}'`)
      return
    }
    while (a.moving) await this.nextFrame()
    const frames = opts.speed === 'run' ? RUN_FRAMES : opts.speed === 'slow' ? WALK_FRAMES * 2 : WALK_FRAMES
    if (!opts.collide) {
      await a.walk(dirs, frames)
    } else {
      for (const d of dirs) {
        const v = DIR_VEC[d]
        if (this.blocked(a, a.tx + v.x, a.ty + v.y)) {
          a.face(d)
          break
        }
        await a.step(d, frames)
      }
    }
    if (a === this.player) {
      state.x = a.tx
      state.y = a.ty
      state.facing = a.facing
    }
  }

  faceActor(id: string, dir: Dir): void {
    this.actor(id)?.face(dir)
  }

  async emote(id: string, kind: EmoteKind): Promise<void> {
    const a = this.actor(id)
    if (!a) return
    const key = `fx/emote_${kind === 'music' ? 'note' : kind}` // 'music' is an alias of 'note'
    if (kind === 'exclaim') audio.sfx('exclaim')
    const x = a.px
    const y = a.py + TILE - 24 - 15 // bubble sits 1px into the frame top (new, smaller heads)
    const img = this.add.image(x, y + 4, this.textures.exists(key) ? key : 'fx/emote_exclaim').setOrigin(0, 0).setDepth(DEPTH.fx)
    const pop = ms(60)
    if (pop) {
      await new Promise<void>((r) => this.tweens.add({ targets: img, y, duration: pop, ease: 'Back.Out', onComplete: () => r() }))
    } else img.setY(y)
    await new Promise((r) => this.time.delayedCall(ms(600), r))
    img.destroy()
  }

  async warp(mapId: string, spawn: string | { x: number; y: number }, facing?: Dir, sfx?: string): Promise<void> {
    if (this.transitioning) return
    this.transitioning = true
    this.lockCount++
    try {
      if (sfx) audio.sfx(sfx)
      await this.ui.fade(1, FADE_MS)
      this.ui.banner.clear()
      this.doorFx?.destroy()
      this.doorFx = undefined
      await this.loadMap(mapId, spawn, facing)
      // exiting through an outdoor door: start with the doorway open
      const p = this.player
      const t = this.map!.tileAt(p.tx, p.ty)
      // Arriving on an outdoor door tile: step out of it (in the arrival facing, normally down).
      const exitDoor = t.door && !this.map!.props.indoor
      const outDir = p.facing
      let g: Phaser.GameObjects.Graphics | undefined
      if (exitDoor && outDir === 'down') {
        g = this.add.graphics().setDepth(DEPTH.shadow - 2)
        this.drawDoor(g, p.tx, p.ty, 1)
      }
      await this.ui.fade(0, FADE_MS)
      if (exitDoor) {
        const sx = p.tx
        const sy = p.ty
        const v = DIR_VEC[outDir]
        if (!this.blocked(p, p.tx + v.x, p.ty + v.y)) {
          await p.step(outDir, WALK_FRAMES)
          state.x = p.tx
          state.y = p.ty
        }
        if (g) {
          await this.animateDoor(g, sx, sy, 1, 0)
          g.destroy()
        }
      }
      await this.runOnEnter()
    } finally {
      this.lockCount--
      this.transitioning = false
    }
  }

  /** Arrive after a region-travel card: the screen is already black (no fade-out, no door step). */
  async travelArrive(mapId: string, spawn: string | { x: number; y: number }, facing?: Dir): Promise<void> {
    if (this.transitioning) return
    this.transitioning = true
    this.lockCount++
    try {
      this.ui.banner.clear()
      await this.loadMap(mapId, spawn, facing)
      await this.ui.fade(0, FADE_MS)
      await this.runOnEnter()
    } finally {
      this.lockCount--
      this.transitioning = false
    }
  }

  spawnNpc(def: NpcDef): void {
    this.npcs.get(def.id)?.destroy()
    const a = new Actor(this, { id: def.id, sprite: def.sprite, x: def.x, y: def.y, facing: def.facing ?? 'down' })
    a.movement = def.movement ?? 'static'
    a.data = { script: def.script, text: def.text }
    a.grassAt = (x, y) => this.map?.grassFrameAt(x, y) ?? null
    a.aiTimer = randInt(60, 200)
    this.npcs.set(def.id, a)
  }

  spawnProp(id: string, key: string, x: number, y: number, opts: PropOptions = {}): void {
    this.addProp(id, key, x, y, { ...opts, data: { script: opts.script, text: opts.text } })
  }

  despawnProp(id: string): void {
    this.props.get(id)?.img.destroy()
    this.props.delete(id)
  }

  setPropHidden(id: string, hidden: boolean): void {
    const pr = this.props.get(id)
    if (!pr) return
    pr.scriptHidden = hidden
    this.refreshNpcVisibility()
  }

  propPos(id: string): { x: number; y: number } | null {
    const pr = this.props.get(id)
    return pr ? { x: Math.round(pr.x / TILE), y: Math.round(pr.y / TILE) } : null
  }

  /** Slide a prop along a path ("right 12", Dir[]) or to a tile {x, y}; collision follows it. */
  async moveProp(id: string, to: Dir[] | { x: number; y: number }, durationMs: number, ease = 'Sine.InOut'): Promise<void> {
    const pr = this.props.get(id)
    if (!pr) {
      console.warn(`[script] moveProp: no prop '${id}'`)
      return
    }
    const pts: Array<{ x: number; y: number }> = []
    if (Array.isArray(to)) {
      let x = pr.x
      let y = pr.y
      let last: Dir | null = null
      for (const d of to) {
        x += DIR_VEC[d].x * TILE
        y += DIR_VEC[d].y * TILE
        if (d === last) pts[pts.length - 1] = { x, y }
        else pts.push({ x, y })
        last = d
      }
    } else pts.push({ x: to.x * TILE, y: to.y * TILE })
    let prev = { x: pr.x, y: pr.y }
    const total = pts.reduce((sum, q) => {
      const l = Math.abs(q.x - prev.x) + Math.abs(q.y - prev.y)
      prev = q
      return sum + l
    }, 0) || 1
    for (const q of pts) {
      const len = Math.abs(q.x - pr.x) + Math.abs(q.y - pr.y)
      const dur = ms((durationMs * len) / total)
      if (!dur) {
        pr.x = q.x
        pr.y = q.y
        this.placeProp(pr)
        continue
      }
      await new Promise<void>((res) => this.tweens.add({
        targets: pr, x: q.x, y: q.y, duration: dur, ease: pts.length > 1 ? 'Linear' : ease,
        onUpdate: () => this.placeProp(pr),
        onComplete: () => {
          this.placeProp(pr)
          res()
        },
      }))
    }
  }

  despawnNpc(id: string): void {
    this.npcs.get(id)?.destroy()
    this.npcs.delete(id)
  }

  setNpcHidden(id: string, hidden: boolean): void {
    const a = this.npcs.get(id)
    if (!a) return
    a.data.scriptHidden = hidden
    a.setHidden(hidden)
  }

  setNpcSprite(id: string, sprite: string): void {
    this.actor(id)?.setTexture(sprite)
  }

  cameraPan(dxTiles: number, dyTiles: number, durationMs: number): Promise<void> {
    return new Promise((r) => this.tweens.add({ targets: this.camOffset, x: dxTiles * TILE, y: dyTiles * TILE, duration: ms(durationMs) || 1, ease: 'Sine.InOut', onComplete: () => r() }))
  }

  cameraReset(durationMs: number): Promise<void> {
    return this.cameraPan(0, 0, durationMs)
  }

  lock(): void {
    this.lockCount++
  }

  unlock(): void {
    this.lockCount = Math.max(0, this.lockCount - 1)
  }

  shake(durationMs: number, intensity = 2): Promise<void> {
    return new Promise((r) => {
      this.cameras.main.shake(ms(durationMs), intensity / W)
      this.time.delayedCall(ms(durationMs), r)
    })
  }

  flash(color = 0xffffff, durationMs = 200): Promise<void> {
    return this.ui.flash(color, durationMs)
  }

  async startBattle(req: BattleRequest): Promise<BattleResult> {
    this.lockCount++
    try {
      for (const m of req.enemyParty) state.markSeen(m.speciesId)
      audio.playMusic(req.music ?? (req.kind === 'trainer' ? 'battle_trainer' : 'battle_wild'))
      audio.sfx('battle_start')
      await this.ui.battleTransition()
      this.scene.pause()
      const result = await new Promise<BattleResult>((resolve) => {
        this.scene.launch('Battle', { request: req, onDone: resolve })
      })
      if (this.scene.isActive('Battle') || this.scene.isPaused('Battle')) this.scene.stop('Battle')
      this.scene.resume()
      // resume() is queued while the scene manager is mid-step (onDone fires from Battle's update):
      // wait until we are really running again before scripts continue (QA P1, ?fast=1 rescue).
      for (let i = 0; i < 60 && !this.sys.isActive(); i++) await new Promise<void>((r) => this.ui.time.delayedCall(0, r))
      this.stepsSinceBattle = 0
      controls.consumeAll()
      if (result.outcome === 'win' && req.kind === 'trainer' && req.trainer) state.setFlag(`trainer_${req.trainer.id}_defeated`)
      if (result.outcome === 'lose' && !req.safety) {
        await this.whiteOut()
        return result
      }
      this.currentMusic = ''
      this.playMapMusic()
      await this.ui.fade(0, FADE_MS)
      return result
    } finally {
      this.lockCount--
    }
  }

  async whiteOut(): Promise<void> {
    this.lockCount++
    try {
      await this.ui.fade(1, FADE_MS)
      state.money = Math.floor(state.money / 2)
      state.healParty()
      const hp = state.healPoint.map ? state.healPoint : content.healPoint ?? { map: content.startMap ?? '_test', spawn: content.startSpawn ?? 'start' }
      await this.loadMap(hp.map, hp.spawn, 'up')
      state.setFlag('just_whited_out')
      this.currentMusic = ''
      this.playMapMusic()
      await this.ui.fade(0, FADE_MS)
      await this.runOnEnter()
      if (content.whiteOutScript) await this.run(content.whiteOutScript)
      else await this.ui.say('{player} hurried back to a safe place\nand patched up the team…')
    } finally {
      this.lockCount--
    }
  }

  // ================================================================ camera

  private updateCamera(): void {
    const map = this.map
    if (!map) return
    const cam = this.cameras.main
    // bounds: this map, extended over connected neighbours so the edges show the next map
    let x0 = 0
    let y0 = 0
    let x1 = map.pixelWidth
    let y1 = map.pixelHeight
    for (const n of this.neighbours) {
      if (n.dir === 'west') x0 = Math.min(x0, n.ox * TILE)
      if (n.dir === 'east') x1 = Math.max(x1, (n.ox + n.map.width) * TILE)
      if (n.dir === 'north') y0 = Math.min(y0, n.oy * TILE)
      if (n.dir === 'south') y1 = Math.max(y1, (n.oy + n.map.height) * TILE)
    }
    let sx = this.player.px - PLAYER_SCREEN_X + this.camOffset.x
    let sy = this.player.py - PLAYER_SCREEN_Y + this.camOffset.y
    sx = x1 - x0 <= W ? (x0 + x1 - W) / 2 : Phaser.Math.Clamp(sx, x0, x1 - W)
    sy = y1 - y0 <= H ? (y0 + y1 - H) / 2 : Phaser.Math.Clamp(sy, y0, y1 - H)
    cam.setScroll(Math.round(sx), Math.round(sy))
  }

  // ================================================================ debug

  info(): Record<string, unknown> {
    return {
      map: this.mapId,
      x: this.player?.tx,
      y: this.player?.ty,
      facing: this.player?.facing,
      zone: this.zoneName,
      weather: this.weather?.kind ?? '',
      dark: this.light?.on ?? false,
      lightTiles: this.light?.on ? this.light.litTiles() : 0,
      rafting: this.skills?.rafting ?? false,
      neighbours: this.neighbours.map((n) => n.map.id),
      busy: this.ready ? this.busy : true,
      moving: this.player?.moving,
      npcs: [...this.npcs.values()].map((n) => ({ id: n.id, x: n.tx, y: n.ty, facing: n.facing, hidden: n.hidden })),
    }
  }

  /** Debug warp without fades. */
  async debugWarp(mapId: string, spawnOrX: string | number, y?: number): Promise<void> {
    const target = typeof spawnOrX === 'number' ? { x: spawnOrX, y: y ?? 0 } : spawnOrX
    await this.warp(mapId, target)
  }
}

function unescape(s: string): string {
  return s.replace(/\\n/g, '\n').replace(/\\f/g, '\f')
}
