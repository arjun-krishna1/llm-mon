# ART catalog — sprites, battle art, UI (ART-SPR)

Rebuild everything with one command (≈4 s, no network):

```
python3 tools/art/sprites/build.py            # assets + previews
python3 tools/art/sprites/build.py --no-preview
```

Sources: `tools/art/sprites/*.py` (chars, mons, battle, fx, ui, screens,
font, preview). Generated paintings used as *sources* live in
`tools/art/gen/raw/spr_*.png` (made once with `tools/art/gen/imagegen.py`;
the build only reads them). Everything except creature sprites is snapped to
`tools/art/palette.py`. Review sheets: `tools/art/sprites/preview/`.

All paths below are relative to `public/assets/game/`. Texture keys = path
without extension (matches `src/game/assets.ts`).

## Overworld characters — `sprites/chars/<id>.png`

48×96, 3 cols × 4 rows of 16×24 frames, row-major frame index = `row*3+col`.

| row | facing | frames (col 0,1,2) |
| --- | --- | --- |
| 0 | down | stand, step-A, step-B |
| 1 | up | stand, step-A, step-B |
| 2 | left | stand, step-A, step-B |
| 3 | right | stand, step-A, step-B |

- Walk cycle: stand → A → stand → B. Feet bottom (incl. outline) on y=21 of
  the stand frame (2px above the frame bottom); **step frames are baked 1px
  higher** (a built-in walking bob) — the engine should not add its own bob.
- Anchor: draw the frame with its bottom 16px on the tile (origin x=0.5,
  y=1 with the frame placed at tile bottom, or top-left at tileY-8).
- Side views are true profiles; right = mirrored left profile.
- Ids: `player` (dark tousled hair, orange hoodie, teal headphones round the
  neck, jeans, red sneakers), `mom` (brown hair, green top, white apron, yellow
  dress), `prof` (brown swept hair, glasses, lab coat over green shirt), `aide`
  (blond bowl cut, lab coat, blue shirt), `boy` (green cap, yellow tee,
  shorts), `girl` (blond pigtails, pink top, violet skirt), `man`
  (short hair, green shirt), `woman` (long dark hair, red dress), `elder`
  (bald, grey tufts + moustache, brown cardigan), `techie` (green beanie,
  glasses, dark hoodie), `nurse` (Model Center: teal uniform, white cap, bun),
  `clerk` (Token Mart: violet apron, ponytail), `trainer_m` (spiky blond, red
  tee, shorts), `trainer_f` (brown bob, red beret, blue top, white skirt).
- Faces (down view): 2×2 eyes with a white glint (top-left) over an iris
  shade, pink cheeks, a 2px mouth; side view: 2px eye + glint, mouth, cheek.
  Hair is auto-shaded in 3 tones (light rim top-left, shadow right/bottom).
- `hallucihound` — same 48×96 layout, a quadruped for the Route 101 rescue
  cutscene. Reads as a near-black glitch hound: dark slate fur
  (`#20222e`/`#363a4c`), magenta glitch streaks (`#e06c98`/`#a83c6c`),
  red/magenta eye glow, only a small cream muzzle/brow accent, white fangs and
  claws. Fills the 16px width; side rows are a dog in profile (raised head,
  4 legs, near legs lighter); steps A/B are a diagonal-pair prowl. 2–3 stray
  magenta glitch pixels change every frame, so it flickers while prowling
  (and when cycling stand/A/B in place). Same 1px bob on step frames.
- `rival` (key `chars/rival`, 48×96, standard layout) — Dana, the
  neighbour kid / rival: short choppy auburn hair poking out of a white
  sports visor with a teal brim, teal zip-up jacket with a white zipper,
  dark leggings, white sneakers.
- `player_run` (key `chars/player_run`, 48×96, same layout/rows/cols as
  `player`): running variant — upper body leans 1px forward on side views,
  wider stride (feet up to ±5px), feet lifted higher on front/back views,
  arms pumping. Col 0 = passing pose, cols 1/2 = full strides; cycle
  0→1→0→2 at the run speed. Same baked 1px bob on cols 1/2.

## Creatures — `sprites/mons/`

| file | size | notes |
| --- | --- | --- |
| `<id>_front.png` | 64×64 | enemy view, faces left, bottom-anchored (feet ≈ y=61), centred |
| `<id>_back.png` | 64×64 | player's creature from behind, enlarged ~1.3×; bottom ~18% cut off by the frame edge (as GBA) |
| `<id>_icon.png` | 32×16 | 2 frames of 16×16 (frame 1 = 1px bob). NB plan said 32×32; the lead brief and `assets.ts` (`auto2`) use 32×16 |

Ids: `claude_fable`, `gpt_5_5`, `glm`, `hallucihound`, `gemma_4`,
`gpt_5_4_mini`, `mistral_medium`, `gemini_flash`, `claude_haiku`,
`claude_opus`, `command_a`, `deepseek_flash`, `deepseek_pro`, `glm_max`,
`gpt_5_5_xhigh`, `kimi`.

- ≤15 colours + dark outline each; checkerboard artefacts flood-removed; thin
  aura wisps removed by morphological opening (mistral, haiku, kimi, hallucihound); specks
  and orphan pixels dropped; eye colours re-painted after quantisation
  (claude_fable, glm).
- Starters were re-generated on magenta from their card art (no card cut-out
  halo). True back views were generated for every species except
  `hallucihound` (enemy-only; its back is a mirrored, enlarged front).
- Suggested placement on 240×160: enemy front top-left at (144,4) over
  `platform_enemy` at (112,50); player back top-left at (32,48) over
  `platform_player` at (-8,96).

## FX — `sprites/fx/`

| file | size | layout |
| --- | --- | --- |
| `emote_exclaim.png` | 16×16 | speech bubble with red "!"; draw above the head (frame y-16) |
| `grass_rustle.png` | 64×16 | 4 frames: blades part, leaf bits fly, settle |
| `grass_overlay.png` | 16×16 | front tall-grass blades on rows 9–15; draw over a character's feet (depth above character). Auto-uses ART-EXT's `tall_grass*` tile lower half once `tilesets/exterior.catalog.json` exists (rebuild) |
| `item_ball.png` | 16×16 | ground item: small Prompt Orb + shadow |
| `shadow.png` | 16×8 | translucent ellipse (palette SHADOW), for jumps/ledges |
| `orb_throw.png` | 64×16 | Prompt Orb frames: 0 closed, 1 tilt-left, 2 tilt-right, 3 open (lid up, glow) |
| `orb_big.png` | 128×32 | the same Prompt Orb at 32×32, 4 frames: 0 closed, 1 tilt-left, 2 tilt-right, 3 open (lid hinged back, glow). For the starter-select satchel pockets and the catch close-up. Orb body fills ~29px; centre (15.5, 15.5) |
| `emote_question.png` | 16×16 | same bubble as `emote_exclaim`, blue "?" |
| `emote_heart.png` | 16×16 | same bubble, pink heart |
| `emote_dots.png` | 16×16 | same bubble, "…" (three navy dots) |
| `emote_music.png` | 16×16 | same bubble, violet music note |
| `truck.png` | **48×40** exactly | "Mythos Movers" truck (3/4 view facing left/down, cream cargo box with an orange diamond + "MM" livery). One clean sprite: a single connected opaque region, alpha strictly 0/255, opaque bbox x 2–45, y 0–39 (wheels touch the bottom row). Safe to tween as one image (drive away to the left); also usable split into 16px tiles |
| `satchel.png` | 16×16 | professor's satchel on the ground |

Prompt Orb design: faceted crystal sphere, amber upper dome, teal lower dome,
steel equator ring with a teal prompt-gem. Original — not a red/white ball.

## Battle — `sprites/battle/`

| file | size | notes |
| --- | --- | --- |
| `bg_grass.png` | 240×112 | banded sky + clouds, tree line, meadow; draw at (0,0); message box covers y≥112 |
| `platform_enemy.png` | 128×32 | grass pad |
| `platform_player.png` | 128×32 | grass pad |
| `trainer_back.png` | 256×64 | 4 frames 64×64: 0 idle, 1 wind-up (orb in hand), 2 release, 3 follow-through. Matches the overworld player: dark navy hair, orange hoodie, teal headphones round the neck |
| `prof_front.png` | 64×96 | intro portrait, full body, bottom-anchored |
| `trainer_m_front.png`, `trainer_f_front.png` | 64×64 | opponent trainer fronts, full body |
| `rival_front.png` | 64×64 | rival Dana, arms crossed, smirk; same visor/jacket as `chars/rival` |

`prof_front`, `trainer_m_front`, `trainer_f_front` and `rival_front` are reduced with the
same pipeline as the creature sprites, so they share their pixel density:
sub-pixel linework softened before a box downscale, ≤16 colours, specks
removed, a solid 1px `#28222e` outline, skin forced onto the SKIN ramp, then
snapped to the master palette.

## UI — `ui/`

### 9-slice frames (24×24, 8px corners, centre 8×8 is flat paper `#fcfaf0`)

| file | look | border thickness (inset) | text inset |
| --- | --- | --- | --- |
| `frame_dialog.png` | navy `#283048` line, light `#a0b8e0` bevel, mid `#40507c` band, navy line; radius 3 | 4px | ≥8px |
| `frame_menu.png` | navy, `#6880b8`, navy; radius 2 | 3px | ≥7px |
| `frame_battle.png` | navy, orange `#fcb060` / `#f07830` band, navy; radius 3 | 4px | ≥8px |

All three have a 1px `#f0ead4` inner shadow on the top/left inside edge.
Dialog box suggestion: 240×48 at y=112, text lines at (12,12) and (12,28).

### HUD plates

Coordinates are pixels relative to the plate's top-left. Baked into the art:
"LV" label, "HP" label + empty bar well, "EXP" label + empty well. The engine
draws name, level number, HP fill, HP numbers, EXP fill.

Both plates are sized so the longest roster name ("DeepSeek Flash", 77 px in
`font_dialog`) plus "Lv100" fit with ≥ 3 px to spare at normal letter spacing.
Text anchors are PxText top-lefts (font_dialog caps occupy rows +1..+9, descenders +10..+11).

`hud_enemy.png` 124×32 (screen position (8,10)):

| element | position |
| --- | --- |
| name text top-left | (9, 2); may extend to x=88 |
| "LV" (baked) | (92, 6), 3×5 |
| level number top-left | (100, 2), up to 3 digits |
| HP fill rect | x=69, y=17, w=48, h=3 |
| status tag (engine-drawn) | (9, 16), 19×7 |

`hud_player.png` 124×44 (screen position (114,68)):

| element | position |
| --- | --- |
| name text top-left | (7, 1); may extend to x=84 |
| "LV" (baked) | (88, 5) |
| level number top-left | (96, 1) |
| HP fill rect | x=66, y=15, w=48, h=3 |
| HP numbers "cur/max" | own row: right-aligned to x=114, top y=19 (no padding spaces) |
| EXP fill rect | x=50, y=33, w=64, h=2 |
| status tag (engine-drawn) | (7, 15) |

HP / EXP bar colours (fill `round(w*frac)` px from the left; empty well is
`#383840`):

| state | rows 0–1 (light) | row 2 (dark) |
| --- | --- | --- |
| green (>50%) | `#60e070` | `#30a048` |
| yellow (20–50%) | `#f8d838` | `#c09018` |
| red (≤20%) | `#f85848` | `#b02830` |
| EXP (2 rows) | `#50b0f8` both rows (or `#50b0f8` / `#2868c0`) | — |

Text colour on paper: `#383840` with shadow `#c8c4b0` (+1,+1).

### Small UI

| file | size | notes |
| --- | --- | --- |
| `cursor.png` | 8×8 | ▶ selection cursor (dark outline, orange core) |
| `arrow_down.png` | 8×8 | ▼ advance arrow (bounce it 1px); also use as pointer over starter orbs |
| `orb_slots.png` | 64×8 | 8 cells of 8×8: 0 empty slot, 1 healthy, 2 status, 3 fainted, 4 healthy-glint, 5–7 healthy (spare glint frames) |
| `type_<id>.png` | 32×12 | chips for `neutral myth logic tool speed open vision glitch` (ids from `src/game/data/typechart.ts`) |

Type chip ramps: neutral = ROCK, myth = ROOF_ORANGE, logic = ROOF_TEAL, tool
= ROOF_BLUE, speed = CLOTH_YELLOW, open = CLOTH_GREEN, vision = ROOF_VIOLET,
glitch = CLOTH_PINK/CLOTH_RED.

### Screens

| file | size | notes |
| --- | --- | --- |
| `title_bg.png` | 240×160 | sunset, mythic fox-creature on a crag at right; leave top-centre for the logo; "PRESS START" reads well at y≈136 in cream `#fcf6e2` with dark shadow |
| `title_logo.png` | 160×64 | "LLMMON" (arched, amber→orange, dark + cream outline, teal gem in the O) over "MYTHOS" with diamond ornaments; place at (40,6) |
| `starter_select_bg.png` | 240×160 | open satchel on grass; three empty pockets. **Orb centres: (72,84), (120,84), (168,84)** — draw `fx/orb_big` frame 0 (32×32) centred there (top-left = centre − 16); dialog box covers y≥112 |

### PromptDex and Model Storage

All rects are `(x, y, w, h)` in screen pixels on the 240×160 image. They are
also the `DEX` / `STORAGE` dicts in `tools/art/sprites/screens.py`.

`ui/dex_bg.png` 240×160: dark slate device shell.

| area | rect | notes |
| --- | --- | --- |
| header strip (amber, teal lens LED left, 3 lights right) | (4, 4, 232, 14) | title text area (22, 7, 150, 8), white text with `#c04820` shadow |
| list panel (paper) | outer (6, 22, 116, 132) | inner (10, 26, 108, 124); rows have a 16px pitch with faint divider lines at y = 26+16k−1, giving 7 rows; a 16×16 icon at (10, 26+16k) and text at x=29, y=30+16k |
| display screen (glass + scanlines + floor ellipse) | outer (126, 22, 108, 84) | inner (130, 26, 100, 76); put the 64×64 front sprite at (148, 32); its feet land on the floor ellipse |
| info panel (paper) | outer (126, 110, 108, 44) | inner (130, 114, 100, 36): name, then a type chip at (194, 115), then 2 text lines |

`ui/storage_bg.png` 240×160: server-rack / terminal look. The empty slots
are already baked in.

| area | rect | notes |
| --- | --- | --- |
| box header (teal, ◀ ▶ baked at both ends) | (6, 6, 136, 20) | box name text area (24, 12, 100, 8) |
| grid panel | (6, 30, 136, 110) | **slot grid: 6 cols × 5 rows of 20×20, origin (14, 36), pitch 20**; slot (c, r) top-left = (14+20c, 36+20r); draw a 16×16 icon at +2,+2 |
| info bar | (6, 144, 136, 12) | one text line at (10, 147) |
| party header (amber) | (148, 6, 86, 20) | title text at (166, 12) |
| party column | (148, 30, 86, 126) | **6 slots, origin (152, 34), pitch 20 vertically**; slot i top-left = (152, 34+20i), icon at +2,+2, name at (176, 39+20i); faint underline at y=49+20i |

`ui/slot.png` 20×20: an empty recessed cell (the same one baked into the
grid). `ui/slot_sel.png` 20×20: the selected cell, an amber frame with a glow;
draw it over a slot at the same top-left.
