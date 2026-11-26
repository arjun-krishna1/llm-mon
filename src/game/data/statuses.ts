// Status conditions. "Major" statuses persist on MonInstance.status (and survive
// the battle, like in the genre); "volatile" ones live only in battle and clear on switch.

import type { TypeId } from './typechart.ts'

export type MajorStatusId = 'rate_limited' | 'context_rot' | 'timed_out'
export type VolatileStatusId = 'hallucinating'
export type AnyStatusId = MajorStatusId | VolatileStatusId

export interface StatusInfo {
  id: AnyStatusId
  name: string
  /** 3-letter HUD tag, shown next to the HP bar. */
  tag: string
  volatile: boolean
  description: string
  /** Types that can never get this status. */
  immuneTypes: TypeId[]
  /** Text when inflicted; `{name}` is replaced by the mon's battle name. */
  inflictText: string
  cureText: string
  alreadyText: string
}

export const STATUSES: Record<AnyStatusId, StatusInfo> = {
  rate_limited: {
    id: 'rate_limited',
    name: 'Rate-limited',
    tag: 'RTL',
    volatile: false,
    description: 'Speed is halved and it may be unable to move (25%).',
    immuneTypes: [],
    inflictText: '{name} got rate-limited! It may be unable to move!',
    cureText: '{name} is no longer rate-limited!',
    alreadyText: '{name} is already rate-limited!',
  },
  context_rot: {
    id: 'context_rot',
    name: 'Context rot',
    tag: 'ROT',
    volatile: false,
    description: 'Loses 1/8 of max HP at the end of every turn.',
    immuneTypes: [],
    inflictText: "{name}'s context started to rot!",
    cureText: "{name}'s context is clean again!",
    alreadyText: "{name}'s context is already rotting!",
  },
  timed_out: {
    id: 'timed_out',
    name: 'Timed out',
    tag: 'T/O',
    volatile: false,
    description: 'Cannot move for 1-3 turns while it reconnects.',
    immuneTypes: [],
    inflictText: '{name} timed out!',
    cureText: '{name} reconnected!',
    alreadyText: '{name} is already timed out!',
  },
  hallucinating: {
    id: 'hallucinating',
    name: 'Hallucinating',
    tag: 'HAL',
    volatile: true,
    description: 'For 2-5 turns it may confidently attack itself instead (33%).',
    immuneTypes: ['glitch'],
    inflictText: '{name} started hallucinating!',
    cureText: '{name} snapped back to reality!',
    alreadyText: '{name} is already hallucinating!',
  },
}

export function isMajorStatus(id: string): id is MajorStatusId {
  return id === 'rate_limited' || id === 'context_rot' || id === 'timed_out'
}
