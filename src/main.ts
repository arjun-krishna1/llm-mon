// Entry point (ENGINE). Boots Phaser at 240x160 with true integer scaling.

import Phaser from 'phaser'
import { H, W } from './game/config'
import { controls } from './game/controls'
import { audio } from './game/audio'
import { params } from './game/params'
import { seedRng } from './game/rng'
import { state } from './game/state'
import { BootScene } from './game/scenes/BootScene'
import { TitleScene } from './game/scenes/TitleScene'
import { IntroScene } from './game/scenes/IntroScene'
import { OverworldScene } from './game/scenes/OverworldScene'
import { UIScene } from './game/scenes/UIScene'
import { BattleScene } from './game/scenes/BattleScene'
import { StarterSelectScene } from './game/scenes/StarterSelectScene'
import { installDebug } from './game/debug'

if (params.seed !== null && Number.isFinite(params.seed)) seedRng(params.seed)

const parent = document.getElementById('game')!

/** Size the parent to the largest integer multiple of 240x160 that fits (fractional only below 1x). */
function fitParent(): void {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H)
  const scale = s >= 1 ? Math.floor(s) : s
  const w = Math.floor(W * scale)
  const h = Math.floor(H * scale)
  parent.style.width = `${w}px`
  parent.style.height = `${h}px`
  // whole-pixel placement (flex centring can land on .5px and soften the image)
  parent.style.position = 'absolute'
  parent.style.left = `${Math.max(0, Math.floor((window.innerWidth - w) / 2))}px`
  parent.style.top = `${Math.max(0, Math.floor((window.innerHeight - h) / 2))}px`
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
  fps: { target: 60 },
  input: { keyboard: false, mouse: false, touch: false, gamepad: false },
  render: { antialiasGL: false, pixelArt: true },
  scene: [BootScene, TitleScene, IntroScene, OverworldScene, UIScene, BattleScene, StarterSelectScene],
})

game.events.on(Phaser.Core.Events.PRE_STEP, (_time: number, delta: number) => {
  controls.step(delta)
  // Play time = wall clock in any scene once a game is running (not on the title / boot screens).
  if (!game.scene.isActive('Title') && !game.scene.isActive('Boot')) state.playTimeMs += Math.min(delta, 250)
})

window.addEventListener('resize', () => {
  fitParent()
  // refresh() alone keeps the cached parent size; re-measure first so the new integer scale applies now.
  game.scale.getParentBounds()
  game.scale.refresh()
})

if (params.debug) installDebug(game)

if (new URLSearchParams(location.search).has('audiotest')) {
  import('./game/audio/dev/audiotest').then((m) => m.mountAudioTest(document.body))
}
