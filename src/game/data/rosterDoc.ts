// Renders docs/ROSTER.md from roster.ts. Kept in sync by
// data/__tests__/roster.doc.test.ts (run with UPDATE_ROSTER=1 to rewrite the file).

import { ROSTER, type RosterEntry } from './roster.ts'
import { TYPES } from './typechart.ts'

const FAMILY_TITLES: Record<RosterEntry['family'], string> = {
  model: 'Models',
  historic: 'Historic models',
  component: 'Components and techniques',
  legendary: 'Legendaries',
  antagonist: 'Antagonists',
}

function evo(e: RosterEntry): string {
  const from = ROSTER.filter((r) => r.evolvesTo?.some((x) => x.to === e.id)).map((r) => {
    const how = r.evolvesTo!.find((x) => x.to === e.id)!
    return `${r.name}${how.level ? ` Lv${how.level}` : ''}${how.item ? ` (item: ${how.item})` : ''}${how.badge ? ` (badge: ${how.badge})` : ''}`
  })
  const to = (e.evolvesTo ?? []).map((x) => `${ROSTER.find((r) => r.id === x.to)?.name ?? x.to}${x.level ? ` at Lv${x.level}` : ''}${x.item ? ` with ${x.item}` : ''}${x.badge ? ` with the ${x.badge} badge` : ''}`)
  const parts: string[] = []
  if (from.length) parts.push(`from ${from.join(' / ')}`)
  if (to.length) parts.push(`to ${to.join(' / ')}`)
  return parts.join('; ') || '—'
}

export function rosterMarkdown(): string {
  const out: string[] = []
  const first = ROSTER.filter((r) => r.firstBatch)
  const counts = Object.keys(FAMILY_TITLES).map((f) => `${FAMILY_TITLES[f as RosterEntry['family']]}: ${ROSTER.filter((r) => r.family === f).length}`)
  out.push('# LLMMON Roster', '')
  out.push('Generated from `src/game/data/roster.ts` (do not edit by hand; run `UPDATE_ROSTER=1 npx vitest run roster`).', '')
  out.push(`${ROSTER.length} species. ${counts.join(' · ')}.`, '')
  out.push('**Art style for every sprite:** an animal or mythic creature with tech-rune detailing (glowing glyphs, circuit-like markings, small floating motifs), in the style of the existing 16 creatures. Never a robot, never a company logo or anything logo-shaped. Files: `mons/<id>_front.png` (64×64), `mons/<id>_back.png` (64×64), `mons/<id>_icon.png` (32×16, two 16×16 frames).', '')
  out.push('## First batch (stages 2-3: art priority)', '')
  out.push(first.map((r) => `\`${r.id}\``).join(', '), '')
  out.push('## Index', '')
  out.push('| # | id | name | family | type | role | evolution | areas | ability |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  ROSTER.forEach((r, i) => out.push(`| ${i + 1} | \`${r.id}\` | ${r.name} | ${r.family} | ${TYPES[r.type].name} | ${r.role ?? ''} | ${evo(r)} | ${r.areas.join(', ')} | ${r.ability} |`))
  out.push('')
  for (const fam of Object.keys(FAMILY_TITLES) as RosterEntry['family'][]) {
    out.push(`## ${FAMILY_TITLES[fam]}`, '')
    for (const r of ROSTER.filter((x) => x.family === fam)) {
      out.push(`### ${r.name} — \`${r.id}\`${r.firstBatch ? ' ★ first batch' : ''}`, '')
      out.push(`- **Type:** ${TYPES[r.type].name}${r.role ? ` · **role:** ${r.role}` : ''} · **stage:** ${r.stage} · **ability:** ${r.ability}${r.catchable === false ? ' · not catchable' : ''}`)
      out.push(`- **Evolution:** ${evo(r)}`)
      out.push(`- **Found:** ${r.areas.join(', ')}`)
      out.push(`- **Concept:** ${r.concept}`)
      out.push(`- **Dex:** ${r.dex.category} — "${r.dex.lines.join(' ')}"`)
      out.push(`- **Visual brief:** ${r.brief}`, '')
    }
  }
  return out.join('\n')
}
