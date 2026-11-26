// Bag items. Prices are in tokens (the slice currency).

export type ItemPocket = 'orbs' | 'medicine' | 'field' | 'key'

export type ItemEffect =
  | { kind: 'catch'; /** Catch-rate multiplier ("ball bonus"). */ multiplier: number }
  | { kind: 'heal'; amount: number }
  | { kind: 'cure' } // cures every status, including hallucinating
  | { kind: 'repel'; steps: number }
  | { kind: 'key' }

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
  { id: 'debugger', name: 'Debugger', pocket: 'medicine', price: 250, description: 'Steps through the bug. Cures any status condition.', effect: { kind: 'cure' }, usableInBattle: true, usableOnMon: true },
  { id: 'firewall', name: 'Firewall', pocket: 'field', price: 350, description: 'Blocks weak wild LLMMON for 100 steps.', effect: { kind: 'repel', steps: 100 }, usableInBattle: false, usableOnMon: false },
  { id: 'promptdex', name: 'PromptDex', pocket: 'key', price: 0, description: 'Records every LLMMON you see and catch.', effect: { kind: 'key' }, usableInBattle: false, usableOnMon: false },
  { id: 'fast_tokens', name: 'Fast Tokens', pocket: 'key', price: 0, description: 'Hold B outdoors to move at inference speed.', effect: { kind: 'key' }, usableInBattle: false, usableOnMon: false },
]

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(ITEM_LIST.map((i) => [i.id, i]))
