// Field skills in the overworld (ENGINE). Data and unlock rules live in systems/skills.ts
// (unlocked by badge flag `badge_<id>` or debug/story flag `skill_<id>`). Each skill is used
// with A at the relevant object (a prompt asks first), from the FIELD start-menu entry, or
// with SELECT (the quick key: the skill set with "SET TO SELECT", else whatever applies in
// front of the player).
//
//   Backprop   walk up a one-way ledge (automatic once unlocked)
//   Sample     peek at the next wild encounter in this grass zone and reroll it once per entry
//   Embed      push heavy blocks; A at a block slides it toward the nearest block of its kind
//              ("like attracts like"), or pulls it one tile toward you
//   Normalize  calm `rough_water` (or water in a `raft: true` zone/map) and ride a raft across
//   Chain Rule grapple over `gap` floor tiles to an `anchor` on the far side
//   Dilate     in a dark map the light radius grows from 1 to 4 tiles; hidden items glint
//   Attend     fly to a visited town via the Town Map
//   Merge      fuse two adjacent same-kind `boulder`s (bridge over gaps/water, or a bigger block)

import Phaser from 'phaser'
import { COLORS, DEPTH, DIR_VEC, FONT, H, OPPOSITE, TILE, W, type Dir } from '../config'
import { audio } from '../audio'
import { state } from '../state'
import { ms, params } from '../params'
import { rollEncounter, speciesName } from '../adapters/monInfo'
import type { MonInstance } from '../types'
import { SKILLS, skillDef, skillUnlocked, type SkillDef, type SkillId } from '../systems/skills'
import { flyTargets, location } from '../systems/locations'
import { registerStartMenuEntry } from '../ui/startMenu'
import { ListMenu } from '../ui/ListMenu'
import { PxText } from '../ui/text'
import { TownMapScreen } from '../ui/screens/TownMapScreen'
import type { UIScene } from '../scenes/UIScene'
import type { MapObject } from './TiledMap'
import { iconTexture, raftTexture } from './kitTextures'
import type { OverworldScene } from '../scenes/OverworldScene'

/** The sfx a skill plays: its own id once AUDIO has made it, else the fallback. */
export function skillSfx(d: SkillDef): string {
  return audio.sfxIds.includes(d.sfx) ? d.sfx : d.fallbackSfx
}

const QUICK_FLAG = 'quick_skill'

function wait(scene: Phaser.Scene, msec: number): Promise<void> {
  const d = ms(msec)
  return d ? new Promise((r) => scene.time.delayedCall(d, r)) : Promise.resolve()
}

function tweenP(scene: Phaser.Scene, cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
  if (params.fast) return Promise.resolve()
  return new Promise((r) => scene.tweens.add({ ...cfg, onComplete: () => r() }))
}

export class FieldSkills {
  readonly ow: OverworldScene
  rafting = false
  dilating = false
  private raft?: Phaser.GameObjects.Image
  private fx: Phaser.GameObjects.Graphics
  private glints: Phaser.GameObjects.Graphics
  private frame = 0
  /** Sample: the zone object it was used in, uses left there, and the pre-rolled encounter. */
  private sampleZone?: MapObject
  private sampleUses = 0
  private sampled: MonInstance | null = null
  private zone?: MapObject

  constructor(ow: OverworldScene) {
    this.ow = ow
    this.fx = ow.add.graphics().setDepth(DEPTH.fx - 1)
    this.glints = ow.add.graphics().setDepth(DEPTH.over + 950)
  }

  has(id: SkillId): boolean {
    return skillUnlocked(id)
  }

  // ================================================================ lifecycle

  onMapChange(seamless: boolean): void {
    if (!seamless) this.stopRaft()
    this.dilating = false
    this.sampleZone = undefined
    this.sampled = null
    this.fx.clear()
  }

  onZoneChange(z: MapObject | undefined): void {
    // Sample charges belong to one entry into a grass zone
    if (z !== this.zone) {
      this.sampleZone = undefined
      this.sampled = null
    }
    this.zone = z
  }

  onStep(): void {
    /* reserved: per-step skill effects */
  }

  tick(): void {
    this.frame++
  }

  /** Per render frame: raft under the player, Dilate glints on hidden items. */
  render(): void {
    const p = this.ow.player
    if (this.raft) {
      const bob = Math.floor(this.frame / 24) % 2
      this.raft.setPosition(p.px + 8, p.py + 15 + bob).setDepth(p.sprite.depth - 0.4)
      p.extraLift = 1 + bob
    }
    const g = this.glints
    g.clear()
    if (!this.ow.isDark()) return
    const r = this.ow.light.litTiles()
    const cam = this.ow.cameras.main
    for (const t of this.ow.hiddenItemTiles()) {
      if (!this.dilating || Math.hypot(t.x - p.tx, t.y - p.ty) > r + 0.5) continue
      const ph = (this.frame + t.x * 7 + t.y * 13) % 48
      if (ph > 20) continue
      const x = t.x * TILE + 8 - cam.scrollX
      const y = t.y * TILE + 8 - cam.scrollY
      const s = ph < 6 || ph > 14 ? 1 : 2
      g.fillStyle(0xfcfaf0)
      g.fillRect(x - s, y, s * 2 + 1, 1)
      g.fillRect(x, y - s, 1, s * 2 + 1)
      g.fillStyle(0xf8d838)
      g.fillRect(x, y, 1, 1)
    }
  }

  /** Is the tile inside the current light (always true outside dark maps)? */
  lit(x: number, y: number): boolean {
    if (!this.ow.isDark()) return true
    const p = this.ow.player
    return Math.hypot(x - p.tx, y - p.ty) <= this.ow.light.litTiles() + 0.5
  }

  destroy(): void {
    this.stopRaft()
    this.fx.destroy()
    this.glints.destroy()
  }

  // ================================================================ cut-in

  /**
   * GBA-style field-move cut-in: a band slides across the middle of the screen with the lead
   * LLMMON's front sprite and the skill name, plus the skill sfx.
   */
  async cutIn(id: SkillId): Promise<void> {
    const d = skillDef(id)
    if (!d) return
    audio.sfx(skillSfx(d))
    const ui = this.ow.ui
    const lead = state.party.find((m) => m.hp > 0) ?? state.party[0]
    if (params.fast) return
    const D = 2400
    const band = ui.add.graphics().setDepth(D).setScrollFactor(0)
    const cy = 60
    const k = { t: 0 }
    const key = lead ? `mons/${lead.speciesId}_front` : ''
    const img = key && ui.textures.exists(key) ? ui.add.image(-40, cy, key).setDepth(D + 1).setScrollFactor(0) : null
    const label = new PxText(ui, 0, cy - 8, d.name, { color: COLORS.white, shadowColor: COLORS.frame[0] }).setDepth(D + 2).setScrollFactor(0)
    const draw = () => {
      band.clear()
      const h = Math.round(44 * Math.min(1, k.t * 4) * Math.min(1, (1 - k.t) * 4))
      band.fillStyle(COLORS.frame[0])
      band.fillRect(0, cy - h / 2 - 1, W, h + 2)
      band.fillStyle(COLORS.frame[1])
      band.fillRect(0, cy - h / 2, W, h)
      band.fillStyle(COLORS.frame[2], 0.6)
      for (let i = 0; i < 6; i++) band.fillRect(((i * 53 + k.t * 900) % (W + 40)) - 40, cy - h / 2 + 4 + (i % 3) * 12, 26, 1)
      const x = Math.round(-40 + (W * 0.32 + 40) * Math.min(1, k.t * 3) + Math.max(0, k.t - 0.75) * 4 * (W * 0.7))
      img?.setPosition(x, cy).setVisible(h > 30)
      label.setPosition(Math.round(W - 20 - label.width - Math.max(0, 0.25 - k.t) * 400), cy - 8)
      label.setVisible(h > 20)
    }
    await tweenP(ui, { targets: k, t: 1, duration: 900, ease: 'Linear', onUpdate: draw })
    band.destroy()
    img?.destroy()
    label.destroy()
  }

  // ================================================================ context

  /** Which skill applies to what is in front of (or under) the player, if any. */
  contextSkill(): SkillId | null {
    const ow = this.ow
    const p = ow.player
    const f = p.front()
    const pz = ow.puzzle
    const blk = pz?.blockAt(f.x, f.y)
    if (blk) return blk.type === 'boulder' ? 'merge' : 'embed'
    if (!this.rafting && this.raftable(f.x, f.y)) return 'normalize'
    if (this.grappleTarget()) return 'chain'
    if (ow.isDark() && !this.dilating) return 'dilate'
    if (this.inGrassZone()) return 'sample'
    return null
  }

  private inGrassZone(): boolean {
    const ow = this.ow
    const p = ow.player
    const t = ow.map?.tileAt(p.tx, p.ty)
    return !!t?.grass && !!(this.zone?.props.encounters ?? ow.map?.props.encounters)
  }

  /** Normalize can launch a raft here: rough water, or water in a zone/map with `raft: true`. */
  raftable(x: number, y: number): boolean {
    const ow = this.ow
    if (!ow.map?.inBounds(x, y) || ow.puzzle?.solidAt(x, y)) return false
    const f = ow.puzzle?.floorAt(x, y)
    if (f?.bridged) return false
    if (f?.rough_water) return true
    const zoneRaft = ow.map.objectsOfType('zone').some((z) => z.props.raft && x >= z.tx && x < z.tx + z.tw && y >= z.ty && y < z.ty + z.th)
    return !!ow.map.tileAt(x, y).water && (zoneRaft || !!ow.map.props.raft)
  }

  /** Chain Rule: the anchor across a run of gap tiles straight ahead, or null. */
  grappleTarget(): { x: number; y: number; n: number } | null {
    const ow = this.ow
    const pz = ow.puzzle
    if (!pz) return null
    const p = ow.player
    const v = DIR_VEC[p.facing]
    let n = 1
    while (n <= 8) {
      const x = p.tx + v.x * n
      const y = p.ty + v.y * n
      const f = pz.floorAt(x, y)
      if (f.gap && !f.bridged) {
        n++
        continue
      }
      if (n > 1 && pz.entAt('anchor', x, y) && !ow.blocked(p, x, y)) return { x, y, n }
      return null
    }
    return null
  }

  // ================================================================ A at an object

  /** A pressed: skill objects in front of the player (prompt before use). Returns true if handled. */
  interactFront(): boolean {
    const ow = this.ow
    const pz = ow.puzzle
    const p = ow.player
    const f = p.front()
    const blk = pz?.blockAt(f.x, f.y)
    if (blk?.p.fuse) {
      // gym letterpress blocks: fusable with A even before the player has MERGE
      void this.fusePrompt(blk)
      return true
    }
    if (blk) {
      const id: SkillId = blk.type === 'boulder' ? 'merge' : 'embed'
      void this.prompt(id, blk.type === 'boulder'
        ? `A boulder marked “${(blk.kind ?? 'stone').toUpperCase()}”.`
        : blk.heavy ? 'A heavy block. Its face has a pattern on it.' : 'A block. It looks like it could be pushed.')
      return true
    }
    if (!this.rafting && this.raftable(f.x, f.y)) {
      void this.prompt('normalize', 'The water is churning wildly.')
      return true
    }
    if (pz?.floorAt(f.x, f.y).gap && !pz.floorAt(f.x, f.y).bridged) {
      void this.prompt('chain', this.grappleTarget() ? 'A deep gap. There’s an anchor on the far side.' : 'A deep gap. Nothing to hold on to across it.', !this.grappleTarget())
      return true
    }
    return false
  }

  /** `fuse: true` blocks/boulders: "Fuse it with its neighbour?" then the Merge rule, no skill needed. */
  private async fusePrompt(blk: NonNullable<ReturnType<NonNullable<OverworldScene['puzzle']>['blockAt']>>): Promise<void> {
    const ow = this.ow
    let yes = false
    await ow.runInline(async (s) => {
      yes = await s.yesNo(`${blk.glyph ? `A block marked “${blk.glyph}”.` : 'A block with a seam down one side.'}\nFuse it with the one beside it?`)
    })
    if (!yes || !ow.puzzle) return
    ow.lock()
    try {
      const err = await ow.puzzle.merge(blk, ow.player.facing)
      if (err) await this.say(err)
    } finally {
      ow.unlock()
    }
  }

  /** "Use SKILL?" (or the hint text when the skill is locked / does not apply). */
  private async prompt(id: SkillId, text: string, noUse = false): Promise<void> {
    const d = skillDef(id)!
    if (noUse || !this.has(id)) {
      await this.ow.runInline(async (s) => s.say(text))
      return
    }
    let yes = false
    await this.ow.runInline(async (s) => {
      yes = await s.yesNo(`${text}\nUse ${d.name}?`)
    })
    if (yes) await this.use(id)
  }

  // ================================================================ menu / quick key

  /** SELECT: the skill set as the quick key, else whatever applies here. */
  async quickKey(): Promise<void> {
    const q = String(state.getFlag(QUICK_FLAG) ?? '')
    const id = (q && this.has(q as SkillId) ? q : this.contextSkill()) as SkillId | null
    if (!id || !this.has(id)) {
      audio.sfx('bump')
      if (!SKILLS.some((s) => this.has(s.id))) return
      this.ow.ui.toast('No field skill to use here.')
      return
    }
    await this.use(id)
  }

  /** Use a skill (from the FIELD menu, SELECT, or after an A prompt). */
  async use(id: SkillId): Promise<void> {
    const ow = this.ow
    if (!this.has(id)) return
    ow.lock()
    try {
      switch (id) {
        case 'backprop': await this.say('Walk up a one-way ledge to use BACKPROP.'); break
        case 'sample': await this.sample(); break
        case 'embed': await this.embed(); break
        case 'normalize': await this.normalize(); break
        case 'chain': await this.chain(); break
        case 'dilate': await this.dilate(); break
        case 'attend': await this.attend(); break
        case 'merge': await this.merge(); break
      }
    } finally {
      ow.unlock()
    }
  }

  private say(t: string): Promise<void> {
    return this.ow.runInline(async (s) => s.say(t))
  }

  // ================================================================ backprop

  canBackprop(d: Dir): boolean {
    if (!this.has('backprop')) return false
    const p = this.ow.player
    const v = DIR_VEC[d]
    return !this.ow.blocked(p, p.tx + v.x * 2, p.ty + v.y * 2)
  }

  /** Hop UP over the ledge in front (2 tiles), with a short "rewind" trail. */
  backprop(d: Dir): void {
    const p = this.ow.player
    audio.sfx(skillSfx(skillDef('backprop')!))
    // rewind chevrons rising from the feet
    const g = this.ow.add.graphics().setDepth(DEPTH.fx - 2)
    const x0 = p.tx * TILE + 4
    const y0 = p.ty * TILE + 10
    let t = 0
    const ev = this.ow.time.addEvent({
      delay: 16, repeat: 24, callback: () => {
        t++
        g.clear()
        for (let i = 0; i < 3; i++) {
          const k = (t + i * 6) % 18
          const y = y0 - k + DIR_VEC[OPPOSITE[d]].y * 0
          g.fillStyle(0x72b8ee, Math.max(0, 1 - k / 18))
          g.fillRect(x0 + 2, y, 4, 1)
          g.fillRect(x0 + 1, y + 1, 1, 1)
          g.fillRect(x0 + 6, y + 1, 1, 1)
        }
        if (t >= 24) g.destroy()
      },
    })
    void ev
    void p.hop(d)
  }

  // ================================================================ sample

  /** The pre-rolled encounter for this zone entry (used once by the next encounter). */
  takeSample(): MonInstance | null {
    const m = this.sampled
    this.sampled = null
    return m
  }

  private async sample(): Promise<void> {
    const ow = this.ow
    const table = String(this.zone?.props.encounters ?? ow.map?.props.encounters ?? '')
    if (!table || !this.inGrassZone()) {
      await this.say('Stand in tall grass to SAMPLE what lives there.')
      return
    }
    if (this.sampleZone === this.zone && this.sampleUses >= 2) {
      await this.say('This patch has been sampled already.\nLeave the grass zone and come back.')
      return
    }
    if (this.sampleZone !== this.zone) {
      this.sampleZone = this.zone
      this.sampleUses = 0
    }
    await this.cutIn('sample')
    for (;;) {
      await this.diceRoll()
      this.sampleUses++
      this.sampled = rollEncounter(table)
      const name = this.sampled ? speciesName(this.sampled.speciesId) : '???'
      ow.ui.toast(`SAMPLED: ${name.toUpperCase()}`, iconTexture(ow.ui, 'dice'))
      let again = false
      await ow.runInline(async (s) => {
        if (this.sampleUses >= 2) {
          await s.say(`The grass settles on a wild ${name}.\nThe next encounter here will be it.`)
          return
        }
        again = !(await s.yesNo(`The grass rustles… a wild ${name} is nearby.\nKeep this sample?`))
      })
      if (!again) break
    }
  }

  /** A die bounces above the player's head and lands. */
  private async diceRoll(): Promise<void> {
    const ow = this.ow
    const p = ow.player
    const img = ow.add.image(p.px + 8, p.py - 10, iconTexture(ow, 'dice')).setDepth(DEPTH.fx)
    const k = { t: 0 }
    await tweenP(ow, {
      targets: k, t: 1, duration: 520, ease: 'Linear', onUpdate: () => {
        const b = Math.abs(Math.sin(k.t * Math.PI * 3)) * (1 - k.t) * 14
        img.setPosition(p.px + 8, Math.round(p.py - 10 - b)).setAngle(Math.round((1 - k.t) * 4) * 90)
      },
    })
    audio.sfx('orb_shake')
    await wait(ow, 160)
    img.destroy()
  }

  // ================================================================ embed

  private async embed(): Promise<void> {
    const ow = this.ow
    const pz = ow.puzzle
    const p = ow.player
    const f = p.front()
    const blk = pz?.blockAt(f.x, f.y)
    if (!pz || !blk) {
      await this.say('Face a block to use EMBED on it.')
      return
    }
    await this.cutIn('embed')
    this.sparkle(f.x, f.y, 0x58c478)
    const kin = pz.kinDirection(blk)
    if (kin) {
      // like attracts like: slide until it touches its kind
      await pz.slideBlock(blk, kin, 99, true)
      audio.sfx('stat_up')
      return
    }
    // no kin in line: pull it one tile toward the player (the player steps back)
    const back = OPPOSITE[p.facing]
    const v = DIR_VEC[back]
    if (ow.blocked(p, p.tx + v.x, p.ty + v.y)) {
      await this.say('No block of the same kind in line,\nand no room to pull it back.')
      return
    }
    const facing = p.facing
    const step = p.step(back, 16)
    p.face(facing) // moonwalk: keep hold of the block
    await step
    p.face(facing)
    await pz.slideBlock(blk, back, 1)
  }

  // ================================================================ normalize

  private async normalize(): Promise<void> {
    const ow = this.ow
    const p = ow.player
    const f = p.front()
    if (!this.raftable(f.x, f.y)) {
      await this.say('Face rough water to use NORMALIZE.')
      return
    }
    await this.cutIn('normalize')
    // the water calms in a ring, the raft slides in, the player hops on
    await this.ripple(f.x, f.y)
    this.raft = ow.add.image(f.x * TILE + 8, f.y * TILE + 15, raftTexture(ow)).setOrigin(0.5, 1)
    this.rafting = true
    audio.sfx('ledge')
    await p.zip(p.facing, 1, 16, 6)
    state.x = f.x
    state.y = f.y
  }

  private ripple(x: number, y: number): Promise<void> {
    const g = this.fx
    const k = { t: 0 }
    return tweenP(this.ow, {
      targets: k, t: 1, duration: 500, ease: 'Sine.Out', onUpdate: () => {
        g.clear()
        const r = Math.round(4 + k.t * 18)
        g.lineStyle(1, 0xd8f0fc, 1 - k.t)
        g.strokeRect(x * TILE + 8 - r, y * TILE + 8 - Math.round(r * 0.6), r * 2, Math.round(r * 1.2))
      },
    }).then(() => {
      g.clear()
    })
  }

  /** Step off the raft onto land. */
  dismount(): void {
    audio.sfx('ledge')
    this.stopRaft()
  }

  private stopRaft(): void {
    this.rafting = false
    this.raft?.destroy()
    this.raft = undefined
    if (this.ow.player) this.ow.player.extraLift = 0
  }

  // ================================================================ chain rule

  private async chain(): Promise<void> {
    const ow = this.ow
    const p = ow.player
    const t = this.grappleTarget()
    if (!t) {
      await this.say('Face a gap with an anchor on the far side\nto use CHAIN RULE.')
      return
    }
    await this.cutIn('chain')
    // links shoot out one by one ("link by link"), then the player zips along them
    const v = DIR_VEC[p.facing]
    const g = this.fx
    const x0 = p.tx * TILE + 8
    const y0 = p.ty * TILE + 6
    const len = t.n * TILE
    const links = Math.floor(len / 4)
    const drawLinks = (from: number, to: number) => {
      g.clear()
      for (let i = from; i < to; i++) {
        const x = x0 + v.x * i * 4
        const y = y0 + v.y * i * 4
        g.fillStyle(COLORS.outline)
        g.fillRect(x - 2, y - 1, 4, 3)
        g.fillStyle(i % 2 ? 0xa8b4c0 : 0xdce4ea)
        g.fillRect(x - 1, y, 2, 1)
      }
    }
    for (let i = 1; i <= links; i++) {
      drawLinks(0, i)
      if (i % 2 === 0) audio.sfx('text')
      await wait(ow, 18)
    }
    audio.sfx('orb_throw')
    p.holdStand = true
    await p.zip(p.facing, t.n, 6, 6)
    p.holdStand = false
    g.clear()
    state.x = p.tx
    state.y = p.ty
    ow.puzzle?.refresh()
  }

  // ================================================================ dilate

  private async dilate(): Promise<void> {
    const ow = this.ow
    if (!ow.isDark()) {
      await this.say('It’s bright enough here already.')
      return
    }
    if (this.dilating) {
      await this.say('The light is already as wide as it goes.')
      return
    }
    await this.cutIn('dilate')
    this.dilating = true
    ow.updateAtmosphere()
    audio.sfx('stat_up')
    // wait for the radius to finish growing, then report what it found
    for (let i = 0; i < 90 && ow.light.r !== ow.light.target; i++) await wait(ow, 16)
    const r = ow.light.litTiles()
    const p = ow.player
    const found = ow.hiddenItemTiles().filter((t) => Math.hypot(t.x - p.tx, t.y - p.ty) <= r + 0.5).length
    if (found) ow.ui.toast(found === 1 ? 'Something glints in the light…' : `${found} things glint in the light…`, iconTexture(ow.ui, 'spark'))
  }

  // ================================================================ attend

  private async attend(): Promise<void> {
    const ow = this.ow
    if (!flyTargets().length) {
      await this.say('There’s no town to travel to yet.')
      return
    }
    const ui = ow.ui
    await ui.fade(1, 160)
    const scr = new TownMapScreen(ui, ui.stack, { mode: 'fly' })
    const p = scr.run()
    await ui.fade(0, 160)
    const id = await p
    await ui.fade(1, 160)
    await ui.fade(0, 160)
    const loc = id ? location(id) : undefined
    if (!loc?.map) return
    await this.cutIn('attend')
    // the player lifts off in a column of light
    const pl = ow.player
    const g = this.fx
    const k = { t: 0 }
    await tweenP(ow, {
      targets: k, t: 1, duration: 600, ease: 'Sine.In', onUpdate: () => {
        g.clear()
        g.fillStyle(0xfcb060, 0.5 * k.t)
        g.fillRect(pl.px + 4, pl.py - H, 8, H + 16)
        g.fillStyle(0xfcfaf0, 0.8 * k.t)
        g.fillRect(pl.px + 7, pl.py - H, 2, H + 16)
        pl.extraLift = Math.round(k.t * 40)
      },
    })
    g.clear()
    pl.extraLift = 0
    await ow.warp(loc.map, loc.spawn ?? '', loc.facing ?? 'down', 'pc_on')
  }

  // ================================================================ merge

  private async merge(): Promise<void> {
    const ow = this.ow
    const pz = ow.puzzle
    const p = ow.player
    const f = p.front()
    const b = pz?.blockAt(f.x, f.y)
    if (!pz || !b || b.type !== 'boulder') {
      await this.say('Face a boulder to use MERGE.')
      return
    }
    await this.cutIn('merge')
    const err = await pz.merge(b, p.facing)
    if (err) await this.say(err)
  }

  // ================================================================ fx

  private sparkle(x: number, y: number, col: number): void {
    const ow = this.ow
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      const r = ow.add.rectangle(x * TILE + 8, y * TILE + 6, 1, 1, i % 2 ? col : 0xfcfaf0).setDepth(DEPTH.fx)
      ow.tweens.add({ targets: r, x: r.x + Math.cos(a) * 12, y: r.y + Math.sin(a) * 9, alpha: 0, duration: ms(420) || 1, onComplete: () => r.destroy() })
    }
  }
}

// ================================================================ FIELD start-menu entry

async function fieldMenu(ui: UIScene): Promise<void> {
  const ow = ui.game.scene.getScene('Overworld') as OverworldScene
  const skills = SKILLS.filter((s) => skillUnlocked(s.id))
  const quick = String(state.getFlag(QUICK_FLAG) ?? '')
  const evalSuite = state.itemCount('eval_suite') > 0
  const items = skills.map((s) => ({ label: s.name, id: `skill_${s.id}`, right: s.id === quick ? 'SEL' : '' }))
  if (evalSuite) items.push({ label: 'EVAL LIGHT', id: 'eval', right: state.evalLight ? 'ON' : 'OFF' })
  items.push({ label: 'CANCEL', id: 'cancel', right: '' })
  const descT = new PxText(ui, 8, H - 30, '', { font: FONT.mini, shadow: 'none' }).setDepth(1201).setScrollFactor(0)
  const descBg = ui.add.graphics().setDepth(1200).setScrollFactor(0)
  descBg.fillStyle(COLORS.frame[0])
  descBg.fillRect(2, H - 36, W - 4, 18)
  descBg.fillStyle(COLORS.paper[0])
  descBg.fillRect(3, H - 35, W - 6, 16)
  const describe = (i: number) => {
    const s = skills[i]
    descT.setText(s ? s.desc.toUpperCase() : i === skills.length && evalSuite ? 'SWITCH THE EVAL LIGHT ON OR OFF.' : '')
  }
  describe(0)
  const m = new ListMenu(ui, ui.stack, items, { x: W - 2, y: 2, anchor: 'tr', minW: 96, cancelIndex: items.length - 1, onMove: describe })
  const i = await m.result()
  descT.destroy()
  descBg.destroy()
  if (i < 0 || i >= items.length - 1) return
  if (items[i].id === 'eval') {
    state.evalLight = !state.evalLight
    audio.sfx(state.evalLight ? 'select' : 'cancel')
    return
  }
  const sk = skills[i]
  const c = await ui.choose(['USE', 'SET TO SELECT', 'CANCEL'], { x: W - 2, y: 2, anchor: 'tr', minW: 96 })
  if (c === 1) {
    state.setFlag(QUICK_FLAG, sk.id === quick ? false : sk.id)
    audio.sfx('select')
    ui.toast(sk.id === quick ? 'SELECT: automatic' : `SELECT: ${sk.name}`)
    return
  }
  if (c !== 0) return
  if (!ow?.scene.isActive()) return
  await ow.skills.use(sk.id)
}

registerStartMenuEntry({
  id: 'field', label: () => 'FIELD', order: 26,
  when: () => SKILLS.some((s) => skillUnlocked(s.id)) || state.itemCount('eval_suite') > 0,
  action: (ui) => fieldMenu(ui),
})
