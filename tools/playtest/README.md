# tools/playtest — autopilot playtests

Drives the real game in headless Chromium (Playwright) with real key presses.
The full-slice run uses **only read-only hooks** (`?debug=1` →
`__llmmon.info()`, `battleInfo()`, `starterInfo()`, reading `__llmmon.state`,
and read-only peeks at the UI widget stacks). It never calls `warp`, `setFlag`,
`giveMon`, `giveItem`, `heal` or `battle`. `tests.cjs` does use them, to set up
edge cases quickly.

## Running

```sh
# full slice, normal speed (≈ the pacing a first-time player sees); builds a snapshot first
node tools/playtest/run.cjs

# same, but the harness does not pause to "read" (game still runs at normal speed)
node tools/playtest/run.cjs --quick

# game in ?fast=1 (instant text, no fades). NOTE: currently breaks at the rescue, see REPORT.md
node tools/playtest/run.cjs --fast

# options
  --seed N            RNG seed (default 7)            --starter glm|claude_fable|gpt_5_5
  --no-build          reuse tools/playtest/out/dist   --dist DIR   --port 5191
  --out DIR           output dir (default out/run, out/run_quick, out/run_fast)
  --until SEGMENT     stop after a segment (title, intro, arrival, home_1f, home_2f, mom_lab_call,
                      hayes_valley, neighbor, lab_aide, rescue, lab_after, route_101_south,
                      route_101_grass, route_101_mid, route_101_ledge, route_101_north,
                      start_menu, soma_node, model_center, token_mart, soma_house, soma_north,
                      save_reload)

# targeted tests (white-out, level-up/learn, full party, Hayes escape/edges, mashing,
# NPC-walk menu/talk, resize, reload mid-cutscene, animation strips)
node tools/playtest/tests.cjs [--only whiteout,levelup,fullparty,escape,mash,npcwalk,resize,reload,anims]

# contact sheets (12 beats per sheet, 2x, labelled) + animation strip sheets
python3 tools/playtest/sheets.py tools/playtest/out/run --out tools/playtest/out --prefix sheet
python3 tools/playtest/sheets.py tools/playtest/out/tests/anims --out tools/playtest/out --prefix sheet
```

`PT_DEBUG=1` prints walking hiccups (interrupted / stuck holds).

The snapshot is built with `vite.playtest.config.mjs`: the normal build, unminified
(widget class names stay readable), plus a probe appended to
`src/game/audio/index.ts` that exposes `window.__llmmonAudio` and logs every
`playMusic` / `stopMusic` / `sfx` call into `window.__audioLog`. No game file is
changed. Other workstreams can keep editing: the run only sees the snapshot, and
the autopilot reads maps from the snapshot (`out/dist/assets/game/maps`).

## Output (`out/`, git-ignored)

- `out/run*/NNN_<beat>_1x.png` — true 240×160 framebuffer (`renderer.snapshot`)
- `out/run*/NNN_<beat>_4x.png` — the canvas element as displayed at 960×640 (checks integer scaling)
- `out/run*/strip_<name>_fNN.png` — animation frames captured every N ms
- `out/run*/result.json` — segments with wall-clock + music/sfx calls, checks, notes,
  battles (plan/outcome/duration), console errors, every dialogue line, beats
- `out/tests/results*.json` + per-test screenshots
- `out/sheet_*.png` — contact sheets for review

## Library (`lib/`)

- `maps.cjs` — loads `.tmj`, merges tile props like `TiledMap.ts`, Dijkstra
  pathfinding with one-way ledge hops, warps only as goals, optional grass cost.
- `game.cjs` — `Game`: `launch`, `snap()` (info + dialog page + widget top +
  battle/starter + music + flags/party/bag), `walkTo(tile|fn)`, `holdUntil`,
  `face`, `approach(x, y)` (incl. across counters), `talkTo(npcId)`,
  `readAt(x, y)`, `takeWarp(toMap)`, `drive(until, handlers)` (dialogue pages
  with reading time, choices, anonymous widgets, battles, starter select),
  battle policy per encounter (`win` / `run` / `catch` / `lose`, Patch when low),
  `shot(name)`, `frames(name, n, ms, action)`, segment timing + audio log.
- `segments/world.cjs`, `segments/menu.cjs` — the slice script and start-menu driver.
