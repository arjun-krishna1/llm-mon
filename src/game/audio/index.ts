// Audio API contract (docs/VERTICAL_SLICE_PLAN.md §4.7), see docs/AUDIO.md.
// WebAudio chiptune engine: 2 pulse + wave + noise channels, lookahead-scheduled,
// with intro/loop sections, cross-fades, and jingles that pause/resume the music.
// Safe no-op when WebAudio is unavailable (SSR, tests).

import { SFX } from './sfx.ts'
import { compileSong, SongPlayer, type CompiledSong } from './song.ts'
import { SONGS } from './tracks/index.ts'

export interface MusicOptions {
  /** Cross-fade time in ms (default 600; 0 = hard cut). */
  fadeMs?: number
  /** Restart even if this id is already playing. */
  restart?: boolean
}

export interface AudioApi {
  unlock(): void
  playMusic(id: string, opts?: MusicOptions): void
  stopMusic(fadeMs?: number): void
  sfx(id: string): void
  setVolume(music: number, sfx: number): void
  /** True once the AudioContext is running (after a user gesture). */
  isUnlocked(): boolean
  /** The music id currently playing (or queued to resume after a jingle), else null. */
  currentMusic(): string | null
  /** Start a looping sfx (`exp`, `low_hp`; any sfx id works). Idempotent. */
  sfxLoop(id: string): void
  /** Stop a looping sfx started with sfxLoop(). */
  stopSfx(id: string): void
  /** Length of an sfx/jingle in ms (0 for unknown ids). Useful to wait for a jingle. */
  sfxDurationMs(id: string): number
  /** Master volume 0..1. */
  setMasterVolume(v: number): void
  readonly musicIds: readonly string[]
  readonly sfxIds: readonly string[]
}

const LOOKAHEAD = 0.2
const LOOKAHEAD_HIDDEN = 1.5
const TICK_MS = 25
const DEFAULT_FADE_MS = 600

type Ctor = typeof AudioContext

function audioCtor(): Ctor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

interface Loop {
  id: string
  next: number
  i: number
  out: GainNode
  nodes: Set<AudioScheduledSourceNode>
}

class AudioManager implements AudioApi {
  readonly musicIds = Object.keys(SONGS)
  readonly sfxIds = Object.keys(SFX)
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicBus: GainNode | null = null
  private sfxBus: GainNode | null = null
  private current: { id: string; player: SongPlayer } | null = null
  private fading: SongPlayer[] = []
  private jingles: SongPlayer[] = []
  /** Music requested before the context was running. */
  private pending: { id: string; fadeMs: number } | null = null
  /** Music paused by a jingle: resume at `pos` when `until` passes. */
  private paused: { id: string; pos: number; until: number } | null = null
  private loops = new Map<string, Loop>()
  private lastSfx = new Map<string, number>()
  private warned = new Set<string>()
  private timer: ReturnType<typeof setInterval> | null = null
  private vol = { master: 1, music: 0.8, sfx: 0.9 }
  private listening = false

  // -- lifecycle -------------------------------------------------------------

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx
    const C = audioCtor()
    if (!C) return null
    try {
      this.ctx = new C({ latencyHint: 'interactive' })
    } catch {
      return null
    }
    const ctx = this.ctx
    this.master = ctx.createGain()
    this.master.gain.value = this.vol.master
    // safety limiter: transparent at normal levels, catches music + sfx pile-ups
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -6
    limiter.knee.value = 6
    limiter.ratio.value = 8
    limiter.attack.value = 0.003
    limiter.release.value = 0.2
    this.master.connect(limiter)
    limiter.connect(ctx.destination)
    this.musicBus = ctx.createGain()
    this.musicBus.gain.value = this.vol.music
    this.musicBus.connect(this.master)
    this.sfxBus = ctx.createGain()
    this.sfxBus.gain.value = this.vol.sfx
    this.sfxBus.connect(this.master)
    ctx.addEventListener('statechange', () => this.onState())
    this.installAutoUnlock()
    return ctx
  }

  private installAutoUnlock(): void {
    if (this.listening || typeof window === 'undefined') return
    this.listening = true
    const handler = () => {
      this.unlock()
      if (this.isUnlocked()) {
        for (const ev of ['pointerdown', 'keydown', 'touchend']) window.removeEventListener(ev, handler, true)
      }
    }
    for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, handler, true)
  }

  private onState(): void {
    if (this.isUnlocked()) {
      this.startTimer()
      if (this.pending) {
        const p = this.pending
        this.pending = null
        this.startMusic(p.id, p.fadeMs)
      }
    }
  }

  private startTimer(): void {
    if (this.timer !== null) return
    this.timer = setInterval(() => this.tick(), TICK_MS)
  }

  private lookahead(): number {
    return typeof document !== 'undefined' && document.hidden ? LOOKAHEAD_HIDDEN : LOOKAHEAD
  }

  private tick(): void {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running') return
    const now = ctx.currentTime
    const until = now + this.lookahead()
    this.current?.player.schedule(until)
    this.fading = this.fading.filter((p) => {
      if (now > p.stopTime + 0.1) {
        p.dispose()
        return false
      }
      return true
    })
    this.jingles = this.jingles.filter((p) => {
      p.schedule(until)
      if (now > p.endTime + 1.5) {
        p.dispose()
        return false
      }
      return true
    })
    if (this.paused && now >= this.paused.until) {
      const p = this.paused
      this.paused = null
      this.startMusic(p.id, 450, p.pos)
    }
    for (const l of this.loops.values()) {
      const def = SFX[l.id]
      const period = def.loopPeriod ?? 0.5
      while (l.next < until) {
        const tracker = { add: (n: AudioScheduledSourceNode) => { l.nodes.add(n); n.addEventListener('ended', () => l.nodes.delete(n)) } }
        def.play?.(ctx, l.out, Math.max(l.next, now), l.i++, tracker)
        l.next += period
      }
    }
  }

  // -- public API --------------------------------------------------------------

  unlock(): void {
    const ctx = this.ensure()
    if (!ctx) return
    if (ctx.state !== 'running') {
      ctx.resume().then(
        () => this.onState(),
        () => {},
      )
    } else this.onState()
  }

  isUnlocked(): boolean {
    return !!this.ctx && this.ctx.state === 'running'
  }

  currentMusic(): string | null {
    return this.paused?.id ?? this.current?.id ?? this.pending?.id ?? null
  }

  playMusic(id: string, opts: MusicOptions = {}): void {
    if (!SONGS[id]) return this.warn(`music "${id}"`)
    const fadeMs = opts.fadeMs ?? DEFAULT_FADE_MS
    const ctx = this.ensure()
    if (!ctx) return
    if (!opts.restart && this.currentMusic() === id) return
    if (!this.isUnlocked()) {
      this.pending = { id, fadeMs }
      return
    }
    if (this.paused) {
      // a jingle is playing: switch what resumes afterwards
      this.paused = { id, pos: 0, until: this.paused.until }
      return
    }
    this.startMusic(id, fadeMs)
  }

  stopMusic(fadeMs = DEFAULT_FADE_MS): void {
    this.pending = null
    this.paused = null
    this.fadeOutCurrent(fadeMs / 1000)
  }

  sfx(id: string): void {
    const def = SFX[id]
    if (!def) return this.warn(`sfx "${id}"`)
    const ctx = this.ensure()
    if (!ctx || !this.isUnlocked()) return
    const now = ctx.currentTime
    const last = this.lastSfx.get(id) ?? -1
    if (now - last < (def.minGap ?? 0.025)) return
    this.lastSfx.set(id, now)
    const t = now + 0.005
    if (def.jingle) {
      const player = new SongPlayer(ctx, compileSong(def.jingle), this.sfxBus!)
      player.start(t)
      player.schedule(t + 10)
      this.jingles.push(player)
      this.pauseMusicFor(jingleSeconds(def.jingle))
      return
    }
    def.play?.(ctx, this.sfxBus!, t, 0)
  }

  sfxLoop(id: string): void {
    const def = SFX[id]
    if (!def?.play) return this.warn(`loopable sfx "${id}"`)
    const ctx = this.ensure()
    if (!ctx || !this.isUnlocked() || this.loops.has(id)) return
    const out = ctx.createGain()
    out.connect(this.sfxBus!)
    this.loops.set(id, { id, next: ctx.currentTime + 0.01, i: 0, out, nodes: new Set() })
    this.tick()
  }

  stopSfx(id: string): void {
    const l = this.loops.get(id)
    if (!l) return
    this.loops.delete(id)
    const now = this.ctx?.currentTime ?? 0
    const end = now + 0.04
    l.out.gain.setValueAtTime(1, now)
    l.out.gain.linearRampToValueAtTime(0, end)
    setTimeout(() => l.out.disconnect(), 200)
    for (const n of l.nodes) {
      try {
        n.stop(end)
      } catch {
        /* already stopped */
      }
    }
  }

  sfxDurationMs(id: string): number {
    const def = SFX[id]
    if (!def) return 0
    if (def.jingle) return Math.round(jingleSeconds(def.jingle) * 1000)
    return Math.round(sfxSeconds(id) * 1000)
  }

  setVolume(music: number, sfx: number): void {
    this.vol.music = clamp01(music)
    this.vol.sfx = clamp01(sfx)
    const ctx = this.ctx
    if (!ctx) return
    this.musicBus!.gain.setTargetAtTime(this.vol.music, ctx.currentTime, 0.03)
    this.sfxBus!.gain.setTargetAtTime(this.vol.sfx, ctx.currentTime, 0.03)
  }

  setMasterVolume(v: number): void {
    this.vol.master = clamp01(v)
    if (this.ctx) this.master!.gain.setTargetAtTime(this.vol.master, this.ctx.currentTime, 0.03)
  }

  // -- internals ---------------------------------------------------------------

  private warn(what: string): void {
    if (this.warned.has(what)) return
    this.warned.add(what)
    console.warn(`[audio] unknown ${what} (ignored)`)
  }

  private fadeOutCurrent(fade: number): void {
    const ctx = this.ctx
    if (!ctx || !this.current) {
      this.current = null
      return
    }
    this.current.player.stop(ctx.currentTime, Math.max(0.02, fade))
    this.fading.push(this.current.player)
    this.current = null
  }

  private startMusic(id: string, fadeMs: number, from = 0): void {
    const ctx = this.ctx
    if (!ctx) return
    const song: CompiledSong = compileSong(SONGS[id])
    const fade = fadeMs / 1000
    this.fadeOutCurrent(fade)
    const player = new SongPlayer(ctx, song, this.musicBus!)
    // new track enters while the old one fades; a resumed track fades in
    const t = ctx.currentTime + 0.03
    player.start(t, from, from > 0 ? fade : fade * 0.5)
    this.current = { id, player }
    this.startTimer()
    player.schedule(t + this.lookahead())
  }

  private pauseMusicFor(seconds: number): void {
    const ctx = this.ctx!
    const until = ctx.currentTime + seconds + 0.1
    if (this.paused) {
      this.paused.until = Math.max(this.paused.until, until)
      return
    }
    if (!this.current) return
    const { id, player } = this.current
    this.paused = { id, pos: player.positionAt(ctx.currentTime), until }
    this.fadeOutCurrent(0.08)
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0))
}

/** Seconds from start to the end of the last note of a one-shot song (plus release). */
export function jingleSeconds(def: (typeof SONGS)[string]): number {
  const c = compileSong(def)
  let end = 0
  for (const e of [...c.intro, ...c.loop.map((e) => ({ ...e, tick: e.tick + c.introTicks }))]) end = Math.max(end, e.tick + e.dur)
  return end * c.secPerTick + 0.25
}

const sfxLenCache = new Map<string, number>()

/** Approximate sfx length, measured by running its play() against a stub context. */
function sfxSeconds(id: string): number {
  const hit = sfxLenCache.get(id)
  if (hit !== undefined) return hit
  let len = 0.3
  const C = typeof OfflineAudioContext !== 'undefined' ? OfflineAudioContext : null
  try {
    const c = C ? new C(1, 128, 22050) : null
    if (c) {
      const out = c.createGain()
      len = SFX[id].play!(c, out, 0, 0)
    }
  } catch {
    /* keep default */
  }
  sfxLenCache.set(id, len)
  return len
}

export const audio: AudioApi = new AudioManager()
