// Procedural textures for puzzle-kit objects (no art files needed; any object can name its
// own `sprite` texture instead). Drawn once per key on a canvas, palette colours only.

import Phaser from 'phaser'
import { makePlaceholder } from '../assets'

type Ctx = CanvasRenderingContext2D
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`
const OUT = 0x28222e

/** Colour ramp [dark, mid, light] for a block/boulder `kind` (hashed into a fixed set). */
const KIND_RAMPS: number[][] = [
  [0x553a2e, 0x946240, 0xbd8654], // a: wood
  [0x2c4a8c, 0x3f6cc0, 0x90bcf0], // b: blue
  [0x1c6440, 0x2c9458, 0x58c478], // c: green
  [0x8c2c34, 0xc04444, 0xf4a088], // d: red
  [0x4c3a8c, 0x6c54bc, 0xbca8f0], // e: violet
  [0xb08018, 0xe8b830, 0xfce070], // f: gold
]
const NAMED: Record<string, number> = { a: 0, wood: 0, b: 1, blue: 1, c: 2, green: 2, d: 3, red: 3, e: 4, violet: 4, f: 5, gold: 5 }

export function kindRamp(kind: string): number[] {
  if (kind in NAMED) return KIND_RAMPS[NAMED[kind]]
  let h = 0
  for (const c of kind) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return KIND_RAMPS[h % KIND_RAMPS.length]
}

function make(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: Ctx) => void): string {
  if (!scene.textures.exists(key)) makePlaceholder(scene.textures, key, w, h, (c) => draw(c))
  return key
}

function rect(c: Ctx, col: number, x: number, y: number, w: number, h: number): void {
  c.fillStyle = hex(col)
  c.fillRect(x, y, w, h)
}

/** 16×20 pushable block (top face + front face), coloured by kind. */
export function blockTexture(scene: Phaser.Scene, kind: string): string {
  const r = kindRamp(kind)
  return make(scene, `kit/block_${kind}`, 16, 20, (c) => {
    rect(c, OUT, 0, 0, 16, 20)
    rect(c, r[2], 1, 1, 14, 9) // top
    rect(c, r[1], 1, 10, 14, 8) // front
    rect(c, r[0], 1, 17, 14, 2)
    rect(c, 0xffffff, 2, 2, 5, 1)
    rect(c, r[0], 1, 10, 14, 1)
    // rivets
    rect(c, r[0], 3, 13, 1, 1)
    rect(c, r[0], 12, 13, 1, 1)
  })
}

/** 16×18 boulder (round rock tinted by kind). */
export function boulderTexture(scene: Phaser.Scene, kind: string): string {
  const r = kindRamp(kind)
  return make(scene, `kit/boulder_${kind}`, 16, 18, (c) => {
    const rows = [
      '.....######.....', '...##aaaaaa##...', '..#aawwaaaaaa#..', '.#aawwaaaaaabb#.', '.#aawaaaaaabbb#.', '#aaaaaaaaabbbbb#',
      '#aaaaaaaabbbbbb#', '#aaaaaaabbbbbbb#', '#aaaaabbbbbbbbd#', '#abbbbbbbbbbbdd#', '#bbbbbbbbbbbddd#', '.#bbbbbbbbbddd#.',
      '.#bbbbbbbdddd##.', '..##ddddddd##...', '....#######.....', '................', '................', '................',
    ]
    const col: Record<string, number> = { '#': OUT, a: r[2], b: r[1], d: r[0], w: 0xffffff }
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (col[ch] !== undefined) rect(c, col[ch], x, y + 2, 1, 1) }))
  })
}

/** 16×24 statue on a plinth (queries / keys). */
export function statueTexture(scene: Phaser.Scene): string {
  return make(scene, 'kit/statue', 16, 24, (c) => {
    rect(c, OUT, 2, 16, 12, 8)
    rect(c, 0xa6acbc, 3, 17, 10, 6)
    rect(c, 0x7c8296, 3, 21, 10, 2)
    rect(c, OUT, 5, 2, 6, 15)
    rect(c, OUT, 4, 6, 8, 8)
    rect(c, 0xced2dc, 6, 3, 4, 4)
    rect(c, 0xa6acbc, 5, 7, 6, 9)
    rect(c, 0xeef0f4, 6, 3, 1, 2)
    rect(c, 0x7c8296, 9, 8, 2, 8)
  })
}

/** 16×16 anchor ring set in the floor (Chain Rule). */
export function anchorTexture(scene: Phaser.Scene): string {
  return make(scene, 'kit/anchor', 16, 16, (c) => {
    rect(c, OUT, 3, 9, 10, 5)
    rect(c, 0x7c8296, 4, 10, 8, 3)
    rect(c, OUT, 6, 1, 4, 10)
    rect(c, 0xa8b4c0, 7, 2, 2, 8)
    rect(c, OUT, 4, 1, 8, 2)
    rect(c, 0xdce4ea, 5, 1, 6, 1)
  })
}

/** 24×12 raft (Normalize). */
export function raftTexture(scene: Phaser.Scene): string {
  return make(scene, 'kit/raft', 22, 12, (c) => {
    rect(c, OUT, 0, 2, 22, 9)
    for (let i = 0; i < 5; i++) {
      rect(c, i % 2 ? 0xbd8654 : 0xe0b078, 1 + i * 4, 3, 4, 7)
      rect(c, 0x946240, 1 + i * 4, 9, 4, 1)
    }
    rect(c, 0x6b4630, 1, 5, 20, 1)
    rect(c, 0xf2d4a0, 2, 3, 2, 1)
  })
}

/** 16×8 key token carried between statues. */
export function keyTexture(scene: Phaser.Scene): string {
  return make(scene, 'kit/key', 12, 8, (c) => {
    rect(c, OUT, 0, 1, 6, 6)
    rect(c, 0xe8b830, 1, 2, 4, 4)
    rect(c, OUT, 2, 3, 2, 2)
    rect(c, OUT, 5, 3, 7, 2)
    rect(c, 0xe8b830, 6, 3, 5, 1)
    rect(c, OUT, 9, 5, 1, 2)
    rect(c, OUT, 11, 5, 1, 2)
  })
}

/** 16×16 toast icons: dice (Sample), notebook page, skill spark. */
export function iconTexture(scene: Phaser.Scene, kind: 'dice' | 'notebook' | 'spark'): string {
  return make(scene, `kit/icon_${kind}`, 16, 16, (c) => {
    if (kind === 'dice') {
      rect(c, OUT, 2, 2, 12, 12)
      rect(c, 0xfcfaf0, 3, 3, 10, 10)
      rect(c, 0xd4dae6, 3, 11, 10, 2)
      for (const [x, y] of [[5, 5], [10, 5], [7, 8], [5, 10], [10, 10]]) rect(c, 0xc83c44, x, y, 2, 2)
    } else if (kind === 'notebook') {
      rect(c, OUT, 3, 1, 11, 14)
      rect(c, 0xfcfaf0, 4, 2, 9, 12)
      rect(c, 0xb4d4ec, 6, 5, 6, 1)
      rect(c, 0xb4d4ec, 6, 8, 6, 1)
      rect(c, 0xb4d4ec, 6, 11, 5, 1)
      for (let y = 3; y < 14; y += 3) rect(c, 0x788494, 2, y, 3, 1)
    } else {
      rect(c, 0xf8d838, 7, 2, 2, 12)
      rect(c, 0xf8d838, 2, 7, 12, 2)
      rect(c, 0xfcfaf0, 7, 7, 2, 2)
    }
  })
}
