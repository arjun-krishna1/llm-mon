"""Building stamps from generated source art.

Each building is pixelized to an exact tile width, bottom-aligned in its
stamp, then hand-corrected (glass recolours, sign glyphs). The top rows that
are above the building's ground footprint become the `over` layer so the
player walks behind the roof.
"""
import math

import lib  # noqa: F401  (path setup)
import palette as P
import genart
from lib import Canvas, T

# name: (raw, width tiles, footprint rows, door cols, colours)
SPEC = {
    'house_orange': ('ext_house_orange', 5, 4, [2], 48),
    'house_blue':   ('ext_house_blue', 5, 4, [2], 48),
    'lab':          ('ext_lab', 7, 4, [3], 48),
    'model_center': ('ext_center', 6, 4, [2, 3], 48),
    'token_mart':   ('ext_mart', 5, 4, [2], 48),
    'gym':          ('ext_gym', 7, 5, [3], 48),
    'shed':         ('ext_shed', 3, 3, [1], 40),
}

GREYS = P.STONE + P.ROCK + P.WHITE[:2] + P.METAL + P.ROOF_SLATE + P.UI_FRAME


def _glass_fix(s, rects):
    """Greyish pixels inside the given window rects become glass."""
    for r in rects:
        x0, y0, w, h = r
        cols = set()
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                c = s.get(x, y)
                if c[3] == 255 and max(c[:3]) - min(c[:3]) < 70 and sum(c[:3]) > 300:
                    cols.add(c)
        if cols:
            genart.remap_ramp(s, r, list(cols) + [P.GLASS[0]], P.GLASS)


def _coin_t(s, cx, cy):
    """Crisp gold coin with a T, centred at (cx, cy) (9x9)."""
    Y = P.CLOTH_YELLOW
    O = P.OUTLINE
    rows = ['..ooooo..',
            '.oYYYYYo.',
            'oYyyyyyYo',
            'oYtttttyo',
            'oYyytyyyo',
            'oYyytyyyo',
            'oYyytyydo',
            '.oyyyyddo'[:9],
            '..ooooo..']
    lg = {'o': O, 'Y': Y[2], 'y': Y[1], 't': P.OUTLINE_SOFT, 'd': Y[0]}
    s.pmap(cx - 4, cy - 4, rows, lg)


def _purple(s, region=None):
    """Snap the pink/purple family (roof, awning) onto ROOF_VIOLET."""
    x0, y0, w, h = region or (0, 0, s.w, s.h)
    cols = set()
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            c = s.get(x, y)
            if c[3] == 255 and c[0] > c[1] + 30 and c[2] > c[1] + 30:
                cols.add(c)
    if cols:
        genart.remap_ramp(s, region, list(cols), P.ROOF_VIOLET)


def _coin_t11(s, cx, cy):
    O = P.OUTLINE
    Y = P.CLOTH_YELLOW
    rows = ['...ooooo...',
            '..oYYYYYo..',
            '.oYyyyyyyo.',
            'oYyTTTTTydo',
            'oYyyyTyyydo',
            'oYyyyTyyydo',
            'oyyyyTyyydo',
            'oyyyyTyyddo',
            '.oyyyyyddo.',
            '..odddddo..',
            '...ooooo...']
    lg = {'o': O, 'Y': Y[2], 'y': Y[1], 'T': P.WOOD[0], 'd': Y[0]}
    s.pmap(cx - 5, cy - 5, rows, lg)


def _fix_orange(s):
    _glass_fix(s, [(30, 57, 15, 14), (12, 84, 14, 13), (55, 84, 14, 13)])


def _fix_mart(s):
    _purple(s)
    _coin_t11(s, 42, 71)


def _fix_gym(s):
    _glass_fix(s, [(19, 89, 9, 22), (86, 89, 9, 22)])


FIXES = {'house_orange': _fix_orange, 'token_mart': _fix_mart, 'gym': _fix_gym}


def building(name):
    raw, wt, foot, doors, cols = SPEC[name]
    s = genart.sprite(raw, width=wt * T, colors=cols, sat=1.3)
    fx = FIXES.get(name)
    if fx:
        fx(s)
    ht = math.ceil((s.h + 1) / T)
    c = Canvas(wt * T, ht * T)
    c.blit(s, 0, ht * T - s.h)
    over_rows = ht - foot
    return c, over_rows, doors


def cell_props(name, ht, over_rows, doors):
    wt = SPEC[name][1]

    def fn(i, j):
        if j < over_rows:
            return None
        if j == ht - 1 and i in doors:
            return {'door': True}
        return {'solid': True}
    return fn
