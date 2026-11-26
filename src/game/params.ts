// URL flags (§4.8): ?debug=1 ?seed=N ?fast=1 ?new=1 ?map=<id>[&spawn=<name>|&x=&y=]

const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '')

export const params = {
  debug: q.get('debug') === '1',
  fast: q.get('fast') === '1',
  newGame: q.get('new') === '1',
  seed: q.has('seed') ? Number(q.get('seed')) : null,
  map: q.get('map'),
  spawn: q.get('spawn'),
  x: q.has('x') ? Number(q.get('x')) : null,
  y: q.has('y') ? Number(q.get('y')) : null,
}

/** Fade/transition duration honouring ?fast=1. */
export function ms(n: number): number {
  return params.fast ? 0 : n
}
