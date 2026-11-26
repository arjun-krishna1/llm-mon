"""Tiny pixel canvas helpers for the interior tileset.

Everything draws with palette colours only (tools/art/palette.py). Colours
with alpha < 255 (palette.SHADOW) are "soft": they only land on empty pixels,
so drop shadows never darken the furniture that casts them.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

import palette as P  # noqa: E402
from PIL import Image  # noqa: E402

T = 16
CLEAR = P.CLEAR
O = P.OUTLINE
OS = P.OUTLINE_SOFT
SH = P.SHADOW


class Cv:
    def __init__(self, w, h, fill=None):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), fill or (0, 0, 0, 0))
        self.p = self.im.load()

    # -- primitives -------------------------------------------------------
    def px(self, x, y, c, force=False):
        if c is None or not (0 <= x < self.w and 0 <= y < self.h):
            return
        if c[3] < 255 and not force:
            if self.p[x, y][3] == 0:
                self.p[x, y] = c
            return
        self.p[x, y] = c

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.p[x, y]
        return CLEAR

    def rect(self, x, y, w, h, c, force=False):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.px(xx, yy, c, force)

    def hl(self, x0, x1, y, c):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            self.px(x, y, c)

    def vl(self, x, y0, y1, c):
        for y in range(min(y0, y1), max(y0, y1) + 1):
            self.px(x, y, c)

    def frame(self, x, y, w, h, c, round_=False):
        """1px rectangle outline; round_ skips the 4 corner pixels."""
        a = 1 if round_ else 0
        self.hl(x + a, x + w - 1 - a, y, c)
        self.hl(x + a, x + w - 1 - a, y + h - 1, c)
        self.vl(x, y + a, y + h - 1 - a, c)
        self.vl(x + w - 1, y + a, y + h - 1 - a, c)

    def clear_px(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.p[x, y] = CLEAR

    def ellipse(self, cx, cy, rx, ry, c):
        """Filled ellipse, centre may be .5 for even sizes."""
        for y in range(int(cy - ry - 1), int(cy + ry + 2)):
            for x in range(int(cx - rx - 1), int(cx + rx + 2)):
                dx = (x + 0.5 - cx) / (rx + 0.01)
                dy = (y + 0.5 - cy) / (ry + 0.01)
                if dx * dx + dy * dy <= 1.0:
                    self.px(x, y, c)

    def ellipse_ring(self, cx, cy, rx, ry, c):
        """Outline of an ellipse (pixels inside whose 4-neighbour is outside)."""
        inside = set()
        for y in range(int(cy - ry - 2), int(cy + ry + 3)):
            for x in range(int(cx - rx - 2), int(cx + rx + 3)):
                dx = (x + 0.5 - cx) / (rx + 0.01)
                dy = (y + 0.5 - cy) / (ry + 0.01)
                if dx * dx + dy * dy <= 1.0:
                    inside.add((x, y))
        for (x, y) in inside:
            if any((x + a, y + b) not in inside for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                self.px(x, y, c)

    def blit(self, ox, oy, rows, legend):
        """Paint an ASCII pixel map. ' ' and '.' are transparent/skip."""
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch in ' .':
                    continue
                c = legend[ch]
                if c == 'clear':
                    self.clear_px(ox + x, oy + y)
                else:
                    self.px(ox + x, oy + y, c)

    def paste(self, other, ox, oy):
        """Paste another Cv/Image respecting alpha (opaque px replace)."""
        src = other.im if isinstance(other, Cv) else other
        sp = src.load()
        for y in range(src.height):
            for x in range(src.width):
                c = sp[x, y]
                if c[3]:
                    self.px(ox + x, oy + y, c)

    def outline_alpha(self, c=O, diag=False):
        """Draw an outline around all opaque pixels (on empty neighbours)."""
        pts = []
        for y in range(self.h):
            for x in range(self.w):
                if self.p[x, y][3] == 255:
                    continue
                nb = [(1, 0), (-1, 0), (0, 1), (0, -1)]
                if diag:
                    nb += [(1, 1), (-1, -1), (1, -1), (-1, 1)]
                for a, b in nb:
                    q = self.get(x + a, y + b)
                    if q[3] == 255 and q != c:
                        pts.append((x, y))
                        break
        for x, y in pts:
            self.px(x, y, c, force=True)

    def recolor(self, x, y, w, h, mapping):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                if 0 <= xx < self.w and 0 <= yy < self.h:
                    c = self.p[xx, yy]
                    if c in mapping:
                        self.p[xx, yy] = mapping[c]

    def crop(self, x, y, w, h):
        out = Cv(w, h)
        out.im = self.im.crop((x, y, x + w, y + h))
        out.p = out.im.load()
        return out

    def copy(self):
        out = Cv(self.w, self.h)
        out.im = self.im.copy()
        out.p = out.im.load()
        return out

    def flip_h(self):
        out = Cv(self.w, self.h)
        out.im = self.im.transpose(Image.FLIP_LEFT_RIGHT)
        out.p = out.im.load()
        return out


# -- palette helpers -----------------------------------------------------

def _ramps():
    out = []
    for k, v in vars(P).items():
        if k.isupper() and isinstance(v, list) and v and isinstance(v[0], tuple):
            out.append(v)
    return out


RAMPS = _ramps()


def _build_darken():
    m = {}
    for r in RAMPS:
        for i in range(1, len(r)):
            m.setdefault(r[i], r[i - 1])
        m.setdefault(r[0], OS)
    m.setdefault(OS, O)
    return m


DARKEN = _build_darken()


def darker(c, n=1):
    for _ in range(n):
        c = DARKEN.get(c, c)
    return c


def all_palette_colours():
    s = {O, OS, SH, CLEAR}
    for r in RAMPS:
        s.update(r)
    for v in P.FLOWER.values():
        s.add(v)
    s.update([P.UI_TEXT, P.UI_TEXT_SHADOW])
    return s


# -- furniture building blocks -------------------------------------------

def block(c, x, y, w, top_h, front_h, top, front, *, outline=O,
          shadow=True, edge=None, round_=True):
    """A box in 3/4 view: top face (top_h rows) above a front face.

    `top` / `front` are (dark, mid, light) colour triples. Draws outline,
    top-left highlight, the top/front crease and a soft floor shadow.
    """
    h = top_h + front_h
    td, tm, tl = top
    fd, fm, fl = front
    c.rect(x + 1, y + 1, w - 2, top_h - 1, tm)
    c.hl(x + 1, x + w - 2, y + 1, tl)
    c.vl(x + 1, y + 1, y + top_h - 1, tl)
    c.rect(x + 1, y + top_h, w - 2, front_h - 1, fm)
    c.hl(x + 1, x + w - 2, y + top_h, edge if edge else fl)
    c.hl(x + 1, x + w - 2, y + h - 2, fd)
    c.vl(x + w - 2, y + top_h + 1, y + h - 2, fd)
    c.frame(x, y, w, h, outline, round_)
    if shadow:
        c.hl(x + 1, x + w, y + h, SH)
        c.vl(x + w, y + 2, y + h, SH)
