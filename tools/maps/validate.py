"""Map validator (run by build.py, or: python3 tools/maps/validate.py).

Checks
  - every warp resolves (map + spawn exist); every spawn stands on a legal tile
  - NPCs / items / trigger cells on walkable tiles, signs on solid tiles
  - every `door` tile carries a warp or a sign
  - no walkable cell on the map border
  - flood fill from the new-game spawn across warps (ledges one-way, NPCs and
    visible items block) reaches every warp and can talk to / read / pick up
    every NPC, sign and item, and steps on every trigger
  - script ids referenced by maps are registered in src/game/content/** (warning)
"""
import os
import re
import sys
from collections import deque

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CONTENT = os.path.join(ROOT, 'src', 'game', 'content')
START = ('overworld', 'arrival')
DIRS = {'up': (0, -1), 'down': (0, 1), 'left': (-1, 0), 'right': (1, 0)}


def registered_scripts():
    ids = set()
    if not os.path.isdir(CONTENT):
        return ids
    for dp, _, fs in os.walk(CONTENT):
        for f in fs:
            if f.endswith('.ts'):
                s = open(os.path.join(dp, f)).read()
                ids |= set(re.findall(r"registerScript\(\s*['\"]([\w.]+)['\"]", s))
                ids |= set(re.findall(r"^\s*['\"]([a-z_0-9]+\.[\w.]+)['\"]\s*:", s, re.M))
                ids |= set(re.findall(r"\b(?:def|text)\(\s*['\"]([\w.]+)['\"]", s))
                ids |= {'trainer.' + t for t in re.findall(r"^trainer\(\s*['\"](\w+)['\"]", s, re.M)}
    return ids


def run(maps, strict_scripts=False):
    by = {m.id: m for m in maps}
    errs, warns = [], []

    def E(m, msg):
        errs.append('%s: %s' % (m.id, msg))

    def W(m, msg):
        warns.append('%s: %s' % (m.id, msg))

    def cells(o):
        return [(o['x'] + i, o['y'] + j) for i in range(o['w']) for j in range(o['h'])]

    blockers = {}
    for m in maps:
        spawns = {o['name']: o for o in m.objects if o['type'] == 'spawn'}
        bl = set()
        for o in m.objects:
            t, p = o['type'], o['props']
            x, y = o['x'], o['y']
            if t == 'warp':
                tm = by.get(p.get('toMap'))
                if not tm:
                    E(m, 'warp at %d,%d -> unknown map %r' % (x, y, p.get('toMap')))
                elif not any(q['type'] == 'spawn' and q['name'] == p.get('toSpawn') for q in tm.objects):
                    E(m, 'warp at %d,%d -> %s has no spawn %r' % (x, y, tm.id, p.get('toSpawn')))
                if m.solid(x, y):
                    E(m, 'warp at %d,%d on a solid tile' % (x, y))
            elif t == 'spawn':
                if m.solid(x, y):
                    E(m, 'spawn %r at %d,%d on a solid tile' % (o['name'], x, y))
            elif t == 'npc':
                if m.solid(x, y):
                    E(m, 'npc %r at %d,%d on a solid tile' % (o['name'], x, y))
                if not (p.get('showIfFlag') or p.get('hideIfFlag')):
                    bl.add((x, y))
            elif t == 'item':
                if m.solid(x, y):
                    E(m, 'item %r at %d,%d on a solid tile' % (o['name'], x, y))
                if not p.get('hidden'):
                    bl.add((x, y))
            elif t == 'sign':
                if not m.solid(x, y):
                    W(m, 'sign at %d,%d is on a walkable tile' % (x, y))
            elif t == 'trigger':
                for (cx, cy) in cells(o):
                    if m.solid(cx, cy):
                        E(m, 'trigger %r cell %d,%d solid' % (o['name'], cx, cy))
        blockers[m.id] = bl
        # door tiles need a warp or sign
        for y in range(m.h):
            for x in range(m.w):
                if m.props_at(x, y).get('door'):
                    if not any(o['type'] in ('warp', 'sign') and (x, y) in cells(o) for o in m.objects):
                        E(m, 'door tile %d,%d has no warp/sign' % (x, y))
        del spawns

    # ---------------------------------------------------------------- flood fill
    def spawn_pos(mid, name):
        m = by[mid]
        for o in m.objects:
            if o['type'] == 'spawn' and o['name'] == name:
                return (o['x'], o['y'])
        return None

    seen = set()
    q = deque()
    sp = spawn_pos(*START)
    if sp is None:
        errs.append('start spawn %s missing' % (START,))
    else:
        q.append((START[0],) + sp)
        seen.add((START[0],) + sp)
    warps_hit = set()
    while q:
        mid, x, y = q.popleft()
        m = by[mid]
        warp = next((o for o in m.objects if o['type'] == 'warp' and (x, y) in cells(o)), None)
        if warp and (mid, x, y) != (START[0],) + (sp or (-1, -1)):
            warps_hit.add((mid, x, y))
            p = warp['props']
            dst = spawn_pos(p['toMap'], p['toSpawn']) if p.get('toMap') in by else None
            if dst:
                k = (p['toMap'],) + dst
                if k not in seen:
                    seen.add(k)
                    q.append(k)
            # arriving on a warp tile does not re-trigger it: also expand neighbours
            # only when we got here by spawning (handled because spawns are queued
            # separately); a stepped-on warp ends movement.
            if not any(o['type'] == 'spawn' and (o['x'], o['y']) == (x, y) for o in m.objects):
                continue
        for d, (dx, dy) in DIRS.items():
            nx, ny = x + dx, y + dy
            if not (0 <= nx < m.w and 0 <= ny < m.h):
                continue
            pr = m.props_at(nx, ny)
            led = pr.get('ledge')
            if led:
                if led == d:
                    lx, ly = nx + dx, ny + dy
                    if 0 <= lx < m.w and 0 <= ly < m.h and not m.solid(lx, ly) and (lx, ly) not in blockers[mid] \
                            and not m.props_at(lx, ly).get('ledge'):
                        k = (mid, lx, ly)
                        if k not in seen:
                            seen.add(k)
                            q.append(k)
                continue
            if m.solid(nx, ny) or (nx, ny) in blockers[mid]:
                continue
            k = (mid, nx, ny)
            if k not in seen:
                seen.add(k)
                q.append(k)

    def reach(mid, x, y):
        return (mid, x, y) in seen

    def near(m, x, y, counter_ok=False):
        for dx, dy in DIRS.values():
            if reach(m.id, x + dx, y + dy):
                return True
            if counter_ok and m.props_at(x + dx, y + dy).get('counter') and reach(m.id, x + 2 * dx, y + 2 * dy):
                return True
        return False

    for m in maps:
        # reachable cells must keep a solid border (camera never shows void, no off-map steps)
        for (mid, x, y) in seen:
            if mid == m.id and (x in (0, m.w - 1) or y in (0, m.h - 1)):
                E(m, 'reachable cell %d,%d on the map border' % (x, y))
        if not m.props.get('indoor'):
            pad = min(min(x for (mid, x, y) in seen if mid == m.id), min(y for (mid, x, y) in seen if mid == m.id),
                      min(m.w - 1 - x for (mid, x, y) in seen if mid == m.id),
                      min(m.h - 1 - y for (mid, x, y) in seen if mid == m.id))
            if pad < 8:
                W(m, 'only %d tiles of padding beyond reachable space' % pad)
        for o in m.objects:
            t, x, y = o['type'], o['x'], o['y']
            if t == 'warp' and not any(reach(m.id, cx, cy) for cx, cy in cells(o)):
                E(m, 'warp at %d,%d unreachable' % (x, y))
            elif t == 'npc' and not near(m, x, y, counter_ok=True):
                if o['props'].get('showIfFlag'):
                    W(m, 'conditional npc %r not reachable (check)' % o['name'])
                else:
                    E(m, 'npc %r at %d,%d cannot be talked to' % (o['name'], x, y))
            elif t == 'sign' and not near(m, x, y):
                E(m, 'sign at %d,%d cannot be read' % (x, y))
            elif t == 'item' and not near(m, x, y) and not reach(m.id, x, y):
                E(m, 'item %r unreachable' % o['name'])
            elif t == 'trigger' and not any(reach(m.id, cx, cy) for cx, cy in cells(o)):
                E(m, 'trigger %r unreachable' % o['name'])
            elif t == 'spawn' and not reach(m.id, x, y):
                W(m, 'spawn %r never reached' % o['name'])

    # ---------------------------------------------------------------- scripts
    reg = registered_scripts()
    missing = set()
    for m in maps:
        for o in m.objects:
            s = o['props'].get('script')
            if s and s not in reg:
                missing.add(s)
    if missing:
        (errs if strict_scripts else warns).append('scripts not registered in src/game/content: %s' % ', '.join(sorted(missing)))

    for w in warns:
        print('  warn ', w)
    for e in errs:
        print('  ERROR', e)
    n = sum(1 for k in seen)
    print('validate: %d maps, %d reachable cells, %d errors, %d warnings' % (len(maps), n, len(errs), len(warns)))
    return not errs


if __name__ == '__main__':
    sys.path.insert(0, HERE)
    import build
    sys.exit(0 if run(build.all_maps(), strict_scripts='--strict' in sys.argv) else 1)
