// The GBA "forget a move?" flow, shared by the battle scene and the evolution scene.

import type Phaser from 'phaser'
import { choice } from '../../ui/ListMenu'
import type { DialogBox } from '../../ui/DialogBox'
import type { WidgetStack } from '../../ui/WidgetStack'
import type { MonInstance } from '../../types'
import { getMove, getSpecies } from '../core'
import { DEPTH } from './constants'
import { ForgetMoveScreen, type MoveInfo } from './menus'

export interface LearnHost {
  scene: Phaser.Scene
  stack: WidgetStack
  box: DialogBox
  /** Fade the host's black fader to 1 (cover) or 0 (reveal). */
  fade(to: 0 | 1): Promise<void>
  /** Snap the fader. */
  setFader(a: number): void
  setPhase?(p: string): void
}

export function moveInfo(id: string, pp?: number): MoveInfo {
  const m = getMove(id)
  return {
    id, name: m.name, type: m.type, category: m.category, power: m.power, accuracy: m.accuracy,
    pp: pp ?? m.pp, maxPp: m.pp, description: m.description,
  }
}

/** "Forget a move to make room for X?" → pick → slot 0-3, or null when the player gives up. */
export async function askForgetMove(h: LearnHost, mon: MonInstance, moveId: string): Promise<number | null> {
  const name = mon.nickname ?? getSpecies(mon.speciesId).name
  const moveName = getMove(moveId).name
  for (;;) {
    await h.box.say(`Forget a move to make room for ${moveName}?`, { keepOpen: true })
    h.setPhase?.('learn-yesno')
    const yes = (await choice(h.scene, h.stack, ['YES', 'NO'], { x: 238, y: 110, anchor: 'br', depth: DEPTH.menu, cancelIndex: 1 })) === 0
    if (yes) {
      await h.box.say('Which move should be forgotten?', { keepOpen: true })
      h.setPhase?.('learn-pick')
      await h.fade(1)
      const infos: MoveInfo[] = [...mon.moves.map((m) => moveInfo(m.id, m.pp)), moveInfo(moveId)]
      const scr = new ForgetMoveScreen(h.scene, h.stack, infos, name)
      const p = scr.result()
      await h.fade(0)
      const slot = await p
      h.setFader(1)
      await h.fade(0)
      if (slot >= 0 && slot < 4) return slot
    }
    await h.box.say(`Stop learning ${moveName}?`, { keepOpen: true })
    h.setPhase?.('learn-stop')
    const stop = (await choice(h.scene, h.stack, ['YES', 'NO'], { x: 238, y: 110, anchor: 'br', depth: DEPTH.menu, cancelIndex: 1 })) === 0
    if (stop) return null
  }
}
