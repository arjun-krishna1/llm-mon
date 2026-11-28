// Interface tampering (SAFETY_ARC §5, phase 2 "Moving the needle" and phase 3 "Staying on").
// Generic, engine-side hooks the battle UI (or any scene) can use:
//
//   tamper.set({ scenes: ['Battle'], scramble: 0.3, relabel: { 'Tackle': 'Surrender' } })
//   tamper.disable('run', 'bag')            // ListMenu items / start-menu entries with that id (or label) grey out
//   tamper.setFake('enemy_hp', 1)           // HUD code shows tamper.shown('enemy_hp', trueFrac) → 1
//   tamper.setProbe(true)                   // Probe: tampered text shows the truth (tinted), bars draw a truth marker
//   tamper.reset()
//
// Text: every PxText created in a listed scene passes through `filterText` (relabel → custom
// filter → scramble). While scrambling, text re-glitches every few frames. With the Probe on,
// the original text shows instead, tinted PROBE green.

export interface TamperConfig {
  /** Scene keys whose text is affected ('*' = every scene). */
  scenes?: string[]
  /** 0..1: share of letters glitched. */
  scramble?: number
  /** Whole-word / whole-label replacements, applied before scrambling. */
  relabel?: Record<string, string>
  /** Custom filter (after relabel, before scramble). */
  filter?: ((text: string, sceneKey: string) => string) | null
}

const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*?!'
export const PROBE_GREEN = 0x60e070
export const PROBE_GREEN_DARK = 0x1c6440

type Listener = () => void

class Tamper {
  scenes = new Set<string>()
  scrambleLevel = 0
  relabels = new Map<string, string>()
  filter: ((text: string, sceneKey: string) => string) | null = null
  disabled = new Set<string>()
  fakes = new Map<string, number>()
  probe = false
  seed = 1
  private listeners: Listener[] = []
  private frame = 0

  /** Anything at all active? (cheap check for hot paths) */
  get active(): boolean {
    return this.scenes.size > 0 && (this.scrambleLevel > 0 || this.relabels.size > 0 || !!this.filter)
  }

  set(c: TamperConfig): void {
    if (c.scenes) this.scenes = new Set(c.scenes)
    if (c.scramble !== undefined) this.scrambleLevel = Math.max(0, Math.min(1, c.scramble))
    if (c.relabel) this.relabels = new Map(Object.entries(c.relabel))
    if (c.filter !== undefined) this.filter = c.filter
    this.changed()
  }

  scramble(level: number): void {
    this.set({ scramble: level })
  }

  relabel(map: Record<string, string>): void {
    for (const [k, v] of Object.entries(map)) this.relabels.set(k, v)
    this.changed()
  }

  disable(...ids: string[]): void {
    for (const id of ids) this.disabled.add(id.toLowerCase())
    this.changed()
  }

  enable(...ids: string[]): void {
    for (const id of ids) this.disabled.delete(id.toLowerCase())
    this.changed()
  }

  /** Is a menu entry (by id or label) greyed out by tampering? */
  isDisabled(idOrLabel: string | undefined): boolean {
    return !!idOrLabel && this.disabled.has(idOrLabel.toLowerCase())
  }

  setFake(id: string, shown: number): void {
    this.fakes.set(id, shown)
    this.changed()
  }

  clearFake(id: string): void {
    this.fakes.delete(id)
    this.changed()
  }

  /** The value a HUD should display for `id` (the fake while one is set and the Probe is off). */
  shown(id: string, truth: number): number {
    const f = this.fakes.get(id)
    return f === undefined || this.probe ? truth : f
  }

  /** True when the display of `id` is being faked (whether or not the Probe reveals it). */
  isFaked(id: string): boolean {
    return this.fakes.has(id)
  }

  setProbe(on: boolean): void {
    this.probe = on
    this.changed()
  }

  reset(): void {
    this.scenes.clear()
    this.scrambleLevel = 0
    this.relabels.clear()
    this.filter = null
    this.disabled.clear()
    this.fakes.clear()
    this.probe = false
    this.changed()
  }

  appliesTo(sceneKey: string): boolean {
    return this.scenes.has('*') || this.scenes.has(sceneKey)
  }

  /** The text a PxText in `sceneKey` should display. */
  filterText(text: string, sceneKey: string): string {
    if (!text || !this.active || !this.appliesTo(sceneKey) || this.probe) return text
    let t = text
    if (this.relabels.size) {
      const whole = this.relabels.get(t)
      if (whole !== undefined) t = whole
      else for (const [k, v] of this.relabels) if (k.length > 2 && t.includes(k)) t = t.split(k).join(v)
    }
    if (this.filter) t = this.filter(t, sceneKey)
    if (this.scrambleLevel > 0) {
      let h = this.seed * 2654435761
      let out = ''
      for (let i = 0; i < t.length; i++) {
        const c = t[i]
        h = (h ^ (c.charCodeAt(0) + i * 97)) * 16777619 >>> 0
        if (/[A-Za-z0-9]/.test(c) && (h % 1000) / 1000 < this.scrambleLevel) {
          const g = GLYPHS[(h >>> 10) % GLYPHS.length]
          out += c === c.toLowerCase() && /[a-z]/.test(c) ? g.toLowerCase() : g
        } else out += c
      }
      t = out
    }
    return t
  }

  /** Would filterText change this text (ignoring the probe)? Used to tint revealed text. */
  wouldChange(text: string, sceneKey: string): boolean {
    if (!this.probe) return false
    this.probe = false
    const r = this.filterText(text, sceneKey) !== text
    this.probe = true
    return r
  }

  onChange(fn: Listener): () => void {
    this.listeners.push(fn)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn)
    }
  }

  private changed(): void {
    for (const l of [...this.listeners]) l()
  }

  /** Once per frame (UIScene): re-glitch scrambled text every 10 frames. */
  tick(): void {
    this.frame++
    if (this.scrambleLevel > 0 && this.scenes.size && !this.probe && this.frame % 10 === 0) {
      this.seed = (this.seed * 1103515245 + 12345) >>> 0 || 1
      this.changed()
    }
  }
}

export const tamper = new Tamper()
