"""Small pixel-art toolkit for the exterior tileset.

Everything is drawn into `Canvas` objects (lists of RGBA tuples) with explicit,
hand-placed pixels. Colours must come from tools/art/palette.py.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))  # tools/art

import palette as P  # noqa: E402
from PIL import Image  # noqa: E402

CLEAR = P.CLEAR
T = 16


class Canvas:
    def __init__(self, w, h, fill=CLEAR):
        self.w, self.h = w, h
        self.px = [[fill] * w for _ in range(h)]

    # --- basic access -------------------------------------------------
    def inb(self, x, y):
        return 0 <= x < self.w and 0 <= y < self.h

    def get(self, x, y, default=CLEAR):
        if self.inb(x, y):
            return self.px[y][x]
        return default

    def set(self, x, y, c):
        if c is None:
            return
        if self.inb(x, y):
            self.px[y][x] = c

    def put(self, x, y, c):
        """Set, but a translucent colour only lands on empty pixels."""
        if c is None or not self.inb(x, y):
            return
        if c[3] < 255 and self.px[y][x][3] != 0:
            return
        self.px[y][x] = c

    def opaque(self, x, y):
        return self.get(x, y)[3] == 255

    def filled(self, x, y):
        return self.get(x, y)[3] != 0

    # --- shapes -------------------------------------------------------
    def rect(self, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.set(xx, yy, c)

    def hline(self, x0, x1, y, c):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            self.set(x, y, c)

    def vline(self, x, y0, y1, c):
        for y in range(min(y0, y1), max(y0, y1) + 1):
            self.set(x, y, c)

    def frame(self, x, y, w, h, c):
        self.hline(x, x + w - 1, y, c)
        self.hline(x, x + w - 1, y + h - 1, c)
        self.vline(x, y, y + h - 1, c)
        self.vline(x + w - 1, y, y + h - 1, c)

    def ellipse_mask(self, cx, cy, rx, ry):
        pts = []
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                dx = (x + 0.5 - cx) / rx
                dy = (y + 0.5 - cy) / ry
                if dx * dx + dy * dy <= 1.0:
                    pts.append((x, y))
        return pts

    def ellipse(self, cx, cy, rx, ry, c):
        for x, y in self.ellipse_mask(cx, cy, rx, ry):
            self.put(x, y, c)

    def pmap(self, ox, oy, rows, legend):
        """Draw a pixel map. rows: list of strings; legend: char -> colour.
        Space and '.' are transparent (skipped)."""
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch in ' .':
                    continue
                self.set(ox + i, oy + j, legend[ch])

    def blit(self, src, ox, oy):
        for y in range(src.h):
            for x in range(src.w):
                c = src.px[y][x]
                if c[3] == 0:
                    continue
                if c[3] < 255:
                    self.put(ox + x, oy + y, c)
                else:
                    self.set(ox + x, oy + y, c)

    def outline(self, c, diag=False, only_empty=True):
        """Draw colour c on empty pixels 4-adjacent (8 if diag) to opaque ones."""
        nb = [(1, 0), (-1, 0), (0, 1), (0, -1)]
        if diag:
            nb += [(1, 1), (1, -1), (-1, 1), (-1, -1)]
        todo = []
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x][3] == 255:
                    continue
                for dx, dy in nb:
                    if self.get(x + dx, y + dy)[3] == 255:
                        todo.append((x, y))
                        break
        for x, y in todo:
            self.px[y][x] = c

    def crop(self, x, y, w, h):
        out = Canvas(w, h)
        for j in range(h):
            for i in range(w):
                out.px[j][i] = self.get(x + i, y + j)
        return out

    def copy(self):
        return self.crop(0, 0, self.w, self.h)

    def replace(self, a, b):
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x] == a:
                    self.px[y][x] = b

    def key(self):
        return tuple(tuple(r) for r in self.px)

    def empty(self):
        return all(c[3] == 0 for r in self.px for c in r)

    def to_image(self):
        im = Image.new('RGBA', (self.w, self.h))
        im.putdata([c for r in self.px for c in r])
        return im


def shade_index(nx, ny, hi=0.45, lo=-0.3):
    """Light from the top-left. Returns +1 (lit), 0, -1 (shade)."""
    s = -(nx * 0.62 + ny * 0.78)
    if s > hi:
        return 1
    if s < lo:
        return -1
    return 0


def hash2(x, y, seed=0):
    h = (x * 374761393 + y * 668265263 + seed * 2147483647) & 0xFFFFFFFF
    h = (h ^ (h >> 13)) * 1274126177 & 0xFFFFFFFF
    return (h ^ (h >> 16)) & 0xFFFFFFFF


def palette_set():
    cols = {P.CLEAR, P.OUTLINE, P.OUTLINE_SOFT, P.SHADOW, P.UI_TEXT, P.UI_TEXT_SHADOW}
    for name in dir(P):
        v = getattr(P, name)
        if isinstance(v, list):
            for c in v:
                if isinstance(c, tuple):
                    cols.add(c)
        elif isinstance(v, dict):
            cols.update(v.values())
    return cols
