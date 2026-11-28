// Puzzle kit (ENGINE): generic, data-driven map objects that maps declare without code, plus
// the state each one keeps (saved per map in state.mapState[mapId]). One PuzzleManager per
// loaded map, owned by the OverworldScene. See docs/ENGINE_API.md §3b for every object type.
//
// Object types: switch, door/gate, block, boulder, floor (ice/conveyor/oneway/spinner/gap/
// rough_water/snow/puddle), teleport, counter, timer, statue, key, beam, letter, gnode, wire,
// graph, reset, anchor. Conditions (door `when`, beam `when`, timer `stopWhen`) use cond.ts.

import Phaser from 'phaser'
import { COLORS, DEPTH, DIR_VEC, FONT, TILE, W, type Dir } from '../config'
import { controls } from '../controls'
import { audio } from '../audio'
import { state } from '../state'
import { ms, params } from '../params'
import type { MapObject } from './TiledMap'
import { CompGraph, fmtNum, type GNodeDef, type GOp, GRAPH_OPS } from './graph'
import { evalCond } from './cond'
import { anchorTexture, blockTexture, boulderTexture, keyTexture, kindRamp, statueTexture } from './kitTextures'
import { PxText, measure } from '../ui/text'
import { Window } from '../ui/Window'
import type { OverworldScene } from '../scenes/OverworldScene'

type Props = MapObject['props']

export interface FloorInfo {
  ice?: boolean
  conveyor?: Dir
  oneway?: Dir
  spinner?: Dir
  gap?: boolean
  rough_water?: boolean
  water?: boolean
  snow?: boolean
  puddle?: boolean
  /** A bridge / filled gap makes the cell walkable whatever lies under it. */
  bridged?: boolean
}

export interface PuzzleEvent {
  map: string
  /** 'switch' | 'door' | 'letter' | 'graph_solved' | 'teleport' | 'statue' | 'timer' | 'block' | 'merge' | 'reset' | ... */
  type: string
  id?: string
  [k: string]: unknown
}

const listeners: Array<(e: PuzzleEvent) => void> = []
/** Subscribe to puzzle events from any map (CONTENT). Returns an unsubscribe. */
export function onPuzzleEvent(fn: (e: PuzzleEvent) => void): () => void {
  listeners.push(fn)
  return () => {
    const i = listeners.indexOf(fn)
    if (i >= 0) listeners.splice(i, 1)
  }
}

/** Merge recipes for `boulder` objects: `registerMergeRule('stone', { result: 'bridge' })`. Object props override. */
export interface MergeRule { result: 'bridge' | 'block' | string; resultKind?: string; bridgeLen?: number }
const mergeRules = new Map<string, MergeRule>()
export function registerMergeRule(kind: string, rule: MergeRule): void {
  mergeRules.set(kind, rule)
}

interface PState {
  sw?: Record<string, boolean>
  blocks?: Record<string, { x: number; y: number; gone?: boolean; kind?: string; glyph?: string; big?: boolean; extra?: boolean; type?: string }>
  statues?: Record<string, string>
  carry?: string
  gin?: Record<string, number>
  solved?: Record<string, boolean>
  revealed?: Record<string, boolean>
  counters?: Record<string, number>
  over?: Record<string, 'bridge' | 'fill'>
  words?: Record<string, string>
  latched?: Record<string, boolean>
  keys?: Record<string, boolean>
  timers?: Record<string, number>
  vars?: Record<string, number | boolean | string>
}

interface Ent {
  id: string
  type: string
  o?: MapObject
  p: Props
  x: number
  y: number
  w: number
  h: number
  img?: Phaser.GameObjects.Image
  g?: Phaser.GameObjects.Graphics
  texts?: PxText[]
  gone?: boolean
  // blocks
  kind?: string
  glyph?: string
  heavy?: boolean
  big?: boolean
  // doors
  openK?: number
  open?: boolean
  // switches
  pressed?: boolean
}

interface Timer { id: string; label: string; ms: number; running: boolean; ranks: number[] }

const RANKS = ['S', 'A', 'B', 'C']
const key = (x: number, y: number) => `${x},${y}`
const num = (v: unknown, d = 0) => (v === undefined || v === '' || !Number.isFinite(Number(v)) ? d : Number(v))
const isDir = (v: unknown): v is Dir => v === 'up' || v === 'down' || v === 'left' || v === 'right'

export function drawFloorCell(g: Phaser.GameObjects.Graphics, x: number, y: number, f: FloorInfo, staticFrame = false): void {
  const px = x * TILE
  const py = y * TILE
  if (f.ice) {
    g.fillStyle(0x9cd0f0)
    g.fillRect(px, py, TILE, TILE)
    g.fillStyle(0xc8e8fa)
    g.fillRect(px, py, TILE, 1)
    g.fillStyle(0xe4f8fc)
    g.fillRect(px + ((x * 5 + y * 3) % 9) + 2, py + ((x * 3 + y * 7) % 9) + 3, 4, 1)
    g.fillRect(px + ((x * 7 + y) % 8) + 3, py + ((x + y * 5) % 6) + 2, 1, 1)
  } else if (f.gap) {
    g.fillStyle(0x0c0a12)
    g.fillRect(px, py, TILE, TILE)
    g.fillStyle(0x28222e)
    g.fillRect(px, py, TILE, 3)
  } else if (f.snow) {
    g.fillStyle(0xf4f6fa)
    g.fillRect(px, py, TILE, TILE)
    g.fillStyle(0xd4dae6)
    g.fillRect(px + ((x * 5 + y) % 11) + 1, py + ((y * 3 + x) % 11) + 2, 2, 1)
  } else if (f.puddle) {
    g.fillStyle(0x4a94dc, 0.8)
    g.fillRect(px + 3, py + 6, 10, 6)
    g.fillRect(px + 2, py + 7, 12, 4)
    g.fillStyle(0xb4e0f8, 0.9)
    g.fillRect(px + 4, py + 7, 4, 1)
  } else if (staticFrame && f.conveyor) {
    g.fillStyle(0x363a4c)
    g.fillRect(px, py, TILE, TILE)
    drawArrow(g, px + 8, py + 8, f.conveyor, 0xf8d838)
  } else if (staticFrame && f.rough_water) {
    g.fillStyle(0x24508c)
    g.fillRect(px, py, TILE, TILE)
    g.fillStyle(0x4a94dc)
    g.fillRect(px + ((x * 7) % 12), py + 4, 3, 1)
    g.fillRect(px + ((x * 5 + 6) % 12), py + 10, 3, 1)
  } else if (f.oneway || f.spinner) {
    const d = (f.oneway ?? f.spinner)!
    g.fillStyle(f.spinner ? 0x4c3a8c : 0x7c8296)
    g.fillRect(px, py, TILE, TILE)
    g.fillStyle(f.spinner ? 0x6c54bc : 0xa6acbc)
    g.fillRect(px + 1, py + 1, 14, 14)
    drawArrow(g, px + 8, py + 8, d, f.spinner ? 0xfce070 : 0x2c4a8c)
  }
}

export function drawArrow(g: Phaser.GameObjects.Graphics, cx: number, cy: number, d: Dir, col: number, off = 0): void {
  g.fillStyle(col)
  const v = DIR_VEC[d]
  for (let i = 0; i < 4; i++) {
    const w = 7 - i * 2
    if (v.y) g.fillRect(cx - Math.floor(w / 2), cy + v.y * (i - 1 + off), w, 1)
    else g.fillRect(cx + v.x * (i - 1 + off), cy - Math.floor(w / 2), 1, w)
  }
  if (v.y) g.fillRect(cx - 1, cy - v.y * 4 + off * v.y, 2, 4)
  else g.fillRect(cx - v.x * 4 + off * v.x, cy - 1, 4, 2)
}

/** Floor semantics of a `floor` map object. */
export function floorInfoOf(o: MapObject): FloorInfo {
  const info: FloorInfo = {}
  const k = String(o.props.kind ?? '')
  const d = String(o.props.dir ?? 'down') as Dir
  if (k === 'ice') info.ice = true
  else if (k === 'conveyor') info.conveyor = d
  else if (k === 'oneway') info.oneway = d
  else if (k === 'spinner') info.spinner = d
  else if (k === 'gap') info.gap = true
  else if (k === 'rough_water') info.rough_water = true
  else if (k === 'snow') info.snow = true
  else if (k === 'puddle') info.puddle = true
  return info
}

/** Draw a map's floor objects (static frame) — used for connected neighbour maps. */
export function drawStaticFloors(g: Phaser.GameObjects.Graphics, objects: MapObject[]): void {
  for (const o of objects) {
    if (o.type !== 'floor' || o.props.draw === false) continue
    const info = floorInfoOf(o)
    for (let y = o.ty; y < o.ty + o.th; y++) for (let x = o.tx; x < o.tx + o.tw; x++) drawFloorCell(g, x, y, info, true)
  }
}

export class PuzzleManager {
  readonly ow: OverworldScene
  readonly mapId: string
  private scene: Phaser.Scene
  ents: Ent[] = []
  private byId = new Map<string, Ent>()
  private floors: Array<{ o: MapObject; info: FloorInfo }> = []
  private floorG: Phaser.GameObjects.Graphics
  private animG: Phaser.GameObjects.Graphics
  private beamG: Phaser.GameObjects.Graphics
  private graphs = new Map<string, { g: CompGraph; p: Props }>()
  private nodeTexts = new Map<string, PxText[]>()
  private timers = new Map<string, Timer>()
  private dynCounters = new Map<string, { label: string; max?: number; style?: 'budget' | 'goal' | 'plain' }>()
  private frame = 0
  private letterPrev = new Map<string, string>()
  private carryImg?: Phaser.GameObjects.Image
  private destroyed = false

  constructor(ow: OverworldScene, mapId: string, objects: MapObject[], fresh: boolean) {
    this.ow = ow
    this.scene = ow
    this.mapId = mapId
    if (fresh && String(ow.map?.props.puzzleReset ?? 'never') === 'enter') delete state.mapState[mapId]
    // floors paint over the map's first (ground) layer but under detail layers (rocks, hedges)
    this.floorG = ow.add.graphics().setDepth(DEPTH.ground + 0.5)
    this.animG = ow.add.graphics().setDepth(DEPTH.ground + 0.6)
    this.beamG = ow.add.graphics().setDepth(DEPTH.over - 5)
    this.build(objects)
  }

  /** Saved state for this map (created on demand). */
  get S(): PState {
    return (state.mapState[this.mapId] ??= {}) as PState
  }

  get hasContent(): boolean {
    return this.ents.length > 0 || this.floors.length > 0 || this.dynCounters.size > 0 || this.timers.size > 0
  }

  // ================================================================ building

  private build(objects: MapObject[]): void {
    const S = this.S
    for (const o of objects) {
      const t = o.type === 'gate' ? 'door' : o.type
      const p = o.props
      const id = String(p.id ?? (o.name || `${t}${o.id}`))
      if (t === 'floor') {
        this.floors.push({ o, info: floorInfoOf(o) })
        continue
      }
      if (!['switch', 'door', 'block', 'boulder', 'teleport', 'counter', 'timer', 'statue', 'key', 'beam', 'letter', 'gnode', 'wire', 'graph', 'reset', 'anchor'].includes(t)) continue
      const e: Ent = { id, type: t, o, p, x: o.tx, y: o.ty, w: o.tw, h: o.th }
      if (t === 'block' || t === 'boulder') {
        const saved = S.blocks?.[id]
        e.kind = String(p.kind ?? (t === 'boulder' ? 'stone' : 'a'))
        e.glyph = p.glyph !== undefined ? String(p.glyph) : undefined
        e.heavy = t === 'boulder' ? p.heavy !== false : !!p.heavy
        if (saved) {
          e.x = saved.x
          e.y = saved.y
          e.gone = !!saved.gone
          if (saved.kind) e.kind = saved.kind
          if (saved.glyph !== undefined) e.glyph = saved.glyph
          e.big = !!saved.big
        }
      }
      if (t === 'key' && S.keys?.[id]) e.gone = true
      if (t === 'counter' && S.counters?.[id] === undefined) (S.counters ??= {})[id] = num(p.start, 0)
      this.add(e)
    }
    // merge results created earlier (saved)
    for (const [id, b] of Object.entries(S.blocks ?? {})) {
      if (!b.extra || b.gone || this.byId.has(id)) continue
      this.add({ id, type: b.type ?? 'block', p: {}, x: b.x, y: b.y, w: 1, h: 1, kind: b.kind ?? 'a', glyph: b.glyph, big: b.big, heavy: !!b.big })
    }
    this.buildGraphs()
    for (const e of this.ents) this.makeVisual(e)
    this.drawFloor()
    this.refresh(true)
  }

  private add(e: Ent): void {
    this.ents.push(e)
    this.byId.set(e.id, e)
  }

  ent(id: string): Ent | undefined {
    return this.byId.get(id)
  }

  private buildGraphs(): void {
    const groups = new Map<string, { nodes: GNodeDef[]; wires: Array<{ from: string; to: string }> }>()
    const grp = (id: string) => {
      if (!groups.has(id)) groups.set(id, { nodes: [], wires: [] })
      return groups.get(id)!
    }
    const nodeGraph = new Map<string, string>()
    for (const e of this.ents) {
      if (e.type !== 'gnode') continue
      const gid = String(e.p.graph ?? 'g')
      const op = String(e.p.op ?? 'input') as GOp
      const saved = this.S.gin?.[e.id]
      grp(gid).nodes.push({ id: e.id, op: GRAPH_OPS.includes(op) ? op : 'input', value: saved ?? num(e.p.value, 0) })
      nodeGraph.set(e.id, gid)
    }
    for (const e of this.ents) {
      if (e.type !== 'wire') continue
      const gid = nodeGraph.get(String(e.p.from)) ?? String(e.p.graph ?? 'g')
      grp(gid).wires.push({ from: String(e.p.from), to: String(e.p.to) })
    }
    for (const [gid, d] of groups) {
      const def = this.ents.find((e) => e.type === 'graph' && e.id === gid)
      this.graphs.set(gid, { g: new CompGraph(d.nodes, d.wires), p: def?.p ?? {} })
    }
  }

  // ================================================================ visuals

  private ysort(e: Ent, bottomPx: number): number {
    return DEPTH.charBase + bottomPx - 1 + (e.type === 'door' ? 0 : 0)
  }

  private makeVisual(e: Ent): void {
    const sc = this.scene
    if (e.type === 'block' || e.type === 'boulder') {
      const tex = e.p.sprite ? String(e.p.sprite) : e.type === 'boulder' ? boulderTexture(sc, e.kind!) : blockTexture(sc, e.kind!)
      e.img?.destroy()
      e.img = sc.add.image(0, 0, tex).setOrigin(0, 1)
      if (e.big) e.img.setTint(0xffffff)
      for (const t of e.texts ?? []) t.destroy()
      e.texts = []
      if (e.glyph) {
        const t = new PxText(sc, 0, 0, e.glyph, { font: FONT.mini, color: 0xfcfaf0, shadowColor: kindRamp(e.kind!)[0], shadow: 'drop' })
        e.texts.push(t)
      }
      this.placeBlock(e, e.x * TILE, e.y * TILE)
      e.img.setVisible(!e.gone)
      for (const t of e.texts) t.setVisible(!e.gone)
    } else if (e.type === 'statue') {
      e.img = sc.add.image(e.x * TILE, (e.y + 1) * TILE, e.p.sprite ? String(e.p.sprite) : statueTexture(sc)).setOrigin(0, 1)
      e.img.setDepth(this.ysort(e, (e.y + 1) * TILE))
      if (e.p.label) {
        const t = new PxText(sc, 0, 0, String(e.p.label), { font: FONT.mini, color: 0x383840, shadow: 'none' })
        t.setPosition(e.x * TILE + 8 - Math.floor(t.width / 2), (e.y + 1) * TILE - 6).setDepth(e.img.depth + 0.1)
        e.texts = [t]
      }
    } else if (e.type === 'anchor') {
      e.img = sc.add.image(e.x * TILE, e.y * TILE, e.p.sprite ? String(e.p.sprite) : anchorTexture(sc)).setOrigin(0, 0).setDepth(DEPTH.shadow - 8)
    } else if (e.type === 'key') {
      e.img = sc.add.image(e.x * TILE + 2, e.y * TILE + 5, keyTexture(sc)).setOrigin(0, 0).setDepth(DEPTH.shadow - 7).setVisible(!e.gone)
    } else if (e.type === 'door') {
      e.g = sc.add.graphics().setDepth(this.ysort(e, (e.y + e.h) * TILE))
      if (e.p.sprite) e.img = sc.add.image(e.x * TILE, (e.y + e.h) * TILE, String(e.p.sprite)).setOrigin(0, 1).setDepth(e.g.depth)
    } else if (e.type === 'gnode') {
      const ts = [0, 1, 2].map(() => new PxText(sc, 0, 0, '', { font: FONT.mini, color: 0xfcfaf0, shadowColor: 0x20222e, shadow: 'drop' }).setDepth(DEPTH.shadow - 6))
      this.nodeTexts.set(e.id, ts)
    } else if (e.type === 'letter') {
      e.texts = []
      const glyphs = this.letterGlyphs(e)
      for (const [i, ch] of glyphs.entries()) {
        if (!ch || ch === ' ') continue
        const x = e.x + (i % e.w)
        const y = e.y + Math.floor(i / e.w)
        const t = new PxText(sc, 0, 0, ch, { color: 0x383840, shadowColor: 0xd8d0b8, shadow: 'drop' }).setDepth(DEPTH.shadow - 6)
        t.setPosition(x * TILE + 8 - Math.ceil(t.width / 2), y * TILE + 1)
        e.texts.push(t)
      }
    }
  }

  private letterGlyphs(e: Ent): string[] {
    const s = String(e.p.text ?? e.p.glyph ?? '')
    return [...s.replace(/\\n|\n|\|/g, '')]
  }

  private placeBlock(e: Ent, px: number, py: number): void {
    if (!e.img) return
    e.img.setPosition(Math.round(px), Math.round(py) + TILE)
    e.img.setDepth(DEPTH.charBase + Math.round(py) + TILE - 1)
    for (const t of e.texts ?? []) t.setPosition(Math.round(px) + 8 - Math.ceil(t.width / 2), Math.round(py) + (e.type === 'boulder' ? 6 : 1)).setDepth(e.img.depth + 0.1)
  }

  /** Static floor drawing: floor objects, switches, pads, letters, bridges. Redrawn on changes. */
  private drawFloor(): void {
    const g = this.floorG
    g.clear()
    for (const f of this.activeFloors()) {
      if (f.o.props.draw === false) continue
      for (let y = f.o.ty; y < f.o.ty + f.o.th; y++) {
        for (let x = f.o.tx; x < f.o.tx + f.o.tw; x++) drawFloorCell(g, x, y, f.info)
      }
    }
    for (const [k, v] of Object.entries(this.S.over ?? {})) {
      const [x, y] = k.split(',').map(Number)
      const px = x * TILE
      const py = y * TILE
      if (v === 'bridge') {
        g.fillStyle(0x553a2e)
        g.fillRect(px, py, TILE, TILE)
        for (let i = 0; i < 4; i++) {
          g.fillStyle(i % 2 ? 0xbd8654 : 0xe0b078)
          g.fillRect(px, py + i * 4, TILE, 3)
        }
        g.fillStyle(0x6b4630)
        g.fillRect(px + 2, py, 1, TILE)
        g.fillRect(px + 13, py, 1, TILE)
      } else {
        g.fillStyle(0x7c8296)
        g.fillRect(px, py, TILE, TILE)
        g.fillStyle(0xa6acbc)
        g.fillRect(px + 1, py + 1, 14, 3)
        g.fillStyle(0x565a6e)
        g.fillRect(px + 2, py + 8, 5, 1)
        g.fillRect(px + 9, py + 12, 4, 1)
      }
    }
    for (const e of this.ents) {
      const px = e.x * TILE
      const py = e.y * TILE
      if (e.type === 'switch') {
        const mode = String(e.p.mode ?? 'momentary')
        const col = mode === 'toggle' ? [0x2c4a8c, 0x5c94e0] : mode === 'weight' ? [0x4a5262, 0xa8b4c0] : [0xa84818, 0xf07830]
        const down = !!e.pressed
        g.fillStyle(COLORS.outline)
        g.fillRect(px + 1, py + 2, 14, 13)
        g.fillStyle(col[0])
        g.fillRect(px + 2, py + 3, 12, 11)
        g.fillStyle(down ? col[0] : col[1])
        g.fillRect(px + 3, py + (down ? 6 : 3), 10, down ? 7 : 9)
        if (!down) {
          g.fillStyle(0xffffff, 0.5)
          g.fillRect(px + 3, py + 3, 10, 1)
        }
        if (mode === 'weight') {
          g.fillStyle(COLORS.outline)
          g.fillRect(px + 6, py + (down ? 8 : 6), 4, 3)
        }
      } else if (e.type === 'reset') {
        g.fillStyle(COLORS.outline)
        g.fillRect(px + 3, py + 4, 10, 10)
        g.fillStyle(0xc04444)
        g.fillRect(px + 4, py + 5, 8, 8)
        g.fillStyle(0xf4a088)
        g.fillRect(px + 5, py + 6, 3, 2)
      } else if (e.type === 'letter') {
        const glyphs = this.letterGlyphs(e)
        for (const [i, ch] of glyphs.entries()) {
          if (!ch || ch === ' ') continue
          const x = (e.x + (i % e.w)) * TILE
          const y = (e.y + Math.floor(i / e.w)) * TILE
          g.fillStyle(0xb8a482)
          g.fillRect(x + 1, y + 1, 14, 14)
          g.fillStyle(0xf2e6c4)
          g.fillRect(x + 1, y + 1, 14, 13)
          g.fillStyle(0xfcf6e2)
          g.fillRect(x + 1, y + 1, 14, 1)
        }
      } else if (e.type === 'gnode') {
        const op = String(e.p.op ?? 'input')
        const col = op === 'input' ? 0x3f6cc0 : op === 'out' ? 0xe8b830 : op === 'mul' ? 0xe07028 : op === 'add' ? 0x2c9458 : 0x7050c0
        g.fillStyle(COLORS.outline)
        g.fillRect(px, py, TILE, TILE)
        g.fillStyle(col)
        g.fillRect(px + 1, py + 1, 14, 14)
        g.fillStyle(0x20222e)
        g.fillRect(px + 2, py + 2, 12, 12)
        g.fillStyle(0x363a4c)
        g.fillRect(px + 2, py + 2, 12, 1)
      }
    }
  }

  // ================================================================ per-frame

  tick(): void {
    if (this.destroyed) return
    this.frame++
    // timers
    for (const t of this.timers.values()) if (t.running) t.ms += 1000 / 60
    // doors animate
    for (const e of this.ents) {
      if (e.type !== 'door') continue
      const target = e.open ? 1 : 0
      if (e.openK === undefined) e.openK = target
      if (e.openK !== target) {
        e.openK = params.fast ? target : Math.max(0, Math.min(1, e.openK + (target > e.openK ? 0.1 : -0.1)))
        this.drawDoor(e)
      }
    }
    if (this.frame % 4 === 0) this.drawAnim()
    this.updateHud()
  }

  private drawDoor(e: Ent): void {
    const g = e.g
    if (!g) return
    g.clear()
    if (e.img) {
      e.img.setVisible((e.openK ?? 0) < 1)
      e.img.setAlpha(1 - (e.openK ?? 0))
      return
    }
    const k = e.openK ?? 0
    const px = e.x * TILE
    const py = e.y * TILE
    const w = e.w * TILE
    const h = e.h * TILE
    // floor groove (always) + frame posts
    g.fillStyle(0x565a6e)
    g.fillRect(px, py + h - 3, w, 2)
    if (k >= 1) return
    const barH = Math.round((h + 6) * (1 - k))
    const top = py + h - barH - 2
    g.fillStyle(COLORS.outline)
    g.fillRect(px, top - 1, w, barH + 1)
    for (let x = px + 1; x < px + w - 1; x += 4) {
      g.fillStyle(0x7c8296)
      g.fillRect(x, top, 3, barH)
      g.fillStyle(0xced2dc)
      g.fillRect(x, top, 1, barH)
    }
    g.fillStyle(0xa84818)
    g.fillRect(px, top, w, 3)
    g.fillStyle(0xf07830)
    g.fillRect(px, top, w, 1)
  }

  /** Animated layer: wires (flowing pulses), conveyors, teleport pads, rough water, key glints, beams. */
  private drawAnim(): void {
    const g = this.animG
    g.clear()
    const t = this.frame / 4
    for (const f of this.activeFloors()) {
      if (f.o.props.draw === false) continue
      if (!f.info.conveyor && !f.info.rough_water) continue
      for (let y = f.o.ty; y < f.o.ty + f.o.th; y++) {
        for (let x = f.o.tx; x < f.o.tx + f.o.tw; x++) {
          const px = x * TILE
          const py = y * TILE
          if (f.info.conveyor) {
            g.fillStyle(0x363a4c)
            g.fillRect(px, py, TILE, TILE)
            g.fillStyle(0x545a70)
            const v = DIR_VEC[f.info.conveyor]
            if (v.y) {
              g.fillRect(px, py, 2, TILE)
              g.fillRect(px + 14, py, 2, TILE)
            } else {
              g.fillRect(px, py, TILE, 2)
              g.fillRect(px, py + 14, TILE, 2)
            }
            const off = (Math.floor(t) % 4) - 1
            drawArrow(g, px + 8, py + 8, f.info.conveyor, 0xf8d838, off)
          } else {
            g.fillStyle(0x24508c)
            g.fillRect(px, py, TILE, TILE)
            g.fillStyle(0x4a94dc)
            for (let i = 0; i < 3; i++) {
              const ox = Math.floor((x * 7 + i * 5 + t * (i + 1)) % 14)
              g.fillRect(px + ox, py + 2 + i * 5, 3, 1)
            }
            g.fillStyle(0xd4dae6)
            g.fillRect(px + Math.floor((x * 3 + t * 2) % 13), py + 3 + Math.floor((y + t) % 9), 2, 1)
          }
        }
      }
    }
    for (const e of this.ents) {
      if (e.type === 'teleport') {
        const px = e.x * TILE
        const py = e.y * TILE
        const on = evalCond(String(e.p.when ?? ''), (n) => this.resolve(n))
        g.fillStyle(COLORS.outline)
        g.fillRect(px + 2, py + 2, 12, 12)
        g.fillStyle(on ? 0x6c54bc : 0x545a70)
        g.fillRect(px + 3, py + 3, 10, 10)
        g.fillStyle(on ? 0xbca8f0 : 0x7c8296)
        const r = Math.floor(t) % 4
        g.fillRect(px + 7 - r, py + 7 - r, 2 + r * 2, 1)
        g.fillRect(px + 7 - r, py + 8 + r, 2 + r * 2, 1)
        g.fillRect(px + 7 - r, py + 7 - r, 1, 2 + r * 2)
        g.fillRect(px + 8 + r, py + 7 - r, 1, 2 + r * 2)
      }
    }
    // wires
    for (const e of this.ents) {
      if (e.type !== 'wire') continue
      const a = this.byId.get(String(e.p.from))
      const b = this.byId.get(String(e.p.to))
      if (!a || !b) continue
      const gr = this.graphOf(a.id)
      const v = gr ? gr.g.value(a.id) : 0
      const col = v > 0 ? 0xf8b860 : v < 0 ? 0x72b8ee : 0x7c8296
      const pts = this.wirePath(e, a, b)
      let s = 0
      for (let i = 0; i + 1 < pts.length; i++) {
        const [x0, y0] = pts[i]
        const [x1, y1] = pts[i + 1]
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
        for (let k = 0; k <= n; k++) {
          const x = Math.round(x0 + ((x1 - x0) * k) / (n || 1))
          const y = Math.round(y0 + ((y1 - y0) * k) / (n || 1))
          // skip under the node plates
          if (this.nodeAtPx(x, y)) {
            s++
            continue
          }
          // 2px glowing core in a dark sheath; a bright pulse flows from input to output
          g.fillStyle(0x20222e)
          g.fillRect(x - 1, y - 1, 4, 4)
          const pulse = v !== 0 && ((s - Math.floor(t * 2)) % 14 + 14) % 14 < 2
          g.fillStyle(pulse ? 0xfcfaf0 : col)
          g.fillRect(x, y, 2, 2)
          s++
        }
      }
    }
    this.drawBeams()
  }

  private nodeAtPx(x: number, y: number): boolean {
    const tx = Math.floor(x / TILE)
    const ty = Math.floor(y / TILE)
    return this.ents.some((e) => e.type === 'gnode' && e.x === tx && e.y === ty)
  }

  /** Wire route in px: the object's polyline if any, else an L (horizontal, then vertical). */
  private wirePath(e: Ent, a: Ent, b: Ent): Array<[number, number]> {
    const c = (q: Ent): [number, number] => [q.x * TILE + 8, q.y * TILE + 8]
    const pl = e.p.points
    if (typeof pl === 'string' && pl.trim()) {
      const mids = pl.split(';').map((s) => s.split(',').map(Number)).filter((q) => q.length === 2).map(([x, y]) => [x * TILE + 8, y * TILE + 8] as [number, number])
      return [c(a), ...mids, c(b)]
    }
    const [ax, ay] = c(a)
    const [bx, by] = c(b)
    return [[ax, ay], [bx, ay], [bx, by]]
  }

  private drawBeams(): void {
    const g = this.beamG
    g.clear()
    for (const e of this.ents) {
      if (e.type !== 'beam') continue
      if (!evalCond(String(e.p.when ?? ''), (n) => this.resolve(n))) continue
      const pt = (s: string): [number, number] | null => {
        const q = this.byId.get(s)
        if (q) return [q.x * TILE + 8, q.y * TILE + (q.type === 'statue' ? -4 : 8)]
        const m = /^(\d+),(\d+)$/.exec(s)
        return m ? [Number(m[1]) * TILE + 8, Number(m[2]) * TILE + 8] : null
      }
      const a = pt(String(e.p.from ?? ''))
      const b = pt(String(e.p.to ?? ''))
      if (!a || !b) continue
      const col = num(String(e.p.color ?? '').replace('#', '0x'), 0xf8d838) || 0xf8d838
      const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1)
      for (let k = 0; k <= n; k++) {
        const x = Math.round(a[0] + ((b[0] - a[0]) * k) / n)
        const y = Math.round(a[1] + ((b[1] - a[1]) * k) / n)
        const flick = (k + this.frame) % 10 < 2
        g.fillStyle(col, 0.35)
        g.fillRect(x - 1, y - 1, 3, 3)
        g.fillStyle(flick ? 0xffffff : col, 0.95)
        g.fillRect(x, y, 1, 1)
      }
    }
  }

  // ================================================================ queries for movement

  /** Floor objects whose `when` condition holds (no `when` = always). Later objects win on overlap. */
  private activeFloors(): Array<{ o: MapObject; info: FloorInfo }> {
    return this.floors.filter((f) => f.o.props.when === undefined || evalCond(String(f.o.props.when), (n) => this.resolve(n)))
  }

  /** Floor semantics at a cell: tile props merged with floor objects and bridges. */
  floorAt(x: number, y: number): FloorInfo {
    const t = this.ow.map?.tileAt(x, y) ?? {}
    const out: FloorInfo = {}
    if (t.ice) out.ice = true
    if (t.gap) out.gap = true
    if (t.rough_water) out.rough_water = true
    if (t.water) out.water = true
    if (t.snow) out.snow = true
    if (t.puddle) out.puddle = true
    if (isDir(t.conveyor)) out.conveyor = t.conveyor
    if (isDir(t.oneway)) out.oneway = t.oneway
    if (isDir(t.spinner)) out.spinner = t.spinner
    for (const f of this.activeFloors()) {
      if (x >= f.o.tx && x < f.o.tx + f.o.tw && y >= f.o.ty && y < f.o.ty + f.o.th) Object.assign(out, f.info)
    }
    if (this.S.over?.[key(x, y)]) {
      out.bridged = true
      out.gap = out.rough_water = out.water = false
    }
    return out
  }

  /** Solid puzzle object at the cell (blocks, boulders, closed doors, statues). */
  solidAt(x: number, y: number): Ent | undefined {
    return this.ents.find((e) => !e.gone && (
      ((e.type === 'block' || e.type === 'boulder' || e.type === 'statue') && e.x === x && e.y === y)
      || (e.type === 'door' && !e.open && x >= e.x && x < e.x + e.w && y >= e.y && y < e.y + e.h)))
  }

  blockAt(x: number, y: number): Ent | undefined {
    return this.ents.find((e) => !e.gone && (e.type === 'block' || e.type === 'boulder') && e.x === x && e.y === y)
  }

  entAt(type: string, x: number, y: number): Ent | undefined {
    return this.ents.find((e) => !e.gone && e.type === type && x >= e.x && x < e.x + e.w && y >= e.y && y < e.y + e.h)
  }

  /** Does the map grid (tiles, actors, props, items) or a puzzle solid block (x, y)? Floors that need skills are blocking. */
  cellBlocked(x: number, y: number, forBlock = false): boolean {
    if (this.ow.baseBlocked(x, y)) return true
    if (this.solidAt(x, y)) return true
    const f = this.floorAt(x, y)
    if (f.rough_water) return true
    if (f.gap && !forBlock) return true
    if (forBlock && (this.entAt('statue', x, y) || this.entAt('teleport', x, y))) return true
    return false
  }

  // ================================================================ pushing / pulling blocks

  /** Player walks into a block: push it one tile (sliding on ice; filling a gap). */
  async push(e: Ent, d: Dir, embedActive: boolean): Promise<'moved' | 'heavy' | 'stuck'> {
    if (e.heavy && !embedActive) return 'heavy'
    const v = DIR_VEC[d]
    const nx = e.x + v.x
    const ny = e.y + v.y
    if (this.cellBlocked(nx, ny, true) || this.ow.actorOn(nx, ny)) return 'stuck'
    audio.sfx('bump')
    await this.slideBlock(e, d, 1)
    return 'moved'
  }

  /** Move a block `n` tiles (continuing across ice); handles gap filling. */
  async slideBlock(e: Ent, d: Dir, n: number, untilBlocked = false): Promise<void> {
    const v = DIR_VEC[d]
    let steps = 0
    for (;;) {
      const nx = e.x + v.x
      const ny = e.y + v.y
      if (this.cellBlocked(nx, ny, true) || this.ow.actorOn(nx, ny)) break
      const fx = e.x * TILE
      const fy = e.y * TILE
      e.x = nx
      e.y = ny
      await this.tweenBlock(e, fx, fy, untilBlocked ? 6 : 12)
      steps++
      const f = this.floorAt(nx, ny)
      if (f.gap) {
        // the block drops into the hole and fills it
        e.gone = true
        ;(this.S.over ??= {})[key(nx, ny)] = 'fill'
        audio.sfx('ledge')
        this.saveBlock(e)
        e.img?.setVisible(false)
        for (const t of e.texts ?? []) t.setVisible(false)
        this.emit({ type: 'block_fill', id: e.id, x: nx, y: ny })
        this.drawFloor()
        break
      }
      if (!untilBlocked && steps >= n && !f.ice) break
    }
    this.saveBlock(e)
    if (steps) this.emit({ type: 'block', id: e.id, x: e.x, y: e.y })
    this.refresh()
  }

  private tweenBlock(e: Ent, fx: number, fy: number, frames: number): Promise<void> {
    const dur = ms((frames * 1000) / 60)
    if (!dur) {
      this.placeBlock(e, e.x * TILE, e.y * TILE)
      return Promise.resolve()
    }
    const p = { x: fx, y: fy }
    return new Promise((res) => this.scene.tweens.add({
      targets: p, x: e.x * TILE, y: e.y * TILE, duration: dur, ease: 'Linear',
      onUpdate: () => this.placeBlock(e, p.x, p.y),
      onComplete: () => {
        this.placeBlock(e, e.x * TILE, e.y * TILE)
        res()
      },
    }))
  }

  private saveBlock(e: Ent): void {
    const b = ((this.S.blocks ??= {})[e.id] ??= { x: e.x, y: e.y })
    b.x = e.x
    b.y = e.y
    b.gone = !!e.gone
    b.kind = e.kind
    b.glyph = e.glyph
    b.big = e.big
    if (!e.o) {
      b.extra = true
      b.type = e.type
    }
  }

  /** Embed: nearest same-kind block in a straight line from `e` (any distance), or null. */
  kinDirection(e: Ent): Dir | null {
    let best: { d: Dir; n: number } | null = null
    for (const d of ['up', 'down', 'left', 'right'] as Dir[]) {
      const v = DIR_VEC[d]
      for (let n = 1; n < 40; n++) {
        const x = e.x + v.x * n
        const y = e.y + v.y * n
        if (!this.ow.map?.inBounds(x, y)) break
        const b = this.blockAt(x, y)
        if (b) {
          if (b.kind === e.kind && n > 1 && (!best || n < best.n)) best = { d, n }
          break
        }
        if (this.ow.map.isSolid(x, y)) break
      }
    }
    return best?.d ?? null
  }

  // ================================================================ merge

  /** Merge (field skill): fuse `e` with an adjacent boulder of the same kind. Returns a message or null on success. */
  async merge(e: Ent, facing: Dir): Promise<string | null> {
    const cands = [DIR_VEC[facing], ...Object.values(DIR_VEC)].map((q) => this.blockAt(e.x + q.x, e.y + q.y))
    const partner = cands.find((b) => b && b !== e && b.type === e.type && b.kind === e.kind)
    if (!partner) return 'There’s nothing here it could merge with.'
    const rule: MergeRule = {
      ...(mergeRules.get(e.kind!) ?? { result: 'bridge' }),
      ...(e.p.merge !== undefined ? { result: String(e.p.merge) } : {}),
      ...(e.p.resultKind !== undefined ? { resultKind: String(e.p.resultKind) } : {}),
      ...(e.p.bridgeLen !== undefined ? { bridgeLen: Number(e.p.bridgeLen) } : {}),
    }
    if (rule.result === 'bridge') {
      // nearest straight run of gap/water next to either boulder, ending on land
      const run = this.findBridgeRun([e, partner], facing, rule.bridgeLen ?? 8)
      if (!run) return 'There’s no gap or water next to them to bridge.'
      await this.fuseAnim(e, partner)
      for (const c of run) (this.S.over ??= {})[key(c.x, c.y)] = 'bridge'
      this.drawFloor()
      this.emit({ type: 'merge', id: e.id, partner: partner.id, result: 'bridge', cells: run })
      this.refresh()
      return null
    }
    if (rule.result === 'block') {
      await this.fuseAnim(e, partner)
      const nb: Ent = {
        id: `${e.id}+${partner.id}`, type: 'block', p: {}, x: e.x, y: e.y, w: 1, h: 1,
        kind: rule.resultKind ?? e.kind, glyph: (e.glyph ?? '') + (partner.glyph ?? '') || undefined, big: true, heavy: true,
      }
      this.add(nb)
      this.makeVisual(nb)
      this.saveBlock(nb)
      this.emit({ type: 'merge', id: e.id, partner: partner.id, result: 'block', newId: nb.id, glyph: nb.glyph })
      this.refresh()
      return null
    }
    // a script decides
    await this.ow.run(rule.result, undefined, { merge: { a: e.id, b: partner.id, kind: e.kind, glyphs: [e.glyph, partner.glyph] } })
    return null
  }

  private findBridgeRun(pair: Ent[], facing: Dir, maxLen: number): Array<{ x: number; y: number }> | null {
    const dirs = [facing, ...(['up', 'down', 'left', 'right'] as Dir[]).filter((d) => d !== facing)]
    for (const d of dirs) {
      for (const b of pair) {
        const v = DIR_VEC[d]
        const cells: Array<{ x: number; y: number }> = []
        let x = b.x + v.x
        let y = b.y + v.y
        const wet = (cx: number, cy: number) => {
          const f = this.floorAt(cx, cy)
          return !!(f.gap || f.rough_water || f.water)
        }
        while (wet(x, y) && cells.length < maxLen) {
          cells.push({ x, y })
          x += v.x
          y += v.y
        }
        if (cells.length && !wet(x, y) && this.ow.map?.inBounds(x, y) && !this.ow.map.isSolid(x, y)) return cells
      }
    }
    return null
  }

  private async fuseAnim(a: Ent, b: Ent): Promise<void> {
    audio.sfx('orb_catch')
    const mx = ((a.x + b.x) / 2) * TILE
    const my = ((a.y + b.y) / 2) * TILE
    const pa = { x: a.x * TILE, y: a.y * TILE }
    const pb = { x: b.x * TILE, y: b.y * TILE }
    const d = ms(320)
    if (d) {
      await new Promise<void>((res) => this.scene.tweens.add({
        targets: [pa, pb], x: mx, y: my, duration: d, ease: 'Quad.In',
        onUpdate: () => {
          this.placeBlock(a, pa.x, pa.y)
          this.placeBlock(b, pb.x, pb.y)
        },
        onComplete: () => res(),
      }))
      await this.ow.flash(0xffffff, 160)
    }
    for (const e of [a, b]) {
      e.gone = true
      e.img?.setVisible(false)
      for (const t of e.texts ?? []) t.setVisible(false)
      this.saveBlock(e)
    }
  }

  // ================================================================ landing on a tile

  /**
   * The player (or a script move) landed on (x, y) moving `d`. Updates switches, keys,
   * letters, teleports, counters and timers. Returns a forced move (ice / conveyor / spinner)
   * or a teleport target, or null.
   */
  onLand(x: number, y: number, d: Dir): { force?: Dir; slide?: boolean; teleport?: { x: number; y: number } } | null {
    const S = this.S
    // toggle switches flip on entry
    const sw = this.entAt('switch', x, y)
    if (sw && String(sw.p.mode ?? 'momentary') === 'toggle') {
      const sws = (S.sw ??= {})
      sws[sw.id] = !sws[sw.id]
      audio.sfx('select')
      this.emit({ type: 'switch', id: sw.id, on: sws[sw.id] })
    }
    const rs = this.entAt('reset', x, y)
    if (rs) void this.resetPuzzle(true)
    // floor key pickup
    const k = this.entAt('key', x, y)
    if (k && !S.carry) {
      S.carry = String(k.p.keyId ?? k.p.key ?? k.id)
      ;(S.keys ??= {})[k.id] = true
      k.gone = true
      k.img?.setVisible(false)
      audio.sfx('item_get')
      this.ow.ui.toast(`Picked up the key: ${S.carry}`)
      this.emit({ type: 'key', id: k.id, key: S.carry })
    }
    // letters
    const lt = this.entAt('letter', x, y)
    if (lt) {
      const i = (y - lt.y) * lt.w + (x - lt.x)
      const ch = this.letterGlyphs(lt)[i]
      if (ch && ch !== ' ') {
        const group = String(lt.p.group ?? lt.id)
        const words = (S.words ??= {})
        const prev = this.letterPrev.get(group) ?? (words[group] ?? '').slice(-1)
        words[group] = (words[group] ?? '') + ch
        this.letterPrev.set(group, ch)
        audio.sfx('text')
        const ev = { type: 'letter', id: lt.id, group, glyph: ch, prev, word: words[group], x, y }
        this.emit(ev)
        if (lt.p.cost !== undefined && lt.p.counter) this.counterAdd(String(lt.p.counter), num(lt.p.cost, 1))
        if (lt.p.script) void this.ow.run(String(lt.p.script), undefined, { letter: ev })
      }
    }
    // counters with perStep inside their area
    for (const e of this.ents) {
      if (e.type === 'counter' && e.p.perStep !== undefined && this.inArea(e, x, y)) this.counterAdd(e.id, num(e.p.perStep, 1))
    }
    // timers: start on entering their area
    for (const e of this.ents) {
      if (e.type !== 'timer') continue
      const t = this.timers.get(e.id)
      if (!t && this.inArea(e, x, y) && S.timers?.[e.id] === undefined) this.startTimer(e.id, { label: String(e.p.label ?? 'TIME'), ranks: String(e.p.ranks ?? '') })
    }
    this.refresh()
    // forced movement
    const f = this.floorAt(x, y)
    const tp = this.entAt('teleport', x, y)
    if (tp && evalCond(String(tp.p.when ?? ''), (n) => this.resolve(n))) {
      const dest = this.byId.get(String(tp.p.to ?? ''))
      const m = /^(\d+),(\d+)$/.exec(String(tp.p.to ?? ''))
      const to = dest ? { x: dest.x, y: dest.y } : m ? { x: Number(m[1]), y: Number(m[2]) } : null
      if (to) {
        this.emit({ type: 'teleport', id: tp.id, to })
        return { teleport: to }
      }
    }
    if (f.spinner) return { force: f.spinner, slide: true }
    if (f.conveyor) return { force: f.conveyor, slide: true }
    if (f.ice) return { force: d, slide: true }
    return null
  }

  private inArea(e: Ent, x: number, y: number): boolean {
    if (e.p.area === 'map' || (e.type === 'counter' && e.w === 1 && e.h === 1 && e.p.area === undefined)) return true
    return x >= e.x && x < e.x + e.w && y >= e.y && y < e.y + e.h
  }

  // ================================================================ interaction (A)

  /** A pressed while standing on (x, y) — graph nodes. Returns true if handled. */
  interactHere(x: number, y: number): boolean {
    const n = this.entAt('gnode', x, y)
    if (n) {
      void this.nodeInteract(n)
      return true
    }
    return false
  }

  /** A pressed facing (x, y): statues, reset buttons. Returns true if handled. */
  interactFacing(x: number, y: number): boolean {
    const st = this.entAt('statue', x, y)
    if (st) {
      void this.statueInteract(st)
      return true
    }
    return false
  }

  private async statueInteract(e: Ent): Promise<void> {
    const S = this.S
    const holds = (S.statues ??= {})[e.id] ?? String(e.p.holds ?? '')
    if (S.statues[e.id] === undefined) S.statues[e.id] = holds
    await this.ow.runInline(async (s) => {
      if (e.p.text) await s.say(String(e.p.text).replace(/\\n/g, '\n').replace(/\\f/g, '\f'))
      const carry = S.carry ?? ''
      if (holds && !carry) {
        if (await s.yesNo(`The statue holds the key “${holds}”. Take it?`)) {
          S.statues![e.id] = ''
          S.carry = holds
          audio.sfx('item_get')
        }
      } else if (carry) {
        const verb = holds ? `Swap “${carry}” for “${holds}”?` : `Place the key “${carry}” here?`
        if (await s.yesNo(verb)) {
          S.statues![e.id] = carry
          S.carry = holds || ''
          audio.sfx('select')
          const ok = this.statueOk(e)
          this.emit({ type: 'statue', id: e.id, key: carry, match: ok })
          if (ok) audio.sfx('stat_up')
        }
      } else if (!e.p.text) await s.say('An empty pedestal.')
    })
    this.refresh()
  }

  private statueOk(e: Ent): boolean {
    const held = this.S.statues?.[e.id] ?? String(e.p.holds ?? '')
    const acc = String(e.p.accepts ?? '').split(',').map((q) => q.trim()).filter(Boolean)
    return acc.length ? acc.includes(held) : !!held
  }

  private graphOf(nodeId: string): { g: CompGraph; p: Props } | undefined {
    for (const gr of this.graphs.values()) if (gr.g.nodes.has(nodeId)) return gr
    return undefined
  }

  /** Grad display mode of the graph a node belongs to: 'shown' | 'hidden' | 'quiz'. */
  gradMode(nodeId: string): string {
    const gr = this.graphOf(nodeId)
    if (!gr) return 'hidden'
    if (this.S.vars?.[`showGrad:${this.graphId(nodeId)}`] !== undefined) return this.S.vars[`showGrad:${this.graphId(nodeId)}`] ? 'shown' : 'hidden'
    const m = gr.p.gradMode ?? (gr.p.showGrad ? 'shown' : 'hidden')
    return String(m)
  }

  private graphId(nodeId: string): string {
    for (const [id, gr] of this.graphs) if (gr.g.nodes.has(nodeId)) return id
    return 'g'
  }

  private async nodeInteract(n: Ent): Promise<void> {
    const gr = this.graphOf(n.id)
    if (!gr) return
    const op = gr.g.nodes.get(n.id)!.op
    const mode = this.gradMode(n.id)
    const grad = gr.g.grad(n.id)
    if (mode === 'quiz' && !this.S.revealed?.[n.id] && op !== 'out') {
      const opts = [...new Set([grad, -grad, grad + 1, grad * 2, grad - 1, 0].map((q) => fmtNum(q)))].slice(0, 4)
      // shuffle deterministically by node id
      const h = [...n.id].reduce((a, c) => a + c.charCodeAt(0), 0)
      for (let i = opts.length - 1; i > 0; i--) {
        const j = (h + i * 7) % (i + 1)
        ;[opts[i], opts[j]] = [opts[j], opts[i]]
      }
      let right = false
      await this.ow.runInline(async (s) => {
        const c = await s.choice(`Node ${String(n.p.label ?? n.id).toUpperCase()}: what is dOUT/d${String(n.p.label ?? n.id)}?`, [...opts, 'LATER'])
        if (c < opts.length && opts[c] === fmtNum(grad)) {
          right = true
          ;(this.S.revealed ??= {})[n.id] = true
          audio.sfx('stat_up')
          await s.say(`Correct! The gradient is ${fmtNum(grad)}.`)
        } else if (c < opts.length) {
          audio.sfx('bump')
          await s.say('Not quite. Work back from the output, one node at a time.')
        }
      })
      this.refresh()
      if (!right || op !== 'input' || n.p.locked) return
    }
    if (op !== 'input' || n.p.locked) {
      const v = gr.g.value(n.id)
      const showG = mode === 'shown' || (mode === 'quiz' && this.S.revealed?.[n.id])
      await this.ow.runInline(async (s) => s.say(`${String(n.p.label ?? n.id).toUpperCase()} (${op}) = ${fmtNum(v)}${showG && op !== 'out' ? `\nGradient of OUT: ${fmtNum(grad)}` : ''}${op === 'out' && gr.p.target !== undefined ? `\nTarget: ${fmtNum(Number(gr.p.target))}` : ''}`))
      return
    }
    await this.nudgeWidget(n, gr)
  }

  /** Stand-on-an-input UI: ↑/↓ (or ←/→) nudge by `step`, values and gradients update live. */
  private nudgeWidget(n: Ent, gr: { g: CompGraph; p: Props }): Promise<void> {
    const ui = this.ow.ui
    const step = num(n.p.step, 1)
    const min = n.p.min !== undefined ? num(n.p.min) : -99
    const max = n.p.max !== undefined ? num(n.p.max) : 99
    audio.sfx('select')
    return new Promise((res) => {
      const win = new Window(ui, 2, 114, W - 4, 44, 'ui/frame_dialog').setDepth(1000)
      const t1 = new PxText(ui, 12, 120, '').setDepth(1001).setScrollFactor(0)
      const t2 = new PxText(ui, 12, 138, '', { font: FONT.mini, shadow: 'none' }).setDepth(1001).setScrollFactor(0)
      const out = gr.g.outputs()[0]
      const render = () => {
        const v = gr.g.value(n.id)
        const label = String(n.p.label ?? n.id).toUpperCase()
        const mode = this.gradMode(n.id)
        const showG = mode === 'shown' || (mode === 'quiz' && this.S.revealed?.[n.id])
        t1.setText(`${label} = ${fmtNum(v)}     OUT = ${out ? fmtNum(gr.g.value(out)) : '?'}${gr.p.target !== undefined ? ` (GOAL ${fmtNum(Number(gr.p.target))})` : ''}`)
        t2.setText(`UP/DOWN: NUDGE BY ${fmtNum(step)}   ${showG ? `GRAD ${fmtNum(gr.g.grad(n.id))}   ` : ''}A/B: DONE`)
      }
      render()
      const widget = {
        done: false,
        tick: () => {},
        input: () => {
          let dv = 0
          if (controls.repeat('up', 14, 6) || controls.repeat('right', 14, 6)) dv = step
          else if (controls.repeat('down', 14, 6) || controls.repeat('left', 14, 6)) dv = -step
          if (dv) {
            const nv = Math.max(min, Math.min(max, gr.g.value(n.id) + dv))
            if (nv !== gr.g.value(n.id)) {
              this.setInput(n.id, nv)
              audio.sfx(dv > 0 ? 'stat_up' : 'stat_down')
            } else audio.sfx('bump')
            render()
          } else if (controls.justPressed('A') || controls.justPressed('B')) {
            controls.consume('A', 'B')
            audio.sfx('cancel')
            widget.done = true
            win.destroy()
            t1.destroy()
            t2.destroy()
            res()
          }
        },
      }
      ui.stack.push(widget)
    })
  }

  setInput(nodeId: string, v: number): void {
    const gr = this.graphOf(nodeId)
    if (!gr) return
    gr.g.setValue(nodeId, v)
    ;(this.S.gin ??= {})[nodeId] = gr.g.value(nodeId)
    this.refresh()
  }

  // ================================================================ counters / timers

  counterAdd(id: string, n: number): number {
    const c = (this.S.counters ??= {})
    c[id] = (c[id] ?? 0) + n
    this.refresh()
    return c[id]
  }

  counterSet(id: string, v: number): void {
    ;(this.S.counters ??= {})[id] = v
    this.refresh()
  }

  counterGet(id: string): number {
    return this.S.counters?.[id] ?? 0
  }

  /** Show a counter in the HUD that no map object declares. */
  showCounter(id: string, label: string, max?: number, style?: 'budget' | 'goal' | 'plain'): void {
    this.dynCounters.set(id, { label, max, style })
    this.S.counters ??= {}
    this.S.counters[id] ??= 0
  }

  hideCounter(id: string): void {
    this.dynCounters.delete(id)
  }

  startTimer(id: string, o: { label?: string; ranks?: string | number[] } = {}): void {
    const ranks = Array.isArray(o.ranks) ? o.ranks : String(o.ranks ?? '').split(',').map(Number).filter((q) => q > 0)
    this.timers.set(id, { id, label: o.label ?? 'TIME', ms: 0, running: true, ranks })
  }

  /** Stop a timer; returns its time and rank (S/A/B/C by the `ranks` second thresholds). Never fails. */
  stopTimer(id: string): { ms: number; rank: string } | null {
    const t = this.timers.get(id)
    if (!t) return null
    t.running = false
    const s = t.ms / 1000
    let r = t.ranks.findIndex((lim) => s <= lim)
    if (r < 0) r = Math.min(3, t.ranks.length)
    const rank = t.ranks.length ? RANKS[r] : 'S'
    ;(this.S.timers ??= {})[id] = Math.round(t.ms)
    ;(this.S.vars ??= {})[`${id}.rank`] = rank
    this.timers.delete(id)
    const sec = Math.floor(t.ms / 1000)
    this.ow.ui.toast(`${t.label} ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}  RANK ${rank}`)
    audio.sfx(rank === 'S' ? 'level_up' : 'stat_up')
    this.emit({ type: 'timer', id, ms: t.ms, rank })
    return { ms: t.ms, rank }
  }

  private updateHud(): void {
    const hud = this.ow.ui.hud
    const px = this.ow.player.tx
    const py = this.ow.player.ty
    const counters = []
    for (const e of this.ents) {
      if (e.type !== 'counter' || e.p.hud === false) continue
      if (e.p.area !== undefined || e.w > 1 || e.h > 1) if (!this.inArea(e, px, py)) continue
      counters.push({ id: e.id, label: String(e.p.label ?? e.id).toUpperCase(), value: this.counterGet(e.id), max: e.p.max !== undefined ? num(e.p.max) : undefined, style: (e.p.style as 'budget') ?? 'budget' })
    }
    for (const [id, c] of this.dynCounters) counters.push({ id, label: c.label.toUpperCase(), value: this.counterGet(id), max: c.max, style: c.style ?? 'budget' })
    hud.counters = counters
    hud.timers = [...this.timers.values()].map((t) => ({ id: t.id, label: t.label, ms: t.ms }))
    hud.carry = this.S.carry ?? ''
  }

  // ================================================================ signals

  /** Resolve a condition name: switches, doors, statues, graphs (`g`, `g.out`, `g.<node>`), counters, vars, `flag:x`, `eval`, `carry:x`. */
  resolve(name: string): number | boolean | string | undefined {
    if (name.startsWith('flag:')) return state.flag(name.slice(5))
    if (name === 'eval') return state.evalLight
    if (name.startsWith('carry:')) return (this.S.carry ?? '') === name.slice(6)
    if (name.startsWith('var:')) return this.S.vars?.[name.slice(4)]
    if (this.S.vars && name in this.S.vars) return this.S.vars[name]
    const dot = name.indexOf('.')
    if (dot > 0) {
      const gid = name.slice(0, dot)
      const rest = name.slice(dot + 1)
      const gr = this.graphs.get(gid)
      if (gr) {
        if (rest === 'out') {
          const o = gr.g.outputs()[0]
          return o ? gr.g.value(o) : 0
        }
        if (rest === 'solved') return !!this.S.solved?.[gid]
        return gr.g.value(rest)
      }
      const words = this.S.words ?? {}
      if (rest === 'word') return words[gid] ?? ''
      if (rest === 'len') return (words[gid] ?? '').length
    }
    if (this.graphs.has(name)) return !!this.S.solved?.[name]
    const e = this.byId.get(name)
    if (e) {
      if (e.type === 'switch') return !!e.pressed
      if (e.type === 'door') return !!e.open
      if (e.type === 'statue') return this.statueOk(e)
      if (e.type === 'counter') return this.counterGet(e.id)
      if (e.type === 'block' || e.type === 'boulder') return !e.gone
      if (e.type === 'key') return !!e.gone
    }
    if (this.S.counters && name in this.S.counters) return this.S.counters[name]
    return undefined
  }

  /** Recompute switches, doors, graphs, timers; redraw what changed; fire events. */
  refresh(initial = false): void {
    if (this.destroyed) return
    const S = this.S
    const p = this.ow.player
    // switches: momentary = player or block on it; weight = block only; toggle = saved
    for (const e of this.ents) {
      if (e.type !== 'switch') continue
      const mode = String(e.p.mode ?? 'momentary')
      const was = !!e.pressed
      if (mode === 'toggle') e.pressed = !!S.sw?.[e.id]
      else {
        const block = !!this.blockAt(e.x, e.y)
        const on = block || (mode === 'momentary' && p.tx === e.x && p.ty === e.y) || (mode === 'momentary' && !!this.ow.npcOn(e.x, e.y))
        e.pressed = on
      }
      if (!initial && was !== e.pressed && mode !== 'toggle') {
        audio.sfx(e.pressed ? 'select' : 'cancel')
        this.emit({ type: 'switch', id: e.id, on: e.pressed })
      }
    }
    // graphs solved?
    for (const [gid, gr] of this.graphs) {
      const target = gr.p.target ?? this.ents.find((e) => e.type === 'gnode' && gr.g.nodes.has(e.id) && e.p.op === 'out')?.p.target
      if (target === undefined) continue
      const o = gr.g.outputs()[0]
      const hit = !!o && Math.abs(gr.g.value(o) - Number(target)) < 1e-9
      if (hit && !S.solved?.[gid]) {
        ;(S.solved ??= {})[gid] = true
        if (!initial) {
          audio.sfx('key_item_get')
          if (gr.p.solveFlag) state.setFlag(String(gr.p.solveFlag))
          this.emit({ type: 'graph_solved', id: gid, value: gr.g.value(o!) })
          if (gr.p.onSolve) void this.ow.run(String(gr.p.onSolve), undefined, { graph: gid })
        }
      } else if (!hit && S.solved?.[gid] && gr.p.latch === false) S.solved[gid] = false
    }
    // doors
    for (const e of this.ents) {
      if (e.type !== 'door') continue
      const latchFlag = e.p.latch ? String(e.p.latch) : ''
      const latched = (latchFlag && state.flag(latchFlag)) || S.latched?.[e.id]
      const cond = evalCond(String(e.p.when ?? 'false'), (n) => this.resolve(n))
      const open = !!latched || cond
      if (open && !latched && (e.p.latch !== undefined)) {
        if (latchFlag && latchFlag !== 'true') state.setFlag(latchFlag)
        else (S.latched ??= {})[e.id] = true
      }
      // never close a door on the player
      if (!open && e.open && p.tx >= e.x && p.tx < e.x + e.w && p.ty >= e.y && p.ty < e.y + e.h) continue
      if (e.open !== open) {
        const first = e.open === undefined
        e.open = open
        if (first || initial) {
          e.openK = open ? 1 : 0
          this.drawDoor(e)
        } else {
          audio.sfx(open ? 'door' : 'bump')
          this.emit({ type: 'door', id: e.id, open })
          if (open && e.p.onOpen) void this.ow.run(String(e.p.onOpen), undefined, { door: e.id })
        }
      }
    }
    // timers with stopWhen
    for (const e of this.ents) {
      if (e.type === 'timer' && this.timers.get(e.id)?.running && e.p.stopWhen && evalCond(String(e.p.stopWhen), (n) => this.resolve(n))) this.stopTimer(e.id)
    }
    // floor (switch states) + graph-node labels
    this.drawFloor()
    this.renderNodes()
    this.drawAnim()
    this.updateCarry()
  }

  private updateCarry(): void {
    const c = this.S.carry
    if (!c) {
      this.carryImg?.setVisible(false)
      return
    }
    this.carryImg ??= this.scene.add.image(0, 0, keyTexture(this.scene)).setOrigin(0.5, 1)
    this.carryImg.setVisible(true)
  }

  /** Follow the player with the carried key icon (called from the overworld each frame). */
  follow(px: number, py: number, depth: number): void {
    if (this.carryImg?.visible) this.carryImg.setPosition(px + 8, py - 9 + (Math.floor(this.frame / 20) % 2)).setDepth(depth + 1)
  }

  private renderNodes(): void {
    for (const e of this.ents) {
      if (e.type !== 'gnode') continue
      const ts = this.nodeTexts.get(e.id)
      const gr = this.graphOf(e.id)
      if (!ts || !gr) continue
      const op = gr.g.nodes.get(e.id)!.op
      const sym = op === 'input' ? 'IN' : op === 'out' ? 'OUT' : op === 'add' ? '+' : op === 'mul' ? '×' : op === 'neg' ? '-X' : op === 'pow2' ? 'X2' : op.toUpperCase().slice(0, 4)
      const v = gr.g.value(e.id)
      const mode = this.gradMode(e.id)
      const showG = op !== 'out' && (mode === 'shown' || (mode === 'quiz' && this.S.revealed?.[e.id]))
      const px = e.x * TILE
      const py = e.y * TILE
      // symbol inside the plate, value on a chip above, gradient below
      ts[0].setText(sym).setColor(0xfcfaf0)
      ts[0].setPosition(px + 8 - Math.ceil(ts[0].width / 2), py + 6)
      const vs = fmtNum(v)
      ts[1].setText(vs).setColor(v > 0 ? 0xfce070 : v < 0 ? 0x90bcf0 : 0xfcfaf0)
      ts[1].setPosition(px + 8 - Math.ceil(ts[1].width / 2), py - 7)
      const solved = op === 'out' && this.S.solved?.[this.graphId(e.id)]
      if (op === 'out' && gr.p.target !== undefined) ts[1].setColor(solved ? 0x60e070 : 0xf8d838)
      ts[2].setText(showG ? `G${fmtNum(gr.g.grad(e.id))}` : mode === 'quiz' && op !== 'out' ? 'G?' : '').setColor(0xf85848)
      ts[2].setPosition(px + 8 - Math.ceil(ts[2].width / 2), py + 17)
      // chip behind the value
      const w = measure(this.scene, FONT.mini, vs) + 4
      const g = this.floorG
      g.fillStyle(0x20222e, 0.85)
      g.fillRect(px + 8 - Math.ceil(w / 2) - 1, py - 9, w + 1, 9)
      if (ts[2].text) {
        const w2 = measure(this.scene, FONT.mini, ts[2].text) + 4
        g.fillRect(px + 8 - Math.ceil(w2 / 2) - 1, py + 15, w2 + 1, 9)
      }
    }
  }

  // ================================================================ misc API

  setVar(name: string, v: number | boolean | string): void {
    ;(this.S.vars ??= {})[name] = v
    this.refresh()
  }

  setCarry(k: string): void {
    this.S.carry = k
    this.refresh()
  }

  graph(id = 'g'): CompGraph | undefined {
    return this.graphs.get(id)?.g
  }

  setShowGrad(graphId: string, on: boolean): void {
    ;(this.S.vars ??= {})[`showGrad:${graphId}`] = on
    this.refresh()
  }

  /** Reset this map's puzzle state (blocks, switches, keys, graphs, counters…). Bridges built by Merge stay unless `all`. */
  async resetPuzzle(withFx = false, all = false): Promise<void> {
    const keep = all ? undefined : Object.fromEntries(Object.entries(this.S.over ?? {}).filter(([, v]) => v === 'bridge'))
    delete state.mapState[this.mapId]
    if (keep && Object.keys(keep).length) this.S.over = keep
    if (withFx) {
      audio.sfx('pc_off')
      await this.ow.flash(0xffffff, 200)
    }
    this.emit({ type: 'reset' })
    this.ow.rebuildPuzzle()
  }

  emit(e: Omit<PuzzleEvent, 'map'>): void {
    const ev = { map: this.mapId, ...e } as PuzzleEvent
    for (const l of [...listeners]) {
      try {
        l(ev)
      } catch (err) {
        console.error('[puzzle] listener failed', err)
      }
    }
  }

  destroy(): void {
    this.destroyed = true
    this.floorG.destroy()
    this.animG.destroy()
    this.beamG.destroy()
    this.carryImg?.destroy()
    for (const e of this.ents) {
      e.img?.destroy()
      e.g?.destroy()
      for (const t of e.texts ?? []) t.destroy()
    }
    for (const ts of this.nodeTexts.values()) for (const t of ts) t.destroy()
    this.ents = []
    this.byId.clear()
    const hud = this.ow.ui?.hud
    if (hud) {
      hud.counters = []
      hud.timers = []
      hud.carry = ''
    }
  }
}

