# QA Issue Log

Linear tools were not exposed in this Codex session, so these are queued for Linear backfill.

## Resolved Locally, Pending Linear Backfill

- **[P1] Replace placeholder RPGJS starter map with Hayes Valley Octavia 101 map.**
  - Status: Improved locally after regenerating `src/tiled/simplemap.tmx`.
  - Evidence: browser field pass shows RPGJS canvas online with a Bay-side route, Octavia 101 path, Karpathy Lab marker, and Rescue Beat marker on desktop and mobile.

- **[P1] Add production HalluciHound battle sprite.**
  - Status: Improved locally with a custom layered HalluciHound battle sprite.
  - Evidence: browser battle pass shows a non-placeholder masked glitch hound with ears, legs, tail, and glitch tiles on desktop and mobile.

- **[P2] Refine title overlay to avoid duplicate logo.**
  - Status: Resolved locally.
  - Evidence: browser title pass shows the generated LLMMON Mythos logo remains in the art while the overlay now reads “The Foundation Badge” without clipping.

- **[P1] Fix production RPGJS map asset path.**
  - Status: Resolved locally.
  - Evidence: deployed smoke test initially showed a black RPGJS canvas because production TMX files are emitted to `assets/data`; after fixing the client map base path, local production preview renders the route canvas correctly.

## P1

- No open P1 issues from the current browser pass.

## P2

- **Polish mobile header action placement.**
  - Evidence: mobile storyboard and starter passes stack correctly with no horizontal overflow, but the circular A/B action button floats between header text and content.
  - Suggested Linear title: `[P2] Polish mobile header action placement`

- **Unify chapter mini-map with regenerated RPGJS route.**
  - Evidence: browser field pass shows the RPGJS canvas now has a Hayes/Octavia route, but the adjacent simplified mini-map still uses the previous generic tile arrangement.
  - Suggested Linear title: `[P2] Align chapter mini-map with regenerated Hayes route`

- **Create final pixel-art HalluciHound asset.**
  - Evidence: browser battle pass shows the layered CSS HalluciHound is a strong upgrade from the orb placeholder, but it should eventually be replaced with a dedicated pixel sprite matching the starter card quality.
  - Suggested Linear title: `[P2] Replace CSS HalluciHound with final pixel-art sprite`

## P3

- **Split large RPGJS/Pixi production chunks.**
  - Evidence: `npm run build` passes but warns that RPGJS/Pixi chunks exceed 500 kB after minification.
  - Suggested Linear title: `[P3] Split oversized RPGJS production chunks`
