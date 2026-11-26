#!/usr/bin/env python3
"""Compose demo rooms from interior.catalog.json and render previews.

Uses ONLY catalog names (the same data a map author has), so it doubles as a
test that the catalog is usable. Output: tools/art/tiles_interior/preview/.
"""
import json
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
TS = os.path.join(ROOT, 'public', 'assets', 'game', 'tilesets')
OUTDIR = os.path.join(HERE, 'preview')
T = 16


class Room:
    LAYERS = ('ground', 'detail', 'detail2', 'over')

    def __init__(self, cat, w, h, theme, floor, seed=1):
        self.cat, self.w, self.h = cat, w, h
        self.L = {k: [[-1] * w for _ in range(h)] for k in self.LAYERS}
        self.walls = cat['walls'][theme]
        tiles = cat['tiles']
        wl = self.walls
        g = self.L['ground']
        for x in range(w):
            g[0][x] = wl['u']
            g[1][x] = wl['l']
            g[h - 1][x] = wl['rim_b']
        g[0][1], g[1][1] = wl['u_left'], wl['l_left']
        g[0][w - 2], g[1][w - 2] = wl['u_right'], wl['l_right']
        for y in range(h):
            g[y][0] = wl['rim_l']
            g[y][w - 1] = wl['rim_r']
        g[0][0], g[0][w - 1] = wl['rim_tl'], wl['rim_tr']
        g[h - 1][0], g[h - 1][w - 1] = wl['rim_bl'], wl['rim_br']
        alt = f'floor_{floor}_alt'
        r = seed
        for y in range(2, h - 1):
            for x in range(1, w - 1):
                r = (r * 1103515245 + 12345) & 0x7fffffff
                name = f'floor_{floor}'
                if alt in tiles and (r >> 8) % 2 == 0:
                    name = alt
                if y == 2:
                    name += '_shadow'
                g[y][x] = tiles[name]

    def t(self, layer, name, x, y):
        self.L[layer][y][x] = self.cat['tiles'][name]

    def door(self, x, mat='mat_exit_green'):
        self.t('detail', mat, x, self.h - 2)
        self.L['ground'][self.h - 1][x] = self.walls['rim_door_gap']

    def stamp(self, name, x, y, layer='detail'):
        s = self.cat['stamps'][name]
        for k, grid in s['layers'].items():
            tl = 'over' if k == 'over' else (
                'ground' if s['base_layer'] == 'ground' else layer)
            for yy, row in enumerate(grid):
                for xx, v in enumerate(row):
                    if v != -1:
                        self.L[tl][y + yy][x + xx] = v

    def rug(self, name, x, y, w, h):
        a = self.cat['autotiles'][name]
        for yy in range(h):
            for xx in range(w):
                v = ('n' if yy == 0 else 's' if yy == h - 1 else '')
                hzz = ('w' if xx == 0 else 'e' if xx == w - 1 else '')
                k = (v + hzz) or 'c'
                if k in ('n', 's', 'e', 'w', 'c', 'nw', 'ne', 'sw', 'se'):
                    self.L['detail'][y + yy][x + xx] = a[k]

    def render(self, sheet, scale=3, crop=None):
        img = Image.new('RGBA', (self.w * T, self.h * T), (40, 34, 46, 255))
        cols = sheet.width // T
        for k in self.LAYERS:
            for y in range(self.h):
                for x in range(self.w):
                    v = self.L[k][y][x]
                    if v < 0:
                        continue
                    tile = sheet.crop(((v % cols) * T, (v // cols) * T,
                                       (v % cols) * T + T, (v // cols) * T + T))
                    img.alpha_composite(tile, (x * T, y * T))
        if crop:
            img = img.crop(crop)
        return img.resize((img.width * scale, img.height * scale), Image.NEAREST)


def rooms(cat):
    import rooms_demo
    return rooms_demo.make(Room, cat)


def main():
    os.makedirs(OUTDIR, exist_ok=True)
    sheet = Image.open(os.path.join(TS, 'interior.png')).convert('RGBA')
    with open(os.path.join(TS, 'interior.catalog.json')) as f:
        cat = json.load(f)
    big = sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST)
    bg = Image.new('RGBA', big.size, (255, 0, 255, 255))
    bg.alpha_composite(big)
    bg.save(os.path.join(OUTDIR, 'tileset_4x.png'))
    for name, room in rooms(cat).items():
        room.render(sheet, 3).save(os.path.join(OUTDIR, f'room_{name}.png'))
        # 240x160 game-frame crop (15x10 tiles) at 4x, centred
        cw, ch = min(room.w, 15) * T, min(room.h, 10) * T
        x0 = max(0, (room.w * T - 240) // 2)
        y0 = max(0, (room.h * T - 160) // 2)
        frame = Image.new('RGBA', (240, 160), (40, 34, 46, 255))
        r1 = room.render(sheet, 1, (x0, y0, x0 + cw, y0 + ch))
        frame.alpha_composite(r1, ((240 - cw) // 2, (160 - ch) // 2))
        frame.resize((960, 640), Image.NEAREST).save(
            os.path.join(OUTDIR, f'frame_{name}.png'))
    print('previews ->', OUTDIR)


if __name__ == '__main__':
    main()
