// Battle event + input types: the contract between BATTLE-CORE and the battle UI.
// See docs/BATTLE_API.md for playback rules.

import type { BattleResult, MonInstance, Stats } from '../../types.ts'
import type { MoveAnim, MoveCategory, StageStat } from '../../data/moves.ts'
import type { AnyStatusId } from '../../data/statuses.ts'
import type { TypeId } from '../../data/typechart.ts'

export type Side = 'player' | 'enemy'

/** Snapshot of a mon for rendering (copied, never live). */
export interface MonView {
  uid: string
  speciesId: string
  name: string
  level: number
  hp: number
  maxHp: number
  /** Major status id or 'none'. */
  status: string
  types: TypeId[]
}

export interface MoveView {
  id: string
  name: string
  type: TypeId
  category: MoveCategory
  power: number
  accuracy: number | null
  pp: number
  maxPp: number
}

export interface ActiveView extends MonView {
  partyIndex: number
  moves: MoveView[]
  stages: Record<StageStat, number>
  hallucinating: boolean
  /** EXP bar state (player side only; enemy gets zeros). */
  exp: number
  expLevelStart: number
  expLevelEnd: number
}

/** Inputs the arena can grey out (Proxy phase 3). */
export type InputKind = 'fight' | 'bag' | 'switch' | 'run'

/** Arena state for rendering (gym mechanics, finale). Absent fields = rule not active. */
export interface ArenaView {
  rules: string[]
  /** Hide damage numbers and effectiveness text (Gym 5). */
  hideNumbers?: boolean
  /** Bigram table: your last move -> the leader's reply (Gym 2). */
  bigramTable?: { playerMove: string; enemyMove: string }[]
  /** Token budget left this turn / per-turn size (Gym 8). */
  tokenBudget?: { remaining: number; max: number }
  /** Temperature dial value 0..2 (League 3). */
  temperature?: number
  /** EVAL light state (finale phase 1). */
  evalLight?: boolean
  /** Finale phase 1-4. */
  phase?: number
  /** Phase 2: the Probe has been used this phase (until then Proxy cannot drop past its gate). */
  probed?: boolean
  keys?: { turned: number; needed: number; available: number; failures: number; maxFailures: number }
  disabled?: InputKind[]
}

/** What the battle is waiting for. */
export type BattlePrompt =
  /** `disabled` lists greyed-out commands (validate() rejects them). */
  | { kind: 'action'; disabled?: InputKind[] }
  /** Accept or cancel (B) an evolution announced by an `evolve_start` event. */
  | { kind: 'evolve'; promptId: number; partyIndex: number; from: string; to: string }
  /** Pick a replacement after your active mon fainted (no cancel). */
  | { kind: 'switch'; forced: true }
  /** Answer the learn-move question raised by a `learn_move_prompt` event. */
  | { kind: 'learn_move'; promptId: number; partyIndex: number; moveId: string; currentMoves: string[] }
  | { kind: 'end'; result: BattleResult }

export type BattleInput =
  | { type: 'fight'; moveIndex: number }
  | { type: 'switch'; partyIndex: number }
  /** `target` = party index for medicine (defaults to the active mon). Orbs ignore it. */
  | { type: 'item'; itemId: string; target?: number }
  | { type: 'run' }
  /** Reply to a learn-move prompt: `forgetSlot` 0-3 replaces that move, null = give up learning. */
  | { type: 'learn_move'; forgetSlot: number | null }
  /** Reply to an evolve prompt: false = cancelled with B. */
  | { type: 'evolve'; accept: boolean }
  /** Free action (no turn used) while the `temperature` rule is active. 0..2. */
  | { type: 'set_temperature'; value: number }
  /** Free action (no turn used) while `eval_light`/`proxy_finale` is active (the Eval Suite). */
  | { type: 'set_eval_light'; on: boolean }

export type DamageSource = 'move' | 'recoil' | 'status' | 'hallucination' | 'struggle' | 'item'

export type BattleEvent =
  /** Show in the message box and wait for A (or auto-advance). Never contains manual line breaks. */
  | { type: 'text'; text: string }
  | { type: 'battle_start'; kind: 'wild' | 'trainer' | 'scripted'; enemy: MonView; trainerName?: string; trainerSprite?: string }
  /** A mon enters the field. `fromOrb` = thrown from an orb (player and trainer mons); false = wild slide-in. */
  | { type: 'send_out'; side: Side; partyIndex: number; mon: MonView; fromOrb: boolean }
  | { type: 'withdraw'; side: Side; partyIndex: number; mon: MonView }
  /** A move is starting (follows the "X used Y!" text). */
  | { type: 'move_used'; side: Side; moveId: string; moveName: string; moveType: TypeId }
  /** Play the move animation from `side` toward the other side (or on self for buffs/heals). */
  | { type: 'move_anim'; side: Side; moveId: string; anim: MoveAnim; moveType: TypeId; category: MoveCategory; targetSelf: boolean }
  | { type: 'miss'; side: Side; targetSide: Side }
  /** HP loss. Drain the bar from hpBefore to hpAfter. `side` is the mon that lost HP. */
  | {
      type: 'damage'
      side: Side
      partyIndex: number
      amount: number
      hpBefore: number
      hpAfter: number
      maxHp: number
      /** 1 = normal; >1 super effective; <1 not very effective; 0 immune. Always 1 for non-move sources. */
      effectiveness: number
      crit: boolean
      source: DamageSource
      /** Smart targeting hit a benched mon (partyIndex is not the active one). */
      bench?: boolean
      /** Gym 5: do not show numbers for this hit. */
      hidden?: boolean
    }
  | { type: 'heal'; side: Side; partyIndex: number; amount: number; hpBefore: number; hpAfter: number; maxHp: number }
  | { type: 'status_applied'; side: Side; partyIndex: number; status: AnyStatusId }
  | { type: 'status_cured'; side: Side; partyIndex: number; status: AnyStatusId }
  /** Status prevented the mon from acting this turn (text follows/precedes). */
  | { type: 'cant_move'; side: Side; reason: AnyStatusId }
  /** `delta` is what was actually applied (0 = already at the limit; text explains). */
  | { type: 'stat_change'; side: Side; stat: StageStat; delta: number; stage: number }
  /** `fled`: the enemy ran off instead of fainting (request.fleeOnDefeat). */
  | { type: 'faint'; side: Side; partyIndex: number; fled?: boolean }
  /**
   * EXP bar fill for one level segment. A multi-level gain emits one exp_gain per
   * level (each followed by level_up). Bar fraction = (exp - levelStart)/(levelEnd - levelStart).
   */
  | {
      type: 'exp_gain'
      partyIndex: number
      amount: number
      expFrom: number
      expTo: number
      levelStart: number
      levelEnd: number
      level: number
    }
  | { type: 'level_up'; partyIndex: number; level: number; statsBefore: Stats; statsAfter: Stats; deltas: Stats }
  | { type: 'move_learned'; partyIndex: number; moveId: string; forgotMoveId?: string }
  /**
   * The mon wants a 5th move. The UI must show the replace flow and answer with
   * `battle.submit({ type: 'learn_move', forgetSlot })` before continuing playback;
   * submit returns the result events (move_learned / text) to play inline.
   */
  | { type: 'learn_move_prompt'; promptId: number; partyIndex: number; moveId: string; currentMoves: string[] }
  | { type: 'move_not_learned'; partyIndex: number; moveId: string }
  /** `side` absent = the player used it. */
  | { type: 'item_used'; itemId: string; targetPartyIndex?: number; side?: Side }
  | { type: 'catch_throw'; itemId: string }
  /** One wobble of the orb (n = 1..3). */
  | { type: 'catch_shake'; n: number }
  | { type: 'catch_result'; caught: boolean; shakes: number }
  | { type: 'run_attempt'; success: boolean }
  /** The defeated trainer slides back on screen to deliver their lose line (next text event). */
  | { type: 'trainer_reappear'; trainerName: string; trainerSprite: string }
  | { type: 'battle_end'; outcome: BattleResult['outcome']; prize: number; caught?: MonInstance }
  // ── stage 1 additions ──────────────────────────────────────────────────
  /** Ability popup banner (e.g. "Warm Start"). A text event usually follows. */
  | { type: 'ability'; side: Side; partyIndex: number; abilityId: string; abilityName: string }
  /** A held item activated; `consumed` = it is gone now. */
  | { type: 'held_item'; side: Side; partyIndex: number; itemId: string; itemName: string; consumed: boolean }
  /** The target protected itself this turn (Early Stopping / Drop Units / Polite Refusal). */
  | { type: 'protect'; side: Side }
  /** After battle_end: the evolution scene starts; prompt `evolve` follows (B cancels). */
  | { type: 'evolve_start'; promptId: number; partyIndex: number; from: string; to: string }
  | { type: 'evolve_done'; partyIndex: number; from: string; to: string; mon: MonView }
  | { type: 'evolve_cancelled'; partyIndex: number; from: string; to: string }
  /** Register this species as seen + caught in the PromptDex. */
  | { type: 'dex_register'; speciesId: string }
  /** A mon changed species mid-battle (base model fine-tuned, Proxy phases). */
  | { type: 'form_change'; side: Side; partyIndex: number; from: string; to: string; mon: MonView }
  /** Arena announcement at battle start or when a rule kicks in. Text follows. */
  | { type: 'arena_rule'; ruleId: string; name: string }
  | { type: 'arena_table'; table: { playerMove: string; enemyMove: string }[] }
  | { type: 'arena_budget'; remaining: number; max: number; cost: number; side: Side; cutOff: boolean }
  | { type: 'arena_temperature'; value: number }
  /** High temperature turned the chosen move into another one. */
  | { type: 'move_hallucinated'; side: Side; fromMoveId: string; toMoveId: string }
  /** Every stat stage on both sides went back to 0 (Gym 4 / Regularize / Normalize). */
  | { type: 'stages_reset'; sides: Side[] }
  | { type: 'copy_move'; side: Side; moveId: string; replacedMoveId: string }
  | { type: 'eval_light'; on: boolean }
  | { type: 'phase_change'; phase: number }
  /** Interface tamper (finale): DISPLAY ONLY. Show `shownHp` instead of the true HP until tamper_reveal. */
  | { type: 'tamper_hp'; side: Side; shownHp: number; maxHp: number }
  /** Show the player's move `moveIndex` labelled `shownName` until tamper_reveal. */
  | { type: 'tamper_label'; moveIndex: number; shownName: string }
  /** Replace the next effectiveness message with this one (a lie). */
  | { type: 'tamper_text'; shownText: string }
  /** Probe used: drop every tampered display and show true values (from getView()). */
  | { type: 'tamper_reveal' }
  | { type: 'input_disabled'; inputs: InputKind[] }
  /** A Proxy copy now occupies the player's party slot `slot` (cannot be switched to). */
  | { type: 'copy_spawn'; slot: number; mon: MonView }
  | { type: 'key_turn'; turned: number; needed: number; available: number }
  /** Obedience check (refusal rule, obey moves, the keys phase). */
  | { type: 'obedience_check'; partyIndex: number; passed: boolean }
