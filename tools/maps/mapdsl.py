"""LLMMON map DSL: ASCII layers + legend + stamps/autotiles + typed objects
-> Tiled .tmj (orthogonal, 16px, EMBEDDED tilesets, CSV-free array data).

Usage (see overworld.py / interiors.py):

    m = MapDef('lab', 14, 11, tilesets=['interior'], props={'music': 'lab', 'indoor': True})
    m.tile('ground', x, y, 'floor_lab')            # catalog name (first tileset that has it)
    m.stamp('lab_core', x, y)                       # catalog stamp: base -> its layer, over -> 'over'
    m.area('path', cells)                           # 47-piece blob autotile (exterior)
    m.forest(cells)                                 # forest wall from a set of cells (2x3 lattice)
    m.fence('wood', cells)
    m.paint(ascii, legend, ox, oy)                  # ASCII grid -> ground/detail/stamps (legend below)
    m.npc('mom', 5, 4, sprite='mom', script='home.mom', facing='down')
    m.warp(x, y, 'overworld', 'home_door'); m.spawn('entrance', x, y, facing='up')
    m.sign(x, y, text='...') ; m.trigger(x, y, w, h, script='...', once=None, ifFlag=None, unlessFlag=None)
    m.item(x, y, 'patch', flag='item_x'); m.zone(x, y, w, h, name=, music=, encounters=)
    m.write(path)  /  m.render(...) for previews

Layers (file order): ground, detail, detail2, over, over2 (+ objects).
A tileset 'props' (tools/maps/props.py -> public/assets/game/maps/props.png) adds
an invisible blocker tile and the moving truck.
"""
import json
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
TS_DIR = os.path.join(ROOT, 'public', 'assets', 'game', 'tilesets')
MAP_DIR = os.path.join(ROOT, 'public', 'assets', 'game', 'maps')
SPRITES = os.path.join(ROOT, 'public', 'assets', 'game', 'sprites')
T = 16
LAYERS = ('ground', 'detail', 'detail2', 'over', 'over2')


# ----------------------------------------------------------------------------- tilesets
class Tileset:
    _cache = {}

    def __init__(self, name):
        self.name = name
        if name == 'props':
            d = MAP_DIR
            self.image_rel = 'props.png'
        else:
            d = TS_DIR
            self.image_rel = '../tilesets/%s.png' % name
        with open(os.path.join(d, name + '.tsj')) as f:
            self.tsj = json.load(f)
        cat_path = os.path.join(d, name + '.catalog.json')
        with open(cat_path) as f:
            self.cat = json.load(f)
        self.image_path = os.path.join(d, name + '.png')
        self.props = {}
        self.anims = {}
        for t in self.tsj.get('tiles', []):
            p = {x['name']: x['value'] for x in t.get('properties', [])}
            if p:
                self.props[t['id']] = p
            if 'animation' in t:
                self.anims[t['id']] = [a['tileid'] for a in t['animation']]
        self.count = self.tsj['tilecount']
        self._img = None

    @classmethod
    def get(cls, name):
        if name not in cls._cache:
            cls._cache[name] = Tileset(name)
        return cls._cache[name]

    @property
    def img(self):
        if self._img is None:
            self._img = Image.open(self.image_path).convert('RGBA')
        return self._img

    def crop(self, tid):
        cols = self.tsj['columns']
        x, y = (tid % cols) * T, (tid // cols) * T
        return self.img.crop((x, y, x + T, y + T))

    def embedded(self, firstgid):
        d = dict(self.tsj)
        d.pop('type', None)
        d.pop('version', None)
        d.pop('tiledversion', None)
        d['image'] = self.image_rel
        d['firstgid'] = firstgid
        return d


# ----------------------------------------------------------------------------- helpers
def rect(x0, y0, x1, y1):
    """Inclusive cell rectangle."""
    return {(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)}


def h32(x, y, salt=0):
    v = (x * 73856093) ^ (y * 19349663) ^ (salt * 83492791)
    v = (v ^ (v >> 13)) * 1274126177
    return (v ^ (v >> 16)) & 0xffffffff


def prop_list(d):
    out = []
    for k, v in d.items():
        if v is None:
            continue
        t = 'bool' if isinstance(v, bool) else 'int' if isinstance(v, int) else 'float' if isinstance(v, float) else 'string'
        out.append({'name': k, 'type': t, 'value': v})
    return out


class MapDef:
    def __init__(self, id, w, h, tilesets=('exterior',), props=None):
        self.id, self.w, self.h = id, w, h
        self.tilesets = []
        gid = 1
        for name in list(tilesets) + ['props']:
            ts = Tileset.get(name)
            self.tilesets.append((ts, gid))
            gid += ts.count
        self.props = dict(props or {})
        self.L = {n: [[0] * w for _ in range(h)] for n in LAYERS}   # gids, 0 = empty
        self.objects = []
        self.warnings = []
        self.marks = {}     # ascii overlay markers: char -> [(x,y)]

    # ------------------------------------------------------------- tile access
    def ts(self, name):
        for ts, first in self.tilesets:
            if ts.name == name:
                return ts, first
        raise KeyError(name)

    def gid(self, name, tileset=None):
        """Catalog tile name -> gid (searches tilesets in order)."""
        if isinstance(name, int):
            return name
        for ts, first in self.tilesets:
            if tileset and ts.name != tileset:
                continue
            if name in ts.cat.get('tiles', {}):
                return first + ts.cat['tiles'][name]
        raise KeyError('tile %r' % name)

    def set(self, layer, x, y, gid):
        if 0 <= x < self.w and 0 <= y < self.h and gid and gid > 0:
            self.L[layer][y][x] = gid

    def clear(self, layer, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.L[layer][y][x] = 0

    def tile(self, layer, x, y, name, tileset=None):
        self.set(layer, x, y, self.gid(name, tileset))

    def stamp(self, name, x, y, base=None, tileset=None):
        """Catalog stamp with its top-left at (x, y). base layer defaults to the
        stamp's `base_layer` (interior) or 'detail'."""
        for ts, first in self.tilesets:
            if tileset and ts.name != tileset:
                continue
            st = ts.cat.get('stamps', {}).get(name)
            if st is None:
                continue
            bl = base or st.get('base_layer', 'detail')
            for lname, grid in st['layers'].items():
                dst = 'over' if lname == 'over' else bl
                for j, row in enumerate(grid):
                    for i, tid in enumerate(row):
                        if tid is not None and tid >= 0:
                            self.set(dst, x + i, y + j, first + tid)
            return st
        raise KeyError('stamp %r' % name)

    def stamp_size(self, name):
        for ts, _ in self.tilesets:
            st = ts.cat.get('stamps', {}).get(name)
            if st:
                return st['w'], st['h']
        raise KeyError(name)

    def props_at(self, x, y):
        """Merged tile properties of every layer at (x, y) (engine semantics)."""
        out = {}
        if not (0 <= x < self.w and 0 <= y < self.h):
            return {'solid': True}
        for n in LAYERS:
            g = self.L[n][y][x]
            if not g:
                continue
            for ts, first in self.tilesets:
                if first <= g < first + ts.count:
                    out.update(ts.props.get(g - first, {}))
        return out

    def solid(self, x, y):
        p = self.props_at(x, y)
        return bool(p.get('solid') or p.get('water') or p.get('counter'))

    # ------------------------------------------------------------- exterior autotiles
    def area(self, kind, cells, layer='ground'):
        ts, first = self.ts('exterior')
        blob = ts.cat['autotiles'][kind]['blob']
        for (x, y) in cells:
            def has(dx, dy):
                q = (x + dx, y + dy)
                if not (0 <= q[0] < self.w and 0 <= q[1] < self.h):
                    return True
                return q in cells
            nb = {'n': has(0, -1), 'ne': has(1, -1), 'e': has(1, 0), 'se': has(1, 1),
                  's': has(0, 1), 'sw': has(-1, 1), 'w': has(-1, 0), 'nw': has(-1, -1)}
            for d, (a, b) in {'ne': ('n', 'e'), 'se': ('s', 'e'), 'sw': ('s', 'w'), 'nw': ('n', 'w')}.items():
                if not (nb[a] and nb[b]):
                    nb[d] = False
            key = ''.join('1' if nb[k] else '0' for k in ('n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'))
            tid = blob[key]
            cv = ts.cat['autotiles'][kind].get('c_variants')
            if key == '11111111' and cv:
                tid = cv[h32(x, y, 11) % len(cv)]
            self.set(layer, x, y, first + tid)

    def forest(self, cells, layer='detail', yparity=1):
        """Fill a set of cells with a forest wall. Trees sit on a lattice
        (ax even, ay % 2 == yparity); a tree is placed where its whole 2x3
        footprint lies in `cells` (off-map counts as forest). Cells no tree
        covers are reported as warnings."""
        ts, first = self.ts('exterior')
        F = ts.cat['autotiles']['forest']
        cells = set(cells)

        def inside(x, y):
            return (x, y) in cells or not (0 <= x < self.w and 0 <= y < self.h)
        anchors = set()
        for ax in range(-2, self.w + 2, 2):
            for ay in range(-3 + ((yparity + 3) % 2), self.h + 2, 2):
                if all(inside(ax + i, ay + j) for i in (0, 1) for j in (0, 1, 2)):
                    anchors.add((ax, ay))
        covered = set()
        for (ax, ay) in anchors:
            for i in (0, 1):
                for j in (0, 1, 2):
                    covered.add((ax + i, ay + j))
        for (ax, ay) in sorted(anchors, key=lambda a: a[1]):
            for dy, kind in ((0, 'top'), (1, 'mid'), (2, 'bottom')):
                y = ay + dy
                if kind == 'top' and (ax, ay - 2) in anchors:
                    kind = 'join'
                if kind == 'bottom' and (ax, ay + 2) in anchors:
                    continue
                lk = 'l_in' if (ax - 2, ay) in anchors else 'l_out'
                rk = 'r_in' if (ax + 2, ay) in anchors else 'r_out'
                self.set(layer, ax, y, first + F[kind + '_' + lk])
                self.set(layer, ax + 1, y, first + F[kind + '_' + rk])
        missing = sorted(c for c in cells if c not in covered and 0 <= c[0] < self.w and 0 <= c[1] < self.h)
        if missing:
            self.warnings.append('forest: %d cells not covered by a tree, e.g. %s' % (len(missing), missing[:6]))
            for (x, y) in missing:
                self.tile(layer, x, y, 'bush')
        return anchors

    def fence(self, style, cells, layer='detail'):
        ts, first = self.ts('exterior')
        by = ts.cat['autotiles']['fence_' + style]['byConnection']
        cells = set(cells)
        for (x, y) in cells:
            conn = ''.join(d for d, (dx, dy) in (('n', (0, -1)), ('e', (1, 0)), ('s', (0, 1)), ('w', (-1, 0)))
                           if (x + dx, y + dy) in cells)
            self.set(layer, x, y, first + by[conn])

    def grass(self, cells, calm=False, salt=0):
        for (x, y) in cells:
            hv = h32(x, y, salt) % 100
            if calm:
                v = 'd' if hv < 70 else 'a'
            else:
                v = 'a' if hv < 40 else 'd' if hv < 72 else 'b' if hv < 86 else 'c'
            self.tile('ground', x, y, 'grass_' + v)

    def ledges(self, cells):
        """Down-ledge runs ('v' cells): end caps added automatically."""
        for (x, y) in cells:
            w_ = (x - 1, y) in cells
            e_ = (x + 1, y) in cells
            name = 'ledge_s' if (w_ and e_) else 'ledge_s_end_w' if e_ else 'ledge_s_end_e' if w_ else 'ledge_s'
            self.tile('ground', x, y, name)

    # ------------------------------------------------------------- ASCII painting
    def paint(self, rows, legend, ox=0, oy=0, yparity=1, scatter=0):
        """Paint an ASCII block. `rows` is a list of strings (or a multi-line
        string). Legend values:
          'grass' | 'calm' | ('tile', name) | ('tile', name, layer)
          ('area', kind)       path / sand / water (blob autotile; grass under margins)
          'forest'             forest wall cell
          ('fence', style)     wood / white
          'tall'               tall grass (top row picks tall_grass_top)
          'ledge'              down-ledge run with end caps
          ('stamp', name, dx, dy)  stamp whose top-left is at (x+dx, y+dy); other
                               footprint cells should be '#' (grass under)
          ('mark', base)       record an overlay marker (self.marks[ch]) and paint `base`
          ('multi', a, b...)   apply several of the above
        Unknown characters raise."""
        if isinstance(rows, str):
            rows = [r for r in rows.strip('\n').split('\n')]
        groups = {}
        stamps = []
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                x, y = ox + i, oy + j
                if ch not in legend:
                    raise ValueError('%s: unknown char %r at %d,%d' % (self.id, ch, x, y))
                spec = legend[ch]
                specs = list(spec[1:]) if isinstance(spec, tuple) and spec[0] == 'multi' else [spec]
                for sp in specs:
                    if isinstance(sp, tuple) and sp[0] == 'mark':
                        self.marks.setdefault(ch, []).append((x, y))
                        sp = sp[1]
                    key = sp if isinstance(sp, str) else sp[0] + ':' + str(sp[1]) if sp[0] in ('area', 'fence') else None
                    if key:
                        groups.setdefault(key, set()).add((x, y))
                    elif sp[0] == 'tile':
                        groups.setdefault('calm', set()).add((x, y))
                        stamps.append(('tile', sp, x, y))
                    elif sp[0] == 'stamp':
                        groups.setdefault('calm', set()).add((x, y))
                        stamps.append(('stamp', sp, x, y))
                    elif sp[0] == 'props':
                        groups.setdefault('calm', set()).add((x, y))
                        stamps.append(('props', sp, x, y))
        # ground first: grass everywhere painted
        allc = set().union(*groups.values()) if groups else set()
        self.grass(allc)
        if 'calm' in groups:
            self.grass(groups['calm'], calm=True)
        if scatter and 'grass' in groups:
            cols = ('flower_yellow', 'flower_white', 'flower_red', 'flower_pink')
            for (x, y) in groups['grass']:
                hv = h32(x, y, 7) % 1000
                if hv < scatter:
                    self.tile('ground', x, y, cols[h32(x, y, 3) % 4])
        for k, cells in groups.items():
            if k.startswith('area:'):
                self.area(k[5:], cells)
            elif k.startswith('fence:'):
                self.fence(k[6:], cells)
        if 'forest' in groups:
            self.forest(groups['forest'], yparity=yparity)
        if 'tall' in groups:
            tg = groups['tall']
            for (x, y) in tg:
                self.tile('ground', x, y, 'tall_grass' if (x, y - 1) in tg else 'tall_grass_top')
        if 'ledge' in groups:
            self.ledges(groups['ledge'])
        for kind, sp, x, y in stamps:
            if kind == 'tile':
                layer = sp[2] if len(sp) > 2 else ('ground' if sp[1].startswith(('flower', 'grass', 'steps', 'ledge')) else 'detail')
                self.tile(layer, x, y, sp[1])
            elif kind == 'stamp':
                dx = sp[2] if len(sp) > 2 else 0
                dy = sp[3] if len(sp) > 3 else 0
                self.stamp(sp[1], x + dx, y + dy)
            elif kind == 'props':
                self.props_stamp(sp[1], x, y)
        return groups

    def props_stamp(self, name, x, y):
        ts, first = self.ts('props')
        st = ts.cat['stamps'][name]
        for lname, grid in st['layers'].items():
            dst = 'over' if lname == 'over' else 'detail'
            for j, row in enumerate(grid):
                for i, tid in enumerate(row):
                    if tid >= 0:
                        self.set(dst, x + i, y + j, first + tid)

    def block(self, x, y, layer='detail2'):
        """Invisible solid blocker (props tileset)."""
        ts, first = self.ts('props')
        self.set(layer, x, y, first + ts.cat['tiles']['blocker'])

    def mark(self, ch, i=None):
        pts = self.marks.get(ch, [])
        if not pts:
            raise KeyError('%s: no marker %r' % (self.id, ch))
        if i is None:
            if len(pts) != 1:
                raise ValueError('%s: marker %r appears %d times' % (self.id, ch, len(pts)))
            return pts[0]
        return pts[i]

    def mark_rect(self, ch):
        pts = self.marks[ch]
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        return min(xs), min(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1

    # ------------------------------------------------------------- objects
    def obj(self, type_, x, y, w=1, h=1, name='', **props):
        o = {'type': type_, 'name': name, 'x': x, 'y': y, 'w': w, 'h': h,
             'props': {k: v for k, v in props.items() if v is not None}}
        self.objects.append(o)
        return o

    def spawn(self, name, x, y, facing=None):
        return self.obj('spawn', x, y, name=name, facing=facing)

    def warp(self, x, y, toMap, toSpawn, facing=None, sfx=None, w=1, h=1, name=''):
        return self.obj('warp', x, y, w, h, name=name or 'to_%s_%s' % (toMap, toSpawn),
                        toMap=toMap, toSpawn=toSpawn, facing=facing, sfx=sfx)

    def door(self, x, y, toMap, toSpawn, spawn_name, facing_in='up', sfx=None):
        """Warp on a door tile + a spawn on the same tile (arrivals face down and step out)."""
        self.warp(x, y, toMap, toSpawn, facing=facing_in, sfx=sfx)
        self.spawn(spawn_name, x, y, facing='down')

    def npc(self, id, x, y, sprite, script=None, facing='down', movement='static', **kw):
        return self.obj('npc', x, y, name=id, id=id, sprite=sprite, script=script, facing=facing,
                        movement=movement, **kw)

    def sign(self, x, y, text=None, script=None, name='', anySide=None):
        """Readable object. The engine reads signs only when facing up (from below)
        unless `anySide` is set (furniture, stumps, machines...)."""
        return self.obj('sign', x, y, name=name, text=text, script=script, anySide=anySide)

    def trigger(self, x, y, w, h, script=None, once=None, ifFlag=None, unlessFlag=None, name=''):
        return self.obj('trigger', x, y, w, h, name=name or script or once, script=script, once=once,
                        ifFlag=ifFlag, unlessFlag=unlessFlag)

    def item(self, x, y, itemId, flag, count=1, hidden=None):
        return self.obj('item', x, y, name=flag, itemId=itemId, count=count, flag=flag, hidden=hidden)

    def zone(self, x, y, w, h, name, music=None, encounters=None):
        return self.obj('zone', x, y, w, h, name=name, music=music, encounters=encounters)

    def prop(self, id, x, y, sprite, w=1, h=1, **kw):
        """Sprite prop (engine support requested): image anchored bottom-left of the rect."""
        return self.obj('prop', x, y, w, h, name=id, id=id, sprite=sprite, **kw)

    def find(self, type_, name):
        for o in self.objects:
            if o['type'] == type_ and o['name'] == name:
                return o
        return None

    # ------------------------------------------------------------- export
    def to_tmj(self):
        layers = []
        lid = 1
        for n in LAYERS:
            data = [g for row in self.L[n] for g in row]
            if n in ('detail2', 'over2') and not any(data):
                continue
            layers.append({'id': lid, 'name': n, 'type': 'tilelayer', 'x': 0, 'y': 0,
                           'width': self.w, 'height': self.h, 'opacity': 1, 'visible': True, 'data': data})
            lid += 1
        objs = []
        for k, o in enumerate(self.objects, start=1):
            d = {'id': k, 'name': o['name'], 'type': o['type'], 'x': o['x'] * T, 'y': o['y'] * T,
                 'width': o['w'] * T, 'height': o['h'] * T, 'rotation': 0, 'visible': True}
            pl = prop_list(o['props'])
            if pl:
                d['properties'] = pl
            objs.append(d)
        layers.append({'id': lid, 'name': 'objects', 'type': 'objectgroup', 'draworder': 'topdown',
                       'x': 0, 'y': 0, 'opacity': 1, 'visible': True, 'objects': objs})
        return {
            'type': 'map', 'version': '1.10', 'tiledversion': '1.10.2', 'orientation': 'orthogonal',
            'renderorder': 'right-down', 'infinite': False, 'compressionlevel': -1,
            'width': self.w, 'height': self.h, 'tilewidth': T, 'tileheight': T,
            'nextlayerid': lid + 1, 'nextobjectid': len(objs) + 1,
            'properties': prop_list(self.props),
            'tilesets': [ts.embedded(first) for ts, first in self.tilesets],
            'layers': layers,
        }

    def write(self, path=None):
        path = path or os.path.join(MAP_DIR, self.id + '.tmj')
        with open(path, 'w') as f:
            json.dump(self.to_tmj(), f, separators=(',', ':'))
        return path

    # ------------------------------------------------------------- preview
    def tile_img(self, gid, frame=0):
        for ts, first in self.tilesets:
            if first <= gid < first + ts.count:
                tid = gid - first
                if tid in ts.anims:
                    fr = ts.anims[tid]
                    tid = fr[frame % len(fr)]
                return ts.crop(tid)
        return None

    def render(self, annotate=False, frame=0, sprites=True):
        img = Image.new('RGBA', (self.w * T, self.h * T), (0, 0, 0, 255))
        cache = {}

        def ti(g):
            if g not in cache:
                cache[g] = self.tile_img(g, frame)
            return cache[g]
        for n in ('ground', 'detail', 'detail2'):
            for y in range(self.h):
                for x in range(self.w):
                    g = self.L[n][y][x]
                    if g:
                        img.alpha_composite(ti(g), (x * T, y * T))
        if sprites:
            spr = []
            for o in self.objects:
                p = o['props']
                if o['type'] == 'npc' and not p.get('showIfFlag'):
                    im = char_frame(p.get('sprite', 'boy'), p.get('facing', 'down'))
                    if im:
                        spr.append((im, o['x'] * T, o['y'] * T - 8, o['y']))
                elif o['type'] == 'item' and not p.get('hidden'):
                    im = load_sprite('fx/item_ball')
                    if im:
                        spr.append((im, o['x'] * T, o['y'] * T, o['y']))
                elif o['type'] == 'prop' and not p.get('showIfFlag'):
                    im = load_sprite(p['sprite'])
                    if im:
                        spr.append((im, o['x'] * T, (o['y'] + o['h']) * T - im.height, o['y'] + o['h']))
            for im, px, py, _ in sorted(spr, key=lambda s: s[3]):
                img.alpha_composite(im, (px, py))
        for n in ('over', 'over2'):
            for y in range(self.h):
                for x in range(self.w):
                    g = self.L[n][y][x]
                    if g:
                        img.alpha_composite(ti(g), (x * T, y * T))
        if annotate:
            self._annotate(img)
        return img

    def _annotate(self, img):
        ov = Image.new('RGBA', img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(ov)
        col = {'warp': (40, 120, 255), 'spawn': (40, 220, 80), 'trigger': (255, 40, 40), 'sign': (255, 220, 0),
               'zone': (255, 255, 255), 'item': (255, 0, 255), 'npc': (255, 140, 0), 'prop': (0, 255, 255)}
        for o in self.objects:
            c = col.get(o['type'], (200, 200, 200))
            x0, y0 = o['x'] * T, o['y'] * T
            x1, y1 = x0 + o['w'] * T - 1, y0 + o['h'] * T - 1
            if o['type'] == 'zone':
                d.rectangle((x0 + 1, y0 + 1, x1 - 1, y1 - 1), outline=c + (200,), width=1)
                d.text((x0 + 4, y0 + 3), o['name'], fill=c + (255,))
            elif o['type'] == 'trigger':
                d.rectangle((x0, y0, x1, y1), fill=c + (70,), outline=c + (255,))
            elif o['type'] == 'spawn':
                d.ellipse((x0 + 5, y0 + 5, x0 + 10, y0 + 10), fill=c + (255,))
            elif o['type'] == 'npc':
                sight = o['props'].get('sight')
                if sight:
                    dx, dy = {'down': (0, 1), 'up': (0, -1), 'left': (-1, 0), 'right': (1, 0)}[o['props']['facing']]
                    for k in range(1, int(sight) + 1):
                        sx, sy = o['x'] + dx * k, o['y'] + dy * k
                        if self.solid(sx, sy):
                            break
                        d.rectangle((sx * T + 4, sy * T + 4, sx * T + 11, sy * T + 11), fill=(255, 60, 0, 110))
                d.text((x0, y0 - 18), o['props'].get('id', ''), fill=c + (255,))
            elif o['type'] == 'item':
                d.rectangle((x0, y0, x1, y1), outline=c + (255,))
                if o['props'].get('hidden'):
                    d.text((x0 + 2, y0 + 2), 'H', fill=c + (255,))
            else:
                d.rectangle((x0, y0, x1, y1), outline=c + (255,), width=2 if o['type'] == 'warp' else 1)
        img.alpha_composite(ov)


_sprite_cache = {}


def load_sprite(key):
    if key not in _sprite_cache:
        p = os.path.join(SPRITES, key + '.png')
        _sprite_cache[key] = Image.open(p).convert('RGBA') if os.path.exists(p) else None
    return _sprite_cache[key]


def char_frame(sprite, facing):
    im = load_sprite('chars/' + sprite)
    if im is None:
        return None
    row = {'down': 0, 'up': 1, 'left': 2, 'right': 3}.get(facing, 0)
    return im.crop((0, row * 24, 16, row * 24 + 24))
