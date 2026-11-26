// Boot: preload every manifest asset (placeholders for missing files), then route.

import Phaser from 'phaser'
import { COLORS, H, W } from '../config'
import { finalizeAssets, makeProceduralTextures, queueAssets, type ImageAsset } from '../assets'
import { params } from '../params'
import { state } from '../state'
import { content } from '../script'

export class BootScene extends Phaser.Scene {
  private list: ImageAsset[] = []

  constructor() {
    super({ key: 'Boot' })
  }

  preload(): void {
    const g = this.add.graphics()
    const bar = (p: number) => {
      g.clear()
      g.fillStyle(COLORS.frame[1])
      g.fillRect(60, H / 2 - 3, W - 120, 6)
      g.fillStyle(COLORS.accent[1])
      g.fillRect(61, H / 2 - 2, Math.round((W - 122) * p), 4)
    }
    bar(0)
    this.load.on(Phaser.Loader.Events.PROGRESS, bar)
    // Missing files are expected while art lands; keep the console readable.
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (f: Phaser.Loader.File) => console.info(`[assets] missing ${f.src}`))
    this.list = queueAssets(this.load)
  }

  create(): void {
    finalizeAssets(this.textures, this.list)
    makeProceduralTextures(this.textures)
    this.scene.launch('UI')
    if (params.debug && params.map) {
      if (!params.newGame && state.load() && state.map === params.map) {
        /* keep the save's state on the same map */
      } else {
        state.reset()
        state.setFlag('trainer_id', String(10000 + Math.floor(Math.random() * 89999)))
      }
      if (!state.party.length) state.giveMon('claude_fable', 5)
      state.healPoint = content.healPoint ?? { map: params.map, spawn: 'start' }
      this.scene.start('Overworld', {
        map: params.map,
        spawn: params.spawn ?? (params.x === null ? 'start' : undefined),
        x: params.x ?? undefined,
        y: params.y ?? undefined,
      })
      return
    }
    this.scene.start('Title')
  }
}
