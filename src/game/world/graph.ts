// Tiny computation graph with forward evaluation and reverse-mode autodiff, used by the
// "graph floor" puzzle (Gym 1 Gradient Gym, Gym 5 Backprop Dojo). Pure: no Phaser.
//
// Nodes: input (player-nudgeable value), const, add, mul, neg, tanh, relu, pow2, out.
// `out` sums its inputs (identity for one wire). Wires are directed edges from → to.
// Gradients are d(out)/d(node), accumulated over every path (a value that feeds two paths
// gets the sum of both, which is the point of Gym 1 room 3).

export type GOp = 'input' | 'const' | 'add' | 'mul' | 'neg' | 'tanh' | 'relu' | 'pow2' | 'out'

export const GRAPH_OPS: GOp[] = ['input', 'const', 'add', 'mul', 'neg', 'tanh', 'relu', 'pow2', 'out']

export interface GNodeDef {
  id: string
  op: GOp
  /** Value of an input / const node. */
  value?: number
}

export interface GWire {
  from: string
  to: string
}

/** Round away float noise (0.1 + 0.2) so equality with targets and display are stable. */
export function clean(v: number): number {
  if (!Number.isFinite(v)) return v
  const r = Math.round(v * 1e9) / 1e9
  return Object.is(r, -0) ? 0 : r
}

/** "5", "-1.5", "0.25", "1e3" → short mini-font friendly text (≤ 5 chars where possible). */
export function fmtNum(v: number): string {
  if (!Number.isFinite(v)) return v > 0 ? 'INF' : v < 0 ? '-INF' : 'NAN'
  v = clean(v)
  if (Number.isInteger(v)) return Math.abs(v) >= 100000 ? v.toExponential(0).replace('+', '') : String(v)
  const a = Math.abs(v)
  const s = a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : v.toFixed(2)
  return s.replace(/\.?0+$/, '')
}

export class CompGraph {
  readonly nodes = new Map<string, GNodeDef>()
  /** Input ids of each node, in wire order. */
  readonly inputs = new Map<string, string[]>()
  readonly values = new Map<string, number>()
  readonly grads = new Map<string, number>()
  /** Topological order (inputs first). Nodes on a cycle are left out. */
  order: string[] = []

  constructor(defs: GNodeDef[], wires: GWire[]) {
    for (const d of defs) {
      this.nodes.set(d.id, { ...d })
      this.inputs.set(d.id, [])
    }
    for (const w of wires) {
      if (!this.nodes.has(w.from) || !this.nodes.has(w.to)) continue
      this.inputs.get(w.to)!.push(w.from)
    }
    this.order = this.topo()
    this.forward()
  }

  private topo(): string[] {
    const out: string[] = []
    const mark = new Map<string, 0 | 1 | 2>()
    const visit = (id: string): boolean => {
      const m = mark.get(id) ?? 0
      if (m === 2) return true
      if (m === 1) return false // cycle
      mark.set(id, 1)
      for (const i of this.inputs.get(id) ?? []) if (!visit(i)) return false
      mark.set(id, 2)
      out.push(id)
      return true
    }
    for (const id of this.nodes.keys()) visit(id)
    return out
  }

  /** The `out` nodes (normally exactly one). */
  outputs(): string[] {
    return [...this.nodes.values()].filter((n) => n.op === 'out').map((n) => n.id)
  }

  setValue(id: string, v: number): void {
    const n = this.nodes.get(id)
    if (!n) return
    n.value = clean(v)
    this.forward()
  }

  value(id: string): number {
    return this.values.get(id) ?? NaN
  }

  grad(id: string): number {
    return this.grads.get(id) ?? 0
  }

  forward(): void {
    this.values.clear()
    for (const id of this.order) {
      const n = this.nodes.get(id)!
      const xs = (this.inputs.get(id) ?? []).map((i) => this.values.get(i) ?? 0)
      let v: number
      switch (n.op) {
        case 'input':
        case 'const': v = n.value ?? 0; break
        case 'add':
        case 'out': v = xs.reduce((a, b) => a + b, 0); break
        case 'mul': v = xs.length ? xs.reduce((a, b) => a * b, 1) : 0; break
        case 'neg': v = -(xs[0] ?? 0); break
        case 'tanh': v = Math.tanh(xs[0] ?? 0); break
        case 'relu': v = Math.max(0, xs[0] ?? 0); break
        case 'pow2': v = (xs[0] ?? 0) ** 2; break
        default: v = 0
      }
      this.values.set(id, clean(v))
    }
    this.backward()
  }

  /** Reverse-mode pass: grads[n] = d(output)/d(n) for the first `out` node (or `outId`). */
  backward(outId = this.outputs()[0]): void {
    this.grads.clear()
    for (const id of this.order) this.grads.set(id, 0)
    if (!outId || !this.nodes.has(outId)) return
    this.grads.set(outId, 1)
    for (let k = this.order.length - 1; k >= 0; k--) {
      const id = this.order[k]
      const n = this.nodes.get(id)!
      const g = this.grads.get(id) ?? 0
      const ins = this.inputs.get(id) ?? []
      const xs = ins.map((i) => this.values.get(i) ?? 0)
      const add = (i: number, d: number) => this.grads.set(ins[i], (this.grads.get(ins[i]) ?? 0) + g * d)
      switch (n.op) {
        case 'add':
        case 'out': ins.forEach((_, i) => add(i, 1)); break
        case 'mul': ins.forEach((_, i) => add(i, xs.reduce((p, x, j) => (j === i ? p : p * x), 1))); break
        case 'neg': if (ins.length) add(0, -1); break
        case 'tanh': if (ins.length) add(0, 1 - Math.tanh(xs[0]) ** 2); break
        case 'relu': if (ins.length) add(0, xs[0] > 0 ? 1 : 0); break
        case 'pow2': if (ins.length) add(0, 2 * xs[0]); break
        default: break
      }
    }
    for (const [id, v] of this.grads) this.grads.set(id, clean(v))
  }
}
