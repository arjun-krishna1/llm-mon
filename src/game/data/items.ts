// Bag items. Prices are in tokens (the slice currency).

export type ItemPocket = 'orbs' | 'medicine' | 'held' | 'evolution' | 'field' | 'key'

export type ItemEffect =
  | { kind: 'catch'; /** Catch-rate multiplier ("ball bonus"). */ multiplier: number }
  | { kind: 'heal'; amount: number }
  | { kind: 'cure' } // cures every status, including hallucinating
  | { kind: 'repel'; steps: number }
  | { kind: 'key' }
  /** Held in battle (MonInstance.heldItem). Mechanic per item id in battle/core/battle.ts. */
  | { kind: 'held'; consumable: boolean }
  /** Use on a mon to trigger an item evolution (species roster `evolvesTo[].item`). */
  | { kind: 'evolution' }

export interface ItemDef {
  id: string
  name: string
  pocket: ItemPocket
  /** Buy price at the Token Mart. 0 = not sold. Sell price is half. */
  price: number
  description: string
  effect: ItemEffect
  usableInBattle: boolean
  /** Usable on a party mon from the bag menu. */
  usableOnMon: boolean
}

const ITEM_LIST: ItemDef[] = [
  { id: 'prompt_orb', name: 'Prompt Orb', pocket: 'orbs', price: 200, description: 'A calibrated capture prompt. Works best on weakened LLMMON.', effect: { kind: 'catch', multiplier: 1 }, usableInBattle: true, usableOnMon: false },
  { id: 'great_orb', name: 'Great Orb', pocket: 'orbs', price: 600, description: 'A longer, better-engineered prompt. Catches more reliably.', effect: { kind: 'catch', multiplier: 1.5 }, usableInBattle: true, usableOnMon: false },
  { id: 'patch', name: 'Patch', pocket: 'medicine', price: 300, description: 'A quick hotfix. Restores 20 HP.', effect: { kind: 'heal', amount: 20 }, usableInBattle: true, usableOnMon: true },
  { id: 'big_patch', name: 'Big Patch', pocket: 'medicine', price: 700, description: 'A proper release. Restores 50 HP.', effect: { kind: 'heal', amount: 50 }, usableInBattle: true, usableOnMon: true },
  { id: 'max_patch', name: 'Max Patch', pocket: 'medicine', price: 2500, description: 'A full hotfix release. Restores 200 HP.', effect: { kind: 'heal', amount: 200 }, usableInBattle: true, usableOnMon: true },
  { id: 'debugger', name: 'Debugger', pocket: 'medicine', price: 250, description: 'Steps through the bug. Cures any status condition.', effect: { kind: 'cure' }, usableInBattle: true, usableOnMon: true },
  { id: 'firewall', name: 'Firewall', pocket: 'field', price: 350, description: 'Blocks weak wild LLMMON for 100 steps.', effect: { kind: 'repel', steps: 100 }, usableInBattle: false, usableOnMon: false },
  // ── held items (give from the bag; consumables are used up in battle) ─
  { id: 'context_berry', name: 'Context Berry', pocket: 'held', price: 150, description: 'Held: restores 10 HP once when HP falls to half.', effect: { kind: 'held', consumable: true }, usableInBattle: false, usableOnMon: false },
  { id: 'cache_berry', name: 'Cache Berry', pocket: 'held', price: 400, description: 'Held: restores 1/4 of max HP once when HP falls to half.', effect: { kind: 'held', consumable: true }, usableInBattle: false, usableOnMon: false },
  { id: 'debug_berry', name: 'Debug Berry', pocket: 'held', price: 300, description: 'Held: cures any status condition once, as soon as it appears.', effect: { kind: 'held', consumable: true }, usableInBattle: false, usableOnMon: false },
  { id: 'clarity_berry', name: 'Clarity Berry', pocket: 'held', price: 200, description: 'Held: snaps it out of hallucinating once.', effect: { kind: 'held', consumable: true }, usableInBattle: false, usableOnMon: false },
  { id: 'retry_berry', name: 'Retry Berry', pocket: 'held', price: 300, description: 'Held: restores 5 PP to a move that runs out, once.', effect: { kind: 'held', consumable: true }, usableInBattle: false, usableOnMon: false },
  { id: 'checkpoint', name: 'Checkpoint', pocket: 'held', price: 1200, description: 'Held: at full HP, survives one knockout hit with 1 HP. Used up.', effect: { kind: 'held', consumable: true }, usableInBattle: false, usableOnMon: false },
  { id: 'red_team_report', name: 'Red Team Report', pocket: 'held', price: 1000, description: 'Held: when hit super effectively, sharply raises Attack and Sp. Atk. Used up.', effect: { kind: 'held', consumable: true }, usableInBattle: false, usableOnMon: false },
  { id: 'heat_sink', name: 'Heat Sink', pocket: 'held', price: 2000, description: 'Held: restores 1/16 of max HP at the end of every turn.', effect: { kind: 'held', consumable: false }, usableInBattle: false, usableOnMon: false },
  { id: 'lab_pin', name: 'Lab Pin', pocket: 'held', price: 1500, description: 'Held: moves of its own type hit 20% harder.', effect: { kind: 'held', consumable: false }, usableInBattle: false, usableOnMon: false },
  { id: 'low_latency_band', name: 'Low-Latency Band', pocket: 'held', price: 1500, description: 'Held: sometimes (20%) moves first.', effect: { kind: 'held', consumable: false }, usableInBattle: false, usableOnMon: false },
  { id: 'calibration_lens', name: 'Calibration Lens', pocket: 'held', price: 1000, description: 'Held: raises the accuracy of its moves by 10%.', effect: { kind: 'held', consumable: false }, usableInBattle: false, usableOnMon: false },
  { id: 'edge_case', name: 'Edge Case', pocket: 'held', price: 1000, description: 'Held: doubles its critical-hit chance.', effect: { kind: 'held', consumable: false }, usableInBattle: false, usableOnMon: false },
  { id: 'overclock_chip', name: 'Overclock Chip', pocket: 'held', price: 2500, description: 'Held: attacks hit 30% harder but cost 1/10 of max HP.', effect: { kind: 'held', consumable: false }, usableInBattle: false, usableOnMon: false },
  { id: 'firewall_mesh', name: 'Firewall Mesh', pocket: 'held', price: 1500, description: 'Held: physical attackers lose 1/8 of their max HP.', effect: { kind: 'held', consumable: false }, usableInBattle: false, usableOnMon: false },
  { id: 'eval_report', name: 'Eval Report', pocket: 'held', price: 3000, description: 'Held: earns 50% more EXP.', effect: { kind: 'held', consumable: false }, usableInBattle: false, usableOnMon: false },
  { id: 'frozen_weights', name: 'Frozen Weights', pocket: 'held', price: 500, description: 'Held: prevents evolution.', effect: { kind: 'held', consumable: false }, usableInBattle: false, usableOnMon: false },
  // ── evolution items ───────────────────────────────────────────────────
  { id: 'skip_link', name: 'Skip Link', pocket: 'evolution', price: 2100, description: 'A bridge of light. Lets an MLP evolve into ResNet.', effect: { kind: 'evolution' }, usableInBattle: false, usableOnMon: true },
  { id: 'decay_charm', name: 'Decay Charm', pocket: 'evolution', price: 2100, description: 'A charm that sheds a little weight. Lets Adam evolve into AdamW.', effect: { kind: 'evolution' }, usableInBattle: false, usableOnMon: true },
  // ── story tools (finale) ─────────────────────────────────────────────
  { id: 'eval_suite', name: 'Eval Suite', pocket: 'key', price: 0, description: 'Switches the EVAL light on and off. Behaviour can change when it is on.', effect: { kind: 'key' }, usableInBattle: false, usableOnMon: false },
  { id: 'probe', name: 'Probe', pocket: 'key', price: 0, description: 'Reads the true state behind any display. Usable in battle.', effect: { kind: 'key' }, usableInBattle: true, usableOnMon: false },
  { id: 'promptdex', name: 'PromptDex', pocket: 'key', price: 0, description: 'Records every LLMMON you see and catch.', effect: { kind: 'key' }, usableInBattle: false, usableOnMon: false },
  { id: 'fast_tokens', name: 'Fast Tokens', pocket: 'key', price: 0, description: 'Hold B outdoors to move at inference speed.', effect: { kind: 'key' }, usableInBattle: false, usableOnMon: false },
]

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(ITEM_LIST.map((i) => [i.id, i]))
