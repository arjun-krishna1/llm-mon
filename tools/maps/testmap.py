#!/usr/bin/env python3
"""ENGINE test map: public/assets/game/maps/_test.tmj (run: python3 tools/maps/testmap.py).

Exercises every engine feature: grass variants + animated flowers/water, tall
grass with encounters, ledges (hop) with a steps gap, house stamp with door warp
into an interior room (embedded second tileset) and exit-mat warp back, `over`
layers (roofs, tree crowns), forest walls, fences, signs (text + script),
triggers (once), NPCs (static/look/wander), a trainer with sight, a counter with
a clerk behind it, ground + hidden items, two zones with banner/music.

Uses the real exterior/interior catalogs when present; otherwise writes a
placeholder tileset (public/assets/game/tilesets/_placeholder.*).
"""
import json
import os
import random

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TS_DIR = os.path.join(ROOT, 'public', 'assets', 'game', 'tilesets')
OUT = os.path.join(ROOT, 'public', 'assets', 'game', 'maps', '_test.tmj')

W, H = 56, 32
LAYERS = ['ground', 'detail', 'detail2', 'over']


def load(name):
    with open(os.path.join(TS_DIR, f'{name}.catalog.json')) as f:
        cat = json.load(f)
    with open(os.path.join(TS_DIR, f'{name}.tsj')) as f:
        tsj = json.load(f)
    return cat, tsj


class Map:
    def __init__(self):
        self.layers = {n: [[0] * W for _ in range(H)] for n in LAYERS}
        self.objects = []
        self.next_id = 1

    def set(self, layer, x, y, gid):
        if 0 <= x < W and 0 <= y < H and gid > 0:
            self.layers[layer][y][x] = gid

    def get(self, layer, x, y):
        return self.layers[layer][y][x] if 0 <= x < W and 0 <= y < H else 0

    def obj(self, type_, x, y, w=1, h=1, name='', **props):
        o = {'id': self.next_id, 'name': name, 'type': type_, 'x': x * 16, 'y': y * 16,
             'width': w * 16, 'height': h * 16, 'rotation': 0, 'visible': True,
             'properties': [{'name': k, 'type': ptype(v), 'value': v} for k, v in props.items()]}
        self.next_id += 1
        self.objects.append(o)


def ptype(v):
    if isinstance(v, bool):
        return 'bool'
    if isinstance(v, int):
        return 'int'
    if isinstance(v, float):
        return 'float'
    return 'string'


def build_real(ext_cat, ext_tsj, int_cat, int_tsj):
    E = 1  # exterior firstgid
    I = 1 + ext_tsj['tilecount']  # interior firstgid
    m = Map()
    rnd = random.Random(101)
    T = ext_cat['tiles']

    def et(name):
        return E + T[name]

    def stamp(cat, first, name, x, y, base='detail'):
        s = cat['stamps'][name]
        base = s.get('base_layer', base)
        for layer, target in (('base', base), ('over', 'over')):
            rows = s['layers'].get(layer)
            if not rows:
                continue
            for dy, row in enumerate(rows):
                for dx, tid in enumerate(row):
                    if tid >= 0:
                        m.set(target, x + dx, y + dy, first + tid)

    def area(kind, cells):
        cells = set(cells)
        blob = ext_cat['autotiles'][kind]['blob']
        for (x, y) in cells:
            def has(dx, dy):
                nx, ny = x + dx, y + dy
                if not (0 <= nx < W and 0 <= ny < H):
                    return True
                return (nx, ny) in cells
            nb = {'n': has(0, -1), 'ne': has(1, -1), 'e': has(1, 0), 'se': has(1, 1),
                  's': has(0, 1), 'sw': has(-1, 1), 'w': has(-1, 0), 'nw': has(-1, -1)}
            for d, (a, b) in {'ne': ('n', 'e'), 'se': ('s', 'e'), 'sw': ('s', 'w'), 'nw': ('n', 'w')}.items():
                if not (nb[a] and nb[b]):
                    nb[d] = False
            key = ''.join('1' if nb[d] else '0' for d in ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'])
            tid = blob.get(key, ext_cat['autotiles'][kind]['c'])
            m.set('ground', x, y, E + tid)

    def forest(anchors):
        A = set(anchors)
        F = ext_cat['autotiles']['forest']
        for (ax, ay) in A:
            for r, kind in enumerate(['top', 'mid', 'bottom']):
                if kind == 'top' and (ax, ay - 2) in A:
                    kind = 'join'
                if kind == 'bottom' and (ax, ay + 2) in A:
                    continue
                left = 'l_in' if (ax - 2, ay) in A else 'l_out'
                right = 'r_in' if (ax + 2, ay) in A else 'r_out'
                m.set('detail', ax, ay + r, E + F[f'{kind}_{left}'])
                m.set('detail', ax + 1, ay + r, E + F[f'{kind}_{right}'])

    def fence(style, cells):
        cells = set(cells)
        bc = ext_cat['autotiles'][style]['byConnection']
        for (x, y) in cells:
            conn = ''.join(d for d, (dx, dy) in (('n', (0, -1)), ('e', (1, 0)), ('s', (0, 1)), ('w', (-1, 0)))
                           if (x + dx, y + dy) in cells)
            m.set('detail', x, y, E + bc.get(conn, bc.get('', 0)))

    # --- exterior ground: grass variants over the outdoor part (x < 40)
    for y in range(H):
        for x in range(40):
            r = rnd.random()
            g = 'grass_a' if r < 0.4 else 'grass_b' if r < 0.55 else 'grass_c' if r < 0.7 else 'grass_d'
            m.set('ground', x, y, et(g))

    # forest border (2-tile thick walls)
    anchors = []
    for ax in range(0, 40, 2):
        anchors += [(ax, -1), (ax, 29)]
    for ay in range(1, 29, 2):
        anchors += [(0, ay), (38, ay)]
    forest(anchors)

    # --- Test Town (rows 2..15)
    path = [(x, y) for x in range(3, 36) for y in (11, 12)] + [(x, y) for x in (19, 20) for y in range(13, 29)]
    area('path', path)
    stamp(ext_cat, E, 'house_orange', 6, 4)            # door at (8,10)
    m.obj('warp', 8, 10, toMap='_test', toSpawn='room_entry', facing='up')
    m.obj('spawn', 8, 10, name='house_door', facing='down')
    m.set('detail', 5, 10, et('mailbox'))
    m.set('detail', 11, 10, et('sign_wood'))
    m.obj('sign', 11, 10, text='Engine test house.\\nWalk in through the door!')
    stamp(ext_cat, E, 'lamp', 13, 9)
    stamp(ext_cat, E, 'bench', 15, 9)
    # pond (animated water)
    area('water', [(x, y) for x in range(26, 33) for y in range(4, 9)])
    # flowers (animated)
    for (x, y) in [(14, 5), (15, 6), (16, 5), (17, 7), (14, 7), (16, 8), (22, 5), (23, 6)]:
        m.set('ground', x, y, et(rnd.choice(['flower_red', 'flower_yellow', 'flower_white', 'flower_pink'])))
    stamp(ext_cat, E, 'tree', 21, 3)
    stamp(ext_cat, E, 'sign_town', 23, 9)                # board on (23..24, 9), post row 10
    m.obj('sign', 23, 10, 2, 1, script='test.cutscene')
    m.set('detail', 34, 13, et('bush'))
    m.set('detail', 35, 13, et('rock'))
    fence('fence_white', [(x, 14) for x in range(25, 34)])

    m.obj('spawn', 12, 12, name='start', facing='down')
    m.obj('npc', 16, 12, id='guide', sprite='prof', facing='down', movement='static', script='test.guide')
    m.obj('npc', 26, 12, id='looker', sprite='girl', facing='down', movement='look',
          text='I look around a lot.\\nThe meadow is south, past the ledge!')
    m.obj('npc', 9, 13, id='wanderer', sprite='boy', facing='down', movement='wander', radius=2,
          text='I wander around and reserve the tile\\nI’m walking into, so you can’t clip me.')
    m.obj('trigger', 22, 13, 2, 1, script='test.trigger_once', once='test_trigger_seen')

    # --- ledge between town and meadow (row 16), steps gap at x=10
    row = 16
    m.set('ground', 3, row, et('ledge_s_end_w'))
    for x in range(4, 9):
        m.set('ground', x, row, et('ledge_s'))
    m.set('ground', 9, row, et('ledge_s_end_e'))
    m.set('ground', 10, row, et('steps'))
    m.set('ground', 11, row, et('ledge_s_end_w'))
    for x in range(12, 17):
        m.set('ground', x, row, et('ledge_s'))
    m.set('ground', 17, row, et('ledge_s_end_e'))
    for x in range(21, 37):
        m.set('ground', x, row, et('ledge_s'))
    m.set('ground', 37, row, et('ledge_s_end_e'))

    # --- Test Meadow (rows 17..28)
    for y in range(19, 26):
        for x in range(4, 15):
            m.set('ground', x, y, et('tall_grass_top' if y == 19 else 'tall_grass'))
    m.obj('npc', 28, 22, id='trainer_a', sprite='trainer_m', facing='left', movement='static', sight=4, trainer='route_101_a')
    m.obj('npc', 24, 26, id='trainer_b', sprite='trainer_f', facing='up', movement='look', sight=3, trainer='route_101_b')
    m.obj('item', 31, 18, itemId='patch', count=1, flag='test_item_patch')
    m.obj('item', 33, 26, itemId='prompt_orb', count=2, flag='test_item_hidden', hidden=True)
    stamp(ext_cat, E, 'tree', 30, 23)
    stamp(ext_cat, E, 'tree', 34, 21)
    fence('fence_wood', [(x, 27) for x in range(26, 34)])
    stamp(ext_cat, E, 'rock_big', 16, 26)

    m.obj('zone', 2, 2, 36, 14, name='Test Town', music='hayes_valley')
    m.obj('zone', 2, 16, 36, 13, name='Test Meadow', music='route_101', encounters='route_101')

    # --- interior room (x 40..55): void everywhere, home room 12x9 at (42, 2)
    IT = int_cat['tiles']
    wall = int_cat['walls']['home']

    def it(name):
        return I + IT[name]
    for y in range(H):
        for x in range(40, W):
            m.set('ground', x, y, I + wall['void'])
    rx, ry, rw, rh = 42, 2, 12, 9
    for x in range(rx, rx + rw):
        for y in range(ry, ry + rh):
            edge_l, edge_r = x == rx, x == rx + rw - 1
            if y == ry:
                k = 'rim_tl' if edge_l else 'rim_tr' if edge_r else 'u_left' if x == rx + 1 else 'u_right' if x == rx + rw - 2 else 'u'
            elif y == ry + 1:
                k = 'rim_l' if edge_l else 'rim_r' if edge_r else 'l_left' if x == rx + 1 else 'l_right' if x == rx + rw - 2 else 'l'
            elif y == ry + rh - 1:
                k = 'rim_bl' if edge_l else 'rim_br' if edge_r else 'rim_b'
            else:
                k = 'rim_l' if edge_l else 'rim_r' if edge_r else None
            if k:
                m.set('ground', x, y, I + wall[k])
            else:
                f = 'floor_wood_a' if (x + y) % 2 else 'floor_wood_a_alt'
                m.set('ground', x, y, it(f + ('_shadow' if y == ry + 2 else '')))
    mx, my = rx + 5, ry + rh - 2
    m.set('detail', mx, my, it('mat_exit_green'))
    m.set('ground', mx, my + 1, I + wall['rim_door_gap'])
    m.obj('warp', mx, my, toMap='_test', toSpawn='house_door', facing='down', sfx='exit')
    m.obj('spawn', mx, my, name='room_entry', facing='up')
    stamp(int_cat, I, 'window', rx + 2, ry)
    stamp(int_cat, I, 'desk_pc', rx + 6, ry + 1)
    stamp(int_cat, I, 'plant', rx + 1, ry + 5)
    stamp(int_cat, I, 'table', rx + 3, ry + 4)
    # shop counter with clerk behind it
    cs = int_cat['autotiles']['counter_shop']
    for i, k in enumerate(['l', 'm', 'r']):
        m.set('detail', rx + 8 + i, ry + 5, I + cs[k])
    m.obj('npc', rx + 9, ry + 4, id='clerk', sprite='clerk', facing='down', movement='static', script='test.clerk')

    tilesets = [dict(ext_tsj, firstgid=E, image='../tilesets/exterior.png'),
                dict(int_tsj, firstgid=I, image='../tilesets/interior.png')]
    for ts in tilesets:
        ts.pop('type', None)
        ts.pop('version', None)
        ts.pop('tiledversion', None)
    return m, tilesets


def build_placeholder():
    """Minimal map on a generated placeholder tileset (used only if art is missing)."""
    from PIL import Image, ImageDraw
    img = Image.new('RGBA', (256, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cols = [(88, 178, 87), (53, 137, 76), (210, 176, 119), (74, 148, 220), (132, 128, 142), (160, 116, 74)]
    for i, c in enumerate(cols):
        d.rectangle([i * 16, 0, i * 16 + 15, 15], fill=c + (255,))
    os.makedirs(TS_DIR, exist_ok=True)
    img.save(os.path.join(TS_DIR, '_placeholder.png'))
    props = {1: {'grass': True}, 3: {'water': True, 'solid': True}, 4: {'solid': True}, 5: {'ledge': 'down'}}
    tsj = {'name': '_placeholder', 'image': '../tilesets/_placeholder.png', 'imagewidth': 256, 'imageheight': 16,
           'tilewidth': 16, 'tileheight': 16, 'columns': 16, 'tilecount': 16, 'margin': 0, 'spacing': 0, 'firstgid': 1,
           'tiles': [{'id': k, 'properties': [{'name': a, 'type': ptype(b), 'value': b} for a, b in v.items()]} for k, v in props.items()]}
    m = Map()
    for y in range(H):
        for x in range(W):
            edge = x in (0, W - 1) or y in (0, H - 1)
            m.set('ground', x, y, 5 if edge else 1)
    for y in range(18, 24):
        for x in range(4, 14):
            m.set('ground', x, y, 2)
    for x in range(3, 30):
        m.set('ground', x, 16, 6)
    m.obj('spawn', 12, 12, name='start')
    m.obj('zone', 1, 1, W - 2, H - 2, name='Placeholder Field', encounters='route_101')
    return m, [tsj]


def main():
    try:
        ext = load('exterior')
        intr = load('interior')
        m, tilesets = build_real(*ext, *intr)
    except FileNotFoundError:
        print('tilesets missing: writing placeholder map')
        m, tilesets = build_placeholder()
    layers = []
    lid = 1
    for n in LAYERS:
        layers.append({'id': lid, 'name': n, 'type': 'tilelayer', 'width': W, 'height': H, 'x': 0, 'y': 0,
                       'opacity': 1, 'visible': True, 'data': [g for row in m.layers[n] for g in row]})
        lid += 1
    layers.append({'id': lid, 'name': 'objects', 'type': 'objectgroup', 'draworder': 'topdown', 'opacity': 1,
                   'visible': True, 'x': 0, 'y': 0, 'objects': m.objects})
    tmj = {'type': 'map', 'version': '1.10', 'tiledversion': '1.10.2', 'orientation': 'orthogonal',
           'renderorder': 'right-down', 'infinite': False, 'width': W, 'height': H, 'tilewidth': 16, 'tileheight': 16,
           'nextlayerid': lid + 1, 'nextobjectid': m.next_id, 'layers': layers, 'tilesets': tilesets,
           'properties': [{'name': 'name', 'type': 'string', 'value': 'Engine Test'},
                          {'name': 'music', 'type': 'string', 'value': 'hayes_valley'},
                          {'name': 'indoor', 'type': 'bool', 'value': False}]}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as f:
        json.dump(tmj, f, separators=(',', ':'))
    print('wrote', OUT)


if __name__ == '__main__':
    main()
