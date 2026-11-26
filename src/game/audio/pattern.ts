// Compact, human-writable note pattern format. See docs/AUDIO.md for the full reference.
//
//   'C4:8 E4 G4:4 -:4 | @pluck v10 A4^47:2 ~:4 B4>D5:4 | (k:8 h:8 s:8 h:8)x2'
//
// Tokens (whitespace separated):
//   C4:8      note C in octave 4 for an eighth note (duration = 1/den of a whole note)
//   F#5:4.    dotted quarter; durations may be summed: G4:2+8
//   E4        duration omitted -> reuse the previous duration
//   -:4       rest
//   ~:8       tie: extend the previous note by an eighth
//   C4>G4:4   pitch slide from C4 to G4 over the note
//   C4^47:2   arpeggio: cycle C4 +0 +4 +7 semitones (digits 0-9, a=10, b=11, c=12)
//   C4:8!     accent (velocity x1.25)      C4:8?  ghost (velocity x0.55)
//   k:8       drum hit (noise channel): any lowercase kit name, see instruments.ts
//   @lead     switch instrument preset
//   v12       velocity 0-15 (default 12)
//   T+5 / T-3 / T0   transpose following pitches by N semitones
//   |         bar line: checked against the song's bar length (throws if misaligned)
//   ( ... )x3 repeat a group N times (groups may nest)

export const TICKS_PER_WHOLE = 192

export interface NoteEvent {
  /** Start, in ticks from the start of the section. */
  tick: number
  /** Length in ticks. */
  dur: number
  /** MIDI note number, or -1 for drum hits. */
  midi: number
  drum?: string
  /** Slide target (MIDI). */
  to?: number
  /** Arpeggio semitone offsets (first is normally 0). */
  arp?: number[]
  /** 0..1 */
  vel: number
  inst: string
}

export interface ParsedChannel {
  events: NoteEvent[]
  ticks: number
}

const NOTE_RE = /^([A-G])([#b]?)(-?\d)$/
const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

export function pitchToMidi(p: string): number {
  const m = NOTE_RE.exec(p)
  if (!m) throw new Error(`bad pitch "${p}"`)
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0
  return (parseInt(m[3], 10) + 1) * 12 + SEMI[m[1]] + acc
}

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export function midiToPitch(m: number): string {
  return NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1)
}

export function parseDuration(s: string): number {
  let total = 0
  for (const part of s.split('+')) {
    const m = /^(\d+)(\.{0,2})$/.exec(part)
    if (!m) throw new Error(`bad duration "${s}"`)
    const den = parseInt(m[1], 10)
    let t = TICKS_PER_WHOLE / den
    if (!Number.isInteger(t)) throw new Error(`duration 1/${den} is not representable (ticks/whole=${TICKS_PER_WHOLE})`)
    if (m[2] === '.') t *= 1.5
    else if (m[2] === '..') t *= 1.75
    total += t
  }
  return total
}

/** Expand `( ... )xN` groups textually. */
export function expandRepeats(src: string): string {
  let s = src
  // innermost first
  const re = /\(([^()]*)\)x(\d+)/
  for (let guard = 0; guard < 1000; guard++) {
    const m = re.exec(s)
    if (!m) break
    s = s.slice(0, m.index) + ` ${Array(parseInt(m[2], 10)).fill(m[1]).join(' ')} ` + s.slice(m.index + m[0].length)
  }
  if (/[()]/.test(s)) throw new Error(`unbalanced repeat group in pattern: ${src.slice(0, 60)}`)
  return s
}

function arpDigits(s: string): number[] {
  return [...s].map((c) => {
    const v = parseInt(c, 16)
    if (Number.isNaN(v) || v > 12) throw new Error(`bad arpeggio digit "${c}"`)
    return v
  })
}

export interface ParseOptions {
  inst: string
  /** Ticks per bar for `|` checks. */
  barTicks?: number
  /** Label for error messages. */
  label?: string
}

export function parseChannel(src: string, opts: ParseOptions): ParsedChannel {
  const events: NoteEvent[] = []
  let tick = 0
  let lastDur = TICKS_PER_WHOLE / 4
  let vel = 12 / 15
  let inst = opts.inst
  let transpose = 0
  let bar = 0
  const label = opts.label ?? 'pattern'
  const tokens = expandRepeats(src).split(/\s+/).filter(Boolean)
  for (const tok of tokens) {
    if (tok === '|') {
      bar++
      if (opts.barTicks && tick % opts.barTicks !== 0) {
        throw new Error(`${label}: bar line #${bar} at tick ${tick} is not on a bar boundary (bar=${opts.barTicks} ticks, off by ${tick % opts.barTicks})`)
      }
      continue
    }
    if (tok[0] === '@') {
      inst = tok.slice(1)
      continue
    }
    if (/^v\d+$/.test(tok)) {
      vel = Math.min(15, parseInt(tok.slice(1), 10)) / 15
      continue
    }
    if (/^T[+-]?\d+$/.test(tok)) {
      transpose = parseInt(tok.slice(1), 10)
      continue
    }
    let body = tok
    let v = vel
    if (body.endsWith('!')) {
      v = Math.min(1, vel * 1.25)
      body = body.slice(0, -1)
    } else if (body.endsWith('?')) {
      v = vel * 0.55
      body = body.slice(0, -1)
    }
    const colon = body.indexOf(':')
    const head = colon >= 0 ? body.slice(0, colon) : body
    let dur = lastDur
    if (colon >= 0) {
      dur = parseDuration(body.slice(colon + 1))
      lastDur = dur
    }
    if (head === '-') {
      tick += dur
      continue
    }
    if (head === '~') {
      const prev = events[events.length - 1]
      if (!prev || prev.tick + prev.dur !== tick) throw new Error(`${label}: tie "~" without a directly preceding note (tick ${tick})`)
      prev.dur += dur
      tick += dur
      continue
    }
    if (/^[a-z][a-z0-9]*$/.test(head)) {
      events.push({ tick, dur, midi: -1, drum: head, vel: v, inst })
      tick += dur
      continue
    }
    // pitch [>pitch] [^digits]
    let main = head
    let arp: number[] | undefined
    const caret = main.indexOf('^')
    if (caret >= 0) {
      arp = arpDigits(main.slice(caret + 1))
      main = main.slice(0, caret)
    }
    let to: number | undefined
    const gt = main.indexOf('>')
    if (gt >= 0) {
      to = pitchToMidi(main.slice(gt + 1)) + transpose
      main = main.slice(0, gt)
    }
    let midi: number
    try {
      midi = pitchToMidi(main) + transpose
    } catch {
      throw new Error(`${label}: cannot parse token "${tok}" at tick ${tick}`)
    }
    events.push({ tick, dur, midi, to, arp, vel: v, inst })
    tick += dur
  }
  return { events, ticks: tick }
}

/** Transpose every pitch in a pattern string by `semis` (text level). */
export function transpose(src: string, semis: number): string {
  return `T${semis >= 0 ? '+' : ''}${semis} ${src} T0`
}

/** Ticks per bar for a time signature like [4,4] or [6,8]. */
export function barTicks(sig: [number, number]): number {
  return (TICKS_PER_WHOLE / sig[1]) * sig[0]
}
