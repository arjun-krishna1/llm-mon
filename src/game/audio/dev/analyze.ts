// Static analysis of compiled songs: key membership, ranges, strong-beat clashes,
// bass-vs-chart agreement. Pure (no DOM / WebAudio), runs in the browser or Node.

import { parseChart } from '../compose.ts'
import { midiToPitch } from '../pattern.ts'
import { compileSong, type ChannelEvent, type CompiledSong, type SongDef } from '../song.ts'

const MODES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10, 11], // natural + raised 7th (harmonic)
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
}
const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

export function scaleOf(key: string): Set<number> {
  const [tonic, mode] = key.split(' ')
  const root = (PC[tonic[0]] + (tonic[1] === '#' ? 1 : tonic[1] === 'b' ? -1 : 0) + 12) % 12
  return new Set((MODES[mode] ?? MODES.major).map((x) => (x + root) % 12))
}

export interface SectionReport {
  name: string
  bars: number
  notes: Record<string, number>
  range: Record<string, [string, string]>
  outOfKey: { ch: string; bar: number; beat: number; pitch: string; chordTone: boolean }[]
  clashes: { bar: number; beat: number; a: string; b: string; interval: number }[]
  bassMismatch: { bar: number; beat: number; chord: string; bass: string }[]
  melodyNonChordOnDownbeat: { bar: number; beat: number; pitch: string; chord: string }[]
  repeatedBars: number
}

export interface SongReport {
  id: string
  key: string
  bpm: number
  introBars: number
  loopBars: number
  introSec: number
  loopSec: number
  sections: SectionReport[]
}

function activeAt(events: ChannelEvent[], ch: string, tick: number): ChannelEvent[] {
  return events.filter((e) => e.ch === ch && e.midi >= 0 && e.tick <= tick && e.tick + e.dur > tick)
}

function pitches(e: ChannelEvent): number[] {
  if (e.arp && e.arp.length > 1) return e.arp.map((o) => e.midi + o)
  return [e.midi]
}

function analyzeSection(c: CompiledSong, name: string, events: ChannelEvent[], ticks: number, chart: string | undefined): SectionReport {
  const def = c.def
  const scale = scaleOf(def.key ?? 'C major')
  const bt = c.barTicks
  const sig = def.sig ?? [4, 4]
  // strong beats: every quarter in x/4, every dotted quarter in 6/8
  const beatTicks = sig[1] === 8 ? 72 : 48
  const slots = chart ? parseChart(chart, bt) : []
  const chordAt = (tick: number) => slots.find((s) => s.tick <= tick && s.tick + s.ticks > tick)
  const rep: SectionReport = {
    name,
    bars: ticks / bt,
    notes: {},
    range: {},
    outOfKey: [],
    clashes: [],
    bassMismatch: [],
    melodyNonChordOnDownbeat: [],
    repeatedBars: 0,
  }
  for (const ch of ['p1', 'p2', 'w']) {
    const evs = events.filter((e) => e.ch === ch && e.midi >= 0)
    rep.notes[ch] = evs.length
    if (evs.length) {
      const lo = Math.min(...evs.map((e) => e.midi))
      const hi = Math.max(...evs.map((e) => e.midi))
      rep.range[ch] = [midiToPitch(lo), midiToPitch(hi)]
    }
    for (const e of evs) {
      for (const m of pitches(e)) {
        if (!scale.has(((m % 12) + 12) % 12)) {
          const slot = chordAt(e.tick)
          const chordTone = !!slot && slot.chord.ivs.some((iv) => (slot.chord.root + iv) % 12 === ((m % 12) + 12) % 12)
          rep.outOfKey.push({ ch, bar: Math.floor(e.tick / bt) + 1, beat: (e.tick % bt) / beatTicks + 1, pitch: midiToPitch(m), chordTone })
        }
      }
    }
  }
  // strong-beat clashes between voices (at least one voice attacking on that beat)
  for (let tk = 0; tk < ticks; tk += beatTicks) {
    const voices: { ch: string; m: number; fresh: boolean }[] = []
    for (const ch of ['p1', 'p2', 'w']) {
      for (const e of activeAt(events, ch, tk)) for (const m of pitches(e)) voices.push({ ch, m, fresh: e.tick === tk })
    }
    for (let i = 0; i < voices.length; i++) {
      for (let j = i + 1; j < voices.length; j++) {
        const a = voices[i]
        const b = voices[j]
        if (a.ch === b.ch) continue
        if (!a.fresh && !b.fresh) continue
        const iv = (((a.m - b.m) % 12) + 12) % 12
        const ic = Math.min(iv, 12 - iv)
        const bassInvolved = a.ch === 'w' || b.ch === 'w'
        // m2/M7 anywhere; tritone only against the bass
        if (ic === 1 || (ic === 6 && bassInvolved && (a.ch === 'p1' || b.ch === 'p1'))) {
          rep.clashes.push({ bar: Math.floor(tk / bt) + 1, beat: (tk % bt) / beatTicks + 1, a: `${a.ch}:${midiToPitch(a.m)}`, b: `${b.ch}:${midiToPitch(b.m)}`, interval: iv })
        }
      }
    }
  }
  // bass agrees with chart at each chord onset; melody chord tones on bar downbeats
  for (const s of slots) {
    const bass = activeAt(events, 'w', s.tick).find((e) => e.tick === s.tick)
    if (bass && ((bass.midi % 12) + 12) % 12 !== s.chord.bass) {
      rep.bassMismatch.push({ bar: s.bar + 1, beat: (s.tick % bt) / beatTicks + 1, chord: s.chord.sym, bass: midiToPitch(bass.midi) })
    }
    const mel = activeAt(events, 'p1', s.tick).find((e) => e.tick === s.tick)
    if (mel) {
      const pc = ((mel.midi % 12) + 12) % 12
      const rel = (pc - s.chord.root + 12) % 12
      const tones = s.chord.ivs.map((iv) => iv % 12)
      // allow 9ths, 6ths and sus4 as colour
      if (!tones.includes(rel) && ![2, 9, 5].includes(rel)) {
        rep.melodyNonChordOnDownbeat.push({ bar: s.bar + 1, beat: (s.tick % bt) / beatTicks + 1, pitch: midiToPitch(mel.midi), chord: s.chord.sym })
      }
    }
  }
  // repetition: how many melody bars are exact repeats of an earlier bar
  const barSig: string[] = []
  for (let b = 0; b < ticks / bt; b++) {
    barSig.push(
      events
        .filter((e) => e.ch === 'p1' && e.tick >= b * bt && e.tick < (b + 1) * bt)
        .map((e) => `${e.tick - b * bt}:${e.midi}:${e.dur}`)
        .join(','),
    )
  }
  rep.repeatedBars = barSig.filter((s, i) => s && barSig.indexOf(s) < i).length
  return rep
}

export function analyzeSong(def: SongDef): SongReport {
  const c = compileSong(def)
  const sections: SectionReport[] = []
  if (c.introTicks) sections.push(analyzeSection(c, 'intro', c.intro, c.introTicks, def.chords?.intro))
  sections.push(analyzeSection(c, 'loop', c.loop, c.loopTicks, def.chords?.loop))
  return {
    id: def.id,
    key: def.key ?? '?',
    bpm: def.bpm,
    introBars: c.introTicks / c.barTicks,
    loopBars: c.loopTicks / c.barTicks,
    introSec: c.introTicks * c.secPerTick,
    loopSec: c.loopTicks * c.secPerTick,
    sections,
  }
}

/** Flattened note list for piano-roll rendering. */
export function noteDump(def: SongDef): { barTicks: number; introTicks: number; loopTicks: number; notes: [string, number, number, number, number][] } {
  const c = compileSong(def)
  const notes: [string, number, number, number, number][] = []
  for (const e of c.intro) notes.push([e.ch, e.tick, e.dur, e.midi, e.arp ? e.arp.length : 0])
  for (const e of c.loop) notes.push([e.ch, e.tick + c.introTicks, e.dur, e.midi, e.arp ? e.arp.length : 0])
  return { barTicks: c.barTicks, introTicks: c.introTicks, loopTicks: c.loopTicks, notes }
}
