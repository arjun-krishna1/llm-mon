// Condition expressions for puzzle objects (door `when`, beam `when`, timer `stopWhen` ...).
// Pure: no Phaser. Grammar:
//
//   expr  := or
//   or    := and (('|' | '||' | 'or') and)*
//   and   := not (('&' | '&&' | 'and') not)*
//   not   := ('!' | 'not') not | atom
//   atom  := '(' expr ')' | value (cmpop value)?
//   value := number | name          (names: letters digits _ . : -  e.g. sw1, flag:met_x, surprise, g1.out)
//   cmpop := < <= > >= == = !=
//
// A bare name is true when its resolved value is truthy. Examples:
//   "sw1 & sw2"   "!lever"   "flag:badge_gradient | sw3"   "surprise <= 20"   "g1.out == 0"

export type Resolver = (name: string) => number | boolean | string | undefined

type Tok = { t: 'num'; v: number } | { t: 'name'; v: string } | { t: 'op'; v: string }

function lex(src: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) { i++; continue }
    const two = src.slice(i, i + 2)
    if (['<=', '>=', '==', '!=', '&&', '||'].includes(two)) { out.push({ t: 'op', v: two }); i += 2; continue }
    if ('()!&|<>='.includes(c)) { out.push({ t: 'op', v: c }); i++; continue }
    const num = /^-?\d+(\.\d+)?/.exec(src.slice(i))
    if (num && (c !== '-' || !out.length || out[out.length - 1].t === 'op')) {
      out.push({ t: 'num', v: Number(num[0]) })
      i += num[0].length
      continue
    }
    const name = /^[A-Za-z_][\w.:-]*/.exec(src.slice(i))
    if (name) {
      const w = name[0]
      const lw = w.toLowerCase()
      if (lw === 'and') out.push({ t: 'op', v: '&' })
      else if (lw === 'or') out.push({ t: 'op', v: '|' })
      else if (lw === 'not') out.push({ t: 'op', v: '!' })
      else out.push({ t: 'name', v: w })
      i += w.length
      continue
    }
    throw new Error(`bad character '${c}' in condition "${src}"`)
  }
  return out
}

function num(v: number | boolean | string | undefined): number {
  if (typeof v === 'number') return v
  if (typeof v === 'boolean') return v ? 1 : 0
  if (typeof v === 'string') return Number.isFinite(Number(v)) ? Number(v) : v ? 1 : 0
  return 0
}

const cache = new Map<string, Tok[]>()

/** Evaluate a condition. Empty/undefined → true. Syntax errors log once and evaluate false. */
export function evalCond(src: string | undefined | null, resolve: Resolver): boolean {
  if (src === undefined || src === null || String(src).trim() === '') return true
  const s = String(src)
  let toks = cache.get(s)
  if (!toks) {
    try {
      toks = lex(s)
    } catch (e) {
      console.warn(`[cond] ${(e as Error).message}`)
      toks = [{ t: 'num', v: 0 }]
    }
    cache.set(s, toks)
  }
  let p = 0
  const peek = () => toks![p]
  const isOp = (v: string) => peek()?.t === 'op' && peek()!.v === v
  const value = (): number => {
    const t = toks![p++]
    if (!t) return 0
    if (t.t === 'num') return t.v
    if (t.t === 'name') {
      if (t.v === 'true') return 1
      if (t.v === 'false') return 0
      return num(resolve(t.v))
    }
    if (t.v === '(') {
      const v = or()
      if (isOp(')')) p++
      return v
    }
    return 0
  }
  const atom = (): number => {
    const a = value()
    const t = peek()
    if (t?.t === 'op' && ['<', '<=', '>', '>=', '==', '=', '!='].includes(t.v)) {
      p++
      const b = value()
      switch (t.v) {
        case '<': return a < b ? 1 : 0
        case '<=': return a <= b ? 1 : 0
        case '>': return a > b ? 1 : 0
        case '>=': return a >= b ? 1 : 0
        case '!=': return Math.abs(a - b) > 1e-9 ? 1 : 0
        default: return Math.abs(a - b) <= 1e-9 ? 1 : 0
      }
    }
    return a
  }
  const not = (): number => {
    if (isOp('!')) {
      p++
      return not() ? 0 : 1
    }
    return atom()
  }
  const and = (): number => {
    let v = not()
    while (isOp('&') || isOp('&&')) {
      p++
      const r = not()
      v = v && r ? 1 : 0
    }
    return v
  }
  function or(): number {
    let v = and()
    while (isOp('|') || isOp('||')) {
      p++
      const r = and()
      v = v || r ? 1 : 0
    }
    return v
  }
  return !!or()
}

/** Names a condition reads (for dependency hints / docs tooling). */
export function condNames(src: string): string[] {
  try {
    return lex(src).filter((t) => t.t === 'name').map((t) => String(t.v))
  } catch {
    return []
  }
}
