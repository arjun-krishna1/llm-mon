"""Load generated source art (tools/art/gen/raw/ext_*.png) as palette-locked
Canvas sprites.

Wraps the shared tools/art/gen/pixelize.py with two exterior-specific
pre-steps: the magenta background is removed by flood fill from the image
border (so violet/pink roofs are not keyed out) and saturation gets a small
boost so tiny glass panes stay blue after downscaling.
"""
import os
import tempfile
from collections import deque

from PIL import Image, ImageEnhance

import lib  # noqa: F401  (sets sys.path to tools/art)
import gen.pixelize as PX
import palette as P
from lib import Canvas

RAW = os.path.join(os.path.dirname(lib.HERE), 'gen', 'raw')
_cache = {}


def _bgish(c):
    r, g, b = c[:3]
    return r > 150 and b > 150 and g < 110 and abs(r - b) < 80


def _key_border(im):
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        if not (0 <= x < w and 0 <= y < h) or seen[y * w + x]:
            continue
        seen[y * w + x] = 1
        if not _bgish(px[x, y]):
            continue
        px[x, y] = (0, 0, 0, 0)
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    # fringe pixels: strongly magenta-tinted pixels touching the cleared area
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and r > 170 and b > 150 and g < 120:
                if any(0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3] == 0
                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    px[x, y] = (0, 0, 0, 0)
    return im


def sprite(name, width=None, height=None, colors=48, sat=1.3):
    key = (name, width, height, colors, sat)
    if key in _cache:
        return _cache[key].copy()
    src = Image.open(os.path.join(RAW, name + '.png'))
    im = _key_border(src)
    if sat != 1.0:
        a = im.getchannel('A')
        im = ImageEnhance.Color(im.convert('RGB')).enhance(sat).convert('RGBA')
        im.putalpha(a)
    fd, tmp = tempfile.mkstemp(suffix='.png')
    os.close(fd)
    im.save(tmp)
    old = PX._is_bg
    PX._is_bg = lambda r, g, b: False
    try:
        out = PX.pixelize(tmp, width=width, height=height, colors=colors)
    finally:
        PX._is_bg = old
        os.remove(tmp)
    cv = Canvas(out.width, out.height)
    data = list(out.getdata())
    for y in range(out.height):
        for x in range(out.width):
            c = data[y * out.width + x]
            cv.px[y][x] = c if c[3] else P.CLEAR
    _cache[key] = cv
    return cv.copy()


def _lum(c):
    return c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11


def resnap(cv, colours, keep=()):
    """Re-snap every opaque pixel to the nearest of `colours` (RGB distance,
    luminance-weighted) except colours listed in `keep`."""
    cache = {}
    for y in range(cv.h):
        for x in range(cv.w):
            c = cv.px[y][x]
            if c[3] != 255 or c in keep:
                continue
            if c not in cache:
                cache[c] = min(colours, key=lambda m: (m[0] - c[0]) ** 2 * 3 + (m[1] - c[1]) ** 2 * 4
                               + (m[2] - c[2]) ** 2 * 2 + (_lum(m) - _lum(c)) ** 2 * 4)
            cv.px[y][x] = cache[c]
    return cv


def remap_ramp(cv, region, src_cols, ramp):
    """Recolour pixels (within region=(x,y,w,h) or None) whose colour is in
    src_cols onto `ramp` by luminance rank."""
    src = sorted(set(src_cols), key=_lum)
    lo, hi = _lum(src[0]), _lum(src[-1])
    x0, y0, w, h = region or (0, 0, cv.w, cv.h)
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            c = cv.get(x, y)
            if c in src:
                t = 0 if hi == lo else (_lum(c) - lo) / (hi - lo)
                cv.set(x, y, ramp[min(len(ramp) - 1, int(t * len(ramp)))])
    return cv
