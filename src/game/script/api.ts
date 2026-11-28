// The script API handed to every content script: `async (s) => { await s.say('Hi!') }`.
// See docs/ENGINE_API.md for the full reference with examples.

import Phaser from 'phaser'
import type { BattleRequest, BattleResult, MonInstance } from '../types'
import { DIRS, type Dir } from '../config'
import { audio } from '../audio'
import { state, type FlagValue } from '../state'
import { ms } from '../params'
import { createMon, itemInfo, monName, speciesName, trainerRequest, tutorialRequest, wildRequest } from '../adapters/monInfo'
import { getUI, type UIScene } from '../scenes/UIScene'
import type { SayOptions } from '../ui/DialogBox'
import type { ListOptions } from '../ui/ListMenu'
import type { NameEntryOptions } from '../ui/screens/NameEntryScreen'
import { openStorage } from '../ui/screens/StorageScreen'
import { getScript } from './registry'
import type { OverworldScene } from '../scenes/OverworldScene'
import { notebookPage, markPageFound, pageFound, type NotebookPage } from '../systems/notebook'
import { badgeCount, badgeDef, badgeFlag, hasBadge } from '../systems/badges'
import { skillUnlocked, type SkillId } from '../systems/skills'
import { tamper } from '../systems/tamper'
import { location } from '../systems/locations'
import { iconTexture } from '../world/kitTextures'
import { onPuzzleEvent, type PuzzleEvent } from '../world/Puzzle'
import type { CompGraph } from '../world/graph'
import type { WeatherKind } from '../world/Atmosphere'
import type { TravelKind } from '../ui/Cutscenes'
import { TownMapScreen } from '../ui/screens/TownMapScreen'
import { showMeter, type MeterOptions } from '../ui/TamperMeter'

export type EmoteKind = 'exclaim' | 'question' | 'heart' | 'dots' | 'note' | 'music'

export interface NpcDef {
  id: string
  sprite: string
  x: number
  y: number
  facing?: Dir
  movement?: 'static' | 'look' | 'wander'
  script?: string
  text?: string
}

/** Options for spawnProp (see docs/ENGINE_API.md §Props). */
export interface PropOpts {
  frame?: number | string
  /** Blocks movement over its footprint (default true). */
  solid?: boolean
  /** 'y' = sorted with characters (default), 'ground' = under characters, 'over' = above everything. */
  depth?: 'y' | 'ground' | 'over'
  /** Footprint in tiles (default: image width; 1 row, or 2 if the image is ≥ 32px tall). */
  w?: number
  h?: number
  offsetX?: number
  offsetY?: number
  /** A-press while facing it. */
  script?: string
  text?: string
}

/** What a scene must provide for world commands (OverworldScene implements it). */
export interface WorldApi {
  hasActor(id: string): boolean
  actorPos(id: string): { x: number; y: number; facing: Dir } | null
  moveActor(id: string, dirs: Dir[], opts?: { speed?: 'walk' | 'run' | 'slow'; collide?: boolean }): Promise<void>
  faceActor(id: string, dir: Dir): void
  emote(id: string, kind: EmoteKind): Promise<void>
  warp(map: string, spawn: string | { x: number; y: number }, facing?: Dir, sfx?: string): Promise<void>
  spawnProp(id: string, key: string, x: number, y: number, opts?: PropOpts): void
  despawnProp(id: string): void
  setPropHidden(id: string, hidden: boolean): void
  propPos(id: string): { x: number; y: number } | null
  moveProp(id: string, to: Dir[] | { x: number; y: number }, durationMs: number, ease?: string): Promise<void>
  spawnNpc(def: NpcDef): void
  despawnNpc(id: string): void
  setNpcHidden(id: string, hidden: boolean): void
  setNpcSprite(id: string, sprite: string): void
  cameraPan(dxTiles: number, dyTiles: number, durationMs: number): Promise<void>
  cameraReset(durationMs: number): Promise<void>
  startBattle(req: BattleRequest): Promise<BattleResult>
  whiteOut(): Promise<void>
  lock(): void
  unlock(): void
  shake(durationMs: number, intensity?: number): Promise<void>
  flash(color?: number, durationMs?: number): Promise<void>
  playMapMusic(): void
  readonly mapId: string
}

/** Parse "up 2, left, down 3" (or ['up','up','left']) into steps. */
export function parsePath(path: string | Dir[]): Dir[] {
  if (Array.isArray(path)) return path
  const out: Dir[] = []
  for (const part of path.split(/[,;]+/)) {
    const m = part.trim().match(/^(up|down|left|right|u|d|l|r)\s*(\d+)?$/i)
    if (!m) {
      if (part.trim()) console.warn(`[script] bad path segment '${part}'`)
      continue
    }
    const k = m[1].toLowerCase()
    const d = (k.length === 1 ? { u: 'up', d: 'down', l: 'left', r: 'right' }[k] : k) as Dir
    for (let i = 0; i < Number(m[2] ?? 1); i++) out.push(d)
  }
  return out
}

export class ScriptApi {
  readonly game: Phaser.Game
  /** Id of the NPC whose script this is (talk/sight), if any. */
  readonly self?: string
  /** Extra context (e.g. the trigger/sign object props). */
  readonly ctx: Record<string, unknown>
  readonly state = state
  /** Intro-scene stage controls (only inside the Intro scene). */
  stage?: IntroStage

  constructor(game: Phaser.Game, self?: string, ctx: Record<string, unknown> = {}, stage?: IntroStage) {
    this.game = game
    this.self = self
    this.ctx = ctx
    this.stage = stage
  }

  private get ui(): UIScene {
    return getUI(this.game)
  }

  /** The overworld (throws if the script runs where there is no world). */
  get world(): WorldApi {
    const ow = this.game.scene.getScene('Overworld') as unknown as WorldApi & Phaser.Scene
    if (!ow || !ow.scene.isActive()) throw new Error('[script] world command used outside the overworld')
    return ow
  }

  private actorId(id: string | undefined): string {
    if (!id || id === 'self') {
      if (!this.self) throw new Error('[script] no `self` actor in this script')
      return this.self
    }
    return id
  }

  // ------------------------------------------------------------ text
  /** Show a message. `\n` line break, `\f` page break, `{player}` name. */
  say(text: string, opts?: SayOptions | string): Promise<void> {
    const o = typeof opts === 'string' ? { speaker: opts } : opts
    return this.ui.say(text, o)
  }
  /** Prompt + list; resolves with the chosen index (B picks the last option). */
  choice(prompt: string, options: string[], opts?: ListOptions & SayOptions): Promise<number> {
    return this.ui.ask(prompt, options, opts)
  }
  yesNo(prompt: string, opts?: SayOptions): Promise<boolean> {
    return this.ui.yesNo(prompt, opts)
  }
  banner(text: string): void {
    this.ui.showBanner(text)
  }
  /** Offer names from a list (plus the current one); sets state.playerName. */
  /** Player naming: letter-grid screen (presets offered via "PICK A NAME FOR ME"); sets state.playerName. */
  async chooseName(prompt: string, presets: string[] = []): Promise<string> {
    state.playerName = await this.ui.nameEntry({ title: prompt, initial: state.playerName, max: 8, icon: 'chars/player', presets })
    return state.playerName
  }
  /** Generic naming screen (nicknames etc.); resolves with the confirmed text. */
  nameEntry(o: NameEntryOptions): Promise<string> {
    return this.ui.nameEntry(o)
  }

  // ------------------------------------------------------------ timing / screen
  wait(msec: number): Promise<void> {
    return new Promise((r) => this.ui.time.delayedCall(Math.max(0, msec), r))
  }
  fadeOut(msec = 250): Promise<void> {
    return this.ui.fade(1, msec)
  }
  fadeIn(msec = 250): Promise<void> {
    return this.ui.fade(0, msec)
  }
  shake(msec = 300, intensity = 2): Promise<void> {
    return this.world.shake(msec, intensity)
  }
  flash(color = 0xffffff, msec = 200): Promise<void> {
    return this.world.flash(color, msec)
  }

  // ------------------------------------------------------------ actors
  /** Walk an actor ('player', npc id, or 'self') along a path like "up 2, left". */
  move(actor: string, path: string | Dir[], opts?: { speed?: 'walk' | 'run' | 'slow'; collide?: boolean }): Promise<void> {
    return this.world.moveActor(this.actorId(actor), parsePath(path), opts)
  }
  /** Face a direction, or face another actor ('player', npc id). */
  face(actor: string, dirOrActor: Dir | string): void {
    const id = this.actorId(actor)
    if ((DIRS as string[]).includes(dirOrActor)) return this.world.faceActor(id, dirOrActor as Dir)
    const a = this.world.actorPos(id)
    const b = this.world.actorPos(this.actorId(dirOrActor))
    if (!a || !b) return
    const dx = b.x - a.x
    const dy = b.y - a.y
    this.world.faceActor(id, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
  }
  emote(actor: string, kind: EmoteKind = 'exclaim'): Promise<void> {
    return this.world.emote(this.actorId(actor), kind)
  }
  pos(actor: string): { x: number; y: number; facing: Dir } | null {
    return this.world.actorPos(this.actorId(actor))
  }
  spawn(def: NpcDef): void {
    this.world.spawnNpc(def)
  }
  despawn(id: string): void {
    this.world.despawnNpc(this.actorId(id))
  }
  hide(id: string): void {
    this.world.setNpcHidden(this.actorId(id), true)
  }
  show(id: string): void {
    this.world.setNpcHidden(this.actorId(id), false)
  }
  /** Place a static sprite whose footprint's top-left tile is (x, y), e.g. spawnProp('satchel', 'fx/satchel', 12, 40). */
  spawnProp(id: string, key: string, x: number, y: number, opts?: PropOpts): void {
    this.world.spawnProp(id, key, x, y, opts)
  }
  despawnProp(id: string): void {
    this.world.despawnProp(id)
  }
  hideProp(id: string): void {
    this.world.setPropHidden(id, true)
  }
  showProp(id: string): void {
    this.world.setPropHidden(id, false)
  }
  propPos(id: string): { x: number; y: number } | null {
    return this.world.propPos(id)
  }
  /** Slide a prop along "right 12" / Dir[] or to {x, y} (tiles) over durationMs. Collision follows it. */
  moveProp(id: string, to: string | Dir[] | { x: number; y: number }, durationMs = 1000, ease?: string): Promise<void> {
    const target = typeof to === 'string' || Array.isArray(to) ? parsePath(to as string | Dir[]) : to
    return this.world.moveProp(id, target, durationMs, ease)
  }
  setSprite(id: string, sprite: string): void {
    this.world.setNpcSprite(this.actorId(id), sprite)
  }
  /** Lock/unlock player input beyond this script (scripts already lock while running). */
  lock(): void {
    this.world.lock()
  }
  unlock(): void {
    this.world.unlock()
  }
  cameraPan(dxTiles: number, dyTiles: number, msec = 600): Promise<void> {
    return this.world.cameraPan(dxTiles, dyTiles, msec)
  }
  cameraReset(msec = 600): Promise<void> {
    return this.world.cameraReset(msec)
  }

  // ------------------------------------------------------------ map
  warp(map: string, spawn: string | { x: number; y: number }, facing?: Dir, sfx?: string): Promise<void> {
    return this.world.warp(map, spawn, facing, sfx)
  }
  get mapId(): string {
    return state.map
  }

  // ------------------------------------------------------------ flags
  flag(k: string): boolean {
    return state.flag(k)
  }
  getFlag(k: string): FlagValue | undefined {
    return state.getFlag(k)
  }
  setFlag(k: string, v: FlagValue = true): void {
    state.setFlag(k, v)
  }
  clearFlag(k: string): void {
    state.setFlag(k, false)
  }
  /** Set the white-out respawn point (call at a heal spot). */
  setHealPoint(map: string, spawn: string): void {
    state.healPoint = { map, spawn }
  }

  // ------------------------------------------------------------ items / mons / money
  async giveItem(itemId: string, count = 1, opts: { silent?: boolean; verb?: string } = {}): Promise<void> {
    state.addItem(itemId, count)
    if (!opts.silent) await this.ui.itemGet(itemId, count, opts.verb ?? 'received')
  }
  takeItem(itemId: string, count = 1): boolean {
    return state.removeItem(itemId, count)
  }
  hasItem(itemId: string, count = 1): boolean {
    return state.itemCount(itemId) >= count
  }
  itemName(itemId: string): string {
    return itemInfo(itemId).name
  }
  async giveMon(speciesId: string, level: number, opts: { nickname?: string; silent?: boolean } = {}): Promise<MonInstance> {
    const mon = createMon(speciesId, level, { nickname: opts.nickname })
    const where = state.addMon(mon)
    if (!opts.silent) {
      audio.sfx('key_item_get')
      await this.say(`{player} received ${monName(mon)}!`)
      if (where === 'box') await this.say(`Your party is full, so ${monName(mon)} was sent to storage.`)
    }
    return mon
  }
  speciesName(id: string): string {
    return speciesName(id)
  }
  get money(): number {
    return state.money
  }
  addMoney(n: number): void {
    state.addMoney(n)
  }
  /** Restore HP/PP/status of the whole party (with jingle unless silent). */
  async healParty(opts: { silent?: boolean } = {}): Promise<void> {
    state.healParty()
    if (!opts.silent) {
      audio.sfx('heal')
      await this.wait(ms(1200))
    }
  }

  // ------------------------------------------------------------ notebook, badges, skills
  /**
   * Mark a Notebook page found: toast "New Notebook page!" + jingle. Returns false (and does
   * nothing visible) if it was already found. Pages are registered by CONTENT with
   * `registerNotebookPage` (systems/notebook.ts).
   */
  async unlockPage(id: string, opts: { silent?: boolean } = {}): Promise<boolean> {
    if (!markPageFound(id)) return false
    if (!opts.silent) {
      const p = notebookPage(id)
      audio.sfx('item_get')
      this.ui.toast(p ? `NOTEBOOK: ${p.title}` : 'New Notebook page!', iconTexture(this.ui, 'notebook'))
    }
    return true
  }
  hasPage(id: string): boolean {
    return pageFound(id)
  }
  page(id: string): NotebookPage | undefined {
    return notebookPage(id)
  }
  /** Award a gym badge: sets flag `badge_<id>`, plays the badge-get scene (spin-in, fanfare, two lines). */
  async giveBadge(id: string, leader?: string, opts: { silent?: boolean } = {}): Promise<void> {
    if (!badgeDef(id)) console.warn(`[script] giveBadge: unknown badge '${id}'`)
    state.setFlag(badgeFlag(id))
    if (!opts.silent) await this.ui.badgeGet(id, leader)
  }
  hasBadge(id: string): boolean {
    return hasBadge(id)
  }
  badgeCount(): number {
    return badgeCount()
  }
  skillUnlocked(id: SkillId): boolean {
    return skillUnlocked(id)
  }
  /** Use a field skill as if chosen from the FIELD menu (no-op when locked). */
  async useSkill(id: SkillId): Promise<void> {
    await this.ow.skills.use(id)
  }
  /** Non-blocking notice above the dialog area. */
  toast(text: string, icon?: string): void {
    this.ui.toast(text, icon)
  }

  // ------------------------------------------------------------ world state
  /** The EVAL light (saved as flag `eval_light`). NPCs with eval* props switch behaviour. */
  get evalLight(): boolean {
    return state.evalLight
  }
  setEvalLight(on: boolean): void {
    if (state.evalLight !== on) audio.sfx(on ? 'select' : 'cancel')
    state.evalLight = on
  }
  /** Interface tampering (systems/tamper.ts): scramble/relabel text, fake bars, grey menu entries, Probe. */
  get tamper(): typeof tamper {
    return tamper
  }
  /** Show a labelled bar that respects tampering (`tamper.setFake(id, v)`); A closes. The finale's display-vs-truth demo. */
  meter(o: MeterOptions): Promise<void> {
    return showMeter(this.ui, o)
  }
  /** Override the weather ('snow' | 'rain' | 'fog' | 'leaves' | ''); null = back to the map/zone's. */
  setWeather(kind: WeatherKind | null): void {
    this.ow.weatherOverride = kind
    this.ow.updateAtmosphere()
  }
  /** Override darkness (null = the map/zone's `dark`). */
  setDark(on: boolean | null): void {
    this.ow.darkOverride = on
    this.ow.updateAtmosphere()
  }
  /** The puzzle kit of the current map (counters, timers, graph floor, vars, reset, events). */
  get puzzle(): PuzzleApi {
    return new PuzzleApi(() => this.ow)
  }
  /** Town Map (view) or `{ fly: true }` (Attend's picker; resolves with a location id or null). */
  async townMap(o: { fly?: boolean } = {}): Promise<string | null> {
    const ui = this.ui
    await ui.fade(1, 160)
    const p = new TownMapScreen(ui, ui.stack, { mode: o.fly ? 'fly' : 'view' }).run()
    await ui.fade(0, 160)
    const r = await p
    await ui.fade(1, 160)
    await ui.fade(0, 160)
    return r
  }
  /**
   * Region travel: fade, a train / plane / ferry card ("FROM ▶ TO"), then (if `map` is given,
   * or `to` is a location id with an arrival) the warp, and fade back in.
   */
  async travelCutscene(o: { kind: TravelKind; from: string; to: string; map?: string; spawn?: string; facing?: Dir }): Promise<void> {
    const dest = location(o.to)
    const name = (id: string) => location(id)?.name ?? id
    await this.ui.travelCard(o.kind, name(o.from), name(o.to))
    const map = o.map ?? dest?.map
    if (map) {
      const ow = this.ow
      await ow.travelArrive(map, o.spawn ?? dest?.spawn ?? '', o.facing ?? dest?.facing)
    } else await this.ui.fade(0, 300)
  }

  private get ow(): OverworldScene {
    return this.world as unknown as OverworldScene
  }

  // ------------------------------------------------------------ battle
  startBattle(req: BattleRequest): Promise<BattleResult> {
    return this.world.startBattle(req)
  }
  async trainerBattle(trainerId: string, extra: Partial<BattleRequest> = {}): Promise<BattleResult> {
    const req = trainerRequest(trainerId, extra)
    if (!req) {
      console.warn(`[script] unknown trainer '${trainerId}', using a placeholder team`)
      return this.startBattle({ ...wildRequest('hallucihound', 3), kind: 'trainer', canRun: false, canCatch: false,
        trainer: { id: trainerId, name: trainerId, sprite: 'battle/trainer_m_front', loseText: 'You win!', prize: 100 }, ...extra })
    }
    return this.startBattle(req)
  }
  wildBattle(speciesId: string, level: number, extra: Partial<BattleRequest> = {}): Promise<BattleResult> {
    return this.startBattle(wildRequest(speciesId, level, extra))
  }
  /** The scripted rescue fight (HalluciHound, cannot run/lose). */
  tutorialBattle(level = 2): Promise<BattleResult> {
    return this.startBattle(tutorialRequest(level))
  }
  whiteOut(): Promise<void> {
    return this.world.whiteOut()
  }

  // ------------------------------------------------------------ audio
  playMusic(id: string, fadeMs?: number): void {
    audio.playMusic(id, { fadeMs })
  }
  stopMusic(fadeMs?: number): void {
    audio.stopMusic(fadeMs)
  }
  /** Restore the current map/zone music. */
  resumeMapMusic(): void {
    this.world.playMapMusic()
  }
  sfx(id: string): void {
    audio.sfx(id)
  }

  // ------------------------------------------------------------ shops
  shop(itemIds: string[], greeting?: string): Promise<void> {
    return this.ui.shop(itemIds, greeting)
  }

  /** Model Storage System (box grid + party; withdraw / deposit / move / summary). pc_on / pc_off + fades. */
  storage(): Promise<void> {
    return openStorage(this.ui)
  }

  /**
   * Fade to the end card (credits, play time, caught count), then return to the title
   * screen. The save is not touched (save first if you want the end state kept). The
   * overworld is shut down; the promise resolves once the title is back.
   */
  async endCard(): Promise<void> {
    await this.ui.fade(1, 700)
    const sm = this.game.scene
    await new Promise<void>((res) => {
      for (const k of ['Battle', 'StarterSelect', 'Overworld']) if (sm.isActive(k) || sm.isPaused(k)) sm.stop(k)
      sm.start('EndCard', { onDone: res })
    })
  }

  /** Run another registered script inline (same self/ctx). */
  async run(id: string): Promise<void> {
    const fn = getScript(id)
    if (!fn) {
      console.warn(`[script] unknown script '${id}'`)
      return
    }
    await fn(this)
  }
}

/** Intro stage controls (provided by IntroScene). */
export interface IntroStage {
  showProf(): Promise<void>
  hideProf(): Promise<void>
  showMon(speciesId: string): Promise<void>
  hideMon(): Promise<void>
  showPlayer(): Promise<void>
  hidePlayer(): Promise<void>
  spotlight(on: boolean): Promise<void>
}

/**
 * `s.puzzle`: the current map's puzzle kit (world/Puzzle.ts). Names are the map objects' ids.
 * Everything is saved per map in `state.mapState[mapId]` and survives save/load.
 */
export class PuzzleApi {
  private get_: () => OverworldScene
  constructor(get: () => OverworldScene) {
    this.get_ = get
  }
  private get pm() {
    const p = this.get_().puzzle
    if (!p) throw new Error('[script] s.puzzle used with no map loaded')
    return p
  }
  /** Any condition name (switch / door / statue / counter / `graph.out` / `flag:x` / `eval` / var). */
  value(name: string): number | boolean | string | undefined {
    return this.pm.resolve(name)
  }
  counter(id: string): number {
    return this.pm.counterGet(id)
  }
  setCounter(id: string, v: number): void {
    this.pm.counterSet(id, v)
  }
  addCounter(id: string, n = 1): number {
    return this.pm.counterAdd(id, n)
  }
  /** HUD counter without a map object: `showCounter('surprise', 'SURPRISE', 20)` → "SURPRISE 0/20". */
  showCounter(id: string, label: string, max?: number, style: 'budget' | 'goal' | 'plain' = 'budget'): void {
    this.pm.showCounter(id, label, max, style)
  }
  hideCounter(id: string): void {
    this.pm.hideCounter(id)
  }
  /** Start a HUD timer; `ranks` = seconds for S,A,B (slower = C). */
  startTimer(id: string, o: { label?: string; ranks?: number[] | string } = {}): void {
    this.pm.startTimer(id, o)
  }
  /** Stop it (toast with time + rank): `{ ms, rank }`, or null if not running. */
  stopTimer(id: string): { ms: number; rank: string } | null {
    return this.pm.stopTimer(id)
  }
  setVar(name: string, v: number | boolean | string): void {
    this.pm.setVar(name, v)
  }
  /** The key token the player carries between statues ('' = none). */
  get carry(): string {
    return String(this.pm.S.carry ?? '')
  }
  setCarry(k: string): void {
    this.pm.setCarry(k)
  }
  /** Letters spelled so far in a `letter` group. */
  word(group: string): string {
    return String(this.pm.resolve(`${group}.word`) ?? '')
  }
  clearWord(group: string): void {
    const w = (this.pm.S.words ??= {})
    delete w[group]
    this.pm.refresh()
  }
  /** Graph-floor graph (forward values + reverse-mode gradients). */
  graph(id = 'g'): CompGraph | undefined {
    return this.pm.graph(id)
  }
  setInput(nodeId: string, v: number): void {
    this.pm.setInput(nodeId, v)
  }
  /** Show / hide each node's gradient d(out)/d(node) on the floor. */
  showGrad(graphId: string, on = true): void {
    this.pm.setShowGrad(graphId, on)
  }
  solved(graphId: string): boolean {
    return !!this.pm.S.solved?.[graphId]
  }
  /** Slide a block/boulder `n` tiles (scripted). */
  moveBlock(id: string, dir: Dir, n = 1): Promise<void> {
    const e = this.pm.ent(id)
    return e ? this.pm.slideBlock(e, dir, n) : Promise.resolve()
  }
  /** Reset this map's puzzle (blocks, switches, keys, graphs, counters…). `all` also removes Merge bridges. */
  reset(o: { fx?: boolean; all?: boolean } = {}): Promise<void> {
    return this.pm.resetPuzzle(o.fx ?? true, o.all ?? false)
  }
  /** Subscribe to puzzle events on this map (`switch`, `door`, `letter`, `graph_solved`, `merge`, ...). Returns an unsubscribe. */
  on(fn: (e: PuzzleEvent) => void): () => void {
    const map = this.pm.mapId
    return onPuzzleEvent((e) => {
      if (e.map === map) fn(e)
    })
  }
}
