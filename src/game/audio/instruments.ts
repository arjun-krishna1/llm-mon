// Instrument and drum presets. Purely data: the voice code lives in synth.ts.

export type Wave =
  | 'pulse12' // 12.5% duty: thin, nasal
  | 'pulse25' // 25% duty: the classic handheld lead
  | 'pulse50' // square
  | 'pulse25s' // 25% with softened upper harmonics
  | 'pulse50s' // soft square (flute-ish)
  | 'tri' // ideal triangle
  | 'wave4' // 4-bit, 32-step stepped triangle (wave-channel bass)
  | 'sine'
  | 'bell' // a few bright harmonics, for chimes

export interface Instrument {
  wave: Wave
  /** Peak gain at velocity 15. */
  gain: number
  /** ADSR (seconds, seconds, 0..1 level, seconds). Release starts at the gate point. */
  a: number
  d: number
  s: number
  r: number
  /** Fraction of the written note length before release starts (default 0.96). */
  gate?: number
  /** Vibrato: [depth cents, rate Hz, onset delay s]. */
  vib?: [number, number, number]
  /** Portamento time for `X>Y` slides (seconds). Default: whole note. */
  slide?: number
  /** Seconds per arpeggio step (default ~ 1/60 s * 2, handheld-style). */
  arpStep?: number
  /** Start this many semitones off and glide to pitch over the given seconds. */
  pitchEnv?: [number, number]
  /** Optional lowpass cutoff in Hz. */
  lp?: number
  detune?: number
}

export const INSTRUMENTS: Record<string, Instrument> = {
  // --- pulse leads ---------------------------------------------------------
  lead: { wave: 'pulse25', gain: 0.16, a: 0.006, d: 0.14, s: 0.68, r: 0.06, vib: [14, 5.6, 0.2] },
  leadsoft: { wave: 'pulse25s', gain: 0.17, a: 0.012, d: 0.2, s: 0.7, r: 0.1, vib: [12, 5, 0.22] },
  lead12: { wave: 'pulse12', gain: 0.15, a: 0.004, d: 0.12, s: 0.62, r: 0.05, vib: [12, 6, 0.18] },
  lead50: { wave: 'pulse50', gain: 0.12, a: 0.006, d: 0.12, s: 0.7, r: 0.06, vib: [12, 5.5, 0.2] },
  flute: { wave: 'pulse50s', gain: 0.17, a: 0.03, d: 0.2, s: 0.78, r: 0.12, vib: [10, 4.8, 0.25] },
  brass: { wave: 'pulse25', gain: 0.17, a: 0.01, d: 0.18, s: 0.72, r: 0.07, pitchEnv: [-0.35, 0.03], vib: [14, 5.8, 0.2] },
  stac: { wave: 'pulse25', gain: 0.15, a: 0.003, d: 0.08, s: 0.3, r: 0.03, gate: 0.6 },
  pluck: { wave: 'pulse25', gain: 0.15, a: 0.002, d: 0.16, s: 0.15, r: 0.05, gate: 0.85 },
  pluck12: { wave: 'pulse12', gain: 0.13, a: 0.002, d: 0.14, s: 0.12, r: 0.04, gate: 0.85 },
  // --- pulse harmony -------------------------------------------------------
  harm: { wave: 'pulse12', gain: 0.1, a: 0.008, d: 0.16, s: 0.55, r: 0.06 },
  harm50: { wave: 'pulse50s', gain: 0.1, a: 0.015, d: 0.2, s: 0.6, r: 0.08 },
  arp: { wave: 'pulse12', gain: 0.1, a: 0.003, d: 0.1, s: 0.5, r: 0.04, arpStep: 1 / 30 },
  arpfast: { wave: 'pulse12', gain: 0.09, a: 0.003, d: 0.06, s: 0.6, r: 0.03, arpStep: 1 / 60 },
  broken: { wave: 'pulse12', gain: 0.1, a: 0.002, d: 0.12, s: 0.25, r: 0.04, gate: 0.9 },
  brokensoft: { wave: 'pulse25s', gain: 0.1, a: 0.004, d: 0.18, s: 0.3, r: 0.06, gate: 0.9 },
  pad: { wave: 'pulse50s', gain: 0.075, a: 0.08, d: 0.3, s: 0.8, r: 0.2 },
  bell: { wave: 'bell', gain: 0.14, a: 0.002, d: 0.5, s: 0.0, r: 0.2, gate: 1 },
  // --- wave channel ----------------------------------------------------------
  bass: { wave: 'wave4', gain: 0.3, a: 0.004, d: 0.05, s: 0.85, r: 0.03, gate: 0.9 },
  basslong: { wave: 'wave4', gain: 0.3, a: 0.006, d: 0.1, s: 0.8, r: 0.06, gate: 0.97 },
  bassstac: { wave: 'wave4', gain: 0.32, a: 0.003, d: 0.06, s: 0.5, r: 0.03, gate: 0.6 },
  basssoft: { wave: 'tri', gain: 0.32, a: 0.01, d: 0.12, s: 0.8, r: 0.08, gate: 0.94 },
  tri: { wave: 'tri', gain: 0.3, a: 0.01, d: 0.1, s: 0.85, r: 0.06 },
  // --- sfx only --------------------------------------------------------------
  blip: { wave: 'pulse25', gain: 0.14, a: 0.002, d: 0.06, s: 0.5, r: 0.03 },
}

export interface DrumDef {
  noise?: {
    type: 'long' | 'short'
    /** playbackRate at start and end (pitch drop). */
    rate: number
    rateEnd?: number
    gain: number
    decay: number
    attack?: number
    hp?: number
    lp?: number
    bp?: number
  }
  tone?: {
    wave: Wave
    from: number
    to: number
    time: number
    gain: number
    decay: number
  }
}

/** Drum kit for the noise channel (lowercase tokens in patterns). */
export const DRUMS: Record<string, DrumDef> = {
  k: {
    tone: { wave: 'tri', from: 160, to: 42, time: 0.07, gain: 0.55, decay: 0.13 },
    noise: { type: 'long', rate: 0.5, gain: 0.05, decay: 0.015, lp: 2500 },
  },
  kk: {
    // heavier kick
    tone: { wave: 'tri', from: 190, to: 38, time: 0.09, gain: 0.62, decay: 0.17 },
    noise: { type: 'long', rate: 0.4, gain: 0.07, decay: 0.02, lp: 2000 },
  },
  s: {
    noise: { type: 'long', rate: 0.9, rateEnd: 0.6, gain: 0.16, decay: 0.12, hp: 900 },
    tone: { wave: 'tri', from: 260, to: 170, time: 0.04, gain: 0.22, decay: 0.06 },
  },
  sl: {
    // light snare / rim
    noise: { type: 'long', rate: 1, gain: 0.09, decay: 0.06, hp: 1800 },
  },
  h: { noise: { type: 'short', rate: 6, gain: 0.05, decay: 0.025, hp: 6000 } },
  hs: { noise: { type: 'long', rate: 1, gain: 0.035, decay: 0.02, hp: 7000 } }, // shaker
  o: { noise: { type: 'short', rate: 6, gain: 0.045, decay: 0.12, hp: 5500 } },
  c: { noise: { type: 'long', rate: 1, rateEnd: 0.8, gain: 0.08, decay: 0.7, hp: 3000 } },
  t: { tone: { wave: 'tri', from: 240, to: 120, time: 0.1, gain: 0.45, decay: 0.16 }, noise: { type: 'long', rate: 0.4, gain: 0.04, decay: 0.03, lp: 1800 } },
  tl: { tone: { wave: 'tri', from: 170, to: 80, time: 0.12, gain: 0.48, decay: 0.2 }, noise: { type: 'long', rate: 0.3, gain: 0.04, decay: 0.03, lp: 1500 } },
  th: { tone: { wave: 'tri', from: 330, to: 170, time: 0.08, gain: 0.42, decay: 0.13 }, noise: { type: 'long', rate: 0.5, gain: 0.04, decay: 0.03, lp: 2200 } },
  m: { noise: { type: 'short', rate: 2.2, gain: 0.05, decay: 0.05, bp: 3200 } }, // metallic tick
}
