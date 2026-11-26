"""Shared helpers for the ART-SPR generators (characters, creatures, battle, UI).

All drawing is palette-locked to tools/art/palette.py except creature sprites,
which keep a reduced version of their source colours (plan §3).
"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'art'))

import palette as P  # noqa: E402

SPRITES = os.path.join(ROOT, 'public', 'assets', 'game', 'sprites')
UI = os.path.join(ROOT, 'public', 'assets', 'game', 'ui')
PREVIEW = os.path.join(HERE, 'preview')
SRC_AI = os.path.join(ROOT, 'public', 'assets', 'llmmon', 'sprites-ai')
SRC_MYTHOS = os.path.join(ROOT, 'public', 'assets', 'llmmon', 'mythos', 'generated')

CLEAR = (0, 0, 0, 0)
OUT = P.OUTLINE


def out_path(*parts):
    p = os.path.join(*parts)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    return p


def save(img, *parts):
    p = out_path(*parts)
    img.save(p)
    return p


def new(w, h, fill=CLEAR):
    return Image.new('RGBA', (w, h), fill)


def grid_to_image(rows, cmap, w=None, h=None):
    """rows: list of strings; cmap: char -> RGBA (missing / '.' = clear)."""
    h = h or len(rows)
    w = w or max(len(r) for r in rows)
    im = new(w, h)
    px = im.load()
    for y, row in enumerate(rows[:h]):
        for x, ch in enumerate(row[:w]):
            c = cmap.get(ch)
            if c is not None and ch != '.':
                px[x, y] = c
    return im


def outline(im, color=OUT, diag=False):
    """Add a 1px outline around every opaque region (outside, 4- or 8-connected)."""
    w, h = im.size
    src = im.load()
    res = im.copy()
    dst = res.load()
    nb = [(1, 0), (-1, 0), (0, 1), (0, -1)]
    if diag:
        nb += [(1, 1), (-1, -1), (1, -1), (-1, 1)]
    for y in range(h):
        for x in range(w):
            if src[x, y][3] != 0:
                continue
            for dx, dy in nb:
                xx, yy = x + dx, y + dy
                if 0 <= xx < w and 0 <= yy < h and src[xx, yy][3] != 0:
                    dst[x, y] = color
                    break
    return res


def rect(im, x, y, w, h, c):
    px = im.load()
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            if 0 <= xx < im.width and 0 <= yy < im.height:
                px[xx, yy] = c


def hline(im, x0, x1, y, c):
    rect(im, x0, y, x1 - x0 + 1, 1, c)


def vline(im, x, y0, y1, c):
    rect(im, x, y0, 1, y1 - y0 + 1, c)


def put(im, x, y, c):
    if 0 <= x < im.width and 0 <= y < im.height:
        im.load()[x, y] = c


def scale(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(len(a)))


def nearest(c, cols):
    best, bd = None, 1e18
    for k in cols:
        d = sum((int(c[i]) - k[i]) ** 2 for i in range(3))
        if d < bd:
            best, bd = k, d
    return best


def all_palette_colours():
    cols = []
    for name in dir(P):
        v = getattr(P, name)
        if isinstance(v, list) and v and isinstance(v[0], tuple):
            cols += v
        elif isinstance(v, tuple) and len(v) == 4 and v[3] == 255:
            cols.append(v)
        elif isinstance(v, dict):
            cols += [c for c in v.values() if isinstance(c, tuple)]
    return cols
