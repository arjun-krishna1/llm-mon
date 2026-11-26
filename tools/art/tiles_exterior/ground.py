"""Ground tiles: grass, flowers, tall grass, area autotiles (path/sand/water),
ledges, steps."""
import math

import palette as P
from lib import Canvas, T, hash2

G = P.GRASS          # 0 dark .. 3 highlight
TG = P.TALL_GRASS
D = P.DIRT
S = P.SAND
W = P.WATER
O = P.OUTLINE
OS = P.OUTLINE_SOFT

# ---------------------------------------------------------------- grass
# Tufts are tiny hand-drawn marks: 'd' = dark blade, 'h' = sunlit tip.
TUFTS = {
    'w': ['h..h.',
          'd.hd.',
          'd.dd.',
          '.d.d.'],
    'v': ['h.h',
          'd.d',
          '.d.'],
    'i': ['h.',
          'dh',
          'dd'],
    'y': ['.h..',
          'hd.h',
          'd.dd'],
    'dot': ['h'],
    'spk': ['.h.',
            'h.h'],
}
GRASS_LAYOUTS = {
    # (tuft, x, y) -- kept off the tile borders so every variant tiles
    # seamlessly against every other variant.
    'a': [('w', 2, 3), ('v', 10, 9), ('i', 12, 2), ('dot', 6, 12)],
    'b': [('y', 9, 2), ('v', 3, 10), ('i', 6, 5), ('w', 10, 10), ('dot', 1, 1)],
    'c': [('i', 3, 3), ('spk', 9, 6), ('v', 12, 11), ('dot', 5, 11), ('dot', 13, 3)],
    'd': [('v', 6, 6), ('dot', 12, 12), ('dot', 2, 11)],
}


def grass(variant='a'):
    c = Canvas(T, T, G[2])
    for name, x, y in GRASS_LAYOUTS[variant]:
        c.pmap(x, y, TUFTS[name], {'d': G[1], 'h': G[3]})
    return c


_GRASS_A = grass('a')


def grass_px(x, y):
    return _GRASS_A.px[y % T][x % T]


# -------------------------------------------------------------- flowers
FLOWER_1 = ['.pp.',
            'pcPp',
            'pPPs',
            '.ss.']
FLOWER_2 = ['.pp.',
            'pPcp',
            'sPPp',
            '.ss.']


def flower(colour, frame):
    """Grass tile with two little flowers that sway between frames."""
    petal = P.FLOWER[colour]
    shade = {'red': P.CLOTH_RED[1], 'pink': P.CLOTH_PINK[1],
             'yellow': P.CLOTH_YELLOW[1], 'white': P.WHITE[1],
             'blue': P.CLOTH_BLUE[2]}[colour]
    c = grass('d')
    lg = {'p': petal, 'P': petal, 'c': P.FLOWER['centre'], 's': shade}
    if colour == 'yellow':
        lg['c'] = P.WHITE[2]
    spots = [(2, 2), (9, 8)]
    for k, (x, y) in enumerate(spots):
        f = FLOWER_1 if (frame + k) % 2 == 0 else FLOWER_2
        dx = 0 if (frame + k) % 2 == 0 else 1
        # stem + leaves (stay put), head sways 1px
        c.set(x + 2, y + 4, G[0]); c.set(x + 2, y + 5, G[0])
        c.set(x + 1, y + 5, G[1]); c.set(x + 3, y + 5, G[1])
        # outline-ish dark under the head for pop
        c.pmap(x + dx, y, f, lg)
        c.set(x + dx + 1, y + 4, G[0])
    return c


# ----------------------------------------------------------- tall grass
def tall_grass(frame=0):
    """Dense clumps of blades. Pattern wraps mod 16 so patches tile."""
    c = Canvas(T, T, TG[1])
    # each clump: (x, y) of its base-centre. Two staggered rows.
    clumps = [(4, 8), (12, 8), (0, 16), (8, 16)]
    if frame:
        clumps = [(x, y) for x, y in clumps]

    def blade(cx, by, lean, h):
        # returns list of (x, y, kind) for one blade, kind: 0 dark edge,1 mid,2 lit
        pts = []
        for k in range(h):
            y = by - k
            w = 2 if k < h - 2 else 1
            x = cx + int(round(lean * k / h))
            for i in range(w):
                pts.append((x + i, y, 2 if i == 0 else 1))
        return pts

    for cx, by in clumps:
        blades = [(cx - 3, -1.5, 6), (cx - 1, -0.5, 8), (cx + 1, 0.8, 7), (cx + 3, 2.0, 5)]
        drawn = set()
        for bx, lean, h in blades:
            for x, y, kind in blade(bx, by, lean, h):
                xx, yy = x % T, y % T
                col = TG[3] if kind == 2 else TG[2]
                c.px[yy][xx] = col
                drawn.add((xx, yy))
        # dark outline on the right/bottom of every blade pixel
        for (x, y) in list(drawn):
            for dx, dy in ((1, 0), (0, 1)):
                q = ((x + dx) % T, (y + dy) % T)
                if q not in drawn:
                    c.px[q[1]][q[0]] = TG[0]
    return c


# ------------------------------------------------------- area autotiles
# Neighbour flags: an area piece is chosen from which of its 8 neighbours
# are the same material. The boundary is computed from one global field so
# every combination meets its neighbours seamlessly.
INSET = 3          # grass margin kept inside an area tile at an edge
ROUND = 3          # rounding of outer corners


def _wave(t):
    # gentle, hand-tuned edge wobble (period 16)
    return [0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0][t % 16]


def _area_mask(nb):
    """nb: dict of 8 neighbour flags (n, ne, e, se, s, sw, w, nw) -> 48x48
    bool mask for the 3x3 neighbourhood (centre cell is material)."""
    cells = {(1, 1): True}
    off = {'n': (1, 0), 'ne': (2, 0), 'e': (2, 1), 'se': (2, 2), 's': (1, 2),
           'sw': (0, 2), 'w': (0, 1), 'nw': (0, 0)}
    for k, (cx, cy) in off.items():
        cells[(cx, cy)] = nb[k]
    N = 48
    # distance (px) from each pixel centre to nearest non-material cell
    dist = [[0.0] * N for _ in range(N)]
    grass_rects = [(cx * 16, cy * 16) for (cx, cy), v in cells.items() if not v]
    for y in range(N):
        for x in range(N):
            if not cells[(x // 16, y // 16)]:
                dist[y][x] = -1
                continue
            px, py = x + 0.5, y + 0.5
            best = 99.0
            for gx, gy in grass_rects:
                dx = max(gx - px, 0, px - (gx + 16))
                dy = max(gy - py, 0, py - (gy + 16))
                best = min(best, math.hypot(dx, dy))
            dist[y][x] = best
    thr = [[INSET + _wave(x if True else 0) * 0 + 0.0 for x in range(N)] for y in range(N)]
    # wobble: horizontal edges vary with x, vertical edges vary with y
    core = [[False] * N for _ in range(N)]
    for y in range(N):
        for x in range(N):
            t = INSET + ROUND + 0.5 * (_wave(x) + _wave(y + 5))
            core[y][x] = dist[y][x] >= t
    # dilate core by ROUND (disc) -> rounded convex corners
    mask = [[False] * N for _ in range(N)]
    r = ROUND
    offs = [(dx, dy) for dy in range(-r, r + 1) for dx in range(-r, r + 1)
            if dx * dx + dy * dy <= r * r + 0.5]
    for y in range(N):
        for x in range(N):
            if not core[y][x]:
                continue
            for dx, dy in offs:
                xx, yy = x + dx, y + dy
                if 0 <= xx < N and 0 <= yy < N:
                    mask[yy][xx] = True
    # cells fully surrounded by material: everything inside is material
    for y in range(N):
        for x in range(N):
            if dist[y][x] >= 12:
                mask[y][x] = True
    del thr
    return mask


def _dirt_texture(x, y):
    """Path interior: warm dirt with sparse pebbles, period 16."""
    x %= 16; y %= 16
    peb_dark = {(3, 4), (4, 4), (11, 2), (12, 11), (6, 13), (14, 7), (1, 10)}
    peb_lit = {(3, 3), (11, 1), (12, 10), (6, 12), (14, 6), (8, 7)}
    if (x, y) in peb_dark:
        return D[1]
    if (x, y) in peb_lit:
        return D[3]
    return D[2]


def _sand_texture(x, y):
    x %= 16; y %= 16
    if (x, y) in {(2, 3), (9, 6), (13, 12), (5, 11), (12, 1)}:
        return S[0]
    if (x, y) in {(3, 3), (10, 6), (6, 11), (13, 1), (1, 13), (8, 14)}:
        return S[2]
    return S[1]


def _water_texture(x, y, f):
    """Water ripples. f = frame 0..3. Ripples drift right, period 16."""
    x %= 16; y %= 16
    ripples = [  # (x, y, len)
        (2, 3, 4), (10, 6, 3), (5, 10, 4), (12, 13, 3)]
    for rx, ry, ln in ripples:
        if y != ry:
            continue
        sx = (rx + f * 1) % 16 if ry % 2 else (rx - f) % 16
        for k in range(ln):
            if (sx + k) % 16 == x:
                return W[3] if k in (1,) else W[2]
    # under-glint row below ripples for depth
    for rx, ry, ln in ripples:
        if y == (ry + 1) % 16:
            sx = (rx + f * 1) % 16 if ry % 2 else (rx - f) % 16
            for k in range(1, ln - 1):
                if (sx + k) % 16 == x:
                    return W[0] if False else W[1]
    return W[1]


def render_area(kind, nb, frame=0):
    mask = _area_mask(nb)
    N = 48

    def m(x, y):
        if 0 <= x < N and 0 <= y < N:
            return mask[y][x]
        return True

    c = Canvas(T, T)
    for ty in range(T):
        for tx in range(T):
            x, y = tx + 16, ty + 16
            gx, gy = x, y
            if not m(x, y):
                col = grass_px(gx, gy)
                # grass lip next to the material
                if kind == 'water':
                    if m(x, y + 1) or m(x + 1, y) or m(x - 1, y) or m(x, y - 1):
                        col = G[0] if (m(x, y + 1) or m(x + 1, y)) else G[1]
                    elif m(x, y + 2) and not m(x, y + 1):
                        col = G[1]
                else:
                    if m(x, y + 1) or m(x + 1, y) or m(x - 1, y) or m(x, y - 1):
                        col = G[1]
                c.px[ty][tx] = col
                continue
            # material pixel
            edge_n = not m(x, y - 1)
            edge_w = not m(x - 1, y)
            edge_s = not m(x, y + 1)
            edge_e = not m(x + 1, y)
            n2 = not m(x, y - 2)
            w2 = not m(x - 2, y)
            if kind == 'path':
                col = _dirt_texture(gx, gy)
                if edge_n or edge_w:
                    col = D[0]
                elif edge_s or edge_e:
                    col = D[1]
                elif n2 or w2:
                    col = D[1]
            elif kind == 'sand':
                col = _sand_texture(gx, gy)
                if edge_n or edge_w:
                    col = S[0]
                elif edge_s or edge_e:
                    col = S[0]
                elif n2:
                    col = S[0] if (gx % 2 == 0) else S[1]
            else:  # water
                col = _water_texture(gx, gy, frame)
                if edge_n or edge_w:
                    col = W[0]
                elif n2 or w2:
                    col = W[0] if (gx + gy) % 2 == 0 else W[1]
                elif edge_s or edge_e:
                    # foam line that breathes between frames
                    col = W[3] if (gx + gy + frame) % 4 < 2 else W[2]
                elif not m(x, y + 2) or not m(x + 2, y):
                    col = W[2] if (gx + gy + frame) % 4 == 0 else col
            c.px[ty][tx] = col
    return c


NB_KEYS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']


def canonical(nb):
    """Diagonals only matter when both adjacent orthogonals are material."""
    nb = dict(nb)
    for d, (a, b) in {'ne': ('n', 'e'), 'se': ('s', 'e'), 'sw': ('s', 'w'), 'nw': ('n', 'w')}.items():
        if not (nb[a] and nb[b]):
            nb[d] = False
    return nb


def blob_key(nb):
    return ''.join('1' if nb[k] else '0' for k in NB_KEYS)


def all_blob_configs():
    seen = {}
    for bits in range(256):
        nb = {k: bool(bits >> i & 1) for i, k in enumerate(NB_KEYS)}
        nb = canonical(nb)
        seen[blob_key(nb)] = nb
    return seen  # 47 entries


# The 13 named pieces. Name = where the GRASS is (edge the tile sits on).
def named_pieces():
    allm = {k: True for k in NB_KEYS}

    def nb(**kw):
        d = dict(allm)
        d.update(kw)
        return canonical(d)
    F = False
    return {
        'c': nb(),
        'n': nb(n=F, ne=F, nw=F), 's': nb(s=F, se=F, sw=F),
        'e': nb(e=F, ne=F, se=F), 'w': nb(w=F, nw=F, sw=F),
        'nw': nb(n=F, w=F, nw=F, ne=F, sw=F), 'ne': nb(n=F, e=F, ne=F, nw=F, se=F),
        'sw': nb(s=F, w=F, sw=F, se=F, nw=F), 'se': nb(s=F, e=F, se=F, sw=F, ne=F),
        'inner_nw': nb(nw=F), 'inner_ne': nb(ne=F),
        'inner_sw': nb(sw=F), 'inner_se': nb(se=F),
    }
