import { describe, expect, it } from 'vitest'
import { CompGraph, fmtNum } from '../graph'
import { evalCond } from '../cond'

describe('CompGraph (graph floor autodiff)', () => {
  it('one node: out = a + b', () => {
    const g = new CompGraph(
      [{ id: 'a', op: 'input', value: 2 }, { id: 'b', op: 'input', value: -5 }, { id: 's', op: 'add' }, { id: 'o', op: 'out' }],
      [{ from: 'a', to: 's' }, { from: 'b', to: 's' }, { from: 's', to: 'o' }],
    )
    expect(g.value('o')).toBe(-3)
    expect(g.grad('a')).toBe(1)
    expect(g.grad('b')).toBe(1)
  })
  it('chain: out = (a * b) + c', () => {
    const g = new CompGraph(
      [{ id: 'a', op: 'input', value: 3 }, { id: 'b', op: 'input', value: -2 }, { id: 'c', op: 'input', value: 10 },
        { id: 'm', op: 'mul' }, { id: 's', op: 'add' }, { id: 'o', op: 'out' }],
      [{ from: 'a', to: 'm' }, { from: 'b', to: 'm' }, { from: 'm', to: 's' }, { from: 'c', to: 's' }, { from: 's', to: 'o' }],
    )
    expect(g.value('o')).toBe(4)
    expect(g.grad('a')).toBe(-2)
    expect(g.grad('b')).toBe(3)
    expect(g.grad('c')).toBe(1)
    g.setValue('c', 6)
    expect(g.value('o')).toBe(0)
  })
  it('branch: a feeds two paths, gradients add', () => {
    // out = a*b + a  → d/da = b + 1
    const g = new CompGraph(
      [{ id: 'a', op: 'input', value: 2 }, { id: 'b', op: 'input', value: 4 }, { id: 'm', op: 'mul' }, { id: 's', op: 'add' }, { id: 'o', op: 'out' }],
      [{ from: 'a', to: 'm' }, { from: 'b', to: 'm' }, { from: 'm', to: 's' }, { from: 'a', to: 's' }, { from: 's', to: 'o' }],
    )
    expect(g.value('o')).toBe(10)
    expect(g.grad('a')).toBe(5)
    expect(g.grad('b')).toBe(2)
  })
  it('nonlinear ops and formatting', () => {
    const g = new CompGraph([{ id: 'x', op: 'input', value: 3 }, { id: 'p', op: 'pow2' }, { id: 'o', op: 'out' }],
      [{ from: 'x', to: 'p' }, { from: 'p', to: 'o' }])
    expect(g.grad('x')).toBe(6)
    expect(fmtNum(0.1 + 0.2)).toBe('0.3')
    expect(fmtNum(-1.5)).toBe('-1.5')
    expect(fmtNum(12)).toBe('12')
  })
})

describe('evalCond', () => {
  const vars: Record<string, number | boolean> = { sw1: true, sw2: false, surprise: 12, 'g1.out': 0, 'flag:x': true }
  const r = (n: string) => vars[n]
  it('boolean ops', () => {
    expect(evalCond('sw1 & sw2', r)).toBe(false)
    expect(evalCond('sw1 | sw2', r)).toBe(true)
    expect(evalCond('!sw2 and sw1', r)).toBe(true)
    expect(evalCond('(sw2 | sw1) & flag:x', r)).toBe(true)
    expect(evalCond('', r)).toBe(true)
    expect(evalCond('missing', r)).toBe(false)
  })
  it('comparisons', () => {
    expect(evalCond('surprise <= 20', r)).toBe(true)
    expect(evalCond('surprise > 20', r)).toBe(false)
    expect(evalCond('g1.out == 0', r)).toBe(true)
    expect(evalCond('surprise != 12', r)).toBe(false)
    expect(evalCond('surprise >= -3', r)).toBe(true)
  })
})
