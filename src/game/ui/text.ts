// Bitmap text with tint + pixel shadow. Fonts are white glyphs; colour comes from tint.

import Phaser from 'phaser'
import { COLORS, FONT, type FontKey } from '../config'
import { state } from '../state'

export type ShadowStyle = 'none' | 'drop' | 'full'

export interface TextStyle {
  font?: FontKey
  color?: number
  shadow?: ShadowStyle
  shadowColor?: number
}

/** Named colour presets for dialog/menus. */
export const TEXT_COLORS = {
  default: { color: COLORS.text, shadowColor: COLORS.textShadow },
  white: { color: COLORS.white, shadowColor: COLORS.whiteShadow },
  blue: { color: 0x3060c8, shadowColor: 0xa8c0e8 },
  red: { color: 0xc83838, shadowColor: 0xf0b0a8 },
  grey: { color: 0x989890, shadowColor: 0xe0dccc },
  accent: { color: COLORS.accent[0], shadowColor: COLORS.accent[2] },
} as const
export type TextColorName = keyof typeof TEXT_COLORS

const SHADOW_OFFSETS: Record<ShadowStyle, Array<[number, number]>> = {
  none: [],
  drop: [[1, 1]],
  full: [[1, 0], [0, 1], [1, 1]],
}

/**
 * A line (or lines) of bitmap text with an optional pixel shadow.
 * Positions are integers; origin is the top-left of the glyph cell.
 */
export class PxText {
  readonly scene: Phaser.Scene
  readonly main: Phaser.GameObjects.BitmapText
  private shadows: Phaser.GameObjects.BitmapText[] = []
  private offsets: Array<[number, number]>
  private _x: number
  private _y: number
  private _text = ''
  font: FontKey

  constructor(scene: Phaser.Scene, x: number, y: number, text = '', style: TextStyle = {}) {
    this.scene = scene
    this.font = style.font ?? FONT.dialog
    this._x = Math.round(x)
    this._y = Math.round(y)
    const shadow = style.shadow ?? 'full'
    this.offsets = SHADOW_OFFSETS[shadow]
    for (const [dx, dy] of this.offsets) {
      const s = scene.add.bitmapText(this._x + dx, this._y + dy, this.font, '')
      s.setTint(style.shadowColor ?? COLORS.textShadow)
      this.shadows.push(s)
    }
    this.main = scene.add.bitmapText(this._x, this._y, this.font, '')
    this.main.setTint(style.color ?? COLORS.text)
    this.setText(text)
  }

  get text(): string {
    return this._text
  }
  get x(): number {
    return this._x
  }
  get y(): number {
    return this._y
  }

  setText(t: string): this {
    if (t === this._text) return this
    this._text = t
    this.main.setText(t)
    for (const s of this.shadows) s.setText(t)
    return this
  }

  setColor(color: number, shadowColor?: number): this {
    this.main.setTint(color)
    if (shadowColor !== undefined) for (const s of this.shadows) s.setTint(shadowColor)
    return this
  }

  setColorName(name: TextColorName): this {
    const c = TEXT_COLORS[name]
    return this.setColor(c.color, c.shadowColor)
  }

  setPosition(x: number, y: number): this {
    this._x = Math.round(x)
    this._y = Math.round(y)
    this.main.setPosition(this._x, this._y)
    this.shadows.forEach((s, i) => s.setPosition(this._x + this.offsets[i][0], this._y + this.offsets[i][1]))
    return this
  }

  setVisible(v: boolean): this {
    this.main.setVisible(v)
    for (const s of this.shadows) s.setVisible(v)
    return this
  }

  get visible(): boolean {
    return this.main.visible
  }

  setDepth(d: number): this {
    for (const s of this.shadows) s.setDepth(d)
    this.main.setDepth(d)
    return this
  }

  setScrollFactor(f: number): this {
    this.main.setScrollFactor(f)
    for (const s of this.shadows) s.setScrollFactor(f)
    return this
  }

  setAlpha(a: number): this {
    this.main.setAlpha(a)
    for (const s of this.shadows) s.setAlpha(a)
    return this
  }

  /** Width in pixels of the current text (widest line). */
  get width(): number {
    return measure(this.scene, this.font, this._text)
  }

  /** Every game object (for containers / bulk ops). */
  objects(): Phaser.GameObjects.BitmapText[] {
    return [...this.shadows, this.main]
  }

  destroy(): void {
    for (const s of this.shadows) s.destroy()
    this.main.destroy()
  }
}

function charAdvances(scene: Phaser.Scene, font: string): Record<number, { xAdvance: number }> {
  const entry = scene.cache.bitmapFont.get(font)
  return (entry?.data?.chars ?? {}) as Record<number, { xAdvance: number }>
}

/** Pixel width of `text` (widest line) in a bitmap font, matching BitmapText layout. */
export function measure(scene: Phaser.Scene, font: string, text: string): number {
  const chars = charAdvances(scene, font)
  let best = 0
  for (const line of text.split('\n')) {
    let w = 0
    for (const ch of line) {
      const c = chars[ch.codePointAt(0) ?? 0]
      if (c) w += c.xAdvance
    }
    if (line.length) w -= 1 // trailing tracking
    best = Math.max(best, w)
  }
  return best
}

/** Word-wrap one paragraph-set (newlines respected) to `maxWidth` pixels. */
export function wrap(scene: Phaser.Scene, font: string, text: string, maxWidth: number): string[] {
  const out: string[] = []
  for (const para of text.split('\n')) {
    const words = para.split(' ')
    let line = ''
    for (const word of words) {
      const cand = line ? `${line} ${word}` : word
      if (measure(scene, font, cand) <= maxWidth || !line) {
        line = cand
      } else {
        out.push(line)
        line = word
      }
    }
    out.push(line)
  }
  return out
}

/** Replace `{player}` and other {vars} in dialogue. */
export function expand(text: string, vars: Record<string, string | number> = {}): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => {
    if (k in vars) return String(vars[k])
    if (k === 'player') return state.playerName
    if (k === 'money') return String(state.money)
    return m
  })
}
