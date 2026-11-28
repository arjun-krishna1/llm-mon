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
- **Construction (since the "more human" redo; built by
  `tools/art/sprites/people.py`):** each figure is about one tile wide, the
  size of an 8–9px head on an 11–12px body, seen from a 3/4 top-down angle.
  The top of the head is a large shaded hair mass. The face is only the lower
  3–4px strip, with two 1×2 dark eyes at x=6 and x=9 (a 2px gap; audit pass,
  see `docs/ART_AUDIT.md` — at the old x=5/x=10 dark hair swallowed them and
  some faces read as blank strips): no highlights, blush, nose or mouth on
  the front view. Eyes are re-stamped after the hair, so no hair style may
  cover them, and glasses are frames round the eyes, never lenses over them. Shoulders, separate 1px arms with hands, a torso with clothing
  detail, two legs with a gap, and shoes in their own colour are all drawn.
  There is a 1px dark outline and 3-tone shading lit from the top-left.
  Side views are profiles: one eye, a nose pixel, the near arm over the
  torso, and scissoring legs. Walk frames move the legs and swing the arms.
- **Heights:** kids span y≈2…21 (tufts and hats reach y=1), adults y≈1…21 (y=0 with tufts). The
  elder stands 1px lower, with his head pushed forward in profile. Feet outline
  is on y=21. The figure's opaque width is ≈12px (x 2–13).
- **Skin tones vary across the cast** (four ramps from `SKIN`/`SKIN_DEEP`).
  Identity cues are kept: player (dark tousled hair, orange hoodie with
  drawstrings, teal headphones round the neck, jeans, red sneakers), mom
  (shoulder-length brown hair, green top, white apron, yellow skirt), prof
  (swept brown hair, glasses, lab coat over green), aide (blond, lab coat),
  nurse (bun + white cap, teal dress), clerk (ponytail, violet apron),
  rival Dana (auburn, white visor with teal brim, teal zip jacket), and so on.
- **Engine notes:**
  - Heads are smaller now. Put the emote bubble with its bottom ≈1px above
    the head top: frame y −15 for kids, −16 for adults (it was −16 for the
    old chibi).
  - `fx/shadow.png` (16×8) still fits, but its ellipse is wider than the
    12px figure, so a 12–14px shadow would be tighter.
  - `fx/grass_overlay` (rows 9–15 of the tile) now covers shoes and shins,
    which is the intended look.
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
- **ART-C2 additions** (same construction, `people.py`, appended after the audited cast,
  which is unchanged): `yilong` (rival: messy dark hair swept to one side, open charcoal
  bomber over a black tee with a small white star patch, grey jeans, white sneakers; teen
  height like Dana), `leader_rumelhart` (grey-brown hair, open mustard cardigan over a white
  shirt, red arrow pin, brown slacks), `leader_shannon` (voluminous grey waves, white shirt,
  dark green waistcoat with brass buttons, red bow tie), `overfit_m` / `overfit_f` (Team
  Overfit: white track jacket with gold collar, zip, shoulder stripes and a gold bar-chart
  emblem; he has a gold headband and white track pants with a gold stripe, she has an auburn
  ponytail and white shorts over dark leggings), `overfit_admin` (swept blond, long white
  coat with gold epaulettes over black), `norm` (Director Norm: salt-and-pepper hair, light
  blue shirt with rolled sleeves, navy tie, gold lanyard with a white ID badge), and generic
  NPC bodies for the cameo / egg NPCs: `barista` (ponytail, white tee, brown apron), `vc`
  (blue shirt, grey fleece vest, khakis), `founder` (blond messy hair, black hoodie, jeans),
  `busker` (red flannel, acoustic guitar slung across the body), `commuter` (cream trench
  coat, bag strap), `guard` (navy uniform and cap, gold badge, belt).
- `proxy` (key `chars/proxy`, 48×96, standard layout; `tools/art/sprites/mascot.py`) —
  Proxy's mascot form for towns: a small round white-and-gold puffball (gold-tipped ears,
  gold forehead star, big blue eyes, pink cheeks, gold chart-arrow tail), matching
  `mons/proxy_mascot_front`. It HOPS instead of walking: col 0 = sitting (1px wider and
  lower), cols 1 and 2 = the same mid-hop frame 3px up — so stand→A→stand→B is a 2-frame
  hop. About 12px wide and 13px tall; bottom outline on y=21 like the people.
- `player_run` (key `chars/player_run`, 48×96, same layout/rows/cols as
  `player`): running variant — head and shoulders lean 1px forward on side
  views, stride 1.5× the walk (3px, not a split: fixed in the audit), feet lifted 2px on front/back views,
  arms pumping. Col 0 = passing pose, cols 1/2 = full strides; cycle
  0→1→0→2 at the run speed. Same baked 1px bob on cols 1/2.

## Creatures — `sprites/mons/`

| file | size | notes |
| --- | --- | --- |
| `<id>_front.png` | 64×64 | enemy view, faces left, bottom-anchored (feet ≈ y=61), centred |
| `<id>_back.png` | 64×64 | player's creature from behind, enlarged ~1.3×; bottom ~18% cut off by the frame edge (as GBA) |
| `<id>_icon.png` | 32×16 | 2 frames of 16×16 (frame 1 = 1px bob). NB plan said 32×32; the lead brief and `assets.ts` (`auto2`) use 32×16. Since ART-C2 every icon is a **head-and-shoulders crop** of the front painting (`tools/art/sprites/icons.py`, run by `build.py` after the creature modules): a square window over the top of the body centred on the head, reduced straight to 16×15 with `mons2.reduce_mode` and re-inked, so creatures read at 16px instead of becoming balls or 1px lines. Per-creature windows: `icons.WINDOW`; round creatures use the whole body (`icons.WHOLE`) |

Ids: `claude_fable`, `gpt_5_5`, `glm`, `hallucihound`, `gemma_4`,
`gpt_5_4_mini`, `mistral_medium`, `gemini_flash`, `claude_haiku`,
`claude_opus`, `command_a`, `deepseek_flash`, `deepseek_pro`, `glm_max`,
`gpt_5_5_xhigh`, `kimi`.

- ART-C2 creature fixes (see `docs/ART_AUDIT.md` item 4): `calm.py` filters for backs
  (`unstroke` + `calm` on the Proxy backs' white fur, `calm` on glove/softmax, `keep_main`
  drops residual's detached arc on the back), claude_sonnet's back regenerated with the black
  coat dominant, gelu regenerated in a compact pose. All are `TUNE` entries in `mons2.py`.
- `tools/art/sprites/polish.py` runs after `mons.py`/`mons2.py` in `build.py`
  and fills 1–3px transparent pinholes enclosed by a body (they showed the
  battle background through as bright specks); `dropout` is exempt (its holes
  are the design).
- Colour count: set 2 (`mons2.py`) is ≤15 colours + the dark outline. Set 1 (`mons.py`,
  the 16 sprites above) is **about 30 colours** (median cut to 15, then the re-inked outline
  is tinted per pixel and eye accents are repainted). ART-C2 tested a straight cut to 16
  colours side by side: the starters lost their eye colours (Fable's orange eyes went brown,
  GLM's green eyes went dull), so set 1 keeps its colours and **the stated limit for set 1
  is ≤32**. Old statement for reference:
- ≤15 colours + dark outline each; checkerboard artefacts flood-removed; thin
  aura wisps removed by morphological opening (mistral, haiku, kimi, hallucihound); specks
  and orphan pixels dropped; eye colours re-painted after quantisation
  (claude_fable, glm).
- Starters were re-generated on magenta from their card art (no card cut-out
  halo). True back views were generated for every species except
  `hallucihound` (enemy-only; its back is a mirrored, enlarged front).
- **Set 2 (ART-C, the full roster):** `tools/art/sprites/mons2.py`, run by
  `build.py` after `mons.py`. Sources `tools/art/gen/raw/mon_<id>_front.png` /
  `_back.png`; prompts (with the previous evolution stage as the design
  reference) live in `mons2.PROMPTS`. Same file contract. Reduction is
  `mons2.reduce_mode` (dominant colour per block with a contrast bonus for
  eyes/gems, k-means palette ≤15 colours, despeckle, re-inked outline), not
  the box average used for set 1. Proxy (`proxy_mascot`, `proxy_student`,
  `proxy_needle`, `proxy_ascendant`) is never the player's, so
  `proxy_ascendant` has a mirrored-front back. Gallery and status of every
  roster entry: `docs/ART_CREATURES.md`; review sheets
  `preview/creatures_gallery_3x.png` and `preview/battle_c_<line>_4x.png`.
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
| `player_front.png` | 64×96 | **new**: intro-stage portrait of the player (same person as `trainer_back` and `chars/player`), facing the viewer and waving; same scale as `prof_front` |
| `trainer_m_front.png`, `trainer_f_front.png` | 64×64 | opponent trainer fronts, full body |
| `rival_front.png` | 64×64 | rival Dana, arms crossed, smirk; same visor/jacket as `chars/rival` |

**ART-C2 portraits** (`tools/art/sprites/portraits.py`, all 64×64, full body, bottom-anchored,
same placement as `trainer_m_front`; frozen in `tools/art/sprites/pinned/` like the owner-approved
set, so rebuilds never change them):

| file | who |
| --- | --- |
| `yilong_front.png` | rival Yilong: smug, likeable teen founder; messy dark hair, open charcoal bomber with a small star-comet patch over a black tee, one hand in a pocket, two-finger wave. An original character, not a likeness |
| `rumelhart_front.png` (+ copy `leader_rumelhart_front.png`) | Gym 1 leader: patient ex-teacher, mustard cardigan, red downward-arrow pin, chalk in his raised hand |
| `shannon_front.png` (+ copy `leader_shannon_front.png`) | Gym 2 leader: playful tinkerer, green waistcoat, red bow tie, juggling red/blue/yellow balls |
| `overfit_grunt_m_front.png`, `overfit_grunt_f_front.png` | Team Overfit field agents: white-and-gold track jackets, gold bar-chart emblem; proud, friendly (thumbs-up / clipboard) |
| `overfit_admin_front.png` | Admin Goodhart: long white-and-gold coat, gold epaulettes, tablet with a rising line chart |
| `director_norm_front.png` | Director Norm: sincere middle-aged executive, rolled sleeves, navy tie, gold lanyard, welcoming open hand |

The leader portraits are homages: original designs that suggest the role, never the real
person's face. The engine's trainer data uses `rumelhart_front` / `shannon_front`; the
`leader_*` copies are the same image under the names in the ART-C2 brief.
How they are made: generated with 2–3 pinned portraits as references (6× nearest upscales in
`tools/art/gen/raw/refs/`), reduced with `mons2.reduce_mode` (dominant colour per block, ≤16
colours, solid `#28222e` outline), then the face is hand-placed (`portraits.paint_face`: 2×2
eyes, dark top row and a blue-grey lower pixel like the pinned set, brows, mouth) because the
generator's small eyes do not survive 64px. Review: `preview/c2_portraits_battle_4x.png`,
`preview/c2_portraits_lineup_4x.png`.

**Battle backgrounds for stage 2+** (`tools/art/sprites/battle_bgs.py`): `bg_gym` (Gradient Gym:
chalkboards with downhill arrows, honey wood floor), `bg_station` (Caltrain platform, double-decker
train, concrete), `bg_campus` (Benchmark Corp lobby, glass wall, gold bar-chart screen, polished
floor), `bg_library` (bookshelves, ladder, lamps, dark wood floor, red rug). Each 240×112, drawn at
(0,0) like `bg_grass`. Each has its own pads, 128×32, drawn at the grass pads' positions:
`platform_enemy_<id>.png` / `platform_player_<id>.png` (`gym` with a white chalk ring, `station`
with a yellow safety ring, `campus` with a gold inlay ring, `library` a round red rug). Review:
`preview/c2_backgrounds_4x.png`.

`player_front`, `prof_front`, `trainer_m_front`, `trainer_f_front`,
`rival_front` and `trainer_back` are naturalistic people: normal teen/adult
proportions, small eyes, real hands and clothing folds. They were generated from the earlier
designs as references and reduced like the creature sprites: box
downscale, ≤16 colours, magenta fringe removed, and a solid 1px `#28222e`
outline. They keep their own reduced colours, as the creatures do: snapping
them to the tile palette turned olive and grey cloth brown. `player_front`
also gets a small face clean-up (eyes and fringe).

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
| `type_<id>.png` | 32×12 | chips for `anthropic openai google zhipu deepseek mistral moonshot cohere classic glitch` (ids from `src/game/data/typechart.ts`) |

Types are the labs that make the models (plus `classic` and `glitch`). Chips are
plain coloured pills with text only — no company logos or logo-like marks.
Label = the short name if it fits in 26px (1px of chip colour inside the
border on both sides), else the 3-letter code:
ANT, OPENAI, GOOGLE, ZHIPU, DSK, MST, MSH, COHERE, XAI, META, MSF, ALI, CLS,
GLITCH. Chips also exist for `xai meta microsoft alibaba`.
Ramps: anthropic = ROOF_ORANGE, openai = ROOF_TEAL, google = ROOF_BLUE,
zhipu = ROOF_VIOLET, deepseek = UI_FRAME, mistral = CLOTH_YELLOW,
moonshot = GRASS, cohere = WOOD, classic = ROCK, glitch = CLOTH_PINK/CLOTH_RED.
Regenerate just the chips with
`cd tools/art/sprites && python3 -c "import ui; ui.build_type_chips()"`.
The old `type_neutral/myth/logic/tool/speed/open/vision.png` files are no longer
in the asset manifest and can be deleted.

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
