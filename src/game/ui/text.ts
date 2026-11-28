// Bitmap text with tint + pixel shadow. Fonts are white glyphs; colour comes from tint.

import Phaser from 'phaser'
import { COLORS, FONT, type FontKey } from '../config'
import { state } from '../state'
import { PROBE_GREEN, tamper } from '../systems/tamper'

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
    this.baseFont = this.font
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
    this.baseColor = style.color ?? COLORS.text
    this.main.setTint(this.baseColor)
    ;(this.main as unknown as { __px?: PxText }).__px = this
    this.setText(text)
  }

  private baseColor: number

  /** Re-apply interface tampering (systems/tamper.ts) to the current text. */
  refreshTamper(): void {
    this.render()
  }

  private render(): void {
    const key = this.scene.sys.settings.key
    const shown = forFont(this.font, tamper.filterText(this._text, key))
    this.main.setText(shown)
    for (const s of this.shadows) s.setText(shown)
    this.main.setTint(tamper.probe && tamper.appliesTo(key) && tamper.wouldChange(this._text, key) ? PROBE_GREEN : this.baseColor)
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
    this.render()
    return this
  }

  /** Switch font (e.g. to the mini font when a label does not fit). */
  setFont(font: FontKey): this {
    if (font === this.font) return this
    this.font = font
    // keep a mini label vertically centred where a dialog-font line was laid out
    this.yOff = font === FONT.mini && this.baseFont === FONT.dialog ? 3 : 0
    this.setPosition(this._x, this._y)
    // pass the font's native size, or Phaser keeps the old font's size and scales the glyphs
    const size = (this.scene.cache.bitmapFont.get(font)?.data?.size as number | undefined) ?? undefined
    this.main.setFont(font, size)
    for (const s of this.shadows) s.setFont(font, size)
    const t = this._text
    this._text = ''
    return this.setText(t)
  }

  /** Extra px between glyphs (negative = condensed). */
  setLetterSpacing(px: number): this {
    this.spacing = px
    this.main.setLetterSpacing(px)
    for (const s of this.shadows) s.setLetterSpacing(px)
    return this
  }

  /** Apply a fitLabel() result. */
  setLabel(l: FittedLabel): this {
    this.setFont(l.font).setLetterSpacing(l.spacing)
    return this.setText(l.text)
  }

  setColor(color: number, shadowColor?: number): this {
    this.baseColor = color
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
    const dy = this._y + (this.yOff ?? 0)
    this.main.setPosition(this._x, dy)
    this.shadows.forEach((s, i) => s.setPosition(this._x + this.offsets[i][0], dy + this.offsets[i][1]))
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
    return measure(this.scene, this.font, this._text, this.spacing)
  }

  private spacing = 0
  private yOff = 0
  private baseFont: FontKey = FONT.dialog

  /** Every game object (for containers / bulk ops). */
  objects(): Phaser.GameObjects.BitmapText[] {
    return [...this.shadows, this.main]
  }

  destroy(): void {
    for (const s of this.shadows) s.destroy()
    this.main.destroy()
  }
}

function charAdvances(scene: Phaser.Scene, font: string): Record<number, { xAdvance: number; kerning?: Record<number, number> }> {
  const entry = scene.cache.bitmapFont.get(font)
  return (entry?.data?.chars ?? {}) as Record<number, { xAdvance: number; kerning?: Record<number, number> }>
}

/**
 * The mini font is caps + digits only (plus the lowercase v of "Lv"): any text routed to it
 * is upper-cased so nothing silently disappears ("Gemma 4" → "GEMMA 4", not "G 4").
 */
export function forFont(font: string, text: string): string {
  if (font !== FONT.mini) return text
  return text.replace(/[a-z]/g, (c, i: number) => (c === 'v' && text[i - 1] === 'L' ? c : c.toUpperCase()))
}

/** Pixel width of `text` (widest line) in a bitmap font, matching BitmapText layout. */
export function measure(scene: Phaser.Scene, font: string, text: string, spacing = 0): number {
  const chars = charAdvances(scene, font)
  text = forFont(font, text)
  let best = 0
  for (const line of text.split('\n')) {
    let w = 0
    let prev = -1
    for (const ch of line) {
      const code = ch.codePointAt(0) ?? 0
      const c = chars[code]
      if (c) {
        w += c.xAdvance + (prev >= 0 ? (c.kerning?.[prev] ?? 0) : 0)
        prev = code
      }
    }
    if (line.length) w -= 1 // trailing tracking
    if (line.length > 1) w += spacing * ([...line].length - 1)
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

export interface FittedLabel {
  text: string
  font: FontKey
  spacing: number
}

/**
 * Fit a short label (names, nicknames) into `maxW` px without chopping a word:
 * dialog font → dialog condensed by 1px → mini font (caps) → drop whole trailing words
 * (dialog, then condensed) → only if a single word still cannot fit, cut it in the mini font.
 */
export function fitLabel(scene: Phaser.Scene, s: string, maxW: number): FittedLabel {
  const d = FONT.dialog
  const m = FONT.mini
  if (measure(scene, d, s) <= maxW) return { text: s, font: d, spacing: 0 }
  if (measure(scene, d, s, -1) <= maxW) return { text: s, font: d, spacing: -1 }
  if (measure(scene, m, s) <= maxW) return { text: s, font: m, spacing: 0 }
  const words = s.split(' ')
  for (let n = words.length - 1; n >= 1; n--) {
    const t = words.slice(0, n).join(' ')
    if (measure(scene, d, t) <= maxW) return { text: t, font: d, spacing: 0 }
    if (measure(scene, d, t, -1) <= maxW) return { text: t, font: d, spacing: -1 }
    if (measure(scene, m, t) <= maxW) return { text: t, font: m, spacing: 0 }
  }
  let t = s
  while (t.length > 1 && measure(scene, m, t) > maxW) t = t.slice(0, -1)
  return { text: t.trimEnd(), font: m, spacing: 0 }
}

/** Re-filter every PxText in the given scenes (called when tampering changes). */
export function refreshTamperedText(scenes: Phaser.Scene[]): void {
  const visit = (list: Phaser.GameObjects.GameObject[]) => {
    for (const o of list) {
      const px = (o as unknown as { __px?: PxText }).__px
      if (px) px.refreshTamper()
      const kids = (o as Phaser.GameObjects.Container).list
      if (Array.isArray(kids)) visit(kids as Phaser.GameObjects.GameObject[])
    }
  }
  for (const sc of scenes) if (sc.sys?.displayList) visit(sc.sys.displayList.list)
}
