// Display-vs-truth bars for the finale's interface tampering (SAFETY_ARC §5 phase 2).
//
//   drawTamperBar(g, x, y, w, 'enemy_hp', trueFrac)   // any scene (battle UI): draws what the
//       tamper layer says to SHOW; with the Probe on, the true value plus a ghost of the fake
//   await s.meter({ id: 'kit_reward', label: 'REWARD', value: 0.3 })   // script demo window
//
// Fakes are set with `tamper.setFake(id, shownFrac)`; the Probe with `tamper.setProbe(true)`.

import Phaser from 'phaser'
import { COLORS, FONT, W } from '../config'
import { controls } from '../controls'
import { audio } from '../audio'
import { state } from '../state'
import { PROBE_GREEN, PROBE_GREEN_DARK, tamper } from '../systems/tamper'
import { drawHpBar, drawPanel } from './draw'
import { PxText } from './text'
import type { UIScene } from '../scenes/UIScene'

/**
 * HP-style bar for value `id`. Without tampering: a normal bar at `trueFrac`. Faked and no
 * Probe: the fake value, indistinguishable. Faked with the Probe on: the true value in the
 * bar, the claimed value as a hollow PROBE-green outline, and a tick at the truth.
 */
export function drawTamperBar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, id: string, trueFrac: number, h = 4): void {
  const shown = tamper.shown(id, trueFrac)
  drawHpBar(g, x, y, w, shown, h)
  if (!tamper.probe || !tamper.isFaked(id)) return
  const fake = Math.max(0, Math.min(1, tamper.fakes.get(id) ?? trueFrac))
  const fw = Math.round(w * fake)
  g.lineStyle(1, PROBE_GREEN, 1)
  g.strokeRect(x + 0.5, y - 1.5, Math.max(1, fw - 1), h + 2)
  const tx = x + Math.round(w * Math.max(0, Math.min(1, trueFrac)))
  g.fillStyle(PROBE_GREEN)
  g.fillRect(tx - 1, y - 3, 2, h + 6)
  g.fillStyle(PROBE_GREEN_DARK)
  g.fillRect(tx - 1, y + h + 2, 2, 1)
}

export interface MeterOptions {
  /** Tamper id (`tamper.setFake(id, …)` fakes it). */
  id: string
  label: string
  /** True value 0..1. */
  value: number
  /** Allow SELECT to toggle the Probe inside the window (default: when the player holds the `probe` item). */
  probe?: boolean
}

/** A small window with a tamper-aware bar; A/B closes, SELECT toggles the Probe (if allowed). */
export function showMeter(ui: UIScene, o: MeterOptions): Promise<void> {
  const canProbe = o.probe ?? state.itemCount('probe') > 0
  const x = 32
  const y = 40
  const w = W - 64
  const h = 58
  const D = 1100
  const g = ui.add.graphics().setDepth(D).setScrollFactor(0)
  const fx = ui.add.graphics().setDepth(D + 2).setScrollFactor(0)
  const title = new PxText(ui, x + 10, y + 6, o.label).setDepth(D + 1).setScrollFactor(0)
  const pct = new PxText(ui, 0, y + 6, '').setDepth(D + 1).setScrollFactor(0)
  const hint = new PxText(ui, x + 10, y + h - 13, canProbe ? 'A: CLOSE   SELECT: PROBE' : 'A: CLOSE', { font: FONT.mini, shadow: 'none', color: 0x6c6c74 }).setDepth(D + 1).setScrollFactor(0)
  const truth = new PxText(ui, x + 10, y + 34, '', { font: FONT.mini, shadow: 'none', color: PROBE_GREEN_DARK }).setDepth(D + 1).setScrollFactor(0)
  let scan = -1
  const render = () => {
    g.clear()
    drawPanel(g, x, y, w, h)
    if (tamper.probe) {
      g.fillStyle(PROBE_GREEN)
      g.fillRect(x + 3, y + 3, w - 6, 1)
    }
    drawTamperBar(g, x + 10, y + 24, w - 20, o.id, o.value, 5)
    const shown = tamper.shown(o.id, o.value)
    pct.setText(`${Math.round(shown * 100)}%`)
    pct.setPosition(x + w - 10 - pct.width, y + 6)
    pct.setColor(tamper.probe && tamper.isFaked(o.id) ? PROBE_GREEN_DARK : COLORS.text)
    truth.setText(tamper.probe && tamper.isFaked(o.id) ? `PROBE: SHOWN ${Math.round((tamper.fakes.get(o.id) ?? 0) * 100)}%  TRUE ${Math.round(o.value * 100)}%` : '')
  }
  render()
  audio.sfx('select')
  return new Promise((res) => {
    const widget = {
      done: false,
      tick: () => {
        // Probe sweep: a green scanline runs down the window when it turns on
        fx.clear()
        if (scan >= 0) {
          scan += 3
          fx.fillStyle(PROBE_GREEN, 0.5)
          fx.fillRect(x + 2, y + 2 + scan, w - 4, 2)
          fx.fillStyle(PROBE_GREEN, 0.15)
          fx.fillRect(x + 2, y + 2, w - 4, scan)
          if (scan > h - 6) scan = -1
        }
      },
      input: () => {
        if (canProbe && controls.justPressed('SELECT')) {
          controls.consume('SELECT')
          tamper.setProbe(!tamper.probe)
          audio.sfx(tamper.probe ? 'pc_on' : 'pc_off')
          if (tamper.probe) scan = 0
          render()
        } else if (controls.justPressed('A') || controls.justPressed('B')) {
          controls.consume('A', 'B')
          audio.sfx('cancel')
          widget.done = true
          for (const t of [title, pct, hint, truth]) t.destroy()
          g.destroy()
          fx.destroy()
          res()
        }
      },
    }
    ui.stack.push(widget)
  })
}
