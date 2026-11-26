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

/** What the battle is waiting for. */
export type BattlePrompt =
  | { kind: 'action' }
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

export type DamageSource = 'move' | 'recoil' | 'status' | 'hallucination' | 'struggle'

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
    }
  | { type: 'heal'; side: Side; partyIndex: number; amount: number; hpBefore: number; hpAfter: number; maxHp: number }
  | { type: 'status_applied'; side: Side; partyIndex: number; status: AnyStatusId }
  | { type: 'status_cured'; side: Side; partyIndex: number; status: AnyStatusId }
  /** Status prevented the mon from acting this turn (text follows/precedes). */
  | { type: 'cant_move'; side: Side; reason: AnyStatusId }
  /** `delta` is what was actually applied (0 = already at the limit; text explains). */
  | { type: 'stat_change'; side: Side; stat: StageStat; delta: number; stage: number }
  | { type: 'faint'; side: Side; partyIndex: number }
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
  | { type: 'item_used'; itemId: string; targetPartyIndex?: number }
  | { type: 'catch_throw'; itemId: string }
  /** One wobble of the orb (n = 1..3). */
  | { type: 'catch_shake'; n: number }
  | { type: 'catch_result'; caught: boolean; shakes: number }
  | { type: 'run_attempt'; success: boolean }
  /** The defeated trainer slides back on screen to deliver their lose line (next text event). */
  | { type: 'trainer_reappear'; trainerName: string; trainerSprite: string }
  | { type: 'battle_end'; outcome: BattleResult['outcome']; prize: number; caught?: MonInstance }
