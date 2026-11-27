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
import { TouchControls, touchWanted } from './game/touch'
import { loadOptions } from './game/options'

if (params.seed !== null && Number.isFinite(params.seed)) seedRng(params.seed)

const parent = document.getElementById('game')!

const touch = touchWanted() ? new TouchControls() : null

/**
 * Largest scale inside w x h (CSS px) that is a whole number of DEVICE pixels per game
 * pixel, so a phone at devicePixelRatio 3 can show 4 device px per pixel (320 CSS px wide)
 * and stay perfectly sharp. Fractional only below 1 device px.
 */
function fitScale(w: number, h: number): number {
  const dpr = window.devicePixelRatio || 1
  const s = Math.min((w * dpr) / W, (h * dpr) / H)
  return (s >= 1 ? Math.floor(s) : Math.max(0.25, s)) / dpr
}

/**
 * Size + place the game parent. With touch controls the space they need is reserved
 * first: beside the canvas (landscape) or below it (portrait, handheld-style), whichever
 * gives the larger scale.
 */
function fitParent(): void {
  const vw = window.innerWidth
  const vh = window.innerHeight
  let scale = fitScale(vw, vh)
  let mode: 'none' | 'side' | 'below' = 'none'
  const side = Math.round(Math.min(220, Math.max(130, vw * 0.2)))
  const zoneH = Math.round(Math.min(300, Math.max(190, vh * 0.34)))
  if (touch) {
    const sSide = fitScale(vw - 2 * side, vh)
    const sBelow = fitScale(vw - 8, vh - zoneH - 8)
    mode = sBelow > sSide || (sBelow === sSide && vh > vw) ? 'below' : 'side'
    scale = mode === 'below' ? sBelow : sSide
  }
  const w = W * scale
  const h = H * scale
  const dpr = window.devicePixelRatio || 1
  const snap = (v: number) => Math.round(v * dpr) / dpr // whole device pixels
  const left = snap(Math.max(0, (vw - w) / 2))
  const top = mode === 'below' ? snap(Math.max(0, (vh - (h + 8 + zoneH)) / 2)) : snap(Math.max(0, (vh - h) / 2))
  parent.style.width = `${w}px`
  parent.style.height = `${h}px`
  parent.style.position = 'absolute'
  parent.style.left = `${left}px`
  parent.style.top = `${top}px`
  if (touch && mode === 'side') touch.layout('side', { x: 0, y: 0, w: left, h: vh }, { x: left + w, y: 0, w: vw - left - w, h: vh })
  else if (touch) {
    const y0 = top + h + 8
    const zh = Math.min(zoneH, vh - y0)
    touch.layout('below', { x: 0, y: y0, w: vw / 2, h: zh }, { x: vw / 2, y: y0, w: vw / 2, h: zh })
  }
}
fitParent()

loadOptions()
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

// Keyboard focus inside iframes / sandboxed previews: focus the page + canvas on any pointer.
window.addEventListener('pointerdown', () => {
  window.focus()
  const c = game.canvas
  if (c && document.activeElement !== c) c.focus({ preventScroll: true })
  audio.unlock()
}, { capture: true })
game.events.once(Phaser.Core.Events.READY, () => {
  game.canvas.setAttribute('tabindex', '0')
  game.canvas.style.outline = 'none'
  game.canvas.focus({ preventScroll: true })
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
