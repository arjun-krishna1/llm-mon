// A grid-locked character (player or NPC): 16x24 sprite on a 16px tile,
// shadow, tall-grass overlay, walk cycle, bump, ledge hop, emotes.

import Phaser from 'phaser'
import { DEPTH, DIR_ROW, DIR_VEC, LEDGE_FRAMES, LEDGE_HEIGHT, TILE, type Dir } from '../config'
import { ensureTexture } from '../assets'

export type Movement = 'static' | 'look' | 'wander'

export interface ActorOptions {
  id: string
  sprite: string
  x: number
  y: number
  facing?: Dir
}

export class Actor {
  readonly id: string
  readonly scene: Phaser.Scene
  readonly sprite: Phaser.GameObjects.Sprite
  readonly shadow: Phaser.GameObjects.Image
  /** Grass overlays: [destination tile, source tile]. */
  readonly grass: [Phaser.GameObjects.Image, Phaser.GameObjects.Image]
  texKey: string
  /** Logical tile (the destination while moving). */
  tx: number
  ty: number
  /** Tile being left while moving. */
  fromX: number
  fromY: number
  /** Pixel position of the top-left of the tile the actor is drawn on. */
  px: number
  py: number
  facing: Dir
  moving = false
  private dist = 0 // pixels to travel this step
  private moved = 0
  private speed = 1 // px per frame
  private foot = 0
  private bumpT = 0
  private hopT = -1
  private hopFrames = LEDGE_FRAMES
  private resolveStep?: () => void
  hidden = false
  /** Extra vertical offset (e.g. hop arc). */
  private lift = 0
  /** For NPC AI. */
  movement: Movement = 'static'
  homeX: number
  homeY: number
  aiTimer = 0
  /** Free-form data (npc object props etc). */
  data: Record<string, unknown> = {}
  onGrass: (x: number, y: number) => boolean = () => false

  constructor(scene: Phaser.Scene, o: ActorOptions) {
    this.scene = scene
    this.id = o.id
    this.texKey = ensureTexture(scene, o.sprite.includes('/') ? o.sprite : `chars/${o.sprite}`, 48, 96)
    this.tx = this.fromX = this.homeX = o.x
    this.ty = this.fromY = this.homeY = o.y
    this.px = o.x * TILE
    this.py = o.y * TILE
    this.facing = o.facing ?? 'down'
    this.shadow = scene.add.image(0, 0, 'fx/shadow').setOrigin(0.5, 0.5).setDepth(DEPTH.shadow)
    this.sprite = scene.add.sprite(0, 0, this.texKey, 0).setOrigin(0.5, 1)
    this.grass = [
      scene.add.image(0, 0, 'fx/grass_overlay').setOrigin(0, 0).setVisible(false),
      scene.add.image(0, 0, 'fx/grass_overlay').setOrigin(0, 0).setVisible(false),
    ]
    this.render()
  }

  setTexture(sprite: string): void {
    this.texKey = ensureTexture(this.scene, sprite.includes('/') ? sprite : `chars/${sprite}`, 48, 96)
    this.sprite.setTexture(this.texKey, 0)
    this.render()
  }

  get isHopping(): boolean {
    return this.hopT >= 0
  }

  /** Feet pixel y (sorting key). */
  get footY(): number {
    return this.py + TILE
  }

  /** Teleport to a tile. */
  place(x: number, y: number, facing?: Dir): void {
    this.tx = this.fromX = x
    this.ty = this.fromY = y
    this.px = x * TILE
    this.py = y * TILE
    this.moving = false
    this.hopT = -1
    this.lift = 0
    if (facing) this.facing = facing
    this.render()
  }

  face(d: Dir): void {
    this.facing = d
    this.render()
  }

  /** Begin a one-tile step. `frames` = frames per tile. Resolves when it lands. */
  step(dir: Dir, frames: number): Promise<void> {
    this.facing = dir
    const v = DIR_VEC[dir]
    this.fromX = this.tx
    this.fromY = this.ty
    this.tx += v.x
    this.ty += v.y
    this.moving = true
    this.dist = TILE
    this.moved = 0
    this.speed = TILE / frames
    this.bumpT = 0
    this.foot ^= 1
    return new Promise((r) => (this.resolveStep = r))
  }

  /** Two-tile ledge hop with an arc. */
  hop(dir: Dir): Promise<void> {
    this.facing = dir
    const v = DIR_VEC[dir]
    this.fromX = this.tx
    this.fromY = this.ty
    this.tx += v.x * 2
    this.ty += v.y * 2
    this.moving = true
    this.dist = TILE * 2
    this.moved = 0
    this.hopFrames = LEDGE_FRAMES
    this.speed = (TILE * 2) / LEDGE_FRAMES
    this.hopT = 0
    this.foot ^= 1
    return new Promise((r) => (this.resolveStep = r))
  }

  /** Walk in place against a wall (one step's worth of animation). */
  bump(dir: Dir): void {
    this.facing = dir
    if (this.bumpT <= 0) {
      this.bumpT = 16
      this.foot ^= 1
    }
  }

  get bumping(): boolean {
    return this.bumpT > 0
  }

  /** Queue several steps; they chain with no idle frame between tiles. */
  walk(dirs: Dir[], frames: number): Promise<void> {
    if (!dirs.length) return Promise.resolve()
    this.queue = dirs.slice(1)
    this.queueFrames = frames
    const done = new Promise<void>((r) => (this.resolveWalk = r))
    void this.step(dirs[0], frames)
    return done
  }

  private queue: Dir[] = []
  private queueFrames = 16
  private resolveWalk?: () => void

  /** Advance one logic frame. Returns true on the frame a step lands. */
  tick(): boolean {
    let landed = false
    if (this.moving) {
      landed = this.advance()
      if (landed && this.queue.length) {
        void this.step(this.queue.shift()!, this.queueFrames)
        this.advance()
      } else if (landed && this.resolveWalk) {
        const r = this.resolveWalk
        this.resolveWalk = undefined
        r()
      }
    } else if (this.bumpT > 0) {
      this.bumpT--
    }
    this.render()
    return landed
  }

  /** Continue straight into another step this same frame (seamless held-direction walking). */
  chain(dir: Dir, frames: number): void {
    void this.step(dir, frames)
    this.advance()
    this.render()
  }

  private advance(): boolean {
    this.moved = Math.min(this.dist, this.moved + this.speed)
    const v = { x: Math.sign(this.tx - this.fromX), y: Math.sign(this.ty - this.fromY) }
    this.px = this.fromX * TILE + Math.round(v.x * this.moved)
    this.py = this.fromY * TILE + Math.round(v.y * this.moved)
    if (this.hopT >= 0) {
      this.hopT++
      const k = this.hopT / this.hopFrames
      this.lift = Math.round(Math.sin(Math.PI * Math.min(1, k)) * LEDGE_HEIGHT)
    }
    if (this.moved < this.dist) return false
    this.moving = false
    this.hopT = -1
    this.lift = 0
    this.fromX = this.tx
    this.fromY = this.ty
    this.px = this.tx * TILE
    this.py = this.ty * TILE
    const r = this.resolveStep
    this.resolveStep = undefined
    r?.()
    return true
  }

  /** Walk-cycle column: stand → A → stand → B. */
  private column(): number {
    if (this.moving) {
      const half = this.dist === TILE * 2 ? TILE : TILE / 2
      if (this.hopT >= 0) return this.hopT < this.hopFrames / 2 ? 1 + this.foot : 0
      return this.moved % (half * 2) < half ? 1 + this.foot : 0
    }
    if (this.bumpT > 8) return 1 + this.foot
    return 0
  }

  render(): void {
    const frame = DIR_ROW[this.facing] * 3 + this.column()
    this.sprite.setFrame(frame)
    const x = this.px + TILE / 2
    const y = this.py + TILE
    this.sprite.setPosition(x, y - this.lift)
    this.sprite.setDepth(DEPTH.charBase + y + (this.id === 'player' ? 0.5 : 0))
    this.shadow.setPosition(x, y - 3)
    this.shadow.setVisible(!this.hidden && (this.lift > 0 || this.shadowAlways))
    this.sprite.setVisible(!this.hidden)
    // tall grass overlays (not while airborne)
    const [gd, gs] = this.grass
    const depth = this.sprite.depth + 0.25
    const dGrass = !this.hidden && this.lift === 0 && this.onGrass(this.tx, this.ty)
    gd.setVisible(dGrass).setPosition(this.tx * TILE, this.ty * TILE).setDepth(depth)
    const leaving = this.moving && (this.fromX !== this.tx || this.fromY !== this.ty) && this.moved < TILE / 2
    const sGrass = !this.hidden && this.lift === 0 && leaving && this.onGrass(this.fromX, this.fromY)
    gs.setVisible(sGrass).setPosition(this.fromX * TILE, this.fromY * TILE).setDepth(depth)
  }

  /** Show a ground shadow even when not hopping (default off: sprites have baked feet). */
  shadowAlways = true

  setHidden(h: boolean): void {
    this.hidden = h
    this.render()
  }

  /** Tile in front of the actor. */
  front(): { x: number; y: number } {
    const v = DIR_VEC[this.facing]
    return { x: this.tx + v.x, y: this.ty + v.y }
  }

  destroy(): void {
    this.sprite.destroy()
    this.shadow.destroy()
    this.grass.forEach((g) => g.destroy())
  }
}
