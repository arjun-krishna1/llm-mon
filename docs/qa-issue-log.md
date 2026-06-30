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

## P1

- No open P1 issues from the current browser pass.

## P2

- No open P2 issues from the current browser pass.

## P3

- **Split large RPGJS/Pixi production chunks.**
  - Evidence: `npm run build` passes but warns that RPGJS/Pixi chunks exceed 500 kB after minification.
  - Suggested Linear title: `[P3] Split oversized RPGJS production chunks`
