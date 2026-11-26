// Sound effects: synthesized one-shots, plus jingles written in the pattern format.

import { pitchToMidi } from './pattern.ts'
import type { SongDef } from './song.ts'
import { midiToHz, noise, tone, type Tracker } from './synth.ts'

const hz = (p: string) => midiToHz(pitchToMidi(p))

export type SfxPlay = (ctx: BaseAudioContext, dest: AudioNode, t: number, i: number, tr?: Tracker) => number

export interface SfxDef {
  /** Synthesized one-shot. Returns the time it is silent. `i` counts loop repetitions. */
  play?: SfxPlay
  /** Jingle: a short song played on the sfx bus. Music pauses and resumes after it. */
  jingle?: SongDef
  /** Re-trigger interval when used with sfxLoop(). */
  loopPeriod?: number
  /** Ignore re-triggers closer than this (seconds). Default 0.025. */
  minGap?: number
}

const jingle = (id: string, bpm: number, ch: SongDef['channels'], loop: SongDef['loop']): SongDef => ({
  id,
  bpm,
  once: true,
  channels: ch,
  echo: { beats: 0.5, feedback: 0.2, wet: 0.2 },
  loop,
})

export const SFX: Record<string, SfxDef> = {
  select: {
    play: (c, d, t, _i, tr) => tone(c, d, { wave: 'pulse12', from: hz('G6'), t, dur: 0.05, gain: 0.15, a: 0.001 }, tr),
  },
  cancel: {
    play: (c, d, t, _i, tr) => {
      tone(c, d, { wave: 'pulse25', from: hz('E6'), t, dur: 0.045, gain: 0.12, a: 0.001 }, tr)
      return tone(c, d, { wave: 'pulse25', from: hz('A5'), t: t + 0.045, dur: 0.07, gain: 0.12, a: 0.001 }, tr)
    },
  },
  text: {
    minGap: 0.04,
    play: (c, d, t, _i, tr) => tone(c, d, { wave: 'pulse50s', from: hz('D6'), t, dur: 0.022, gain: 0.045, a: 0.001 }, tr),
  },
  bump: {
    minGap: 0.12,
    play: (c, d, t, _i, tr) => {
      noise(c, d, { type: 'long', rate: 0.25, t, dur: 0.08, gain: 0.12, lp: 400 }, tr)
      return tone(c, d, { wave: 'tri', from: 120, to: 50, slide: 0.08, t, dur: 0.14, gain: 0.5, a: 0.002 }, tr)
    },
  },
  door: {
    play: (c, d, t, _i, tr) => {
      tone(c, d, { wave: 'tri', from: 180, to: 90, t, dur: 0.1, gain: 0.3 }, tr)
      noise(c, d, { type: 'long', rate: 0.35, t, dur: 0.28, gain: 0.18, a: 0.03, lp: 1800, sweepTo: 500 }, tr)
      return noise(c, d, { type: 'short', rate: 3, t: t + 0.24, dur: 0.03, gain: 0.08, hp: 1000 }, tr)
    },
  },
  stairs: {
    play: (c, d, t, _i, tr) => {
      let end = t
      ;['G4', 'E4', 'C4', 'A3'].forEach((p, k) => {
        const s = t + k * 0.085
        noise(c, d, { type: 'long', rate: 0.7, t: s, dur: 0.03, gain: 0.08, hp: 1500 }, tr)
        end = tone(c, d, { wave: 'tri', from: hz(p), to: hz(p) * 0.8, t: s, dur: 0.07, gain: 0.32 }, tr)
      })
      return end
    },
  },
  exit: {
    play: (c, d, t, _i, tr) => {
      tone(c, d, { wave: 'pulse12', from: 600, to: 200, t, dur: 0.3, gain: 0.045, a: 0.02 }, tr)
      return noise(c, d, { type: 'long', rate: 0.6, rateEnd: 0.15, t, dur: 0.36, gain: 0.2, a: 0.02, lp: 2500, sweepTo: 300 }, tr)
    },
  },
  ledge: {
    play: (c, d, t, _i, tr) => {
      tone(c, d, { wave: 'pulse25', from: 380, to: 900, slide: 0.1, t, dur: 0.14, gain: 0.11 }, tr)
      noise(c, d, { type: 'long', rate: 0.3, t: t + 0.22, dur: 0.05, gain: 0.1, lp: 600 }, tr)
      return tone(c, d, { wave: 'tri', from: 140, to: 60, t: t + 0.22, dur: 0.09, gain: 0.35 }, tr)
    },
  },
  grass: {
    minGap: 0.05,
    play: (c, d, t, _i, tr) => {
      noise(c, d, { type: 'long', rate: 0.8, t, dur: 0.05, gain: 0.09, hp: 2500 }, tr)
      return noise(c, d, { type: 'long', rate: 0.6, t: t + 0.045, dur: 0.06, gain: 0.07, hp: 2200 }, tr)
    },
  },
  menu_open: {
    play: (c, d, t, _i, tr) => {
      tone(c, d, { wave: 'pulse12', from: hz('C6'), t, dur: 0.04, gain: 0.12, a: 0.001 }, tr)
      return tone(c, d, { wave: 'pulse12', from: hz('G6'), t: t + 0.035, dur: 0.07, gain: 0.12, a: 0.001 }, tr)
    },
  },
  save: {
    play: (c, d, t, _i, tr) => {
      let end = t
      ;['C6', 'E6', 'G6', 'C7'].forEach((p, k) => {
        end = tone(c, d, { wave: 'bell', from: hz(p), t: t + k * 0.07, dur: 0.45, gain: 0.13, pan: (k - 1.5) * 0.15 }, tr)
      })
      return end
    },
  },
  heal: {
    jingle: jingle(
      'heal',
      132,
      { p1: { inst: 'bell', echo: 0.3 }, p2: { inst: 'pad' }, w: { inst: 'basssoft' } },
      {
        p1: 'C6:8 G5:8 E5:8 G5:8 C6:8 E6:8 G6:4 | E6:2 -:2',
        p2: 'v13 E5:2 G5:2 | C5:2 -:2',
        w: 'v10 C3:1 | C3:2 -:2',
      },
    ),
  },
  item_get: {
    jingle: jingle(
      'item_get',
      176,
      { p1: { inst: 'brass' }, p2: { inst: 'harm' }, w: { inst: 'bass' } },
      {
        p1: 'E5:12 G5:12 C6:12 E6:4. D6:8 E6:4 | C6:2 -:2',
        p2: 'C5:12 E5:12 G5:12 G5:4. F5:8 G5:4 | E5:2 -:2',
        w: 'C3:4 C3:4 G2:4 G2:4 | C3:2 -:2',
        n: 'k:4 -:4 k:4 s:4 | k:2 -:2',
      },
    ),
  },
  key_item_get: {
    jingle: jingle(
      'key_item_get',
      160,
      { p1: { inst: 'brass' }, p2: { inst: 'harm' }, w: { inst: 'bass' } },
      {
        p1: 'G5:8. G5:16 C6:8. C6:16 E6:4 G6:4 | F6:8 E6:8 D6:8 F6:8 E6:4. D6:8 | C6:2 -:2',
        p2: 'E5:8. E5:16 G5:8. G5:16 C6:4 E6:4 | A5:8 G5:8 F5:8 A5:8 B5:4. G5:8 | E5:2 -:2',
        w: 'C3:4 E3:4 G3:4 C3:4 | D3:4 F3:4 G2:4 G3:4 | C3:2 -:2',
        n: 'k:8 s:16 s:16 k:8 s:16 s:16 k:4 c:4 | k:4 s:4 k:4 s:8 s:8 | c:2 -:2',
      },
    ),
  },
  level_up: {
    jingle: jingle(
      'level_up',
      200,
      { p1: { inst: 'lead' }, p2: { inst: 'arp' }, w: { inst: 'bass' } },
      {
        p1: 'C5:16 E5:16 G5:16 C6:16 D5:16 F5:16 A5:16 D6:16 E5:16 G5:16 B5:16 E6:16 F5:16 A5:16 C6:16 F6:16 | B5:8 D6:8 G6:8 F6:8 E6:4 -:4',
        p2: 'v10 C4^47:4 D4^37:4 E4^37:4 F4^47:4 | G4^47a:2 C5^47:4 -:4',
        w: 'C3:4 D3:4 E3:4 F3:4 | G2:2 C3:4 -:4',
        n: 'k:4 h:4 k:4 h:4 | k:8 s:8 s:8 s:8 c:4 -:4',
      },
    ),
  },
  hit: {
    play: (c, d, t, _i, tr) => {
      tone(c, d, { wave: 'tri', from: 220, to: 55, t, dur: 0.14, gain: 0.45 }, tr)
      return noise(c, d, { type: 'long', rate: 1.4, rateEnd: 0.25, t, dur: 0.18, gain: 0.3 }, tr)
    },
  },
  hit_super: {
    play: (c, d, t, _i, tr) => {
      tone(c, d, { wave: 'tri', from: 300, to: 40, t, dur: 0.22, gain: 0.5 }, tr)
      noise(c, d, { type: 'short', rate: 4, rateEnd: 1, t, dur: 0.12, gain: 0.1 }, tr)
      noise(c, d, { type: 'long', rate: 1.8, rateEnd: 0.2, t, dur: 0.3, gain: 0.32, hold: 0.03 }, tr)
      return noise(c, d, { type: 'long', rate: 1, rateEnd: 0.3, t: t + 0.09, dur: 0.16, gain: 0.2 }, tr)
    },
  },
  hit_weak: {
    play: (c, d, t, _i, tr) => {
      tone(c, d, { wave: 'tri', from: 160, to: 80, t, dur: 0.08, gain: 0.25 }, tr)
      return noise(c, d, { type: 'long', rate: 0.7, rateEnd: 0.3, t, dur: 0.1, gain: 0.22, lp: 1600 }, tr)
    },
  },
  faint: {
    play: (c, d, t, _i, tr) => {
      tone(c, d, { wave: 'pulse25', from: 880, to: 110, slide: 0.75, t, dur: 0.85, gain: 0.13, a: 0.005, hold: 0.5, vib: [30, 9] }, tr)
      return noise(c, d, { type: 'long', rate: 0.5, rateEnd: 0.1, t: t + 0.6, dur: 0.35, gain: 0.14, lp: 1200 }, tr)
    },
  },
  orb_throw: {
    play: (c, d, t, _i, tr) => {
      tone(c, d, { wave: 'pulse12', from: 300, to: 1400, slide: 0.28, t, dur: 0.3, gain: 0.06, a: 0.05 }, tr)
      return noise(c, d, { type: 'long', rate: 1, t, dur: 0.3, gain: 0.22, a: 0.1, bp: 800, sweepTo: 4000 }, tr)
    },
  },
  orb_shake: {
    play: (c, d, t, _i, tr) => {
      noise(c, d, { type: 'short', rate: 3, t, dur: 0.03, gain: 0.1, hp: 1200 }, tr)
      tone(c, d, { wave: 'tri', from: 300, to: 360, t, dur: 0.22, gain: 0.3, vib: [120, 16] }, tr)
      return noise(c, d, { type: 'short', rate: 3, t: t + 0.13, dur: 0.03, gain: 0.08, hp: 1200 }, tr)
    },
  },
  orb_catch: {
    play: (c, d, t, _i, tr) => {
      noise(c, d, { type: 'short', rate: 4, t, dur: 0.03, gain: 0.16, hp: 900 }, tr)
      tone(c, d, { wave: 'tri', from: 200, to: 100, t, dur: 0.05, gain: 0.3 }, tr)
      let end = t
      ;['G5', 'B5', 'D6', 'G6'].forEach((p, k) => {
        end = tone(c, d, { wave: 'bell', from: hz(p), t: t + 0.12 + k * 0.08, dur: k === 3 ? 1.0 : 0.6, gain: 0.13, pan: (k - 1.5) * 0.12 }, tr)
      })
      tone(c, d, { wave: 'pulse12', from: hz('G6'), arp: [0, 4, 7, 12], arpStep: 0.03, t: t + 0.36, dur: 0.5, gain: 0.035 }, tr)
      return end
    },
  },
  orb_break: {
    play: (c, d, t, _i, tr) => {
      noise(c, d, { type: 'long', rate: 1.5, rateEnd: 0.4, t, dur: 0.2, gain: 0.25 }, tr)
      tone(c, d, { wave: 'tri', from: 150, to: 60, t, dur: 0.12, gain: 0.3 }, tr)
      return tone(c, d, { wave: 'pulse12', from: hz('G5'), arp: [12, 7, 3, 0, -5, -9], arpStep: 0.045, t: t + 0.05, dur: 0.32, gain: 0.09, hold: 0.15 }, tr)
    },
  },
  run: {
    play: (c, d, t, _i, tr) => {
      ;[0, 0.09, 0.18].forEach((o) => noise(c, d, { type: 'long', rate: 0.5, t: t + o, dur: 0.04, gain: 0.15, lp: 1200 }, tr))
      return noise(c, d, { type: 'long', rate: 1, t: t + 0.2, dur: 0.3, gain: 0.13, a: 0.05, bp: 3000, sweepTo: 600 }, tr)
    },
  },
  exp: {
    loopPeriod: 0.16,
    play: (c, d, t, i, tr) => {
      const base = hz('C5') * Math.pow(2, Math.min(i, 8) / 12)
      return tone(c, d, { wave: 'pulse12', from: base, to: base * 1.5, slide: 0.15, t, dur: 0.16, gain: 0.07, a: 0.004, hold: 0.09 }, tr)
    },
  },
  low_hp: {
    loopPeriod: 0.9,
    play: (c, d, t, _i, tr) => {
      tone(c, d, { wave: 'pulse50s', from: hz('B5'), t, dur: 0.1, gain: 0.07, hold: 0.05 }, tr)
      return tone(c, d, { wave: 'pulse50s', from: hz('B5'), t: t + 0.16, dur: 0.1, gain: 0.07, hold: 0.05 }, tr)
    },
  },
  battle_start: {
    play: (c, d, t, _i, tr) => {
      tone(c, d, { wave: 'pulse12', from: 200, to: 1600, slide: 0.5, t, dur: 0.55, gain: 0.08, a: 0.02, hold: 0.4 }, tr)
      tone(c, d, { wave: 'pulse25', from: hz('E5'), arp: [0, 3, 7, 12], arpStep: 1 / 40, t, dur: 0.5, gain: 0.04, a: 0.2, hold: 0.25, pan: 0.3 }, tr)
      noise(c, d, { type: 'long', rate: 1, t, dur: 0.55, gain: 0.16, a: 0.4, bp: 400, sweepTo: 5000 }, tr)
      noise(c, d, { type: 'long', rate: 1.2, rateEnd: 0.3, t: t + 0.55, dur: 0.25, gain: 0.24 }, tr)
      return tone(c, d, { wave: 'tri', from: 200, to: 45, t: t + 0.55, dur: 0.2, gain: 0.45 }, tr)
    },
  },
  stat_up: {
    play: (c, d, t, _i, tr) => {
      const arp = [0, 4, 7, 12, 4, 7, 12, 16, 7, 12, 16, 19]
      tone(c, d, { wave: 'pulse12', from: hz('C5'), arp, arpStep: 0.04, t, dur: 0.52, gain: 0.09, hold: 0.36, pan: -0.2 }, tr)
      return tone(c, d, { wave: 'pulse25s', from: hz('C5'), arp, arpStep: 0.04, t: t + 0.02, dur: 0.52, gain: 0.05, hold: 0.36, pan: 0.2 }, tr)
    },
  },
  stat_down: {
    play: (c, d, t, _i, tr) => {
      const arp = [12, 7, 4, 0, 7, 4, 0, -5, 4, 0, -5, -8]
      tone(c, d, { wave: 'pulse12', from: hz('C6'), arp, arpStep: 0.04, t, dur: 0.52, gain: 0.09, hold: 0.36, pan: -0.2 }, tr)
      return tone(c, d, { wave: 'pulse25s', from: hz('C6'), arp, arpStep: 0.04, t: t + 0.02, dur: 0.52, gain: 0.05, hold: 0.36, pan: 0.2 }, tr)
    },
  },
  exclaim: {
    play: (c, d, t, _i, tr) => {
      tone(c, d, { wave: 'pulse25', from: hz('B5'), t, dur: 0.05, gain: 0.14, a: 0.001 }, tr)
      tone(c, d, { wave: 'pulse25', from: hz('E6'), t: t + 0.05, dur: 0.16, gain: 0.14, hold: 0.05 }, tr)
      return tone(c, d, { wave: 'pulse25', from: hz('E6'), t: t + 0.22, dur: 0.12, gain: 0.04, hold: 0.03 }, tr)
    },
  },
}
