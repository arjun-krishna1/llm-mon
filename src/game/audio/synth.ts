// Voice synthesis on top of any BaseAudioContext (live or offline).
// One short-lived node graph per note: Oscillator/BufferSource -> Gain (ADSR) -> channel bus.

import { DRUMS, type DrumDef, type Instrument, type Wave } from './instruments.ts'

export function midiToHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12)
}

// ---------------------------------------------------------------------------
// Per-context resources (periodic waves, LFSR noise buffers)
// ---------------------------------------------------------------------------

export interface Bank {
  wave(w: Wave): PeriodicWave
  noise(type: 'long' | 'short'): AudioBuffer
}

const banks = new WeakMap<BaseAudioContext, Bank>()

const HARMONICS = 64

function pulseCoeffs(duty: number, soft: boolean): [Float32Array, Float32Array] {
  const re = new Float32Array(HARMONICS + 1)
  const im = new Float32Array(HARMONICS + 1)
  for (let n = 1; n <= HARMONICS; n++) {
    const roll = soft ? 1 / (1 + Math.pow(n / 5, 2)) : 1
    re[n] = (Math.sin(2 * Math.PI * n * duty) / (n * Math.PI)) * roll
    im[n] = ((1 - Math.cos(2 * Math.PI * n * duty)) / (n * Math.PI)) * roll
  }
  return [re, im]
}

/** Fourier coefficients of an arbitrary single-cycle waveform, via DFT. */
function sampledCoeffs(fn: (x: number) => number): [Float32Array, Float32Array] {
  const N = 2048
  const re = new Float32Array(HARMONICS + 1)
  const im = new Float32Array(HARMONICS + 1)
  const s = new Float32Array(N)
  for (let i = 0; i < N; i++) s[i] = fn(i / N)
  for (let n = 1; n <= HARMONICS; n++) {
    let a = 0
    let b = 0
    for (let i = 0; i < N; i++) {
      const ph = (2 * Math.PI * n * i) / N
      a += s[i] * Math.cos(ph)
      b += s[i] * Math.sin(ph)
    }
    re[n] = (2 * a) / N
    im[n] = (2 * b) / N
  }
  return [re, im]
}

function triFn(x: number): number {
  return x < 0.25 ? 4 * x : x < 0.75 ? 2 - 4 * x : 4 * x - 4
}

function waveCoeffs(w: Wave): [Float32Array, Float32Array] {
  switch (w) {
    case 'pulse12':
      return pulseCoeffs(0.125, false)
    case 'pulse25':
      return pulseCoeffs(0.25, false)
    case 'pulse50':
      return pulseCoeffs(0.5, false)
    case 'pulse25s':
      return pulseCoeffs(0.25, true)
    case 'pulse50s':
      return pulseCoeffs(0.5, true)
    case 'tri':
      return sampledCoeffs(triFn)
    case 'wave4':
      // 32 steps, 16 levels: the stepped triangle of a 4-bit wave channel
      return sampledCoeffs((x) => {
        const step = Math.floor(x * 32)
        const v = Math.round(((triFn(step / 32) + 1) / 2) * 15)
        return (v / 15) * 2 - 1
      })
    case 'sine': {
      const re = new Float32Array(2)
      const im = new Float32Array(2)
      im[1] = 1
      return [re, im]
    }
    case 'bell': {
      const re = new Float32Array(9)
      const im = new Float32Array(9)
      im[1] = 1
      im[2] = 0.35
      im[3] = 0.18
      im[4] = 0.08
      im[6] = 0.06
      im[8] = 0.03
      return [re, im]
    }
  }
}

function lfsrBuffer(ctx: BaseAudioContext, bits: 15 | 7, hold: number): AudioBuffer {
  const period = (1 << bits) - 1
  const len = period * hold
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let reg = 0x7fff
  let i = 0
  for (let step = 0; step < period; step++) {
    // Game Boy style LFSR: xor bits 0 and 1, shift right, feed back into the top bit
    const bit = (reg ^ (reg >> 1)) & 1
    reg = (reg >> 1) | (bit << (bits - 1))
    const v = reg & 1 ? 1 : -1
    for (let h = 0; h < hold; h++) d[i++] = v * 0.9
  }
  return buf
}

export function getBank(ctx: BaseAudioContext): Bank {
  let b = banks.get(ctx)
  if (b) return b
  const waves = new Map<Wave, PeriodicWave>()
  const noises = new Map<string, AudioBuffer>()
  b = {
    wave(w) {
      let pw = waves.get(w)
      if (!pw) {
        const [re, im] = waveCoeffs(w)
        pw = ctx.createPeriodicWave(re, im)
        waves.set(w, pw)
      }
      return pw
    },
    noise(type) {
      let nb = noises.get(type)
      if (!nb) {
        nb = type === 'long' ? lfsrBuffer(ctx, 15, 1) : lfsrBuffer(ctx, 7, 6)
        noises.set(type, nb)
      }
      return nb
    },
  }
  banks.set(ctx, b)
  return b
}

// ---------------------------------------------------------------------------
// Node tracking so a paused song can silence notes it already scheduled
// ---------------------------------------------------------------------------

export interface Tracker {
  add(n: AudioScheduledSourceNode): void
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export interface NoteOpts {
  to?: number
  arp?: number[]
  vel: number
}

/** Envelope value at time x (seconds from note start) before release. */
function envAt(inst: Instrument, x: number): number {
  if (x <= inst.a) return inst.a > 0 ? x / inst.a : 1
  const y = x - inst.a
  if (y >= inst.d) return inst.s
  return 1 + (inst.s - 1) * (y / inst.d)
}

/**
 * Schedule one note. `dur` is the written length in seconds.
 * Returns the time at which the note is completely silent.
 */
export function playNote(
  ctx: BaseAudioContext,
  dest: AudioNode,
  inst: Instrument,
  midi: number,
  t: number,
  dur: number,
  o: NoteOpts,
  tracker?: Tracker,
): number {
  const bank = getBank(ctx)
  const peak = inst.gain * o.vel
  if (peak <= 0) return t
  const gate = Math.max(0.01, dur * (inst.gate ?? 0.96))
  const rel = Math.max(0.01, inst.r)
  const end = t + gate + rel

  const osc = ctx.createOscillator()
  osc.setPeriodicWave(bank.wave(inst.wave))
  if (inst.detune) osc.detune.value = inst.detune
  const f0 = midiToHz(midi)
  const fq = osc.frequency
  if (o.arp && o.arp.length > 1) {
    const step = inst.arpStep ?? 1 / 30
    let i = 0
    for (let x = t; x < end; x += step, i++) fq.setValueAtTime(f0 * Math.pow(2, o.arp[i % o.arp.length] / 12), x)
  } else if (o.to !== undefined && o.to !== midi) {
    fq.setValueAtTime(f0, t)
    fq.exponentialRampToValueAtTime(midiToHz(o.to), t + Math.min(gate, inst.slide ?? gate))
  } else if (inst.pitchEnv) {
    fq.setValueAtTime(f0 * Math.pow(2, inst.pitchEnv[0] / 12), t)
    fq.exponentialRampToValueAtTime(f0, t + inst.pitchEnv[1])
  } else {
    fq.setValueAtTime(f0, t)
  }

  const g = ctx.createGain()
  const gp = g.gain
  gp.setValueAtTime(0, t)
  const att = Math.min(inst.a, gate)
  gp.linearRampToValueAtTime(peak * envAt(inst, att), t + Math.max(att, 0.001))
  if (gate > inst.a) {
    const dEnd = Math.min(gate, inst.a + inst.d)
    gp.linearRampToValueAtTime(peak * envAt(inst, dEnd), t + dEnd)
    if (gate > dEnd) gp.setValueAtTime(peak * inst.s, t + gate)
  }
  gp.linearRampToValueAtTime(0, end)

  let last: AudioNode = osc
  if (inst.lp) {
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = inst.lp
    f.Q.value = 0.5
    osc.connect(f)
    last = f
  }
  last.connect(g)
  g.connect(dest)

  let lfo: OscillatorNode | undefined
  if (inst.vib && gate > inst.vib[2] + 0.05) {
    lfo = ctx.createOscillator()
    lfo.frequency.value = inst.vib[1]
    const lg = ctx.createGain()
    lg.gain.setValueAtTime(0, t)
    lg.gain.setValueAtTime(0, t + inst.vib[2])
    lg.gain.linearRampToValueAtTime(inst.vib[0], t + inst.vib[2] + 0.15)
    lfo.connect(lg)
    lg.connect(osc.detune)
    lfo.start(t)
    lfo.stop(end + 0.02)
    tracker?.add(lfo)
  }
  osc.start(t)
  osc.stop(end + 0.02)
  osc.onended = () => {
    g.disconnect()
  }
  tracker?.add(osc)
  return end
}

export function playDrum(ctx: BaseAudioContext, dest: AudioNode, name: string, t: number, vel: number, tracker?: Tracker): number {
  const d: DrumDef | undefined = DRUMS[name]
  if (!d) return t
  let end = t
  if (d.tone) {
    end = Math.max(end, tone(ctx, dest, { wave: d.tone.wave, from: d.tone.from, to: d.tone.to, slide: d.tone.time, t, dur: d.tone.decay, gain: d.tone.gain * vel, a: 0.002 }, tracker))
  }
  if (d.noise) {
    const n = d.noise
    end = Math.max(end, noise(ctx, dest, { type: n.type, rate: n.rate, rateEnd: n.rateEnd, t, dur: n.decay, gain: n.gain * vel, a: n.attack ?? 0.001, hp: n.hp, lp: n.lp, bp: n.bp }, tracker))
  }
  return end
}

// ---------------------------------------------------------------------------
// Primitive one-shots for SFX
// ---------------------------------------------------------------------------

export interface ToneSpec {
  wave: Wave
  from: number
  to?: number
  /** Slide time (default: dur). */
  slide?: number
  /** 'exp' (default) or 'lin' frequency ramp. */
  curve?: 'exp' | 'lin'
  t: number
  /** Time from start to silence (attack + exponential-ish decay). */
  dur: number
  gain: number
  a?: number
  /** Hold at full gain for this long before decaying. */
  hold?: number
  vib?: [number, number]
  arp?: number[]
  arpStep?: number
  pan?: number
}

function panned(ctx: BaseAudioContext, dest: AudioNode, pan?: number): AudioNode {
  if (!pan) return dest
  const p = ctx.createStereoPanner()
  p.pan.value = pan
  p.connect(dest)
  return p
}

export function tone(ctx: BaseAudioContext, dest: AudioNode, s: ToneSpec, tracker?: Tracker): number {
  const bank = getBank(ctx)
  const osc = ctx.createOscillator()
  osc.setPeriodicWave(bank.wave(s.wave))
  const end = s.t + s.dur
  const f = osc.frequency
  if (s.arp) {
    const step = s.arpStep ?? 1 / 30
    let i = 0
    for (let x = s.t; x < end; x += step, i++) f.setValueAtTime(s.from * Math.pow(2, s.arp[i % s.arp.length] / 12), x)
  } else {
    f.setValueAtTime(s.from, s.t)
    if (s.to !== undefined) {
      const st = s.t + Math.max(0.005, s.slide ?? s.dur)
      if (s.curve === 'lin') f.linearRampToValueAtTime(s.to, st)
      else f.exponentialRampToValueAtTime(s.to, st)
    }
  }
  const g = ctx.createGain()
  const a = s.a ?? 0.003
  const hold = s.hold ?? 0
  g.gain.setValueAtTime(0, s.t)
  g.gain.linearRampToValueAtTime(s.gain, s.t + a)
  if (hold > 0) g.gain.setValueAtTime(s.gain, s.t + a + hold)
  // fast-ish decay curve that reaches true zero at `end`
  const decStart = s.t + a + hold
  const span = Math.max(0.005, end - decStart)
  g.gain.setTargetAtTime(0, decStart, span / 4)
  g.gain.setValueAtTime(s.gain * Math.exp(-4) * 0.9, end - 0.004)
  g.gain.linearRampToValueAtTime(0, end)
  osc.connect(g)
  g.connect(panned(ctx, dest, s.pan))
  if (s.vib) {
    const lfo = ctx.createOscillator()
    lfo.frequency.value = s.vib[1]
    const lg = ctx.createGain()
    lg.gain.value = s.vib[0]
    lfo.connect(lg)
    lg.connect(osc.detune)
    lfo.start(s.t)
    lfo.stop(end + 0.01)
    tracker?.add(lfo)
  }
  osc.start(s.t)
  osc.stop(end + 0.01)
  osc.onended = () => g.disconnect()
  tracker?.add(osc)
  return end
}

export interface NoiseSpec {
  type: 'long' | 'short'
  rate: number
  rateEnd?: number
  t: number
  dur: number
  gain: number
  a?: number
  hold?: number
  hp?: number
  lp?: number
  bp?: number
  /** Sweep the bandpass/lowpass cutoff to this frequency. */
  sweepTo?: number
  pan?: number
}

export function noise(ctx: BaseAudioContext, dest: AudioNode, s: NoiseSpec, tracker?: Tracker): number {
  const bank = getBank(ctx)
  const src = ctx.createBufferSource()
  src.buffer = bank.noise(s.type)
  src.loop = true
  const end = s.t + s.dur
  src.playbackRate.setValueAtTime(s.rate, s.t)
  if (s.rateEnd !== undefined) src.playbackRate.exponentialRampToValueAtTime(s.rateEnd, end)
  let last: AudioNode = src
  const filt = (type: BiquadFilterType, fq: number, q: number) => {
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.setValueAtTime(fq, s.t)
    if (s.sweepTo && type !== 'highpass') f.frequency.exponentialRampToValueAtTime(s.sweepTo, end)
    f.Q.value = q
    last.connect(f)
    last = f
  }
  if (s.hp) filt('highpass', s.hp, 0.7)
  if (s.lp) filt('lowpass', s.lp, 0.7)
  if (s.bp) filt('bandpass', s.bp, 1.4)
  const g = ctx.createGain()
  const a = s.a ?? 0.002
  const hold = s.hold ?? 0
  g.gain.setValueAtTime(0, s.t)
  g.gain.linearRampToValueAtTime(s.gain, s.t + a)
  if (hold > 0) g.gain.setValueAtTime(s.gain, s.t + a + hold)
  const decStart = s.t + a + hold
  const span = Math.max(0.005, end - decStart)
  g.gain.setTargetAtTime(0, decStart, span / 4)
  g.gain.setValueAtTime(s.gain * Math.exp(-4) * 0.9, end - 0.004)
  g.gain.linearRampToValueAtTime(0, end)
  last.connect(g)
  g.connect(panned(ctx, dest, s.pan))
  // random-ish but deterministic start offset so repeated hits are not identical
  src.start(s.t, ((s.t * 7919) % 1) * 0.5)
  src.stop(end + 0.01)
  src.onended = () => g.disconnect()
  tracker?.add(src)
  return end
}
