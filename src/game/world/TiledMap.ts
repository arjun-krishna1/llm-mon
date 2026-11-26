// Tiled .tmj loader (§4.4): embedded tilesets, tile layers in order (`over*`
// layers drawn above characters), tile properties, animated tiles, objects.

import Phaser from 'phaser'
import { ASSET_ROOT, makePlaceholder } from '../assets'
import { DEPTH, TILE } from '../config'

export const MAPS_DIR = `${ASSET_ROOT}maps/`

type Props = Record<string, string | number | boolean>

interface RawProp { name: string; type?: string; value: string | number | boolean }
interface RawTile { id: number; properties?: RawProp[]; animation?: Array<{ tileid: number; duration: number }>; type?: string }
interface RawTileset {
  firstgid: number; name: string; image?: string; imagewidth?: number; imageheight?: number
  tilewidth: number; tileheight: number; columns?: number; tilecount?: number; margin?: number; spacing?: number
  tiles?: RawTile[] | Record<string, RawTile>; tileproperties?: Record<string, Props>; source?: string
}
interface RawObject {
  id: number; name?: string; type?: string; class?: string; x: number; y: number; width?: number; height?: number
  point?: boolean; gid?: number; properties?: RawProp[] | Props; visible?: boolean
}
interface RawLayer {
  name: string; type: 'tilelayer' | 'objectgroup' | 'group' | 'imagelayer'; data?: number[] | string; width?: number; height?: number
  objects?: RawObject[]; layers?: RawLayer[]; visible?: boolean; opacity?: number; encoding?: string; properties?: RawProp[]
}
export interface RawMap {
  width: number; height: number; tilewidth: number; tileheight: number
  layers: RawLayer[]; tilesets: RawTileset[]; properties?: RawProp[] | Props
}

export interface MapObject {
  id: number
  name: string
  type: string
  /** Tile coordinates of the top-left tile, and size in tiles (≥1). */
  tx: number
  ty: number
  tw: number
  th: number
  props: Props
}

export interface TileInfo {
  solid?: boolean
  grass?: boolean
  ledge?: 'down' | 'left' | 'right' | 'up'
  counter?: boolean
  water?: boolean
  door?: boolean
  [k: string]: unknown
}

const GID_MASK = 0x1fffffff

function propsOf(p: RawProp[] | Props | undefined): Props {
  if (!p) return {}
  if (Array.isArray(p)) {
    const out: Props = {}
    for (const x of p) out[x.name] = x.value
    return out
  }
  return { ...p }
}

function decodeData(l: RawLayer): number[] {
  if (Array.isArray(l.data)) return l.data
  if (typeof l.data === 'string' && l.encoding === 'base64') {
    const bin = atob(l.data.trim())
    const out: number[] = []
    for (let i = 0; i < bin.length; i += 4) {
      out.push((bin.charCodeAt(i) | (bin.charCodeAt(i + 1) << 8) | (bin.charCodeAt(i + 2) << 16) | (bin.charCodeAt(i + 3) << 24)) >>> 0)
    }
    return out
  }
  if (typeof l.data === 'string') return l.data.split(',').map((s) => Number(s.trim()) || 0)
  return []
}

function flattenLayers(layers: RawLayer[]): RawLayer[] {
  const out: RawLayer[] = []
  for (const l of layers) {
    if (l.type === 'group' && l.layers) out.push(...flattenLayers(l.layers))
    else out.push(l)
  }
  return out
}

export function mapKey(id: string): string {
  return `map:${id}`
}

function tilesetKey(url: string): string {
  return `tileset:${url}`
}

function resolveUrl(base: string, rel: string): string {
  // base like "assets/game/maps/" (relative to page); rel like "../tilesets/exterior.png"
  const parts = (base + rel).split('/')
  const out: string[] = []
  for (const p of parts) {
    if (p === '..') out.pop()
    else if (p !== '.' && p !== '') out.push(p)
  }
  return out.join('/')
}

function runLoader(scene: Phaser.Scene): Promise<void> {
  return new Promise((res) => {
    if (!scene.load.list.size && !scene.load.isLoading()) {
      res()
      return
    }
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => res())
    if (!scene.load.isLoading()) scene.load.start()
  })
}

/** Load the map JSON and every tileset image it references (placeholders for missing ones). */
export async function ensureMapLoaded(scene: Phaser.Scene, id: string): Promise<RawMap | null> {
  const key = mapKey(id)
  if (!scene.cache.json.exists(key)) {
    scene.load.json(key, `${MAPS_DIR}${id}.tmj`)
    await runLoader(scene)
  }
  const raw = scene.cache.json.get(key) as RawMap | undefined
  if (!raw || !Array.isArray(raw.layers)) {
    console.error(`[map] could not load map '${id}'`)
    return null
  }
  let queued = false
  for (const ts of raw.tilesets) {
    if (ts.source) {
      console.warn(`[map] ${id}: external tileset '${ts.source}' is not supported; embed tilesets (§4.4)`)
      continue
    }
    if (!ts.image) continue
    const url = resolveUrl(MAPS_DIR, ts.image)
    const tk = tilesetKey(url)
    if (!scene.textures.exists(tk)) {
      scene.load.image(tk, url)
      queued = true
    }
  }
  if (queued) await runLoader(scene)
  for (const ts of raw.tilesets) {
    if (!ts.image || ts.source) continue
    const tk = tilesetKey(resolveUrl(MAPS_DIR, ts.image))
    if (!scene.textures.exists(tk)) {
      const w = ts.imagewidth ?? (ts.columns ?? 16) * TILE
      const h = ts.imageheight ?? Math.ceil((ts.tilecount ?? 256) / (ts.columns ?? 16)) * TILE
      makePlaceholder(scene.textures, tk, w, h, undefined, TILE, TILE)
      console.warn(`[map] tileset image missing for ${ts.name}; using placeholder`)
    }
  }
  return raw
}

interface AnimDef { frames: number[]; durations: number[]; total: number }

/** A built map: Phaser layers + logical grid info. */
export class GameMap {
  readonly id: string
  readonly raw: RawMap
  readonly width: number
  readonly height: number
  readonly props: Props
  readonly objects: MapObject[] = []
  readonly tilemap: Phaser.Tilemaps.Tilemap
  readonly layers: Phaser.Tilemaps.TilemapLayer[] = []
  /** Raw gids per tile layer (flip bits stripped), row-major. */
  private grids: number[][] = []
  private tileProps = new Map<number, TileInfo>()
  private anims = new Map<number, AnimDef>()
  private animTiles: Array<{ tile: Phaser.Tilemaps.Tile; anim: AnimDef; base: number }> = []

  constructor(scene: Phaser.Scene, id: string, raw: RawMap) {
    this.id = id
    this.raw = raw
    this.width = raw.width
    this.height = raw.height
    this.props = propsOf(raw.properties)

    // tile properties + animations, keyed by gid
    for (const ts of raw.tilesets) {
      const tiles: RawTile[] = Array.isArray(ts.tiles) ? ts.tiles : ts.tiles ? Object.entries(ts.tiles).map(([k, v]) => ({ ...v, id: Number(k) })) : []
      for (const t of tiles) {
        const gid = ts.firstgid + t.id
        const p = propsOf(t.properties) as TileInfo
        if (t.type && !p.kind) p.kind = t.type
        if (Object.keys(p).length) this.tileProps.set(gid, p)
        if (t.animation?.length) {
          const frames = t.animation.map((f) => ts.firstgid + f.tileid)
          const durations = t.animation.map((f) => Math.max(16, f.duration))
          this.anims.set(gid, { frames, durations, total: durations.reduce((a, b) => a + b, 0) })
        }
      }
      if (ts.tileproperties) {
        for (const [k, v] of Object.entries(ts.tileproperties)) this.tileProps.set(ts.firstgid + Number(k), { ...this.tileProps.get(ts.firstgid + Number(k)), ...v } as TileInfo)
      }
    }

    // Phaser tilemap from the parsed JSON (layers are added below).
    const mapData = Phaser.Tilemaps.Parsers.Tiled.ParseJSONTiled(mapKey(id), raw as unknown as object, false)
    this.tilemap = new Phaser.Tilemaps.Tilemap(scene, mapData as Phaser.Tilemaps.MapData)
    const tilesets: Phaser.Tilemaps.Tileset[] = []
    for (const ts of raw.tilesets) {
      if (!ts.image || ts.source) continue
      const tk = tilesetKey(resolveUrl(MAPS_DIR, ts.image))
      const t = this.tilemap.addTilesetImage(ts.name, tk, ts.tilewidth, ts.tileheight, ts.margin ?? 0, ts.spacing ?? 0, ts.firstgid)
      if (t) tilesets.push(t)
    }

    let below = 0
    let over = 0
    for (const l of flattenLayers(raw.layers)) {
      if (l.type === 'tilelayer') {
        this.grids.push(decodeData(l).map((g) => (g >>> 0) & GID_MASK))
        const layer = this.tilemap.createLayer(l.name, tilesets, 0, 0)
        if (!layer) continue
        const isOver = l.name.toLowerCase().startsWith('over')
        layer.setDepth(isOver ? DEPTH.over + over++ : DEPTH.ground + below++)
        if (l.visible === false) layer.setVisible(false)
        if (l.opacity !== undefined && l.opacity < 1) layer.setAlpha(l.opacity)
        this.layers.push(layer)
        layer.forEachTile((t) => {
          const a = this.anims.get(t.index)
          if (a) this.animTiles.push({ tile: t, anim: a, base: t.index })
        })
      } else if (l.type === 'objectgroup') {
        for (const o of l.objects ?? []) this.objects.push(this.parseObject(o))
      }
    }
  }

  private parseObject(o: RawObject): MapObject {
    const w = o.width ?? 0
    const h = o.height ?? 0
    let tx = Math.floor(o.x / TILE)
    let ty = Math.floor(o.y / TILE)
    if (o.gid) ty = Math.floor((o.y - 1) / TILE) // tile objects are bottom-anchored
    if (o.point || (!w && !h)) {
      tx = Math.floor(o.x / TILE)
      ty = Math.floor(o.y / TILE)
    }
    return {
      id: o.id,
      name: o.name ?? '',
      type: (o.type || o.class || '').toLowerCase(),
      tx, ty,
      tw: Math.max(1, Math.round(w / TILE)),
      th: Math.max(1, Math.round(h / TILE)),
      props: propsOf(o.properties),
    }
  }

  get pixelWidth(): number {
    return this.width * TILE
  }
  get pixelHeight(): number {
    return this.height * TILE
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height
  }

  /** Merged properties of every layer's tile at (x, y). */
  tileAt(x: number, y: number): TileInfo {
    const out: TileInfo = {}
    if (!this.inBounds(x, y)) return { solid: true }
    const i = y * this.width + x
    for (const g of this.grids) {
      const gid = g[i]
      if (!gid) continue
      const p = this.tileProps.get(gid)
      if (p) Object.assign(out, p)
    }
    return out
  }

  isSolid(x: number, y: number): boolean {
    const t = this.tileAt(x, y)
    return !!(t.solid || t.water || t.counter)
  }

  /** Animate tiles; `now` in ms. */
  update(now: number): void {
    for (const a of this.animTiles) {
      let t = now % a.anim.total
      let f = 0
      while (t >= a.anim.durations[f]) {
        t -= a.anim.durations[f]
        f++
      }
      const gid = a.anim.frames[f] ?? a.base
      if (a.tile.index !== gid) a.tile.index = gid
    }
  }

  objectsOfType(type: string): MapObject[] {
    return this.objects.filter((o) => o.type === type)
  }

  /** Object whose rect covers the tile. */
  objectAt(type: string, x: number, y: number): MapObject | undefined {
    return this.objects.find((o) => o.type === type && x >= o.tx && x < o.tx + o.tw && y >= o.ty && y < o.ty + o.th)
  }

  destroy(): void {
    this.tilemap.destroy()
  }
}
