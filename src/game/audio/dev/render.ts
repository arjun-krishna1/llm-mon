// Offline rendering + signal checks used by the automated audio verification
// (dev/harness.html driven by Playwright) and by the audition page.

import { cryRecipe, playCry, type CryOptions } from '../cries.ts'
import { SFX } from '../sfx.ts'
import { compileSong, songLengths, SongPlayer } from '../song.ts'
import { SONGS } from '../tracks/index.ts'
import { jingleSeconds } from '../index.ts'
import { analyzeSong, noteDump } from './analyze.ts'

export const SR = 44100

/** Render a song: intro + `passes` loop passes + tail. */
export async function renderSong(id: string, passes = 2, sampleRate = SR): Promise<{ buf: AudioBuffer; intro: number; loop: number }> {
  const def = SONGS[id]
  const c = compileSong(def)
  const { intro, loop } = songLengths(c)
  const len = intro + loop * passes + 1.5
  const ctx = new OfflineAudioContext(2, Math.ceil(len * sampleRate), sampleRate)
  const p = new SongPlayer(ctx, c, ctx.destination)
  p.start(0)
  p.schedule(intro + loop * passes, false)
  const buf = await ctx.startRendering()
  return { buf, intro, loop }
}

export async function renderSfx(id: string, sampleRate = SR): Promise<AudioBuffer> {
  const def = SFX[id]
  const len = def.jingle ? jingleSeconds(def.jingle) + 1 : 2.5
  const ctx = new OfflineAudioContext(2, Math.ceil(len * sampleRate), sampleRate)
  if (def.jingle) {
    const p = new SongPlayer(ctx, compileSong(def.jingle), ctx.destination)
    p.start(0)
    p.schedule(len, false)
  } else if (def.loopPeriod) {
    // render 4 repetitions, as sfxLoop would
    for (let i = 0; i < 4; i++) def.play!(ctx, ctx.destination, 0.01 + i * def.loopPeriod, i)
  } else def.play!(ctx, ctx.destination, 0.01, 0)
  return ctx.startRendering()
}

export async function renderCry(id: string, opts: CryOptions = {}, sampleRate = SR): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(1.5 * sampleRate), sampleRate)
  playCry(ctx, ctx.destination, 0.01, cryRecipe(id), opts)
  return ctx.startRendering()
}

export async function cryReport(id: string, opts: CryOptions = {}) {
  return { id, faint: !!opts.faint, ...stats(await renderCry(id, opts)) }
}

export interface SignalStats {
  peak: number
  rmsDb: number
  /** Seconds from first to last sample above -60 dBFS. */
  activeSec: number
  /** Largest sample-to-sample jump near each seam, relative to the 99.9th percentile jump of the whole render. */
  seams?: { at: number; jump: number; p999: number; ratio: number }[]
  /** Correlation of the RMS envelopes of loop pass 1 and 2 (1 = identical). */
  loopCorr?: number
}

function mono(buf: AudioBuffer): Float32Array {
  const a = buf.getChannelData(0)
  const b = buf.numberOfChannels > 1 ? buf.getChannelData(1) : a
  const out = new Float32Array(a.length)
  for (let i = 0; i < a.length; i++) out[i] = (a[i] + b[i]) / 2
  return out
}

export function stats(buf: AudioBuffer, from = 0, to = buf.duration): SignalStats {
  let peak = 0
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]))
  }
  const m = mono(buf)
  const sr = buf.sampleRate
  let sum = 0
  const i0 = Math.floor(from * sr)
  const i1 = Math.min(m.length, Math.floor(to * sr))
  for (let i = i0; i < i1; i++) sum += m[i] * m[i]
  const rms = Math.sqrt(sum / Math.max(1, i1 - i0))
  let first = -1
  let last = -1
  for (let i = 0; i < m.length; i++) {
    if (Math.abs(m[i]) > 0.001) {
      if (first < 0) first = i
      last = i
    }
  }
  return { peak, rmsDb: 20 * Math.log10(rms + 1e-12), activeSec: first < 0 ? 0 : (last - first) / sr }
}

function seamCheck(buf: AudioBuffer, at: number): { at: number; jump: number; p999: number; ratio: number } {
  const m = mono(buf)
  const sr = buf.sampleRate
  const diffs = new Float32Array(m.length - 1)
  for (let i = 1; i < m.length; i++) diffs[i - 1] = Math.abs(m[i] - m[i - 1])
  const sorted = Float32Array.from(diffs).sort()
  const p999 = sorted[Math.floor(sorted.length * 0.999)]
  const s = Math.floor(at * sr)
  let jump = 0
  for (let i = Math.max(0, s - 220); i < Math.min(diffs.length, s + 220); i++) jump = Math.max(jump, diffs[i])
  return { at, jump, p999, ratio: jump / (p999 || 1e-9) }
}

function envCorr(buf: AudioBuffer, a: number, b: number, len: number): number {
  const m = mono(buf)
  const sr = buf.sampleRate
  const win = Math.floor(0.05 * sr)
  const n = Math.floor((len * sr) / win)
  const ea: number[] = []
  const eb: number[] = []
  for (let k = 0; k < n; k++) {
    let sa = 0
    let sb = 0
    const ia = Math.floor(a * sr) + k * win
    const ib = Math.floor(b * sr) + k * win
    for (let i = 0; i < win; i++) {
      sa += (m[ia + i] ?? 0) ** 2
      sb += (m[ib + i] ?? 0) ** 2
    }
    ea.push(Math.sqrt(sa / win))
    eb.push(Math.sqrt(sb / win))
  }
  const mean = (x: number[]) => x.reduce((p, q) => p + q, 0) / x.length
  const ma = mean(ea)
  const mb = mean(eb)
  let num = 0
  let da = 0
  let db = 0
  for (let k = 0; k < n; k++) {
    num += (ea[k] - ma) * (eb[k] - mb)
    da += (ea[k] - ma) ** 2
    db += (eb[k] - mb) ** 2
  }
  return num / Math.sqrt(da * db || 1e-12)
}

export async function songReport(id: string) {
  const { buf, intro, loop } = await renderSong(id, 2)
  const s = stats(buf, intro, intro + loop * 2)
  const seams = [intro > 0 ? seamCheck(buf, intro) : null, seamCheck(buf, intro + loop), seamCheck(buf, intro + 2 * loop)].filter(
    (x): x is NonNullable<typeof x> => !!x,
  )
  // compare pass 2 against pass 3 start region (pass 1 may differ by the intro's echo tail)
  const loopCorr = envCorr(buf, intro + 0.5, intro + loop + 0.5, Math.min(loop - 1, 20))
  return { id, ...s, seams, loopCorr, intro, loop, duration: buf.duration }
}

export async function sfxReport(id: string) {
  const buf = await renderSfx(id)
  return { id, ...stats(buf), jingle: !!SFX[id].jingle }
}

export { analyzeSong, noteDump }
