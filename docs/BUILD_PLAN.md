# LLMMON Mythos — Full Game Build Plan

The lead's working plan and status board for building the whole game.
Design sources: `docs/STORY_BIBLE.md` (world, gyms, League, roster),
`docs/SAFETY_ARC.md` (villain arc and finale), `docs/VERTICAL_SLICE_PLAN.md`
(quality pillars and technical contracts, still binding).

## Standing instructions from the owner

- Build the entire game to the quality and depth of a real GBA-era monster
  RPG with this theme. When in doubt, go deeper and better.
- Work in parallel Opus sessions. After each stage: critique sessions review
  it, the lead triages and gets fixes made, then the lead plays the stage.
- Deploy to production (push to `main`, theoneandarjun.com) periodically.
- Real public figures may be characters (gym leaders, League, lab heads,
  cameos) within the guardrails in STORY_BIBLE §3 and SAFETY_ARC §7.
- Image generation: `tools/art/gen/imagegen.py` (owner's ChatGPT plan).

## Decisions taken by the lead (change on the owner's word)

- **Rival:** Yilong, an xAI trainer who looks suspiciously familiar and
  insists he is "definitely not related to anyone". Ace: Grok. He also
  carries the starter that counters the player's. Not written as anyone's
  son. Replaces Dana (her art is kept for a later NPC).
- **Villains:** Benchmark Corp / Team Overfit / Director Norm, fictional.
- **Final antagonist:** Proxy, per SAFETY_ARC. Never catchable.
- **Champion:** Prof. Karpathy.
- **Gym 8 city:** Redmond.
- **Gym 1:** SoMa Node's building becomes the Gradient Gym.

## Working rules for every session

- Read this file, the relevant design doc sections and the API docs first.
- Own only the paths in your brief. No `git` commands that change state, no
  `npm install`. Other sessions share the tree.
- Tile ids and catalog names are append-only. Saves must keep loading
  (`migrateSave`).
- Verify by playing (Playwright against a static build), look at
  screenshots, and keep `npm run lint`, `npm test`, `npm run build` green.
- The autopilot (`tools/playtest/run.cjs`) must be extended to cover each
  new stage and must pass before a stage is called done.
- At most three build sessions run at once (usage limits).

## Stages

Status: ☐ not started · ◐ in progress · ☑ done and deployed

### Stage 0 — Slice v2 ☑→ deploy
Reworked music, human-proportioned people, lab types, easter eggs and
cameos, title copyright. Deploy as is.

### Stage 1 — Foundations ◐
Everything later stages need, built once and built properly.

- **ENGINE-F:** Notebook (lesson pages for both curricula, in the start
  menu); badge case on the trainer card; field-skill framework with all
  eight skills usable in the overworld (Backprop, Sample, Embed, Normalize,
  Chain Rule, Dilate, Attend, Merge) plus the map objects each needs; puzzle
  kit (switches, doors, pushable and fusable blocks, floor triggers with
  state, light radius, moving and one-way floors, a "graph floor" of value
  nodes and wires, timers and ranks); multi-map outdoor world with seamless
  edge connections; town map and fast travel; region travel cutscenes;
  weather layers (snow, rain); the EVAL light as an overworld and battle
  state; interface-tamper hooks for the finale.
- **BATTLE-F:** xAI, Meta, Microsoft, Alibaba types added to the web;
  evolution; abilities and held items; the full roster's data (models and
  component creatures, about 70 species) with learnsets, dex text, areas;
  arena-rule hooks so each gym's signature mechanic is data, not a special
  case; richer trainer AI tiers; move tutors; breeding is out of scope.
- **ART-C:** battle sprites (front, back, icon) for every new creature,
  designed as a coherent set; Grok and Proxy first.
- **CONTENT-0:** slice touch-up once the above lands: Yilong replaces Dana,
  Gradient Gym rename, Safety Notebook page 1, likeable Benchmark recruiter.

### Stage 2 — Act 1a: Gradient Gym, Caltrain Line, Menlo Park ☐
Gym 1 (Rumelhart) complete with puzzle, leader mechanic, badge, Backprop.
Caltrain Line route with platforms and first Team Overfit agents. Menlo
Park: town, Benchmark Corp campus tour with Proxy as mascot, Gym 2
(Shannon), Sample. New tiles: station and rail, campus buildings, gym
interiors. Music: gym, leader battle, Team Overfit, Caltrain, Menlo Park.

### Stage 3 — Act 1b: Palo Alto, Mountain View, SFO ☐
Gym 3 (Bengio) with the embedding hall and TRAIN/DEV/TEST wings; the TEST
wing theft; rival battle 2. Gym 4 (Ioffe) with the stream tower; the EVAL
light introduced. Bay crossing. SFO set piece and act break.

### Stage 4 — Act 2: Toronto, Highway 401, Waterloo ☐
Snow tileset and weather. Gym 5 (Hinton) dojo; rival battle 3. Ice
puzzles. Gym 6 (van den Oord) tower. The lab heads' pause meeting.
Legendary LeNet.

### Stage 5 — Act 3: Seattle, Cascade Data Centre, Redmond ☐
Rain tileset. Gym 7 (Vaswani) with eight trainers; the Probe quest; rival
battle 4 on the ferry. Data Centre dungeon and Proxy's escape. Gym 8
(Sennrich). Legendary AlexNet; Transformer.

### Stage 6 — The Summit ☐
Victory Road using all eight skills. The Frontier Four, each handing over a
tool. Champion. The Leaderboard World and the four-phase Proxy fight, bad
ending and recovery, epilogue.

### Stage 7 — Post-game and polish ☐
Sandbox, debate hall, rematches, legendary hunts, Turing, AGI. Full-game
balance, pacing and bug pass. Accuracy review of all teaching text.

## Per-stage loop

1. Build sessions (≤3 in parallel) against a written brief.
2. Autopilot extended and passing.
3. Two critique sessions: a play-and-bug pass, and a design/teaching/art
   pass that judges it against a commercial game and the sources.
4. Lead triages, fixes are dispatched, critique re-checks.
5. Lead plays the stage and reviews the contact sheets.
6. Deploy; update this file's status and the log below.

## Log

- 2026-11-28: plan written; stage 0 deployed; stage 1 started.
