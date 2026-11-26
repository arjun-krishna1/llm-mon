// Map knowledge for the autopilot: loads public/assets/game/maps/*.tmj, merges
// tile properties across layers exactly like src/game/world/TiledMap.ts, and
// exposes the object layer. Pure Node, no browser.
'use strict'
const fs = require('fs')
const path = require('path')

const MAP_DIR = path.resolve(__dirname, '../../../public/assets/game/maps')
const TILE = 16
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }

function propsOf(arr) {
  if (!arr) return {}
  if (!Array.isArray(arr)) return { ...arr }
  return Object.fromEntries(arr.map((p) => [p.name, p.value]))
}

class GameMap {
  constructor(id, dir = MAP_DIR) {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, `${id}.tmj`), 'utf8'))
    this.id = id
    this.width = raw.width
    this.height = raw.height
    this.props = propsOf(raw.properties)
    const tileProps = new Map()
    for (const ts of raw.tilesets || []) {
      for (const t of ts.tiles || []) {
        const p = propsOf(t.properties)
        if (Object.keys(p).length) tileProps.set(ts.firstgid + t.id, p)
      }
    }
    this.grids = []
    this.layerNames = []
    this.objects = []
    for (const l of raw.layers) {
      if (l.type === 'tilelayer') {
        this.grids.push(l.data.map((g) => g & 0x1fffffff))
        this.layerNames.push(l.name)
      } else if (l.type === 'objectgroup') {
        for (const o of l.objects || []) {
          const w = o.width || 0
          const h = o.height || 0
          let tx = Math.floor(o.x / TILE)
          let ty = Math.floor(o.y / TILE)
          if (o.gid) ty = Math.floor((o.y - 1) / TILE)
          this.objects.push({
            id: o.id, name: o.name || '', type: (o.type || o.class || '').toLowerCase(),
            tx, ty, tw: Math.max(1, Math.round(w / TILE)), th: Math.max(1, Math.round(h / TILE)),
            props: propsOf(o.properties),
          })
        }
      }
    }
    // merged tile info per cell
    this.cells = []
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const out = {}
        const i = y * this.width + x
        for (const g of this.grids) {
          const p = tileProps.get(g[i])
          if (p) Object.assign(out, p)
        }
        this.cells.push(out)
      }
    }
  }

  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.width && y < this.height }
  tileAt(x, y) { return this.inBounds(x, y) ? this.cells[y * this.width + x] : { solid: true } }
  isSolid(x, y) { const t = this.tileAt(x, y); return !!(t.solid || t.water || t.counter) }
  objectsOfType(type) { return this.objects.filter((o) => o.type === type) }
  objectAt(type, x, y) {
    return this.objects.find((o) => o.type === type && x >= o.tx && y >= o.ty && x < o.tx + o.tw && y < o.ty + o.th)
  }
  spawn(name) { return this.objects.find((o) => o.type === 'spawn' && o.name === name) }
  npcObj(id) { return this.objects.find((o) => o.type === 'npc' && (o.props.id === id || o.name === id)) }
  /** Zone rect containing (x,y): smallest wins (engine rule). */
  zoneAt(x, y) {
    const zs = this.objects.filter((o) => o.type === 'zone' && x >= o.tx && y >= o.ty && x < o.tx + o.tw && y < o.ty + o.th)
    zs.sort((a, b) => a.tw * a.th - b.tw * b.th)
    return zs[0]
  }
}

const cache = new Map()
let mapDir = MAP_DIR
/** Point the autopilot at the maps inside a build snapshot (dist/assets/game/maps). */
function setMapDir(d) { mapDir = d; cache.clear() }
function loadMap(id) {
  if (!cache.has(id)) cache.set(id, new GameMap(id, mapDir))
  return cache.get(id)
}

/**
 * BFS over the grid. Returns an array of { dir, hop } moves or null.
 * opts:
 *   blocked(x,y) extra dynamic blockers (NPCs, item balls, props)
 *   goal(x,y) → bool
 *   avoidWarps (default true) — never path *through* a warp unless it is the goal
 *   avoidTriggers — set of "x,y" to avoid
 *   grassCost — extra cost for tall grass (Dijkstra-lite with 0-1/k buckets)
 */
function findPath(map, from, goal, opts = {}) {
  const key = (x, y) => `${x},${y}`
  const dyn = opts.blocked || (() => false)
  const avoid = opts.avoid || new Set()
  const grassCost = opts.grassCost ?? 0
  const dist = new Map([[key(from.x, from.y), 0]])
  const prev = new Map()
  // simple Dijkstra with an array-backed priority list (maps are tiny)
  const open = [{ x: from.x, y: from.y, d: 0 }]
  while (open.length) {
    let bi = 0
    for (let i = 1; i < open.length; i++) if (open[i].d < open[bi].d) bi = i
    const cur = open.splice(bi, 1)[0]
    if (cur.d > (dist.get(key(cur.x, cur.y)) ?? Infinity)) continue
    if (goal(cur.x, cur.y) && !(cur.x === from.x && cur.y === from.y && opts.mustMove)) {
      const moves = []
      let k = key(cur.x, cur.y)
      while (prev.has(k)) { const p = prev.get(k); moves.unshift(p.move); k = p.from }
      return moves
    }
    for (const [dir, [dx, dy]] of Object.entries(DIRS)) {
      const nx = cur.x + dx
      const ny = cur.y + dy
      const t = map.tileAt(nx, ny)
      let tx = nx
      let ty = ny
      let hop = false
      if (t.ledge) {
        if (t.ledge !== dir) continue
        tx = nx + dx; ty = ny + dy; hop = true
        if (!map.inBounds(tx, ty) || map.isSolid(tx, ty) || dyn(tx, ty)) continue
      } else {
        const warp = map.objectAt('warp', nx, ny)
        if (warp) {
          if (!goal(nx, ny)) continue // never walk through warps by accident
        } else if (!map.inBounds(nx, ny) || map.isSolid(nx, ny) || dyn(nx, ny)) continue
      }
      if (avoid.has(key(tx, ty)) && !goal(tx, ty)) continue
      const step = 1 + (map.tileAt(tx, ty).grass ? grassCost : 0)
      const nd = cur.d + step
      const k2 = key(tx, ty)
      if (nd < (dist.get(k2) ?? Infinity)) {
        dist.set(k2, nd)
        prev.set(k2, { from: key(cur.x, cur.y), move: { dir, hop, to: { x: tx, y: ty } } })
        open.push({ x: tx, y: ty, d: nd })
      }
    }
  }
  return null
}

module.exports = { setMapDir, loadMap, findPath, DIRS, GameMap, MAP_DIR }
