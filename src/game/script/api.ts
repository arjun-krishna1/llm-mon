// The script API handed to every content script: `async (s) => { await s.say('Hi!') }`.
// See docs/ENGINE_API.md for the full reference with examples.

import Phaser from 'phaser'
import type { BattleRequest, BattleResult, MonInstance } from '../types'
import { DIRS, type Dir } from '../config'
import { audio } from '../audio'
import { state, type FlagValue } from '../state'
import { ms } from '../params'
import { createMon, itemInfo, monName, speciesName, trainerRequest, wildRequest } from '../adapters/monInfo'
import { getUI, type UIScene } from '../scenes/UIScene'
import type { SayOptions } from '../ui/DialogBox'
import type { ListOptions } from '../ui/ListMenu'
import { getScript } from './registry'

export type EmoteKind = 'exclaim' | 'question' | 'heart' | 'dots' | 'note'

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

/** What a scene must provide for world commands (OverworldScene implements it). */
export interface WorldApi {
  hasActor(id: string): boolean
  actorPos(id: string): { x: number; y: number; facing: Dir } | null
  moveActor(id: string, dirs: Dir[], opts?: { speed?: 'walk' | 'run' | 'slow'; collide?: boolean }): Promise<void>
  faceActor(id: string, dir: Dir): void
  emote(id: string, kind: EmoteKind): Promise<void>
  warp(map: string, spawn: string | { x: number; y: number }, facing?: Dir, sfx?: string): Promise<void>
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
  async chooseName(prompt: string, presets: string[]): Promise<string> {
    const opts = [...new Set([...presets])]
    const i = await this.ui.ask(prompt, opts, { cancelIndex: null, x: 238, y: 2, anchor: 'tr' })
    state.playerName = opts[Math.max(0, i)]
    return state.playerName
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
    if (!opts.silent) await this.ui.itemGet(itemId, count, opts.verb ?? 'obtained')
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
    const mon = createMon(speciesId, level)
    if (opts.nickname) mon.nickname = opts.nickname
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

  // ------------------------------------------------------------ battle
  startBattle(req: BattleRequest): Promise<BattleResult> {
    return this.world.startBattle(req)
  }
  async trainerBattle(trainerId: string, extra: Partial<BattleRequest> = {}): Promise<BattleResult> {
    const req = trainerRequest(trainerId)
    if (!req) {
      console.warn(`[script] unknown trainer '${trainerId}', using a placeholder team`)
      return this.startBattle({ ...wildRequest('hallucihound', 3), kind: 'trainer', canRun: false, canCatch: false,
        trainer: { id: trainerId, name: trainerId, sprite: 'battle/trainer_m_front', loseText: 'You win!', prize: 100 }, ...extra })
    }
    return this.startBattle({ ...req, ...extra })
  }
  wildBattle(speciesId: string, level: number, extra: Partial<BattleRequest> = {}): Promise<BattleResult> {
    return this.startBattle(wildRequest(speciesId, level, extra))
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
