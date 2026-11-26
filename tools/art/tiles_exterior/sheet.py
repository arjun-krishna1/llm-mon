"""Tile sheet allocator + Tiled/catalog writers.

Tiles are placed in rectangular blocks with a shelf packer so the PNG reads
like a hand-organised tileset (stamps appear assembled, autotile pieces sit
in their 3x3 + 2x2 layout).
"""
import json

from lib import Canvas, T

COLS = 16


class Sheet:
    def __init__(self):
        self.slots = {}     # id -> Canvas
        self.props = {}     # id -> dict
        self.anims = {}     # id -> [(tileid, ms), ...]
        self.col = 0
        self.row = 0
        self.shelf_h = 0
        self.tiles = {}     # catalog name -> id
        self.stamps = {}
        self.autotiles = {}
        self.notes = {}     # name -> short description (docs)

    # --- packing ------------------------------------------------------
    def newline(self):
        if self.col:
            self.row += self.shelf_h
            self.col = 0
            self.shelf_h = 0

    def block(self, w, h):
        assert w <= COLS
        if self.col + w > COLS:
            self.newline()
        c, r = self.col, self.row
        self.col += w
        self.shelf_h = max(self.shelf_h, h)
        return c, r

    def tid(self, c, r):
        return r * COLS + c

    def place(self, c, r, tile, props=None):
        """Place a 16x16 canvas in slot (c, r). Empty tiles return -1."""
        if tile.empty() and not props:
            return -1
        i = self.tid(c, r)
        assert i not in self.slots, ('slot taken', c, r)
        self.slots[i] = tile
        if props:
            self.props[i] = dict(props)
        return i

    def add(self, tile, props=None, name=None):
        c, r = self.block(1, 1)
        i = self.place(c, r, tile, props)
        if name:
            self.tiles[name] = i
        return i

    def add_grid(self, canvas, props_fn=None):
        """Slice a canvas (multiple of 16) into a block; returns 2D id list."""
        w, h = canvas.w // T, canvas.h // T
        c0, r0 = self.block(w, h)
        ids = []
        for j in range(h):
            row = []
            for i in range(w):
                t = canvas.crop(i * T, j * T, T, T)
                pr = props_fn(i, j) if props_fn else None
                row.append(self.place(c0 + i, r0 + j, t, pr))
            ids.append(row)
        return ids

    def animate(self, base_id, frame_ids, ms):
        self.anims[base_id] = [(f, ms if isinstance(ms, int) else ms[k])
                               for k, f in enumerate(frame_ids)]

    # --- output -------------------------------------------------------
    @property
    def rows(self):
        mx = max(self.slots) if self.slots else 0
        return mx // COLS + 1

    def image(self):
        cv = Canvas(COLS * T, self.rows * T)
        for i, t in self.slots.items():
            cv.blit(t, (i % COLS) * T, (i // COLS) * T)
        return cv

    def tsj(self, name, image_name):
        rows = self.rows
        tiles = []
        for i in sorted(set(self.props) | set(self.anims)):
            e = {'id': i}
            if i in self.anims:
                e['animation'] = [{'tileid': f, 'duration': d} for f, d in self.anims[i]]
            if i in self.props:
                pl = []
                for k, v in sorted(self.props[i].items()):
                    typ = 'bool' if isinstance(v, bool) else ('int' if isinstance(v, int) else 'string')
                    pl.append({'name': k, 'type': typ, 'value': v})
                e['properties'] = pl
            tiles.append(e)
        return {
            'columns': COLS, 'image': image_name,
            'imageheight': rows * T, 'imagewidth': COLS * T,
            'margin': 0, 'spacing': 0, 'name': name,
            'tilecount': rows * COLS, 'tileheight': T, 'tilewidth': T,
            'tiledversion': '1.10.2', 'type': 'tileset', 'version': '1.10',
            'tiles': tiles,
        }

    def catalog(self):
        return {'tileSize': T, 'columns': COLS,
                'tiles': self.tiles, 'stamps': self.stamps,
                'autotiles': self.autotiles}


def write_json(path, obj, compact_lists=True):
    txt = json.dumps(obj, indent=1)
    if compact_lists:
        # collapse innermost numeric lists onto one line for readability
        import re
        txt = re.sub(r'\[\s*((?:-?\d+,\s*)*-?\d+)\s*\]',
                     lambda m: '[' + ','.join(s.strip() for s in m.group(1).split(',')) + ']', txt)
    with open(path, 'w') as f:
        f.write(txt + '\n')
