"""Trees, forest walls, bushes, rocks (from generated source art, palette
re-snapped to the nature ramps and composed by code)."""
import lib  # noqa: F401  (path setup)
import palette as P
import genart
from lib import Canvas, T

O = P.OUTLINE
LEAF_COLS = P.TREE + P.TRUNK + [O, P.OUTLINE_SOFT]
ROCK_COLS = P.ROCK + [O, P.OUTLINE_SOFT]


def tree_sprite():
    """32 px wide tree, outline reinforced."""
    s = genart.sprite('ext_tree', width=32, colors=32, sat=1.15)
    genart.resnap(s, LEAF_COLS)
    _reink(s)
    return s


def _reink(s, col=O):
    """Make the silhouette edge a crisp dark outline."""
    edge = []
    for y in range(s.h):
        for x in range(s.w):
            if s.px[y][x][3] != 255:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if s.get(x + dx, y + dy)[3] == 0:
                    edge.append((x, y))
                    break
    for x, y in edge:
        s.px[y][x] = col


def _shadow(c, cx, cy, rx, ry):
    for x, y in c.ellipse_mask(cx, cy, rx, ry):
        c.put(x, y, P.SHADOW)


def tree_stamp():
    """2x3 stamp canvas: rows 0 = over (crown top), rows 1-2 = base, solid."""
    s = tree_sprite()
    c = Canvas(32, 48)
    oy = 48 - s.h - 1
    _shadow(c, 17, 46, 11, 2.5)
    c.blit(s, 0, oy)
    return c


TREE_OY = None


def forest_canvas(cols, rows):
    """Trees on a 2x2-tile lattice, back to front; interior gaps filled with
    deep canopy shade. Returns (canvas, height in tiles)."""
    s = tree_sprite()
    oy = 48 - s.h - 1
    H = (rows * 2 + 1) * T
    c = Canvas(cols * 32, H)
    for r in range(rows):
        for k in range(cols):
            _shadow(c, k * 32 + 17, r * 32 + 46, 11, 2.5)
            c.blit(s, k * 32, r * 32 + oy)
    # fill gaps bounded on all four sides (keeps the outer silhouette open)
    fill = P.TREE[0]
    solid = [[c.px[y][x][3] == 255 for x in range(c.w)] for y in range(c.h)]

    def bounded(x, y):
        return (any(solid[y][i] for i in range(0, x)) and any(solid[y][i] for i in range(x + 1, c.w))
                and any(solid[j][x] for j in range(0, y)) and any(solid[j][x] for j in range(y + 1, c.h)))
    for y in range(c.h):
        for x in range(c.w):
            if not solid[y][x] and bounded(x, y):
                # leave the trunk row (below the last crowns) open to show ground
                if y >= c.h - 14:
                    continue
                c.px[y][x] = fill
    return c


def forest_pieces():
    """Pieces for a forest wall built from whole trees on a 2-col lattice.
    Row kinds: top, mid, join, bottom. Column kinds: l_out, l_in, r_in, r_out."""
    c = forest_canvas(3, 3)
    rows = {'top': 0, 'mid': 1, 'join': 2, 'bottom': 6}
    cols = {'l_out': 0, 'r_in': 1, 'l_in': 2, 'r_out': 5}
    out = {}
    for rn, ry in rows.items():
        for cn, cx in cols.items():
            out[rn + '_' + cn] = c.crop(cx * T, ry * T, T, T)
    return out


def bush():
    s = genart.sprite('ext_bush', width=16, colors=24, sat=1.1)
    genart.resnap(s, LEAF_COLS)
    _reink(s)
    c = Canvas(T, T)
    _shadow(c, 9, 14.5, 7, 1.6)
    c.blit(s, (T - s.w) // 2, T - s.h - 1)
    return c


def rock(size=1):
    w = 15 if size == 1 else 30
    s = genart.sprite('ext_rock', width=w, colors=24, sat=1.0)
    genart.resnap(s, ROCK_COLS)
    _reink(s)
    c = Canvas(T * size, T * size)
    _shadow(c, size * 8 + 1, size * 16 - 1.5, size * 7, 1.6 * size)
    c.blit(s, (c.w - s.w) // 2, c.h - s.h - 1)
    return c
