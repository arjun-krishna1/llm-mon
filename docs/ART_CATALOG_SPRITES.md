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
  cutscene: slate-black fur with magenta glitch streaks, cream mask, red
  eyes, white fangs/claws. Fills the full 16px width; side rows are a dog in
  profile (4 legs, near legs lighter), steps A/B are a diagonal-pair prowl
  with a flickering glitch tail; down/up show the masked face / rear with
  alternately lifted paws. Same 1px bob on step frames.

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
| `trainer_back.png` | 256×64 | 4 frames 64×64: 0 idle, 1 wind-up (orb in hand), 2 release, 3 follow-through |
| `prof_front.png` | 64×96 | intro portrait, full body, bottom-anchored |
| `trainer_m_front.png`, `trainer_f_front.png` | 64×64 | opponent trainer fronts, full body |

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

`hud_enemy.png` 104×32 (suggested screen position (8,10)):

| element | position |
| --- | --- |
| name text top-left | (8, 5) |
| "LV" (baked) | (70, 7), 3×5 |
| level number top-left | (78, 5) |
| HP fill rect | x=46, y=17, w=48, h=3 |

`hud_player.png` 104×40 (suggested screen position (128,70)):

| element | position |
| --- | --- |
| name text top-left | (14, 4) |
| "LV" (baked) | (76, 6) |
| level number top-left | (84, 4) |
| HP fill rect | x=48, y=14, w=48, h=3 |
| HP numbers "cur/ max" | right-aligned to x=96, top y=20 (7px font) |
| EXP fill rect | x=34, y=30, w=62, h=2 |

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
