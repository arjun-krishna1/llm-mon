# ENGINE API

Reference for content authors (scripts, maps), the battle-UI author (UI kit,
input, scenes) and playtest tooling. Source of truth for the shared contracts
is `docs/VERTICAL_SLICE_PLAN.md` §4; this file documents how the engine
implements them.

```
src/main.ts                   boot: Phaser config, integer scaling, global clock, debug hooks
src/game/config.ts            constants (W/H/TILE, frame timings, colours, depths)
src/game/controls.ts          global input + fixed-step clock (60 Hz logic)
src/game/state.ts             GameState singleton + save/load
src/game/assets.ts            asset manifest, texture keys, missing-asset placeholders
src/game/adapters/monInfo.ts  the ONLY bridge to BATTLE-CORE (species/moves/items/trainers/encounters)
src/game/params.ts            URL flags (?debug ?seed ?fast ?new ?map)
src/game/rng.ts               seeded RNG (all engine randomness; BATTLE-CORE gets it as `{ next }`)
src/game/world/               TiledMap (map loader), Actor (grid character)
src/game/script/              registry, runner, ScriptApi
src/game/ui/                  PxText, Window, DialogBox, ListMenu, WidgetStack, Banner, draw helpers, screens/
src/game/scenes/              Boot, Title, Intro, Overworld, UI, Battle (stub → BATTLE-UI)
src/game/content/index.ts     CONTENT entry (engine wrote a tiny sample)
tools/font/build_font.py      bitmap fonts → public/assets/game/fonts/
tools/maps/testmap.py         public/assets/game/maps/_test.tmj
```

## 1. Running and debugging

`npm run dev`, then open:

| URL | what |
| --- | --- |
| `/` | title → New Game / Continue |
| `/?debug=1&map=_test` | straight into the engine test map (gives a Lv5 Claude Fable if the party is empty) |
| `/?debug=1&map=overworld&spawn=home_door` | any map + spawn name; or `&x=12&y=8` |
| `&seed=N` | seeds all RNG (engine + BATTLE-CORE via the adapter) |
| `&fast=1` | instant text, no fades/slides (automated playtests) |
| `&new=1` | ignore the save (Continue is hidden; the debug map boot starts fresh) |
| `?audiotest=1` | AUDIO's test harness (`src/game/audio/dev/audiotest`) |
| `?touch=1` / `?touch=0` | force the on-screen touch controls on / off (default: shown on coarse-pointer devices) |

`__llmmon.runScript(id)` runs a registered script (returns a Promise).

With `?debug=1`, `window.__llmmon` exposes:

```js
__llmmon.state                    // the GameState singleton (live)
__llmmon.info()                   // { scenes, map, x, y, facing, dialogOpen, dialogText, menuOpen, zone, busy, moving, npcs[] }
await __llmmon.warp('_test', 'start')     // or warp(map, x, y)
__llmmon.setFlag('has_run', true)         // also refreshes NPC visibility
__llmmon.giveMon('gemma_4', 5)            // returns the MonInstance
__llmmon.giveItem('patch', 3)
await __llmmon.battle(request)            // → BattleResult (full transition)
__llmmon.heal()
__llmmon.game                             // the Phaser.Game
```

`info().busy` is true while a script, warp, dialog or menu is running — wait
for `!busy && !moving` before sending the next input. Useful flags:
`debug_no_encounters` (no wild battles).

## 2. Scripts

### 2.1 Registering scripts (CONTENT contract)

`src/game/content/index.ts` is loaded by the engine through `import.meta.glob`,
so it must exist and must import every other content module. It:

1. registers scripts at import time, importing from `'../script/registry'`
   (NOT `'../script'`, which imports content and would create a cycle);
2. exports `content: ContentConfig`.

```ts
import { registerScript, type ContentConfig } from '../script/registry'
import type { ScriptApi } from '../script/api'
import './hayes_valley'   // more modules that call registerScript

export const content: ContentConfig = {
  startMap: 'overworld', startSpawn: 'arrival', startFacing: 'up',
  healPoint: { map: 'home_1f', spawn: 'bed' },   // white-out respawn for a new game
  introScript: 'intro',          // optional; default intro is built in
  newGameScript: 'arrival',      // runs once after the intro drops you on the map
  namePresets: ['Arjun', 'Maya', 'Kai', 'Noor'],
  startMoney: 3000,
  whiteOutScript: 'center.after_whiteout',  // optional line(s) after a white-out respawn (player faces up)
  endCard: { title: 'LLMMON MYTHOS', subtitle: 'Vertical Slice', continued: 'To be continued…',
    credits: ['DESIGN', 'Someone', '', 'THANK YOU FOR PLAYING'] }, // ALL-CAPS lines render as headings
}

registerScript('hv.old_man', async (s: ScriptApi) => {
  await s.say('Back in my day, context windows were\n2048 tokens. And we liked it!')
})
```

Maps reference scripts by id (`npc.script`, `sign.script`, `trigger.script`).
A script runs with the player locked; errors are caught and logged (they never
soft-lock). Scripts can `await` anything; everything below returns a Promise
unless noted.

### 2.2 ScriptApi reference (`s`)

Text and choices

| call | notes |
| --- | --- |
| `say(text, opts?)` | 2-line box, typewriter, ▼, A/B advance, hold A to speed up. `\n` line break, `\f` page break, auto word-wrap, long pages scroll up line by line. `{player}`, `{money}` and `opts.vars` substitution. `opts`: `{ speaker?, color?: 'default'|'blue'|'red'|'grey'|'accent', silent?, autoMs?, keepOpen? }`. `say(text, 'Mom')` = speaker shorthand (name plate). |
| `choice(prompt, options, opts?)` → index | prompt stays on screen, list in the bottom-right. B returns the last option (or `opts.cancelIndex`; `null` disables B). |
| `yesNo(prompt)` → boolean | |
| `chooseName(prompt, presets?)` → string | letter-grid naming screen (icon: player; presets via a "PICK A NAME FOR ME" row); sets `state.playerName` |
| `nameEntry({ title, initial?, max = 8, icon?, presets? })` → string | the same screen for anything else (nicknames). Empty input confirms `initial`. |
| `endCard()` | fade out, stop the overworld, show the end card (title, "To be continued…", play time, caught, credit roll from `content.endCard`), music `ending` if registered else `title`, then the title screen. The save is untouched — save first if wanted. |
| `banner(text)` | area-name banner |

World

| call | notes |
| --- | --- |
| `move(actor, path, opts?)` | `actor`: `'player'`, an npc id, or `'self'`. `path`: `'up 2, left, down 3'` (also `u/d/l/r`) or `Dir[]`. Steps chain with no idle frame. `opts.speed`: `'walk'` (default, 16 f/tile) `'run'` `'slow'`; `opts.collide: true` stops at obstacles (default: scripted moves ignore collision). Run several in parallel with `Promise.all`. |
| `face(actor, dirOrActor)` (sync) | `face('self', 'player')`, `face('player', 'up')` |
| `emote(actor, kind)` | `'exclaim'` (plays `exclaim` sfx) `'question' 'heart' 'dots' 'note'` |
| `pos(actor)` (sync) | `{ x, y, facing }` |
| `spawn({ id, sprite, x, y, facing?, movement?, script?, text? })` (sync) | runtime NPC |
| `despawn(id)`, `hide(id)`, `show(id)`, `setSprite(id, sprite)` (sync) | |
| `spawnProp(id, textureKey, x, y, opts?)` (sync) | static world sprite; `(x, y)` = top-left tile of its collision footprint, image sits on the footprint's bottom-left. `opts`: `{ frame, solid = true, depth: 'y' (sorted with characters, default) \| 'ground' \| 'over', w, h (footprint tiles; default image width × 1 row, 2 rows if ≥ 32px tall), offsetX, offsetY, script, text }` |
| `moveProp(id, path \| {x, y}, durationMs = 1000, ease = 'Sine.InOut')` | slide along `'left 12'` / `Dir[]` or to a tile; collision footprint follows it (can leave the map) |
| `despawnProp(id)`, `hideProp(id)`, `showProp(id)` (sync), `propPos(id)` | |
| `warp(map, spawnOrXY, facing?, sfx?)` | fade out → load → fade in |
| `cameraPan(dxTiles, dyTiles, ms?)`, `cameraReset(ms?)` | offset from the player-follow position |
| `fadeOut(ms?)`, `fadeIn(ms?)`, `flash(color?, ms?)`, `shake(ms?, px?)`, `wait(ms)` | `?fast=1` zeroes fades |
| `lock()` / `unlock()` (sync) | extra lock that outlives the script (rarely needed) |

State, items, mons

| call | notes |
| --- | --- |
| `flag(k)` → boolean, `getFlag(k)`, `setFlag(k, v = true)`, `clearFlag(k)` (sync) | |
| `giveItem(id, n = 1, { silent?, verb = 'received' })` | "{player} received a Patch!" / "an …" / "5 Prompt Orbs" / "the PromptDex" (key items and plural-looking names like "Fast Tokens" take *the*). Jingle: `item_get`, or `key_item_get` for key items. Ground items use the verb *found*. |
| `takeItem(id, n)` / `hasItem(id, n)` (sync) / `itemName(id)` | |
| `giveMon(speciesId, level, { nickname?, silent? })` → MonInstance | party, or box when full |
| `healParty({ silent? })` | `heal` jingle + short wait |
| `money` / `addMoney(n)` (sync) | |
| `setHealPoint(map, spawn)` (sync) | white-out respawn point |
| `speciesName(id)` (sync) | |
| `state` | the raw GameState |

Battles, audio, shops

| call | notes |
| --- | --- |
| `startBattle(request)` → BattleResult | flash + blinds transition, launches `Battle`, restores map music, fades back in. White-out on `lose` unless `request.safety`. |
| `trainerBattle(trainerId, extra?)` → BattleResult | from BATTLE-CORE `trainerBattleRequest`; on win sets flag `trainer_<id>_defeated` |
| `wildBattle(speciesId, level, extra?)` | |
| `tutorialBattle(level = 2)` | the rescue HalluciHound fight (can't run, can't lose) |
| `whiteOut()` | fade, halve money, heal, respawn at heal point facing up, run `onEnter`, then `content.whiteOutScript` (or a built-in line); sets `just_whited_out` |
| `playMusic(id, fadeMs?)`, `stopMusic(fadeMs?)`, `resumeMapMusic()`, `sfx(id)` (sync) | ids in plan §4.7 |
| `shop(itemIds, greeting?)` | BUY / SELL / SEE YA with money window, quantity picker, confirmation |
| `run(scriptId)` | run another script inline with the same `self`/`ctx` |
| `self`, `ctx` | npc id for npc scripts; `ctx.trigger` / `ctx.sign` = the map object |
| `stage` | Intro scene only: `spotlight(on)`, `showProf()`, `hideProf()`, `showMon(id)`, `hideMon()`, `showPlayer()`, `hidePlayer()` |

Examples

```ts
// Model Center nurse
registerScript('center.nurse', async (s) => {
  await s.say('Welcome to the Model Center!\nWe restore tired LLMMON to full health.')
  if (!(await s.yesNo('Shall we patch up your team?'))) return s.say('We hope to see you again!')
  await s.say('Okay, I’ll take your LLMMON for a few seconds.')
  await s.healParty()
  s.setHealPoint('center', 'counter')
  await s.say('Thank you for waiting! Your LLMMON are fighting fit.')
})

// Cutscene: Mom walks the player inside
registerScript('arrival', async (s) => {
  await s.fadeIn()
  await s.say('{player}! We’re finally here!', 'Mom')
  await Promise.all([s.move('mom', 'up 2'), s.move('player', 'up 2')])
  await s.warp('home_1f', 'door', 'up')
})

// Trigger with a one-time flag (also settable on the map with `once`)
registerScript('route.rescue', async (s) => {
  s.lock()
  await s.emote('player', 'exclaim')
  await s.cameraPan(0, -4, 700)
  await s.say('H-help! Grab a LLMMON from my satchel!', 'Prof.')
  const r = await s.tutorialBattle()
  s.setFlag('rescued_prof')
  await s.cameraReset()
  s.unlock()
})
```

## 3. Maps (`public/assets/game/maps/<id>.tmj`)

Orthogonal Tiled JSON, 16px, **embedded** tilesets (external `.tsj` sources
are skipped with a warning), finite, array/CSV/base64-uncompressed data.
Several tilesets per map are fine (`_test` embeds exterior + interior).
Tileset `image` paths are resolved relative to the map file
(`../tilesets/exterior.png`).

Layers: tile layers draw in file order. Layers whose name starts with `over`
(case-insensitive) draw above characters; all others below. Group layers are
flattened. Any `objectgroup` is read (convention: one called `objects`).

Map properties: `name` (banner / save window), `music`, `indoor` (bool: no
banner, no running, door auto-step off, exits play `exit`), `encounters`
(fallback table when no zone has one), `onEnter` (script id run every time the
map is entered — boot/continue, warps, white-out — after the fade-in and the
door step-out, before the player regains control; on a new game it runs
before `content.newGameScript`).

Tile properties (merged across all layers at a cell):

| prop | effect |
| --- | --- |
| `solid` | blocks |
| `water` | blocks (no surfing yet) |
| `counter` | blocks; A on it talks to the NPC one tile beyond |
| `grass` | tall grass: rustle fx + `grass` sfx on entry, feet overlay, encounter roll per step |
| `ledge: "down"/"left"/"right"` | the ledge tile is blocked except when walking in that direction, which hops 2 tiles (over it) with an arc + `ledge` sfx |
| `door` | outdoors, walking into a door tile that has a warp plays `door`, a procedural door-open animation (dark opening grows over ~8 frames), the player steps into the doorway, then the fade. Arriving on an outdoor door tile: the doorway starts open, the player steps out one tile (in the arrival facing; a door spawn without `facing` faces down), the door closes behind. Indoors (`indoor` maps) door tiles are exit mats: plain warp + `exit` sfx. |
| `animation` | Tiled tile animation, played per tile |

Objects (`type`, or `class` in Tiled ≥1.9; tile coords = rect top-left, size ≥1 tile):

| type | properties |
| --- | --- |
| `spawn` | `name` (object name), optional `facing` |
| `warp` | `toMap`, `toSpawn`, optional `facing`, `sfx` (`door`/`stairs`/`exit`; default by context). Fires when the player *steps onto* it (not on arrival). Placed on a solid tile it still lets the player in. |
| `npc` | `id`, `sprite` (chars id), `facing`, `movement` (`static`/`look`/`wander`), `radius` (wander, default 2), `script` or `text`, `hideIfFlag`, `showIfFlag`, `noFace` (don't turn to the player). Trainers: `trainer` (BATTLE-CORE trainer id), `sight` (tiles), optional `seeText`, `afterText`, `defeatedFlag` (default `trainer_<trainer>_defeated`), `sightScript` (replaces the default walk-up flow's dialogue + battle) |
| `sign` | `text` (`\n`, `\f` allowed literally) or `script`. Read with A while facing it **from below (facing up)**; set `anySide: true` to allow every side. |
| `trigger` | rect; `script`; `once` (flag name, set when it fires), `ifFlag`, `unlessFlag` |
| `item` | `itemId`, `count`, `flag` (default `item_<map>_<objId>`), `hidden: true` (invisible, walkable, A while facing) |
| `zone` | rect; `name` (banner), `music`, `encounters` (table id, e.g. `route_101`). Smallest containing zone wins. |
| `prop` | static sprite (e.g. the moving truck, the satchel). Rect = collision footprint (a point/1-tile object: footprint from the image size as in `spawnProp`). `id`, `sprite` (texture key, e.g. `fx/truck`), `frame`, `solid` (default **true**), `depth` (`y`/`ground`/`over`), `offsetX`/`offsetY` (px), `hideIfFlag`, `showIfFlag`, `script` or `text` (A while facing any footprint tile). Scripts can then `moveProp`/`despawnProp` it by `id`. |

Step order after each player step: warp → triggers → zone (banner/music) →
trainer sight → Firewall countdown → encounter roll. Sight is only checked while
the player stands on a tile and nothing else is running (one sighting at a time);
regression: `node tools/playtest/trainer_sight.cjs`. NPC talk / trainer / item
/ sign interactions happen on A. NPC visibility flags are re-evaluated after
every script.

Trainer flow (no `sightScript`): `encounter_trainer` music, `!` emote, the
trainer walks up (re-measured each step; stops on the tile adjacent to the
player), player turns, `seeText` (default: BATTLE-CORE `preBattle`
lines, one page each), `trainerBattle`. Talking to a defeated trainer shows
`afterText` (default: `postBattle`). An npc `script` on a trainer replaces the
whole flow; call `s.trainerBattle(id)` yourself.

Regenerate the engine test map with `python3 tools/maps/testmap.py`. Its
scripts (`test.*`) live in `src/game/script/testScripts.ts` (engine-owned), so
it works regardless of CONTENT. It covers props (truck: A to drive it away;
satchel) and an `onEnter` hook (counts entries in flag `test_enter_count`).

## 4. Movement and feel (fixed values, `config.ts`)

60 Hz fixed-step logic (`controls.step()` runs from Phaser's PRE_STEP and
decides how many logic ticks each render frame gets; every scene runs its
logic inside `controls.each(...)`). Walk = 16 frames/tile (1 px/frame), run =
8 (B held, flag `has_run`, not indoors). While running the player uses
`chars/player_run` (same layout; cycle 0→1→0→2), with a small dust puff every
other step off-grass; any other actor (or a missing run sheet) holds the stride
frame for ¾ of the tile with a 1px bob. Tall grass covers only the bottom 6px of a
character (the tile the feet are in); the rustle plays beneath characters. Tap a new direction while standing:
turn only; keep holding ≥ 6 frames: walk. Holding a direction across tiles
chains steps with no idle frame; changing direction while walking is instant.
Walls: in-place walk cycle + `bump` sfx every 16 frames. Walk cycle stand → A →
stand → B (foot frame for the first half of each tile). Camera keeps the
player's tile at screen (112, 64), clamped to map bounds; maps smaller than
the screen are centred.

Depths: tile layers 0..n, shadows 50, characters 100 + feet y, `over` layers
10000+, fx 20000. UI scene above, Battle scene above that.

## 5a. Input devices, scaling, options

- **Keyboard**, **touch** and **gamepad** all go through `controls.pressCode(code)` /
  `releaseCode(code)` (`KeyboardEvent.code`, `V:<button>` for touch, `G:<button>` for pads).
- **Touch** (`src/game/touch.ts`): DOM D-pad, A, B, START outside the canvas, in the UI frame
  colours. Landscape: D-pad left / A-B right of the canvas; portrait: canvas on top, controls
  below (handheld). Multi-touch (D-pad + B to run), sliding between D-pad directions.
- **Gamepad** (standard mapping, polled each frame): d-pad / left stick, A = button 0,
  B = 1 or 2, START = 9 or 8.
- **Scaling**: the largest whole number of *device* pixels per game pixel that fits
  (desktop: integer CSS scale; a phone at dpr 3 gets e.g. 4 device px = 320 CSS px wide),
  after reserving the touch-control area. Canvas placed on whole device pixels.
- **iframes**: any pointerdown focuses the window + canvas (keyboard works in sandboxed previews)
  and unlocks audio.
- **Options** (`src/game/options.ts`, localStorage `llmmon_mythos_options_v1`, separate from the
  save, applied at boot): `textSpeed` slow/mid/fast (4/2/1 frames per char; hold A still speeds
  up), `music` / `sfx` 0–10 → `audio.setVolume`. Screen: `OptionsScreen`, reachable from the title
  menu and the start menu (`ui.openOptions()`).

## 5b. Start menu entries (extension point)

`src/game/ui/startMenu.ts` → `START_MENU_ENTRIES`. Add one object (or call
`registerStartMenuEntry` from an imported module):

```ts
{ id: 'dex', label: () => 'PROMPTDEX', order: 5, when: () => state.flag('got_dex'),
  screen: (ui) => new PromptDexScreen(ui, ui.stack).run() }
```

`screen` entries open full-screen with fades and come back to the menu; `action` entries run a
flow and close the menu. Built-in orders: party 10, bag 30, card 40, save 50, options 60, exit 99.

## 5. UI kit (for BATTLE-UI and screens)

All UI is bitmap text + 9-slice windows at 1×. Everything below can be used
in any scene (e.g. BattleScene) — it doesn't need the UI scene.

### Input

```ts
import { controls } from '../controls'
update() {
  controls.each(() => this.stack.update())   // run logic per 60 Hz tick
}
controls.justPressed('A')   // A, B, START, up/down/left/right; edges only on the first sub-tick
controls.isDown('B'); controls.heldFrames('A'); controls.repeat('down')  // menu key-repeat
controls.dir()              // held direction (latest wins) or null
controls.consume('A')       // stop later widgets/scenes in this frame acting on it
```

Keys: arrows/WASD, Z/Space/Enter = A, X/Shift/Backspace = B, Enter/Esc =
START. Phaser's own keyboard plugin is disabled; use `controls`.

### Fonts and text

- `font_dialog`: variable-width mixed case, cap height 9, line height 16.
  Glyphs: A–Z a–z 0–9 `. , ! ? : ; - + = / ( ) ' " ’ “ ” × … é $ % & # * _ ~ < > ▶ ▼ ▲ ♥ ♪`.
- `font_mini`: 3×5 caps + digits (+ `v`, `/ : - + . % ! ? ' ×`) for HUD numbers
  (`Lv5`, `HP 23/45`).
- Glyphs are white; colour = tint. Shadow is a separate tinted copy.
- The dialog font has kerning pairs (T/V/W/Y/F/P + lowercase, L + T/V/W/Y);
  `measure()` applies them.

```ts
import { PxText, measure, wrap, expand } from '../ui/text'
const t = new PxText(scene, x, y, 'Gemma 4', { font: 'font_dialog', color: 0x383840, shadowColor: 0xc8c4b0, shadow: 'full' })
t.setText('Lv5').setColorName('white').setDepth(10)   // presets: default white blue red grey accent
new PxText(scene, x, y, 'HP', { font: 'font_mini', shadow: 'drop' })
measure(scene, 'font_dialog', text)   // px width; wrap(scene, font, text, maxW) → lines
```

Shadow styles: `full` (right + down + diagonal; dialogue), `drop` (diagonal;
small HUD text), `none`.

### Windows, dialog, lists

```ts
import { WidgetStack } from '../ui/WidgetStack'
import { DialogBox } from '../ui/DialogBox'
import { ListMenu, choice } from '../ui/ListMenu'
import { Window } from '../ui/Window'

const stack = new WidgetStack()                 // focus stack: all widgets tick, only the top reads input
const box = new DialogBox(scene, stack, { frame: 'ui/frame_battle' })   // default: bottom 236x44 at (2,114)
await box.say('A wild Gemma 4 appeared!')
await box.say('What will GLM do?', { keepOpen: true })   // resolves when shown; stays up
const i = await new ListMenu(scene, stack, [{ label: 'FIGHT' }, { label: 'BAG' }, { label: 'LLMMON' }, { label: 'RUN' }],
  { x: 238, y: 158, anchor: 'br', cancelIndex: null }).result()
box.release()   // let a keepOpen box close (or box.close() immediately)
const yes = (await choice(scene, stack, ['YES', 'NO'])) === 0
new Window(scene, x, y, w, h, 'ui/frame_menu')   // 9-slice from 24x24 frames, 8px corners
```

`ListMenu` options: `x, y, anchor ('tl'|'tr'|'bl'|'br'), w, minW, rows`
(scrolls with ▲/▼), `initial, cancelIndex (B; null = disabled), onMove(i),
persist, startCancels, depth`. Items: `{ label, right?, disabled?, color? }`.

From any scene you can also use the global UI scene:
`getUI(game).say(...)`, `.ask(prompt, options)`, `.yesNo()`, `.openParty({ mode: 'choose', prompt })`
(→ index or -1), `.openBag({ mode: 'choose', filter })` (→ item id or null),
`.openSummary(i)`, `.fade(1|0, ms)`, `.flash()`. The UI scene renders below
`Battle`, so from the battle scene prefer constructing `PartyScreen` /
`BagScreen` (in `ui/screens/`) on your own stack — they take `(scene, stack, opts)`
and have `.run()`.

Naming screen from any scene (e.g. a nickname after a catch in BattleScene):
`await new NameEntryScreen(this, this.stack, { title: 'Nickname for Gemma 4?', initial: 'Gemma 4', max: 10, icon: 'mons/gemma_4_icon' }).run()`
(resolves with the text; `initial` if confirmed empty). Overworld/scripts: `getUI(game).nameEntry(opts)` / `s.nameEntry(opts)`.

Drawing helpers (`ui/draw.ts`): `drawHpBar(g, x, y, w, frac, h?)` (green →
yellow ≤50% → red ≤20%), `drawExpBar`, `drawPanel`, `drawStripes`.
Colours: `COLORS` in `config.ts` (from `tools/art/palette.py`).

## 6. Battle scene contract (engine side)

`OverworldScene.startBattle(req)`: marks enemy species seen, plays
`req.music` (default by kind) + `battle_start`, runs the transition (two white
flashes + horizontal blinds), pauses Overworld, then
`scene.launch('Battle', { request, onDone })`. The UI scene's fader is left
**black** underneath, so the battle scene should fade itself in. After
`onDone(result)` the engine stops `Battle` if still running, resumes the
overworld, sets `trainer_<id>_defeated` on a trainer win, and either fades in
with the map music or white-outs (`lose` without `safety`).

The **battle scene** owns: mutating party/bag, adding `result.prize` to
`state.money`, adding `result.caught` with `state.addMon(mon)` (party or box),
and `state.markSeen/markCaught` beyond what the engine does (as in
`docs/BATTLE_API.md`). The engine does not add prize money.

## 7. State (`src/game/state.ts`)

```ts
import { state } from '../state'
state.playerName, state.party, state.box, state.bag, state.money, state.flags,
state.seen, state.caught, state.map, state.x, state.y, state.facing, state.healPoint, state.playTimeMs
state.flag(k) / getFlag(k) / setFlag(k, v = true)   // setFlag(k, false) deletes
state.addItem(id, n) / removeItem(id, n) → bool / itemCount(id) / addMoney(n)
state.addMon(mon) → 'party' | 'box'   state.giveMon(speciesId, level)   state.healParty()
state.markSeen(id) / markCaught(id)   state.hasUsableMon()
state.save() → bool   state.load() → bool   state.hasSave()   state.reset()   state.playTimeText()
```

Saves go to `localStorage['llmmon_mythos_save_v1']` as `SaveData`
(types.ts; engine added optional `box`). Position/facing are synced every
frame the player is idle. Engine flags: `has_run`, `trainer_<id>_defeated`,
`item_<map>_<objId>`, `repel_steps` (Firewall), `just_whited_out`,
`trainer_id`, `debug_no_encounters`. Play time counts wall-clock in every scene
except Title/Boot.

BATTLE-CORE data is reached only via `src/game/adapters/monInfo.ts`
(`speciesName`, `speciesInfo`, `monStats`, `monMaxHp`, `expProgress`,
`createMon`, `healMon`, `moveInfo`, `typeName`, `itemInfo`, `useFieldItem`,
`encounterRate`, `rollEncounter`, `wildRequest`, `tutorialRequest`,
`trainerRequest`, `trainerInfo`). It loads BATTLE-CORE through an eager
`import.meta.glob`, so the engine still builds if those files are missing.

## 8. Assets

Texture keys are the path under `public/assets/game/` without the extension,
minus the `sprites/` prefix: `chars/player` (frames 0–11 = row×3+col, rows
down/up/left/right), `fx/shadow`, `fx/grass_rustle` (0–3), `fx/emote_exclaim`
(+ generated `fx/emote_question|heart|dots|note`), `fx/orb_big` (frames 0–3,
32×32), `fx/truck`, `fx/satchel`, `chars/hallucihound` (NPC-usable sheet), `battle/bg_grass`,
`battle/trainer_back` (0–3), `mons/<id>_front|_back|_icon` (icon frames 0–1),
`ui/frame_dialog|menu|battle`, `ui/cursor`, `ui/arrow_down`, `ui/type_<type>` …
The manifest is `imageManifest()` in `src/game/assets.ts` (add new files
there). A missing file becomes a magenta placeholder of the contract size
(UI frames, cursor, arrow, shadow, grass overlay and item ball get palette
fallbacks); `isPlaceholder(key)` tells you. `ensureTexture(scene, key, w, h)`
does the same lazily for dynamic keys. Tilesets load per map; a missing
tileset image becomes a placeholder grid.

## 9. Adding a scene

1. `src/game/scenes/MyScene.ts`: `class MyScene extends Phaser.Scene { constructor() { super({ key: 'My' }) } … }`.
2. Add it to the `scene: [...]` list in `src/main.ts`. List order is draw
   order: Boot, Title, Intro, Overworld, UI, Battle — put overlays after `UI`.
3. In `update()`, run logic in `controls.each(() => …)` and read input only
   through `controls`.
4. Use `ms(n)` from `params.ts` for fade/tween durations so `?fast=1` works.
5. Start it with `this.scene.start('My', data)` or launch it over the
   overworld (`scene.launch` + `scene.pause('Overworld')`) and resume after.

## 10. Tools

- `python3 tools/font/build_font.py` → `public/assets/game/fonts/{dialog,mini}.{png,xml,json}` + 4× previews.
  Glyphs are pixel maps in the script (rows bottom-aligned to the baseline,
  `|` separates descender rows).
- `python3 tools/maps/testmap.py` → `_test.tmj` from the real exterior +
  interior catalogs (falls back to a generated `_placeholder` tileset).
