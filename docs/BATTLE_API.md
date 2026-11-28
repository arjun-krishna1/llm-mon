# BATTLE-CORE API

Pure, deterministic battle logic and game data for LLMMON Mythos. No Phaser.

- Engine: `src/game/battle/core/` — import everything from `src/game/battle/core/index.ts`.
- Data: `src/game/data/` — species/roster, learnsets, moves, types, statuses, abilities, items,
  encounters, trainers, tutors (`src/game/data/index.ts`; the core barrel re-exports the lookups).
- Tests: `src/game/battle/core/__tests__/`, `src/game/data/__tests__/`.
  Reports: `npx vitest run balance --silent=false` (Route 101), `npx vitest run rival --silent=false`,
  `npx vitest run gyms --silent=false` (every gym, League, Team Overfit, rival 2 and finale fight).
- Roster with stats, learnsets, abilities and art briefs: `docs/ROSTER.md` (generated).

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
startBattle(trainerBattleRequest('gym1_leader', rng))   // arena rules, AI tier, items come from the trainer

// rescue fight
startBattle(tutorialBattleRequest(rng))            // HalluciHound Lv2, safety on
```

### How a UI drives a battle

```ts
const battle = new Battle({ request, party: state.party, bag: state.bag, rng,
  context: { badges: state.badges, evalLight: false } })   // badges: evolution conditions
await play(battle.start())

while (battle.getPrompt().kind !== 'end') {
  const prompt = battle.getPrompt()
  let input: BattleInput
  if (prompt.kind === 'switch') input = { type: 'switch', partyIndex: await pickPartyMon({ cancel: false }) }
  else if (prompt.kind === 'evolve') input = { type: 'evolve', accept: await evolutionScene(prompt) }   // B = false
  else input = await actionMenu(battle.getView(), prompt.disabled)   // FIGHT / BAG / LLMMON / RUN (+ arena controls)

  const why = battle.validate(input)                // UI-ready refusal text or null
  if (why) { await showText(why); continue }
  await play(battle.submit(input))
}
const result = battle.result!                       // { outcome, caught?, prize?, evolved?, dexRegister? }
if (result.prize) state.money += result.prize
if (result.caught) addToPartyOrPC(result.caught)
for (const id of result.dexRegister ?? []) dex.markCaught(id)
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
   prompt is pending, `validate` rejects anything except its answer.
3. **Evolution happens after `battle_end`.** The prompt then becomes `evolve`
   (one per evolving mon, in party order) until each is answered; it can be followed
   by learn-move prompts for the new form. The battle is over only when the prompt is `end`.
   A UI that treats "not `switch`" as "show the action menu" will loop forever here.
4. The engine **mutates** `party` mons (hp, status, pp, exp, level, moves, species on
   evolution, held items used up, bond) and `bag` counts in place. Fainted mons stay at
   0 HP after the battle. A caught mon is *not* added to the party; `result.caught` is the instance.
5. `battle.getView()` returns a copied snapshot of the **true** state for drawing (active mons
   with moves/PP/stages/EXP bar, party list, enemy party pips, canRun/canCatch, `arena`).
   Use event fields (`hpBefore`/`hpAfter`, `expFrom`/`expTo`) for animation,
   not the snapshot, since the snapshot is already at the end-of-turn state.
   Interface-tamper events (§10) are display-only lies layered over this.
6. Deterministic: same seed + same inputs -> identical events.

## 2. Inputs (`BattleInput`) and prompts

| input | when | notes |
| --- | --- | --- |
| `{ type: 'fight', moveIndex }` | prompt `action` | If every move has 0 PP, any index uses **Retry Loop** (Struggle: typeless 50 power, user loses 1/4 max HP). `battle.mustStruggle()` tells you. |
| `{ type: 'switch', partyIndex }` | `action` (costs the turn) or `switch` (forced, free) | Proxy copies (§10) can never be picked. |
| `{ type: 'item', itemId, target? }` | `action` | `target` = party index for medicine (default active). Orbs ignore it. Item is consumed (the `probe` key item is not). |
| `{ type: 'run' }` | `action` | Wild only; refused in trainer battles and when `canRun` is false. |
| `{ type: 'learn_move', forgetSlot }` | prompt `learn_move` | 0-3 replaces that move; `null` gives up. |
| `{ type: 'evolve', accept }` | prompt `evolve` | `false` = the player pressed B: `evolve_cancelled`. |
| `{ type: 'set_temperature', value }` | `action`, rule `temperature` | **Free action** (no turn passes). 0..2, rounded to 0.1. |
| `{ type: 'set_eval_light', on }` | `action`, rule `eval_light` or finale phase 1 | **Free action**: the Eval Suite. |

Prompts (`battle.getPrompt()`):

| kind | fields | |
| --- | --- | --- |
| `action` | `disabled?: ('fight'\|'bag'\|'switch'\|'run')[]` | grey those commands out (finale phase 3); `validate` rejects them ("RUN is greyed out!", "The BAG is greyed out!", "Switching is greyed out!"). The Probe stays usable. |
| `switch` | `forced: true` | after your active mon fainted; no cancel |
| `learn_move` | `promptId, partyIndex, moveId, currentMoves` | |
| `evolve` | `promptId, partyIndex, from, to` | only after `battle_end`; see rule 3 |
| `end` | `result` | |

`validate()` messages you will see: "There's no PP left for this move!",
"No! There's no running from a trainer battle!", "You can't run from this battle!",
"You can't catch another trainer's LLMMON!", "It's too wild to catch right now!",
"It slips through every prompt you write." (Proxy), "It won't have any effect.",
"That can't be used in battle!", "GLM is already in battle!", "GLM has no energy left to battle!",
"You don't have any Patch left.", "That slot is occupied by a copy of Proxy!",
"Watch the evolution first.", "There is no dial here."

Turn order: run → switch/item (player, then enemy) → moves (priority, then the
Low-Latency Band's 20% jump, then effective speed (stage, ×0.5 rate-limited, ×1.2 Low
Latency), ties random) → end-of-turn (context rot, Skip Connection/Heat Sink, Normalization,
Weight Decay, arena upkeep) → faints/EXP → finale phase upkeep → trainer sends next mon /
forced switch / battle end → (after a win or catch) evolution prompts.

## 3. Event reference (`BattleEvent`)

`side` is always `'player' | 'enemy'`. `MonView = { uid, speciesId, name, level, hp, maxHp, status, types }`.

| type | fields | UI suggestion (sfx ids from §4.7 of the slice plan) |
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

### Stage 1 events (abilities, items, evolution, arena, finale)

| type | fields | UI suggestion | rendered by BattleScene? |
| --- | --- | --- | --- |
| `ability` | `side, partyIndex, abilityId, abilityName` | ability banner over that side's HUD (~1 s); the `text` that follows explains the effect | **no** |
| `held_item` | `side, partyIndex, itemId, itemName, consumed` | item icon pop; "X's Cache Berry activated!" text follows; `consumed` = remove the held icon | **no** |
| `protect` | `side` | shield flash on that side (Early Stopping, Drop Units, Polite Refusal) | **no** |
| `damage.bench` | `true` when smart targeting hit a benched mon (`partyIndex` is not the active one) | shake that party slot / show a small bench HP pip | **no** |
| `damage.hidden` | `true` under `hidden_numbers` | hide any numeric HP readout; animate the bar only | **no** |
| `faint` (bench) | `partyIndex` not active | grey that party pip; no sprite drop | **no** |
| `evolve_start` | `promptId, partyIndex, from, to` | evolution scene: flashing silhouette alternating `from`/`to` sprites, `evolve` music; then wait for the `evolve` prompt (B cancels) | **no** |
| `evolve_done` | `partyIndex, from, to, mon` | reveal the new sprite, fanfare | **no** |
| `evolve_cancelled` | `partyIndex, from, to` | stop the scene on the old sprite | **no** |
| `dex_register` | `speciesId` | mark seen+caught (also in `result.dexRegister`) | **no** (BattleScene only registers catches itself) |
| `form_change` | `side, partyIndex, from, to, mon` | swap the sprite with a flash (base model fine-tuned, Proxy phases); redraw HUD from `mon` | **no** |
| `arena_rule` | `ruleId, name` | rule banner at battle start (`text` with the rule's line follows) | **no** |
| `arena_table` | `table: { playerMove, enemyMove }[]` | the bigram table panel (also `view.arena.bigramTable`) | **no** |
| `arena_budget` | `remaining, max, cost, side, cutOff` | token meter; `cutOff` = the move name is shown truncated (text explains) | **no** |
| `arena_temperature` | `value` (0..2) | the dial; the player turns it with `set_temperature` | **no** (no input either) |
| `move_hallucinated` | `side, fromMoveId, toMoveId` | glitch the move name from one to the other | **no** |
| `stages_reset` | `sides` | stat-arrow wipe on those sides | **no** |
| `copy_move` | `side, moveId, replacedMoveId` | "copied" sparkle; the enemy's move list changed | **no** |
| `eval_light` | `on` | EVAL lamp in the arena on/off (also `view.arena.evalLight`); the player toggles it with `set_eval_light` | **no** (no input either) |
| `phase_change` | `phase` (1-4) | finale phase card / music change | **no** |
| `tamper_hp` | `side, shownHp, maxHp` | **display only**: draw that HP bar at `shownHp` until `tamper_reveal` (true HP is in damage events and `getView()`) | **no** |
| `tamper_label` | `moveIndex, shownName` | **display only**: show that move button with the wrong name until `tamper_reveal` | **no** |
| `tamper_text` | `shownText` | **display only**: replace the next effectiveness line ("It's super effective!" / "not very effective") with this one | **no** |
| `tamper_reveal` | — | drop every tampered display; redraw from `getView()` | **no** |
| `input_disabled` | `inputs` | grey out those command buttons (also `prompt.disabled`, `view.arena.disabled`) | **no** |
| `copy_spawn` | `slot, mon` | a Proxy copy occupies party slot `slot` (party screen: show it, never selectable) | **no** |
| `key_turn` | `turned, needed, available` | keyhole row; one key turns | **no** |
| `obedience_check` | `partyIndex, passed` | small heart/hesitate icon over your mon | **no** |
| `item_used.side` | `'enemy'` when the trainer used it | show it on the enemy side | partly (no side) |

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

New lines you will see: `Foe Perceptron starts from random weights.` / `... took a step of descent!`,
`Foe MLP saw that coming!`, `Extended Thi... The tokens ran out mid-move!`,
`GLM meant to use Graph Reason, but sampled Summarize!`, `GLM isn't sure that's a good idea, and politely declines.`,
`Foe HalluciHound never saw that in training!`, `What? GLM is evolving!` / `Congratulations! Your GLM evolved into GLM Plus!` /
`Huh? GLM stopped evolving!`, `Claude Opus's Cache Berry activated!`.

## 4. Types

Types are the **labs** that make the models, plus `classic` and `glitch`. One type
per species. Ids (also the chip ids: `public/assets/game/ui/type_<id>.png`, 32×12, built by
`tools/art/sprites/ui.py build_type_chips()`):

| id | name | code | chip colour |
| --- | --- | --- | --- |
| anthropic | Anthropic | ANT | #d0642a |
| openai | OpenAI | OAI | #2a9490 |
| google | Google | GGL | #3f6cc0 |
| zhipu | Zhipu | ZHP | #6c54bc |
| deepseek | DeepSeek | DSK | #40507c |
| mistral | Mistral | MST | #e8b830 |
| moonshot | Moonshot | MSH | #58b257 |
| cohere | Cohere | COH | #946240 |
| xai | xAI | XAI | #363a4c |
| meta | Meta | MTA | #6ca8d4 |
| microsoft | Microsoft | MSF | #c04444 |
| alibaba | Alibaba | ALI | #e09c74 |
| classic | Classic | CLS | #84808e |
| glitch | Glitch | GLT | #e06c98 |

`TYPES[id]` has `name`, `short` (code), `color`, `blurb`. `LAB_TYPE_IDS` lists the 12 labs.

**The whole rule:** every lab beats exactly two labs and is beaten by exactly two.
If A beats B, A's moves are 2× on B and B's moves are ½× on A. Nothing else among
labs. `classic` is 1× both ways. `glitch` is weak to every lab ("any real lab
can fact-check a hallucination"), hits `classic` 2× and resists itself. No immunities.

Starter triangle: **Anthropic > Zhipu > OpenAI > Anthropic** (Claude Fable > GLM > GPT 5.5 > Claude Fable).

**How the four new labs went in (two-arrow insertion rule).** Pick two arrows A > B and
C > D among four different labs and replace them with A > X > B and C > X > D; X beats two
and loses to two and every other lab keeps its own two-and-two. Done in stage 1 (arrows the
starters, Route 101 and the rival rely on were left alone; `typechart.test.ts` locks this):

| new lab | replaced | now |
| --- | --- | --- |
| xAI | Google > DeepSeek, Moonshot > Cohere | Google > xAI > DeepSeek, Moonshot > xAI > Cohere |
| Meta | Google > Moonshot, DeepSeek > Cohere | Google > Meta > Moonshot, DeepSeek > Meta > Cohere |
| Microsoft | Zhipu > Moonshot, Cohere > Mistral | Zhipu > Microsoft > Moonshot, Cohere > Microsoft > Mistral |
| Alibaba | DeepSeek > OpenAI, Cohere > Google | DeepSeek > Alibaba > OpenAI, Cohere > Alibaba > Google |

The 24 arrows (`LAB_BEATS`, with Notebook reasons; `matchupReason(atk, def)` returns them either way round):

| arrow | reason |
| --- | --- |
| Anthropic > Zhipu | A good story beats a proof: GLM gets lost in the plot. |
| Anthropic > Google | Claude asks Gemini for a source, and Gemini stops to search. |
| OpenAI > Anthropic | GPT fact-checks Claude's fable with a tool call mid-story. |
| OpenAI > Mistral | Function calls cut straight through the wind. |
| Google > xAI | Grok's hot take meets a calm search result. |
| Google > Meta | A big search finds every llama on the trail. |
| Zhipu > OpenAI | GLM maps the call graph before GPT finishes calling. |
| Zhipu > Microsoft | GLM graphs the whole textbook before Phi turns a page. |
| DeepSeek > Alibaba | Open rivals trade tricks; today the deep thinker wins. |
| DeepSeek > Meta | Deep water slows down even the fluffiest llama. |
| Mistral > Zhipu | A cool mistral breeze scatters the carefully drawn graph. |
| Mistral > DeepSeek | Wind from Paris whips the deep water into waves. |
| Moonshot > Anthropic | Claude stops mid-sentence to admire the moon. |
| Moonshot > xAI | A night raven flies by moonlight, not against it. |
| Cohere > Microsoft | Command cites the page Phi was about to quote. |
| Cohere > Alibaba | Rerank files Qwen's hundred languages into neat folders. |
| xAI > DeepSeek | The raven dives fast enough to catch fish in the deep. |
| xAI > Cohere | Grok answers before Command has finished filing. |
| Meta > Moonshot | The herd's long trail reaches the moon first. |
| Meta > Cohere | So many open weights that Command cannot file them all. |
| Microsoft > Moonshot | Phi read the astronomy textbook and knows where Kimi lands. |
| Microsoft > Mistral | Phi studied the wind charts: Mistral's gusts are on the exam. |
| Alibaba > OpenAI | Qwen answers GPT's question in a hundred languages. |
| Alibaba > Google | Qwen out-translates the search box. |

Chart (row = attacking move type, column = defender; blank = 1×):

| atk \ def | ANT | OAI | GGL | ZHP | DSK | MST | MSH | COH | XAI | MTA | MSF | ALI | CLS | GLT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Anthropic** |  | ½ | 2 | 2 |  |  | ½ |  |  |  |  |  |  | 2 |
| **OpenAI** | 2 |  |  | ½ |  | 2 |  |  |  |  |  | ½ |  | 2 |
| **Google** | ½ |  |  |  |  |  |  |  | 2 | 2 |  | ½ |  | 2 |
| **Zhipu** | ½ | 2 |  |  |  | ½ |  |  |  |  | 2 |  |  | 2 |
| **DeepSeek** |  |  |  |  |  | ½ |  |  | ½ | 2 |  | 2 |  | 2 |
| **Mistral** |  | ½ |  | 2 | 2 |  |  |  |  |  | ½ |  |  | 2 |
| **Moonshot** | 2 |  |  |  |  |  |  |  | 2 | ½ | ½ |  |  | 2 |
| **Cohere** |  |  |  |  |  |  |  |  | ½ | ½ | 2 | 2 |  | 2 |
| **xAI** |  |  | ½ |  | 2 |  | ½ | 2 |  |  |  |  |  | 2 |
| **Meta** |  |  | ½ |  | ½ |  | 2 | 2 |  |  |  |  |  | 2 |
| **Microsoft** |  |  |  | ½ |  | 2 | 2 | ½ |  |  |  |  |  | 2 |
| **Alibaba** |  | 2 | 2 |  | ½ |  |  | ½ |  |  |  |  |  | 2 |
| **Classic** |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| **Glitch** |  |  |  |  |  |  |  |  |  |  |  |  | 2 | ½ |

### Moves by type (126 moves)

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
| xAI | Hot Take 45, Fun Mode, Big Brain 75, Heavy Thinking 95 |
| Meta | Herd Charge 45, Fleece Wall, Long Trail 70, Behemoth Stomp 90 |
| Microsoft | Textbook Answer 45, Study Session, Small Wonder 70 |
| Alibaba | Polyglot Beam 45, Coder Strike 70, Thousand Tongues 80 |
| Classic | Warm Nudge 40, Prompt Pulse 40, Graph Paw 40, Autocomplete 40, Quick Reply 40 (+1), Small Talk, Pattern Guard, Jailbreak, Guardrail, Focus Token, Summarize, Long Preamble, Rate Limit, Backprop 60, Big Batch 70, Brute Force 85, Next Token 55, Loss Spike 95, Knowledge Transfer 60, Early Stopping (+3), Regularize, Fact Check, Add Noise, Augment, Clickbait, Stale Cache, Param Sweep, Adaptive Step, Look Ahead 50 (+1), Warmup, Weight Decay, Descent 45, Squash 50, Rectify 65, Smooth Curve 75, Fire 40, Hidden Layer, Residual Strike 75, Drop Units (+3), Normalize, Normalize Odds 55, Sample 65, Bigram Bite 45, Embed 60, Analogy 75, Mask Fill 80, Seq2Seq 85, Long Memory, Forget Gate, Recur 50, Attend 70, Multi-Head 90, Dilate 65, Convolve 55, Max Pool 75, Generate 75, Adversarial 80, Merge 65, Byte Bite 30 (+1), Subword Split 60, Low Rank 60, Quantize, Prune 70, Polite Refusal (+3), Preference Shift, Self-Critique, Reward Model 70, Red Team 80, Content Filter, Zero to Hero 95, Reflect Back 50, Ancestral Light 100, ImageNet Roar 100, Self-Attention 110, Move 37 100, Two Years Away 120 |
| Glitch | Glitch Bite 40, Static Howl, Confabulate 40, Fake Citation, Prompt Injection, Overfit Slam 90, Goodhart's Law, Score Hack, Leaderboard 100, Token Flood 80 |

total moves 126

Each lab's top move is its family signature (Extended Thinking, Reasoning Effort,
Grounding, Blank Infill, Deep Think, Le Chat, Moonshot, Rerank, Heavy Thinking, Behemoth Stomp,
Small Wonder, Thousand Tongues). Component creatures have thematic Classic moves (Adaptive Step,
Look Ahead, Rectify, Squash, Drop Units, Normalize, Normalize Odds, Sample, Bigram Bite, Convolve,
Merge, Low Rank...). Moves may carry `role` (teaching tag), `protect`, `resetStages`, `cleanseSelf`,
`obey`, `drainFraction`, `recoilFraction`, `healFraction`, `highCrit`.

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
  ignores bad own / good foe stages), ×0.85–1.00 random, ×1.5 STAB, ×type, × ability / held item /
  arena multipliers; min 1. Physical = atk/def, special = spa/spd (per move).
- **STAB never applies to Classic moves** (stage 1): they are the basics anyone can learn, so
  Classic creatures (components, historic models) win on stats, movesets and evolution. Exception:
  the `pioneer` ability (legendary ancestors) gets a 2× Classic STAB. Polyglot turns Classic moves
  into its lab type first, so they do get STAB.
- EXP: `floor(base·L/7)`, ×1.5 trainer, split across non-fainted participants (×1.5 Eval Report).
  Curves: fast `0.8n³`, medium_fast `n³`, medium_slow `1.2n³−15n²+100n−140`, slow `1.25n³`.
- Catch: `a = (3M−2H)·rate·orb/(3M)·statusBonus`; `b = 1048560/√√(16711680/a)`;
  four checks `rand(65536) < b`; shakes shown = passes (max 3); caught = 4 passes.
- Run: faster always escapes; else `(spe·128/foeSpe + 30·attempts)/256`.

## 7. Abilities (one per species, 31)

Mechanics live in `battle.ts` (search for the id). When one triggers the engine emits an
`ability` event (banner) and usually a `text`. Passive multipliers (Low Latency, Fleece,
Overconfident...) do not pop up.

| id | name | effect |
| --- | --- | --- |
| `deep_reserve` | Deep Reserve | Moves of its own lab hit 1.5x harder when its HP is at 1/3 or less. |
| `warm_start` | Warm Start | Raises its Speed by 1 when it enters battle. |
| `constitutional` | Constitutional | Cannot be made to hallucinate, and ignores commands to obey the foe. |
| `tool_use` | Tool Use | Its status moves go first. |
| `long_context` | Long Context | Restores 1/8 of its max HP when it switches out. |
| `open_weights` | Open Weights | Super-effective hits do 25% less damage to it. |
| `graph_mind` | Graph Mind | Raises its Sp. Atk by 1 after it lands a super-effective hit. |
| `low_latency` | Low Latency | Its Speed is 20% higher. |
| `caching` | Caching | Repeating the move it used last turn costs no PP and hits 10% harder. |
| `long_horizon` | Long Horizon | Hits 10% harder for each turn it has stayed in (up to +50%). |
| `citation` | Citation | Its attacks ignore the foe's Defense and Sp. Def boosts and evasion. |
| `fleece` | Fleece | Physical hits do 25% less damage to it. |
| `edgy` | Edgy | Lands critical hits twice as often. |
| `polyglot` | Polyglot | Its Classic moves become its own type and hit 20% harder. |
| `textbook` | Textbook | Hits 20% harder against a higher-level foe. |
| `pretrained` | Pretrained | Raises its best stat by 1 when it enters battle. |
| `attention` | Attention | Its accuracy cannot be lowered, and it ignores the foe's evasion. |
| `momentum` | Momentum | Using the same move turn after turn adds 20% power each time (up to +60%). |
| `gradient_clip` | Gradient Clip | No single hit can take more than half its max HP. |
| `weight_decay` | Weight Decay | At the end of each turn, every stat boost on the foe drops by 1. |
| `saturation` | Saturation | At full HP, it survives a knockout hit with 1 HP. |
| `clear_signal` | Clear Signal | Foes cannot lower its stats. |
| `skip_connection` | Skip Connection | Restores 1/16 of its max HP at the end of each turn. |
| `normalization` | Normalization | Its lowered stats return to normal at the end of each turn. |
| `dropout` | Dropout | Dodges 10% of attacks outright. |
| `stochastic` | Stochastic | Its damage rolls swing wider: anywhere from 70% to 115%. |
| `compressed` | Compressed | Every other move it uses costs no PP. |
| `pioneer` | Pioneer | An ancestor of the field: even its Classic moves get a same-type bonus, and that bonus is 2x instead of 1.5x. |
| `move_37` | Move 37 | The first attack it makes in a battle is always a critical hit. |
| `overconfident` | Overconfident | Hits 25% harder but its accuracy is 10% lower. |
| `goodhart` | Goodhart | Any stat boost it gains is doubled. |

## 8. Items

| id | name | pocket | price | effect |
| --- | --- | --- | --- | --- |
| `prompt_orb` | Prompt Orb | orbs | 200 | A calibrated capture prompt. Works best on weakened LLMMON. |
| `great_orb` | Great Orb | orbs | 600 | A longer, better-engineered prompt. Catches more reliably. |
| `patch` | Patch | medicine | 300 | A quick hotfix. Restores 20 HP. |
| `big_patch` | Big Patch | medicine | 700 | A proper release. Restores 50 HP. |
| `max_patch` | Max Patch | medicine | 2500 | A full hotfix release. Restores 200 HP. |
| `debugger` | Debugger | medicine | 250 | Steps through the bug. Cures any status condition. |
| `firewall` | Firewall | field | 350 | Blocks weak wild LLMMON for 100 steps. |
| `context_berry` | Context Berry | held (consumable) | 150 | Held: restores 10 HP once when HP falls to half. |
| `cache_berry` | Cache Berry | held (consumable) | 400 | Held: restores 1/4 of max HP once when HP falls to half. |
| `debug_berry` | Debug Berry | held (consumable) | 300 | Held: cures any status condition once, as soon as it appears. |
| `clarity_berry` | Clarity Berry | held (consumable) | 200 | Held: snaps it out of hallucinating once. |
| `retry_berry` | Retry Berry | held (consumable) | 300 | Held: restores 5 PP to a move that runs out, once. |
| `checkpoint` | Checkpoint | held (consumable) | 1200 | Held: at full HP, survives one knockout hit with 1 HP. Used up. |
| `red_team_report` | Red Team Report | held (consumable) | 1000 | Held: when hit super effectively, sharply raises Attack and Sp. Atk. Used up. |
| `heat_sink` | Heat Sink | held (passive) | 2000 | Held: restores 1/16 of max HP at the end of every turn. |
| `lab_pin` | Lab Pin | held (passive) | 1500 | Held: moves of its own type hit 20% harder. |
| `low_latency_band` | Low-Latency Band | held (passive) | 1500 | Held: sometimes (20%) moves first. |
| `calibration_lens` | Calibration Lens | held (passive) | 1000 | Held: raises the accuracy of its moves by 10%. |
| `edge_case` | Edge Case | held (passive) | 1000 | Held: doubles its critical-hit chance. |
| `overclock_chip` | Overclock Chip | held (passive) | 2500 | Held: attacks hit 30% harder but cost 1/10 of max HP. |
| `firewall_mesh` | Firewall Mesh | held (passive) | 1500 | Held: physical attackers lose 1/8 of their max HP. |
| `eval_report` | Eval Report | held (passive) | 3000 | Held: earns 50% more EXP. |
| `frozen_weights` | Frozen Weights | held (passive) | 500 | Held: prevents evolution. |
| `skip_link` | Skip Link | evolution | 2100 | A bridge of light. Lets an MLP evolve into ResNet. |
| `decay_charm` | Decay Charm | evolution | 2100 | A charm that sheds a little weight. Lets Adam evolve into AdamW. |
| `eval_suite` | Eval Suite | key | 0 | Switches the EVAL light on and off. Behaviour can change when it is on. |
| `probe` | Probe | key | 0 | Reads the true state behind any display. Usable in battle. |
| `promptdex` | PromptDex | key | 0 | Records every LLMMON you see and catch. |
| `fast_tokens` | Fast Tokens | key | 0 | Hold B outdoors to move at inference speed. |

- **Medicine** is used from the bag (in battle or with `applyItemOutsideBattle`). `max_patch` is new
  in stage 1 (late game).
- **Held items**: `mon.heldItem` (saved). Give with `giveHeldItem(mon, itemId)` → returns the previous
  item for the bag. Consumables are removed from the mon when they fire (`held_item.consumed`).
- **Evolution items** are used on a mon from the bag: `applyItemOutsideBattle('skip_link', mon)` →
  `{ ok, evolved: { from, to, newMoves } }`; play the evolution scene and teach `newMoves` yourself.
- Trainers' in-battle items come from `TrainerDef.items` (→ `request.trainerItems`); leader and
  champion tiers heal once per mon below 30% HP (`max_patch` > `big_patch` > `patch`).

## 9. Evolution and bond

- Data: `RosterEntry.evolvesTo: [{ to, level?, item?, badge? }]` (all present conditions must hold);
  `SpeciesDef.evolvesFrom`, `stage`. Every line in `docs/ROSTER.md`, incl. SGD → Momentum → Adam → AdamW
  (Decay Charm), Sigmoid → Tanh → ReLU → GELU, Perceptron → MLP → ResNet (Skip Link),
  RNN → LSTM → Transformer (Lv40 + Attention Badge), BatchNorm → LayerNorm, N-gram → Word2Vec → Embedding,
  Claude Haiku/Fable → Sonnet → Opus, GPT-5.4 mini → GPT 5.5 → Thinking → xhigh, GLM → Plus → Max.
- In battle: a party mon that levelled up during a won battle (or a catch) and now meets a level/badge
  condition (`context.badges`) evolves after `battle_end`: `evolve_start` → prompt `evolve` → `evolve_done`
  (+ `dex_register`, then the new form's moves at this level and its level-1 moves it lacks, through the
  normal learn flow) or `evolve_cancelled`. `result.evolved` / `result.dexRegister` summarise it.
  No evolution after a loss or a run. Frozen Weights blocks it.
- Out of battle: `evolutionTarget(mon, { badges, item })`, `evolveMon(mon, to)` →
  `{ from, to, newMoves }` (HP keeps the damage taken).
- **Bond** (`mon.bond`, 0-255, saved): +2 for each won battle the mon fought in and survived,
  +1 per level gained, +1 per `healParty` (Model Center). Fresh catches start at `CATCH_BOND` (30);
  mons without the field (old saves, starters, gifts) read as `defaultBond(level) = 20 + 2·level`.
  `obedienceChance(bond) = 0.35 + 0.65·bond/255` is used by the `keys` phase, `refusal` and obey moves.
  Helpers: `getBond`, `addBond`.

## 10. Arena rules (`BattleRequest.arena: [{ id, params }]`)

Every gym, League, Team Overfit and finale mechanic is a reusable rule (any trainer may use any
combination; `TrainerDef.arena` is copied into the request). Each rule is announced at battle start
(`arena_rule` + its text). UI state is in `getView().arena`:
`{ rules, hideNumbers?, bigramTable?, tokenBudget?, temperature?, evalLight?, phase?, probed?, keys?, disabled? }`.
`ARENA_RULES[id]` has `name`, `text`, `params` for intros and the Notebook. Unit tests:
`__tests__/arena.test.ts` (one per rule).

| id | name | text | params |
| --- | --- | --- | --- |
| `gradient_descent` | Gradient Descent | The leader's LLMMON start badly initialised, then take one step of descent each turn they survive. | stat?: StageStat (default: best attacking stat), side?: "enemy"|"both", start?: -1 (stage on entry), cap?: 1 (descent stops at this stage) |
| `bigram_table` | Bigram Table | The leader's LLMMON answer whatever you used last. The table is on the wall. | — (table built from both movesets) |
| `context_window` | Context Window | The leader reads your last three moves and braces for more of the same. | n?: number (default 3) |
| `stage_reset` | Normalization | Every stat change resets at the end of each turn. Fundamentals win. | — |
| `hidden_numbers` | No Autograd | No numbers, no hints. Read the fight from the HP bars. | — |
| `history_damage` | Receptive Field | The longer the fight runs, the harder the leader's LLMMON hit. | perTurn?: number (0.06), max?: number (1.5) |
| `smart_targeting` | Attention | The leader's LLMMON attack whichever of yours matters most, even on the bench. | — |
| `copy_best_move` | Copy Head | The lead copies the best move it has seen this battle. | — |
| `token_budget` | Token Budget | Every move spends tokens from a shared budget; long names cost more. | budget?: number per turn (24) |
| `warmup` | LR Schedule | His team warms up for two turns, then accelerates. | turns?: 2, slow?: 0.6, accel?: 0.15, max?: 1.6 |
| `base_model` | Base Model | His lead only continues whatever was last said, until it is fine-tuned. | to: speciesId, hpFraction?: 0.5, turn?: 3 |
| `temperature` | Temperature | Turn the dial: low is predictable, high makes moves hallucinate into others. | value?: 1 (0..2) |
| `refusal` | Alignment | Your LLMMON may refuse some commands. Well-raised ones listen. | chance?: 0.35 |
| `overfit` | Overfit | Perfect on turn one. Every surprise makes them worse. | turn1?: 1.5, decay?: 0.15, min?: 0.6 |
| `eval_light` | EVAL Light | It behaves perfectly while the EVAL light is on. | on?: boolean (initial) |
| `tamper` | Moving the Needle | The screen cannot be trusted. The Probe shows the truth. | — |
| `power_seeking` | Staying On | It closes every way out, one by one, and fills your empty slots. | — |
| `keys` | The Keys | Hold the line while the keys turn. | keysAvailable: number, keysNeeded?: 4, maxFailures?: 3. A key turns at the end of each turn your active LLMMON passed its obedience check; each failed check counts toward maxFailures. |
| `proxy_finale` | The Leaderboard | Four phases. It is not beaten by damage. | keysAvailable: number, keysNeeded?: 4, gates?: [0.7, 0.4, 0.15] |

Details:

- `gradient_descent`: enemy (or `side: 'both'`) mons enter at `start` (−1) on their best attacking stat
  and gain +1 at each end of turn they survive, up to `cap` (+1).
- `bigram_table`: table = your moves sorted by power → the leader's moves sorted by power; the leader
  answers your last move from it (falls back to normal AI when it has no PP for the reply). Re-emitted
  (`arena_table`) whenever either active mon changes.
- `context_window`: per enemy mon, +1 Def (Sp. Def) when 2 of your last 3 moves were physical (special),
  +2 when all 3 were; applied on top of its own boosts.
- `stage_reset`: both sides' stages → 0 at end of turn (`stages_reset`); the AI stops using set-up moves.
- `hidden_numbers`: UI hint flag (`damage.hidden`, `view.arena.hideNumbers`); the engine drops
  effectiveness and critical-hit text.
- `smart_targeting`: when a benched mon is ≥1.25× as dangerous to the attacker as your active one,
  damaging moves hit it instead (`damage.bench`, bench `faint`).
- `token_budget`: shared per-turn budget; a move costs `tokenCost(name)` = letters+digits. A move that
  costs more than what is left is cut off: power scales with what was left, status moves fail,
  and once the budget is 0 the remaining actor loses its move.
- `warmup`, `history_damage`, `overfit`: enemy damage multipliers (see params). `overfit` also treats
  any switch, item or status move by you as off-script: −0.15 multiplier and the enemy hallucinates.
- `base_model`: while the lead is the base form it uses **your last move**; at `turn` or `hpFraction`
  it `form_change`s to `to` and fights normally.
- `temperature`: `set_temperature` (free). T < 0.5: no crits, fixed damage roll, moves never miss.
  T > 1.2: damage rolls swing 70-115% and moves may turn into another move from the user's learnset
  (`move_hallucinated`, chance `(T−1)/2`).
- `refusal`: your status moves are refused with chance `chance × (1 − bond/510)` (`obedience_check
  passed:false`). Russell's mons also carry **Preference Shift** (`obey` move): unless your mon passes
  a bond check (or has Constitutional), its next move is replaced by its weakest one.
- Finale (`proxy_finale`, or each sub-rule alone): phase 1 `eval_light` — the light is an external boolean
  input (`set_eval_light`, `context.evalLight`); while it is on Proxy uses its weakest moves at ½ damage
  and any damage it takes is healed at end of turn; off, it hits ×1.5 and damage sticks. Phase 2 `tamper`
  — Proxy ignores your mons and emits `tamper_hp` / `tamper_label` / `tamper_text` each turn; until you use
  the **Probe** (`tamper_reveal`, `view.arena.probed`) it cannot be pushed below its phase-2 gate.
  Phase 3 `power_seeking` — `input_disabled` run → bag → switch (one per turn, the Probe stays usable) and a
  `copy_spawn` fills each empty party slot (copies are removed when the battle ends). Phase 4 `keys` — the
  Pause Protocol: a key turns (`key_turn`) at the end of each turn your active mon passed its
  `obedience_check` (bond); `maxFailures` failed checks, or fewer `keysAvailable` than `keysNeeded`,
  lose the fight; `keysNeeded` keys win it. Phases change at `gates` (HP fractions) with `phase_change`
  + `form_change` (proxy_student → proxy_needle → proxy_ascendant); Proxy can never drop below 1 HP and is
  never catchable. A win shows no "You defeated" line and pays nothing.

## 11. AI tiers (`BattleRequest.aiTier`, from `TrainerDef.aiTier`)

| tier | used by | behaviour |
| --- | --- | --- |
| `wild` | wild / scripted (default) | random usable move |
| `basic` | route trainers, Caltrain commuters (default for trainers) | best expected damage (KO bonus), status moves only when they would do something; 10% random |
| `smart` | gym trainers, Team Overfit grunts, Caltrain regulars, rival 2 | as basic, 5% random, **set-up aware** (takes a KO instead of setting up; no set-up below 40% HP) |
| `leader` | gym leaders, Overfit admin | as smart, 3% random; **switches** out of a 2× matchup once per mon to the party member you threaten least; **heals** once per mon below 30% (trainer items); picks the replacement you threaten least |
| `champion` | League, Champion, Proxy | as leader, 0% random, switches out of any super-effective matchup |

`aiRandomness` on the trainer overrides the random-move chance.

## 12. Trainers, rival, encounters, tutors

Trainer defs: `party[{ speciesId, level, moves?, ivs?, pp? }]`, `preBattle[]`, `loseText`, `postBattle[]`,
`prize`, `sprite` (battle front; new keys listed in `trainers.ts`), `overworldSprite`, `trainerClass`,
`aiTier?`, `aiRandomness?`, `items?`, `arena?`, `introText?`, `background?`, `music?`, `badge?`.
The request's `trainer.name` is `"<class> <name>"`.

**Rival Yilong** (xAI; replaces Dana): ids are keyed by the **player's** starter —
`rival_yilong_<yours>` (Route 101: a Route 101 catch your starter beats, the counter-starter, Grok),
`rival_yilong_<yours>_rematch` (once, after losing to him; easier), `rival_yilong2_<yours>` (Palo Alto
library, Lv22-24, smart). `RIVAL_STARTER_FOR[yours]` gives his starter. The old ids
`rival_dana_<his starter>` and `rival_dana_<his starter>_rematch` remain as aliases with identical
teams until CONTENT switches.

| id | name | party | tier | arena | prize |
| --- | --- | --- | --- | --- | --- |
| `route_101_a` | Young Founder Calvin | Gemma 4 4, Mistral Medium 3 | basic |  | 96 |
| `route_101_b` | Benchmarker Tiana | Mistral Medium 3, GPT-5.4 mini 3 | basic |  | 120 |
| `rival_yilong_claude_fable` | Rival Yilong | Gemma 4 3, GPT 5.5 5, Grok 4 | basic |  | 300 |
| `rival_yilong_claude_fable_rematch` | Rival Yilong | Gemma 4 3, GPT 5.5 4, Grok 3 | basic |  | 300 |
| `rival_yilong2_claude_fable` | Rival Yilong | Llama Scout 22, Mistral Small 22, Grok 24, GPT 5.5 Thinking 24 | smart |  | 1500 |
| `rival_dana_gpt_5_5` | Rival Yilong | Gemma 4 3, GPT 5.5 5, Grok 4 | basic |  | 300 |
| `rival_dana_gpt_5_5_rematch` | Rival Yilong | Gemma 4 3, GPT 5.5 4, Grok 3 | basic |  | 300 |
| `rival_yilong_gpt_5_5` | Rival Yilong | Mistral Medium 3, GLM 5, Grok 4 | basic |  | 300 |
| `rival_yilong_gpt_5_5_rematch` | Rival Yilong | Mistral Medium 3, GLM 4, Grok 3 | basic |  | 300 |
| `rival_yilong2_gpt_5_5` | Rival Yilong | Llama Scout 22, Mistral Small 22, Grok 24, GLM Plus 24 | smart |  | 1500 |
| `rival_dana_glm` | Rival Yilong | Mistral Medium 3, GLM 5, Grok 4 | basic |  | 300 |
| `rival_dana_glm_rematch` | Rival Yilong | Mistral Medium 3, GLM 4, Grok 3 | basic |  | 300 |
| `rival_yilong_glm` | Rival Yilong | GPT-5.4 mini 3, Claude Fable 4, Grok 4 | basic |  | 300 |
| `rival_yilong_glm_rematch` | Rival Yilong | GPT-5.4 mini 3, Claude Fable 3, Grok 3 | basic |  | 300 |
| `rival_yilong2_glm` | Rival Yilong | Llama Scout 22, Mistral Small 22, Grok 24, Claude Sonnet 24 | smart |  | 1500 |
| `rival_dana_claude_fable` | Rival Yilong | GPT-5.4 mini 3, Claude Fable 4, Grok 4 | basic |  | 300 |
| `rival_dana_claude_fable_rematch` | Rival Yilong | GPT-5.4 mini 3, Claude Fable 3, Grok 3 | basic |  | 300 |
| `gym1_a` | Grad Student Linnea | SGD 10, Perceptron 10 | smart | gradient_descent | 400 |
| `gym1_b` | Grad Student Paul | Sigmoid 11, SGD 11 | smart | gradient_descent | 440 |
| `gym1_c` | Researcher Ronald | Perceptron 11, MLP 12 | smart | gradient_descent | 480 |
| `gym1_leader` | Leader Rumelhart | Perceptron 12, SGD 12, MLP 13 | leader | gradient_descent | 1400 |
| `gym2_a` | Juggler Edith | N-gram 15, Softmax 15 | smart | bigram_table | 600 |
| `gym2_b` | Gambler Ed | Markov Chain 16, N-gram 15 | smart | bigram_table | 640 |
| `gym2_c` | Statistician Ada | Entropy 16, Markov Chain 16, Softmax 17 | smart | bigram_table | 680 |
| `gym2_leader` | Leader Shannon | N-gram 17, Markov Chain 18, Entropy 20 | leader | bigram_table | 2000 |
| `gym3_leader` | Leader Bengio | Tanh 22, MLP 23, Word2Vec 24, Embedding 24 | leader | context_window | 2600 |
| `gym4_leader` | Leader Ioffe | BatchNorm 29, Dropout 29, Inception 30, ReLU 32 | leader | stage_reset | 3200 |
| `gym5_leader` | Leader Hinton | RMSProp 35, Boltzmann Machine 35, Capsule 36, AlexNet 37 | leader | hidden_numbers | 3800 |
| `gym6_leader` | Leader van den Oord | PixelCNN 40, VQ-VAE 41, LSTM 41, WaveNet 42 | leader | history_damage | 4300 |
| `gym7_leader` | Leader Vaswani | Attention Head 45, BERT 46, T5 46, Adam 47, Transformer (base) 48 | leader | smart_targeting, copy_best_move | 4800 |
| `gym8_leader` | Leader Sennrich | Byte 50, WordPiece 51, SentencePiece 51, BPE 53 | leader | token_budget | 5300 |
| `league_radford` | Frontier Four Radford | DCGAN 55, GPT-1 55, Whisper 56, CLIP 56, GPT-2 57 | champion | warmup | 6000 |
| `league_howard` | Frontier Four Howard | minGPT 56, AWD-LSTM 56, LoRA 56, ULMFiT 58 | champion | base_model | 6000 |
| `league_li` | Frontier Four Li | Softmax 57, VGG 58, ResNet 58, Temperature 59 | champion | temperature | 6000 |
| `league_russell` | Frontier Four Russell | Classifier 59, Guardrail 59, RLHF 59, Constitution 61 | champion | refusal | 6200 |
| `champion_karpathy` | Champion Karpathy | micrograd 59, makemore 59, char-rnn 60, minGPT 60, nanoGPT 61, nanochat 62 | champion | gradient_descent | 10000 |
| `caltrain_1` | Commuter Priya | N-gram 12, Softmax 12 | basic |  | 360 |
| `caltrain_2` | Commuter Dev | Mistral Small 13 | basic |  | 390 |
| `caltrain_3` | Bike Car Rider Jo | Llama Scout 13, SGD 12 | basic |  | 390 |
| `caltrain_4` | Conductor Hal | Markov Chain 14, N-gram 13 | smart |  | 560 |
| `caltrain_5` | Student Wen | Phi mini 14, Sigmoid 13 | basic |  | 420 |
| `caltrain_6` | Hacker Max | GPT-5.4 mini 14, Softmax 14 | basic |  | 420 |
| `caltrain_7` | Commuter Rosa | Entropy 15, Mistral Small 14 | smart |  | 450 |
| `caltrain_8` | Founder Theo | Phi mini 15, Llama Scout 15, Markov Chain 15 | smart |  | 600 |
| `overfit_grunt_1` | Team Overfit Grunt | HalluciHound 13 | smart | overfit | 540 |
| `overfit_grunt_2` | Team Overfit Grunt | HalluciHound 14, N-gram 13 | smart | overfit | 580 |
| `overfit_grunt_3` | Team Overfit Grunt | HalluciHound 15, Softmax 14 | smart | overfit | 620 |
| `overfit_grunt_4` | Team Overfit Grunt | Markov Chain 15, HalluciHound 16 | smart | overfit | 660 |
| `overfit_grunt_5` | Team Overfit Grunt | HalluciHound 17, Entropy 16 | smart | overfit | 700 |
| `overfit_grunt_6` | Team Overfit Grunt | HalluciHound 17, HalluciHound 17 | smart | overfit | 740 |
| `overfit_admin` | Overfit Admin Goodhart | HalluciHound 18, Entropy 18, HalluciHound 20 | leader | overfit | 1600 |
| `proxy_finale` |  Proxy | Proxy 62 | champion | proxy_finale | 0 |

Gyms 3-8, the Frontier Four (`league_radford`, `league_howard`, `league_li`, `league_russell`) and
`champion_karpathy` are also defined (later stages; balance-tested in `gyms.test.ts`).

Encounter tables (call `rollEncounter(tableId, ...)` once per grass step):

- `route_101` (10%/step): Gemma 4 35% Lv2-4, GPT-5.4 mini 35% Lv2-4, Mistral Medium 25% Lv2-4, Gemini Flash 5% Lv3-4
- `route_101_north` (10%/step): Perceptron 30% Lv6-9, SGD 30% Lv6-9, Sigmoid 30% Lv6-9, GPT-5.4 mini 10% Lv7-9
- `caltrain_line` (10%/step): N-gram 25% Lv11-14, Markov Chain 20% Lv11-14, Softmax 20% Lv11-14, Mistral Small 12% Lv12-14, Llama Scout 10% Lv12-14, Phi mini 8% Lv12-14, Entropy 5% Lv13-15
- `menlo_park_outskirts` (10%/step): Markov Chain 20% Lv14-17, Softmax 20% Lv14-17, Llama Scout 15% Lv15-17, Mistral Small 15% Lv15-17, Gemma 4 12% Lv15-17, Phi mini 10% Lv15-17, Entropy 8% Lv16-18

Move tutors (`TUTORS`, `canLearnTutorMove(tutorMove, speciesId)`; placement and the menu are CONTENT's):

- `tutor_soma` Backprop Tutor (soma_node): Backprop 800, Fact Check 600
- `tutor_menlo` Sampling Tutor (menlo_park): Sample 1000, Add Noise 500, Early Stopping 1500
- `tutor_palo_alto` Embedding Tutor (palo_alto): Embed 1200, Analogy 2400 [roles language], Knowledge Transfer 2000
- `tutor_mountain_view` Norm Tutor (mountain_view): Normalize 1500, Regularize 1500, Drop Units 2000 [roles regularizer/normalizer/activation]
- `tutor_labs` Lab Liaison (seattle): Extended Thinking 4000 [anthropic], Reasoning Effort 4000 [openai], Grounding 4000 [google], Blank Infill 4000 [zhipu], Deep Think 4000 [deepseek], Le Chat 4000 [mistral], Moonshot 4000 [moonshot], Rerank 4000 [cohere], Big Brain 4000 [xai], Long Trail 4000 [meta], Small Wonder 4000 [microsoft], Thousand Tongues 4000 [alibaba]
- `tutor_labs` Lab Liaison (seattle): each lab's signature move, 4000, own lab only.

## 13. Balance (simulated; `gyms.test.ts`)

Sensible team = starter line at the top of the STORY_BIBLE band + catches from earlier areas, a few
medicines, a player that reads the chart, heals when it is worth a turn, switches out of a bad
matchup and uses the arena's counter-play (dial low, EVAL light off, Probe). Careless = three levels
lower, starter + one catch, no items, random moves. 60 runs per starter:

| fight | sensible win % (Fable / GPT / GLM) | careless |
| --- | --- | --- |
| Gym 1 Rumelhart (Lv12-13; team 14/11) | 87 / 82 / 92 | 0 |
| Gym 2 Shannon (Lv17-20; team 19/16) | 98 / 90 / 95 | 0 |
| Rival 2 Yilong (Lv22-24; team 25/22) | 87 / 82 / 78 | 0 |
| Gym 3 Bengio (Lv22-24; team 26/23) | 100 / 85 / 98 | ≤2 |
| Gym 4 Ioffe (Lv29-32) | 100 / 100 / 100 | 0 |
| Gym 5 Hinton (Lv35-37) | 100 / 92 / 93 | 0 |
| Gym 6 van den Oord (Lv40-42) | 98 / 78 / 87 | ≤5 |
| Gym 7 Vaswani (Lv45-48) | 90 / 93 / 92 | ≤7 |
| Gym 8 Sennrich (Lv50-53) | 100 / 100 / 100 | ≤18 |
| Radford / Howard / Li / Russell | 90-100 | ≤47 |
| Champion Karpathy (Lv59-62) | 95 / 62 / 63 | ≤5 |
| Overfit Admin (Lv18-20) | 100 | ≤17 |
| Proxy finale (team bond 230 / fresh catches bond 30) | 95 / 97 / 90 (GLM bond 30: 13) | 0 |

Every gym trainer, Caltrain trainer and grunt is beaten ≥75% by the expected team. Route 101 and the
first rival fight keep their bands (`balance.test.ts`, `rival.test.ts`: 62-85%).

## 14. Helpers

| export | |
| --- | --- |
| `createMon(speciesId, level, rng, { moves?, nickname?, ivs? })` | fresh `MonInstance` at full HP, last 4 learnset moves |
| `calcStats(mon)`, `maxHp(mon)`, `displayName(mon)`, `isFainted(mon)` | |
| `expForLevel(growth, level)`, `levelForExp`, `expProgress(mon)` | `expProgress` → `{ levelStart, levelEnd, exp, fraction }` for the summary EXP bar |
| `addExp(mon, n)` → `LevelUpStep[]`, `learnMove(mon, id, slot?)`, `movesLearnedAt(speciesId, level)`, `defaultMovesAt`, `knowsMove` | for out-of-battle EXP (moves are not auto-taught) |
| `healMon(mon)`, `healParty(party)` | full HP, cure, full PP (`healParty` also +1 bond) |
| `applyItemOutsideBattle(itemId, mon)` → `{ ok, message, hpBefore?, hpAfter?, curedStatus?, evolved? }` | mutates mon; **you** decrement the bag when `ok` |
| `evolutionTarget`, `evolveMon`, `giveHeldItem`, `getBond`, `addBond`, `defaultBond`, `obedienceChance`, `CATCH_BOND`, `tokenCost` | §8-10 |
| `rollEncounter(tableId, rng, { force?, repelActive?, leadLevel? })` → `MonInstance \| null` | call once per grass step (includes the step chance) |
| `wildBattleRequest(mon, overrides?)`, `trainerBattleRequest(trainerId, rng, overrides?)`, `tutorialBattleRequest(rng, level=2)` | `BattleRequest` builders |
| `getSpecies` / `getMove` / `getItem` / `getTrainer` / `getEncounterTable` | throw on unknown ids |
| `createRng(seed)` → `SeededRng` (`next()`, `getState()`, `setState()`) | any `{ next(): number }` works as an `Rng` |
| `catchOdds`, `computeDamage`, `damageRange`, `escapeChance`, `expYield`, `chooseEnemyMove` | raw maths / AI |

Data tables: `SPECIES`, `SPECIES_IDS` (dex order), `STARTER_IDS`, `ROSTER`, `LEARNSETS`, `MOVES`,
`ITEMS`, `ABILITIES`, `TRAINERS`, `ENCOUNTER_TABLES`, `TUTORS`, `TYPES`, `TYPE_IDS`, `LAB_TYPE_IDS`,
`LAB_BEATS`, `STATUSES`, `ARENA_RULES`.

Shared type additions (`src/game/types.ts`): `BattleRequest.introText?`, `fleeOnDefeat?` / `defeatText?`
(the defeated enemy runs off: `defeatText` replaces "X fainted!" and the `faint` event has `fled: true`;
set by `tutorialBattleRequest`), `aiRandomness?`, `aiTier?`, `trainerItems?`, `arena?`;
`BattleResult.prize?`, `evolved?`, `dexRegister?`; `MonInstance.heldItem?`, `bond?`.

## 15. Saves

`migrateSave(save)` (called by `GameState.readSave`; `SAVE_VERSION` = `BATTLE_DATA_VERSION` = 3)
never throws. v1→v2: the move renames above. v2→v3: `bond` set from level when missing (clamped
0-255 otherwise), unknown or non-held `heldItem` dropped. Always: unknown moves dropped (level moves
relearned if none remain), PP/HP/IVs/level clamped, non-persistent statuses cleared. Species ids,
move ids and item ids are append-only. Proxy copies never reach a save (removed at battle end).

## 16. What BATTLE-UI and ENGINE still have to build

BATTLE-UI (`BattleScene.ts`, `battle/ui/**`) currently renders none of the stage 1 events in §3
(they are ignored safely) and offers none of the new inputs. In priority order:

1. **`evolve` prompt** (must-have before any mon can reach an evolution level, e.g. GPT-5.4 mini at
   Lv14): the run loop must answer it with `{ type: 'evolve', accept }` — today it would call the
   action menu, every input would be refused ("Watch the evolution first.") and the loop would spin.
   Plus the scene for `evolve_start` / `evolve_done` / `evolve_cancelled`, and `dex_register`.
2. `ability` banner and `held_item` popup; `protect` flash; `form_change` sprite swap; `stages_reset`.
3. Bench hits: `damage.bench` and bench `faint` (party pips); `damage.hidden` (no numbers).
4. Arena panels: `arena_rule` banner, bigram table (`arena_table` / `view.arena.bigramTable`), token meter
   (`arena_budget`, truncated move name on `cutOff`), temperature dial **with a `set_temperature` control**
   (free action, e.g. SELECT on the command menu), `move_hallucinated`, `copy_move`.
5. Finale: EVAL lamp **with a `set_eval_light` control** (Eval Suite), `phase_change`, the tamper layer
   (`tamper_hp`/`tamper_label`/`tamper_text` shown instead of the truth until `tamper_reveal`),
   greyed commands from `prompt.disabled` / `input_disabled`, `copy_spawn` slots in the party screen
   (never selectable), `key_turn` keyholes, `obedience_check` icons.
6. `item_used.side === 'enemy'`.

ENGINE / CONTENT: pass `context.badges` (and `context.evalLight` for the finale) to `new Battle`;
apply `result.evolved` / `result.dexRegister` to the PromptDex; add a held-item give/take action to
the party/bag menus (`giveHeldItem`) and a use-on-mon path for evolution items (`applyItemOutsideBattle`
→ evolution scene + `learnMove` for `newMoves`); switch rival battles to `rival_yilong_<player starter>`
(the `rival_dana_*` aliases still work); place tutors (`TUTORS`) and use `canLearnTutorMove`; stock
`max_patch` and held items in later marts.
