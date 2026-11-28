# Art audit (2026-11-28)

Every asset family was judged as it appears in the game, at 1x and 4x, from real
screens captured in a static build (Playwright + the `?debug=1` hooks) and from the
full autopilot run. The evidence images are in `tools/art/audit/`.

Severity: **A** = looks wrong, or lower quality than the art around it.
**B** = inconsistent style, pixel density or palette. **C** = polish.

The pinned portraits (`tools/art/sprites/pinned/*`) were not touched. They set the
bar: chunky 16-bit trainer art with bold, readable faces.

## Verdicts by asset family

| Family | Verdict | Sev. | Status | Evidence |
| --- | --- | --- | --- | --- |
| Overworld people (`chars/*`) | The compact human bodies are right and read as people at 1x. But the "more human" pass put the 1x2 eyes at the very edge of an 8px face (x5/x10), where dark hair swallowed them. Woman, man, clerk, elder, techie and the boy read as faceless or hooded at 1x. The woman's hair also covered one eye. trainer_m's regular row of spikes over a red band read as a gold crown. The run cycle was a full split. | A | **Fixed** (see below) | `people_old_vs_before_vs_now_4x.png`, `people_faces_before_after_10x.png`, `scene_*_old_before_after_4x.png`, `scenes_before_after_2x.png` |
| Portraits (pinned) | Good. They read well over the battle background and in the intro spotlight. They are a little finer and more painterly than the overworld and tiles, which is normal for the genre. | — | frozen | `sheet_trainers.png`, `sheet_run_a.png` (intro) |
| Missing trainer portraits | `battle/yilong_front` (the actual rival) and every leader/Frontier/grunt key in `trainers.ts` have no art. The engine shows a magenta-framed placeholder in the rival battle. | A | needs art + owner decision | `missing_yilong_front_placeholder_3x.png` |
| Missing overworld sheets | `chars/yilong` and `chars/proxy` are referenced by `trainers.ts` but don't exist. The cameo NPCs (Dario, Sam, Jensen) and egg NPCs reuse generic man/techie/woman sheets, so 30 NPCs share 10 bodies. | B | needs art | — |
| Exterior tiles: ground, paths, trees, water, autotiles | Good. No seams. Grass, path and water autotile corners are clean, and canopies layer correctly. Polish: where the dense forest blocks meet open grass on Route 101 the edge is a straight vertical cut. | C | open | `sheet_world_a.png`, `sheet_world_b.png` |
| Exterior generated props and buildings | The magenta key left a red rim (CLOTH_RED/HP-red pixels) on the fountain, the tower, and the Model Center, lab and house roofs. It showed as red speckle round the fountain on the plaza. | A | **Fixed**: `genart._defringe` re-inks the 563 rim pixels. Ids and catalog are unchanged. | `tiles_exterior_defringe_before_after_3x.png`, `scene_plaza_fountain_before_after_4x.png` |
| Interior tiles and furniture | Clean and consistent. The one exception was `boxes` (moving boxes), which came out as saturated gold with rounded tops and read as treasure sacks in home 1F, home 2F and the Mart. | B | **Fixed**: code-drawn cardboard stack, same tile id | `scene_home_boxes_before_after_3x.png`, `scene_mart_before_after_3x.png`, `sheet_interiors.png` |
| Creature battle sprites (set 1, `mons.py`) | Rich and painterly, and they read well against the battle background. They are about 30 colours each, not the ≤15 the catalog states, and noisier (about 50% isolated pixels) than set 2. They still look good in game. | B | report only | `sheet_battles_*.png` |
| Creature battle sprites (set 2, `mons2.py`) | Generally good and coherent lines (activation, optimizer, embedding, Proxy). Problems: **claude_sonnet** back is cream-dominant but its front has a black body (they don't read as the same animal) and its front face is lost. **Proxy** backs (student, needle, ascendant) are speckled with dark-red and teal noise in the white fur. **residual** back's skip-arc is a detached cyan line. **gelu** front and back are small and thin next to the rest. **glove** and **softmax** backs are noisy blobs. **adam/adamw/mlp/glm_plus** fronts are busy. Nothing logo-like was found. | B | report only (other session's module) | `creatures_noisy_or_mismatched_4x.png`, `sheet_battles_a/b/c.png` |
| Creature post-processing | 26 sprites had 1–3px transparent pinholes inside the body, and the sky or grass showed through as specks. No semi-transparent pixels and no stray islands were found. | B | **Fixed**: new `tools/art/sprites/polish.py`, also run by `build.py` | `creature_pinholes_before_after_5x.png` |
| Creature icons (`*_icon.png`) | Many are illegible at 16px. The whole 64px body is box-downscaled, so mlp, momentum and sgd become brown/red balls, sigmoid, relu and gelu become thin lines, markov_chain becomes scattered bits, and batchnorm is a 3px stick. | B | report only | `creature_icons_4x.png` |
| Battle scene art (`bg_grass`, platforms, `trainer_back`, HUD plates) | Good. The HUD art is fine, but names over about 80px overflow: "GPT 5.5 Thinking" runs into "Lv30" on the enemy plate and is squeezed on the player plate. The plate size is fixed, so this is an engine fix (truncate, or use a narrower font). | A (engine) | report to battle UI | `ui_hud_name_overflow_gpt_5_5_thinking_4x.png` |
| Battle backgrounds for later stages | `gym`, `league`, `leaderboard` and `library` are referenced by trainers but only `grass` exists. | A for stage 2+ | needs art | — |
| UI frames, dialog, menus, cursor, arrows | Good and consistent. | — | — | `sheet_run_c.png`, `sheet_ui_screens.png` |
| Type chips | ALIBABA and CLASSIC (27px) ran into the chip border. | C | **Fixed**: the label needs ≤26px, else the code (ALI, CLS) | `ui_type_chips_before_after_8x.png` |
| UI screens (engine layout) | Trainer card: "A: BADGE CASE" is clipped by the frame's bottom edge. PromptDex info panel: "LAB ANTHROPIC" touches the bottom border. Storage party column: "Claude Fable" and "GPT-5.4 mini" are drawn with squeezed letter spacing, and long names switch to the mini caps font. The pointing-hand cursor overlaps the PARTY header. | A/B (engine) | report to engine | `ui_trainer_card_clipped_3x.png`, `ui_overflow_zoom.png` |
| Badges (`badge_*`) | Clear at 32px. At 16px they are readable but busy (embedding, merge). | C | open | — |
| Title, logo, starter select, intro stage, end card | Good. | — | — | `sheet_run_a.png`, `sheet_run_b.png`, `sheet_run_c.png` |
| Animation | People walk frames have no drift (bounding boxes checked on every row), and the 1px bob is baked as specified. The hound's glitch flicker is by design. The run cycle's stride was 3× the walk, not 1.5×. | B | **Fixed** | `player_run_before_after_5x.png` |

## Overworld people: old chibi vs "human pass" vs now

Before/after strips: `people_old_vs_before_vs_now_4x.png`. In scene:
`scene_hayes_people_old_before_after_4x.png`,
`scene_center_people_old_before_after_4x.png`,
`scene_soma_house_old_before_after_4x.png`, `scene_soma_cameos_before_after_4x.png`,
`scene_route101_trainer_before_after_4x.png`.

The owner's two signals were "less bobble-head" and "keep the charm". The
compact, fully drawn bodies of the human pass are clearly the right direction
next to the GBA references. The old chibi heads took up half the figure and
dwarfed doors and counters. What the human pass lost was the face: the eyes sat
on the face's outer edge, right against the hair. So I kept the bodies and
reworked the faces. The eyes are now 1x2 at x6/x9 with a 2px gap and no nose
pixel on the front view, and they are re-stamped after the hair, so no hairstyle
can cover them. Glasses are now frames drawn round the eyes, not lenses over
them. The result reads warm and clearly as a face at 1x.

| Character | Old chibi vs human pass (before audit) | Now |
| --- | --- | --- |
| player | Human pass better: real body, headphones read. | Better again: friendlier eyes |
| mom | Human pass better (apron and skirt read) | kept, eyes fixed |
| prof | Human pass better in scene, but the glasses band hid his eyes | Eyes show through the frames |
| aide | Human pass better | eyes fixed |
| boy | About equal (the old one was cuter) | Eyes fixed: on par with the old one |
| girl | Human pass better (pigtails) | eyes fixed |
| man | **Regressed**: deep skin and edge eyes made the face a dark blank | Fixed: clear eyes |
| woman | **Regressed**: hair framed the face like a hood and one eye was hidden. The "creepy" one. | Fixed: face opened, both eyes |
| elder | **Regressed**: no eyes, and the moustache sat on one eye | Fixed: eyes above a centred moustache |
| techie | **Regressed**: beanie plus a glasses band, faceless | Eyes inside the frames. Still the weakest (dark top, low beanie): C |
| nurse | Human pass better | eyes fixed |
| clerk | About equal; eyes lost on deep skin | Fixed |
| trainer_m | **Regressed**: gold-crown look | Uneven swept tufts under the bandana (matches his portrait) |
| trainer_f | Human pass better | eyes fixed |
| rival (Dana) | Human pass better | eyes fixed (Dana is being replaced by Yilong) |

## What changed (files)

- `tools/art/sprites/people.py`: eye placement and re-stamping, glasses as
  frames, woman/elder/trainer_m hair templates, run stride. This rebuilt all 16
  `chars/*.png` (same 48×96 layout; the hallucihound sheet is byte-identical).
- `tools/art/tiles_exterior/genart.py`: `_defringe`, which changed 563 pixels in
  `tilesets/exterior.png`. The catalog and tsj are byte-identical.
- `tools/art/tiles_interior/furniture.py`: `cardboard_boxes`, which changed tile
  286 only. The catalog is byte-identical.
- `tools/art/sprites/polish.py` (new) and `build.py`: pinhole fill for 26 creature
  sprites.
- `tools/art/sprites/ui.py`: chip label rule (`type_alibaba`, `type_classic`).
- `tools/art/sprites/preview.py`: the UI preview's orb strip no longer overlaps
  the chips. The previews were refreshed.
- Docs: `ART_CATALOG_SPRITES.md`, `ART_CATALOG_INTERIOR.md`, and the exterior
  doc generator.

Image generations used: **0** (nothing in my ownership needed one).

## Still to do (prioritised)

1. **A: rival Yilong art.** `battle/yilong_front.png` (64×64, in the pinned
   portrait style: start from `rival_front`/`trainer_m_front` as references, and
   pin it once approved) and `chars/yilong.png` (people.py: add a `Person`). Needs
   an owner decision first (below).
2. **A: engine UI text fitting (src, not art).** Battle HUD names over about 80px,
   the trainer card footer, the Dex info panel bottom line, and the storage party
   names.
3. **A for stage 2: missing portraits and backgrounds.** Leader, Frontier Four and
   Team Overfit `*_front` portraits, and the `gym`, `league`, `leaderboard` and
   `library` battle backgrounds. These must be drawn as one set in the pinned
   portrait style.
4. **B: creature fixes for the ART-C session.** claude_sonnet back (regenerate
   from the front so the black body and cream flames match). Proxy backs (despeckle
   the white fur: a majority filter on non-outline pixels inside large white
   regions). The detached arc on the residual back. Scale gelu up. Calm the glove
   and softmax backs.
5. **B: creature icons.** Build them from a head-and-shoulders crop (the top ≈60%
   of the front's bbox) at 32→16 with a re-inked outline, instead of
   box-downscaling the whole body. This belongs to the creature module.
6. **B: more overworld bodies.** Cameo and egg NPCs need their own sheets. With
   people.py that is about 10 lines each: hair template, colours, outfit.
7. **C:** forest-edge straight cuts on Route 101, the lamp's long cast shadow on
   stone, the 16px badges, and the techie's dark silhouette.

## Decisions for the owner

1. **Overworld people style.** I recommend keeping the current compact bodies
   with the fixed faces (`people_old_vs_before_vs_now_4x.png`, rightmost column;
   in scene: `scene_hayes_people_old_before_after_4x.png`). The alternative is
   reverting to the old chibi (leftmost column). Chibi is cuter, but it is the
   bobble-head look you asked to move away from.
2. **Yilong's look.** "Looks suspiciously familiar" can be done as (a) a generic
   tech-founder teen with a black xAI-style jacket and a smug grin, or (b) a light
   caricature of a real person, which needs a ruling under STORY_BIBLE §3. The
   current placeholder is `missing_yilong_front_placeholder_3x.png`.
3. **Type chip codes.** ALI and CLS now sit next to the full words OPENAI,
   GOOGLE, GLITCH. The alternative is a 1px-narrower font for chips only, which
   would keep ALIBABA and CLASSIC as words.
