# QA Issue Log

Linear tools were not exposed in this Codex session, so these are queued for Linear backfill.

## Resolved Locally, Pending Linear Backfill

- **[P1] Replace placeholder RPGJS starter map with Hayes Valley Octavia 101 map.**
  - Status: Improved locally after regenerating `src/tiled/simplemap.tmx`.
  - Evidence: browser field pass shows RPGJS canvas online with a Bay-side route, Octavia 101 path, Karpathy Lab marker, and Rescue Beat marker on desktop and mobile.

- **[P1] Add production HalluciHound battle sprite.**
  - Status: Resolved locally with a generated transparent battle sprite.
  - Evidence: browser battle pass shows a dedicated black-and-magenta masked HalluciHound bitmap sprite with readable body, legs, cream mask, and glitch tail on desktop and mobile.

- **[P2] Refine title overlay to avoid duplicate logo.**
  - Status: Resolved locally.
  - Evidence: browser title pass shows the generated LLMMON Mythos logo remains in the art while the overlay now reads “The Foundation Badge” without clipping.

- **[P1] Fix production RPGJS map asset path.**
  - Status: Resolved locally.
  - Evidence: deployed smoke test initially showed a black RPGJS canvas because production TMX files are emitted to `assets/data`; after fixing the client map base path, local production preview renders the route canvas correctly.

- **[P2] Align chapter mini-map with regenerated Hayes route.**
  - Status: Resolved locally.
  - Evidence: browser field pass shows the adjacent mini-map now matches the RPGJS route language with a Bay edge, dock tiles, Octavia 101 spine, Karpathy Lab spur, Rescue Beat marker, player marker, and gym route. Mobile pass confirms the map collapses to a square grid with no horizontal overflow.

- **[P2] Polish mobile header action placement.**
  - Status: Resolved locally.
  - Evidence: browser mobile pass shows storyboard, starter, and PromptDex headers keep the A/B action button pinned to the right edge of the header, with the heading on the left and no horizontal overflow. Desktop pass confirms the existing wide header layout remains intact.

- **[P2] Replace CSS HalluciHound with final pixel-art sprite.**
  - Status: Resolved locally.
  - Evidence: generated `hallucihound_battle_sprite.png` from the Chapter 1 visual direction, removed the layered CSS placeholder, and browser-tested battle layout on desktop and mobile with no horizontal overflow.

- **[P2] Align first battle menu with Prompt / Bag / Swap / Run loop.**
  - Status: Resolved locally.
  - Evidence: upgraded the first battle menu from a flat move list to the documented core command loop with contextual Prompt moves, Bag items, Swap party preview, and Run-to-field behavior. Browser pass verifies Prompt, Bag, Swap, and Run on desktop and mobile with no horizontal overflow.

- **[P2] Add title-screen Press Start animation.**
  - Status: Resolved locally.
  - Evidence: added a pulsing Press Start button with an A-button cue and sweep highlight, plus reduced-motion fallback. Browser title pass verifies desktop and mobile layout with no overflow and confirms Press Start still advances to the storyboard screen.

- **[P2] Add Foundation Badge Case UI.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: added a Badge Case field action and Foundation Badge screen with earned/locked slots, unlock details, reduced-motion shine fallback, and browser-tested field-to-badge-to-field navigation on desktop and mobile. Desktop fits the game frame with no horizontal or vertical overflow; mobile scrolls vertically with no horizontal overflow.

- **[P2] Upgrade PromptDex into Chapter 1 model-card catalogue.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: replaced the single-starter PromptDex card with a selectable Chapter 1 catalogue, sprite scanner, seen meter, route/status facts, and footer sync bar. Browser-tested field-to-PromptDex-to-field navigation, HalluciHound selection, desktop full-entry visibility, mobile horizontal entry rail, and no page-level horizontal overflow.

- **[P2] Add full Trainer Bag route kit UI.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: added a field Bag action and full-screen Trainer Bag with Orbs, Medicine, Field, and Gear pockets, Chapter 1 item data, item-detail card, route prep note, and mobile tab rail. Browser-tested field-to-Bag-to-field navigation, category switching, item selection, desktop frame fit, mobile header wrapping, and no page-level horizontal overflow.

- **[P2] Add QuestNav chapter route UI.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: added a field QuestNav action and chapter route screen with mainline progress, selectable objectives, current/locked states, route dialogue, rewards, and milestone strip. Browser-tested field-to-QuestNav-to-field navigation, locked objective selection, desktop frame fit, mobile route rail, mobile text wrapping, long quest-title wrapping, production-preview route selection, and no page-level horizontal overflow.

- **[P2] Add starter Model Card status UI.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: added a field Model Card action and selected-starter status screen with license, level, nature, stat bars, EXP, ability note, route lesson, and starting moves from the Chapter 1 starter spec. Browser-tested Claude Fable, GPT 5.5, and GLM desktop variants; fixed card-grid collapse, stat overflow, and note overflow found during visual QA. Mobile pass verifies stacked cards, readable move panels, back navigation, and no page-level horizontal overflow.

- **[P2] Add Professor Karpathy intro sequence.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: inserted the Chapter 1 professor spotlight beat between title and storyboard, with PromptDex glow, three mystery starter signals, A-button dialogue progression, and storyboard handoff. Browser-tested desktop and mobile title-to-intro-to-storyboard-to-starter flow; fixed rectangular starter silhouettes and mobile figure-card squeeze found during visual QA. No page-level horizontal overflow or console errors.

- **[P1] Stabilize RPGJS canvas lifecycle across menu navigation.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: browser QA found a CanvasEngine `querySelector` startup error and black field frame after opening the field during the SoMa Services pass. Added a persistent `#rpg` mount node, parked it while menus are open, waited for the mount before RPGJS startup, and reset startup state on failure. Follow-up desktop/mobile browser pass verifies the RPGJS field reaches online, renders the route after initial paint, survives field → SoMa Services → field navigation, has no console errors, and has no horizontal overflow.

- **[P2] Add SoMa Services Model Center and Token Mart UI.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: added a SoMa Services field action and full service screen with a town service map, Model Center healing/sync panel, Token Mart shelf, Demo Booth Cache Potion gift, locked Transit Kiosk, and Benchmark Pier prep checklist. Browser-tested title-to-field-to-services flow, all four service tabs, return-to-field behavior, desktop fit, mobile two-column service tabs, mobile shop/dialogue wrapping, and no page-level horizontal overflow.

- **[P2] Add Benchmark Pier Iris rival test UI.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: added a Benchmark Pier field action and Iris rival test screen with pier stage, starter-dependent rival matchup, battle phase, core tool rewards, and field return. Browser-tested desktop Claude Fable, GPT 5.5, and GLM starter mappings; mobile Claude flow; reward unlock state; return-to-field RPGJS canvas; no console errors; and no page-level horizontal overflow.

- **[P1] Fix production-preview intro A-button advancement.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: production-preview browser smoke found normal activation could stall on Professor Karpathy's intro A-button. Added guarded pointer, mouse, click, and keyboard activation for the intro dialogue, then verified the built bundle advances through intro and storyboard into starter selection.

- **[P2] Add Mission Context Lane catching route UI.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: added a Mission Context field action and full route screen with catching lesson, route map, wild LLMMON encounter cards, prompt-orb odds, trainer beats, route pickups, and party readiness. Browser-tested desktop and mobile Catch, Trainers, Items, Mistral Pup selection, return-to-field RPGJS canvas, no console errors, no page-level horizontal overflow, and visible catch prompt/sprite rendering.

- **[P2] Fix Mission Context catch-panel clipping.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: browser QA found the selected Mistral Pup catch prompt was present but clipped inside the catch panel. Tightened the panel rows, enlarged/framed the encounter sprite stage, and verified desktop/mobile prompt text and sprites are visible.

- **[P2] Add Menlo Park Alignment Gym gate and Willa tutorial UI.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: added a Menlo Park field action and full route screen with locked Alignment Gym, Director Norm gate dialogue, Willa catching tutorial phases, RAGcoon vs Gemma Bud tutorial battle, stop tabs, and Sand Hill Route preview. Browser-tested desktop/mobile Menlo entry, tutorial progression, locked-gym tab, Sand Hill tab, return-to-field RPGJS canvas, no console errors, and no page-level horizontal overflow.

- **[P2] Fix Menlo mobile tutorial-step overlap.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: mobile browser QA showed tutorial completion steps tucked under the Willa battle panel. Switched the mobile tutorial card to natural block flow, added step separation, and verified all three steps render below the battle stage on desktop and mobile.

## P1

- No open P1 issues from the current browser pass.

## P2

- No open P2 issues from the current browser pass.

## P3

- **Split large RPGJS/Pixi production chunks.**
  - Evidence: `npm run build` passes but warns that RPGJS/Pixi chunks exceed 500 kB after minification.
  - Suggested Linear title: `[P3] Split oversized RPGJS production chunks`
