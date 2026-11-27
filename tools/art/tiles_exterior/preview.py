#!/usr/bin/env python3
"""Previews for the exterior tileset, built ONLY from the published files
(exterior.png + exterior.catalog.json + exterior.tsj) the way a mapper uses
them:

  preview/tileset_4x.png    the sheet at 4x on a checkerboard
  preview/scene_3x.png      a 40x26 town corner at 3x
  preview/scene_frame_4x.png  one 240x160 camera frame of it at 4x
"""
import json
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
TS = os.path.join(ROOT, 'public', 'assets', 'game', 'tilesets')
CHARS = os.path.join(ROOT, 'public', 'assets', 'game', 'sprites', 'chars')
PV = os.path.join(HERE, 'preview')
T = 16


class Map:
    LAYERS = ('ground', 'detail', 'detail2', 'over')

    def __init__(self, cat, w, h):
        self.cat, self.w, self.h = cat, w, h
        self.L = {n: [[-1] * w for _ in range(h)] for n in self.LAYERS}

    def set(self, layer, x, y, tid):
        if 0 <= x < self.w and 0 <= y < self.h and tid is not None and tid >= 0:
            self.L[layer][y][x] = tid

    def tile(self, layer, x, y, name):
        self.set(layer, x, y, self.cat['tiles'][name])

    def stamp(self, name, x, y, base='detail'):
        st = self.cat['stamps'][name]
        for lname, grid in st['layers'].items():
            dst = 'over' if lname == 'over' else base
            for j, row in enumerate(grid):
                for i, tid in enumerate(row):
                    self.set(dst, x + i, y + j, tid)

    def area(self, kind, cells, layer='ground'):
        """cells: set of (x, y). Uses the 47-piece blob table."""
        blob = self.cat['autotiles'][kind]['blob']
        for (x, y) in cells:
            def has(dx, dy):
                q = (x + dx, y + dy)
                if not (0 <= q[0] < self.w and 0 <= q[1] < self.h):
                    return True   # material continues off-map
                return q in cells
            nb = {'n': has(0, -1), 'ne': has(1, -1), 'e': has(1, 0), 'se': has(1, 1),
                  's': has(0, 1), 'sw': has(-1, 1), 'w': has(-1, 0), 'nw': has(-1, -1)}
            for d, (a, b) in {'ne': ('n', 'e'), 'se': ('s', 'e'), 'sw': ('s', 'w'),
                              'nw': ('n', 'w')}.items():
                if not (nb[a] and nb[b]):
                    nb[d] = False
            key = ''.join('1' if nb[k] else '0' for k in ('n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'))
            tid = blob[key]
            cv = self.cat['autotiles'][kind].get('c_variants')
            if key == '11111111' and cv:
                tid = cv[(x * 7 + y * 13 + (x * y) % 5) % len(cv)]
            self.set(layer, x, y, tid)

    def forest(self, anchors, layer='detail'):
        """anchors: set of (ax, ay) tree positions on a 2-col/2-row lattice
        (each tree covers ax..ax+1, ay..ay+2)."""
        F = self.cat['autotiles']['forest']
        anchors = set(anchors)
        for (ax, ay) in sorted(anchors, key=lambda a: a[1]):
            for dy, kind in ((0, 'top'), (1, 'mid'), (2, 'bottom')):
                y = ay + dy
                if kind == 'top' and (ax, ay - 2) in anchors:
                    kind = 'join'
                if kind == 'bottom' and (ax, ay + 2) in anchors:
                    continue      # drawn as the join row of the tree in front
                lk = 'l_in' if (ax - 2, ay) in anchors else 'l_out'
                rk = 'r_in' if (ax + 2, ay) in anchors else 'r_out'
                self.set(layer, ax, y, F[kind + '_' + lk])
                self.set(layer, ax + 1, y, F[kind + '_' + rk])

    def fence(self, style, cells, layer='detail'):
        by = self.cat['autotiles']['fence_' + style]['byConnection']
        cells = set(cells)
        for (x, y) in cells:
            conn = ''.join(d for d, (dx, dy) in (('n', (0, -1)), ('e', (1, 0)), ('s', (0, 1)),
                                                  ('w', (-1, 0))) if (x + dx, y + dy) in cells)
            self.set(layer, x, y, by[conn])

    def render(self, sheet, anim_frame=0, anims=None, sprites=()):
        out = Image.new('RGBA', (self.w * T, self.h * T), (0, 0, 0, 255))
        cols = sheet.width // T
        cache = {}

        def tile_img(tid):
            if anims and tid in anims:
                fr = anims[tid]
                tid = fr[anim_frame % len(fr)]
            if tid not in cache:
                cx, cy = (tid % cols) * T, (tid // cols) * T
                cache[tid] = sheet.crop((cx, cy, cx + T, cy + T))
            return cache[tid]
        for lname in ('ground', 'detail', 'detail2'):
            for y in range(self.h):
                for x in range(self.w):
                    tid = self.L[lname][y][x]
                    if tid >= 0:
                        out.alpha_composite(tile_img(tid), (x * T, y * T))
        for im, px, py in sorted(sprites, key=lambda s: s[2]):
            out.alpha_composite(im, (px, py))
        for y in range(self.h):
            for x in range(self.w):
                tid = self.L['over'][y][x]
                if tid >= 0:
                    out.alpha_composite(tile_img(tid), (x * T, y * T))
        return out


def rect(x0, y0, x1, y1):
    return {(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)}


def town(cat):
    W, H = 40, 26
    m = Map(cat, W, H)
    tiles = cat['tiles']

    # grass base: mostly a/d with sprinkles of b/c (deterministic hash)
    for y in range(H):
        for x in range(W):
            h = (x * 73856093 ^ y * 19349663) % 100
            v = 'a' if h < 40 else 'd' if h < 70 else 'b' if h < 85 else 'c'
            m.tile('ground', x, y, 'grass_' + v)

    # paths: route exit north, main street, south branch, door stubs
    path = rect(19, 0, 20, 15) | rect(4, 14, 37, 15) | rect(9, 16, 10, 25)
    path |= rect(21, 16, 22, 25) | rect(23, 24, 28, 25)
    m.area('path', path)

    # pond with a small inlet
    water = rect(12, 19, 17, 23) | rect(14, 18, 16, 18) | rect(13, 24, 15, 24) | rect(18, 21, 18, 22)
    m.area('water', water)

    # tall grass + ledge with steps (bottom right)
    tg = rect(30, 20, 36, 24) - {(30, 20), (36, 24)}
    for (x, y) in tg:
        m.tile('ground', x, y, 'tall_grass' if (x, y - 1) in tg else 'tall_grass_top')
    m.tile('ground', 29, 18, 'ledge_s_end_w')
    for x in range(30, 37):
        m.tile('ground', x, 18, 'steps' if x == 33 else 'ledge_s')
    m.tile('ground', 32, 18, 'ledge_s_end_e')
    m.tile('ground', 34, 18, 'ledge_s_end_w')
    m.tile('ground', 37, 18, 'ledge_s_end_e')

    # sand play area north-east
    m.area('sand', rect(25, 4, 30, 6) | rect(26, 7, 29, 7))

    # flowers
    for (x, y), c in {(6, 12): 'red', (6, 13): 'yellow', (12, 12): 'pink',
                      (18, 12): 'red', (12, 17): 'yellow', (18, 17): 'white', (25, 21): 'pink',
                      (6, 18): 'red', (7, 19): 'yellow', (29, 21): 'red', (38, 15): 'white',
                      (23, 13): 'yellow', (8, 5): 'red', (9, 5): 'yellow', (10, 5): 'red',
                      (8, 6): 'white', (9, 6): 'red', (10, 6): 'white', (32, 5): 'pink',
                      (33, 6): 'yellow', (16, 4): 'red'}.items():
        m.tile('ground', x, y, 'flower_' + c)

    # forest walls: top band with a gap for the route, left and right bands
    anchors = set()
    for ax in range(0, W, 2):
        if ax in (18, 20):
            continue
        anchors |= {(ax, -1), (ax, 1)}
    for ay in range(3, H, 2):
        anchors |= {(0, ay), (2, ay), (38, ay)}
    m.forest(anchors)

    # buildings
    m.stamp('shed', 4, 9)
    m.stamp('house_orange', 7, 7)
    m.stamp('house_blue', 13, 7)
    m.stamp('lab', 23, 9)
    m.stamp('model_center', 31, 8)
    m.stamp('token_mart', 23, 17)

    # props
    m.tile('detail', 12, 13, 'mailbox')
    m.tile('detail', 18, 13, 'sign_wood')
    m.stamp('sign_town', 21, 4)
    m.stamp('lamp', 22, 12)
    m.stamp('lamp', 30, 12)
    m.stamp('bench', 34, 16)
    m.stamp('bench', 26, 2 + 6)
    m.tile('detail', 11, 17, 'bush'); m.tile('detail', 11, 18, 'bush')
    m.tile('detail', 18, 19, 'rock')
    m.stamp('rock_big', 6, 22)
    m.stamp('tree', 16, 15)
    m.stamp('tree', 13, 3)
    m.tile('detail', 37, 13, 'bush')
    m.tile('detail', 7, 4, 'bush'); m.tile('detail', 11, 4, 'bush')

    # new dressing: plaza fountain, relay mast, planters, crates, pond decor
    m.stamp('fountain', 26, 4)
    m.stamp('signal_tower', 36, 5)
    for x in (24, 30):
        m.tile('detail', x, 6, 'planter')
    m.tile('detail', 28, 17, 'crate'); m.tile('detail', 28, 18, 'crate')
    m.tile('detail', 13, 20, 'lilypad'); m.tile('detail', 16, 22, 'lilypad')
    m.tile('detail', 12, 23, 'reeds'); m.tile('detail', 17, 19, 'reeds')
    m.stamp('tree_b', 4, 2 + 21)
    m.stamp('tree_b', 33, 4)
    m.tile('detail', 9, 3 + 1, 'stump')
    m.tile('detail', 18, 12, 'bush_flower'); m.tile('detail', 5, 15 + 1, 'bush_flower')

    # fences: white picket garden west of the pond, wood fence by the ledge
    m.fence('white', rect(4, 17, 8, 17) | rect(4, 17, 4, 20) | rect(4, 20, 8, 20))
    m.fence('wood', rect(29, 19, 29, 24) | {(30, 19)})
    return m


def load_anims(tsj):
    out = {}
    for t in tsj['tiles']:
        if 'animation' in t:
            out[t['id']] = [a['tileid'] for a in t['animation']]
    return out


def char_sprites():
    sp = []
    for nm, (x, y, row) in {'player': (20, 17, 0), 'mom': (9, 15, 3), 'boy': (25, 16, 2),
                            'girl': (16, 25, 1)}.items():
        p = os.path.join(CHARS, nm + '.png')
        if not os.path.exists(p):
            continue
        im = Image.open(p).convert('RGBA')
        fr = im.crop((0, row * 24, 16, row * 24 + 24))
        sp.append((fr, x * T, y * T - 8))
    return sp


def main():
    os.makedirs(PV, exist_ok=True)
    sheet = Image.open(os.path.join(TS, 'exterior.png')).convert('RGBA')
    cat = json.load(open(os.path.join(TS, 'exterior.catalog.json')))
    tsj = json.load(open(os.path.join(TS, 'exterior.tsj')))
    # tileset at 4x over a checkerboard
    bg = Image.new('RGBA', sheet.size)
    for y in range(0, sheet.height, 8):
        for x in range(0, sheet.width, 8):
            c = (200, 200, 210, 255) if (x // 8 + y // 8) % 2 else (230, 230, 236, 255)
            bg.paste(c, (x, y, x + 8, y + 8))
    bg.alpha_composite(sheet)
    bg.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(os.path.join(PV, 'tileset_4x.png'))
    m = town(cat)
    anims = load_anims(tsj)
    img = m.render(sheet, 0, anims, char_sprites())
    img.resize((img.width * 3, img.height * 3), Image.NEAREST).save(os.path.join(PV, 'scene_3x.png'))
    img.save(os.path.join(PV, 'scene_1x.png'))
    fx, fy = 4 * T + 8, 7 * T
    fr = img.crop((fx, fy, fx + 240, fy + 160))
    fr.resize((960, 640), Image.NEAREST).save(os.path.join(PV, 'scene_frame_4x.png'))
    fx, fy = 22 * T, 12 * T
    fr = img.crop((fx, fy, fx + 240, fy + 160))
    fr.resize((960, 640), Image.NEAREST).save(os.path.join(PV, 'scene_frame2_4x.png'))
    # animated tiles check: pond + flowers, 4 frames
    frames = [m.render(sheet, f, anims).crop((4 * T, 16 * T, 20 * T, 26 * T)) for f in range(4)]
    frames = [f.resize((f.width * 3, f.height * 3), Image.NEAREST) for f in frames]
    frames[0].save(os.path.join(PV, 'anim_3x.gif'), save_all=True, append_images=frames[1:],
                   duration=280, loop=0)
    print('previews ->', PV)


if __name__ == '__main__':
    main()
