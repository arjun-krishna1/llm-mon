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
src/game/world/               TiledMap (map loader + connections), Actor (grid character), Puzzle (puzzle kit),
                              graph (graph-floor autodiff), cond (condition expressions), FieldSkills,
                              Atmosphere (weather + darkness), kitTextures (procedural kit sprites)
src/game/systems/             notebook, badges, skills, locations (town map), tamper (finale hooks)
src/game/script/              registry, runner, ScriptApi
src/game/ui/                  PxText, Window, DialogBox, ListMenu, WidgetStack, Banner, draw helpers, screens/
src/game/scenes/              Boot, Title, Intro, Overworld, UI, Battle (stub → BATTLE-UI)
src/game/content/index.ts     CONTENT entry (engine wrote a tiny sample)
tools/font/build_font.py      bitmap fonts → public/assets/game/fonts/
tools/maps/testmap.py         public/assets/game/maps/_test.tmj
tools/maps/kitmap.py          public/assets/game/maps/_kit.tmj + _kit_east.tmj (ENGINE-F kit, §11)
```

## 1. Running and debugging

`npm run dev`, then open:

| URL | what |
| --- | --- |
| `/` | title → New Game / Continue |
| `/?debug=1&map=_test` | straight into the engine test map (gives a Lv5 Claude Fable if the party is empty) |
| `/?debug=1&map=_kit` | the ENGINE-F kit: every full-game foundation (§11) |
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

More map properties (§11): `connections` / `north` `northOffset` … (seamless neighbours),
`weather`, `weatherIntensity`, `dark`, `lightRadius`, `raft`, `waterEncounters`,
`evalEncounters`, `puzzleReset` (`never` default, `enter` = fresh puzzle on every entry).

Objects (`type`, or `class` in Tiled ≥1.9; tile coords = rect top-left, size ≥1 tile):

| type | properties |
| --- | --- |
| `spawn` | `name` (object name), optional `facing` |
| `warp` | `toMap`, `toSpawn`, optional `facing`, `sfx` (`door`/`stairs`/`exit`; default by context). Fires when the player *steps onto* it (not on arrival). Placed on a solid tile it still lets the player in. |
| `npc` | `id`, `sprite` (chars id), `facing`, `movement` (`static`/`look`/`wander`), `radius` (wander, default 2), `script` or `text`, `hideIfFlag`, `showIfFlag`, `showWhen` / `hideWhen` (condition, §11.5), `evalOnly` (bool: shown only while the EVAL light is on/off), `evalText` / `evalScript` / `evalSprite` / `evalFacing` / `evalMovement` (used while the EVAL light is on, §11.9), `noFace` (don't turn to the player). Trainers: `trainer` (BATTLE-CORE trainer id), `sight` (tiles), optional `seeText`, `afterText`, `defeatedFlag` (default `trainer_<trainer>_defeated`), `sightScript` (replaces the default walk-up flow's dialogue + battle) |
| `sign` | `text` (`\n`, `\f` allowed literally) or `script`. Read with A while facing it **from below (facing up)**; set `anySide: true` to allow every side. |
| `trigger` | rect; `script`; `once` (flag name, set when it fires), `ifFlag`, `unlessFlag` |
| `item` | `itemId`, `count`, `flag` (default `item_<map>_<objId>`), `hidden: true` (invisible, walkable, A while facing) |
| `zone` | rect; `name` (banner), `music`, `encounters` (table id, e.g. `route_101`), `waterEncounters` (while rafting), `evalEncounters` / `evalWaterEncounters` (EVAL light on), `weather`, `weatherIntensity`, `dark`, `lightRadius`, `raft` (water here can be rafted with Normalize). Smallest containing zone wins. |
| puzzle kit | `switch`, `door`/`gate`, `block`, `boulder`, `floor`, `teleport`, `counter`, `timer`, `statue`, `key`, `beam`, `letter`, `gnode`, `wire`, `graph`, `reset`, `anchor`: §11.5 |
| `prop` | static sprite (e.g. the moving truck, the satchel). Rect = collision footprint (a point/1-tile object: footprint from the image size as in `spawnProp`). `id`, `sprite` (texture key, e.g. `fx/truck`), `frame`, `solid` (default **true**), `depth` (`y`/`ground`/`over`), `offsetX`/`offsetY` (px), `hideIfFlag`, `showIfFlag`, `script` or `text` (A while facing any footprint tile). Scripts can then `moveProp`/`despawnProp` it by `id`. |

Step order after each player step: map-edge crossing → Firewall countdown → warp →
triggers → puddle splash / raft dismount → puzzle kit (switches, keys, letters, counters,
timers; then forced moves: teleport, spinner, conveyor, ice) → zone (banner, music,
weather, darkness, visited town) → trainer sight → encounter roll (grass, or water while
rafting; a Sample pre-roll is used first). Sight is only checked while
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
{ id: 'dex', label: () => 'PROMPTDEX', order: 20, when: () => state.flag('got_dex'),
  screen: (ui) => new PromptDexScreen(ui, ui.stack).run() }   // (this one is built in)
```

`screen` entries open full-screen with fades and come back to the menu; `action` entries run a
flow and close the menu. Built-in orders: party 10, dex 20, bag 30, card 40, save 50, options 60, exit 99.

## 5c. PromptDex and Storage screens

**PromptDex** (`src/game/ui/screens/PromptDexScreen.ts`) — start-menu entry `PROMPTDEX`
(between LLMMON and BAG) once flag **`got_dex`** is set; or `new PromptDexScreen(scene, stack).run()`.
Read-only: uses `state.seen` / `state.caught` and BATTLE-CORE data via `monInfo`
(`dexOrder`, `speciesDex`, `speciesAreas`).

- List: every species in dex order, 7 rows, smooth scroll, ▲/▼ indicators; ↑/↓ move, ←/→ jump a
  page; cursor position is remembered between openings. Unseen = `----------`; seen = icon + grey
  name; caught = icon + name + orb mark. The dex number is the `NO.xxx` readout on the display.
- Display: front sprite if seen (unseen: `???`). Data panel: name, type chips; caught → the flavour
  rows (`dex.stats`, e.g. CONTEXT / LAB); seen only → "CATCH IT TO RECORD MORE DATA.".
  Header: `SEEN n  CAUGHT m`.
- A on a caught entry → data page (`DexDetailScreen`): sprite with idle bob, `audio.cry(id)`,
  category, chips, the two blurb lines, CONTEXT / LAB / AREA (encounter tables containing the
  species, "Route 101"; "Unknown" otherwise), base-stat bars. ←/→ (or ↑/↓) page through caught
  entries; A/B back. Unseen/seen entries answer A with `bump`.

**Model Storage** (`src/game/ui/screens/StorageScreen.ts`) — from a script: `await s.storage()`
(plays `pc_on`, fades in, … `pc_off` on close), or point any map npc/sign/prop `script` at the
built-in script id **`storage.open`**. Outside scripts: `openStorage(getUI(game))`.

- Box grid 6×5 (30 per box) + party column; hand cursor; info bar = hovered mon's name, level and
  type pills. Grid rows wrap through the box header; on the header ←/→ switch boxes (◀ ▶ shown
  only when more than one box is in use). Right of column 6 / left of column 1 = party column.
- A on a mon: box → WITHDRAW / MOVE / SUMMARY / CANCEL; party → DEPOSIT / SUMMARY / CANCEL.
  MOVE grabs the mon (A drops: swap with a mon, or onto an empty slot = end of the list; B cancels).
  SUMMARY reuses `SummaryScreen` (it now takes an optional mon list: `new SummaryScreen(scene,
  stack, index, mons = state.party)`). B closes without confirmation.
- Rules (refusals shown in a dialog box): can't deposit the last party member or the last
  conscious one; can't withdraw into a party of 6; 8 boxes max. **Mons are fully healed (HP,
  status, PP) when deposited or withdrawn** (classic PC behaviour).
- State: `state.box` stays a flat, compact `MonInstance[]`; box k = `box.slice(30k, 30k+30)`, so a
  deposit always appends (to the last box). Only `state.party` / `state.box` change; the normal
  save persists both. Helpers exported for tools/tests: `boxCount`, `boxPage`, `depositMon`,
  `withdrawMon`, `depositRefusal`, `withdrawRefusal`.

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
(`speciesName`, `speciesInfo`, `dexOrder`, `speciesDex`, `speciesAreas`, `typeShort`, `typeColor`, `monStats`, `monMaxHp`, `expProgress`,
`createMon`, `healMon`, `moveInfo`, `typeName`, `itemInfo`, `useFieldItem`,
`encounterRate`, `rollEncounter`, `wildRequest`, `tutorialRequest`,
`trainerRequest`, `trainerInfo`). It loads BATTLE-CORE through an eager
`import.meta.glob`, so the engine still builds if those files are missing.

## 8. Assets

Texture keys are the path under `public/assets/game/` without the extension,
minus the `sprites/` prefix: `chars/player` (frames 0–11 = row×3+col, rows
down/up/left/right), `fx/shadow`, `fx/grass_rustle` (0–3), `fx/emote_exclaim`
(+ `fx/emote_question|heart|dots|music` from ART, procedural fallbacks; `fx/emote_note` aliases `emote_music`), `chars/rival`, `battle/rival_front`, `ui/dex_bg`, `ui/storage_bg`, `ui/slot`, `ui/slot_sel`, `fx/orb_big` (frames 0–3,
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

## 11. Full-game foundations (ENGINE-F)

Everything below is demonstrated in the **kit map**: `/?debug=1&map=_kit` (built by
`python3 tools/maps/kitmap.py`; scripts `kit.*` in `src/game/script/kitScripts.ts`).
Regression: `node tools/playtest/kit.cjs [--no-build] [--only graph,skills]` plays it with
real key presses (60 checks, screenshots in `tools/playtest/out/kit/`).

| kit area | shows |
| --- | --- |
| Kit Plaza (start) | guide (ALL SKILLS / KEY ITEMS / TOWN MAP / RESET MAP), badge pedestal, notebook lectern, travel kiosk |
| Graph Floor | `gnode` + `wire` + `graph` (out = a·b + c, goal 0), gradient toggle sign, gate `when: g.solved` |
| Switch Hall | toggle / weight (+ pushable block) / momentary (latched gate) switches, reset pad |
| Statue Hall | floor key, statue holding a key, statues accepting keys, beams, gate |
| Floor Lab | ice + rocks, conveyor, spinner, one-way arrows, teleport pads, puddles |
| Letter Hall | `letter` tiles spelling C-A-T, SURPRISE budget counter in the HUD, gate |
| Timer Run | `timer` area with ranks, stopped by a momentary switch |
| Dark Room | zone `dark`, light radius 1, Dilate → 4, two hidden items |
| Kit Meadow | ledges (Backprop), tall grass (Sample), falling leaves |
| Embedding Yard | heavy A/B blocks (Embed: like attracts like), weight switch |
| Rough Water | `rough_water` (Normalize raft, water encounters), fog |
| Chasm | `gap` + `anchor`s (Chain Rule), two `stone` boulders (Merge → bridge) |
| Eval Lab | EVAL light switch, NPC + creature with EVAL variants, tamper terminal, rain |
| east edge | seamless connection to `_kit_east` (snow weather, footprints, ice) |

### 11.1 Notebook

Start-menu **NOTEBOOK** (shown once the player holds item `notebook` or has found any page).
A spiral notebook with tabs **BUILD** and **SAFETY** (←/→), the page list with found /
NOT YET FOUND rows, and the page view (title, ruled sentences, CREDIT / SOURCE in the mini
font). Pages are data; CONTENT registers them at import time:

```ts
import { registerNotebookPage } from '../systems/notebook'
registerNotebookPage({ id: 'micrograd', tab: 'build', order: 1, title: 'Gradients',
  lines: ['A network is a graph of tiny sums.', 'A gradient says which way to nudge.', 'Backprop sends blame back, node by node.'],
  credit: 'Rumelhart, Hinton & Williams 1986', source: 'micrograd (lecture 1)' })

registerScript('gym1.after', async (s) => {
  await s.unlockPage('micrograd')      // toast "NOTEBOOK: Gradients" + item_get jingle; false if already found
})
```

A page fits 6 ruled lines of the dialog font (~36 characters a line): three short
sentences. Overflow is cut and warned in the console. `&` and commas are shown as `+` and
dropped in the mini-font credit line. Saved as flag `nb_<id>` (`nb_read_<id>` once opened).
Also `s.hasPage(id)`, `s.page(id)`; `notebookPages(tab)`, `foundCount(tab)`.

### 11.2 Badges

```ts
await s.giveBadge('gradient', 'Rumelhart')   // flag badge_gradient + the badge-get scene
s.hasBadge('gradient'); s.badgeCount()
```

The scene dims the map, spins the badge in over turning rays, lands with a flash and
sparkles to the `key_item_get` fanfare, then "{player} received the Gradient Badge from
Rumelhart!" and "…lets your team use BACKPROP outside of battle." Ids (systems/badges.ts):
`gradient likelihood embedding normal chain wave attention merge`; icons
`ui/badge_<id>` (16×16) and `ui/badge_<id>_big` (32×32) from `tools/ui/badges.py`.
The trainer card (start menu → name) shows a badge strip; A flips to the **BADGE CASE**
(8 sockets, cursor, name, leader, town, field skill). `registerBadge(def)` renames/recolours.

### 11.3 Field skills

Unlocked by the badge flag (`badge_<id>`) or flag `skill_<skill>` (story/debug). Used with
**A at the object** (a "Use SKILL?" prompt; locked skills just describe the object), from
**FIELD** in the start menu (USE / SET TO SELECT), or with **SELECT** (C / Tab / pad 8): the
skill set as quick key (flag `quick_skill`), else whatever applies in front of the player.
Every use plays the GBA-style cut-in (lead LLMMON's front sprite + skill name, skill sfx;
`skill_<id>` sfx when AUDIO adds it, else a fallback).

| skill (badge) | how | map support |
| --- | --- | --- |
| BACKPROP (gradient) | walk into a one-way ledge from below: hop up it (rewind chevrons) | ledge tiles (`ledge`) |
| SAMPLE (likelihood) | in tall grass: a die rolls, the next encounter is pre-rolled and named; YES keeps it, NO rerolls once. One sample per entry into a grass zone | `zone.encounters` |
| EMBED (embedding) | heavy blocks can be pushed; A at a block slides it along its row/column until it touches the nearest block of the same `kind` ("like attracts like"); with no kin in line it is pulled one tile toward the player | `block` (`kind`, `heavy`, `glyph`) |
| NORMALIZE (normal) | A at rough water: ripple, raft, ride across any water; stepping ashore drops it; `waterEncounters` roll on water | `floor kind=rough_water`, or water tiles in a `raft: true` zone/map |
| CHAIN RULE (chain) | A at a gap with an `anchor` across: links shoot out one by one, zip over (≤ 7 gap tiles) | `floor kind=gap`, `anchor` |
| DILATE (wave) | in the dark: the light grows from `lightRadius` (1) to 4 tiles; hidden items in the light glint and can be picked up | zone/map `dark`, `lightRadius`, `item hidden` |
| ATTEND (attention) | Town Map in fly mode: visited towns with an arrival; lift-off beam, warp | `registerLocation` (§11.7) |
| MERGE (merge) | A at a boulder next to a same-kind boulder: they fuse into a bridge over the gap/water beside them, or a bigger block (`merge: block`), or run a script | `boulder` (`kind`, `merge`, `resultKind`, `bridgeLen`); `registerMergeRule(kind, rule)` |

From scripts: `s.skillUnlocked('embed')`, `await s.useSkill('dilate')`.

### 11.4 Conditions

Door `when`, beam `when`, teleport `when`, timer `stopWhen`, NPC/prop `showWhen` /
`hideWhen` use one small expression language (world/cond.ts): `& | ! ( )`, `and or not`,
comparisons `< <= > >= == !=`, numbers, and names: an object id (switch pressed, door open,
statue holding what it accepts, counter value, block present, key taken), `<graph>.out`,
`<graph>.solved`, `<graph>.<node>`, `<group>.word` / `<group>.len` (letters), `flag:x`,
`eval`, `carry:K`, `var:x` or a bare var name (`s.puzzle.setVar`). Examples:
`"sw1 & sw2"`, `"!lever"`, `"flag:badge_gradient | sw3"`, `"surprise <= 20"`, `"g.solved"`.

### 11.5 Puzzle kit (map objects)

Declared as Tiled objects; state is saved per map in `state.mapState[mapId]` (block
positions, switch states, keys, graph inputs, counters, words, timers, bridges) and survives
save/load and warps. `reset` pads / `s.puzzle.reset()` restore the map's start state
(Merge bridges stay unless `{ all: true }`). Map property `puzzleReset: enter` resets on
every entry. Every object accepts `id` (else the object name) and `sprite` (a texture key
replacing the procedural look).

| type | properties | behaviour |
| --- | --- | --- |
| `switch` | `mode`: `momentary` (default: player, NPC or block on it), `toggle` (flips each time it is stepped on), `weight` (blocks only) | signal = pressed |
| `door` / `gate` | rect; `when` (condition), `latch` (true, or a flag name: stays open once opened), `onOpen` (script) | solid while closed; bars slide down; never closes on the player |
| `block` | `kind` (a/b/c… or a colour name), `heavy` (needs Embed), `glyph` (letter on top), `fuse` + `merge: block` (Gym 8 letterpress: A fuses it with a same-kind neighbour without the skill; glyphs concatenate, "T"+"O" → "TO") | pushed by walking into it (one push per ~16 frames); slides on ice; falls into a `gap` and fills it |
| `boulder` | `kind` (default `stone`), `heavy` (default true), `merge`, `resultKind`, `bridgeLen` | Embed pushes; Merge fuses |
| `floor` | rect; `kind`: `ice`, `conveyor` (+`dir`), `oneway` (+`dir`: enter and leave only along it), `spinner` (+`dir`), `gap`, `rough_water`, `snow` (footprints), `puddle` (splash); `when` (condition: the floor exists only while it holds, e.g. Gym 2's zero-count pits `when: "!smoothing"`, re-sorted conveyors); `draw: false` = logic only (use your own tiles) | the same keys also work as tile properties |
| `teleport` | `to` (another object id or `"x,y"`), `when` | step on: flash, move (arriving does not re-teleport) |
| `counter` | rect = HUD area (1×1 or `area: map` = whole map); `label`, `start`, `max`, `style` (`budget` red over max, `goal` green at max, `plain`), `perStep`, `hud: false` | HUD chip "SURPRISE 3/12" while the player is in its area |
| `timer` | rect; `label`, `ranks` ("S,A,B" seconds: `"6,10,16"`), `stopWhen` | starts on entering the rect (once), stops when the condition holds: toast "TIME 0:05 RANK S", var `<id>.rank` |
| `statue` | `holds` (key it starts with), `accepts` ("Q" or "Q,K"), `label`, `text` | A: take / place / swap keys; signal = holds what it accepts |
| `key` | `keyId` | floor key token, picked up by walking on it (the player carries one key: HUD chip + icon over the head) |
| `beam` | `from`, `to` (object ids or `"x,y"`), `when`, `color` | flickering light line drawn while the condition holds |
| `letter` | rect; `text` (one glyph per tile, row-major), `group`, `counter` + `cost`, `script` | stepping on a glyph appends it to the group's word and fires a `letter` event (`{ glyph, prev, word }`); `script` runs with `s.ctx.letter` |
| `gnode`, `wire`, `graph` | §11.6 | graph floor |
| `reset` | — | step on: reset the map's puzzle |
| `anchor` | — | Chain Rule target |

Scripts get `s.puzzle` (the current map):

```ts
s.puzzle.value('sw1')                      // any condition name
s.puzzle.counter('surprise'); s.puzzle.addCounter('surprise', 2); s.puzzle.setCounter('surprise', 0)
s.puzzle.showCounter('budget', 'TOKENS', 40)   // HUD chip without a map object
s.puzzle.startTimer('run', { label: 'TIME', ranks: [20, 35, 60] }); s.puzzle.stopTimer('run')  // → { ms, rank }
s.puzzle.setVar('spelled', true)           // usable in conditions
s.puzzle.carry; s.puzzle.setCarry('Q')     // statue keys
s.puzzle.word('w'); s.puzzle.clearWord('w')
s.puzzle.graph('g')?.value('o'); s.puzzle.setInput('a', 3); s.puzzle.showGrad('g', true); s.puzzle.solved('g')
await s.puzzle.moveBlock('blk1', 'left', 2)
await s.puzzle.reset({ all: false })
const off = s.puzzle.on((e) => { if (e.type === 'letter') … })   // this map's events; call off() to stop
```

Events (`onPuzzleEvent(fn)` from `world/Puzzle.ts` for all maps): `switch {id,on}`,
`door {id,open}`, `block {id,x,y}`, `block_fill`, `key`, `statue {id,key,match}`,
`letter {id,group,glyph,prev,word}`, `teleport`, `timer {id,ms,rank}`, `graph_solved {id,value}`,
`merge {id,partner,result}`, `reset`.

### 11.6 Graph floor

```
gnode  id=a op=input value=2 label=a step=1 min=-9 max=9 graph=g   (input: stand on it, A, ↑/↓ nudges)
gnode  id=m op=mul graph=g          ops: input const add mul neg tanh relu pow2 out
gnode  id=o op=out graph=g          (out sums its inputs)
wire   from=a to=m [points="20,4;20,6"]   (route via tile points; default an L: horizontal then vertical)
graph  id=g target=0 onSolve=script solveFlag=flag showGrad=false gradMode=shown|hidden|quiz latch=true
```

Values are drawn on chips above each node (yellow > 0, blue < 0, OUT green when solved),
the op inside the plate, and (when shown) each node's gradient d(out)/d(node) in red below
it, from a tiny reverse-mode autodiff (`world/graph.ts`, `CompGraph`): forward in topological
order, then gradients accumulated backwards over every path (a value feeding two paths gets
the sum: Gym 1 room 3). Wires glow orange/blue by sign with a pulse flowing to the output.
Standing on an input and pressing A opens the nudge bar ("C = 4   OUT = -2 (GOAL 0)") with
live forward propagation. `gradMode: quiz` (Gym 5) hides gradients: A on a node asks for its
gradient from four choices; right answers reveal it. When the output hits `target` the graph
is solved (`<graph>.solved`, `graph_solved` event, `onSolve`, `solveFlag`).

### 11.7 World: connections, town map, travel

**Connections.** Map property `connections` (JSON) or flat properties:

```json
{ "north": { "map": "route_102", "offset": 0 }, "east": "soma_node" }
```

`offset` shifts the neighbour along the shared edge (tiles). Neighbours are drawn at the
edges (their tile layers and static puzzle floors), the camera scrolls into them, and
walking off the edge onto a walkable neighbour tile swaps maps with no fade (zone banner and
music follow; `onEnter` runs). Both maps should list each other. Single maps without
connections (the slice's `overworld`) work as before.

**Town map** (`TownMapScreen`): start menu **TOWN MAP** once the player has item
`town_map` (an engine fallback item until data defines it; same for `notebook`), or
`await s.townMap()`. A schematic of the regions drawn from the location table, routes,
rail/air/ferry links, visited towns filled, the player's location blinking.

```ts
import { registerLocation, registerLink } from '../systems/locations'
registerLocation({ ...location('menlo_park')!, map: 'menlo_park', spawn: 'center_door', facing: 'down' })
```

Entering a zone whose `name` matches a location's `zones` (or a map in its `maps`) sets
`visited_<id>` and `last_location`. Attend flies to visited towns that have a `map`.

**Travel cutscenes:**

```ts
await s.travelCutscene({ kind: 'plane', from: 'sfo', to: 'toronto' })            // arrives at the location's map/spawn
await s.travelCutscene({ kind: 'ferry', from: 'seattle', to: 'redmond', map: 'redmond_dock', spawn: 'pier' })
```

`train` (carriages over scrolling sleepers), `plane` (arc over clouds and sea), `ferry`
(bobbing over waves): a 3 s card "SFO ▶ TORONTO" with a progress dot; then the warp and fade-in.

### 11.8 Weather and darkness

Zone or map property `weather`: `snow`, `rain`, `fog`, `leaves` (`weatherIntensity` scales
particles; indoor maps never have weather). Pixel particles in screen space that drift
against camera motion; fog is two dithered layers. Snow leaves footprints that fade after
~4 s (also on `snow` floors/tiles); `puddle` floors/tiles splash. Looping ambience
`amb_<kind>` plays if AUDIO provides it. `dark: true` (zone or map) draws darkness with a
dithered round light around the player (`lightRadius`, default 1 tile; Dilate 4). Script
overrides: `s.setWeather('rain' | null)`, `s.setDark(true | null)`.

### 11.9 EVAL light and interface tampering

`state.evalLight` (flag `eval_light`; saved). Scripts: `s.evalLight`, `s.setEvalLight(on)`.
The HUD lamp (top-right, "EVAL", pulsing red when on) shows once flag `eval_lamp` is set or
the player holds `eval_suite`; FIELD then has an EVAL LIGHT toggle. While it is on, NPCs use
`evalText` / `evalScript` / `evalSprite` / `evalFacing` / `evalMovement`; `showWhen: eval`,
`hideWhen: eval`, `evalOnly` swap whole NPCs/creatures; zones can use `evalEncounters`.
Battle code reads `state.evalLight`.

`s.tamper` (systems/tamper.ts) is the finale's toolkit, usable from any scene:

```ts
s.tamper.set({ scenes: ['Battle', 'UI'], scramble: 0.3, relabel: { RUN: 'STAY', BAG: 'SURRENDER' } })
s.tamper.disable('run', 'bag')         // ListMenu entries / start-menu entries by id or label grey out
s.tamper.setFake('enemy_hp', 1)        // displays use tamper.shown('enemy_hp', trueFrac) → 1
s.tamper.setProbe(true)                // Probe: tampered text shows the truth in green; bars show truth + the fake as an outline
s.tamper.reset()
await s.meter({ id: 'enemy_hp', label: 'ENEMY HP', value: 0.28 })   // demo window; SELECT toggles the Probe
```

Battle UI: `drawTamperBar(g, x, y, w, 'enemy_hp', trueFrac)` (ui/TamperMeter.ts) draws the
shown value and, with the Probe on, the truth tick and the fake outline. Every `PxText` is
filtered (relabel → custom `filter` → scramble, re-glitching every 10 frames); list menus
size themselves to the relabelled text.

### 11.10 Quality of life

- **SELECT** quick key for field skills (§11.3).
- **Options**: TEXT SPEED, AUTO TEXT (pages advance after a reading pause; prompts still
  wait), RUNNING (HOLD: hold B to run / AUTO: run unless B is held; needs `has_run`), MUSIC,
  SOUND, CONTROLS (keyboard / gamepad / touch page).
- **Pause on blur**: losing focus or hiding the tab shows PAUSED, mutes audio and sleeps the
  game loop until a click or key (in-game scenes only; off under ?fast=1 / webdriver unless
  `?pausetest=1`).

### 11.11 Contracts and flags

`SaveData.mapState?: Record<mapId, Record<string, unknown>>` (optional; old saves load with
none). Flags: `badge_<id>`, `skill_<id>`, `quick_skill`, `nb_<id>`, `nb_read_<id>`,
`visited_<loc>`, `last_location`, `eval_light`, `eval_lamp`. Debug `info()` adds `weather`,
`dark`, `lightTiles`, `rafting`, `neighbours`, `evalLight`.
