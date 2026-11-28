// Trainer card: FRONT (name, money, dex counts, play time, badges) and the BADGE CASE
// (8 slots). A flips the card; on the badge page ←/→/↑/↓ move between slots; B closes.

import Phaser from 'phaser'
import { COLORS, FONT } from '../../config'
import { controls } from '../../controls'
import { audio } from '../../audio'
import { state } from '../../state'
import { BADGES, badgeCount, hasBadge } from '../../systems/badges'
import { skillDef } from '../../systems/skills'
import { drawPanel, drawStripes } from '../draw'
import { Screen } from './Screen'
import type { WidgetStack } from '../WidgetStack'
import type { PxText, TextStyle } from '../text'

export class PlayerCard extends Screen<void> {
  private page: 0 | 1 = 0
  private front: Phaser.GameObjects.Container
  private back: Phaser.GameObjects.Container
  private cursor = 0
  private cg: Phaser.GameObjects.Graphics
  private info: PxText[] = []

  constructor(scene: Phaser.Scene, stack: WidgetStack, opts: { page?: 0 | 1 } = {}) {
    super(scene, stack)
    const bgG = this.gfx()
    drawStripes(bgG, 240, 160, 0x2c4a8c, 0x324f94)
    this.front = scene.add.container(0, 0)
    this.back = scene.add.container(0, 0)
    this.root.add([this.front, this.back])
    this.buildFront()
    this.cg = this.buildBack()
    this.page = opts.page ?? 0
    this.show()
  }

  private into(c: Phaser.GameObjects.Container, objs: Phaser.GameObjects.GameObject[]): void {
    this.root.remove(objs)
    c.add(objs)
  }

  private tx(c: Phaser.GameObjects.Container, x: number, y: number, s: string, style?: TextStyle): PxText {
    const t = this.text(x, y, s, style)
    this.into(c, t.objects())
    return t
  }

  private buildFront(): void {
    const c = this.front
    const g = this.scene.add.graphics()
    c.add(g)
    drawPanel(g, 12, 14, 216, 132, 0xfcfaf0, COLORS.frame[1])
    g.fillStyle(COLORS.accent[1])
    g.fillRect(15, 17, 211, 18)
    g.fillStyle(COLORS.accent[0])
    g.fillRect(15, 35, 211, 1)
    this.tx(c, 22, 20, 'TRAINER CARD', { color: 0xffffff, shadowColor: COLORS.accent[0] })
    const id = String(state.getFlag('trainer_id') ?? '00000')
    this.tx(c, 168, 24, `ID ${id}`, { font: FONT.mini, shadow: 'drop' })
    const rows: Array<[string, string]> = [
      ['NAME', state.playerName],
      ['MONEY', `$${state.money}`],
      ['LLMMON', `${state.caught.length} caught / ${state.seen.length} seen`],
      ['TIME', state.playTimeText()],
    ]
    rows.forEach(([k, v], i) => {
      const y = 40 + i * 20
      this.tx(c, 24, y, k, { color: COLORS.frame[1], shadowColor: COLORS.paper[0] })
      this.tx(c, 84, y, v)
      g.fillStyle(COLORS.paper[0])
      g.fillRect(22, y + 15, 196, 1)
    })
    // badge strip along the bottom: 8 small sockets
    const by = 124
    this.tx(c, 24, by + 2, 'BADGES', { font: FONT.mini, shadow: 'drop' })
    BADGES.slice(0, 8).forEach((b, i) => {
      const x = 62 + i * 18
      g.fillStyle(COLORS.paper[0])
      g.fillRect(x, by - 3, 16, 16)
      g.fillStyle(0xe8e2cc)
      g.fillRect(x + 1, by - 2, 14, 14)
      if (hasBadge(b.id)) c.add(this.scene.add.image(x, by - 3, `ui/badge_${b.id}`).setOrigin(0, 0))
    })
    this.tx(c, 166, 140, 'A: BADGE CASE', { font: FONT.mini, color: COLORS.frame[1], shadow: 'none' })
    // player portrait: the overworld sprite at 1x in a small photo frame (no mixed pixel scales)
    drawPanel(g, 180, 54, 36, 44, 0xd8eef8, COLORS.frame[2], 0xa8d8f8)
    c.add(this.scene.add.image(190, 64, 'chars/player', 0).setOrigin(0, 0))
  }

  /** Badge case: a velvet-lined box with 8 sockets in two rows. Returns the cursor graphics. */
  private buildBack(): Phaser.GameObjects.Graphics {
    const c = this.back
    const g = this.scene.add.graphics()
    c.add(g)
    drawPanel(g, 12, 14, 216, 132, 0xfcfaf0, COLORS.frame[1])
    g.fillStyle(COLORS.frame[1])
    g.fillRect(15, 17, 211, 18)
    this.tx(c, 22, 20, 'BADGE CASE', { color: 0xffffff, shadowColor: COLORS.frame[0] })
    this.tx(c, 178, 24, `${badgeCount()}/8`, { font: FONT.mini, color: 0xffffff, shadow: 'none' })
    // case: wood rim + velvet
    g.fillStyle(0x553a2e)
    g.fillRect(20, 40, 200, 70)
    g.fillStyle(0xa0744a)
    g.fillRect(21, 41, 198, 1)
    g.fillStyle(0x7a2c3c)
    g.fillRect(24, 44, 192, 62)
    g.fillStyle(0x5c2030)
    for (let y = 46; y < 106; y += 4) g.fillRect(24, y, 192, 1)
    BADGES.slice(0, 8).forEach((b, i) => {
      const { x, y } = this.slotPos(i)
      // socket ring
      g.fillStyle(0x3c1420)
      g.fillRect(x - 2, y - 2, 20, 20)
      g.fillStyle(0xb08018)
      g.fillRect(x - 1, y - 1, 18, 18)
      g.fillStyle(0x4c1824)
      g.fillRect(x, y, 16, 16)
      if (hasBadge(b.id)) c.add(this.scene.add.image(x, y, `ui/badge_${b.id}`).setOrigin(0, 0))
      this.tx(c, x + 5, y + 20, String(b.gym), { font: FONT.mini, color: 0xf2d4a0, shadow: 'none' })
    })
    const cg = this.scene.add.graphics()
    c.add(cg)
    return cg
  }

  private slotPos(i: number): { x: number; y: number } {
    return { x: 40 + (i % 4) * 46, y: 50 + Math.floor(i / 4) * 30 }
  }

  private renderInfo(): void {
    for (const t of this.info) t.destroy()
    this.info = []
    const b = BADGES[this.cursor]
    const g = this.cg
    g.clear()
    const { x, y } = this.slotPos(this.cursor)
    const blink = Math.floor(this.frame / 16) % 2 === 0
    g.lineStyle(1, blink ? 0xfcfaf0 : COLORS.accent[1])
    g.strokeRect(x - 3.5, y - 3.5, 23, 23)
    if (!b) return
    const has = hasBadge(b.id)
    const name = has ? b.name : `Gym ${b.gym} badge`
    const sub = has ? `${b.leader}, ${b.town}` : 'Not yet earned.'
    const skill = skillDef(b.skill)
    this.info.push(this.tx(this.back, 24, 114, name))
    this.info.push(this.tx(this.back, 24, 131, has && skill ? `${sub}  FIELD: ${skill.name}` : sub, { font: FONT.mini, shadow: 'drop' }))
  }

  private show(): void {
    this.front.setVisible(this.page === 0)
    this.back.setVisible(this.page === 1)
    if (this.page === 1) this.renderInfo()
  }

  tick(): void {
    super.tick()
    if (this.page === 1 && this.frame % 16 === 0) this.renderInfo()
  }

  input(): void {
    if (controls.justPressed('A')) {
      controls.consume('A')
      this.page = this.page === 0 ? 1 : 0
      audio.sfx('select')
      this.show()
      return
    }
    if (this.page === 1) {
      const d = controls.dirPressed()
      if (d) {
        const col = this.cursor % 4
        const row = Math.floor(this.cursor / 4)
        if (d === 'left') this.cursor = row * 4 + ((col + 3) % 4)
        else if (d === 'right') this.cursor = row * 4 + ((col + 1) % 4)
        else this.cursor = ((row + 1) % 2) * 4 + col
        audio.sfx('select')
        this.renderInfo()
        return
      }
    }
    if (controls.justPressed('B') || controls.justPressed('START')) {
      controls.consume('A', 'B', 'START')
      audio.sfx('cancel')
      this.close()
    }
  }
}
