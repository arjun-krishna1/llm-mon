"""Ground tiles: grass, flowers, tall grass, area autotiles (path/sand/water),
ledges, steps."""
import math

import lib  # noqa: F401  (path setup)
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
    'a': [('w', 2, 3), ('i', 11, 9), ('dot', 7, 12)],
    'b': [('v', 9, 2), ('w', 3, 9), ('i', 12, 11), ('dot', 1, 1)],
    'c': [('spk', 4, 5), ('i', 11, 10), ('dot', 13, 3), ('dot', 3, 12)],
    'd': [('v', 7, 7), ('dot', 12, 13)],
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
FLOWER_1 = ['..p..',
            '.pPp.',
            'pPcPs',
            '.sPso',
            '..so.']
FLOWER_2 = ['..p..',
            '.pPp.',
            'pPcPs',
            '.sPso',
            '..so.']


def flower(colour, frame):
    """Grass tile with two little flowers that sway between frames."""
    petal = P.FLOWER[colour]
    shade = {'red': P.CLOTH_RED[1], 'pink': P.CLOTH_PINK[1],
             'yellow': P.CLOTH_YELLOW[1], 'white': P.WHITE[1],
             'blue': P.CLOTH_BLUE[2]}[colour]
    c = grass('d')
    lg = {'p': petal, 'P': petal, 'c': P.FLOWER['centre'], 's': shade, 'o': G[0]}
    if colour == 'yellow':
        lg['c'] = P.WHITE[2]
    spots = [(2, 2), (9, 8)]
    for k, (x, y) in enumerate(spots):
        f = FLOWER_1 if (frame + k) % 2 == 0 else FLOWER_2
        dx = 0 if (frame + k) % 2 == 0 else 1
        # stem + leaves (stay put), head sways 1px
        c.set(x + 2, y + 5, G[0]); c.set(x + 2, y + 6, G[0])
        c.set(x + 1, y + 6, G[1]); c.set(x + 3, y + 6, G[1]); c.set(x + 4, y + 5, G[1])
        c.pmap(x + dx, y + (1 - dx), f, lg)
    return c


# ----------------------------------------------------------- tall grass
# One clump = a mound of pointed blades, lit on the left, outlined dark at
# its base. Clumps overlap like scales in staggered rows (period 16).
# One clump = three pointed blades with dark gaps between them, lit on the
# left. Clumps overlap like scales in staggered rows (period 16), so a patch
# reads as clearly bladed and a full value step darker than lawn grass.
CLUMP = [
    '.l....l.',
    '.l...lm.',
    'lm..lmd.',
    'lmd.lmd.',
    'mmdlmmdl',
    'mmdmmddm',
    'mddmmddm',
    'mdmmdddd',
    'oddddddo',
    '.oooooo.',
]
TG_DARK = P.TREE[0]


def tall_grass(frame=0, top=False):
    """top=True: variant for the top row of a patch (blade tips over grass).
    frame 0/1: the upper half of every blade sways 1px (2-frame anim)."""
    c = grass('d') if top else Canvas(T, T, TG_DARK)
    lg = {'l': TG[3], 'm': TG[2], 'd': TG[1], 'o': TG_DARK}
    rows = [(0, 0), (8, 4)] if top else [(-8, 4), (0, 0), (8, 4)]
    if top:
        for y in range(6, T):
            for x in range(T):
                c.px[y][x] = TG_DARK
    drawn = set()
    for ty, xo in rows:
        for k in range(-1, 3):
            ox = xo + k * 8
            for j, row in enumerate(CLUMP):
                for i, ch in enumerate(row):
                    if ch == '.':
                        continue
                    sway = (1 if frame else 0) if j < 4 else 0
                    x = (ox + i + sway) % T
                    y = ty + j
                    if 0 <= y < T:
                        c.px[y][x] = lg[ch]
                        drawn.add((x, y))
    if top:
        # dark outline around tips that stand against the open grass
        for y in range(0, 7):
            for x in range(T):
                if (x, y) in drawn or y >= 6:
                    continue
                nbs = [((x + dx) % T, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1))]
                if any(q in drawn for q in nbs if 0 <= q[1] < T):
                    c.px[y][x] = TG_DARK
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
    return mask


def _dirt_texture(x, y):
    """Path interior: warm packed dirt, sparse pebbles lit top-left, period 16."""
    x %= 16; y %= 16
    peb_dark = {(4, 4), (5, 4), (12, 2), (13, 11), (7, 13), (1, 9), (9, 8)}
    peb_lit = {(4, 3), (12, 1), (13, 10), (7, 12), (1, 8), (8, 8),
               (10, 5), (2, 14), (15, 6)}
    if (x, y) in peb_dark:
        return D[0]
    if (x, y) in peb_lit:
        return D[2]
    return D[1]


def _sand_texture(x, y):
    """Sand: pale with wind ripples (short dark/light dash pairs) + grains."""
    x %= 16; y %= 16
    dark = {(2, 3), (3, 3), (4, 4), (10, 7), (11, 7), (12, 8), (5, 12), (6, 12), (7, 13),
            (13, 1), (14, 14)}
    lit = {(2, 2), (3, 2), (10, 6), (11, 6), (5, 11), (6, 11), (8, 1), (1, 9), (14, 10)}
    if (x, y) in dark:
        return S[0]
    if (x, y) in lit:
        return S[2]
    return S[1]


WATER_RIPPLES = [
    # (x, y, length, drift per frame) -- three layouts so ponds don't tile visibly
    [(1, 3, 4, 1), (10, 7, 3, -1), (4, 12, 3, 1)],
    [(7, 2, 3, -1), (2, 8, 4, 1), (11, 13, 3, -1)],
    [(12, 4, 3, 1), (5, 6, 2, -1), (8, 11, 4, -1), (1, 14, 2, 1)],
]


def _water_texture(x, y, f, var=0):
    """Water: calm mid-blue with short glints that drift, period 16."""
    x %= 16; y %= 16
    for rx, ry, ln, dv in WATER_RIPPLES[var]:
        sx = (rx + dv * f) % 16
        if y == ry:
            for k in range(ln):
                if (sx + k) % 16 == x:
                    return W[3] if k == 1 else W[2]
        if y == (ry + 1) % 16:
            for k in range(1, ln + 1):
                if (sx + k) % 16 == x:
                    return W[0] if k == ln else W[1]
    return W[1]


ST = P.STONE


def _pave_texture(x, y, var=0):
    """Light stone slabs, 8x8 in a running bond, lit top-left, period 16."""
    x %= 16; y %= 16
    row = y // 8
    sx = (x + (4 if row else 0)) % 8
    sy = y % 8
    slab = (((x + (4 if row else 0)) % 16) // 8, row)
    tone = ST[2] if slab == (1, 0) else ST[3]
    if sy == 7 or sx == 7:
        return ST[1] if (x + y) % 3 == 0 else ST[2]   # joint
    if sy == 0 or sx == 0:
        return ST[4] if tone == ST[3] else ST[3]       # sunlit slab lip
    if tone == ST[2]:
        return ST[2]
    if var == 1 and (x, y) in {(10, 3), (11, 4), (11, 5), (12, 5), (3, 11), (4, 12)}:
        return ST[2]                    # hairline cracks
    if (x * 5 + y * 3) % 29 == 0:
        return ST[2]
    return ST[3]


def render_area(kind, nb, frame=0, var=0):
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
                    if m(x, y + 1):
                        col = D[0]            # earthy bank lip on the north shore
                    elif m(x + 1, y) or m(x - 1, y) or m(x, y - 1):
                        col = G[0]
                    elif m(x, y + 2) or m(x + 1, y + 1) or m(x - 1, y + 1):
                        col = G[0]
                else:
                    if m(x, y + 1) or m(x + 1, y) or m(x - 1, y) or m(x, y - 1):
                        col = G[0] if kind == 'pavement' else G[1]
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
                if edge_n or edge_w or edge_s or edge_e:
                    col = D[0]
                elif n2:
                    col = D[0] if gx % 2 == 0 else D[1]
                elif w2:
                    col = D[0] if gy % 2 == 0 else D[1]
                elif not m(x, y + 2) or not m(x + 2, y):
                    col = D[2]
            elif kind == 'pavement':
                col = _pave_texture(gx, gy, var)
                if edge_n or edge_w or edge_s or edge_e:
                    col = ST[0]                 # kerb outline
                elif n2 or w2:
                    col = ST[4]                 # kerb top, sunlit
                elif not m(x, y + 2) or not m(x + 2, y):
                    col = ST[1]                 # kerb face in shade
            elif kind == 'sand':
                col = _sand_texture(gx, gy)
                if edge_n or edge_w:
                    col = S[0]
                elif edge_s or edge_e:
                    col = S[0]
                elif n2:
                    col = S[0] if (gx % 2 == 0) else S[1]
            else:  # water
                col = _water_texture(gx, gy, frame, var)
                n3 = not m(x, y - 3)
                near = (not m(x, y - 4)) or not m(x, y + 2) or not m(x + 2, y) or not m(x - 2, y)
                if edge_n or edge_w or edge_s or edge_e:
                    col = W[0]                       # dark rim all round
                elif n2:
                    col = W[0]                       # bank shadow, 2 rows
                elif n3:
                    col = W[0] if (gx + gy) % 2 == 0 else W[1]
                elif near:
                    # light inner line that glints as frames advance
                    col = W[3] if (gx + gy + frame) % 6 == 0 else W[2]
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


# --------------------------------------------------------------- ledges
# Legend: g grass texture, m G2, L G3 (sunlit lip), o TG0 (outline),
# h/f/d face light/mid/shade, s G1 cast shadow on the grass below.
_SOUTH = {'m': G[2], 'L': G[3], 'o': P.OUTLINE_SOFT, 't': TG[3], 'h': TG[2], 'f': TG[1], 'd': TG[0], 's': G[0], 'S': G[1]}
_EAST = dict(_SOUTH, h=TG[1], f=TG[0], d=TG[0])
_WEST = dict(_SOUTH, h=TG[2], f=TG[1], d=TG[0])

_FACE = ['hhhhhfhhhhhhhfhh',
         'fhffffffhfffffff',
         'fffdfffffffdffdf',
         'dddddddddddddddd']
LEDGE_S = ['gggggggggggggggg'] * 6 + ['LgLgLgLgLgLgLgLg'] + [
    'LLLLLLLLLLLLLLLL',
    'LLtLLLLLLtLLLLLL',
    'tttttttttttttttt'] + _FACE + [
    'oooooooooooooooo',
    'ssssssssssssssss']
LEDGE_S_END_W = ['gggggggggggggggg'] * 6 + ['ggggLgLgLgLgLgLg'] + [
    'ggggLLLLLLLLLLLL',
    'ggLLLLtLLLLLLtLL',
    'gottttttttttttttt'[:16],
    'gohffffhfffdhfff',
    'goffdffffddfffdf',
    'godffddfdfddffdd',
    'ggoddddddddddddd',
    'gggooooooooooooo',
    'ggggssssssssssss']
_W_ROWS = ['sohfdoLm', 'soffdoLm', 'sofddoLm', 'sohfdoLm', 'soffdoLm', 'sofdfoLm',
           'sohfdoLm', 'soffdoLm']
LEDGE_W = [(_W_ROWS[i % 8] + 'g' * 8) for i in range(16)]
LEDGE_W_END_N = ['g' * 16, 'g' * 16, 'goooooLm' + 'g' * 8] + LEDGE_W[3:]
LEDGE_CORNER_SW = LEDGE_W[:7] + [
    'soffdoLLLLLLLLLL',
    'sofddoLLtLLLLLLt',
    'sohfdotttttttttt',
    'sohffffhfffdhfff',
    'soffdffffddfffdf',
    'sodffddfdfddffdd',
    'sodddddddddddddd',
    'sooooooooooooooo',
    'ssssssssssssssss']


def _draw_map(rows, legend_for_row, mirror=False):
    c = grass('a')
    for j, row in enumerate(rows):
        if mirror:
            row = row[::-1]
        lg = legend_for_row(j)
        for i, ch in enumerate(row):
            if ch != 'g':
                c.set(i, j, lg[ch])
    return c


def ledges():
    """Returns {name: (canvas, ledge_dir)}."""
    south = lambda j: _SOUTH  # noqa: E731
    out = {
        'ledge_s': (_draw_map(LEDGE_S, south), 'down'),
        'ledge_s_end_w': (_draw_map(LEDGE_S_END_W, south), 'down'),
        'ledge_s_end_e': (_draw_map(LEDGE_S_END_W, south, mirror=True), 'down'),
        'ledge_w': (_draw_map(LEDGE_W, lambda j: _WEST), 'left'),
        'ledge_w_end_n': (_draw_map(LEDGE_W_END_N, lambda j: _WEST), 'left'),
        'ledge_e': (_draw_map(LEDGE_W, lambda j: _EAST, mirror=True), 'right'),
        'ledge_e_end_n': (_draw_map(LEDGE_W_END_N, lambda j: _EAST, mirror=True), 'right'),
        'ledge_corner_sw': (_draw_map(LEDGE_CORNER_SW, lambda j: _WEST if j < 10 else _SOUTH), 'down'),
        'ledge_corner_se': (_draw_map(LEDGE_CORNER_SW, lambda j: _EAST if j < 10 else _SOUTH,
                                      mirror=True), 'down'),
    }
    return out


def steps():
    """Earth steps cut through a down-ledge line (walkable). Sits between
    ledge_s_end_e (west of it) and ledge_s_end_w (east of it)."""
    rows = ['gggggggggggggggg'] * 7 + [
        'LLLLLLLLLLLLLLLL',
        'LLoDDDDDDDDDDoLL',
        'ttoEEEEEEEEEEott',
        'hfokkkkkkkkkkofd',
        'ffoDDDDDDDDDDoff',
        'dfoEEEEEEEEEEodd',
        'ddokkkkkkkkkkodd',
        'oooDDDDDDDDDDooo',
        'ssoEEEEEEEEEEoss']
    lg = dict(_SOUTH, D=D[2], E=D[1], k=D[0])
    return _draw_map(rows, lambda j: lg)


# ------------------------------------------------------ pond decoration
def lilypad():
    """Transparent overlay for the detail layer on top of water."""
    c = Canvas(T, T)
    pad = ['...oooo...',
           '.ooLLmmoo.',
           'oLLmmmmmdo',
           'oLmmm.mddo',
           'ommmd.dddo',
           '.oodd.ddo.',
           '...oo.oo..']
    lg = {'o': P.TREE[0], 'L': P.TREE[4], 'm': P.TREE[3], 'd': P.TREE[2]}
    c.pmap(1, 3, pad, lg)
    small = ['.oooo.',
             'oLmmdo',
             'omm.do',
             '.oo.o.']
    c.pmap(9, 10, small, lg)
    # a pink bloom on the big pad
    fl = {'p': P.FLOWER['pink'], 's': P.CLOTH_PINK[1], 'c': P.FLOWER['centre']}
    c.pmap(3, 2, ['.p.', 'pcs', '.s.'], fl)
    c.pmap(7, 4, ['p', 's'], fl)
    # faint ring in the water under each pad
    for x in range(3, 10):
        c.put(x, 10, P.WATER[2])
    for x in range(10, 15):
        c.put(x, 14, P.WATER[2])
    return c


def reeds():
    """Transparent overlay: cattail reeds for pond shores (solid)."""
    c = Canvas(T, T)
    blades = [(2, 6, -1), (4, 3, 0), (6, 5, 1), (9, 2, 0), (11, 4, 1), (13, 7, 1)]
    for bx, top, lean in blades:
        for y in range(top, 15):
            t = (15 - y) / (15 - top)
            x = bx + int(round(lean * t * 2))
            c.set(x, y, TG[3] if y < top + 2 else TG[2])
            c.set(x + 1, y, P.TREE[0])
    for hx, hy in ((4, 1), (9, 0), (12, 3)):
        c.pmap(hx - 1, hy, ['.k.', 'kbk', 'kBk', 'kBk', 'kBk', '.k.'],
               {'k': P.OUTLINE, 'b': P.TRUNK[2], 'B': P.TRUNK[1]})
        c.set(hx, hy, P.TREE[1])
    # base clump
    for x in range(2, 15):
        c.set(x, 15, P.TREE[0] if x % 3 else P.TREE[1])
        c.set(x, 14, TG[1] if x % 2 else TG[2])
    return c


# --------------------------------------------------------------- city
def manhole():
    c = Canvas(T, T)
    for y in range(T):
        for x in range(T):
            c.px[y][x] = _pave_texture(x, y)
    M = P.METAL
    for x, y in c.ellipse_mask(8, 8, 5.6, 5.6):
        c.set(x, y, M[0])
    for x, y in c.ellipse_mask(8, 8, 4.6, 4.6):
        dx, dy = x - 7.5, y - 7.5
        c.set(x, y, M[2] if dx + dy < -2 else M[1])
    for x in range(5, 11):          # grip slots
        if x % 2:
            c.set(x, 6, M[0]); c.set(x, 9, M[0])
    c.set(5, 5, M[3]); c.set(6, 4, M[3])
    return c


def drain():
    c = Canvas(T, T)
    for y in range(T):
        for x in range(T):
            c.px[y][x] = _pave_texture(x, y)
    M = P.METAL
    c.rect(3, 9, 10, 5, M[0])
    for x in range(4, 12):
        for y in range(10, 13):
            c.set(x, y, M[1] if x % 2 else P.OUTLINE)
    c.hline(3, 12, 9, M[2])
    return c


def plaza_inlay():
    """Decorative paving: a teal-and-cream compass diamond, tiles in a grid."""
    c = Canvas(T, T)
    for y in range(T):
        for x in range(T):
            d = abs(x - 7.5) + abs(y - 7.5)
            if d < 3:
                col = P.ROOF_TEAL[2] if (x < 8) == (y < 8) else P.ROOF_TEAL[1]
            elif d < 4:
                col = P.ROOF_TEAL[0]
            elif d < 7:
                col = P.WALL_CREAM[2] if (x + y) % 2 else P.WALL_CREAM[3]
            elif d < 8:
                col = ST[1]
            else:
                col = ST[3] if (x in (0, 15) or y in (0, 15)) is False else ST[2]
            c.px[y][x] = col
    return c


def crosswalk():
    c = Canvas(T, T)
    for y in range(T):
        for x in range(T):
            c.px[y][x] = ST[1] if (x // 4) % 2 else (P.WHITE[3] if y % 8 else P.WHITE[2])
    return c
