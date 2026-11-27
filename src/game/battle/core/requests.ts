// Builders for BattleRequests and wild encounters.

import type { BattleRequest, MonInstance } from '../../types.ts'
import { getEncounterTable, getTrainer } from '../../data/index.ts'
import { createMon } from './mon.ts'
import { pickWeighted, randRange, type Rng } from './rng.ts'

export interface EncounterOptions {
  /** Skip the per-step chance (e.g. for debug or scripted grass). */
  force?: boolean
  /** Firewall (repel) active: wilds below `leadLevel` are blocked. */
  repelActive?: boolean
  /** Level of the first healthy party mon (needed with repelActive). */
  leadLevel?: number
}

/**
 * Call once per step on a grass tile. Returns a fresh wild MonInstance when an
 * encounter happens, otherwise null.
 */
export function rollEncounter(tableId: string, rng: Rng, opts: EncounterOptions = {}): MonInstance | null {
  const table = getEncounterTable(tableId)
  if (!opts.force && rng.next() >= table.stepChance) return null
  const slot = pickWeighted(rng, table.slots, (s) => s.rate)
  const level = randRange(rng, slot.minLevel, slot.maxLevel)
  if (opts.repelActive && opts.leadLevel !== undefined && level < opts.leadLevel) return null
  return createMon(slot.speciesId, level, rng)
}

export function wildBattleRequest(mon: MonInstance, opts: Partial<BattleRequest> = {}): BattleRequest {
  return { kind: 'wild', enemyParty: [mon], canRun: true, canCatch: true, background: 'grass', music: 'battle_wild', ...opts }
}

/** Builds the trainer's party fresh each time (trainers do not keep damage between battles). */
export function trainerBattleRequest(trainerId: string, rng: Rng, opts: Partial<BattleRequest> = {}): BattleRequest {
  const t = getTrainer(trainerId)
  const enemyParty = t.party.map((p) => createMon(p.speciesId, p.level, rng, { moves: p.moves }))
  return {
    kind: 'trainer',
    enemyParty,
    trainer: { id: t.id, name: `${t.trainerClass} ${t.name}`, sprite: t.sprite, loseText: t.loseText, prize: t.prize },
    canRun: false,
    canCatch: false,
    background: 'grass',
    music: 'battle_trainer',
    ...opts,
  }
}

/** The rescue fight: HalluciHound Lv2, no running, no catching, cannot be lost. */
export function tutorialBattleRequest(rng: Rng, level = 2): BattleRequest {
  return {
    kind: 'scripted',
    enemyParty: [createMon('hallucihound', level, rng)],
    canRun: false,
    canCatch: false,
    background: 'grass',
    music: 'battle_trainer',
    safety: true,
    introText: 'The wild HalluciHound is glitching out!',
    fleeOnDefeat: true,
    defeatText: 'The HalluciHound lost its nerve and bolted!',
  }
}
