// Entry point (ENGINE). Boots Phaser at 240x160 with true integer scaling.

import Phaser from 'phaser'
import { H, W } from './game/config'
import { controls } from './game/controls'
import { audio } from './game/audio'
import { params } from './game/params'
import { seedRng } from './game/rng'
import { BootScene } from './game/scenes/BootScene'
import { TitleScene } from './game/scenes/TitleScene'
import { IntroScene } from './game/scenes/IntroScene'
import { OverworldScene } from './game/scenes/OverworldScene'
import { UIScene } from './game/scenes/UIScene'
import { BattleScene } from './game/scenes/BattleScene'
import { installDebug } from './game/debug'

if (params.seed !== null && Number.isFinite(params.seed)) seedRng(params.seed)

const parent = document.getElementById('game')!

/** Size the parent to the largest integer multiple of 240x160 that fits (fractional only below 1x). */
function fitParent(): void {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H)
  const scale = s >= 1 ? Math.floor(s) : s
  parent.style.width = `${Math.floor(W * scale)}px`
  parent.style.height = `${Math.floor(H * scale)}px`
}
fitParent()

controls.attach()
controls.onAnyKey(() => audio.unlock())

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent,
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  fps: { target: 60, limit: 60 },
  input: { keyboard: false, mouse: false, touch: false, gamepad: false },
  render: { antialiasGL: false, pixelArt: true },
  scene: [BootScene, TitleScene, IntroScene, OverworldScene, UIScene, BattleScene],
})

game.events.on(Phaser.Core.Events.PRE_STEP, () => controls.sample())

window.addEventListener('resize', () => {
  fitParent()
  game.scale.refresh()
})

if (params.debug) installDebug(game)
