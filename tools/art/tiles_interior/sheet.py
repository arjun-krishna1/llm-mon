"""Tileset registry: named tiles, stamps, autotiles -> png / tsj / catalog."""
import json

from PIL import Image

from cv import T, Cv, all_palette_colours

COLS = 16


def _key(im):
    return im.tobytes()


class Sheet:
    def __init__(self, name):
        self.name = name
        self.tiles = []        # PIL images 16x16
        self.props = {}        # id -> {prop: value}
        self.anims = {}        # id -> [(id, ms)]
        self.names = {}        # name -> id
        self.stamps = {}
        self.autotiles = {}
        self.walls = {}
        self._dedupe = {}      # (bytes, props) -> id   (stamp cells only)

    # -- low level ---------------------------------------------------------
    def _new(self, im, props=None):
        tid = len(self.tiles)
        self.tiles.append(im)
        if props:
            self.props[tid] = dict(props)
        return tid

    def new_row(self):
        while len(self.tiles) % COLS:
            self.tiles.append(Image.new('RGBA', (T, T), (0, 0, 0, 0)))

    def tile(self, name, img, frames=None, ms=None, **props):
        """Register a named 16x16 tile. img: Cv or PIL. frames: extra Cv."""
        im = img.im if isinstance(img, Cv) else img
        assert im.size == (T, T), (name, im.size)
        assert name not in self.names, name
        tid = self._new(im, props)
        if frames:
            ids = [tid]
            for f in frames:
                fi = f.im if isinstance(f, Cv) else f
                ids.append(self._new(fi, props))
            dur = ms if isinstance(ms, list) else [ms or 400] * len(ids)
            self.anims[tid] = list(zip(ids, dur))
        self.names[name] = tid
        return tid

    def _cell(self, im, props, dedupe=True):
        if im.getbbox() is None:
            return -1
        k = (_key(im), json.dumps(props, sort_keys=True))
        if dedupe and k in self._dedupe:
            return self._dedupe[k]
        tid = self._new(im, props)
        self._dedupe[k] = tid
        return tid

    # -- stamps ------------------------------------------------------------
    def stamp(self, name, img, layout, frames=None, ms=400, place='floor',
              note='', props=None, cell_props=None, base_layer='detail'):
        """Split a (w*16 x h*16) drawing into tiles.

        layout: list of strings, one char per cell:
          'B' base layer, solid      'b' base layer, walkable
          'O' over layer, walkable   'S' over layer AND solid
          'C' base, solid + counter  '.' must be empty
        frames: extra full-size Cv frames (animation) for cells that differ.
        cell_props: {(x, y): {prop: v}} extra properties.
        """
        im = img.im if isinstance(img, Cv) else img
        w, h = im.size[0] // T, im.size[1] // T
        assert len(layout) == h and all(len(r) == w for r in layout), name
        fr = [f.im if isinstance(f, Cv) else f for f in (frames or [])]
        base = [[-1] * w for _ in range(h)]
        over = [[-1] * w for _ in range(h)]
        for cy in range(h):
            for cx in range(w):
                code = layout[cy][cx]
                box = (cx * T, cy * T, cx * T + T, cy * T + T)
                ci = im.crop(box)
                p = dict(props or {})
                if code in 'BSC':
                    p['solid'] = True
                if code == 'C':
                    p['counter'] = True
                if cell_props and (cx, cy) in cell_props:
                    p.update(cell_props[(cx, cy)])
                fcells = [f.crop(box) for f in fr]
                animated = any(_key(f) != _key(ci) for f in fcells)
                if code == '.':
                    assert ci.getbbox() is None, (name, cx, cy, 'not empty')
                    continue
                if animated:
                    tid = self._new(ci, p)
                    ids = [tid] + [self._new(f, p) for f in fcells]
                    dur = ms if isinstance(ms, list) else [ms] * len(ids)
                    self.anims[tid] = list(zip(ids, dur))
                else:
                    tid = self._cell(ci, p)
                if code in 'OS':
                    over[cy][cx] = tid
                else:
                    base[cy][cx] = tid
        layers = {'base': base}
        if any(v != -1 for r in over for v in r):
            layers['over'] = over
        self.stamps[name] = {'w': w, 'h': h, 'place': place,
                             'base_layer': base_layer, 'layers': layers}
        if note:
            self.stamps[name]['note'] = note
        return self.stamps[name]

    # -- export ------------------------------------------------------------
    def check_palette(self):
        ok = all_palette_colours()
        bad = set()
        for im in self.tiles:
            for c in im.getdata():
                if c[3] and c not in ok:
                    bad.add(c)
        if bad:
            raise SystemExit(f'non-palette colours: {sorted(bad)[:10]}')

    def image(self):
        self.new_row()
        rows = len(self.tiles) // COLS
        out = Image.new('RGBA', (COLS * T, rows * T), (0, 0, 0, 0))
        for i, im in enumerate(self.tiles):
            out.paste(im, ((i % COLS) * T, (i // COLS) * T))
        return out

    def write(self, png_path, tsj_path, catalog_path):
        self.check_palette()
        im = self.image()
        im.save(png_path)
        tiles = []
        for tid in sorted(set(self.props) | set(self.anims)):
            e = {'id': tid}
            pr = self.props.get(tid)
            if pr:
                e['properties'] = [
                    {'name': k, 'type': 'bool' if isinstance(v, bool) else 'string',
                     'value': v} for k, v in sorted(pr.items())]
            if tid in self.anims:
                e['animation'] = [{'tileid': a, 'duration': d} for a, d in self.anims[tid]]
            tiles.append(e)
        tsj = {
            'type': 'tileset', 'version': '1.10', 'tiledversion': '1.10.2',
            'name': self.name, 'image': png_path.split('/')[-1],
            'imagewidth': im.width, 'imageheight': im.height,
            'tilewidth': T, 'tileheight': T, 'margin': 0, 'spacing': 0,
            'columns': COLS, 'tilecount': len(self.tiles), 'tiles': tiles,
        }
        with open(tsj_path, 'w') as f:
            json.dump(tsj, f, indent=1)
            f.write('\n')
        cat = {'tileset': self.name, 'tilesize': T, 'columns': COLS,
               'tiles': self.names, 'stamps': self.stamps,
               'autotiles': self.autotiles, 'walls': self.walls}
        with open(catalog_path, 'w') as f:
            json.dump(cat, f, indent=1)
            f.write('\n')
        return im
