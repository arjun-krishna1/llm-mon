// Creature cries: short parametric gestures (pulse/triangle/bell voices + noise),
// hand-tuned presets for the slice roster and a deterministic hash-derived recipe
// for any other species id.

import type { Wave } from './instruments.ts'
import { noise, tone, type Tracker } from './synth.ts'

export type CryPart =
  | {
      k: 't'
      w: Wave
      /** Start (s) and length (s). */
      at: number
      dur: number
      /** Pitch in semitones above the recipe base; optional slide target. */
      n: number
      to?: number
      slide?: number
      g: number
      vib?: [number, number]
      arp?: number[]
      step?: number
      hold?: number
      a?: number
      pan?: number
    }
  | {
      k: 'n'
      type: 'long' | 'short'
      at: number
      dur: number
      rate: number
      rateEnd?: number
      g: number
      hp?: number
      lp?: number
      bp?: number
      sweepTo?: number
      a?: number
      hold?: number
    }

export interface CryRecipe {
  /** Base frequency (Hz). */
  base: number
  parts: CryPart[]
  /** Bit-crush to this many levels (e.g. 6) for a glitchy, distorted voice. */
  crush?: number
  /** Output trim (tuned so peaks sit near the other sfx, ~0.35-0.45). */
  gain?: number
}

const C5 = 523.25

export const CRIES: Record<string, CryRecipe> = {
  // warm two-note chirp with a soft tail
  claude_fable: {
    base: C5,
    gain: 1.0,
    parts: [
      { k: 't', w: 'pulse25s', at: 0, dur: 0.11, n: 12, to: 14, g: 0.16, hold: 0.05 },
      { k: 't', w: 'tri', at: 0, dur: 0.11, n: 0, to: 2, g: 0.18, hold: 0.05 },
      { k: 't', w: 'pulse25s', at: 0.1, dur: 0.3, n: 7, to: 5, g: 0.17, hold: 0.1, vib: [25, 7] },
      { k: 't', w: 'tri', at: 0.1, dur: 0.3, n: -5, to: -7, g: 0.16, hold: 0.1 },
      { k: 'n', type: 'long', at: 0.18, dur: 0.24, rate: 0.5, g: 0.035, lp: 1800, a: 0.04 },
    ],
  },
  // bright rising arpeggio blip
  gpt_5_5: {
    base: C5 * 2,
    gain: 1.6,
    parts: [
      { k: 't', w: 'pulse12', at: 0, dur: 0.26, n: 0, arp: [0, 4, 7, 12, 16, 19], step: 0.035, g: 0.13, hold: 0.16 },
      { k: 't', w: 'pulse25', at: 0.015, dur: 0.24, n: -12, arp: [0, 4, 7, 12, 16, 19], step: 0.035, g: 0.07, hold: 0.12, pan: 0.25 },
      { k: 't', w: 'bell', at: 0.2, dur: 0.15, n: 19, g: 0.08 },
    ],
  },
  // crystalline descending triad
  glm: {
    base: C5 * 2,
    gain: 1.4,
    parts: [
      { k: 't', w: 'bell', at: 0, dur: 0.22, n: 7, g: 0.16, pan: -0.2 },
      { k: 't', w: 'bell', at: 0.08, dur: 0.24, n: 3, g: 0.16 },
      { k: 't', w: 'bell', at: 0.16, dur: 0.34, n: 0, g: 0.17, pan: 0.2 },
      { k: 't', w: 'pulse12', at: 0, dur: 0.4, n: 19, arp: [0, -4, -7], step: 0.08, g: 0.03, hold: 0.2 },
    ],
  },
  // distorted growl with bit-crushed noise glitches
  hallucihound: {
    base: 98,
    gain: 0.55,
    crush: 6,
    parts: [
      { k: 't', w: 'pulse50', at: 0, dur: 0.48, n: 2, to: -3, g: 0.2, a: 0.03, hold: 0.28, vib: [70, 23] },
      { k: 't', w: 'pulse25', at: 0.01, dur: 0.46, n: 14, to: 9, g: 0.08, a: 0.03, hold: 0.25, vib: [90, 31] },
      { k: 'n', type: 'long', at: 0, dur: 0.45, rate: 0.18, g: 0.08, lp: 900, a: 0.03, hold: 0.25 },
      { k: 'n', type: 'short', at: 0.12, dur: 0.05, rate: 1.6, g: 0.07 },
      { k: 'n', type: 'short', at: 0.27, dur: 0.04, rate: 2.6, g: 0.06 },
      { k: 't', w: 'pulse12', at: 0.33, dur: 0.06, n: 38, arp: [0, 11, 3], step: 0.012, g: 0.05 },
    ],
  },
  // low woody thump, then a chirp
  gemma_4: {
    base: 220,
    gain: 0.85,
    parts: [
      { k: 't', w: 'tri', at: 0, dur: 0.12, n: -3, to: -15, slide: 0.08, g: 0.42 },
      { k: 'n', type: 'long', at: 0, dur: 0.05, rate: 0.3, g: 0.1, lp: 900 },
      { k: 't', w: 'pulse25s', at: 0.09, dur: 0.2, n: 7, to: 12, slide: 0.1, g: 0.15, hold: 0.06, vib: [20, 8] },
      { k: 't', w: 'tri', at: 0.09, dur: 0.2, n: -5, to: 0, slide: 0.1, g: 0.14, hold: 0.06 },
    ],
  },
  // tiny quick double beep
  gpt_5_4_mini: {
    base: C5 * 2,
    gain: 1.5,
    parts: [
      { k: 't', w: 'pulse25', at: 0, dur: 0.05, n: 9, g: 0.13, a: 0.002, hold: 0.025 },
      { k: 't', w: 'pulse25', at: 0.075, dur: 0.07, n: 14, g: 0.13, a: 0.002, hold: 0.03 },
      { k: 't', w: 'tri', at: 0.075, dur: 0.07, n: 2, g: 0.12, hold: 0.03 },
    ],
  },
  // airy whoosh, then a yip
  mistral_medium: {
    base: C5,
    gain: 1.4,
    parts: [
      { k: 'n', type: 'long', at: 0, dur: 0.3, rate: 1, g: 0.2, a: 0.12, bp: 700, sweepTo: 3600 },
      { k: 't', w: 'pulse12', at: 0.17, dur: 0.16, n: 7, to: 19, slide: 0.06, g: 0.14, hold: 0.05, vib: [30, 11] },
      { k: 't', w: 'tri', at: 0.17, dur: 0.16, n: -5, to: 7, slide: 0.06, g: 0.14, hold: 0.05 },
    ],
  },
  // fast upward zip
  gemini_flash: {
    base: 330,
    gain: 1.15,
    parts: [
      { k: 't', w: 'pulse12', at: 0, dur: 0.16, n: 0, to: 36, slide: 0.11, g: 0.13, hold: 0.07 },
      { k: 't', w: 'tri', at: 0, dur: 0.16, n: -12, to: 24, slide: 0.11, g: 0.18, hold: 0.07 },
      { k: 'n', type: 'long', at: 0.09, dur: 0.18, rate: 1, g: 0.08, hp: 4000, a: 0.02 },
      { k: 't', w: 'bell', at: 0.13, dur: 0.15, n: 36, g: 0.06 },
    ],
  },
  // short elegant three-note figure
  claude_haiku: {
    base: C5,
    gain: 1.0,
    parts: [
      { k: 't', w: 'pulse25s', at: 0, dur: 0.09, n: 16, g: 0.15, hold: 0.04 },
      { k: 't', w: 'pulse25s', at: 0.085, dur: 0.09, n: 19, g: 0.15, hold: 0.04 },
      { k: 't', w: 'pulse25s', at: 0.17, dur: 0.28, n: 14, g: 0.16, hold: 0.1, vib: [18, 6] },
      { k: 't', w: 'bell', at: 0, dur: 0.2, n: 4, g: 0.08 },
      { k: 't', w: 'tri', at: 0.17, dur: 0.28, n: 2, g: 0.13, hold: 0.1 },
    ],
  },
}

/** FNV-1a hash -> deterministic pseudo random stream. */
function rng(id: string): () => number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  let s = h >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return ((s >>> 0) % 100000) / 100000
  }
}

const SCALE = [0, 2, 4, 5, 7, 9, 12, 14]

/** Deterministic cry for any species id without a preset. */
export function hashCry(id: string): CryRecipe {
  const r = rng(id)
  const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)]
  const base = 180 * Math.pow(2, r() * 2.3) // ~180..890 Hz
  const lead: Wave = pick(['pulse12', 'pulse25', 'pulse50', 'pulse25s'] as Wave[])
  const notes = 2 + Math.floor(r() * 2)
  const contour = pick(['up', 'down', 'arch'])
  const parts: CryPart[] = []
  let at = 0
  let n = contour === 'down' ? 12 : 0
  const vib: [number, number] | undefined = r() < 0.5 ? [15 + r() * 40, 5 + r() * 12] : undefined
  for (let i = 0; i < notes; i++) {
    const last = i === notes - 1
    const dur = last ? 0.16 + r() * 0.16 : 0.06 + r() * 0.06
    const step = pick(SCALE.slice(1, 5))
    const dir = contour === 'up' ? 1 : contour === 'down' ? -1 : i < notes / 2 ? 1 : -1
    const next = n + dir * step
    const glide = r() < 0.4
    parts.push({ k: 't', w: lead, at, dur, n, to: glide ? next : undefined, slide: dur * 0.7, g: 0.15, hold: dur * 0.4, vib: last ? vib : undefined })
    parts.push({ k: 't', w: 'tri', at, dur, n: n - 12, to: glide ? next - 12 : undefined, slide: dur * 0.7, g: 0.13, hold: dur * 0.4 })
    at += dur * 0.85
    n = next
  }
  if (r() < 0.6) parts.push({ k: 'n', type: r() < 0.3 ? 'short' : 'long', at: at * 0.6, dur: 0.15 + r() * 0.12, rate: 0.3 + r() * 0.8, g: 0.04 + r() * 0.04, lp: 2500, a: 0.03 })
  return { base, parts, gain: 1 }
}

export function cryRecipe(id: string): CryRecipe {
  return CRIES[id] ?? hashCry(id)
}

export interface CryOptions {
  /** Pitch multiplier (1 = normal, 2 = an octave up). */
  pitch?: number
  /** Fainting variant: lower, slower and falling. */
  faint?: boolean
}

/** Schedule a cry at time t. Returns the time it ends. */
export function playCry(ctx: BaseAudioContext, dest: AudioNode, t: number, recipe: CryRecipe, opts: CryOptions = {}, tr?: Tracker): number {
  const faint = !!opts.faint
  const ratio = (opts.pitch && opts.pitch > 0 ? opts.pitch : 1) * (faint ? 0.78 : 1)
  const stretch = faint ? 1.45 : 1
  // parts -> pre -> (bit-crusher) -> trim -> dest: crush depth is independent of the trim
  const out = ctx.createGain()
  const trim = ctx.createGain()
  trim.gain.value = recipe.gain ?? 1
  trim.connect(dest)
  if (recipe.crush) {
    const sh = ctx.createWaveShaper()
    const N = 1024
    const curve = new Float32Array(N)
    const lv = recipe.crush
    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1)) * 2 - 1
      curve[i] = Math.round(x * lv) / lv
    }
    sh.curve = curve
    out.connect(sh)
    sh.connect(trim)
  } else out.connect(trim)
  let end = t
  for (const p of recipe.parts) {
    const at = t + p.at * stretch
    const dur = p.dur * stretch
    if (p.k === 't') {
      const f = (semi: number) => recipe.base * ratio * Math.pow(2, semi / 12)
      const to = faint ? (p.to ?? p.n) - 6 : p.to
      end = Math.max(
        end,
        tone(
          ctx,
          out,
          {
            wave: p.w,
            from: f(p.n),
            to: to !== undefined ? f(to) : undefined,
            slide: faint ? dur : p.slide !== undefined ? p.slide * stretch : undefined,
            t: at,
            dur,
            gain: p.g,
            a: p.a,
            hold: p.hold !== undefined ? p.hold * stretch : undefined,
            vib: p.vib,
            arp: faint ? undefined : p.arp,
            arpStep: p.step,
            pan: p.pan,
          },
          tr,
        ),
      )
    } else {
      end = Math.max(
        end,
        noise(
          ctx,
          out,
          { type: p.type, rate: p.rate * ratio, rateEnd: p.rateEnd !== undefined ? p.rateEnd * ratio : faint ? p.rate * ratio * 0.5 : undefined, t: at, dur, gain: p.g, hp: p.hp, lp: p.lp, bp: p.bp, sweepTo: p.sweepTo, a: p.a, hold: p.hold },
          tr,
        ),
      )
    }
  }
  return end
}
