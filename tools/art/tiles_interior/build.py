#!/usr/bin/env python3
"""Build the interior tileset.

    python3 tools/art/tiles_interior/build.py

Writes public/assets/game/tilesets/interior.{png,tsj,catalog.json} and the
preview renders in tools/art/tiles_interior/preview/.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from cv import T, Cv, P  # noqa: E402
from sheet import Sheet  # noqa: E402
import structure as S  # noqa: E402
import furniture as F  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT = os.path.join(ROOT, 'public', 'assets', 'game', 'tilesets')

FLOOR_THEME = {  # floor name -> suggested wall theme (doc only)
    'wood_a': 'home', 'wood_b': 'neighbor', 'lab': 'lab',
    'center': 'center', 'mart': 'mart',
}


def build_structure(sh):
    # floors -------------------------------------------------------------
    wa, wl, wh = P.WOOD[3], P.WOOD[2], P.WOOD[4]
    floors = {
        'wood_a': [S.wood_floor(wa, wl, wh, (3, None, 11, None)),
                   S.wood_floor(wa, wl, wh, (None, 13, None, 6))],
        'wood_b': [S.wood_floor(P.WOOD[2], P.WOOD[1], P.WOOD[3], (3, None, 11, None)),
                   S.wood_floor(P.WOOD[2], P.WOOD[1], P.WOOD[3], (None, 13, None, 6))],
        'lab': [S.lab_floor()],
        'center': [S.center_floor(), None,
                   S.center_floor('inlay'), S.center_floor('teal')],
        'mart': [S.mart_floor()],
    }
    suffix = ['', '_alt', '_inlay', '_teal']
    for fname, tiles in floors.items():
        for i, t in enumerate(tiles):
            if t is not None:
                sh.tile(f'floor_{fname}{suffix[i]}', t)
        for i, t in enumerate(tiles[:2]):
            if t is not None:
                sh.tile(f'floor_{fname}{suffix[i]}_shadow', S.floor_shadow(t))
    sh.new_row()

    # walls --------------------------------------------------------------
    for name in S.THEMES:
        face = S.wall_face(name)
        u, l = face.crop(0, 0, T, T), face.crop(0, T, T, T)
        fl, fr = S.corner_shade(face, 'l'), S.corner_shade(face, 'r')
        ids = {
            'u': sh.tile(f'wall_{name}_u', u, solid=True),
            'l': sh.tile(f'wall_{name}_l', l, solid=True),
            'u_left': sh.tile(f'wall_{name}_u_left', fl.crop(0, 0, T, T), solid=True),
            'l_left': sh.tile(f'wall_{name}_l_left', fl.crop(0, T, T, T), solid=True),
            'u_right': sh.tile(f'wall_{name}_u_right', fr.crop(0, 0, T, T), solid=True),
            'l_right': sh.tile(f'wall_{name}_l_right', fr.crop(0, T, T, T), solid=True),
        }
        rims = S.rim_set(S.THEMES[name][1])
        for k in ('l', 'r', 'b', 'bl', 'br', 'tl', 'tr'):
            ids['rim_' + k] = sh.tile(f'rim_{name}_{k}', rims[k], solid=True)
        sh.walls[name] = ids
    sh.new_row()
    rims = S.rim_set(P.WOOD)
    sh.tile('void', rims['void'], solid=True)
    sh.tile('rim_door_gap', rims['b_door'], solid=True)
    for name in sh.walls:
        sh.walls[name]['void'] = sh.names['void']
        sh.walls[name]['rim_door_gap'] = sh.names['rim_door_gap']

    # mats ---------------------------------------------------------------
    for col, ramp in (('green', P.CLOTH_GREEN), ('red', P.CLOTH_RED),
                      ('teal', P.ROOF_TEAL[:3]), ('violet', P.CLOTH_VIOLET)):
        sh.tile(f'mat_exit_{col}', S.mat(ramp), door=True)
        sh.tile(f'mat_exit_{col}_l', S.mat(ramp, 'l'), door=True)
        sh.tile(f'mat_exit_{col}_r', S.mat(ramp, 'r'), door=True)
    sh.new_row()

    # rugs ---------------------------------------------------------------
    for rname, cols in S.RUGS.items():
        pieces = S.rug_pieces(cols)
        ids = {}
        for k in ('nw', 'n', 'ne', 'w', 'c', 'e', 'sw', 's', 'se'):
            ids[k] = sh.tile(f'rug_{rname}_{k}', pieces[k])
        sh.autotiles[f'rug_{rname}'] = ids
    sh.new_row()

    # stairs + door --------------------------------------------------------
    sh.stamp('stairs_up', F.stairs_up(), ['BB', 'bb'], place='wall_face', base_layer='ground',
             note='Ground layer, replaces both wall-face rows. Put the warp '
                  'on the lower (walkable) row.')
    sh.stamp('stairs_down', F.stairs_down(), ['BB', 'bb'], place='floor', base_layer='ground',
             note='Ground layer, replaces floor against the back wall. '
                  'Warp on the lower row.')
    sh.stamp('door_inner', S.inner_door(), ['B', 'B'], place='wall_face',
             note='Detail layer over both wall-face rows. Decorative.')


def build():
    sh = Sheet('interior')
    build_structure(sh)
    sh.new_row()
    F.build_furniture(sh)
    os.makedirs(OUT, exist_ok=True)
    im = sh.write(os.path.join(OUT, 'interior.png'),
                  os.path.join(OUT, 'interior.tsj'),
                  os.path.join(OUT, 'interior.catalog.json'))
    print(f'interior: {len(sh.tiles)} tiles, {im.size}, '
          f'{len(sh.names)} named tiles, {len(sh.stamps)} stamps')
    return sh


if __name__ == '__main__':
    build()
    import preview
    preview.main()
