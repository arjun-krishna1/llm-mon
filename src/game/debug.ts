// Debug + playtest hooks (§4.8). Installed only with ?debug=1.

import Phaser from 'phaser'
import { state } from './state'
import { getUI } from './scenes/UIScene'
import type { OverworldScene } from './scenes/OverworldScene'
import type { BattleRequest, BattleResult } from './types'
import { createMon } from './adapters/monInfo'
import { runScript } from './script'

export function installDebug(game: Phaser.Game): void {
  const ow = () => game.scene.getScene('Overworld') as OverworldScene
  const api = {
    state,
    game,
    info() {
      const ui = getUI(game)
      const o = game.scene.isActive('Overworld') ? ow().info() : {}
      return {
        scenes: game.scene.getScenes(true).map((s) => s.scene.key),
        map: (o.map as string) ?? state.map,
        x: o.x ?? state.x,
        y: o.y ?? state.y,
        facing: o.facing ?? state.facing,
        dialogOpen: ui?.dialog?.isOpen ?? false,
        dialogText: ui?.dialog?.currentText ?? '',
        menuOpen: (ui?.menuOpen ?? false) || (ui?.stack.size ?? 0) > (ui?.dialog?.isBusy ? 1 : 0),
        zone: o.zone ?? '',
        busy: o.busy ?? true,
        moving: o.moving ?? false,
        npcs: o.npcs ?? [],
        weather: o.weather ?? '',
        dark: o.dark ?? false,
        lightTiles: o.lightTiles ?? 0,
        rafting: o.rafting ?? false,
        neighbours: o.neighbours ?? [],
        evalLight: state.evalLight,
      }
    },
    async warp(map: string, spawnOrX: string | number, y?: number) {
      if (!game.scene.isActive('Overworld')) {
        game.scene.getScenes(true).filter((s) => !['UI', 'Boot'].includes(s.scene.key)).forEach((s) => s.scene.stop())
        game.scene.start('Overworld', typeof spawnOrX === 'number' ? { map, x: spawnOrX, y } : { map, spawn: spawnOrX })
        return
      }
      await ow().debugWarp(map, spawnOrX, y)
    },
    setFlag(k: string, v: boolean | number | string = true) {
      state.setFlag(k, v)
      if (game.scene.isActive('Overworld')) ow().refreshNpcVisibility()
    },
    giveMon(speciesId: string, level = 5) {
      const m = createMon(speciesId, level)
      state.addMon(m)
      return m
    },
    giveItem(id: string, n = 1) {
      state.addItem(id, n)
    },
    battle(request: BattleRequest): Promise<BattleResult> {
      return ow().startBattle(request)
    },
    heal() {
      state.healParty()
    },
    /** Run a registered script (from the overworld when active). */
    runScript(id: string) {
      return runScript(game, id)
    },
  }
  ;(window as unknown as { __llmmon: typeof api }).__llmmon = api
}
