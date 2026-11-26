// Promise helpers for choreography + generated pixel FX textures.

import Phaser from 'phaser'
import { controls } from '../../controls'
import { ms, params } from '../../params'

export type TweenCfg = Omit<Phaser.Types.Tweens.TweenBuilderConfig, 'targets' | 'duration'>

/** Tween that resolves on completion. `dur` is raw ms (passed through `ms()`); 0 snaps next frame. */
export function tween(scene: Phaser.Scene, targets: unknown, dur: number, cfg: TweenCfg): Promise<void> {
  return new Promise((res) => {
    const d = ms(dur)
    const done = cfg.onComplete as (() => void) | undefined
    scene.tweens.add({
      ...cfg,
      targets,
      duration: Math.max(1, d),
      onComplete: () => {
        done?.()
        res()
      },
    } as Phaser.Types.Tweens.TweenBuilderConfig)
  })
}

/** Animate a number 0→1 calling `fn(k)` (eased). */
export function animate(scene: Phaser.Scene, dur: number, fn: (k: number) => void, ease = 'Linear'): Promise<void> {
  const o = { k: 0 }
  return tween(scene, o, dur, { k: 1, ease, onUpdate: () => fn(o.k) }).then(() => fn(1))
}

export function wait(scene: Phaser.Scene, dur: number): Promise<void> {
  const d = ms(dur)
  if (d <= 0) return Promise.resolve()
  return new Promise((res) => scene.time.delayedCall(d, () => res()))
}

/** Wait `dur` ms, but A/B (pressed, or held) ends it early. Used for auto-advancing text holds. */
export function holdSkippable(scene: Phaser.Scene, dur: number): Promise<void> {
  const d = ms(dur)
  if (d <= 0) return Promise.resolve()
  return new Promise((res) => {
    let t = 0
    const ev = scene.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        t += 16
        if (t >= d || controls.isDown('A') || controls.isDown('B')) {
          ev.remove()
          res()
        }
      },
    })
  })
}

/** Run a per-frame callback for `frames` logic frames (scene time based). Resolves at the end. */
export function frames(scene: Phaser.Scene, count: number, fn: (f: number) => void): Promise<void> {
  if (params.fast) {
    fn(count)
    return Promise.resolve()
  }
  return new Promise((res) => {
    let f = 0
    const ev = scene.time.addEvent({
      delay: 1000 / 60, loop: true,
      callback: () => {
        f++
        fn(f)
        if (f >= count) {
          ev.remove()
          res()
        }
      },
    })
  })
}

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k
}

/** Interpolate two 0xRRGGBB colours. */
export function mixColor(a: number, b: number, k: number): number {
  const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, k))
  const g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, k))
  const bl = Math.round(lerp(a & 255, b & 255, k))
  return (r << 16) | (g << 8) | bl
}

/** Quadratic bezier point. */
export function bez(p0: number, p1: number, p2: number, t: number): number {
  const u = 1 - t
  return u * u * p0 + 2 * u * t * p1 + t * t * p2
}

// ---------------------------------------------------------------- FX textures

const OUTLINE = 'rgb(56,40,64)'

/**
 * Pixel-map texture via a canvas. `outline` adds a 1px dark rim (it stays dark under
 * tint), so effects read on the bright field.
 */
function makeTex(scene: Phaser.Scene, key: string, map: string[], pal: Record<string, string>, outline = true): void {
  if (scene.textures.exists(key)) return
  const pad = outline ? 1 : 0
  const w = Math.max(...map.map((r) => r.length)) + pad * 2
  const h = map.length + pad * 2
  const tex = scene.textures.createCanvas(key, w, h)
  if (!tex) return
  const c = tex.getContext()
  const on = (x: number, y: number) => {
    const r = map[y - pad]
    return !!r && x - pad >= 0 && pal[r[x - pad]] !== undefined
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (on(x, y)) {
        c.fillStyle = pal[map[y - pad][x - pad]]
        c.fillRect(x, y, 1, 1)
      } else if (outline && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) {
        c.fillStyle = OUTLINE
        c.fillRect(x, y, 1, 1)
      }
    }
  }
  tex.refresh()
}

/**
 * White/greyscale FX sprites with dark rims, tinted by move type at runtime (tint
 * multiplies: light pixels take the type colour, the rim stays dark).
 */
export function ensureFxTextures(scene: Phaser.Scene): void {
  const P = { w: '#ffffff', l: '#d0d0dc', m: '#9090a4' }
  makeTex(scene, 'bfx/spark', ['..w..', '..w..', 'wwwww', '..w..', '..w..'], P)
  makeTex(scene, 'bfx/dot', ['.ww.', 'wwww', 'wwlw', '.ww.'], P)
  makeTex(scene, 'bfx/orb', ['..ww..', '.wwwl.', 'wwwwll', 'wwwlll', '.wlll.', '..ll..'], P)
  makeTex(scene, 'bfx/impact', [
    '....w....', '.w..w..w.', '..w.w.w..', '...www...', 'wwwwwwwww', '...www...', '..w.w.w..', '.w..w..w.', '....w....',
  ], P)
  makeTex(scene, 'bfx/slash', Array.from({ length: 14 }, (_, i) => ' '.repeat(13 - i) + 'ww' + ' '.repeat(i)), P)
  makeTex(scene, 'bfx/arrow_up', ['...w...', '..www..', '.wwwww.', 'wwwwwww', '..www..', '..www..', '..lll..'], P)
  makeTex(scene, 'bfx/arrow_down', ['..lll..', '..www..', '..www..', 'wwwwwww', '.wwwww.', '..www..', '...w...'], P)
  makeTex(scene, 'bfx/note', ['..wwww', '..w..w', '..w..w', 'ww.ww.', 'ww.ww.'], P)
  makeTex(scene, 'bfx/q', ['.www.', 'w...w', '...w.', '..w..', '.....', '..w..'], P)
  makeTex(scene, 'bfx/star', ['...y...', '..yyy..', 'yyywyyy', '.ywwwy.', '..yyy..', '.yy.yy.', 'y.....y'], { y: '#f8d838', w: '#fcf6d0' })
  makeTex(scene, 'bfx/zz', ['wwww', '..w.', '.w..', 'wwww'], P)
  makeTex(scene, 'bfx/pixel', ['ww', 'ww'], P)
  makeTex(scene, 'bfx/sweat', ['.w.', 'www', 'www', '.w.'], { w: '#80c8f8' })
}

/**
 * Width of `s` in the dialog font after condensing to fit `maxW` (letter spacing -1
 * on very long names / move names). Returns the rendered width.
 */
export function fitText(scene: Phaser.Scene, t: { objects(): Phaser.GameObjects.BitmapText[]; text: string; font: string }, maxW: number): number {
  const w = measureFont(scene, t.font, t.text)
  const tight = w > maxW
  for (const o of t.objects()) o.setLetterSpacing(tight ? -1 : 0)
  return tight ? w - Math.max(0, t.text.length - 1) : w
}

function measureFont(scene: Phaser.Scene, font: string, text: string): number {
  const chars = (scene.cache.bitmapFont.get(font)?.data?.chars ?? {}) as Record<number, { xAdvance: number }>
  let w = 0
  for (const ch of text) w += chars[ch.codePointAt(0) ?? 0]?.xAdvance ?? 0
  return Math.max(0, w - 1)
}
