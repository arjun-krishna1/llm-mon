// Song definitions, compilation and the lookahead-scheduled player.

import { INSTRUMENTS } from './instruments.ts'
import { barTicks, parseChannel, TICKS_PER_WHOLE, type NoteEvent } from './pattern.ts'
import { playDrum, playNote, type Tracker } from './synth.ts'

export const CHANNELS = ['p1', 'p2', 'w', 'n'] as const
export type ChannelId = (typeof CHANNELS)[number]

export interface ChannelSetup {
  /** Default instrument preset (patterns may switch with `@name`). */
  inst?: string
  /** Stereo position -1..1. */
  pan?: number
  /** Echo send 0..1. */
  echo?: number
  /** Channel volume multiplier. */
  gain?: number
}

export type Section = Partial<Record<ChannelId, string>>

export interface SongDef {
  id: string
  title?: string
  mood?: string
  /** Documentation/analysis only, e.g. 'D major'. */
  key?: string
  /** Quarter notes per minute. */
  bpm: number
  /** Time signature, default [4, 4]. */
  sig?: [number, number]
  /** Track trim (mixing). */
  gain?: number
  /** Play once instead of looping (jingles). */
  once?: boolean
  /** Chord chart per section (documentation + analysis). */
  chords?: { intro?: string; loop?: string }
  channels?: Partial<Record<ChannelId, ChannelSetup>>
  /** Echo: delay in beats, feedback, wet level. */
  echo?: { beats: number; feedback: number; wet: number }
  intro?: Section
  loop: Section
}

export interface ChannelEvent extends NoteEvent {
  ch: ChannelId
}

export interface CompiledSong {
  def: SongDef
  secPerTick: number
  barTicks: number
  introTicks: number
  loopTicks: number
  intro: ChannelEvent[]
  loop: ChannelEvent[]
}

const DEFAULT_SETUP: Record<ChannelId, Required<ChannelSetup>> = {
  p1: { inst: 'lead', pan: -0.18, echo: 0.22, gain: 1 },
  p2: { inst: 'harm', pan: 0.22, echo: 0.08, gain: 1 },
  w: { inst: 'bass', pan: 0, echo: 0, gain: 1 },
  n: { inst: 'lead', pan: 0.05, echo: 0, gain: 1 },
}

export function channelSetup(def: SongDef, ch: ChannelId): Required<ChannelSetup> {
  return { ...DEFAULT_SETUP[ch], ...(def.channels?.[ch] ?? {}) }
}

function compileSection(def: SongDef, sec: Section | undefined, name: string, bt: number): { events: ChannelEvent[]; ticks: number } {
  if (!sec) return { events: [], ticks: 0 }
  let ticks = -1
  const events: ChannelEvent[] = []
  for (const ch of CHANNELS) {
    const src = sec[ch]
    if (src === undefined) continue
    const setup = channelSetup(def, ch)
    const parsed = parseChannel(src, { inst: setup.inst, barTicks: bt, label: `${def.id}.${name}.${ch}` })
    if (ticks >= 0 && parsed.ticks !== ticks) {
      throw new Error(`${def.id}.${name}: channel ${ch} is ${parsed.ticks / bt} bars but others are ${ticks / bt} bars`)
    }
    ticks = parsed.ticks
    for (const e of parsed.events) {
      if (e.midi >= 0 && !INSTRUMENTS[e.inst]) throw new Error(`${def.id}.${name}.${ch}: unknown instrument "${e.inst}"`)
      events.push({ ...e, ch })
    }
  }
  if (ticks % bt !== 0) throw new Error(`${def.id}.${name}: section is not a whole number of bars (${ticks / bt})`)
  events.sort((a, b) => a.tick - b.tick)
  return { events, ticks: Math.max(0, ticks) }
}

const cache = new Map<SongDef, CompiledSong>()

export function compileSong(def: SongDef): CompiledSong {
  const hit = cache.get(def)
  if (hit) return hit
  const bt = barTicks(def.sig ?? [4, 4])
  const intro = compileSection(def, def.intro, 'intro', bt)
  const loop = compileSection(def, def.loop, 'loop', bt)
  if (loop.ticks === 0) throw new Error(`${def.id}: empty loop section`)
  const c: CompiledSong = {
    def,
    secPerTick: 60 / def.bpm / (TICKS_PER_WHOLE / 4),
    barTicks: bt,
    introTicks: intro.ticks,
    loopTicks: loop.ticks,
    intro: intro.events,
    loop: loop.events,
  }
  cache.set(def, c)
  return c
}

/** Seconds of intro and of one loop pass. */
export function songLengths(c: CompiledSong): { intro: number; loop: number } {
  return { intro: c.introTicks * c.secPerTick, loop: c.loopTicks * c.secPerTick }
}

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

export class SongPlayer implements Tracker {
  readonly song: CompiledSong
  readonly out: GainNode
  private readonly ctx: BaseAudioContext
  private readonly buses: Record<ChannelId, GainNode>
  private readonly echoNodes: AudioNode[] = []
  private t0 = 0
  /** Cursor: -1 = intro, k >= 0 = loop pass k. */
  private pass = -1
  private idx = 0
  private running = false
  private stopAt = Infinity
  private live = new Set<AudioScheduledSourceNode>()
  finished = false

  constructor(ctx: BaseAudioContext, song: CompiledSong, dest: AudioNode) {
    this.ctx = ctx
    this.song = song
    this.out = ctx.createGain()
    this.out.gain.value = 0
    this.out.connect(dest)
    const def = song.def
    const trim = def.gain ?? 1
    let echoIn: AudioNode | undefined
    if (def.echo && def.echo.wet > 0) {
      const send = ctx.createGain()
      const delay = ctx.createDelay(2)
      delay.delayTime.value = Math.min(1.9, def.echo.beats * (60 / def.bpm))
      const fb = ctx.createGain()
      fb.gain.value = def.echo.feedback
      const tone = ctx.createBiquadFilter()
      tone.type = 'lowpass'
      tone.frequency.value = 2600
      const wet = ctx.createGain()
      wet.gain.value = def.echo.wet
      send.connect(delay)
      delay.connect(tone)
      tone.connect(fb)
      fb.connect(delay)
      tone.connect(wet)
      wet.connect(this.out)
      echoIn = send
      this.echoNodes.push(send, delay, fb, tone, wet)
    }
    const buses = {} as Record<ChannelId, GainNode>
    for (const ch of ['p1', 'p2', 'w', 'n'] as const) {
      const s = channelSetup(def, ch)
      const g = ctx.createGain()
      g.gain.value = s.gain * trim
      const p = ctx.createStereoPanner()
      p.pan.value = s.pan
      g.connect(p)
      p.connect(this.out)
      if (echoIn && s.echo > 0) {
        const sg = ctx.createGain()
        sg.gain.value = s.echo
        p.connect(sg)
        sg.connect(echoIn)
      }
      buses[ch] = g
    }
    this.buses = buses
  }

  /** Silence channels (stems / analysis). */
  mute(chs: readonly string[]): void {
    for (const ch of chs) if (ch in this.buses) this.buses[ch as ChannelId].gain.value = 0
  }

  add(n: AudioScheduledSourceNode): void {
    this.live.add(n)
    n.addEventListener('ended', () => this.live.delete(n))
  }

  /** Absolute song tick (intro ticks + loop position) of a context time. */
  tickAt(time: number): number {
    return (time - this.t0) / this.song.secPerTick
  }

  /** Position as a resumable offset: wraps loop passes. */
  positionAt(time: number): number {
    const s = this.song
    const tk = Math.max(0, this.tickAt(time))
    if (tk < s.introTicks || s.def.once) return tk
    return s.introTicks + ((tk - s.introTicks) % s.loopTicks)
  }

  /** Start at `when`, from absolute song tick `from`, fading in over `fade` seconds. */
  start(when: number, from = 0, fade = 0, level = 1): void {
    const s = this.song
    this.t0 = when - from * s.secPerTick
    const g = this.out.gain
    g.cancelScheduledValues(when)
    g.setValueAtTime(fade > 0 ? 0 : level, when)
    if (fade > 0) g.linearRampToValueAtTime(level, when + fade)
    if (from < s.introTicks) {
      this.pass = -1
      this.idx = s.intro.findIndex((e) => e.tick >= from)
      if (this.idx < 0) this.idx = s.intro.length
    } else {
      this.pass = 0
      const lp = from - s.introTicks
      this.idx = s.loop.findIndex((e) => e.tick >= lp)
      if (this.idx < 0) this.idx = s.loop.length
    }
    this.running = true
  }

  /** Fade out and stop scheduling. */
  stop(when: number, fade: number): void {
    const g = this.out.gain
    g.cancelScheduledValues(when)
    g.setValueAtTime(g.value, when)
    g.linearRampToValueAtTime(0, when + Math.max(0.01, fade))
    this.stopAt = when + Math.max(0.01, fade)
    this.running = false
    const end = this.stopAt + 0.05
    for (const n of this.live) {
      try {
        n.stop(end)
      } catch {
        /* already stopped */
      }
    }
  }

  /** Release all nodes. Call once the fade has finished. */
  dispose(): void {
    for (const n of this.live) {
      try {
        n.stop()
      } catch {
        /* ignore */
      }
    }
    this.live.clear()
    this.out.disconnect()
    for (const n of this.echoNodes) n.disconnect()
    this.finished = true
  }

  get stopTime(): number {
    return this.stopAt
  }

  get endTime(): number {
    const s = this.song
    return s.def.once ? this.t0 + (s.introTicks + s.loopTicks) * s.secPerTick : Infinity
  }

  /** Schedule every event that starts before `until` (context time). */
  schedule(until: number, track = true): void {
    if (!this.running) return
    const s = this.song
    const spt = s.secPerTick
    for (let guard = 0; guard < 100000; guard++) {
      const list = this.pass < 0 ? s.intro : s.loop
      if (this.idx >= list.length) {
        if (this.pass >= 0 && s.def.once) {
          this.running = false
          return
        }
        this.pass++
        this.idx = 0
        if (this.pass > 0 && this.t0 + this.passStart(this.pass) * spt >= until) return
        continue
      }
      const e = list[this.idx]
      const base = this.pass < 0 ? 0 : this.passStart(this.pass)
      const t = this.t0 + (base + e.tick) * spt
      if (t >= until) return
      this.idx++
      if (t < this.ctx.currentTime - 0.01) continue // late: drop rather than smear
      const dest = this.buses[e.ch]
      const tracker = track ? this : undefined
      if (e.midi < 0) {
        if (e.drum) playDrum(this.ctx, dest, e.drum, t, e.vel, tracker)
      } else {
        const inst = INSTRUMENTS[e.inst]
        playNote(this.ctx, dest, inst, e.midi, t, e.dur * spt, { vel: e.vel, to: e.to, arp: e.arp }, tracker)
      }
    }
  }

  /** Song tick at which loop pass k starts. */
  private passStart(k: number): number {
    return this.song.introTicks + k * this.song.loopTicks
  }
}
