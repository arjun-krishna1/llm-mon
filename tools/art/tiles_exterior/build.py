#!/usr/bin/env python3
"""Build the exterior tileset.

    python3 tools/art/tiles_exterior/build.py [--no-preview]

Writes public/assets/game/tilesets/exterior.{png,tsj,catalog.json} and
docs/ART_CATALOG_EXTERIOR.md, then renders previews into
tools/art/tiles_exterior/preview/.
Generated source art is read from tools/art/gen/raw/ext_*.png (cached; see
gen_sources.py) — this script never calls the image generator.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import lib  # noqa: E402
from lib import Canvas, T  # noqa: E402
import ground  # noqa: E402
import nature  # noqa: E402
import props  # noqa: E402
import buildings  # noqa: E402
from sheet import Sheet, write_json  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT = os.path.join(ROOT, 'public', 'assets', 'game', 'tilesets')
DOC = os.path.join(ROOT, 'docs', 'ART_CATALOG_EXTERIOR.md')

SOLID = {'solid': True}
WATER_MS = 280
FLOWER_MS = 600
GRASS_MS = 650


def add_stamp(sh, name, canvas, over_rows=0, props_fn=None, note=''):
    """Slice canvas into a stamp. Rows < over_rows go to the `over` layer."""
    w, h = canvas.w // T, canvas.h // T
    if props_fn is None:
        def props_fn(i, j):
            return None if j < over_rows else SOLID
    ids = sh.add_grid(canvas, props_fn)
    base = [[(-1 if j < over_rows else ids[j][i]) for i in range(w)] for j in range(h)]
    over = [[(ids[j][i] if j < over_rows else -1) for i in range(w)] for j in range(h)]
    st = {'w': w, 'h': h, 'layers': {'base': base}}
    if over_rows:
        st['layers']['over'] = over
    sh.stamps[name] = st
    if note:
        sh.notes[name] = note
    return st


def add_anim_stamp(sh, name, frames, over_rows, ms, note=''):
    """Stamp whose cells animate: frame 0 is the stamp, later frames get
    their own blocks; cells that change get a Tiled animation."""
    st = add_stamp(sh, name, frames[0], over_rows, note=note)
    w, h = st['w'], st['h']
    ids0 = [[(st['layers']['over'][j][i] if j < over_rows else st['layers']['base'][j][i])
             for i in range(w)] for j in range(h)]
    seqs = [[[ids0[j][i]] for i in range(w)] for j in range(h)]
    for fr in frames[1:]:
        c0, r0 = sh.block(w, h)
        for j in range(h):
            for i in range(w):
                t = fr.crop(i * T, j * T, T, T)
                if t.key() == frames[0].crop(i * T, j * T, T, T).key():
                    seqs[j][i].append(ids0[j][i])
                else:
                    seqs[j][i].append(sh.place(c0 + i, r0 + j, t))
    for j in range(h):
        for i in range(w):
            s = seqs[j][i]
            if s[0] >= 0 and len(set(s)) > 1:
                sh.animate(s[0], s, ms)
    return st


def build_area(sh, kind, frames=1, props=None):
    """47-piece blob autotile; the 13 named pieces sit in a 3x3 + 2x2 block."""
    named = ground.named_pieces()
    layout = [['nw', 'n', 'ne', 'inner_se', 'inner_sw'],
              ['w', 'c', 'e', 'inner_ne', 'inner_nw'],
              ['sw', 's', 'se', None, None]]
    configs = ground.all_blob_configs()
    named_keys = {ground.blob_key(v): k for k, v in named.items()}
    extra = [k for k in sorted(configs) if k not in named_keys]
    ids = {}  # blob key -> [frame ids]
    for f in range(frames):
        c0, r0 = sh.block(5, 3)
        for j, row in enumerate(layout):
            for i, nm in enumerate(row):
                if nm is None:
                    continue
                nb = named[nm]
                t = ground.render_area(kind, nb, f)
                ids.setdefault(ground.blob_key(nb), []).append(sh.place(c0 + i, r0 + j, t, props))
        # the 34 remaining blob pieces: 11x3 beside the named block + 1
        c1, r1 = sh.block(11, 3)
        for n, k in enumerate(extra):
            t = ground.render_area(kind, configs[k], f)
            if n < 33:
                tid = sh.place(c1 + n % 11, r1 + n // 11, t, props)
            else:
                c, r = c0 + 3 + (n - 33), r0 + 2
                tid = sh.place(c, r, t, props)
            ids.setdefault(k, []).append(tid)
        sh.newline()
    if frames > 1:
        for k, fr in ids.items():
            sh.animate(fr[0], fr, WATER_MS)
    at = {nm: ids[ground.blob_key(nb)][0] for nm, nb in named.items()}
    if kind == 'water':
        # extra centre tiles with different ripple layouts; pick by position hash
        cv = [at['c']]
        for var in (1, 2):
            fr = [sh.add(ground.render_area(kind, named['c'], f, var), props) for f in range(frames)]
            sh.animate(fr[0], fr, WATER_MS)
            cv.append(fr[0])
        sh.newline()
        at['c_variants'] = cv
    if kind == 'pavement':
        cv = [at['c'], sh.add(ground.render_area(kind, named['c'], 0, 1)),
              sh.add(ground.manhole()), sh.add(ground.drain())]
        sh.newline()
        at['c_variants'] = cv
        sh.notes['pavement'] = 'c_variants: plain, cracked, manhole, drain'
    at['blob'] = {k: v[0] for k, v in ids.items()}
    sh.autotiles[kind] = at


def build():
    sh = Sheet()

    # ---------------------------------------------------------- ground
    for v in 'abcd':
        sh.add(ground.grass(v), name='grass_' + v)
    for top in (False, True):
        a = sh.add(ground.tall_grass(0, top), {'grass': True},
                   name='tall_grass_top' if top else 'tall_grass')
        b2 = sh.add(ground.tall_grass(1, top))
        sh.animate(a, [a, b2], GRASS_MS)
    for col in ('red', 'yellow', 'white', 'pink'):
        a = sh.add(ground.flower(col, 0), name='flower_' + col)
        b = sh.add(ground.flower(col, 1))
        sh.animate(a, [a, b], FLOWER_MS)
    sh.add(ground.steps(), name='steps')
    for nm, (t, d) in ground.ledges().items():
        sh.add(t, {'ledge': d}, name=nm)
    sh.newline()

    build_area(sh, 'path')
    build_area(sh, 'sand')
    build_area(sh, 'water', frames=4, props={'water': True, 'solid': True})

    # ---------------------------------------------------------- nature
    add_stamp(sh, 'tree', nature.tree_stamp(), over_rows=1,
              note='Single tree. Crown top row is `over` (walk-behind).')
    fp = nature.forest_pieces()
    c0, r0 = sh.block(4, 4)
    forest = {}
    for j, rk in enumerate(('top', 'mid', 'join', 'bottom')):
        for i, ck in enumerate(('l_out', 'l_in', 'r_in', 'r_out')):
            forest[rk + '_' + ck] = sh.place(c0 + i, r0 + j, fp[rk + '_' + ck], SOLID)
    sh.autotiles['forest'] = forest
    add_stamp(sh, 'rock_big', nature.rock(2))
    sh.add(nature.bush(), SOLID, name='bush')
    sh.add(nature.rock(1), SOLID, name='rock')
    sh.add(nature.bush_flower(), SOLID, name='bush_flower')
    sh.add(nature.stump(), SOLID, name='stump')
    sh.add(ground.lilypad(), name='lilypad')
    sh.add(ground.reeds(), SOLID, name='reeds')
    add_stamp(sh, 'tree_b', nature.tree_stamp('ext_tree_b'), over_rows=1,
              note='Conifer. Standalone only (not part of the forest autotile).')
    sh.newline()

    # ---------------------------------------------------------- fences
    for style in ('wood', 'white'):
        at = {}
        bykey = {}
        for nm, conn in props.FENCE_NAMES.items():
            i = sh.add(props.fence(style, conn), SOLID)
            at[nm] = i
            bykey[conn] = i
        at['byConnection'] = bykey
        sh.autotiles['fence_' + style] = at
    sh.newline()

    # ---------------------------------------------------------- props
    sh.add(props.signpost(), SOLID, name='sign_wood')
    sh.add(props.mailbox(), SOLID, name='mailbox')
    add_stamp(sh, 'lamp', props.lamp(), over_rows=1)
    add_stamp(sh, 'sign_town', props.town_sign(), over_rows=1)
    add_stamp(sh, 'bench', props.bench())
    sh.add(props.planter(), SOLID, name='planter')
    sh.add(props.crate(), SOLID, name='crate')
    sh.newline()
    add_anim_stamp(sh, 'fountain', props.fountain_frames(3), 1, 220)
    add_anim_stamp(sh, 'signal_tower', props.signal_tower_frames(), 1, [700, 500])
    sh.newline()

    # ---------------------------------------------------------- buildings
    for name in buildings.SPEC:
        cv, over_rows, doors = buildings.building(name)
        ht = cv.h // T
        st = add_stamp(sh, name, cv, over_rows,
                       buildings.cell_props(name, ht, over_rows, doors))
        st['door'] = [{'x': d, 'y': ht - 1} for d in doors]

    # ===== Round 3: city kit. APPENDED ONLY - everything above keeps its ids.
    sh.newline()
    build_area(sh, 'pavement')
    sh.add(ground.plaza_inlay(), name='plaza_inlay')
    sh.add(ground.crosswalk(), name='crosswalk')
    sh.add(props.bollard(), SOLID, name='bollard')
    at = {}
    bykey = {}
    for nm, conn in props.FENCE_NAMES.items():
        i = sh.add(props.hedge(conn), SOLID)
        at[nm] = i
        bykey[conn] = i
    at['byConnection'] = bykey
    sh.autotiles['hedge'] = at
    sh.newline()
    add_anim_stamp(sh, 'kiosk', props.kiosk_frames(), 1, [600, 600])
    add_stamp(sh, 'streetlight_modern', props.streetlight_modern(), over_rows=1)
    add_stamp(sh, 'bike_rack', props.bike_rack())
    add_stamp(sh, 'billboard', props.billboard(), over_rows=1)
    sh.newline()
    for name in buildings.SPEC_CITY:
        cv, over_rows, doors = buildings.building(name)
        ht = cv.h // T
        st = add_stamp(sh, name, cv, over_rows,
                       buildings.cell_props(name, ht, over_rows, doors))
        st['door'] = [{'x': d, 'y': ht - 1} for d in doors]
    return sh


def check_palette(img_canvas):
    ok = lib.palette_set()
    bad = set()
    for row in img_canvas.px:
        for c in row:
            if c not in ok:
                bad.add(c)
    return bad


def main():
    sh = build()
    os.makedirs(OUT, exist_ok=True)
    img = sh.image()
    bad = check_palette(img)
    if bad:
        print('WARNING: %d off-palette colours, e.g. %s' % (len(bad), sorted(bad)[:5]))
    img.to_image().save(os.path.join(OUT, 'exterior.png'))
    write_json(os.path.join(OUT, 'exterior.tsj'), sh.tsj('exterior', 'exterior.png'))
    write_json(os.path.join(OUT, 'exterior.catalog.json'), sh.catalog())
    import docs
    docs.write(DOC, sh)
    print('exterior: %d tiles used, %d rows' % (len(sh.slots), sh.rows))
    if '--no-preview' not in sys.argv:
        import preview
        preview.main()


if __name__ == '__main__':
    main()
