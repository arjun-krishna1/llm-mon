# QA Issue Log

Linear tools were not exposed in this Codex session, so these are queued for Linear backfill.

## P1

- **Replace placeholder RPGJS starter map with Mythos-specific Hayes Valley / Octavia 101 map.**
  - Evidence: browser field pass shows RPGJS canvas online and playable, but it still renders the stock RPGJS starter grass/water map instead of the storyboard Hayes Valley route.
  - Suggested Linear title: `[P1] Replace RPGJS starter map with Hayes Valley Octavia 101 map`

- **Create finished HalluciHound first-battle sprite.**
  - Evidence: browser battle pass shows readable combat UI, but HalluciHound is currently a procedural placeholder orb.
  - Suggested Linear title: `[P1] Add production HalluciHound battle sprite`

## P2

- **Resolve duplicate title treatment on the orange title screen.**
  - Evidence: desktop title pass shows the generated art already contains the LLMMON Mythos logo, while the overlay also prints a large LLMMON Mythos heading.
  - Suggested Linear title: `[P2] Refine title overlay to avoid duplicate logo`

- **Polish mobile header action placement.**
  - Evidence: mobile storyboard and starter passes stack correctly with no horizontal overflow, but the circular A/B action button floats between header text and content.
  - Suggested Linear title: `[P2] Polish mobile header action placement`

## P3

- **Split large RPGJS/Pixi production chunks.**
  - Evidence: `npm run build` passes but warns that RPGJS/Pixi chunks exceed 500 kB after minification.
  - Suggested Linear title: `[P3] Split oversized RPGJS production chunks`
