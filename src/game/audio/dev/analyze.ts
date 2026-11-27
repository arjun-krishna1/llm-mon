// Static analysis of compiled songs: key membership, ranges, strong-beat clashes,
// bass-vs-chart agreement. Pure (no DOM / WebAudio), runs in the browser or Node.

import { parseChart } from '../compose.ts'
import { midiToPitch } from '../pattern.ts'
import { INSTRUMENTS } from '../instruments.ts'
import { channelSetup, compileSong, type ChannelEvent, type CompiledSong, type SongDef } from '../song.ts'

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

// ===========================================================================
// Strict harmony audit (docs/AUDIO.md "Harmony rules"). Works on the fully
// expanded events of the pitched voices (p1 melody, p2 harmony, w bass), with
// arpeggios expanded to all their tones, across the whole track (intro + loop,
// plus the loop seam), on every segment between note/beat/chord boundaries.
// ===========================================================================

export interface Finding {
  rule: string
  at: string
  msg: string
}

export interface AuditReport {
  id: string
  errors: Finding[]
  warnings: Finding[]
  accepted: Finding[]
  stats: { bassRootFifthPct: number; segments: number }
}

interface ANote {
  id: number
  ch: 'p1' | 'p2' | 'w'
  start: number
  end: number
  midi: number
  pitches: number[]
  arp: boolean
  prev?: ANote
  next?: ANote
}

interface ASlot {
  start: number
  end: number
  root: number
  pcs: Set<number>
  ivs: number[]
  bass: number
  sym: string
  section: string
}

const pcOf = (m: number) => ((m % 12) + 12) % 12

export function auditSong(def: SongDef): AuditReport {
  const c = compileSong(def)
  const bt = c.barTicks
  const sig = def.sig ?? [4, 4]
  const beatLen = sig[1] === 8 ? 72 : 48
  const strongLen = sig[1] === 8 ? 72 : sig[0] === 3 ? 144 : 96
  const total = c.introTicks + c.loopTicks
  const scale = scaleOf(def.key ?? 'C major')
  const pos = (t: number) => {
    const tt = t % total
    return `${Math.floor(tt / bt) + 1}:${(((tt % bt) / beatLen) + 1).toFixed(2).replace(/\.?0+$/, '')}`
  }
  const nm = midiToPitch

  // ---- notes (loop rendered twice so the seam is covered)
  const raw: ChannelEvent[] = [
    ...c.intro,
    ...c.loop.map((e) => ({ ...e, tick: e.tick + c.introTicks })),
    ...c.loop.map((e) => ({ ...e, tick: e.tick + c.introTicks + c.loopTicks })),
  ]
  const notes: ANote[] = []
  let nid = 0
  for (const e of raw) {
    if (e.midi < 0 || e.ch === 'n') continue
    const pitches = e.arp && e.arp.length > 1 ? [...new Set(e.arp.map((o) => e.midi + o))] : [e.midi]
    notes.push({ id: nid++, ch: e.ch as ANote['ch'], start: e.tick, end: e.tick + e.dur, midi: e.midi, pitches, arp: pitches.length > 1 })
  }
  for (const ch of ['p1', 'p2', 'w'] as const) {
    const v = notes.filter((n) => n.ch === ch).sort((a, b) => a.start - b.start)
    for (let i = 0; i < v.length; i++) {
      v[i].prev = v[i - 1]
      v[i].next = v[i + 1]
    }
  }
  const horizon = total + c.loopTicks

  // ---- chord slots (intro, loop, loop again)
  const slots: ASlot[] = []
  const addChart = (chart: string | undefined, off: number, section: string) => {
    if (!chart) return
    for (const s of parseChart(chart, bt)) {
      const ivs = s.chord.ivs.map((iv) => iv % 12)
      const pcs = new Set(ivs.map((iv) => (s.chord.root + iv) % 12))
      pcs.add(s.chord.bass)
      slots.push({ start: off + s.tick, end: off + s.tick + s.ticks, root: s.chord.root, pcs, ivs, bass: s.chord.bass, sym: s.chord.sym, section })
    }
  }
  addChart(def.chords?.intro, 0, 'intro')
  addChart(def.chords?.loop, c.introTicks, 'loop')
  addChart(def.chords?.loop, total, 'loop')
  const slotAt = (t: number) => slots.find((s) => s.start <= t && t < s.end)
  const nextSlot = (s: ASlot) => slots.find((x) => x.start === s.end) ?? slots.find((x) => x.section === 'loop')

  const errors: Finding[] = []
  const warnings: Finding[] = []
  const accepted: Finding[] = []
  const seen = new Set<string>()
  const inRange = (t: number) => t < total + 2 * bt // first loop + a little past the seam
  const add = (list: Finding[], key: string, rule: string, t: number, msg: string) => {
    if (!inRange(t)) return
    const k = `${rule}|${key}`
    if (seen.has(k)) return
    seen.add(k)
    list.push({ rule, at: pos(t), msg })
  }

  const isWeak = (t: number) => t % 48 !== 0
  const stepwise = (n: ANote) =>
    !!n.prev && !!n.next && n.prev.end >= n.start - 6 && Math.abs(n.midi - n.prev.midi) <= 2 && Math.abs(n.next.midi - n.midi) <= 2
  const passing = (x: ANote, y: ANote) => x.ch === 'p1' && !x.arp && x.end - x.start < 24 && isWeak(x.start) && stepwise(x) && y.start !== x.start

  // ---- segments
  const bounds = new Set<number>()
  for (const n of notes) {
    bounds.add(n.start)
    bounds.add(n.end)
  }
  for (const s of slots) bounds.add(s.start)
  for (let t = 0; t < horizon; t += beatLen) bounds.add(t)
  const B = [...bounds].filter((t) => t < horizon).sort((a, b) => a - b)
  let bassBeats = 0
  let bassGood = 0
  for (let i = 0; i < B.length - 1; i++) {
    const a = B[i]
    const sounding = notes.filter((n) => n.start <= a && n.end > a)
    const slot = slotAt(a)
    // Rule 1 + 4: vertical intervals between voices
    for (let x = 0; x < sounding.length; x++) {
      for (let y = x + 1; y < sounding.length; y++) {
        const n1 = sounding[x]
        const n2 = sounding[y]
        if (n1.ch === n2.ch) continue
        for (const p of n1.pitches) {
          for (const q of n2.pitches) {
            const d = Math.abs(p - q)
            const ic = d % 12
            const pair = `${n1.id}-${n2.id}-${p}-${q}`
            const desc = `${n1.ch}:${nm(p)} vs ${n2.ch}:${nm(q)}`
            const ok = passing(n1, n2) || passing(n2, n1)
            if (ic === 1 || ic === 11) {
              if (ok) add(accepted, pair, 'passing', a, `${desc} (weak, short, stepwise)`)
              else add(errors, pair, 'R1 semitone/M7/m9', a, desc)
            } else if (ic === 6) {
              const dom = slot && slot.ivs.includes(4) && slot.ivs.includes(10)
              const tt = slot && [pcOf(p), pcOf(q)].every((pc) => pc === (slot.root + 4) % 12 || pc === (slot.root + 10) % 12)
              const ns = slot && nextSlot(slot)
              const resolves = dom && tt && ns && ns.root === (slot!.root + 5) % 12
              if (resolves) add(accepted, pair, 'V7 tritone', a, `${desc} in ${slot!.sym} -> ${ns!.sym}`)
              else if (ok) add(accepted, pair, 'passing', a, `${desc} tritone (passing)`)
              else add(errors, pair, 'R1 tritone', a, `${desc}${slot ? ` over ${slot.sym}` : ''}`)
            } else if (d === 2) {
              const ov = Math.min(n1.end, n2.end) - Math.max(n1.start, n2.start)
              if (ov > 12 && !ok) add(errors, pair, 'R1 major 2nd held', a, `${desc} for ${ov} ticks`)
            }
            if (p < 48 && q < 48 && [3, 4, 8, 9].includes(d)) add(errors, pair, 'R4 low 3rd/6th', a, desc)
          }
        }
      }
    }
    // Rule 4: two lowest voices below C4 a 2nd/7th apart
    const lows = sounding.map((n) => ({ n, m: Math.min(...n.pitches) })).sort((u, v) => u.m - v.m)
    if (lows.length >= 2 && lows[0].n.ch !== lows[1].n.ch && lows[0].m < 60 && lows[1].m < 60) {
      const d = lows[1].m - lows[0].m
      if ([1, 2, 10, 11].includes(d)) add(errors, `${lows[0].n.id}-${lows[1].n.id}`, 'R4 low 2nd/7th', a, `${lows[0].n.ch}:${nm(lows[0].m)} ${lows[1].n.ch}:${nm(lows[1].m)}`)
    }
    // Rule 5: harmony above the melody
    const mel = sounding.find((n) => n.ch === 'p1')
    for (const h of sounding.filter((n) => n.ch === 'p2')) {
      if (mel && Math.max(...h.pitches) > mel.midi) add(errors, `${h.id}-${mel.id}`, 'R5 harmony above melody', a, `p2:${nm(Math.max(...h.pitches))} > p1:${nm(mel.midi)}`)
    }
    if (!slot) continue
    // Rule 2: harmony/bass chord tones on beats
    if (a % beatLen === 0) {
      for (const n of sounding.filter((n) => n.ch !== 'p1')) {
        for (const p of n.pitches) {
          if (!slot.pcs.has(pcOf(p))) add(errors, `${n.id}-${p}-${slot.start}`, `R2 ${n.ch === 'w' ? 'bass' : 'harmony'} non-chord tone`, a, `${n.ch}:${nm(p)} over ${slot.sym}`)
        }
      }
      const bass = sounding.find((n) => n.ch === 'w')
      if (bass && a % strongLen === 0) {
        bassBeats++
        const pc = pcOf(bass.midi)
        if (pc === slot.bass || pc === slot.root || pc === (slot.root + 7) % 12) bassGood++
      }
    }
    // harmony notes >= an 8th that start off the beat on a non-chord tone
    for (const n of sounding.filter((n) => n.ch === 'p2' && n.start === a && n.end - n.start >= 24)) {
      for (const p of n.pitches) if (!slot.pcs.has(pcOf(p))) add(errors, `${n.id}-${p}-${slot.start}`, 'R2 harmony non-chord tone', a, `p2:${nm(p)} over ${slot.sym}`)
    }
    // Rule 2: melody on strong beats
    if (a % strongLen === 0 && mel && !slot.pcs.has(pcOf(mel.midi))) {
      const nx = mel.next
      const nxSlot = nx ? slotAt(nx.start) : undefined
      const resolvesTo = !!nx && !!nxSlot && Math.abs(nx.midi - mel.midi) <= 2 && nx.midi !== mel.midi && nxSlot.pcs.has(pcOf(nx.midi))
      if (mel.start === a && resolvesTo) add(accepted, `${mel.id}`, 'appoggiatura', a, `p1:${nm(mel.midi)} -> ${nm(nx!.midi)} over ${slot.sym}`)
      else if (mel.start < a && resolvesTo && nx!.midi < mel.midi) add(accepted, `${mel.id}`, 'suspension', a, `p1:${nm(mel.midi)} -> ${nm(nx!.midi)} over ${slot.sym}`)
      else add(errors, `${mel.id}-${slot.start}`, 'R2 melody non-chord on strong beat', a, `p1:${nm(mel.midi)} over ${slot.sym}`)
    }
  }

  // ---- Rule 3: per chord slot
  for (const s of slots.filter((s) => s.start < total)) {
    const inSlot = notes.filter((n) => n.start < s.end && n.end > s.start)
    const borrowed = [...s.pcs].filter((pc) => !scale.has(pc))
    if (borrowed.length) {
      add(warnings, `b${s.start}`, 'R3 borrowed/chromatic chord', s.start, `${s.sym} (${borrowed.map((pc) => nm(pc + 60).slice(0, -1)).join(',')} outside ${def.key})`)
      for (const n of inSlot) {
        for (const p of n.pitches) {
          const pc = pcOf(p)
          if (borrowed.some((b) => Math.abs(b - pc) === 1 || Math.abs(b - pc) === 11) && scale.has(pc) && !s.pcs.has(pc)) {
            const short = n.ch === 'p1' && n.end - n.start < 24 && isWeak(n.start)
            if (!short) add(errors, `${n.id}-${p}`, 'R3 mixture inconsistency', Math.max(n.start, s.start), `${n.ch}:${nm(p)} against borrowed ${s.sym}`)
          }
        }
      }
    }
    const third = s.ivs.includes(4) ? 4 : s.ivs.includes(3) ? 3 : -1
    if (third > 0) {
      const other = (s.root + (third === 4 ? 3 : 4)) % 12
      for (const n of inSlot) {
        for (const p of n.pitches) {
          if (pcOf(p) !== other) continue
          if (n.ch === 'p1' && n.end - n.start < 24 && isWeak(n.start) && stepwise(n)) add(accepted, `${n.id}`, 'passing', n.start, `${n.ch}:${nm(p)} chromatic passing in ${s.sym}`)
          else add(errors, `${n.id}-${p}`, 'R3 blue note / cross-relation', Math.max(n.start, s.start), `${n.ch}:${nm(p)} against ${third === 4 ? 'major' : 'minor'} 3rd of ${s.sym}`)
        }
      }
    }
    // melody implies the chord?
    let on = 0
    let off = 0
    for (const n of inSlot.filter((n) => n.ch === 'p1')) {
      const len = Math.min(n.end, s.end) - Math.max(n.start, s.start)
      if (s.pcs.has(pcOf(n.midi))) on += len
      else off += len
    }
    if (on + off >= 48 && off >= (on + off) / 2) add(warnings, `m${s.start}`, 'R3 melody does not imply chord', s.start, `${Math.round((100 * off) / (on + off))}% non-chord melody over ${s.sym}`)
    if (s.ivs.includes(5) && !s.ivs.includes(4) && !s.ivs.includes(3)) {
      const ns = nextSlot(s)
      if (!ns || ns.root !== s.root) add(warnings, `sus${s.start}`, 'R5 unresolved sus', s.start, `${s.sym} -> ${ns?.sym}`)
    }
  }
  // cadences at 8-bar phrase ends of the loop
  const tonic = [...scale][0]
  const dominant = (tonic + 7) % 12
  for (let t = c.introTicks + 8 * bt; t <= total; t += 8 * bt) {
    const last = slotAt(t - 1)
    const prev = last ? slotAt(last.start - 1) : undefined
    if (!last || !prev) continue
    const motion = (last.root - prev.root + 12) % 12
    // authentic (V-I), plagal (IV-I) or half cadence (ends on V)
    if (!(((motion === 5 || motion === 7) && last.root === tonic) || last.root === dominant)) add(warnings, `cad${t}`, 'R3 weak cadence', t - 1, `phrase ends ${prev.sym} -> ${last.sym}`)
  }

  // ---- Rule 6: engine/timbre settings
  for (const ch of ['p2', 'w'] as const) {
    const setup = channelSetup(def, ch)
    void setup // the engine sends only p1 to the echo, capped (song.ts ECHO_MAX_*)
    const insts = new Set(raw.filter((e) => e.ch === ch && e.midi >= 0).map((e) => e.inst))
    for (const i of insts) {
      const inst = INSTRUMENTS[i]
      if (inst?.vib && inst.vib[0] > 4) add(warnings, `vib${ch}${i}`, 'R6 vibrato on accompaniment', 0, `${ch} instrument ${i} vib ${inst.vib[0]} cents`)
      if (inst?.detune && Math.abs(inst.detune) > 5) add(warnings, `det${ch}${i}`, 'R6 detune', 0, `${ch} instrument ${i} detune ${inst.detune}`)
    }
  }
  for (const n of notes) {
    const e = raw.find((r) => r.tick === n.start && r.ch === n.ch && r.midi === n.midi)
    if (e?.to !== undefined && n.next && n.next.start < n.end) add(warnings, `sl${n.id}`, 'R6 slide overlaps next note', n.start, `${n.ch}:${nm(n.midi)}`)
  }

  return { id: def.id, errors, warnings, accepted, stats: { bassRootFifthPct: bassBeats ? Math.round((100 * bassGood) / bassBeats) : 100, segments: B.length } }
}
