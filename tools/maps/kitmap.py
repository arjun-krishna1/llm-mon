#!/usr/bin/env python3
"""ENGINE kit map: public/assets/game/maps/_kit.tmj + _kit_east.tmj (run: python3 tools/maps/kitmap.py).

Every ENGINE-F foundation in one place (open with ?debug=1&map=_kit):

  band A  plaza (guide, badges, notebook, travel kiosk)  | graph floor | switches + gates | statues + beams
  band B  ice / conveyor / spinner / one-way / teleport  | letter tiles + SURPRISE budget | timer + rank | dark room
  band C  ledges + grass (Backprop, Sample) | Embed blocks | rough water (Normalize) | gap + anchors + boulders
          (Chain Rule, Merge) | EVAL light + interface tamper terminal
  east    seamless connection to _kit_east (snow weather, footprints, ice, puddles)

Scripts are `kit.*` in src/game/script/kitScripts.ts (engine-owned). Regression:
node tools/playtest/kit.cjs.
"""
import json
import os
import random

from testmap import LAYERS, Map, load, ptype

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT_DIR = os.path.join(ROOT, 'public', 'assets', 'game', 'maps')


class Kit:
    def __init__(self, w, h, ext_cat, seed):
        self.W, self.H = w, h
        self.m = Map.__new__(Map)
        self.m.layers = {n: [[0] * w for _ in range(h)] for n in LAYERS}
        self.m.objects = []
        self.m.next_id = 1
        self.cat = ext_cat
        self.rnd = random.Random(seed)
        self.hedges = set()

    def set(self, layer, x, y, gid):
        if 0 <= x < self.W and 0 <= y < self.H and gid > 0:
            self.m.layers[layer][y][x] = gid

    def et(self, name):
        return 1 + self.cat['tiles'][name]

    def grass(self):
        for y in range(self.H):
            for x in range(self.W):
                r = self.rnd.random()
                g = 'grass_a' if r < 0.45 else 'grass_b' if r < 0.6 else 'grass_c' if r < 0.75 else 'grass_d'
                self.set('ground', x, y, self.et(g))

    def area(self, kind, cells):
        cells = set(cells)
        blob = self.cat['autotiles'][kind]['blob']
        for (x, y) in cells:
            def has(dx, dy):
                nx, ny = x + dx, y + dy
                if not (0 <= nx < self.W and 0 <= ny < self.H):
                    return True
                return (nx, ny) in cells
            nb = {'n': has(0, -1), 'ne': has(1, -1), 'e': has(1, 0), 'se': has(1, 1),
                  's': has(0, 1), 'sw': has(-1, 1), 'w': has(-1, 0), 'nw': has(-1, -1)}
            for d, (a, b) in {'ne': ('n', 'e'), 'se': ('s', 'e'), 'sw': ('s', 'w'), 'nw': ('n', 'w')}.items():
                if not (nb[a] and nb[b]):
                    nb[d] = False
            key = ''.join('1' if nb[d] else '0' for d in ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'])
            self.set('ground', x, y, 1 + blob.get(key, self.cat['autotiles'][kind]['c']))

    def stamp(self, name, x, y):
        s = self.cat['stamps'][name]
        base = s.get('base_layer', 'detail')
        for layer, target in (('base', base), ('over', 'over')):
            for dy, row in enumerate(s['layers'].get(layer) or []):
                for dx, tid in enumerate(row):
                    if tid >= 0:
                        self.set(target, x + dx, y + dy, 1 + tid)

    def hedge(self, cells):
        self.hedges |= set(cells)

    def room(self, x0, y0, x1, y1, openings=()):
        """Hedge rectangle (inclusive), pavement inside, openings = wall cells left open."""
        wall = [(x, y) for x in range(x0, x1 + 1) for y in (y0, y1)] + [(x, y) for y in range(y0, y1 + 1) for x in (x0, x1)]
        self.hedge([c for c in wall if c not in openings])
        self.area('pavement', [(x, y) for x in range(x0 + 1, x1) for y in range(y0 + 1, y1)] + list(openings))

    def finish(self):
        bc = self.cat['autotiles']['hedge']['byConnection']
        for (x, y) in self.hedges:
            conn = ''.join(d for d, (dx, dy) in (('n', (0, -1)), ('e', (1, 0)), ('s', (0, 1)), ('w', (-1, 0)))
                           if (x + dx, y + dy) in self.hedges)
            self.set('detail', x, y, 1 + bc.get(conn, bc['']))

    def write(self, name, tilesets, props):
        layers = []
        lid = 1
        for n in LAYERS:
            layers.append({'id': lid, 'name': n, 'type': 'tilelayer', 'width': self.W, 'height': self.H, 'x': 0, 'y': 0,
                           'opacity': 1, 'visible': True, 'data': [g for row in self.m.layers[n] for g in row]})
            lid += 1
        layers.append({'id': lid, 'name': 'objects', 'type': 'objectgroup', 'draworder': 'topdown', 'opacity': 1,
                       'visible': True, 'x': 0, 'y': 0, 'objects': self.m.objects})
        tmj = {'type': 'map', 'version': '1.10', 'tiledversion': '1.10.2', 'orientation': 'orthogonal',
               'renderorder': 'right-down', 'infinite': False, 'width': self.W, 'height': self.H, 'tilewidth': 16,
               'tileheight': 16, 'nextlayerid': lid + 1, 'nextobjectid': self.m.next_id, 'layers': layers,
               'tilesets': tilesets,
               'properties': [{'name': k, 'type': ptype(v), 'value': v} for k, v in props.items()]}
        path = os.path.join(OUT_DIR, f'{name}.tmj')
        with open(path, 'w') as f:
            json.dump(tmj, f, separators=(',', ':'))
        print('wrote', path)


def build_kit(cat):
    W, H = 60, 43
    k = Kit(W, H, cat, 7)
    o = k.m.obj
    k.grass()
    # outer border (east side open at both corridors: seamless connection to _kit_east)
    east_open = {(W - 1, y) for y in (13, 14, 28, 29)}
    border = [(x, 0) for x in range(W)] + [(x, H - 1) for x in range(W)] + [(0, y) for y in range(H)] + [(W - 1, y) for y in range(H)]
    k.hedge([c for c in border if c not in east_open])
    # corridors
    k.area('path', [(x, y) for x in range(1, W) for y in (13, 14, 28, 29)] + [(x, y) for x in (6, 7) for y in range(1, 13)])

    # ---------------------------------------------------------------- band A
    # plaza (x 1..13): guide, badge pedestal, notebook lectern, travel kiosk
    o('spawn', 6, 7, name='start', facing='down')
    o('npc', 4, 4, id='kit_guide', sprite='prof', facing='down', script='kit.guide')
    o('npc', 9, 4, id='kit_badges', sprite='trainer_f', facing='down', script='kit.badges')
    o('npc', 11, 9, id='kit_travel', sprite='clerk', facing='left', script='kit.travel')
    k.set('detail', 3, 9, k.et('sign_wood'))
    o('sign', 3, 9, script='kit.notebook')
    k.set('detail', 9, 11, k.et('sign_wood'))
    o('sign', 9, 11, text='ENGINE KIT\\nEvery foundation lives in this park.\\fBand 1: graph floor, switches, statues.\\nBand 2: floors, letters, timer, dark.\\fBand 3: field skills, EVAL light.\\nEast: a seamless connection.')
    o('zone', 1, 1, 13, 12, name='Kit Plaza', music='hayes_valley')

    # R1 graph floor (x 14..32): out = a*b + c, goal 0; gate behind opens when solved
    k.room(14, 1, 32, 12, openings=[(16, 12)])
    k.hedge([(29, y) for y in range(2, 12) if y != 6])
    o('door', 29, 6, id='g_gate', when='g.solved', latch=True)
    o('item', 31, 6, itemId='patch', count=3, flag='kit_item_graph')
    o('graph', 15, 2, id='g', target=0, onSolve='kit.graph_solved')
    o('gnode', 17, 4, id='a', op='input', value=2, label='a', graph='g')
    o('gnode', 17, 8, id='b', op='input', value=-3, label='b', graph='g')
    o('gnode', 21, 6, id='m', op='mul', graph='g')
    o('gnode', 21, 10, id='c', op='input', value=4, label='c', graph='g', step=1)
    o('gnode', 24, 6, id='s', op='add', graph='g')
    o('gnode', 27, 6, id='o', op='out', graph='g')
    o('wire', 17, 4, **{'from': 'a', 'to': 'm'})
    o('wire', 17, 8, **{'from': 'b', 'to': 'm'})
    o('wire', 21, 6, **{'from': 'm', 'to': 's'})
    o('wire', 21, 10, **{'from': 'c', 'to': 's', 'points': '24,10'})
    o('wire', 24, 6, **{'from': 's', 'to': 'o'})
    k.set('detail', 19, 2, k.et('sign_wood'))
    o('sign', 19, 2, script='kit.graph_sign', anySide=True)
    o('zone', 15, 2, 17, 10, name='Graph Floor')

    # R2 switches + gates (x 33..46)
    k.room(33, 1, 46, 12, openings=[(35, 12)])
    k.hedge([(42, y) for y in range(2, 12) if y not in (3, 6, 9)])
    o('switch', 36, 3, id='sw_t', mode='toggle')
    o('door', 42, 3, id='gate_t', when='sw_t')
    o('block', 38, 6, id='blk_w', kind='a')
    o('switch', 40, 6, id='sw_w', mode='weight')
    o('door', 42, 6, id='gate_w', when='sw_w')
    o('switch', 38, 9, id='sw_m', mode='momentary')
    o('door', 42, 9, id='gate_m', when='sw_m', latch=True)
    o('reset', 44, 11, id='rst')
    o('item', 45, 3, itemId='prompt_orb', count=1, flag='kit_item_sw')
    k.set('detail', 34, 2, k.et('sign_wood'))
    o('sign', 34, 2, text='SWITCHES\\nTOGGLE flips each visit. WEIGHT needs a block.\\fMOMENTARY holds only while pressed\\n(this gate latches). Red pad: reset.', anySide=True)
    o('zone', 34, 2, 12, 10, name='Switch Hall')

    # R3 statues + key + beams (x 47..58)
    k.room(47, 1, 58, 12, openings=[(49, 12)])
    k.hedge([(55, y) for y in range(2, 12) if y != 6])
    o('statue', 49, 4, id='st_a', holds='Q', label='Q', text='A statue of a question mark.')
    o('statue', 53, 3, id='st_b', accepts='Q', label='?', text='The pedestal reads: QUERY.')
    o('key', 50, 9, id='key_k', keyId='K')
    o('statue', 53, 9, id='st_c', accepts='K', label='?', text='The pedestal reads: KEY.')
    o('beam', 53, 3, id='beam_b', **{'from': 'st_b', 'to': 'gate_s', 'when': 'st_b', 'color': '#f8d838'})
    o('beam', 53, 9, id='beam_c', **{'from': 'st_c', 'to': 'gate_s', 'when': 'st_c', 'color': '#72b8ee'})
    o('door', 55, 6, id='gate_s', when='st_b & st_c')
    o('item', 57, 6, itemId='great_orb', count=1, flag='kit_item_statue')
    o('zone', 48, 2, 10, 10, name='Statue Hall')

    # ---------------------------------------------------------------- band B (y 15..27)
    # R4 floors (x 0..18)
    k.room(0, 15, 18, 27, openings=[(3, 15)])
    o('floor', 2, 17, 7, 4, kind='ice')
    for (x, y) in [(5, 17), (8, 19), (2, 20)]:
        k.set('detail', x, y, k.et('rock'))
    o('floor', 10, 17, 1, 6, kind='conveyor', dir='down')
    o('floor', 12, 18, kind='spinner', dir='right')
    o('floor', 15, 17, 1, 5, kind='oneway', dir='up')
    o('teleport', 3, 25, id='tp1', to='tp2')
    o('teleport', 15, 25, id='tp2', to='tp1')
    o('floor', 7, 24, 2, 1, kind='puddle')
    o('floor', 12, 23, 2, 1, kind='gap', when='!sw_pit')   # conditional floor: the pit closes while the switch is on
    o('switch', 12, 25, id='sw_pit', mode='toggle')
    k.set('detail', 1, 16, k.et('sign_wood'))
    o('sign', 1, 16, text='FLOORS\\nIce slides, belts carry, spinners turn,\\farrows are one-way, pads teleport.', anySide=True)
    o('zone', 1, 16, 17, 11, name='Floor Lab')

    # R5 letter tiles + SURPRISE budget (x 19..34)
    k.room(19, 15, 34, 27, openings=[(21, 15)])
    k.hedge([(32, y) for y in range(16, 27) if y != 22])
    o('letter', 22, 18, 4, 3, id='letters', group='w', text='CATSBOGADCAT', counter='surprise', cost=1, script='kit.letter')
    o('counter', 20, 16, 12, 11, id='surprise', label='SURPRISE', max=12, style='budget')
    o('door', 32, 22, id='gate_l', when='spelled', latch=True)
    o('block', 24, 24, id='fz_t', kind='c', glyph='T', fuse=True, merge='block')   # letterpress: A fuses pairs
    o('block', 25, 24, id='fz_o', kind='c', glyph='O', fuse=True, merge='block')
    o('item', 33, 22, itemId='patch', count=1, flag='kit_item_letters')
    k.set('detail', 20, 16, k.et('sign_wood'))
    o('sign', 20, 16, script='kit.letter_sign', anySide=True)
    o('zone', 20, 16, 12, 11, name='Letter Hall')

    # R6 timer (x 35..46)
    k.room(35, 15, 46, 27, openings=[(37, 15)])
    o('timer', 36, 17, 10, 10, id='run', label='TIME', ranks='6,10,16', stopWhen='sw_goal')
    o('switch', 44, 25, id='sw_goal', mode='momentary')
    for (x, y) in [(39, 19), (39, 20), (39, 21), (42, 22), (42, 23), (42, 24), (40, 25)]:
        k.set('detail', x, y, k.et('bush'))
    k.set('detail', 36, 16, k.et('sign_wood'))
    o('sign', 36, 16, text='TIMER\\nThe clock starts on the next row down\\fand stops on the far switch.\\nYou get a rank, never a fail.', anySide=True)
    o('zone', 36, 16, 10, 11, name='Timer Run')

    # R7 dark room (x 47..58): light radius 1, Dilate widens to 4 and finds hidden items
    k.room(47, 15, 58, 27, openings=[(49, 15)])
    for (x, y) in [(51, 18), (52, 18), (53, 18), (55, 20), (55, 21), (50, 22), (51, 22), (54, 24), (56, 24)]:
        k.set('detail', x, y, k.et('crate'))
    o('item', 56, 18, itemId='prompt_orb', count=2, flag='kit_hidden_1', hidden=True)
    o('item', 52, 25, itemId='patch', count=1, flag='kit_hidden_2', hidden=True)
    o('zone', 48, 16, 10, 11, name='Dark Room', dark=True, lightRadius=1)

    # ---------------------------------------------------------------- band C (y 30..41)
    # R8 ledges + tall grass (Backprop, Sample); falling leaves
    k.room(0, 30, 12, 42, openings=[(3, 30)])
    k.set('ground', 1, 33, k.et('ledge_s_end_w'))
    for x in range(2, 11):
        k.set('ground', x, 33, k.et('ledge_s'))
    k.set('ground', 11, 33, k.et('ledge_s_end_e'))
    for y in range(35, 41):
        for x in range(2, 11):
            k.set('ground', x, y, k.et('tall_grass_top' if y == 35 else 'tall_grass'))
    o('zone', 1, 31, 11, 11, name='Kit Meadow', music='route_101', encounters='route_101', weather='leaves')

    # R9 Embed blocks (x 13..24)
    k.room(12, 30, 24, 42, openings=[(15, 30)])
    o('block', 14, 33, id='emb_a1', kind='a', heavy=True, glyph='A')
    o('block', 22, 33, id='emb_a2', kind='a', heavy=True, glyph='A')
    o('block', 18, 37, id='emb_b1', kind='b', heavy=True, glyph='B')
    o('block', 18, 40, id='emb_b2', kind='b', heavy=True, glyph='B')
    o('switch', 20, 40, id='sw_e', mode='weight')
    k.set('detail', 13, 31, k.et('sign_wood'))
    o('sign', 13, 31, text='EMBED\\nHeavy blocks. With EMBED, A at a block\\fslides it to the nearest block of its kind.', anySide=True)
    o('zone', 13, 31, 11, 11, name='Embedding Yard')

    # R10 rough water (Normalize), fog
    k.room(24, 30, 36, 42, openings=[(27, 30)])
    o('floor', 25, 34, 11, 4, kind='rough_water')
    o('item', 30, 40, itemId='prompt_orb', count=3, flag='kit_item_water')
    o('zone', 25, 31, 11, 11, name='Rough Water', weather='fog', waterEncounters='route_101')

    # R11 gap + anchors (Chain Rule) + boulders (Merge)
    k.room(36, 30, 48, 42, openings=[(39, 30)])
    o('floor', 37, 34, 11, 2, kind='gap')
    o('anchor', 39, 33, id='anc_n')
    o('anchor', 39, 36, id='anc_s')
    o('boulder', 44, 33, id='bo_1', kind='stone')
    o('boulder', 45, 33, id='bo_2', kind='stone')
    o('item', 46, 40, itemId='great_orb', count=1, flag='kit_item_gap')
    o('zone', 37, 31, 11, 11, name='Chasm')

    # R12 EVAL light + interface tamper terminal, rain
    k.room(48, 30, 59, 42, openings=[(51, 30)])
    o('npc', 51, 34, id='kit_eval_npc', sprite='girl', facing='down', movement='wander', radius=1,
      text='Nobody’s watching, so I just do whatever\\nscores highest. Rules are for tests!',
      evalText='Oh! Hello! I always follow the rules.\\nAlways. Especially now.', evalMovement='static', evalFacing='down')
    o('npc', 56, 36, id='kit_eval_mon', sprite='hallucihound', facing='left', movement='look', hideWhen='eval',
      text='The HalluciHound is chewing on a test answer key.')
    o('npc', 56, 36, id='kit_eval_mon_good', sprite='hallucihound', facing='down', movement='static', showWhen='eval',
      text='The HalluciHound sits very still and looks very good.')
    k.set('detail', 50, 32, k.et('sign_wood'))
    o('sign', 50, 32, script='kit.eval_switch', anySide=True)
    o('npc', 55, 32, id='kit_terminal', sprite='clerk', facing='down', script='kit.tamper')
    o('zone', 49, 31, 10, 11, name='Eval Lab', weather='rain')

    # corridor zone (no banner spam: one name for both corridors)
    o('zone', 1, 13, 58, 2, name='Kit Park')
    o('zone', 1, 28, 58, 2, name='Kit Park')
    o('floor', 20, 28, 2, 1, kind='puddle')
    k.finish()
    return k


def build_east(cat):
    W, H = 22, 43
    k = Kit(W, H, cat, 11)
    o = k.m.obj
    k.grass()
    west_open = {(0, y) for y in (13, 14, 28, 29)}
    border = [(x, 0) for x in range(W)] + [(x, H - 1) for x in range(W)] + [(0, y) for y in range(H)] + [(W - 1, y) for y in range(H)]
    k.hedge([c for c in border if c not in west_open])
    k.area('path', [(x, y) for x in range(0, W - 1) for y in (13, 14, 28, 29)])
    o('floor', 1, 1, W - 2, H - 2, kind='snow', draw=True)
    o('floor', 6, 18, 8, 6, kind='ice')
    k.set('detail', 9, 20, k.et('rock'))
    o('floor', 4, 33, 3, 2, kind='puddle')
    k.set('detail', 2, 11, k.et('sign_wood'))
    o('sign', 2, 11, text='KIT EAST\\nYou walked in without a fade:\\na seamless map connection.', anySide=True)
    o('spawn', 3, 13, name='west', facing='right')
    o('npc', 14, 8, id='kit_snowman', sprite='boy', facing='down', movement='wander', radius=2,
      text='Snow keeps your footprints for a while.')
    o('zone', 1, 1, W - 2, H - 2, name='Kit East', music='route_101', weather='snow')
    k.finish()
    return k


def main():
    ext_cat, ext_tsj = load('exterior')
    tileset = dict(ext_tsj, firstgid=1, image='../tilesets/exterior.png')
    for key in ('type', 'version', 'tiledversion'):
        tileset.pop(key, None)
    kit = build_kit(ext_cat)
    kit.write('_kit', [tileset], {
        'name': 'Engine Kit', 'music': 'hayes_valley', 'indoor': False, 'onEnter': 'kit.on_enter',
        'connections': json.dumps({'east': {'map': '_kit_east', 'offset': 0}}),
        'puzzleReset': 'never',
    })
    east = build_east(ext_cat)
    east.write('_kit_east', [tileset], {
        'name': 'Kit East', 'music': 'route_101', 'indoor': False, 'onEnter': 'kit.on_enter',
        'west': '_kit', 'westOffset': 0,
    })


if __name__ == '__main__':
    main()
