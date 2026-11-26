# BATTLE-UI

The battle presentation on top of BATTLE-CORE (`docs/BATTLE_API.md`), plus the
starter-select screen.

```
src/game/scenes/BattleScene.ts        the scene: flow, event playback, menus, state hand-off
src/game/scenes/StarterSelectScene.ts satchel + three Prompt Orbs
src/game/battle/ui/constants.ts       layout (px) + timings (ms) + type colours: the tuning knobs
src/game/battle/ui/Stage.ts           field, sprites, HUDs, pips; intro/throw/pop/hit/faint/catch anims
src/game/battle/ui/Hud.ts             HP/EXP plates (drain, countdown, status tag, level flash, bob)
src/game/battle/ui/anims.ts           move animations (one per `anim` key, tinted by type)
src/game/battle/ui/menus.ts           command 2x2, move menu, level-up window, forget-move screen
src/game/battle/ui/util.ts            promise tweens/waits, generated FX textures, text fitting
src/game/battle/ui/starterSelect.ts   launchStarterSelect() for scripts
```

## Launching a battle

Use the engine, which runs the transition and the white-out:

```ts
await s.startBattle(request)          // ScriptApi (or s.wildBattle / s.trainerBattle / s.tutorialBattle)
await __llmmon.battle(request)        // debug hook (?debug=1)
```

Directly (plan §4.6): `scene.scene.launch('Battle', { request, onDone })`. The engine
leaves its UI fader black underneath; the battle fades itself in, and after its own
fade-out it calls `onDone(result)` and stops itself.

What the battle scene does with state (do not repeat it in scripts):

- the core mutates `state.party` (HP, PP, status, EXP, level, moves) and `state.bag`;
- `result.prize` is added with `state.addMoney`;
- a caught mon goes to `state.addMon` (party, or box when full) + `markSeen` / `markCaught`;
- every enemy sent out is `markSeen`;
- `lose` is just reported: the engine white-outs unless `request.safety`.

Kinds: `wild` (darkened slide-in, lights up, can run/catch), `trainer` (trainer slides
in with party pips, throws; reappears with the lose line + prize), `scripted`
(wild-style intro, `introText`, no run/catch, `safety` = can't lose).

Playtest hook: with `?debug=1`, `__llmmon.battleInfo()` returns `{ phase, text, box,
prompt, outcome, view }` while a battle runs. `phase` is one of `intro`, `text`,
`text-wait` (waiting for A), `command`, `moves`, `party`, `bag`, `bag-party`, `anim`,
`damage`, `faint`, `exp`, `levelup`, `learn-yesno`, `learn-pick`, `learn-stop`,
`catch`, `playback`, `end`. `?fast=1` zeroes every animation/hold (A is still needed on
`text-wait` lines; a whole battle takes ~2 s of mashing A).

## Starter select

```ts
import { launchStarterSelect } from '../battle/ui/starterSelect'
const id = await launchStarterSelect(s.game)   // 'claude_fable' | 'gpt_5_5' | 'glm'
```

or (what `content/story.ts` `chooseStarter` already does):
`game.scene.run('StarterSelect', { starters?, onDone: (id) => … })`.
The scene fades in over whatever is on screen, ←/→ picks an orb (it hops; the creature
fades in above it with name plate, type chip and its PromptDex line), A asks
"So, you want X, the T-type LLMMON?" YES/NO; YES fades out, reveals the field again and
resolves. B does nothing (the choice can't be skipped). It does not give the mon —
the script does. `__llmmon.starterInfo()` → `{ phase: 'browse'|'confirm'|…, index, id }`.

## Text pacing

Every core `text` event goes through `BattleScene.classify`:

- **wait** (▼, A to continue): the opening line, `appeared!` / `would like to battle!`,
  learned / did not learn, `Gotcha!`, PromptDex line, prize, trainer lose lines,
  "Got away safely!", "Can't escape!", white-out lines, catch-failure lines, the last
  line before `battle_end`.
- **auto**: everything else types out and stays for `TIMING.textHold` (fainted: +300 ms);
  the next animation starts right away while the line stays visible, and the hold is
  only paid before the *next* line or menu. Holding A/B skips holds and speeds typing.
- **held**: lines followed by an interactive step (level-up window, learn-move prompt).

Add a regex to `WAIT_LINES` in `BattleScene.ts` to make a new core line wait for A.

## Tuning constants (`constants.ts` → `TIMING`)

| knob | default | effect |
| --- | --- | --- |
| `slideIn` | 1050 | platforms + sprites slide in |
| `litUp` | 260 | wild mon brightens from its dark intro tint |
| `hudSlide` | 260 | HUD plates / pips slide |
| `textHold` | 560 | auto line hold after it finishes typing |
| `hpMsPerPx`, `hpMinMs` | 20, 260 | HP drain speed (48 px bar) |
| `expFullMs`, `expMinMs` | 1150, 300 | EXP fill for a full bar |
| `hitBlinks`, `faintMs` | 3, 360 | hit blink count; faint slide |
| `throwMs`, `popMs` | 520, 220 | orb arc; mon pop-out |
| `shakeGapMs`, `shakeMs` | 520, 360 | catch wobble rhythm |
| `trainerSlide`, `fadeOut`, `screenFade` | 420, 380, 140 | trainer slides, end fade, bag/party fades |

Measured (seed 3, ~350 ms human reaction per input): 3-turn wild battle with a level-up
≈ 35 s; the tutorial ≈ 25 s; catch sequence (3 shakes) ≈ 6 s. With `?fast=1` the same
battles take 1.5–4.5 s.

`LAYOUT` holds every screen position (sprites, platforms, plates, menus) and matches
`tools/art/sprites/preview/battle_0_*_4x.png`. HUD text anchors are in `Hud.ts` (`SPEC`).

## Move animations

`anims.ts`: `MOVE_ANIMS[anim]` is an async function receiving an `AnimCtx`
(`scene, stage, side, target, color, particle, moveId`). The `anim` key comes from the
move data (`strike quick heavy beam burst wave glitch buff debuff status heal`), the
colour from `TYPE_COLOR[moveType]`, the particle texture from `TYPE_PARTICLE[moveType]`
(`bfx/*`, generated in `util.ts`, white with a dark rim so the tint shows).

- One move looking different: add `MOVE_OVERRIDES.my_move = { anim?, color?, particle? }`.
- A brand-new effect: write `const zap: AnimFn = async (c) => { … }` with the helpers
  (`lunge`, `impact`, `particles`, `overlay`, `animate`, `tween`, `wait`), add it to
  `MOVE_ANIMS` under a new key and point the move (or an override) at it.
- New particle: add a pixel map to `ensureFxTextures` (`makeTex(scene, 'bfx/x', rows, palette)`).

Hits (blink + shake, `hit`/`hit_super`/`hit_weak`), stat arrows, status swirls,
faint, throws and catches live in `Stage.ts`.

## Audio used

Music: the engine starts `battle_wild` / `battle_trainer` before launch; the battle
switches to `victory` when the last enemy faints or on a catch, and fades music out on
run / lose. SFX: `orb_throw`, `hit`, `hit_super`, `hit_weak`, `faint`, `stat_up`,
`stat_down`, `exp` (loop while the bar fills), `level_up`, `item_get` (move learned),
`low_hp` (loop while the active mon is ≤ 25 % HP), `orb_shake`, `orb_catch`, `orb_break`,
`run`, `bump`, `select`, `cancel`, `text`.
