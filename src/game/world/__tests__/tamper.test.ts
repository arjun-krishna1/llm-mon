import { afterEach, describe, expect, it } from 'vitest'
import { tamper } from '../../systems/tamper'

describe('interface tamper hooks', () => {
  afterEach(() => tamper.reset())

  it('relabels whole labels and substrings only in listed scenes', () => {
    tamper.set({ scenes: ['Battle'], relabel: { RUN: 'STAY', 'super effective': 'not very effective' } })
    expect(tamper.filterText('RUN', 'Battle')).toBe('STAY')
    expect(tamper.filterText("It's super effective!", 'Battle')).toBe("It's not very effective!")
    expect(tamper.filterText('RUN', 'UI')).toBe('RUN')
  })

  it('scramble keeps length and spaces, changes some letters', () => {
    tamper.set({ scenes: ['*'], scramble: 0.6 })
    const t = 'THE QUICK BROWN FOX'
    const s = tamper.filterText(t, 'UI')
    expect(s.length).toBe(t.length)
    expect(s.split('').filter((c, i) => c === ' ' && t[i] === ' ').length).toBe(3)
    expect(s).not.toBe(t)
  })

  it('fake bar values until the Probe is on', () => {
    tamper.setFake('enemy_hp', 1)
    expect(tamper.shown('enemy_hp', 0.25)).toBe(1)
    expect(tamper.isFaked('enemy_hp')).toBe(true)
    tamper.setProbe(true)
    expect(tamper.shown('enemy_hp', 0.25)).toBe(0.25)
    expect(tamper.shown('other', 0.5)).toBe(0.5)
  })

  it('probe shows original text and reports it as tampered', () => {
    tamper.set({ scenes: ['UI'], relabel: { BAG: 'SURRENDER' } })
    tamper.setProbe(true)
    expect(tamper.filterText('BAG', 'UI')).toBe('BAG')
    expect(tamper.wouldChange('BAG', 'UI')).toBe(true)
  })

  it('disables menu entries by id or label, case-insensitively', () => {
    tamper.disable('run', 'BAG')
    expect(tamper.isDisabled('RUN')).toBe(true)
    expect(tamper.isDisabled('bag')).toBe(true)
    tamper.enable('run')
    expect(tamper.isDisabled('run')).toBe(false)
  })
})
