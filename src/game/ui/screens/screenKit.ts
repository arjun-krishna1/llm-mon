// Small shared bits for the PromptDex and Model Storage screens: orb-mark frames, the
// storage hand cursor, type chips with a drawn fallback, tiny type pills, text fitting.

import Phaser from 'phaser'
import { COLORS, FONT } from '../../config'
import { isPlaceholder, makePlaceholder } from '../../assets'
import { typeColor, typeName, typeShort } from '../../adapters/monInfo'
import { measure } from '../text'

/** `ui/orb_slots` is one 64×8 strip; cut it into string frames '0'..'7' (idempotent; Stage does the same). */
export function orbFrames(scene: Phaser.Scene): void {
  const t = scene.textures.get('ui/orb_slots')
  if (!t || t.key === '__MISSING' || t.has('0')) return
  for (let i = 0; i < 8; i++) t.add(String(i), 0, i * 8, 0, 8, 8)
}

/** 14×14 pointing hand (frame 0 open, frame 1 grabbing), generated once. Fingertip at (6, 13). */
export function handTexture(scene: Phaser.Scene): string {
  const key = 'ui/hand_cursor'
  if (scene.textures.exists(key)) return key
  const open = [
    '.....##.......',
    '....#ww#......',
    '....#ww#......',
    '....#ww###....',
    '..###ww#ww##..',
    '.#ww#ww#ww#w#.',
    '.#ww#wwwwwww#.',
    '.#wwwwwwwwww#.',
    '..#wwwwwwwww#.',
    '..#wwwwwwwss#.',
    '...#wwwwwss#..',
    '....#wwwss#...',
    '....#oooo#....',
    '....######....',
  ]
  const grab = [
    '..............',
    '..............',
    '..............',
    '....######....',
    '...#ww#ww##...',
    '..#ww#ww#ww#..',
    '.#ww#ww#ww#w#.',
    '.#wwwwwwwwww#.',
    '..#wwwwwwwww#.',
    '..#wwwwwwwss#.',
    '...#wwwwwss#..',
    '....#wwwss#...',
    '....#oooo#....',
    '....######....',
  ]
  const col: Record<string, string> = { '#': '#28222e', w: '#fcfaf0', s: '#c8c4b0', o: '#f07830' }
  makePlaceholder(scene.textures, key, 28, 14, (c) => {
    ;[open, grab].forEach((rows, f) => rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (!col[ch]) return
      c.fillStyle = col[ch]
      c.fillRect(f * 14 + x, y, 1, 1)
    })))
  })
  const t = scene.textures.get(key)
  t.add(0, 0, 0, 0, 14, 14)
  t.add(1, 0, 14, 0, 14, 14)
  return key
}

function shade(c: number, f: number): number {
  const r = Math.min(255, Math.round(((c >> 16) & 255) * f))
  const g = Math.min(255, Math.round(((c >> 8) & 255) * f))
  const b = Math.min(255, Math.round((c & 255) * f))
  return (r << 16) | (g << 8) | b
}

export interface Adders {
  image: (x: number, y: number, key: string, frame?: number | string) => Phaser.GameObjects.Image
  mini: (x: number, y: number, s: string, color: number, shadow: number) => unknown
}

/** A 32×12 type chip (`ui/type_<id>`), or a drawn stand-in when the art is missing. */
export function typeChip(g: Phaser.GameObjects.Graphics, add: Adders, scene: Phaser.Scene, x: number, y: number, type: string): void {
  const key = `ui/type_${type}`
  if (scene.textures.exists(key) && !isPlaceholder(key)) {
    add.image(x, y, key)
    return
  }
  const c = typeColor(type)
  g.fillStyle(COLORS.outline)
  g.fillRect(x + 1, y, 30, 12)
  g.fillRect(x, y + 1, 32, 10)
  g.fillStyle(c)
  g.fillRect(x + 1, y + 1, 30, 10)
  const label = typeName(type).toUpperCase().slice(0, 7)
  add.mini(x + 16 - Math.floor((measure(scene, FONT.mini, label) + 1) / 2), y + 4, label, 0xffffff, shade(c, 0.55))
}

/** A tiny 15×7 type pill with the 3-letter abbreviation (info bars). Returns its width. */
export function typePill(g: Phaser.GameObjects.Graphics, add: Adders, x: number, y: number, type: string): number {
  const c = typeColor(type)
  g.fillStyle(shade(c, 0.5))
  g.fillRect(x, y, 15, 7)
  g.fillStyle(c)
  g.fillRect(x + 1, y + 1, 13, 5)
  add.mini(x + 2, y + 1, typeShort(type), 0xffffff, shade(c, 0.45))
  return 15
}

/** Cut `s` (no ellipsis, like the GBA PC) until it is at most `maxW` px in `font`. */
export function fitText(scene: Phaser.Scene, font: string, s: string, maxW: number): string {
  let t = s
  while (t.length > 1 && measure(scene, font, t) > maxW) t = t.slice(0, -1)
  return t.trimEnd()
}

/** Small filled triangle (scroll / page indicators). dir: 'up' | 'down' | 'left' | 'right'. */
export function triangle(g: Phaser.GameObjects.Graphics, x: number, y: number, dir: 'up' | 'down' | 'left' | 'right',
  fill: number = COLORS.accent[1], outline: number | null = COLORS.outline): void {
  // 'down' shape as [row, startCol, width]; 9×6 footprint at (x, y) (6×9 for left/right)
  const out: Array<[number, number, number]> = [[0, 0, 9], [1, 0, 9], [2, 1, 7], [3, 2, 5], [4, 3, 3], [5, 4, 1]]
  const inn: Array<[number, number, number]> = [[1, 1, 7], [2, 2, 5], [3, 3, 3], [4, 4, 1]]
  // outline null → fill only, 7×4 (4×7) footprint at (x, y)
  const shift = outline === null ? -1 : 0
  const cs = outline === null ? -1 : 0
  const put = (rows: Array<[number, number, number]>, color: number) => {
    g.fillStyle(color)
    for (const [r0, c0, w] of rows) {
      const c = c0 + cs
      const r = (dir === 'up' || dir === 'left' ? 5 - r0 : r0) + shift
      if (dir === 'up' || dir === 'down') g.fillRect(x + c, y + r, w, 1)
      else g.fillRect(x + r, y + c, 1, w)
    }
  }
  if (outline !== null) put(out, outline)
  put(inn, fill)
}
