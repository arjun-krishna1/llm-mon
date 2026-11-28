import { readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { rosterMarkdown } from '../rosterDoc.ts'

const PATH = new URL('../../../../docs/ROSTER.md', import.meta.url)

describe('roster doc', () => {
  it('docs/ROSTER.md matches roster.ts', () => {
    const md = rosterMarkdown()
    if (process.env.UPDATE_ROSTER) writeFileSync(PATH, md)
    expect(readFileSync(PATH, 'utf8')).toBe(md)
  })
})
