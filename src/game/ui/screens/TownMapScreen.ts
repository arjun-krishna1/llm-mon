// Town map: a 240×160 schematic of the three regions, drawn procedurally from the location
// table (systems/locations.ts). The player's location blinks. ←→↑↓ hop between locations.
// mode 'fly' (Attend): only visited towns with an arrival can be chosen; A resolves with the id.

import Phaser from 'phaser'
import { COLORS, FONT, H, W, type Dir } from '../../config'
import { controls } from '../../controls'
import { audio } from '../../audio'
import { state } from '../../state'
import { LINKS, REGIONS, flyTargets, location, locations, visited, type LocationDef } from '../../systems/locations'
import { drawPanel } from '../draw'
import { Screen } from './Screen'
import type { WidgetStack } from '../WidgetStack'
import type { PxText } from '../text'

export interface TownMapOptions {
  mode: 'view' | 'fly'
  /** Location id of the player (default: flag `last_location`). */
  here?: string
}

const SEA = [0x2f6fc0, 0x4a94dc, 0x72b8ee]
const LAND = [0x3f8f4a, 0x58b257, 0x7ccf63, 0xa4e27a]
const SNOW = [0xa8b0c4, 0xd4dae6, 0xf4f6fa]
const MAP_Y0 = 16
const MAP_Y1 = 134

export class TownMapScreen extends Screen<string | null> {
  private o: TownMapOptions
  private cursor: LocationDef | undefined
  private here: LocationDef | undefined
  private dyn: Phaser.GameObjects.Graphics
  private nameT: PxText
  private blurbT: PxText
  private headT: PxText

  constructor(scene: Phaser.Scene, stack: WidgetStack, o: TownMapOptions) {
    super(scene, stack, 2150)
    this.o = o
    this.here = location(o.here ?? String(state.getFlag('last_location') ?? ''))
    const g = this.gfx()
    this.drawSea(g)
    for (const r of REGIONS) this.drawLand(g, r.shape, r.id === 'ontario' ? SNOW : LAND)
    this.drawLinks(g)
    this.drawLocations(g)
    // region labels
    for (const r of REGIONS) {
      if (!r.shape.length) continue
      const minY = Math.min(...r.shape.map((p) => p[1]))
      const xs = r.shape.map((p) => p[0])
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2
      const t = this.text(0, minY - 8, r.name, { font: FONT.mini, color: 0xfcfaf0, shadowColor: SEA[0], shadow: 'drop' })
      t.setPosition(Math.round(cx - t.width / 2), r.id === 'peninsula' ? Math.max(...r.shape.map((p) => p[1])) + 3 : minY - 8)
    }
    // header + info bar
    const hg = this.gfx()
    hg.fillStyle(COLORS.frame[0])
    hg.fillRect(0, 0, W, 14)
    hg.fillStyle(COLORS.frame[2])
    hg.fillRect(0, 14, W, 1)
    drawPanel(hg, 2, MAP_Y1 + 1, W - 4, H - MAP_Y1 - 2)
    this.headT = this.text(6, 3, o.mode === 'fly' ? 'ATTEND: WHERE TO?' : 'TOWN MAP', { font: FONT.mini, color: 0xfcfaf0, shadow: 'none' })
    this.text(W - 60, 3, o.mode === 'fly' ? 'A:GO  B:BACK' : 'B:CLOSE', { font: FONT.mini, color: COLORS.frame[3], shadow: 'none' })
    this.nameT = this.text(10, MAP_Y1 + 5, '')
    this.blurbT = this.text(10, MAP_Y1 + 18, '', { font: FONT.mini, shadow: 'none', color: 0x6c6c74 })
    this.dyn = this.gfx()
    const pool = this.selectable()
    this.cursor = (this.here && pool.includes(this.here) ? this.here : undefined) ?? pool[0] ?? this.here
    this.renderDyn()
  }

  private selectable(): LocationDef[] {
    return this.o.mode === 'fly' ? flyTargets() : locations().filter((l) => l.region !== 'summit' || l.x > 0)
  }

  private drawSea(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(SEA[0])
    g.fillRect(0, 0, W, H)
    g.fillStyle(SEA[1])
    g.fillRect(0, MAP_Y0, W, MAP_Y1 - MAP_Y0)
    g.fillStyle(SEA[2])
    for (let y = MAP_Y0 + 4; y < MAP_Y1; y += 8) for (let x = ((y / 8) % 2) * 12; x < W; x += 24) g.fillRect(x, y, 4, 1)
  }

  private drawLand(g: Phaser.GameObjects.Graphics, shape: Array<[number, number]>, ramp: number[]): void {
    if (!shape.length) return
    const pts = (dx: number, dy: number) => shape.map(([x, y]) => new Phaser.Math.Vector2(x + dx, y + dy))
    // 1px outline (2px south-east), the body, then a dither of lighter dots
    g.fillStyle(COLORS.outline)
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) g.fillPoints(pts(dx, dy), true)
    g.fillStyle(ramp[1])
    g.fillPoints(pts(0, 0), true)
    const xs = shape.map((p) => p[0])
    const ys = shape.map((p) => p[1])
    const poly = new Phaser.Geom.Polygon(shape.map(([x, y]) => new Phaser.Geom.Point(x, y)))
    g.fillStyle(ramp[2])
    for (let y = Math.min(...ys) + 3; y < Math.max(...ys) - 2; y += 5) {
      for (let x = Math.min(...xs) + ((y * 3) % 7); x < Math.max(...xs) - 2; x += 9) {
        if (Phaser.Geom.Polygon.Contains(poly, x, y) && Phaser.Geom.Polygon.Contains(poly, x + 3, y + 3)) g.fillRect(x, y, 2, 1)
      }
    }
  }

  private drawLinks(g: Phaser.GameObjects.Graphics): void {
    for (const l of LINKS) {
      const a = location(l.from)
      const b = location(l.to)
      if (!a || !b) continue
      const kind = l.kind ?? 'road'
      const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y)))
      const arc = kind === 'air' ? Math.min(26, n * 0.18) : 0
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const x = Math.round(a.x + (b.x - a.x) * t)
        const y = Math.round(a.y + (b.y - a.y) * t - Math.sin(Math.PI * t) * arc)
        if (kind === 'air') {
          if (i % 4 < 2) {
            g.fillStyle(0xfcfaf0)
            g.fillRect(x, y, 1, 1)
          }
        } else if (kind === 'ferry') {
          if (i % 3 === 0) {
            g.fillStyle(0xd8f0fc)
            g.fillRect(x, y, 1, 1)
          }
        } else if (kind === 'rail') {
          g.fillStyle(i % 4 < 2 ? 0x553a2e : 0xe8cf97)
          g.fillRect(x, y, 2, 2)
        } else {
          g.fillStyle(0xe8cf97)
          g.fillRect(x, y, 2, 2)
        }
      }
    }
  }

  private drawLocations(g: Phaser.GameObjects.Graphics): void {
    for (const l of locations()) {
      const seen = visited(l.id)
      const x = l.x
      const y = l.y
      if (l.kind === 'town') {
        g.fillStyle(COLORS.outline)
        g.fillRect(x - 3, y - 3, 7, 7)
        g.fillStyle(seen ? 0xd0642a : 0x84808e)
        g.fillRect(x - 2, y - 2, 5, 5)
        g.fillStyle(seen ? 0xf8b860 : 0xaeaab4)
        g.fillRect(x - 2, y - 2, 5, 2)
      } else if (l.kind === 'landmark' || l.kind === 'dungeon') {
        g.fillStyle(COLORS.outline)
        g.fillRect(x - 1, y - 3, 3, 7)
        g.fillRect(x - 3, y - 1, 7, 3)
        g.fillStyle(seen ? (l.kind === 'dungeon' ? 0x7050c0 : 0x3c64c8) : 0x84808e)
        g.fillRect(x - 2, y - 1, 5, 3)
        g.fillRect(x - 1, y - 2, 3, 5)
      } else {
        g.fillStyle(COLORS.outline)
        g.fillRect(x - 1, y - 1, 4, 4)
        g.fillStyle(seen ? 0xfcfaf0 : 0xaeaab4)
        g.fillRect(x, y, 2, 2)
      }
    }
  }

  private renderDyn(): void {
    const g = this.dyn
    g.clear()
    // player marker (blinks)
    if (this.here && Math.floor(this.frame / 20) % 2 === 0) {
      const { x, y } = this.here
      g.fillStyle(COLORS.outline)
      g.fillRect(x - 2, y - 11, 5, 7)
      g.fillRect(x - 1, y - 4, 3, 2)
      g.fillStyle(0xc83c44)
      g.fillRect(x - 1, y - 10, 3, 5)
      g.fillStyle(0xfcfaf0)
      g.fillRect(x - 1, y - 10, 1, 1)
    }
    const c = this.cursor
    if (c) {
      const k = Math.floor(this.frame / 12) % 2
      const r = 6 + k
      g.fillStyle(this.o.mode === 'fly' ? 0xf8d838 : 0xfcfaf0)
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const cx = c.x + sx * r
        const cy = c.y + sy * r
        g.fillRect(cx - (sx > 0 ? 2 : 0), cy, 3, 1)
        g.fillRect(cx, cy - (sy > 0 ? 2 : 0), 1, 3)
      }
      this.nameT.setText(visited(c.id) || c.kind !== 'town' ? c.name : '???')
      this.blurbT.setText(visited(c.id) ? (c.blurb ?? '') : 'NOT VISITED YET.')
      const region = REGIONS.find((r) => r.id === c.region)
      this.headT.setText(`${this.o.mode === 'fly' ? 'ATTEND: WHERE TO?' : 'TOWN MAP'}   ${region?.name ?? ''}`)
    } else {
      this.nameT.setText(this.o.mode === 'fly' ? 'No town to travel to yet.' : '')
      this.blurbT.setText('')
    }
  }

  tick(): void {
    super.tick()
    if (this.frame % 4 === 0) this.renderDyn()
  }

  /** Nearest selectable location in a direction (within a ±60° cone). */
  private step(d: Dir): void {
    const pool = this.selectable()
    const c = this.cursor
    if (!c || !pool.length) return
    const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d]
    let best: LocationDef | undefined
    let bestScore = Infinity
    for (const l of pool) {
      if (l === c) continue
      const dx = l.x - c.x
      const dy = l.y - c.y
      const along = dx * v[0] + dy * v[1]
      if (along <= 0) continue
      const across = Math.abs(dx * v[1] - dy * v[0])
      if (across > along * 1.8) continue
      const score = along + across * 2
      if (score < bestScore) {
        bestScore = score
        best = l
      }
    }
    if (best) {
      this.cursor = best
      audio.sfx('select')
      this.renderDyn()
    }
  }

  input(): void {
    const d = controls.dirPressed() ?? (controls.dir() && controls.repeat(controls.dir()!) ? controls.dir() : null)
    if (d) {
      this.step(d)
      return
    }
    if (controls.justPressed('A') && this.o.mode === 'fly') {
      controls.consume('A')
      if (this.cursor && flyTargets().includes(this.cursor)) {
        audio.sfx('select')
        this.close(this.cursor.id)
      } else audio.sfx('bump')
      return
    }
    if (controls.justPressed('B') || controls.justPressed('START') || (controls.justPressed('A') && this.o.mode === 'view')) {
      controls.consume('A', 'B', 'START')
      audio.sfx('cancel')
      this.close(null)
    }
  }
}
