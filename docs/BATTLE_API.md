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
GLM used Graph Reason! [move_used][move_anim][damage] A critical hit! It's super effective!
Wild Gemma 4's Defense harshly fell!          Claude Fable's Defense won't go any higher!
Wild Gemma 4 fainted! [faint]  GLM gained 23 EXP! [exp_gain]
[level_up] GLM grew to Lv. 7!  GLM learned Graph Reason! [move_learned]
   or: GLM wants to learn Graph Reason! / But GLM already knows four moves. [learn_move_prompt]
       -> answer: 1, 2 and... Poof! / GLM forgot Graph Paw. [move_learned] / And GLM learned Graph Reason!
       -> null:   [move_not_learned] GLM did not learn Graph Reason.
You threw a Prompt Orb! [catch_throw][catch_shake]x3[catch_result] Gotcha! Gemma 4 was caught!
You defeated Young Founder Calvin! [trainer_reappear] My demo crashed on stage... / You got 96 tokens for winning!
You're out of LLMMON that can battle! / You hurried back to safety...
```

(Show "Forget a move to make room for X?" yes/no yourself before the move list.)

## 4. Types

Types are the **labs** that make the models, plus `classic` and `glitch`. One type
per species. Ids (also the chip ids: `public/assets/game/ui/type_<id>.png`, 32×12):

`anthropic` `openai` `google` `zhipu` `deepseek` `mistral` `moonshot` `cohere` `classic` `glitch`

| id | name | code | chip colour |
| --- | --- | --- | --- |
| anthropic | Anthropic | ANT | #d0642a (ROOF_ORANGE) |
| openai | OpenAI | OAI | #2a9490 (ROOF_TEAL) |
| google | Google | GGL | #3f6cc0 (ROOF_BLUE) |
| zhipu | Zhipu | ZHP | #6c54bc (ROOF_VIOLET) |
| deepseek | DeepSeek | DSK | #40507c (UI_FRAME) |
| mistral | Mistral | MST | #e8b830 (CLOTH_YELLOW) |
| moonshot | Moonshot | MSH | #58b257 (GRASS) |
| cohere | Cohere | COH | #946240 (WOOD) |
| classic | Classic | CLS | #84808e (ROCK) |
| glitch | Glitch | GLT | #c83c44 (CLOTH_PINK/RED) |

`TYPES[id]` has `name`, `short` (code), `color`, `blurb`.

**The whole rule:** every lab beats exactly two labs and is beaten by exactly two.
If A beats B, A's moves are 2× on B and B's moves are ½× on A. Nothing else among
labs. `classic` is 1× both ways (basic moves; later the component/historic
creatures like Perceptron and SGD). `glitch` is weak to every lab ("any real lab
can fact-check a hallucination"), hits `classic` 2× and resists itself. No immunities.

Starter triangle: **Anthropic > Zhipu > OpenAI > Anthropic** (Claude Fable > GLM > GPT 5.5 > Claude Fable).

The 16 arrows (`LAB_BEATS`, with Notebook reasons; `matchupReason(atk, def)` returns them):

| arrow | reason |
| --- | --- |
| Anthropic > Zhipu | A good story beats a proof: GLM gets lost in the plot. |
| Anthropic > Google | Claude asks Gemini for a source, and Gemini stops to search. |
| OpenAI > Anthropic | GPT fact-checks Claude's fable with a tool call mid-story. |
| OpenAI > Mistral | Function calls cut straight through the wind. |
| Google > DeepSeek | Search goes so deep it finds the bottom of any sea. |
| Google > Moonshot | A big telescope spots every moonshot before launch. |
| Zhipu > OpenAI | GLM maps the call graph before GPT finishes calling. |
| Zhipu > Moonshot | GLM graphs the moon's orbit and waits where Kimi lands. |
| DeepSeek > OpenAI | It thinks out loud for so long GPT runs out of effort. |
| DeepSeek > Cohere | A deep dive surfaces the answer before the rerank. |
| Mistral > Zhipu | A cool mistral breeze scatters the carefully drawn graph. |
| Mistral > DeepSeek | Wind from Paris whips the deep water into waves. |
| Moonshot > Anthropic | Claude stops mid-sentence to admire the moon. |
| Moonshot > Cohere | Kimi reads every document before Command can sort them. |
| Cohere > Mistral | Clear commands: even the wind follows instructions. |
| Cohere > Google | Rerank shuffles Google's results and it gets flustered. |

Chart (row = attacking move type, column = defender; blank = 1×):

| atk \ def | ANT | OAI | GGL | ZHP | DSK | MST | MSH | COH | CLS | GLT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Anthropic** |  | ½ | 2 | 2 |  |  | ½ |  |  | 2 |
| **OpenAI** | 2 |  |  | ½ | ½ | 2 |  |  |  | 2 |
| **Google** | ½ |  |  |  | 2 |  | 2 | ½ |  | 2 |
| **Zhipu** | ½ | 2 |  |  |  | ½ | 2 |  |  | 2 |
| **DeepSeek** |  | 2 | ½ |  |  | ½ |  | 2 |  | 2 |
| **Mistral** |  | ½ |  | 2 | 2 |  |  | ½ |  | 2 |
| **Moonshot** | 2 |  | ½ | ½ |  |  |  | 2 |  | 2 |
| **Cohere** |  |  | 2 |  | ½ | 2 | ½ |  |  | 2 |
| **Classic** |  |  |  |  |  |  |  |  |  |  |
| **Glitch** |  |  |  |  |  |  |  |  | 2 | ½ |

**Adding a lab later** (Meta, xAI, Alibaba, Microsoft): pick two arrows A > B and
C > D among four different labs and replace them with A > X > B and C > X > D.
X beats two and loses to two; every other lab keeps its own two-and-two.

### Moves by type

| type | moves (power; status moves have none) |
| --- | --- |
| Anthropic | Artifact 40, Extended Thinking 70, Constitution |
| OpenAI | Function Call 40, Reasoning Effort 75, Custom Instruction |
| Google | Multimodal Beam 40, Grounding 65, Long Context, TPU Slam 80 |
| Zhipu | Graph Reason 40, Blank Infill 70, Thinking Mode |
| DeepSeek | Expert Mix 50, Deep Think 75, Distill |
| Mistral | Tailwind 40 (+1), Le Chat 60, Cool Breeze |
| Moonshot | Agent Swarm 50, Moonshot 85, Orbit |
| Cohere | Retrieval 50, Rerank 65, Command |
| Classic | Warm Nudge 40, Prompt Pulse 40, Graph Paw 40, Autocomplete 40, Quick Reply 40 (+1), Small Talk, Pattern Guard, Jailbreak, Guardrail, Focus Token, Summarize, Long Preamble, Rate Limit, Retry Loop 50 |
| Glitch | Glitch Bite 40, Static Howl, Confabulate 40, Fake Citation, Prompt Injection, Token Flood 80 |

Each lab's top move is its family signature (Extended Thinking, Reasoning Effort,
Grounding, Blank Infill, Deep Think, Le Chat, Moonshot, Rerank).

### Renamed in data v2 (save migration)

`migrateSave(save)` (called by `GameState.readSave`, SAVE_VERSION 2) maps these ids
for saves with `version < 2`, drops unknown ids, clamps PP/HP/IVs/level, clears
non-persistent statuses and relearns level-appropriate moves if none are left.
It never throws. Types are not stored in saves.

| old id | new id | name |
| --- | --- | --- |
| `tiny_myth` | `artifact` | Artifact |
| `fable_flame` | `extended_thinking` | Extended Thinking |
| `logic_spark` | `graph_reason` | Graph Reason |
| `proof_step` | `blank_infill` | Blank Infill |
| `chain_of_thought` | `thinking_mode` | Thinking Mode |
| `tool_tap` | `function_call` | Function Call |
| `function_call` | `reasoning_effort` | Reasoning Effort |
| `web_search` | `grounding` | Grounding |
| `low_latency` | `tailwind` | Tailwind |
| `burst_decode` | `le_chat` | Le Chat |
| `overclock` | `cool_breeze` | Cool Breeze |
| `fork_strike` | `expert_mix` | Expert Mix |
| `weight_drop` | `tpu_slam` | TPU Slam |
| `community_patch` | `long_context` | Long Context |
| `pixel_beam` | `multimodal_beam` | Multimodal Beam |
| `flash_frame` | `grounding` | Grounding |

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

| # | id | name | type | HP/Atk/Def/SpA/SpD/Spe | BST | catch | Lv1 moves → later |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | claude_fable | Claude Fable | Anthropic | 52/42/55/62/60/41 | 312 | 45 | Warm Nudge, Guardrail → Artifact (7), Constitution (11), Summarize (15) |
| 2 | gpt_5_5 | GPT 5.5 | OpenAI | 46/60/46/52/45/61 | 310 | 45 | Autocomplete, Focus Token → Function Call (7), Jailbreak (11), Custom Instruction (15) |
| 3 | glm | GLM | Zhipu | 53/44/52/62/52/50 | 313 | 45 | Graph Paw, Pattern Guard → Graph Reason (7), Thinking Mode (11), Summarize (15) |
| 4 | gemma_4 | Gemma 4 | Google | 52/36/50/40/50/28 | 256 | 190 | Autocomplete, Small Talk → Multimodal Beam (4), Long Context (8), Grounding (12) |
| 5 | gpt_5_4_mini | GPT-5.4 mini | OpenAI | 34/40/30/36/30/68 | 238 | 200 | Autocomplete, Small Talk → Function Call (4), Quick Reply (7), Custom Instruction (11) |
| 6 | mistral_medium | Mistral Medium | Mistral | 42/40/40/42/38/56 | 258 | 170 | Autocomplete, Jailbreak → Tailwind (4), Le Chat (8), Cool Breeze (12) |
| 7 | gemini_flash | Gemini Flash | Google | 38/34/34/54/40/78 | 278 | 75 | Prompt Pulse, Small Talk → Multimodal Beam (4), Quick Reply (7), Grounding (11) |
| 8 | claude_haiku | Claude Haiku | Anthropic | 40/40/38/56/46/74 | 294 | 60 | Warm Nudge, Quick Reply → Artifact (4), Constitution (9), Extended Thinking (14) |
| 9 | hallucihound | HalluciHound | Glitch | 44/46/36/44/32/50 | 252 | 190 | Glitch Bite, Static Howl → Confabulate (5), Fake Citation (9), Prompt Injection (13) |
| 10 | claude_opus | Claude Opus | Anthropic | 92/68/85/112/100/55 | 512 | 25 | Warm Nudge, Guardrail, Artifact, Constitution → Extended Thinking (34), Summarize (40) |
| 11 | command_a | Command A | Cohere | 80/70/82/70/74/50 | 426 | 90 | Autocomplete, Focus Token, Retrieval, Command → Rerank (26), Summarize (32) |
| 12 | deepseek_flash | DeepSeek Flash | DeepSeek | 56/56/50/62/48/80 | 352 | 120 | Autocomplete, Quick Reply, Expert Mix → Distill (16), Deep Think (22) |
| 13 | deepseek_pro | DeepSeek Pro | DeepSeek | 88/70/84/100/84/48 | 474 | 45 | Expert Mix, Graph Paw, Pattern Guard → Distill (28), Deep Think (33), Summarize (42) |
| 14 | glm_max | GLM Max | Zhipu | 82/70/82/102/84/66 | 486 | 45 | Graph Paw, Graph Reason, Thinking Mode → Blank Infill (30), Summarize (36) |
| 15 | gpt_5_5_xhigh | GPT 5.5 xhigh | OpenAI | 82/110/76/106/76/45 | 495 | 25 | Function Call, Focus Token, Custom Instruction → Reasoning Effort (32), Quick Reply (40) |
| 16 | kimi | Kimi | Moonshot | 76/78/72/82/70/62 | 440 | 60 | Agent Swarm, Orbit, Small Talk → Summarize (29), Moonshot (34) |

Route 101 (`route_101`, 10% per grass step): Gemma 4 35%, GPT-5.4 mini 35%,
Mistral Medium 25% (Lv2-4), Gemini Flash 5% (Lv3-4). Every wild learns its lab move
at Lv4, so the chart matters on the route: Claude Fable beats Gemma/Gemini, GLM
beats GPT-5.4 mini, GPT 5.5 beats Mistral; GPT-5.4 mini threatens Claude Fable and
Mistral threatens GLM.
Trainers (each shows every starter a super-effective interaction):
`route_101_a` Young Founder Calvin (Gemma 4 Lv4, Mistral Medium Lv3, 96 tokens),
`route_101_b` Benchmarker Tiana (Mistral Medium Lv3, GPT-5.4 mini Lv3, 120 tokens).
Rival Dana (`rival_dana_<her starter>`): her counter-starter Lv5 (rematch Lv4) at
full PP + a Lv4 catch your starter beats.

Expected progression: tutorial (+15 EXP) + ~4 wilds or one trainer → Lv7
(lab move); both trainers + a few wilds → Lv8-9 at SoMa Node.
