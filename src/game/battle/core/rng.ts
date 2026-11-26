// Deterministic RNG used by every battle/data helper. No Phaser, no Math.random.

/**
 * Minimal RNG contract: `next()` returns a float in [0, 1).
 * Anything with that shape works (e.g. `{ next: Math.random }` for non-seeded play),
 * but pass a `SeededRng` when you want reproducible battles (`?seed=N`).
 */
export interface Rng {
  next(): number
}

/** Mulberry32: tiny, fast, good enough for games, fully reproducible. */
export class SeededRng implements Rng {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Snapshot / restore so a save can resume the same random stream. */
  getState(): number {
    return this.state
  }

  setState(state: number): void {
    this.state = state >>> 0
  }
}

export function createRng(seed: number = Date.now()): SeededRng {
  return new SeededRng(seed)
}

/** Integer in [0, n). */
export function randInt(rng: Rng, n: number): number {
  return Math.min(n - 1, Math.floor(rng.next() * n))
}

/** Integer in [min, max] inclusive. */
export function randRange(rng: Rng, min: number, max: number): number {
  return min + randInt(rng, max - min + 1)
}

/** True with probability p (0..1). */
export function chance(rng: Rng, p: number): boolean {
  return rng.next() < p
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick() from empty list')
  return items[randInt(rng, items.length)]
}

/** Weighted pick; weights need not sum to 1. */
export function pickWeighted<T>(rng: Rng, items: readonly T[], weight: (item: T) => number): T {
  const total = items.reduce((sum, it) => sum + Math.max(0, weight(it)), 0)
  if (total <= 0) return pick(rng, items)
  let roll = rng.next() * total
  for (const it of items) {
    roll -= Math.max(0, weight(it))
    if (roll < 0) return it
  }
  return items[items.length - 1]
}
