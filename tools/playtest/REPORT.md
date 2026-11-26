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
