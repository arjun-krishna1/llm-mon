# BATTLE-CORE API

Pure, deterministic battle logic and game data for LLMMON Mythos. No Phaser.

- Engine: `src/game/battle/core/` — import everything from `src/game/battle/core/index.ts`.
- Data: `src/game/data/` — species, moves, types, statuses, items, encounters, trainers
  (`src/game/data/index.ts`; the core barrel re-exports the lookups).
- Tests: `src/game/battle/core/__tests__/`, `src/game/data/__tests__/`.
  Balance report: `npx vitest run balance --silent=false`.

## 1. Quick start

```ts
import {
  Battle, createRng, createMon, tutorialBattleRequest, trainerBattleRequest,
  wildBattleRequest, rollEncounter, healParty, applyItemOutsideBattle,
} from '../battle/core/index.ts'

const rng = createRng(seed)                       // ?seed=N -> reproducible
state.party.push(createMon('glm', 5, rng))         // starter

// grass step
const wild = rollEncounter('route_101', rng, { repelActive, leadLevel })
if (wild) startBattle(wildBattleRequest(wild))

// trainer spotted you (show TRAINERS[id].preBattle in the overworld first)
startBattle(trainerBattleRequest('route_101_a', rng))

// rescue fight
startBattle(tutorialBattleRequest(rng))            // HalluciHound Lv2, safety on
```

### How a UI drives a battle

```ts
const battle = new Battle({ request, party: state.party, bag: state.bag, rng })
await play(battle.start())

while (battle.getPrompt().kind !== 'end') {
  const prompt = battle.getPrompt()
  let input: BattleInput
  if (prompt.kind === 'switch') input = { type: 'switch', partyIndex: await pickPartyMon({ cancel: false }) }
  else input = await actionMenu(battle.getView())   // FIGHT / BAG / LLMMON / RUN

  const why = battle.validate(input)                // UI-ready refusal text or null
  if (why) { await showText(why); continue }
  await play(battle.submit(input))
}
const result = battle.result!                       // { outcome, caught?, prize? }
if (result.prize) state.money += result.prize
if (result.caught) addToPartyOrPC(result.caught)
onDone(result)

async function play(events: BattleEvent[]) {
  for (const e of events) {
    if (e.type === 'learn_move_prompt') {
      // Use battle.getPrompt() for the *current* move list (earlier answers may have changed it).
      const p = battle.getPrompt() as Extract<BattlePrompt, { kind: 'learn_move' }>
      const slot = await askForgetMove(p.partyIndex, p.moveId, p.currentMoves) // 0-3 or null
      await play(battle.submit({ type: 'learn_move', forgetSlot: slot }))       // inline, then carry on
      continue
    }
    await present(e)  // text -> message box; everything else -> animation / sound
  }
}
```

Rules:

1. **Every message is a `text` event.** All other events are visual/audio cues
   and never carry text you must show. Text has no manual line breaks; wrap it
   to the two-line box yourself. Enemy names are prefixed `Wild ` / `Foe `.
2. A turn's event list is final. Learn-move prompts inside it must be answered,
   in order, as playback reaches them; the answer's events play inline. While a
   prompt is pending, `validate` rejects anything except `learn_move`.
3. The engine **mutates** `party` mons (hp, status, pp, exp, level, moves) and
   `bag` counts in place. Fainted mons stay at 0 HP after the battle.
   A caught mon is *not* added to the party; `result.caught` is the instance.
4. `battle.getView()` returns a copied snapshot for drawing (active mons with
   moves/PP/stages/EXP bar, party list, enemy party pips, canRun/canCatch).
   Use event fields (`hpBefore`/`hpAfter`, `expFrom`/`expTo`) for animation,
   not the snapshot, since the snapshot is already at the end-of-turn state.
5. Deterministic: same seed + same inputs -> identical events.

## 2. Inputs (`BattleInput`)

| input | when | notes |
| --- | --- | --- |
| `{ type: 'fight', moveIndex }` | prompt `action` | If every move has 0 PP, any index uses **Retry Loop** (Struggle: typeless 50 power, user loses 1/4 max HP). `battle.mustStruggle()` tells you. |
| `{ type: 'switch', partyIndex }` | `action` (costs the turn) or `switch` (forced, free) | |
| `{ type: 'item', itemId, target? }` | `action` | `target` = party index for medicine (default active). Orbs ignore it. Item is consumed. |
| `{ type: 'run' }` | `action` | Wild only; refused in trainer battles and when `canRun` is false. |
| `{ type: 'learn_move', forgetSlot }` | prompt `learn_move` | 0-3 replaces that move; `null` gives up. |

Prompts (`battle.getPrompt()`): `{kind:'action'}`, `{kind:'switch', forced:true}`
(after your active mon fainted; no cancel), `{kind:'learn_move', promptId,
partyIndex, moveId, currentMoves}`, `{kind:'end', result}`.

`validate()` messages you will see: "There's no PP left for this move!",
"No! There's no running from a trainer battle!", "You can't run from this battle!",
"You can't catch another trainer's LLMMON!", "It's too wild to catch right now!",
"It won't have any effect.", "That can't be used in battle!", "GLM is already in battle!",
"GLM has no energy left to battle!", "You don't have any Patch left."

Turn order: run → switch/item → moves (priority, then effective speed
(stage × 0.5 if rate-limited), ties random) → end-of-turn (context rot) →
faints/EXP → trainer sends next mon / forced switch / battle end.

## 3. Event reference (`BattleEvent`)

`side` is always `'player' | 'enemy'`. `MonView = { uid, speciesId, name, level, hp, maxHp, status, types }`.

| type | fields | UI suggestion (sfx ids from §4.7) |
| --- | --- | --- |
| `text` | `text` | message box, wait for A |
| `battle_start` | `kind`, `enemy: MonView`, `trainerName?`, `trainerSprite?` | transition wipe; show trainer sprite for trainer battles |
| `send_out` | `side`, `partyIndex`, `mon`, `fromOrb` | `fromOrb`: orb throw + pop (`orb_throw`); else wild slide-in. Show HUD. |
| `withdraw` | `side`, `partyIndex`, `mon` | recall beam, hide HUD |
| `move_used` | `side`, `moveId`, `moveName`, `moveType` | (follows "X used Y!") |
| `move_anim` | `side`, `moveId`, `anim`, `moveType`, `category`, `targetSelf` | play `anim` tinted by type chip colour; `targetSelf` → on user |
| `miss` | `side` (attacker), `targetSide` | target sidesteps |
| `damage` | `side` (victim), `partyIndex`, `amount`, `hpBefore`, `hpAfter`, `maxHp`, `effectiveness`, `crit`, `source` | hit flash + shake, drain bar. `hit_super` if effectiveness > 1, `hit_weak` if < 1, else `hit`. `source`: `move`/`struggle` (hit), `recoil`, `status` (context rot), `hallucination` (self-hit). `low_hp` when below 1/4. |
| `heal` | `side`, `partyIndex`, `amount`, `hpBefore`, `hpAfter`, `maxHp` | `heal`, fill bar (may be a benched party mon) |
| `status_applied` | `side`, `partyIndex`, `status` | status tag on HUD (`hallucinating` is volatile: show an icon/flicker, not the tag slot) |
| `status_cured` | `side`, `partyIndex`, `status` | clear tag |
| `cant_move` | `side`, `reason` (status id) | small status anim |
| `stat_change` | `side`, `stat`, `delta`, `stage` | `stat_up` / `stat_down`; `delta: 0` = already capped (no anim) |
| `faint` | `side`, `partyIndex` | `faint`, drop sprite, hide HUD |
| `exp_gain` | `partyIndex`, `amount`, `expFrom`, `expTo`, `levelStart`, `levelEnd`, `level` | `exp`; fill bar from `(expFrom-levelStart)/(levelEnd-levelStart)` to `(expTo-…)`. One event per level segment. Only animate if `partyIndex` is the active mon. |
| `level_up` | `partyIndex`, `level`, `statsBefore`, `statsAfter`, `deltas` | `level_up` jingle; stat-delta window (+N) then totals |
| `move_learned` | `partyIndex`, `moveId`, `forgotMoveId?` | |
| `learn_move_prompt` | `promptId`, `partyIndex`, `moveId`, `currentMoves` | **stop**, run the replace flow, `submit({type:'learn_move'})` (see §1) |
| `move_not_learned` | `partyIndex`, `moveId` | |
| `item_used` | `itemId`, `targetPartyIndex?` | |
| `catch_throw` | `itemId` | `orb_throw`, mon sucked in |
| `catch_shake` | `n` (1-3) | `orb_shake` wobble |
| `catch_result` | `caught`, `shakes` | `orb_catch` / `orb_break` (mon pops out) |
| `run_attempt` | `success` | `run` on success |
| `trainer_reappear` | `trainerName`, `trainerSprite` | defeated trainer slides back in; next `text` is their lose line |
| `battle_end` | `outcome` (`win`/`lose`/`run`/`caught`), `prize`, `caught?` | `victory` music on win; fade out, then `onDone(battle.result)` |

Typical text around events:

```
A wild Gemma 4 appeared! / Go! GLM!
GLM used Logic Spark! [move_used][move_anim][damage] A critical hit! It's super effective!
Wild Gemma 4's Defense harshly fell!          Claude Fable's Defense won't go any higher!
Wild Gemma 4 fainted! [faint]  GLM gained 23 EXP! [exp_gain]
[level_up] GLM grew to Lv. 7!  GLM learned Logic Spark! [move_learned]
   or: GLM wants to learn Logic Spark! / But GLM already knows four moves. [learn_move_prompt]
       -> answer: 1, 2 and... Poof! / GLM forgot Graph Paw. [move_learned] / And GLM learned Logic Spark!
       -> null:   [move_not_learned] GLM did not learn Logic Spark.
You threw a Prompt Orb! [catch_throw][catch_shake]x3[catch_result] Gotcha! Gemma 4 was caught!
You defeated Young Founder Calvin! [trainer_reappear] My demo crashed on stage... / You got 96 tokens for winning!
You're out of LLMMON that can battle! / You hurried back to safety...
```

(Show "Forget a move to make room for X?" yes/no yourself before the move list.)

## 4. Types

Ids (also the chip ids: `public/assets/game/ui/type_<id>.png`, 32×12):

`neutral` `myth` `logic` `tool` `speed` `open` `vision` `glitch`

| id | name | short | suggested colour | flavour |
| --- | --- | --- | --- | --- |
| neutral | Neutral | NEU | #a8a29a | plain completions |
| myth | Myth | MYT | #e08a3c | stories, character, persuasion |
| logic | Logic | LOG | #3fae8a | proofs, graphs, reasoning |
| tool | Tool | TOL | #3a8fd8 | function calls, search |
| speed | Speed | SPD | #f2c94c | low latency, small models |
| open | Open | OPN | #7bbf4a | open weights, sturdy |
| vision | Vision | VIS | #b86fd6 | multimodal eyes |
| glitch | Glitch | GLT | #d6456a | hallucinations, corruption |

Starter triangle: **myth > logic > tool > myth** (Claude Fable > GLM > GPT 5.5 > Claude Fable).
"A good story beats a proof; reasoning outsmarts a tool loop; grounding with tools debunks a myth."

Chart (row = attacking move type, column = defender; blank = 1×):

| atk \ def | neu | myth | logic | tool | speed | open | vision | glitch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **neutral** | | | | | | | | |
| **myth** | | ½ | 2 | ½ | | 2 | | |
| **logic** | | ½ | ½ | 2 | | | | 2 |
| **tool** | | 2 | ½ | | 2 | ½ | | |
| **speed** | | | | | ½ | ½ | 2 | 2 |
| **open** | | | | 2 | 2 | | ½ | |
| **vision** | | 2 | | | ½ | | | 2 |
| **glitch** | 2 | | 2 | | | ½ | 2 | ½ |

Mnemonics: open weights wear down tools and sprinters; speed outruns vision and
glitches; vision sees through myths and glitches; glitch corrupts plain models,
logic and vision but can't fool inspectable open weights. Dual types multiply
(0.25×–4×). No immunities in the chart.

## 5. Statuses

| id | name | HUD tag | effect |
| --- | --- | --- | --- |
| `rate_limited` | Rate-limited | RTL | speed ×0.5; 25% chance to lose the turn |
| `context_rot` | Context rot | ROT | loses 1/8 max HP at end of turn |
| `timed_out` | Timed out | T/O | can't move for 1-3 turns, then reconnects |
| `hallucinating` | Hallucinating | HAL | *volatile* (battle only, clears on switch): 2-5 turns; 1/3 chance it attacks itself (40 power). Glitch types are immune. |

The first three persist on `MonInstance.status` after battle (cure with
Debugger or a Model Center heal). One major status at a time. Catch bonus:
timed out ×2, rate-limited/context rot ×1.5.

## 6. Formulas

- Stats (IV 0-15): `HP = floor((2B+2IV)·L/100) + L + 10`, others `floor((2B+2IV)·L/100) + 5`.
- Stages −6..+6: `(2+s)/2` or `2/(2−s)`; accuracy/evasion `(3+s)/3` / `3/(3−s)`.
- Damage: `floor(floor(floor(2L/5+2)·P·A/D)/50) + 2`, then ×1.5 crit (1/16, 1/8 high-crit;
  ignores bad own / good foe stages), ×0.85–1.00 random, ×1.5 STAB, ×type; min 1.
  Physical = atk/def, special = spa/spd (per move).
- EXP: `floor(base·L/7)`, ×1.5 trainer, split across non-fainted participants.
  Curves: fast `0.8n³`, medium_fast `n³`, medium_slow `1.2n³−15n²+100n−140`, slow `1.25n³`.
- Catch: `a = (3M−2H)·rate·orb/(3M)·statusBonus`; `b = 1048560/√√(16711680/a)`;
  four checks `rand(65536) < b`; shakes shown = passes (max 3); caught = 4 passes.
- Run: faster always escapes; else `(spe·128/foeSpe + 30·attempts)/256`.

## 7. Helpers

| export | |
| --- | --- |
| `createMon(speciesId, level, rng, { moves?, nickname?, ivs? })` | fresh `MonInstance` at full HP, last 4 learnset moves |
| `calcStats(mon)`, `maxHp(mon)`, `displayName(mon)`, `isFainted(mon)` | |
| `expForLevel(growth, level)`, `levelForExp`, `expProgress(mon)` | `expProgress` → `{ levelStart, levelEnd, exp, fraction }` for the summary EXP bar |
| `addExp(mon, n)` → `LevelUpStep[]`, `learnMove(mon, id, slot?)`, `movesLearnedAt(speciesId, level)` | for out-of-battle EXP (moves are not auto-taught) |
| `healMon(mon)`, `healParty(party)` | full HP, cure, full PP |
| `applyItemOutsideBattle(itemId, mon)` → `{ ok, message, hpBefore?, hpAfter?, curedStatus? }` | mutates mon; **you** decrement the bag when `ok` |
| `rollEncounter(tableId, rng, { force?, repelActive?, leadLevel? })` → `MonInstance \| null` | call once per grass step (includes the step chance) |
| `wildBattleRequest(mon, overrides?)`, `trainerBattleRequest(trainerId, rng, overrides?)`, `tutorialBattleRequest(rng, level=2)` | `BattleRequest` builders |
| `getSpecies` / `getMove` / `getItem` / `getTrainer` / `getEncounterTable` | throw on unknown ids |
| `createRng(seed)` → `SeededRng` (`next()`, `getState()`, `setState()`) | any `{ next(): number }` works as an `Rng` |
| `catchOdds`, `computeDamage`, `damageRange`, `escapeChance`, `expYield` | raw maths |

Data tables: `SPECIES`, `SPECIES_IDS` (dex order), `STARTER_IDS`, `MOVES`,
`ITEMS`, `TRAINERS`, `ENCOUNTER_TABLES`, `TYPES`, `TYPE_IDS`, `STATUSES`.
Trainer defs also have `preBattle[]` (overworld, before battle), `postBattle[]`
(talk after), `overworldSprite`, `trainerClass`, `name`; the request's
`trainer.name` is `"<class> <name>"`.

Items: `prompt_orb` (200, catch ×1), `great_orb` (600, ×1.5), `patch` (300, +20 HP),
`big_patch` (700, +50 HP), `debugger` (250, cure any status), `firewall`
(350, repel 100 steps — engine tracks steps; field only), key items
`promptdex`, `fast_tokens`.

Shared type additions (`src/game/types.ts`): `BattleRequest.introText?`,
`BattleResult.prize?`, `BattleRequest.fleeOnDefeat?` / `defeatText?` (the defeated enemy
runs off: `defeatText` replaces "X fainted!" and the `faint` event has `fled: true`; set by
`tutorialBattleRequest`).

## 8. Roster

| # | id | name | types | BST | catch | growth | Lv1 moves → notable later |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | claude_fable | Claude Fable | myth | 312 | 45 | medium_slow | Warm Nudge, Guardrail → Tiny Myth (7), Constitution (11) |
| 2 | gpt_5_5 | GPT 5.5 | tool | 310 | 45 | medium_slow | Autocomplete, Focus Token → Tool Tap (7), Jailbreak (11) |
| 3 | glm | GLM | logic | 310 | 45 | medium_slow | Graph Paw, Pattern Guard → Logic Spark (7), Chain of Thought (11) |
| 4 | gemma_4 | Gemma 4 | open | 252 | 190 | medium_fast | Autocomplete, Small Talk → Fork Strike (5) |
| 5 | gpt_5_4_mini | GPT-5.4 mini | speed/tool | 242 | 200 | fast | Autocomplete, Small Talk → Low Latency (5) |
| 6 | mistral_medium | Mistral Medium | speed/open | 260 | 170 | medium_fast | Autocomplete, Jailbreak → Low Latency (5) |
| 7 | gemini_flash | Gemini Flash | speed/vision | 284 | 75 | medium_fast | Prompt Pulse, Small Talk → Low Latency (5), Pixel Beam (7) |
| 8 | claude_haiku | Claude Haiku | myth/speed | 298 | 60 | medium_slow | Warm Nudge, Quick Reply → Tiny Myth (6) |
| 9 | hallucihound | HalluciHound | glitch | 252 | 190 | medium_fast | Glitch Bite, Static Howl → Confabulate (5), Fake Citation (9) |
| 10-16 | claude_opus, command_a, deepseek_flash, deepseek_pro, glm_max, gpt_5_5_xhigh, kimi | | later-game, BST 350-512 | | | | |

Route 101 (`route_101`, 10% per grass step): Gemma 4 35%, GPT-5.4 mini 35%,
Mistral Medium 25% (Lv2-4), Gemini Flash 5% (Lv3-4). Route wilds only know
neutral moves below Lv5, so the starter's type advantage is what changes.
Trainers: `route_101_a` Young Founder Calvin (Gemma 4 Lv4, 96 tokens),
`route_101_b` Benchmarker Tiana (GPT-5.4 mini Lv3, Mistral Medium Lv4, 120 tokens).

Expected progression: tutorial (+15 EXP) + ~4 wilds or one trainer → Lv7
(type move); both trainers + a few wilds → Lv8-9 at SoMa Node.
