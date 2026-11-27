// Summary: page 1 = info + stats, page 2 = moves. ←/→ page, ↑/↓ party member, B back.

import Phaser from 'phaser'
import { COLORS, FONT } from '../../config'
import { controls } from '../../controls'
import { audio } from '../../audio'
import { state } from '../../state'
import { expProgress, monMaxHp, monName, monStats, moveInfo, speciesInfo, typeName } from '../../adapters/monInfo'
import { ensureTexture, isPlaceholder } from '../../assets'
import { drawExpBar, drawHpBar, drawPanel, drawStripes } from '../draw'
import { Screen } from './Screen'
import type { WidgetStack } from '../WidgetStack'

export class SummaryScreen extends Screen<number> {
  private index: number
  private page = 0
  private dyn: Phaser.GameObjects.Container

  constructor(scene: Phaser.Scene, stack: WidgetStack, index: number) {
    super(scene, stack)
    this.index = index
    const bg = this.gfx()
    drawStripes(bg, 240, 160, 0x48709c, 0x4c76a4)
    this.dyn = scene.add.container(0, 0)
    this.root.add(this.dyn)
    this.build()
  }

  private build(): void {
    this.dyn.removeAll(true)
    const mon = state.party[this.index]
    if (!mon) return
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.dyn.add(o)
      return o
    }
    const txt = (x: number, y: number, s: string, mini = false, color?: number, shadow?: number) => {
      const t = this.text(x, y, s, mini ? { font: FONT.mini, shadow: 'drop' } : {})
      if (color !== undefined) t.setColor(color, shadow)
      this.dyn.add(t.objects())
      return t
    }
    const g = add(this.scene.add.graphics())
    // header
    g.fillStyle(COLORS.frame[0])
    g.fillRect(0, 0, 240, 15)
    g.fillStyle(COLORS.frame[1])
    g.fillRect(0, 14, 240, 1)
    txt(6, 2, this.page === 0 ? 'LLMMON INFO' : 'KNOWN MOVES', false, 0xffffff, COLORS.frame[1])
    for (let p = 0; p < 2; p++) {
      g.fillStyle(p === this.page ? COLORS.accent[1] : COLORS.frame[2])
      g.fillRect(212 + p * 8, 5, 6, 5)
    }
    // left: portrait
    drawPanel(g, 2, 17, 84, 141)
    g.fillStyle(0xd8eef8)
    g.fillRect(6, 21, 76, 72)
    const key = ensureTexture(this.scene, `mons/${mon.speciesId}_front`)
    const img = add(this.scene.add.image(12, 25, key).setOrigin(0, 0))
    if (isPlaceholder(key)) img.setAlpha(0.8)
    const info = speciesInfo(mon.speciesId)
    txt(8, 96, monName(mon))
    txt(8, 112, `Lv${mon.level}`, true)
    const sp = info.name !== monName(mon) ? info.name : ''
    if (sp) txt(8, 122, sp, true)
    info.types.forEach((t, i) => {
      const tk = `ui/type_${t}`
      if (this.scene.textures.exists(tk) && !isPlaceholder(tk)) add(this.scene.add.image(8 + i * 36, 140, tk).setOrigin(0, 0))
      else {
        g.fillStyle(COLORS.frame[1])
        g.fillRect(8 + i * 36, 140, 32, 12)
        txt(11 + i * 36, 144, typeName(t).toUpperCase().slice(0, 6), true, 0xffffff, COLORS.frame[0])
      }
    })
    // right
    drawPanel(g, 88, 17, 150, 141)
    if (this.page === 0) {
      const st = monStats(mon)
      const max = monMaxHp(mon)
      txt(96, 23, 'HP', true)
      txt(196, 23, `${mon.hp}/${max}`, true)
      drawHpBar(g, 96, 32, 136, mon.hp / max, 3)
      const rows: Array<[string, number]> = [['ATTACK', st.atk], ['DEFENSE', st.def], ['SP. ATK', st.spa], ['SP. DEF', st.spd], ['SPEED', st.spe]]
      rows.forEach(([n, v], i) => {
        const y = 40 + i * 14
        txt(96, y, n)
        const s = String(v)
        txt(228 - s.length * 6, y, s)
        if (i < rows.length - 1) {
          g.fillStyle(COLORS.paper[0])
          g.fillRect(94, y + 13, 140, 1)
        }
      })
      const ep = expProgress(mon)
      txt(96, 114, 'EXP. POINTS', true)
      txt(232 - String(mon.exp).length * 4, 114, String(mon.exp), true)
      txt(96, 124, 'TO NEXT LV.', true)
      txt(232 - String(ep.toNext).length * 4, 124, String(ep.toNext), true)
      txt(96, 136, 'EXP', true)
      drawExpBar(g, 112, 137, 120, ep.frac)
      const status = mon.hp <= 0 ? 'FAINTED' : mon.status && mon.status !== 'none' ? mon.status.toUpperCase() : 'OK'
      txt(96, 146, `STATUS: ${status}`, true)
    } else {
      // empty move slots stay blank (as in battle); keep the row separators
      for (let i = mon.moves.length; i < 3; i++) {
        g.fillStyle(COLORS.paper[0])
        g.fillRect(94, 22 + i * 33 + 29, 140, 1)
      }
      mon.moves.slice(0, 4).forEach((m, i) => {
        const y = 22 + i * 33
        const mi = moveInfo(m.id)
        txt(96, y, mi.name)
        g.fillStyle(COLORS.frame[1])
        g.fillRect(96, y + 15, 34, 9)
        txt(98, y + 17, typeName(mi.type).toUpperCase().slice(0, 7), true, 0xffffff, COLORS.frame[0])
        txt(176, y + 17, `PP ${m.pp}/${mi.pp}`, true)
        if (i < 3) {
          g.fillStyle(COLORS.paper[0])
          g.fillRect(94, y + 29, 140, 1)
        }
      })
    }
  }

  tick(): void {
    super.tick()
  }

  input(): void {
    if (controls.justPressed('B') || controls.justPressed('A')) {
      controls.consume('A', 'B', 'START')
      audio.sfx('cancel')
      this.close(this.index)
      return
    }
    if (controls.justPressed('right') && this.page < 1) {
      this.page++
      audio.sfx('select')
      this.build()
    } else if (controls.justPressed('left') && this.page > 0) {
      this.page--
      audio.sfx('select')
      this.build()
    } else if (controls.justPressed('down') && state.party.length > 1) {
      this.index = (this.index + 1) % state.party.length
      audio.sfx('select')
      this.build()
    } else if (controls.justPressed('up') && state.party.length > 1) {
      this.index = (this.index - 1 + state.party.length) % state.party.length
      audio.sfx('select')
      this.build()
    }
  }
}
