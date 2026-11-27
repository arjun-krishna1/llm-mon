# Playtest report — round 1

Build: working tree at commit fd06666, seed 7, starter GLM, headless Chromium 960×640.
Unbroken run title → end sign → save → reload → Continue: completed in 22:22 at
normal speed (15:54 without reading), 0 console errors, 0 dialogue overflows,
all flags persisted. It only completed because the autopilot entered each
trainer's sight line on the adjacent tile (see P0-1).

## P0
1. ENGINE — trainers who walk to you soft-lock the game after the battle
   (Route 101: step into Tiana's line from (20..22,40) or Calvin's from
   (24..31,55); 6/6). Trainer ends on the player's tile, lockCount stuck at 1.
   Likely `checkTrainerSight` re-entering while `trainerSpotted` runs.

## P1
1. ENGINE — tall-grass overlay covers the player's torso mid-step.
2. CONTENT — tutorial leaves the starter at ~8/20 HP and nothing heals it.
3. BATTLE-UI/CONTENT — 7th catch goes to storage silently; terminal says "coming in the next build".
4. BATTLE-UI — battle HUD plates cramped: 1px gaps, squeezed long names, "Lv100" overflows, "20/ 20".
5. BATTLE-UI — "X fainted!" types fully before the sprite drops.
6. ENGINE — `?fast=1` breaks the rescue (`cameraReset` used outside overworld; resume queued a frame late).

## P2
Battle intro sprites cross paths · text types before the action (0.65–0.9 s lead) ·
strike particles land on the attacker · tutorial says "fainted" then the hound runs off ·
overworld HalluciHound is white/grey but black/red in battle · play time only counts
overworld frames · door closes before the fade · no run pose, tiny dust · ponds have no
shore and the SoMa "fountain" is a pool · TV text breaks mid-quote · orb arc crosses the
enemy plate · tall grass too close in value to grass · lab floor sparse · trainer battles 60–69 s.

## P3
No line after white-out · signs readable from the side · mart purchase plays `save` ·
bump sfx cooldown · starter-select ears touch the top · tutorial uses `battle_wild` ·
ledges thin at 1× · empty move slots show "-".

## Lead's own review of the contact sheets
- Rescue clearing is the emptiest screen in the game; the story's big moment needs set dressing.
- Art style is cohesive across overworld, interiors, battle and menus at 1×.
- Trainer battles run long; tighten text holds.

See `tools/playtest/README.md` to re-run. Sheets are written to `tools/playtest/out/` (git-ignored).

---

# Round 2 (after fix round 1)

Build: snapshot of commit 2ad489d (`tools/playtest/out/dist`), seed 11, starter Claude Fable.
Paths are relative to `tools/playtest/out/`.

**Runs**
- **Normal speed, fresh save, no debug hooks**: title → New Game → end sign → save → reload →
  Continue completed in **22:36**, with 0 failed checks and 0 console errors (`run/result.json`,
  `sheet_01..10.png`). Both trainers' sight lines were entered from the **far end**: Calvin from
  (24,54) walks 8 tiles, Tiana from (20,39) walks 3. The run also included the hiker heal, the
  Debugger behind the grass, the field-notes sign and the fountain plaque.
- **`--fast` end to end**: completed in 6:24, 0 failed checks (`run_fast/result.json`). The rescue
  now finishes in fast mode.
- **ENGINE's `trainer_sight.cjs`**: 6/6 pass. The trainer always ends adjacent to the player,
  lockCount returns to 0.
- **Other checks**:
  - `npm test`: 101/101 pass. `eslint .` and `tsc --noEmit` are clean.
  - `npm run build` was not run here (it writes build info); the vite snapshot builds.
- **Targeted tests**, all pass:
  - white-out at home and at the Model Center, now with a Mom / Nurse line
  - 7th catch → storage line
  - level-up / learn move (round 1)
  - Hayes Valley escape: static check, 4 trigger tiles, 152 wall pushes with 0 leaks (bump sfx on
    151)
  - mashing: new game, rescue, doors
  - reload in the middle of the dialog / starter select / tutorial battle
  - menu opened while an NPC walks
  - 8 window sizes
  - **save → Continue in every interior plus 3 route / town spots** (map, tile, facing and music
    all restored; you can walk afterwards)
  - menu sfx and input
  - `talk_wanderer_mid_step` was inconclusive: the wanderer never stepped next to the player during
    the window. Not a game bug.

## Round-1 items

| id | owner | status | evidence |
|---|---|---|---|
| P0-1 trainer sight soft-lock | ENGINE | **Fixed** | `evidence_r2/P0_calvin_far_end_ok.png`, `trainer_sight.log` |
| P1-1 grass overlay slices the player | ENGINE | **Fixed**: feet only, all 4 directions | `sheet_anim_grass_{up,left,down,right}.png` |
| P1-2 no heal after the tutorial | CONTENT | **Fixed**: the prof heals (`heal` sfx); first wild battle starts at 20/20 | `run/049_wild1_command_4x.png` |
| P1-3 silent 7th catch | BATTLE-UI | **Fixed**: "Gemma 4 was sent to storage." Storage is still not usable (terminal "syncing…"). | `evidence_r2/storage_line.png` |
| P1-4 HUD name / Lv collisions | BATTLE-UI | **Fixed**: no squeeze; "Mistral Medium Lv100" fits with ~7 px; "21/21" | `evidence_r2/hud_player_mistral_lv100.png`, `sheet_03` #34 |
| P1-5 "fainted!" before the drop | BATTLE-UI | **Fixed**: drop and HUD exit run while the line types | `sheet_anim_faint.png` |
| P1-6 `?fast=1` rescue abort | ENGINE | **Fixed**: fast run completes | `run_fast/result.json` |
| P2-1 intro sprites cross | BATTLE-UI | **Fixed**: separate lanes | `sheet_anim_battle_intro.png` |
| P2-2 text before action | BATTLE-UI | **Fixed**: the animation starts while the line types. Trainer battles now 41 s / 51 s (were 60 / 69). | `sheet_anim_attack_hp_drain.png`, `sheet_anim_catch.png` |
| P2-3 strike particles on the attacker | BATTLE-UI | **Fixed** for strike (projectile + ring on the target). Warm Nudge still sparkles on the user first (P3). | `sheet_anim_attack_hp_drain.png` |
| P2-4 "20/ 20" | BATTLE-UI | **Fixed** | `sheet_03` #34 |
| P2-5 "Wild HalluciHound fainted" vs it fleeing | CONTENT / BATTLE-UI | **Fixed** ("The HalluciHound lost its…", then it flees with `run` sfx). See new P2-A. | `sheet_04` #37 |
| P2-6 hound overworld/battle mismatch | ART-SPR | **Fixed**: dark overworld sprite | `run/029_rescue_hound_4x.png` |
| P2-7 play time undercount | ENGINE | **Fixed**: card 0:17 at 17.2 min, save 0:22 at 22.3 min | `run/094_menu_card_4x.png`, `run/107_menu_save_4x.png` |
| P2-8 door closes before the fade | ENGINE | **Fixed** | `sheet_anim_door_enter.png` |
| P2-9 no run pose / dust | ART-SPR / ENGINE | **Partially fixed**: stride + lean frames; dust still 1–2 px | `sheet_anim_run_right_road.png` |
| P2-10/11 ponds, fountain | ART-EXT / CONTENT | **Fixed**: shaped ponds with reeds and lilies; real fountain, plaque read from below | `run/022_hayes_park_4x.png`, `evidence_r2/fountain.png` |
| P2-12 TV page break mid-quote | CONTENT | **Fixed** | `sheet_02` #13 |
| P2-13 orb arc over the HP plate | BATTLE-UI | **Fixed** | `sheet_anim_catch.png` |
| P2-14 tall grass value | ART-EXT | **Partially fixed**: denser texture, still close in hue at 1× | `sheet_04` #45 |
| P2-15 lab sparse | CONTENT / ART-INT | **Fixed**: rug island, aide at the console | `evidence_r2/lab.png` |
| P3 white-out without a line | CONTENT / ENGINE | **Fixed**: Mom "rate-limited…", Nurse "ran out of tokens…"; faces the room / nurse | `evidence_r2/whiteout_{home,center}.png` |
| P3 bump-sfx cooldown | ENGINE | **Fixed** (151/152) | `tests/results_*escape*.json` |
| P3 mart purchase `save` jingle | AUDIO / ENGINE | **Changed, not fixed**: a purchase now plays no confirm sound at all (only `select`) | `run/result.json` token_mart sfx |
| P3 tutorial uses `battle_wild` | AUDIO | Not fixed | `run/result.json` rescue music |
| P3 signs readable from the side | ENGINE | Not retested (the autopilot now reads from below) | — |
| P3 empty move slots "-", thin ledges at 1× | BATTLE-UI / ART-EXT | Not fixed (unchanged) | `sheet_anim_ledge_hop.png` |

## Fresh-eyes notes on what changed
- **Rescue clearing**: much better. The dirt clearing, boulder, grass pockets and the Debugger ball
  give it a stage. But the camera pans only 2 tiles, so the **dialogue box covers the player for
  the whole scene** (new P2-A).
- **Hound**: the dark overworld sprite now reads as the same creature as in battle.
- **HUD plates**: clean, with real padding. The longest names (Mistral Medium, HalluciHound,
  GPT-5.4 mini, Claude Fable) all fit.
- **Text / animation sync**: good. Moves, throws and faints start with the line. Battles feel
  ~25 % faster.
- **Intro lanes**: correct. The enemy and its platform come from the right, the trainer from the
  left, the HUD slides in, then "A wild … appeared!".
- **Grass overlay**: correct in all 4 directions.
- **Doors**: stay open through the fade.
- **Run**: has a pose now.
- **Fountain plaza**: a proper focal point.
- **Ponds**: look hand-made now.
- **Lab**: has a centre of gravity.
- **Trainer portraits** (Calvin, Tiana) sit well next to the creature sprites: same outline weight
  and palette.

## New issues (round 2)

### P0 / P1
None found.

### P2
- **P2-A — CONTENT / ENGINE, rescue framing.**
  - **Repro**: from (21,88) walk north into the rescue trigger.
  - **Where**: `run/029_rescue_hound_4x.png`, `030_rescue_satchel_4x.png`, `039_rescue_after_4x.png`
    (and `sheet_03` #29–30, `sheet_04` #39–40).
  - **Problem 1**: during every rescue line the player (21–22,82–83) sits under the dialogue box;
    only the hair shows.
  - **Problem 2**: "Phew… Look at it run!" is spoken after the hound has already left the screen.
  - **Fix**: pan 3–4 tiles, or stop the player 2 tiles further north. Show the hound running off
    before (or during) that line.
- **P2-B — CONTENT / ART-EXT, field-notes sign.**
  - **Where**: (18,82), `run/046_route_field_notes_4x.png`.
  - **Problem**: it is read facing a tree canopy. The text describes pages "scattered round an old
    stump" that is 2 tiles away, and no pages are drawn.
  - **Fix**: move the sign or interaction next to the stump, and add a page decal.

### P3
- **Start-menu cursor memory**: after closing with B the menu reopens on EXIT, not on the last
  item used (`tests/results_menus*.json`; repro: START, down ×2, B, START → index 4).
- **Mart purchase** has no confirm sound (see the table).
- **Warm Nudge** still plays its sparkles on the user before the hit.
- **Tutorial music** is still `battle_wild`.

### First 3 minutes (normal reading)

| beat | starts at |
|---|---|
| title | 0:00 |
| intro (5 boxes + name) | 0:05 |
| arrival cutscene (mover + Mom walk-in; +16 s vs round 1) | 0:54 |
| Mom in 1F | 1:25 |
| **first free control** | ~1:45 |
| 2F | 2:34 |
| notebook | 2:37 |
| Mom's lab call | 3:58 |
| outside | 4:15 |

Starter confirm comes at 8:59 when reading every prop. On the critical path alone it is about 4½
minutes.

- Nothing is confusing: every step names the next destination.
- The dull part is **1:45–4:00**: an errand upstairs whose only payoff is an optional notebook.
- Suggestions:
  - have Mom's lab call fire on the first walk past her (no 2F prerequisite), or put one
    interactive beat in the room (e.g. picking up the notebook);
  - trim the mover's arrival line.

### Other checks
- **(b) Dialogue box over the action**: fine everywhere except the rescue (P2-A). Reading the
  mailbox from below hides it behind the player's head (genre-normal).
- **(c) NPC placement**: natural. Wanderers stay in their radius; trainers stay where they walked.
  The hiker is placed sensibly just south of Calvin's line.
- **(d) Dull frames**: the west meadow (`sheet_06` #63, half the frame is forest wall). The rescue
  clearing is fine now.
- **(e) Menus**:
  - sfx: `menu_open`, `select` on every move and confirm, `cancel` on every back-out;
  - B backs out of party, bag, bag submenu and card consistently;
  - no input drops: 7 presses at 25 ms and 60 ms gaps and 3 at 16 ms all registered;
  - cursor memory: see P3.
- **(f) Audio**:

| area / event | music |
|---|---|
| title | title |
| intro | intro |
| Hayes Valley | hayes_valley |
| home / neighbour / SoMa house | home |
| lab | lab |
| rescue | encounter_trainer → battle_wild → victory → hayes_valley → lab |
| Route 101 | route_101 |
| trainers | encounter_trainer → battle_trainer → victory → route_101 |
| SoMa Node | soma_node |
| center and mart | center |

  Victory always resumes the area track. Jingles fire: heal, key_item_get, item_get, level_up,
  save.
- **(g) Save / Continue**: OK from all 7 interiors and 3 outdoor spots.

## Pacing (round 2, normal speed, reading everything)

| | time |
|---|---:|
| title | 0:05 |
| intro | 0:52 |
| arrival | 0:45 |
| home 1F | 0:56 |
| home 2F | 1:21 |
| lab call | 0:20 |
| Hayes Valley | 1:17 |
| neighbour | 0:54 |
| lab + aide | 1:57 |
| rescue + lab | 2:24 |
| Fast Tokens | 1:08 |
| Route south (sign, picnic girl, field notes, Debugger) | 0:38 |
| grass (3 wild: win 18 s, run 6 s, catch 26 s) | 1:07 |
| mid (hiker, Calvin 41 s) | 1:49 |
| ledge | 0:10 |
| north (Tiana 51 s) | 1:18 |
| start menu | 0:16 |
| SoMa | 0:53 |
| center | 1:00 |
| mart | 0:48 |
| SoMa house | 1:10 |
| SoMa north + end sign | 1:12 |
| save / reload | 0:12 |
| **total** | **22:36** |

## Verdict against plan §7

| §7 requirement | status |
|---|---|
| Fresh load → SoMa Node playable start to finish without debug hooks | ✔ |
| No soft-locks | ✔ (sight lines, mashing, reloads) |
| No console errors | ✔ |
| Save/continue works mid-way | ✔ (everywhere) |
| lint / test pass | ✔ |
| Build | ✔ (vite snapshot) |
| Every screen holds up at 1× | ✔ in 110 beats (no overflow, no smoothing, no placeholder art seen) |
| Movement, text and battle pacing feel like a handheld RPG | ✔ |

**Ready to show the owner: YES, with caveats.** The caveats are the rescue framing (the box hides
the hero in the story's key scene) and a slow-ish first 4 minutes.

## 5 highest-value remaining changes
1. Re-frame the rescue: pan the camera so the player, prof and hound are all above the box, and
   show the hound fleeing on "Look at it run!" (P2-A).
2. Tighten the opening:
   - Mom's lab call without the forced 2F round trip (or give the room one real interaction);
   - trim the mover's arrival line.
   First control comes at ~1:45 and the lab at ~6:30 when reading.
3. Field-notes sign: put it on the stump and draw the pages (P2-B).
4. Small battle polish:
   - Warm Nudge plays on the target;
   - a purchase / confirm chime in the mart;
   - a dedicated rescue/tutorial battle track.
5. Feel polish:
   - start-menu cursor memory;
   - bigger run dust;
   - a touch more contrast between tall grass and short grass at 1×.

# Round 3 — lead playthrough review and build list

Reviewed every beat of the latest full run (seed 3, GLM; `out/fsheet_*.png`).
The slice is solid; what separates it from a GBA-era release now is missing
genre features and a thin climax, not bugs.

## Additions
1. Rival: neighbour Dana gets the starter that beats yours and fights you at the
   north end of Route 101 — the slice's climax and the first battle where type
   matchups matter.
2. Name entry screen (letter grid) for the player, and nickname prompt after a catch.
3. PromptDex screen in the start menu (seen/caught list, entry page).
4. Model Storage System: working deposit/withdraw at the Model Center terminal.
5. Options (text speed, music/sfx volume) from the title and start menus.
6. Touch controls (D-pad, A, B, Start) and gamepad support — the live site is opened on phones.
7. Per-species cries on send-out and faint; an ending tune.
8. End card after the end-of-slice sign (short credits, "To be continued").
9. Title screen life: drifting clouds, logo shine, blinking PRESS START.

## Improvements
10. SoMa Node should read as a city: paved plaza/streets, two more building
    types, street props; less open lawn in its southern half.
11. Home bed is one tile wide; make it 2 tiles.
12. Trainer battles: "super effective" moments are rare before Lv7 because
    wilds only use neutral moves — the rival fight fixes the showcase; also
    give route trainers one type move each.
13. Capital W in the dialogue font is legible but blocky.
