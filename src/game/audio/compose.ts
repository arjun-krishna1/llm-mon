// Composition helpers: chord charts -> bass / accompaniment pattern strings.
// Everything here just produces ordinary pattern text (see pattern.ts), so the
// output can be printed, inspected and hand-edited.
//
// Chart syntax: bars separated by `|`, chords within a bar split it evenly,
// or take an explicit length with `:den` (e.g. 'G:2 A:4 A7:4').
//   'D | G Bm | D/F# | A7'
// Chord symbols: root + quality (m 7 m7 maj7 6 m6 sus2 sus4 dim aug add9 9) + optional /bass.

import { midiToPitch, parseDuration, pitchToMidi, TICKS_PER_WHOLE } from './pattern.ts'

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

const QUALITIES: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  add9: [0, 4, 7, 14],
  '9': [0, 4, 7, 10, 14],
  m9: [0, 3, 7, 10, 14],
  '5': [0, 7],
}

export interface Chord {
  sym: string
  /** Pitch class of the root. */
  root: number
  /** Intervals above the root (semitones). */
  ivs: number[]
  /** Pitch class of the bass note. */
  bass: number
}

function parsePc(s: string): number {
  const base = PC[s[0]]
  if (base === undefined) throw new Error(`bad chord root "${s}"`)
  const acc = s[1] === '#' ? 1 : s[1] === 'b' ? -1 : 0
  return (base + acc + 12) % 12
}

export function parseChord(sym: string): Chord {
  const m = /^([A-G][#b]?)([a-z0-9]*)(?:\/([A-G][#b]?))?$/.exec(sym)
  if (!m) throw new Error(`bad chord "${sym}"`)
  const ivs = QUALITIES[m[2]]
  if (!ivs) throw new Error(`unknown chord quality "${m[2]}" in "${sym}"`)
  const root = parsePc(m[1])
  return { sym, root, ivs, bass: m[3] ? parsePc(m[3]) : root }
}

export interface ChartSlot {
  chord: Chord
  tick: number
  ticks: number
  bar: number
}

/** Parse a chart into timed chord slots. */
export function parseChart(chart: string, barTicks: number): ChartSlot[] {
  const slots: ChartSlot[] = []
  const bars = chart.split('|').map((b) => b.trim()).filter((b) => b.length > 0)
  bars.forEach((b, bi) => {
    const toks = b.split(/\s+/)
    const explicit = toks.map((t) => (t.includes(':') ? parseDuration(t.split(':')[1]) : 0))
    const used = explicit.reduce((a, x) => a + x, 0)
    const free = explicit.filter((x) => x === 0).length
    const each = free ? (barTicks - used) / free : 0
    let tick = bi * barTicks
    toks.forEach((t, i) => {
      const ticks = explicit[i] || each
      slots.push({ chord: parseChord(t.split(':')[0]), tick, ticks, bar: bi })
      tick += ticks
    })
    if (tick !== (bi + 1) * barTicks) throw new Error(`chart bar ${bi + 1} "${b}" does not fill the bar`)
  })
  return slots
}

const STD = [1, 2, 4, 8, 16, 32, 64, 3, 6, 12, 24, 48, 96, 192]

/** Express a tick count as a duration token like `4` or `2+8`. */
export function durTok(ticks: number): string {
  const direct = TICKS_PER_WHOLE / ticks
  if (Number.isInteger(direct)) return String(direct)
  if (Number.isInteger(TICKS_PER_WHOLE / (ticks / 1.5)) && STD.includes(TICKS_PER_WHOLE / (ticks / 1.5))) return `${TICKS_PER_WHOLE / (ticks / 1.5)}.`
  const parts: string[] = []
  let left = ticks
  for (const den of [1, 2, 4, 8, 16, 32, 64, 3, 6, 12, 24, 48, 96, 192]) {
    const t = TICKS_PER_WHOLE / den
    while (left >= t) {
      parts.push(String(den))
      left -= t
    }
  }
  if (left !== 0) throw new Error(`cannot express ${ticks} ticks`)
  return parts.join('+')
}

/** MIDI note of pitch class `pc` closest to `center`. */
function nearest(pc: number, center: number): number {
  const base = center - ((((center - pc) % 12) + 12) % 12)
  return center - base > 6 ? base + 12 : base
}

function name(m: number): string {
  return midiToPitch(m).replace('A#', 'Bb').replace('D#', 'Eb').replace('G#', 'Ab')
}

export type BassStyle =
  | 'hold' // root held for the chord
  | 'q' // root on every quarter
  | 'rf' // root, fifth alternating quarters
  | 'r5' // root:4. fifth:8 pairs (dotted, bouncy)
  | 'oct8' // root / octave eighths
  | 'drive8' // straight root eighths
  | 'drive16' // galloping root 8th + two 16ths
  | 'walk' // quarter-note walk: root, chord tones, approach to next root
  | 'waltz' // 3/4: root then two fifths (or root:2. if a bar is one chord)
  | 'stride8' // 8ths: root, 5th, octave, 5th
  | 'rf2' // root, fifth alternating half notes
  | 'lilt' // 6/8: root:4 fifth:8 | third:4 fifth:8 per dotted-quarter beat

/** Generate a bass line pattern from a chart. `center` is the target MIDI pitch for roots (e.g. 'D3'). */
export function bassLine(chart: string, style: BassStyle, opts: { barTicks?: number; center?: string; v?: number } = {}): string {
  const bt = opts.barTicks ?? 192
  const center = pitchToMidi(opts.center ?? 'D3')
  const slots = parseChart(chart, bt)
  const out: string[] = []
  if (opts.v !== undefined) out.push(`v${opts.v}`)
  let lastBar = 0
  slots.forEach((s, i) => {
    if (s.bar !== lastBar) {
      out.push('|')
      lastBar = s.bar
    }
    const root = nearest(s.chord.bass, center)
    const hasFifth = s.chord.ivs.includes(7)
    const fifthPc = (s.chord.root + 7) % 12
    let fifth = nearest(fifthPc, root + 5)
    if (!hasFifth) fifth = nearest((s.chord.root + s.chord.ivs[s.chord.ivs.length > 2 ? 2 : 1]) % 12, root + 5)
    const q = 48
    const e = 24
    const n = (m: number, t: number) => out.push(`${name(m)}:${durTok(t)}`)
    const fill = (stepTicks: number, pick: (k: number) => number) => {
      const count = Math.floor(s.ticks / stepTicks)
      for (let k = 0; k < count; k++) n(pick(k), stepTicks)
      const rest = s.ticks - count * stepTicks
      if (rest) n(pick(count), rest)
    }
    switch (style) {
      case 'hold':
        n(root, s.ticks)
        break
      case 'q':
        fill(q, () => root)
        break
      case 'rf':
        fill(q, (k) => (k % 2 ? fifth : root))
        break
      case 'r5':
        if (s.ticks % 96 === 0) for (let k = 0; k < s.ticks / 96; k++) { n(root, 72); n(fifth, 24) }
        else fill(q, (k) => (k % 2 ? fifth : root))
        break
      case 'oct8':
        fill(e, (k) => (k % 2 ? root + 12 : root))
        break
      case 'drive8':
        fill(e, () => root)
        break
      case 'drive16':
        if (s.ticks % q === 0) for (let k = 0; k < s.ticks / q; k++) { n(root, e); n(root, 12); n(root, 12) }
        else fill(e, () => root)
        break
      case 'stride8':
        fill(e, (k) => [root, fifth, root + 12, fifth][k % 4])
        break
      case 'rf2':
        fill(96, (k) => (k % 2 ? fifth : root))
        break
      case 'lilt': {
        const third = nearest((s.chord.root + s.chord.ivs[1]) % 12, root + 4)
        for (let k = 0; k < Math.floor(s.ticks / 72); k++) {
          n(k % 2 ? third : root, 48)
          n(fifth, 24)
        }
        break
      }
      case 'waltz':
        if (s.ticks === 144) { n(root, q); n(fifth, q); n(fifth, q) }
        else fill(q, (k) => (k % 2 ? fifth : root))
        break
      case 'walk': {
        const next = slots[(i + 1) % slots.length]
        const nextRoot = nearest(next.chord.bass, root)
        const beats = Math.max(1, Math.floor(s.ticks / q))
        const croot = nearest(s.chord.root, root)
        const up = [root, ...s.chord.ivs.slice(1, 3).map((iv) => croot + iv)].map((m) => (m < root ? m + 12 : m))
        for (let k = 0; k < beats; k++) {
          let m = up[k % up.length]
          if (k === beats - 1 && beats >= 3) {
            const d = nextRoot - root
            m = d === 0 ? fifth : Math.abs(d) <= 2 ? up[1] : nextRoot + (d > 0 ? -1 : 1)
          }
          n(m, q)
        }
        const rest = s.ticks - beats * q
        if (rest) n(root, rest)
        break
      }
    }
  })
  return out.join(' ')
}

export type CompStyle =
  | 'alberti8' // 1 5 3 5 eighths
  | 'up8' // 1 3 5 3 eighths
  | 'up16' // 1 3 5 8 sixteenths
  | 'chord' // one held note with a fast chord arpeggio (^ digits)
  | 'stab' // off-beat chord stabs (8th rest, 8th arp-chord)
  | 'pulse8' // repeated arp-chord eighths
  | 'guide' // held guide tone (3rd/7th), smooth voice leading
  | 'waltz' // 3/4: rest on 1, chord on 2 and 3
  | 'roll68' // 6/8: root, fifth, tenth eighths per dotted-quarter beat

/** Accompaniment from a chart. `center` is the register (MIDI pitch name). */
export function comp(chart: string, style: CompStyle, opts: { barTicks?: number; center?: string; v?: number; inst?: string } = {}): string {
  const bt = opts.barTicks ?? 192
  const center = pitchToMidi(opts.center ?? 'A4')
  const slots = parseChart(chart, bt)
  const out: string[] = []
  if (opts.inst) out.push(`@${opts.inst}`)
  if (opts.v !== undefined) out.push(`v${opts.v}`)
  let lastBar = 0
  let guide = center
  for (const s of slots) {
    if (s.bar !== lastBar) {
      out.push('|')
      lastBar = s.bar
    }
    const root = nearest(s.chord.root, center - 4)
    const tones = s.chord.ivs.map((iv) => root + iv)
    const third = tones[1]
    const fifth = tones[2] ?? tones[1]
    const n = (m: number, t: number, arp?: string) => out.push(`${name(m)}${arp ? '^' + arp : ''}:${durTok(t)}`)
    const digits = s.chord.ivs.slice(0, 4).map((iv) => iv.toString(16)).join('')
    const fill = (step: number, pick: (k: number) => number) => {
      const count = Math.floor(s.ticks / step)
      for (let k = 0; k < count; k++) n(pick(k), step)
      const rest = s.ticks - count * step
      if (rest) out.push(`-:${durTok(rest)}`)
    }
    switch (style) {
      case 'alberti8':
        fill(24, (k) => [root, fifth, third, fifth][k % 4])
        break
      case 'up8':
        fill(24, (k) => [root, third, fifth, third][k % 4])
        break
      case 'up16':
        fill(12, (k) => [root, third, fifth, root + 12][k % 4])
        break
      case 'chord':
        n(root, s.ticks, digits)
        break
      case 'pulse8':
        for (let k = 0; k < s.ticks / 24; k++) n(root, 24, digits)
        break
      case 'stab':
        for (let k = 0; k < s.ticks / 48; k++) {
          out.push('-:8')
          n(root, 24, digits)
        }
        break
      case 'roll68':
        for (let k = 0; k < Math.floor(s.ticks / 72); k++) {
          n(root, 24)
          n(fifth, 24)
          n(third + 12, 24)
        }
        break
      case 'waltz':
        if (s.ticks === 144) {
          out.push('-:4')
          n(root, 48, digits)
          n(root, 48, digits)
        } else for (let k = 0; k < s.ticks / 48; k++) n(root, 48, digits)
        break
      case 'guide': {
        // prefer 3rd or 7th, nearest to the previous guide tone
        const cands = s.chord.ivs.filter((iv) => iv === 3 || iv === 4 || iv === 10 || iv === 9 || iv === 14)
        const pcs = (cands.length ? cands : s.chord.ivs).map((iv) => (s.chord.root + iv) % 12)
        let best = guide
        let bd = 99
        for (const pc of pcs) {
          const m = nearest(pc, guide)
          const d = Math.abs(m - guide) + Math.abs(m - center) * 0.3
          if (d < bd) {
            bd = d
            best = m
          }
        }
        guide = best
        n(best, s.ticks)
        break
      }
    }
  }
  return out.join(' ')
}

/**
 * Apply a rhythm template to every chord of a chart. Template tokens are
 * `R` (root/bass note), `F` (fifth), `O` (octave), `T` (third), `S` (seventh or
 * sixth if present, else octave), `C` (root with chord arpeggio) or `-` (rest),
 * each with a duration: 'R:8. R:8. O:8 R:8. R:8. F:8'. The template is cycled
 * and cut to each chord's length.
 */
export function riff(chart: string, tmpl: string, opts: { barTicks?: number; center?: string; v?: number; inst?: string } = {}): string {
  const bt = opts.barTicks ?? 192
  const center = pitchToMidi(opts.center ?? 'A2')
  const slots = parseChart(chart, bt)
  const toks = tmpl.split(/\s+/).filter(Boolean).map((t) => {
    const [sym, d] = t.split(':')
    return { sym, ticks: parseDuration(d) }
  })
  const out: string[] = []
  if (opts.inst) out.push(`@${opts.inst}`)
  if (opts.v !== undefined) out.push(`v${opts.v}`)
  let lastBar = 0
  for (const s of slots) {
    if (s.bar !== lastBar) {
      out.push('|')
      lastBar = s.bar
    }
    const root = nearest(s.chord.bass, center)
    const croot = nearest(s.chord.root, root)
    const iv = (k: number) => s.chord.ivs[k]
    const above = (m: number) => (m < root ? m + 12 : m)
    const pick: Record<string, number> = {
      R: root,
      F: above(croot + (s.chord.ivs.includes(7) ? 7 : (iv(2) ?? 7))),
      O: root + 12,
      T: above(croot + iv(1)),
      S: s.chord.ivs.length > 3 ? above(croot + iv(3)) : root + 12,
    }
    const digits = s.chord.ivs.slice(0, 4).map((x) => x.toString(16)).join('')
    let left = s.ticks
    for (let k = 0; left > 0; k++) {
      const t = toks[k % toks.length]
      const len = Math.min(t.ticks, left)
      left -= len
      if (t.sym === '-') out.push(`-:${durTok(len)}`)
      else if (t.sym === 'C') out.push(`${name(croot)}^${digits}:${durTok(len)}`)
      else out.push(`${name(pick[t.sym] ?? root)}:${durTok(len)}`)
    }
  }
  return out.join(' ')
}

/** Repeat a pattern string n times. */
export function rep(src: string, n: number): string {
  return Array(n).fill(src).join(' | ')
}

/** Join bar groups with bar lines. */
export function bars(...parts: string[]): string {
  return parts.join(' | ')
}
