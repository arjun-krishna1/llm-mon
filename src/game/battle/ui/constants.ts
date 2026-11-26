// Battle UI tuning: layout (pixels on the 240x160 screen) and timings (ms).
// Every duration goes through `ms()` at the call site, so `?fast=1` zeroes it.
// See docs/BATTLE_UI.md for what each knob changes.

export const LAYOUT = {
  /** Message box (orange battle frame), matches the art mock-up. */
  box: { x: 0, y: 112, w: 240, h: 48 },
  /** Right-hand command window (FIGHT / BAG / LLMMON / RUN). */
  command: { x: 120, y: 112, w: 120, h: 48 },
  /** Move menu: names (left) + PP/type panel (right). */
  moves: { x: 0, y: 112, w: 176, h: 48 },
  moveInfo: { x: 176, y: 112, w: 64, h: 48 },
  /** Mon sprites: bottom-centre anchor. */
  enemyMon: { x: 176, y: 68 },
  playerMon: { x: 64, y: 112 },
  /** Platforms: top-left. */
  enemyPlatform: { x: 112, y: 50 },
  playerPlatform: { x: -8, y: 96 },
  /** HUD plates: top-left. */
  enemyHud: { x: 8, y: 10 },
  playerHud: { x: 128, y: 70 },
  /** Trainer sprites (bottom-centre). */
  enemyTrainer: { x: 178, y: 66 },
  playerTrainer: { x: 60, y: 112 },
}

export const DEPTH = {
  bg: 0,
  platform: 10,
  enemyMon: 20,
  enemyTrainer: 22,
  playerMon: 30,
  playerTrainer: 32,
  fx: 50,
  hud: 60,
  fxTop: 70,
  frame: 990,
  box: 1000,
  menu: 1100,
  window: 1200,
  screen: 2000,
  fader: 9000,
}

/** All timings in ms (before `ms()`), tuned by eye against GBA captures. */
export const TIMING = {
  fadeIn: 220,
  /** Platforms + sprites sliding in from opposite sides. */
  slideIn: 1050,
  /** Wild mon brightening from its dark intro tint. */
  litUp: 260,
  hudSlide: 260,
  /** Auto-advancing battle chatter: hold after the line is fully typed. */
  textHold: 560,
  /** Shorter hold for lines that lead straight into an animation. */
  textHoldShort: 350,
  /** HP drain speed: ms per bar pixel (48 px bar). */
  hpMsPerPx: 20,
  hpMinMs: 260,
  /** EXP bar: ms for a full bar (scaled by the fraction gained). */
  expFullMs: 1150,
  expMinMs: 300,
  hitBlinks: 3,
  hitBlinkMs: 60,
  faintMs: 360,
  throwMs: 520,
  popMs: 220,
  shakeGapMs: 520,
  shakeMs: 360,
  trainerSlide: 420,
  fadeOut: 380,
  screenFade: 140,
}

/** Move type → effect colour (BATTLE_API suggested chip colours). */
export const TYPE_COLOR: Record<string, number> = {
  neutral: 0xf0ece0,
  myth: 0xf09848,
  logic: 0x48c8a0,
  tool: 0x48a0f0,
  speed: 0xf8d850,
  open: 0x88d058,
  vision: 0xc880e8,
  glitch: 0xe85080,
}

export const STATUS_TAG_COLOR: Record<string, number> = {
  rate_limited: 0xd8a018,
  context_rot: 0x9050b0,
  timed_out: 0x5878a8,
}
