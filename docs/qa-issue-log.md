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

- **[P2] Rework opening intro into Ruby-style game sequence.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: rebuilt title, professor intro, rescue satchel, and starter-selection screens around framed handheld RPG compositions using the Chapter 1 Ruby/professor/satchel references. Browser-tested Press Start -> professor dialogue -> rescue -> starter choice -> RPGJS field, verified GLM selection updates the starter state, and confirmed no browser console errors.

- **[P2] Remove concept-card art from gameplay-scale starter previews.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: visual QA found generated starter card art was unsuitable as an in-game sprite and could crop into a vertical artifact in the opening sequence. Replaced title/starter preview usage with CSS silhouette/orb treatments and replaced the rescue hound image with a compact silhouette for readable staging.

- **[P3] Track in-app screenshot compositing artifact during intro QA.**
  - Status: Open, pending Linear backfill.
  - Evidence: the in-app browser DOM and interaction checks showed correct intro/starter element bounds and no console errors, but its screenshot capture repeatedly displayed a stale vertical artifact after the image usage was removed. Continue to use DOM checks plus an independent browser capture path when visual proof is required.

- **[P2] Tighten opening sequence against Pokemon Ruby intro references.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: visual audit against the local Ruby title, professor intro, and starter-bag references still showed modern card-like UI. Reworked the title frame, professor stage scale, rescue bag/orb layout, starter bag selection, and selected starter plaque to use flatter pixel-era staging. Desktop browser smoke verified Press Start -> professor -> rescue -> GPT starter -> RPGJS field with no console errors.

- **[P2] Preserve bag-and-orb starter composition on mobile.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: after removing the side-menu starter layout, mobile overrides still targeted the old list/card composition. Updated the mobile breakpoint for professor scale, rescue bag/orbs, hound silhouette, starter orb tray, starter plaque, and dialogue box. Mobile browser DOM smoke verified title/professor/rescue/starter frames fit `390x844`, critical elements are visible, there is no horizontal overflow, and no console errors.

- **[P2] Replace intro-screen round A-buttons with classic dialogue cues.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: visual pass found the opening still exposed standalone circular command buttons that read as custom web UI instead of a Pokemon-style dialogue prompt. Replaced intro, rescue, and starter command buttons with compact in-box dialogue cues. Desktop browser smoke verified professor -> rescue -> starter -> GLM -> RPGJS field with no console errors; mobile DOM smoke verified the cue is visible in intro/rescue/starter and no horizontal overflow.

- **[P2] Remove web-card chrome from opening game viewport.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: visual pass still showed bordered, shadowed outer frames around the title/professor/rescue/starter sequence. Removed the web-card border/shadow treatment, tightened the 4:3 frame to height-constrained black letterboxing, converted the title version badge to native title text, and added a click-through starter-stage label. Browser-tested desktop title/professor/rescue/starter and mobile `390x844` rescue/starter with no horizontal overflow, no console errors, and starter selection controls still tappable.

- **[P2] Replace remaining opening dialogue chrome with Ruby-style text boxes.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: visual pass against the Ruby professor/starter references found the opening still had a visible round A-button cue, professor progress meter, and a lingering card-era professor sprite constraint. Replaced the cue with a blinking red dialogue cursor, switched intro/rescue/starter dialogue boxes to gray-edged RPG text boxes, hid the professor progress meter, removed the old `420px` professor-card minimum height, and verified the professor sprite sits on the spotlight. Browser-tested desktop title -> professor -> starter -> RPGJS field and mobile `390x844` title/professor/starter with no horizontal overflow and no console errors.

- **[P2] Recompose rescue and starter satchel scenes around Ruby-style bag staging.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: visual pass against the Ruby starter-bag reference showed the satchel still read as an oversized custom tray. Reduced and angled the bag, arranged prompt orbs around it, removed the redundant clipped active-orb name tag, kept the selected starter plaque as the label surface, and added a short rescue-scene entry guard so rapid input does not skip the rescue beat. Browser-tested desktop title -> professor -> rescue -> starter -> RPGJS field and mobile `390x844` starter selection with no horizontal overflow, no console errors, and selectable starter orbs still clickable.

- **[P2] Add Ruby-style title badge and legendary energy veins.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: visual pass against the Ruby title reference showed the title silhouette was too flat and the version text read as plain title copy. Added a compact white version badge, stronger shadow treatment, and purple energy veins through the title legendary silhouette while preserving the 4:3 handheld frame. Browser-tested desktop and mobile title frames, then full desktop title -> professor -> rescue -> starter -> RPGJS field and mobile `390x844` title -> starter with no horizontal overflow or console errors.

- **[P2] Replace cropped professor intro sprite with full-body pixel professor.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: visual pass against the Ruby professor intro reference showed Professor Karpathy still read like a cropped bust instead of a full-body sprite standing on the spotlight. Redrew `professor-karpathy.svg` with visible coat, legs, shoes, and raised hand while keeping the same asset path. Browser-tested desktop professor intro, desktop title -> professor -> rescue -> starter -> RPGJS field, and mobile `390x844` professor/starter flow with no horizontal overflow or console errors.

- **[P2] Add classic starter choice confirmation menu.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: gameplay pass found the starter A cue immediately entered the field instead of showing a Ruby-style "Choose this?" confirmation beat. Added a local starter confirmation state with a gray-edged YES/NO menu, updated the dialogue prompt to ask for confirmation, made NO return to browsing, and reset the prompt when selecting another starter. Browser-tested desktop GPT -> NO -> GLM -> YES -> RPGJS field and mobile `390x844` YES/NO flow with no horizontal overflow or console errors.

- **[P2] Tighten professor intro staging against Ruby reference.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: visual pass against the Ruby professor intro reference showed the professor stage still felt too empty and unanchored after the sprite redraw. Added a layered olive top band, floor shadow, brighter oval spotlight, and a compact pixel nameplate that appears after the greeting so Professor Karpathy reads as a finished GBA-scale intro scene. Browser-tested desktop title -> professor line 1/2 -> rescue -> starter confirmation -> RPGJS field and mobile `390x844` professor -> starter flow with no horizontal overflow or console errors.

- **[P2] Make starter selection feel like in-world orb picking instead of web buttons.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: visual pass found the starter orbs still behaved like browser buttons, with selection feedback depending on button scale rather than a Pokemon-style cursor. Converted the active starter state to use a red in-world cursor and orb halo, restyled the starter plaque as a gray-edged RPG label, and added keyboard browsing/confirmation so arrows/WASD move between orbs while A/Enter opens the YES/NO confirmation. Browser-tested desktop title -> professor -> rescue -> starter, keyboard GLM selection, A -> YES/NO menu, NO cancel, A -> YES -> RPGJS field, plus mobile `390x844` starter cursor/plaque with no horizontal overflow or console errors.

- **[P2] Reframe rescue beat as an in-field encounter.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: visual pass found the rescue beat still looked like a floating starter-bag illustration rather than the Ruby-style professor-in-trouble route moment. Added a route clearing, tall-grass patches, player sprite, Professor Karpathy field sprite, and an exclamation bubble around the existing satchel and HalluciHound staging so the scene reads as an actual encounter before starter choice. Browser-tested desktop title -> professor -> rescue -> starter confirmation -> RPGJS field and mobile `390x844` rescue -> starter flow with no horizontal overflow or console errors.

- **[P2] Add cartridge-style title command menu before professor intro.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: opening pass found Press Start still behaved like a web CTA that jumped directly into the professor intro. Added a Ruby-style NEW GAME / CONTINUE / OPTION command panel, keyboard A/Enter/Space start handling, B/Escape cancel, and a short stepped fade into the professor scene. Browser-tested desktop Press Start -> menu, Escape cancel, A reopen, Enter -> professor intro -> rescue -> starter confirmation -> RPGJS field, plus mobile `390x844` title menu -> professor handoff with no horizontal overflow or console errors.

- **[P2] Add route-ground continuity to starter selection.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: visual pass found the rescue beat now reads like a route encounter, but the starter selection still flattened back into a display-like bag scene. Added a subtle route clearing, grass tufts, and pixel sparkles behind the satchel/orbs so the choice screen feels continuous with the professor rescue moment. Browser-tested desktop NEW GAME -> professor -> rescue -> starter -> confirmation -> RPGJS field and mobile `390x844` starter scene with no horizontal overflow or console errors.

- **[P2] Replace web-like opening dialogue text with pixel game font.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: visual pass found the opening dialogue copy still rendered with a bold browser font inside otherwise Ruby-style text boxes. Loaded the bundled Kenney pixel UI font and applied it to title command menu text, professor/rescue/starter dialogue body copy, and starter confirmation choices while keeping tiny labels/logos on Press Start 2P. Browser-tested desktop title -> NEW GAME -> professor -> rescue -> starter -> confirmation -> RPGJS field and mobile `390x844` title/professor/rescue/starter/confirmation/field with no horizontal overflow, no console errors, and one RPGJS canvas after confirmation.

- **[P2] Reveal selected starter creature during satchel choice.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: visual pass against `storyboard_2_professors_call_and_starter_choice.png` showed the Ruby-style starter satchel scene still exposed only prompt orbs and text, so the choice lacked an actual LLMMON reveal. Cropped the bundled starter art into game-scale portrait assets, added a selected-creature aura/platform preview behind the active orb, and moved the scene label into a compact top-left "STARTER SATCHEL" tag. Browser-tested desktop Claude/GPT/GLM switching and mobile `390x844` Claude -> GLM -> confirmation -> RPGJS field with no horizontal overflow, no console errors, and one RPGJS canvas after confirmation.

- **[P2] Replace CSS title recreation with finished title artwork.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: visual pass against the bundled Ruby title reference and generated Chapter 1 title asset showed the CSS-built title still looked less finished than the provided art. Swapped the title frame to use `title_screen_claude_orange_final.png` as the visible cartridge title, hid duplicate CSS logo/legendary/copyright layers, preserved the invisible Press Start hit area and Ruby-style NEW GAME menu overlay, and kept the mobile title frame at a true 4:3 aspect ratio. Browser-tested desktop title asset loading, Press Start -> title menu, title menu -> professor -> rescue -> starter with no horizontal overflow or console errors before the final mobile-only frame adjustment; follow-up mobile screenshot capture/viewport control in the in-app browser repeatedly timed out, so mobile was verified by CSS media-rule inspection plus lint/build.

- **[P2] Show starter creatures during Professor Karpathy's intro.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: visual pass against `storyboard_1_arrival_and_setup.png` panel 2 showed the professor intro still used abstract starter signal labels instead of the three LLMMON silhouettes called for in the storyboard. Replaced that beat with the finished Claude Fable, GPT 5.5, and GLM portrait assets on pixel-stage platforms, shifted Karpathy and the spotlight left during the reveal lines, and added mobile-specific sizing so the lineup remains inside the handheld frame. `npm run lint`, `npm run build`, and `git diff --check` passed. In-app browser QA was attempted twice on `http://127.0.0.1:5173/`, but the browser automation timed out before returning page state; standalone Playwright/Puppeteer packages are not installed, so this release is queued for a follow-up visual browser pass when tooling is available.

- **[P2] Add Ruby-style Hayes Valley arrival setup before the rescue beat.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: opening-flow audit against `storyboard_1_arrival_and_setup.png` showed the game still jumped from Professor Karpathy's intro directly to the Octavia 101 rescue, skipping the moving van, Mom greeting, player room, and TV report beats that make the pre-starter flow feel like Pokemon Ruby. Added a playable arrival screen between intro and rescue with van/town, Hayes Valley sign, Mom/player reveal, room/TV/PC furniture, and A/Enter dialogue progression. Also fixed the opening 4:3 frame vertical overflow at `1280x720` and added keyboard A/Enter support to the rescue handoff. Verified with `npm run lint`, `npm run build`, `git diff --check`, and a temporary Playwright browser pass through title -> intro -> arrival van/home/room -> rescue -> starter on desktop `1280x720` and mobile `390x844`; both had no horizontal or vertical overflow and no console errors.

- **[P2] Add Karpathy Lab and Octavia 101 setup before professor rescue.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: opening-flow audit against `storyboard_2_professors_call_and_starter_choice.png` and the Chapter 1 walkthrough showed the game still skipped the empty Karpathy Lab and Octavia 101 warning beats, so the professor rescue appeared without the Ruby-style town-to-route setup. Added a playable lab/approach screen between Hayes Valley arrival and rescue with a lab aide, whiteboard, GPU rack, locked starter orb table, Octavia freeway/sidewalk scene, city-kid warning, route sign, and A/Enter dialogue progression. Verified with `npm run lint`, `npm run build`, `git diff --check`, and a temporary Playwright browser pass through title -> intro -> arrival -> lab -> Octavia -> rescue -> starter on desktop `1280x720` and mobile `390x844`; both had no horizontal or vertical overflow and no console errors. Screenshot QA checked the desktop/mobile lab and Octavia compositions for text fit and visual readability.

- **[P2] Recompose starter choice around visible creature lineup.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: starter-choice visual pass against `storyboard_2_professors_call_and_starter_choice.png` showed the satchel scene still relied on a side preview/custom plaque instead of a true in-world three-starter choice. Added visible Claude Fable, GPT 5.5, and GLM creature portraits above their prompt orbs, widened the satchel orbit, added persistent name tags with a red active cursor, removed the redundant large side preview, and tightened mobile dialogue sizing. Verified with `npm run lint`, `npm run build`, `git diff --check`, and a temporary Playwright browser pass through title -> intro -> arrival -> lab -> Octavia -> rescue -> starter on desktop `1280x720` and mobile `390x844`; starter switching, YES/NO confirmation, NO cancel, and confirmation reopen all passed with no horizontal or vertical overflow on the starter screen and no console errors.

- **[P2] Add dense Ruby-style map detail to room and lab setup scenes.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: visual pass against `storyboard_1_arrival_and_setup.png`, `storyboard_2_professors_call_and_starter_choice.png`, `player_room_reference.png`, and `professor_lab_reference.png` showed the new room and lab beats still read as flat diagrams instead of top-down RPG maps. Added room shelf, clock, plant, repositioned bed/desk/PC/TV/window props, denser wood floor tiles, lab counters, bookshelves, whiteboard, storage crates, and a red orb machine, then tuned mobile overrides and dialogue sizing. Verified with `npm run lint`, `npm run build`, `git diff --check`, and a temporary Playwright browser pass through title -> intro -> arrival room -> lab -> Octavia -> rescue -> starter confirmation on desktop `1280x720` and mobile `390x844`; both passed with no horizontal or vertical overflow, no console errors, and working GLM confirmation.

- **[P2] Rebuild professor rescue as a dense Route 101 encounter.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: visual pass against `storyboard_2_professors_call_and_starter_choice.png` panel 3 and `professor_rescue_starter_bag_reference.png` showed the rescue beat still had an abstract striped field and empty edges rather than a Ruby-style grass-route encounter. Added a winding dirt path, upper/lower treeline, dirt patches, extra tall-grass walls, and retuned player/professor/hound/satchel positions so the scene reads as player-left, Professor Karpathy in danger, HalluciHound right, and starter satchel nearby. Verified with `npm run lint`, `npm run build`, `git diff --check`, and a temporary Playwright browser pass through Octavia -> rescue -> starter confirmation on desktop `1280x720` and mobile `390x844`; both passed with no horizontal or vertical overflow, no console errors, route props present, and working GLM confirmation.

- **[P2] Add Ruby-style town detail to the Hayes Valley moving-truck arrival.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: visual pass against `storyboard_1_arrival_and_setup.png` panel 3 showed the first town arrival still read as sparse road and simple blocks, with Mom/player hidden until the next line. Added visible Mom/player on the moving-truck beat, branded the truck as `MYTHOS MOVERS`, enriched house/lab facades, and added tree clusters, flower beds, and a white fence to make the scene read like a Ruby town map. Verified with `npm run lint`, `npm run build`, `git diff --check`, and a temporary Playwright browser pass through title -> intro -> Hayes Valley arrival -> starter confirmation on desktop `1280x720` and mobile `390x844`; both passed with no horizontal or vertical overflow, no console errors, arrival props present, visible Mom/player, and working GLM confirmation.

- **[P2] Add the missing stepping-outside neighbor beat before Karpathy Lab.**
  - Status: Resolved locally, pending Linear backfill.
  - Evidence: visual pass against `storyboard_1_arrival_and_setup.png` panel 6 showed the flow still jumped from the room/TV directly to Karpathy Lab, skipping the Ruby-style outside handoff where an NPC points the player toward the professor. Added a fourth arrival scene with the player back outside, a green-shirt neighbor NPC, exclamation bubble, truck dimming, and dialogue that directs the player to Octavia 101. Verified with `npm run lint`, `npm run build`, `git diff --check`, and a temporary Playwright browser pass through title -> intro -> van/home/room/outside -> lab -> starter confirmation on desktop `1280x720` and mobile `390x844`; both passed with no horizontal or vertical overflow, no console errors, visible neighbor/bubble state, and working GLM confirmation.

## P1

- No open P1 issues from the current browser pass.

## P2

- No open P2 issues from the current browser pass.

## P3

- **Split large RPGJS/Pixi production chunks.**
  - Evidence: `npm run build` passes but warns that RPGJS/Pixi chunks exceed 500 kB after minification.
  - Suggested Linear title: `[P3] Split oversized RPGJS production chunks`
