// Asset manifest + missing-asset tolerance (§4.5). Texture keys are the path
// under public/assets/game/ without extension, e.g. 'chars/player',
// 'fx/shadow', 'ui/frame_dialog', 'battle/bg_grass', 'mons/glm_front'.

import Phaser from 'phaser'
import { COLORS, FONT } from './config'
import { allSpeciesIds } from './adapters/monInfo'

export const ASSET_ROOT = 'assets/game/'

export interface ImageAsset {
  key: string
  /** Contract size (used for the placeholder when the file is missing). */
  w: number
  h: number
  /** If set, the texture is cut into a grid of frames numbered row-major. */
  fw?: number
  fh?: number
  /** 'auto2' = 2 square frames along the long axis (party icons); 'strip4' = 4 equal frames along the long axis. */
  frames?: 'grid' | 'auto2' | 'strip4'
  /** Optional procedural fallback instead of the magenta box. */
  fallback?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
}

export const CHAR_IDS = ['player', 'mom', 'prof', 'aide', 'boy', 'girl', 'man', 'woman', 'elder', 'techie',
  'nurse', 'clerk', 'trainer_m', 'trainer_f', 'hallucihound']

export const TYPE_IDS = ['neutral', 'myth', 'logic', 'tool', 'speed', 'open', 'vision', 'glitch']

const P = COLORS
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`

function frameFallback(paper: number[], frame: number[]) {
  return (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = hex(frame[0])
    rr(c, 0, 0, w, h)
    c.fillStyle = hex(frame[2])
    rr(c, 1, 1, w - 2, h - 2)
    c.fillStyle = hex(frame[1])
    rr(c, 2, 2, w - 4, h - 4)
    c.fillStyle = hex(paper[0])
    rr(c, 3, 3, w - 6, h - 6)
    c.fillStyle = hex(paper[2])
    c.fillRect(4, 4, w - 8, h - 8)
  }
}

/** Pixel "rounded" rect: corners clipped by 1px. */
function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  c.fillRect(x + 1, y, w - 2, h)
  c.fillRect(x, y + 1, w, h - 2)
}

function pixels(rows: string[], colors: Record<string, string>) {
  return (c: CanvasRenderingContext2D) => {
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (colors[ch]) {
        c.fillStyle = colors[ch]
        c.fillRect(x, y, 1, 1)
      }
    }))
  }
}

export function imageManifest(): ImageAsset[] {
  const list: ImageAsset[] = []
  for (const id of CHAR_IDS) list.push({ key: `chars/${id}`, w: 48, h: 96, fw: 16, fh: 24 })
  list.push(
    {
      key: 'fx/emote_exclaim', w: 16, h: 16,
      fallback: pixels([
        '................', '..#########.....', '.#ooooooooo#....', '.#ooooxxoooo#...', '.#oooxxxxooo#...',
        '.#oooxxxxooo#...', '.#ooooxxoooo#...', '.#ooooxxoooo#...', '.#oooooooooo#...', '.#ooooxxoooo#...',
        '..#oooooooo#....', '...####o###.....', '.......#o#......', '........##......', '................', '................',
      ].map((r) => r.slice(0, 16)), { '#': hex(P.outline), o: '#fcfaf0', x: hex(P.red) }),
    },
    { key: 'fx/grass_rustle', w: 64, h: 16, fw: 16, fh: 16 },
    {
      key: 'fx/grass_overlay', w: 16, h: 16,
      fallback: (c) => {
        c.fillStyle = '#35894c'
        for (let x = 0; x < 16; x += 2) c.fillRect(x, 9 + ((x / 2) % 2), 2, 7)
        c.fillStyle = '#79c860'
        for (let x = 1; x < 16; x += 4) c.fillRect(x, 10, 1, 2)
      },
    },
    {
      key: 'fx/item_ball', w: 16, h: 16,
      fallback: pixels([
        '', '', '', '', '.....######', '....#oooooo#', '...#ooxxoooo#', '...#oxxooooo#', '...##########',
        '...#ccccccccc#', '...#ccccccccc#', '....#ccccccc#', '.....#######',
      ].map((r) => r.padEnd(16, '.')), { '#': hex(P.outline), o: '#9078dc', x: '#bca8f0', c: '#fcfaf0' }),
    },
    {
      key: 'fx/shadow', w: 16, h: 8,
      fallback: (c) => {
        c.fillStyle = 'rgba(40,34,46,0.35)'
        c.fillRect(3, 2, 10, 4)
        c.fillRect(2, 3, 12, 2)
      },
    },
    { key: 'fx/orb_throw', w: 64, h: 16, fw: 16, fh: 16 },
    { key: 'fx/orb_big', w: 128, h: 32, frames: 'strip4' },
    { key: 'fx/truck', w: 48, h: 40 },
    { key: 'fx/satchel', w: 16, h: 16 },
    { key: 'battle/bg_grass', w: 240, h: 112 },
    { key: 'battle/platform_enemy', w: 128, h: 32 },
    { key: 'battle/platform_player', w: 128, h: 32 },
    { key: 'battle/trainer_back', w: 256, h: 64, fw: 64, fh: 64 },
    { key: 'battle/prof_front', w: 64, h: 96 },
    { key: 'battle/trainer_m_front', w: 64, h: 64 },
    { key: 'battle/trainer_f_front', w: 64, h: 64 },
    { key: 'ui/frame_dialog', w: 24, h: 24, fallback: frameFallback(P.paper, P.frame) },
    { key: 'ui/frame_menu', w: 24, h: 24, fallback: frameFallback(P.paper, P.frame) },
    { key: 'ui/frame_battle', w: 24, h: 24, fallback: frameFallback(P.paper, [0x283048, 0x6c54bc, 0x9078dc, 0xbca8f0]) },
    { key: 'ui/hud_enemy', w: 104, h: 32 },
    { key: 'ui/hud_player', w: 104, h: 40 },
    {
      key: 'ui/cursor', w: 8, h: 8,
      fallback: pixels(['#.......', '##......', '#o#.....', '#oo#....', '#o#.....', '##......', '#.......', '........'],
        { '#': hex(P.text), o: hex(P.text) }),
    },
    {
      key: 'ui/arrow_down', w: 8, h: 8,
      fallback: pixels(['........', '#######.', '#ooooo#.', '.#ooo#..', '..#o#...', '...#....', '........', '........'],
        { '#': hex(P.accent[0]), o: hex(P.accent[1]) }),
    },
    { key: 'ui/title_bg', w: 240, h: 160 },
    { key: 'ui/title_logo', w: 160, h: 64 },
    { key: 'ui/orb_slots', w: 64, h: 8 },
    { key: 'ui/starter_select_bg', w: 240, h: 160 },
  )
  for (const t of TYPE_IDS) list.push({ key: `ui/type_${t}`, w: 32, h: 12 })
  for (const id of allSpeciesIds()) {
    list.push({ key: `mons/${id}_front`, w: 64, h: 64 })
    list.push({ key: `mons/${id}_back`, w: 64, h: 64 })
    list.push({ key: `mons/${id}_icon`, w: 32, h: 16, frames: 'auto2' })
  }
  return list
}

/** URL for a texture key: 'chars/x' → assets/game/sprites/chars/x.png, 'ui/x' → assets/game/ui/x.png. */
export function assetUrl(key: string): string {
  const top = key.split('/')[0]
  const dir = top === 'ui' ? '' : 'sprites/'
  return `${ASSET_ROOT}${dir}${key}.png`
}

const placeholders = new Set<string>()

/** True if the texture was generated because the file was missing. */
export function isPlaceholder(key: string): boolean {
  return placeholders.has(key)
}

/** Queue every manifest asset (and fonts) on a scene's loader. */
export function queueAssets(load: Phaser.Loader.LoaderPlugin): ImageAsset[] {
  const list = imageManifest()
  for (const a of list) load.image(a.key, assetUrl(a.key))
  load.bitmapFont(FONT.dialog, `${ASSET_ROOT}fonts/dialog.png`, `${ASSET_ROOT}fonts/dialog.xml`)
  load.bitmapFont(FONT.mini, `${ASSET_ROOT}fonts/mini.png`, `${ASSET_ROOT}fonts/mini.xml`)
  return list
}

/** After loading: create placeholders for missing files and cut sprite sheets. */
export function finalizeAssets(textures: Phaser.Textures.TextureManager, list: ImageAsset[]): void {
  const missing: string[] = []
  for (const a of list) {
    if (!textures.exists(a.key)) {
      missing.push(a.key)
      makePlaceholder(textures, a.key, a.w, a.h, a.fallback, a.fw, a.fh)
      if (!a.fallback) placeholders.add(a.key)
    }
    cutFrames(textures, a)
  }
  if (missing.length) console.info(`[assets] ${missing.length} missing, using placeholders:`, missing.join(', '))
}

export function makePlaceholder(
  textures: Phaser.Textures.TextureManager, key: string, w: number, h: number,
  draw?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, fw?: number, fh?: number,
): void {
  const tex = textures.createCanvas(key, w, h)
  if (!tex) return
  const c = tex.getContext()
  if (draw) {
    draw(c, w, h)
  } else {
    const cw = fw ?? w
    const ch = fh ?? h
    for (let y = 0; y < h; y += ch) {
      for (let x = 0; x < w; x += cw) {
        c.fillStyle = 'rgba(255,0,255,0.28)'
        c.fillRect(x, y, cw, ch)
        c.fillStyle = '#ff00ff'
        c.fillRect(x, y, cw, 1)
        c.fillRect(x, y + ch - 1, cw, 1)
        c.fillRect(x, y, 1, ch)
        c.fillRect(x + cw - 1, y, 1, ch)
        // tiny "eyes" so a facing direction is visible on character placeholders
        if (cw === 16 && ch === 24) {
          const row = Math.floor(y / ch)
          c.fillStyle = '#28222e'
          const ex = row === 2 ? 4 : row === 3 ? 9 : 6
          if (row !== 1) {
            c.fillRect(x + ex, y + 10, 1, 2)
            c.fillRect(x + ex + (row >= 2 ? 2 : 3), y + 10, 1, 2)
          }
        }
      }
    }
  }
  tex.refresh()
}

function cutFrames(textures: Phaser.Textures.TextureManager, a: ImageAsset): void {
  const tex = textures.get(a.key)
  const src = tex.getSourceImage() as { width: number; height: number }
  const W = src.width
  const H = src.height
  if (a.frames === 'strip4') {
    const horiz = W >= H
    const fw = horiz ? Math.floor(W / 4) : W
    const fh = horiz ? H : Math.floor(H / 4)
    for (let i = 0; i < 4; i++) tex.add(i, 0, horiz ? i * fw : 0, horiz ? 0 : i * fh, fw, fh)
    return
  }
  if (a.frames === 'auto2') {
    if (W >= H * 2) {
      tex.add(0, 0, 0, 0, H, H)
      tex.add(1, 0, H, 0, H, H)
    } else if (H >= W * 2) {
      tex.add(0, 0, 0, 0, W, W)
      tex.add(1, 0, 0, W, W, W)
    } else {
      tex.add(0, 0, 0, 0, W, H)
      tex.add(1, 0, 0, 0, W, H)
    }
    return
  }
  if (!a.fw || !a.fh) return
  const cols = Math.max(1, Math.floor(W / a.fw))
  const rows = Math.max(1, Math.floor(H / a.fh))
  let i = 0
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) tex.add(i++, 0, c * a.fw, r * a.fh, a.fw, a.fh)
}

/** Ensure a texture exists (lazy placeholder for dynamic keys like an unknown species). */
export function ensureTexture(scene: Phaser.Scene, key: string, w = 64, h = 64): string {
  if (!scene.textures.exists(key)) {
    const icon = key.endsWith('_icon')
    makePlaceholder(scene.textures, key, icon ? 32 : w, icon ? 16 : h)
    if (icon) cutFrames(scene.textures, { key, w: 32, h: 16, frames: 'auto2' })
    placeholders.add(key)
  }
  return key
}

/** Procedural textures that have no file in the art contract (extra emotes, white pixel). */
export function makeProceduralTextures(textures: Phaser.Textures.TextureManager): void {
  const bubble = [
    '................',
    '..##########....',
    '.#oooooooooo#...',
    '.#oooooooooo#...',
    '.#oooooooooo#...',
    '.#oooooooooo#...',
    '.#oooooooooo#...',
    '.#oooooooooo#...',
    '.#oooooooooo#...',
    '.#oooooooooo#...',
    '..####oo####....',
    '.....#oo#.......',
    '......##........',
    '................',
    '................',
    '................',
  ]
  const glyphs: Record<string, { rows: string[]; color: string }> = {
    question: { rows: ['..xxx...', '.x...x..', '.....x..', '....x...', '...x....', '........', '...x....'], color: '#3c64c8' },
    heart: { rows: ['........', '.xx.xx..', 'xxxxxxx.', 'xxxxxxx.', '.xxxxx..', '..xxx...', '...x....'], color: '#e06c98' },
    dots: { rows: ['........', '........', '........', '........', '........', '........', 'x.x.x...'], color: '#383840' },
    note: { rows: ['...xxx..', '...x.x..', '...x....', '...x....', '.xxx....', 'xxxx....', '.xx.....'], color: '#2c9458' },
  }
  for (const [name, g] of Object.entries(glyphs)) {
    const key = `fx/emote_${name}`
    if (textures.exists(key)) continue
    makePlaceholder(textures, key, 16, 16, (c) => {
      bubble.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === '#') c.fillStyle = '#28222e'
        else if (ch === 'o') c.fillStyle = '#fcfaf0'
        else return
        c.fillRect(x, y, 1, 1)
      }))
      c.fillStyle = g.color
      g.rows.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === 'x') c.fillRect(3 + x, 2 + y, 1, 1)
      }))
    })
  }
}
