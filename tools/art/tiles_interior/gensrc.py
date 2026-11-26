"""Load generated source art (tools/art/gen/raw/int_*.png) and reduce it to
tile scale with a palette-aware *mode* downsample (each target pixel takes the
most common snapped palette colour of its source block, with outline colours
given priority on thin features), which keeps colours crisp instead of the
muddy averages of a box filter.
"""
import os
from collections import Counter

from PIL import Image

from cv import Cv, O, OS, P, RAMPS

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.abspath(os.path.join(HERE, '..', 'gen', 'raw'))

_PAL = None


def palette_rgb():
    global _PAL
    if _PAL is None:
        cols = {O[:3], OS[:3]}
        for r in RAMPS:
            for c in r:
                cols.add(c[:3])
        for c in P.FLOWER.values():
            cols.add(c[:3])
        _PAL = sorted(cols)
    return _PAL


_cache = {}


def snap(c, pal=None):
    key = (c, id(pal))
    if key in _cache:
        return _cache[key]
    pal = pal or palette_rgb()
    r, g, b = c
    best = min(pal, key=lambda m: (m[0] - r) ** 2 * 3 + (m[1] - g) ** 2 * 4 + (m[2] - b) ** 2 * 2)
    _cache[key] = best
    return best


def is_bg(r, g, b):
    return r > 160 and b > 160 and g < 130 and abs(r - b) < 80


def lum(c):
    return (c[0] * 3 + c[1] * 4 + c[2] * 2) / 9


def load(name):
    return Image.open(os.path.join(RAW, name + '.png')).convert('RGB')


def subject_bbox(im):
    px = im.load()
    w, h = im.size
    x0, y0, x1, y1 = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if not is_bg(*px[x, y]):
                x0, y0 = min(x0, x), min(y0, y)
                x1, y1 = max(x1, x), max(y1, y)
    return x0, y0, x1 + 1, y1 + 1


def reduce(name, w, h, box=None, pal=None, dark_bias=0.34, fit='stretch',
           outline=True):
    """Downsample generated art `name` to exactly w x h (RGBA Cv).

    box: optional crop (x0, y0, x1, y1) in source pixels (else subject bbox).
    fit: 'stretch' fills w x h; 'contain' keeps aspect, bottom-centred.
    dark_bias: a block whose share of outline-dark pixels exceeds this
    becomes outline (keeps 1px lines through the downsample).
    """
    im = load(name)
    if box is None:
        box = subject_bbox(im)
    im = im.crop(box)
    sw, sh = im.size
    tw, th = w, h
    ox = oy = 0
    if fit == 'contain':
        s = min(w / sw, h / sh)
        tw, th = max(1, round(sw * s)), max(1, round(sh * s))
        ox, oy = (w - tw) // 2, h - th
    px = im.load()
    out = Cv(w, h)
    dark = {O[:3], OS[:3]}
    for ty in range(th):
        for tx in range(tw):
            xa, xb = int(tx * sw / tw), max(int(tx * sw / tw) + 1, int((tx + 1) * sw / tw))
            ya, yb = int(ty * sh / th), max(int(ty * sh / th) + 1, int((ty + 1) * sh / th))
            cnt = Counter()
            bg = 0
            n = 0
            # sample the inner part of the block (avoid neighbour bleed)
            for y in range(ya, yb):
                for x in range(xa, xb):
                    c = px[x, y]
                    n += 1
                    if is_bg(*c):
                        bg += 1
                        continue
                    cnt[snap(c, pal)] += 1
            if bg * 2 >= n or not cnt:
                continue
            darks = sum(v for k, v in cnt.items() if k in dark or lum(k) < 60)
            if darks / n > dark_bias:
                col = max((k for k in cnt if k in dark or lum(k) < 60),
                          key=lambda k: cnt[k])
            else:
                col = max((k for k in cnt if not (k in dark or lum(k) < 60)),
                          key=lambda k: cnt[k], default=None)
                if col is None:
                    col = cnt.most_common(1)[0][0]
            out.px(ox + tx, oy + ty, col + (255,))
    if outline:
        reink(out)
    return out


def reink(c):
    """Silhouette pixels that are light get the warm outline colour."""
    pts = []
    for y in range(c.h):
        for x in range(c.w):
            p = c.get(x, y)
            if not p[3]:
                continue
            edge = any(c.get(x + a, y + b)[3] == 0 for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if edge and lum(p) > 70:
                pts.append((x, y))
    for x, y in pts:
        c.px(x, y, O, force=True)
