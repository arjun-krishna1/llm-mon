// Seedable RNG (mulberry32). `?seed=N` seeds it; otherwise random.

let s = 0

export function seedRng(seed: number): void {
  s = seed >>> 0
}

seedRng(Math.floor(Math.random() * 2 ** 32))

/** Uniform float in [0, 1). */
export function rng(): number {
  s = (s + 0x6d2b79f5) >>> 0
  let t = s
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** Integer in [min, max] inclusive. */
export function randInt(min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}
