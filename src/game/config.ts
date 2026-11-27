// Engine constants (ENGINE workstream). See docs/ENGINE_API.md.

export const W = 240
export const H = 160
export const TILE = 16

/** Logic runs at a fixed 60 Hz; all movement timings are in frames. */
export const FPS = 60
export const FRAME_MS = 1000 / FPS

/** Frames to cross one tile. */
export const WALK_FRAMES = 16
export const RUN_FRAMES = 8
/** Frames a direction must be held (while idle, facing elsewhere) before a turn becomes a step. */
export const TURN_FRAMES = 6
/** Frames per tile for a ledge hop (covers 2 tiles). */
export const LEDGE_FRAMES = 32
export const LEDGE_HEIGHT = 10

/** Text speed: frames per character (normal) and characters per frame while A is held. */
export const TEXT_FRAMES_PER_CHAR = 2
export const TEXT_FAST_CHARS_PER_FRAME = 3

/** Default fade duration in ms (`?fast=1` makes it 0). */
export const FADE_MS = 250

/** Player screen position: the player's tile is drawn at this offset from the camera. */
export const PLAYER_SCREEN_X = 112
export const PLAYER_SCREEN_Y = 64

/** Default wild encounter chance per tall-grass step when no table rate is known. */
export const DEFAULT_ENCOUNTER_RATE = 0.1

export const DEFAULT_PLAYER_NAME = 'Arjun'
export const SAVE_KEY = 'llmmon_mythos_save_v1'
export const SAVE_VERSION = 2 // 2: lab types + renamed moves (battle/core/migrate.ts)

export type Dir = 'down' | 'up' | 'left' | 'right'
export const DIRS: Dir[] = ['down', 'up', 'left', 'right']
export const DIR_VEC: Record<Dir, { x: number; y: number }> = {
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}
export const OPPOSITE: Record<Dir, Dir> = { down: 'up', up: 'down', left: 'right', right: 'left' }
/** Sprite sheet row per facing (chars/<id>.png: rows down, up, left, right). */
export const DIR_ROW: Record<Dir, number> = { down: 0, up: 1, left: 2, right: 3 }

/** Colours (from tools/art/palette.py). */
export const COLORS = {
  text: 0x383840,
  textShadow: 0xc8c4b0,
  white: 0xffffff,
  whiteShadow: 0x40507c,
  paper: [0xd8d0b8, 0xf0ead4, 0xfcfaf0],
  frame: [0x283048, 0x40507c, 0x6880b8, 0xa0b8e0],
  accent: [0xc04820, 0xf07830, 0xfcb060],
  red: 0xc83c44,
  blue: 0x3c64c8,
  hpGreen: [0x30a048, 0x60e070],
  hpYellow: [0xc09018, 0xf8d838],
  hpRed: [0xb02830, 0xf85848],
  expBlue: [0x2868c0, 0x50b0f8],
  outline: 0x28222e,
  black: 0x000000,
}

export const FONT = { dialog: 'font_dialog', mini: 'font_mini' } as const
export type FontKey = (typeof FONT)[keyof typeof FONT]

/** Depths inside the overworld scene. */
export const DEPTH = {
  ground: 0,
  shadow: 50,
  charBase: 100, // + pixel y
  over: 10000,
  fx: 20000,
}
