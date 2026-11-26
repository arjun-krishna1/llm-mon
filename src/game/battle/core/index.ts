// BATTLE-CORE public API. Import from 'src/game/battle/core' (this file) only.

export { Battle, monView, moveView, type BattleOptions, type BattleView } from './battle.ts'
export type { ActiveView, BattleEvent, BattleInput, BattlePrompt, DamageSource, MonView, MoveView, Side } from './events.ts'
export {
  addExp,
  applyItemOutsideBattle,
  calcStats,
  createMon,
  defaultMovesAt,
  displayName,
  expProgress,
  healMon,
  healParty,
  isFainted,
  knowsMove,
  learnMove,
  maxHp,
  movesLearnedAt,
  type CreateMonOptions,
  type ItemUseResult,
  type LevelUpStep,
} from './mon.ts'
export { rollEncounter, trainerBattleRequest, tutorialBattleRequest, wildBattleRequest, type EncounterOptions } from './requests.ts'
export { SeededRng, chance, createRng, pick, pickWeighted, randInt, randRange, type Rng } from './rng.ts'
export { MAX_LEVEL, STAT_KEYS, STAT_NAMES, accuracyStageMultiplier, calcStat, expForLevel, levelForExp, stageMultiplier } from './stats.ts'
export { catchOdds, computeDamage, damageRange, escapeChance, expYield, rollCatch, statusCatchBonus, type CatchOdds, type DamageParams } from './formulas.ts'
export { chooseEnemyMove, type AiContext, type AiMoveOption } from './ai.ts'

// Data lookups re-exported for convenience.
export {
  getEncounterTable,
  getItem,
  getMove,
  getSpecies,
  getTrainer,
  effectiveness,
  typeMultiplier,
  TYPE_IDS,
  TYPES,
  STATUSES,
  type TypeId,
} from '../../data/index.ts'
