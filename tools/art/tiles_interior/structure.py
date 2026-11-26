"""Floors, walls, rims, rugs, mats, stairs, doors: the room shell."""
from cv import T, Cv, O, OS, SH, P, darker

W = P.WOOD
WC = P.WALL_CREAM
ST = P.STONE
WH = P.WHITE
TE = P.ROOF_TEAL
VI = P.ROOF_VIOLET


# ---------------------------------------------------------------- floors

def wood_floor(base, seam, hi, joints, knots=(), hi2=None):
    """Long horizontal floorboards, 4px tall. joints: per plank row, the x of
    a butt joint or None (most rows run through the tile, so boards read
    as long planks instead of bricks)."""
    c = Cv(T, T)
    c.rect(0, 0, T, T, base)
    for k in range(4):
        y = k * 4
        c.hl(0, 15, y + 3, seam)
        j = joints[k]
        if j is None:
            continue
        c.vl(j, y, y + 2, seam)
        c.px((j + 1) % 16, y, hi)
        c.px((j + 1) % 16, y + 1, hi)
        c.px((j - 1) % 16, y + 2, seam if hi2 is None else hi2)
    for (x, y, col) in knots:
        c.px(x, y, col)
    return c


def floor_shadow(src, rows=3):
    """Floor tile with the wall's soft shadow on its top rows."""
    c = src.copy()
    for y in range(rows):
        for x in range(T):
            col = c.get(x, y)
            n = 2 if y == 0 else 1
            if y == rows - 1 and x % 2:
                continue
            c.px(x, y, darker(col, n), force=True)
    return c


def lab_floor(alt=False):
    """Clinic-clean 8px checker of white and pale aqua tiles."""
    c = Cv(T, T)
    for q in range(4):
        x0, y0 = (q % 2) * 8, (q // 2) * 8
        aq = q in (1, 2)
        base = P.GLASS[3] if aq else WH[2]
        c.rect(x0, y0, 8, 8, base)
        c.hl(x0, x0 + 6, y0, WH[3])
        c.vl(x0, y0, y0 + 6, WH[3])
        c.hl(x0 + 1, x0 + 7, y0 + 7, ST[3] if not aq else P.GLASS[2])
        c.vl(x0 + 7, y0 + 1, y0 + 7, ST[3] if not aq else P.GLASS[2])
    if alt:
        c.px(3, 4, WH[1]); c.px(4, 4, WH[1])
    return c


def center_floor(kind='plain'):
    """Model Center: large cream tiles, teal inlay variants."""
    c = Cv(T, T)
    c.rect(0, 0, T, T, WC[3])
    c.hl(0, 15, 15, WC[1])
    c.vl(15, 0, 15, WC[1])
    c.hl(0, 14, 0, P.WHITE[3])
    c.vl(0, 0, 14, P.WHITE[3])
    c.hl(1, 14, 14, WC[2])
    c.vl(14, 1, 14, WC[2])
    if kind == 'alt':
        c.px(10, 10, WC[2]); c.px(11, 10, WC[2]); c.px(5, 6, WC[2])
    if kind == 'inlay':
        for i in range(4):
            c.hl(7 - i, 8 + i, 4 + i, TE[2])
            c.hl(7 - i, 8 + i, 11 - i, TE[2])
        c.px(7, 4, TE[3]); c.px(8, 4, TE[3])
        c.px(7, 11, TE[1]); c.px(8, 11, TE[1])
        c.hl(6, 9, 7, TE[3])
    if kind == 'teal':
        c.rect(0, 0, T, T, TE[2])
        c.hl(0, 15, 15, TE[1])
        c.vl(15, 0, 15, TE[1])
        c.hl(0, 14, 0, TE[3])
        c.vl(0, 0, 14, TE[3])
        c.hl(1, 14, 14, TE[1])
        c.vl(14, 1, 14, TE[1])
        c.px(13, 2, TE[3]); c.px(12, 3, TE[3])
    return c


def mart_floor(alt=False):
    """Token Mart: white tiles, small lilac diamonds where corners meet."""
    c = Cv(T, T)
    c.rect(0, 0, T, T, WH[2])
    c.hl(0, 15, 15, WH[1])
    c.vl(15, 0, 15, WH[1])
    c.hl(0, 14, 0, WH[3])
    c.vl(0, 0, 14, WH[3])
    # quarter diamonds in each corner -> a 6px diamond at every grid node
    for i in range(3):
        n = 2 - i
        c.hl(0, n, i, VI[3]); c.hl(15 - n, 15, i, VI[3])
        c.hl(0, n, 15 - i, VI[3]); c.hl(15 - n, 15, 15 - i, VI[3])
    c.px(0, 0, VI[2]); c.px(15, 15, VI[2]); c.px(15, 0, VI[2]); c.px(0, 15, VI[2])
    if alt:
        c.px(8, 7, WH[1]); c.px(9, 8, WH[1])
    return c


# ---------------------------------------------------------------- walls
# A wall face is 16x32 (two rows: upper 'u', lower 'l'). The top 3px are
# the cap (wall thickness seen from above), the bottom 3px the baseboard.

THEMES = {}


def theme(name, rim):
    def deco(fn):
        THEMES[name] = (fn, rim)
        return fn
    return deco


def _cap(c, ramp):
    c.hl(0, 15, 0, O)
    c.hl(0, 15, 1, ramp[2])
    c.hl(0, 15, 2, ramp[1])
    c.hl(0, 15, 3, O)


def _rail(c, y, ramp):
    c.hl(0, 15, y, OS)
    c.hl(0, 15, y + 1, ramp[3] if len(ramp) > 3 else ramp[2])
    c.hl(0, 15, y + 2, ramp[2])
    c.hl(0, 15, y + 3, ramp[1])


def _wainscot(c, y0, y1, ramp, panel=8):
    """Panelled lower wall from y0..y1 (inclusive), ramp dark->light."""
    c.rect(0, y0, 16, y1 - y0 + 1, ramp[2])
    for px0 in range(0, 16, panel):
        # recessed panel: dark top/left inner edge, light bottom/right
        c.hl(px0 + 1, px0 + panel - 2, y0 + 1, ramp[1])
        c.vl(px0 + 1, y0 + 1, y1 - 1, ramp[1])
        c.hl(px0 + 2, px0 + panel - 2, y1 - 1, ramp[3] if len(ramp) > 3 else ramp[2])
        c.vl(px0 + panel - 2, y0 + 2, y1 - 1, ramp[3] if len(ramp) > 3 else ramp[2])
        c.vl(px0 + panel - 1, y0, y1, ramp[1])


def _baseboard(c, ramp):
    c.hl(0, 15, 28, OS)
    c.hl(0, 15, 29, ramp[2])
    c.hl(0, 15, 30, ramp[1])
    c.hl(0, 15, 31, O)


@theme('home', W)
def wall_home(c):
    """Warm cream wallpaper with soft stripes over a wood wainscot."""
    _cap(c, W)
    c.rect(0, 4, 16, 15, WC[2])
    for x in range(16):
        if x % 8 in (0, 1):
            c.vl(x, 4, 18, WC[3])
        if x % 8 == 2:
            c.vl(x, 4, 18, WC[1])
    # tiny leaf motif between stripes
    for (x, y) in ((5, 7), (5, 15)):
        c.px(x, y, P.CLOTH_ORANGE[2]); c.px(x - 1, y + 1, P.CLOTH_ORANGE[2])
        c.px(x, y + 1, P.ROOF_ORANGE[3]); c.px(x + 1, y + 1, P.CLOTH_ORANGE[2])
        c.px(x, y + 2, P.CLOTH_ORANGE[2])
    c.hl(0, 15, 4, WC[1])                     # cap shadow on paper
    _rail(c, 19, W)
    _wainscot(c, 23, 27, W)
    _baseboard(c, W)


@theme('bedroom', W)
def wall_bedroom(c):
    """Sky-blue paper with white dots, white-painted wainscot."""
    _cap(c, W)
    c.rect(0, 4, 16, 15, P.SKY[1])
    for x in range(16):
        if x % 8 in (3, 4):
            c.vl(x, 4, 18, P.SKY[2])
    for (x, y) in ((0, 8), (8, 14), (8, 6), (0, 16)):
        c.px(x, y, WH[3]); c.px(x + 1, y, WH[3])
        c.px(x, y + 1, WH[3]); c.px(x + 1, y + 1, WH[2])
    c.hl(0, 15, 4, P.SKY[0])
    _rail(c, 19, [WH[0], WH[1], WH[2], WH[3]])
    _wainscot(c, 23, 27, [WH[0], WH[1], WH[2], WH[3]])
    _baseboard(c, W)


@theme('neighbor', W)
def wall_neighbor(c):
    """Rosy stripes on cream; wood wainscot."""
    _cap(c, W)
    c.rect(0, 4, 16, 15, WC[3])
    for x in range(16):
        if x % 8 in (2, 3, 4):
            c.vl(x, 4, 18, P.CLOTH_PINK[2])
        if x % 8 == 5:
            c.vl(x, 4, 18, WC[2])
    c.hl(0, 15, 4, WC[1])
    _rail(c, 19, W)
    _wainscot(c, 23, 27, W)
    _baseboard(c, W)


@theme('lab', ST)
def wall_lab(c):
    """Clean white panels, blue accent stripe, slate lower panels."""
    _cap(c, ST)
    c.rect(0, 4, 16, 14, WH[2])
    c.hl(0, 15, 4, WH[1])
    c.vl(0, 5, 17, WH[3])
    c.vl(15, 5, 17, WH[1])
    c.hl(0, 15, 11, WH[1])
    c.hl(0, 15, 12, WH[3])
    for (x, y) in ((2, 6), (13, 6), (2, 15), (13, 15)):
        c.px(x, y, ST[3])                      # panel rivets
    c.hl(0, 15, 18, OS)
    c.hl(0, 15, 19, P.GLASS[2])
    c.hl(0, 15, 20, P.GLASS[1])
    c.hl(0, 15, 21, P.GLASS[0])
    c.hl(0, 15, 22, OS)
    _wainscot(c, 23, 27, ST[1:])
    c.hl(0, 15, 28, OS)
    c.hl(0, 15, 29, ST[1])
    c.hl(0, 15, 30, ST[0])
    c.hl(0, 15, 31, O)


@theme('center', TE)
def wall_center(c):
    """Cream upper wall, teal band and teal panels (Model Center)."""
    _cap(c, TE)
    c.rect(0, 4, 16, 14, WC[3])
    c.hl(0, 15, 4, WC[1])
    for x in range(0, 16, 4):
        c.vl(x, 5, 17, WC[2])
    c.hl(0, 15, 17, WC[2])
    c.hl(0, 15, 18, OS)
    c.hl(0, 15, 19, TE[3])
    c.hl(0, 15, 20, TE[2])
    c.hl(0, 15, 21, TE[1])
    c.hl(0, 15, 22, OS)
    _wainscot(c, 23, 27, [TE[0], TE[1], TE[2], TE[3]])
    c.hl(0, 15, 28, OS)
    c.hl(0, 15, 29, TE[1])
    c.hl(0, 15, 30, TE[0])
    c.hl(0, 15, 31, O)


@theme('mart', VI)
def wall_mart(c):
    """White wallpaper with a lilac diamond lattice, violet band + panels."""
    _cap(c, VI)
    c.rect(0, 4, 16, 14, WH[2])
    c.hl(0, 15, 4, WH[1])
    for (x, y) in ((4, 8), (12, 14)):
        c.px(x, y - 1, VI[3]); c.px(x - 1, y, VI[3]); c.px(x + 1, y, VI[3])
        c.px(x, y + 1, VI[3]); c.px(x, y, VI[2])
    for (x, y) in ((12, 8), (4, 14)):
        c.px(x, y, WH[3]); c.px(x + 1, y, WH[1])
    c.hl(0, 15, 17, WH[1])
    c.hl(0, 15, 18, OS)
    c.hl(0, 15, 19, VI[3])
    c.hl(0, 15, 20, VI[2])
    c.hl(0, 15, 21, VI[1])
    c.hl(0, 15, 22, OS)
    _wainscot(c, 23, 27, [VI[0], VI[1], VI[2], VI[3]])
    c.hl(0, 15, 28, OS)
    c.hl(0, 15, 29, VI[1])
    c.hl(0, 15, 30, VI[0])
    c.hl(0, 15, 31, O)


def wall_face(name):
    fn, _ = THEMES[name]
    c = Cv(T, 2 * T)
    fn(c)
    return c


def corner_shade(face, side):
    """Wall-face column next to a side wall: inner-corner shadow."""
    c = face.copy()
    xs = (0, 1) if side == 'l' else (15, 14)
    for i, x in enumerate(xs):
        for y in range(4, 28):
            col = c.get(x, y)
            if i == 0 or y % 2 == 0:
                c.px(x, y, darker(col), force=True)
    return c


# ---------------------------------------------------------------- rims
# Rim tiles sit OUTSIDE the floor rectangle: the thin top edge of the side
# and front walls seen from above, with void beyond. All solid.

def rim_set(ramp):
    d, m, l = ramp[0], ramp[1], ramp[2]
    out = {}
    void = Cv(T, T, O)

    def vert(x_in):
        # x_in: the column adjacent to the floor (0 or 15)
        c = Cv(T, T, O)
        if x_in == 15:
            c.vl(12, 0, 15, l)
            c.vl(13, 0, 15, m)
            c.vl(14, 0, 15, m)
            c.vl(15, 0, 15, d)
        else:
            c.vl(0, 0, 15, OS)
            c.vl(1, 0, 15, l)
            c.vl(2, 0, 15, m)
            c.vl(3, 0, 15, d)
        return c

    out['l'] = vert(15)
    out['r'] = vert(0)
    b = Cv(T, T, O)
    b.hl(0, 15, 0, d)
    b.hl(0, 15, 1, l)
    b.hl(0, 15, 2, m)
    b.hl(0, 15, 3, d)
    out['b'] = b
    bl = out['l'].copy()
    bl.rect(12, 0, 4, 16, O)
    bl.vl(12, 0, 3, l); bl.vl(13, 0, 2, m); bl.vl(14, 0, 2, m); bl.vl(15, 0, 0, d)
    bl.hl(12, 15, 1, l); bl.hl(13, 15, 2, m); bl.hl(13, 15, 3, d)
    bl.px(15, 0, d)
    out['bl'] = bl
    br = out['r'].copy()
    br.rect(0, 0, 4, 16, O)
    br.vl(1, 0, 3, l); br.vl(2, 0, 2, m); br.vl(3, 0, 2, d); br.px(0, 0, OS)
    br.hl(0, 2, 1, l); br.hl(0, 2, 2, m); br.hl(0, 3, 3, d)
    br.px(0, 0, d)
    out['br'] = br
    tl = out['l'].copy()
    tl.rect(12, 0, 4, 1, O)
    tl.hl(12, 15, 1, l)
    out['tl'] = tl
    tr = out['r'].copy()
    tr.rect(0, 0, 4, 1, O)
    tr.hl(0, 3, 1, l)
    out['tr'] = tr
    # gap in the front wall under an exit mat: posts at both ends
    g = Cv(T, T, O)
    out['b_door'] = g
    out['void'] = void
    return out


# ---------------------------------------------------------------- rugs

RUGS = {
    # field, field_dark, field_light, border, border_dark, trim
    'red': (P.CLOTH_RED[1], P.CLOTH_RED[0], P.CLOTH_RED[2],
            P.CLOTH_YELLOW[1], P.CLOTH_YELLOW[0], P.CLOTH_YELLOW[2]),
    'blue': (P.CLOTH_BLUE[1], P.CLOTH_BLUE[0], P.CLOTH_BLUE[2],
             WH[2], WH[1], WH[3]),
    'teal': (TE[1], TE[0], TE[2], WC[3], WC[1], WH[3]),
    'violet': (P.CLOTH_VIOLET[1], P.CLOTH_VIOLET[0], P.CLOTH_VIOLET[2],
               P.CLOTH_YELLOW[2], P.CLOTH_YELLOW[1], WH[3]),
}


def rug_pieces(colours):
    """Return {c,n,s,e,w,ne,nw,se,sw} 16x16 Cv pieces from a 48x48 rug."""
    f, fd, fl, b, bd, tr = colours
    c = Cv(48, 48)
    c.rect(1, 1, 46, 46, f)
    # tiled field motif: soft diamond lattice + medallion dots (period 16)
    for ty in range(3):
        for tx in range(3):
            ox, oy = tx * 16, ty * 16
            for i in range(8):
                c.px(ox + i, oy + 8 - i, fd)
                c.px(ox + 8 + i, oy + i, fd)
                c.px(ox + i, oy + 8 + i, fd)
                c.px(ox + 8 + i, oy + 16 - i, fd)
            c.rect(ox + 7, oy + 7, 2, 2, fl)
            c.px(ox + 7, oy + 6, b); c.px(ox + 8, oy + 9, b)
            c.px(ox + 6, oy + 8, b); c.px(ox + 9, oy + 7, b)
    # border band
    c.frame(1, 1, 46, 46, b)
    c.frame(2, 2, 44, 44, b)
    c.frame(3, 3, 42, 42, bd)
    c.frame(4, 4, 40, 40, fd)
    for k in range(3, 45, 4):
        for (x, y) in ((k, 1), (1, k)):
            c.px(x, y, tr)
        for (x, y) in ((k + 2, 46), (46, k + 2)):
            c.px(x, y, bd)
    c.frame(0, 0, 48, 48, OS, round_=True)
    c.hl(1, 46, 47, OS)
    c.px(1, 1, OS); c.px(46, 1, OS); c.px(1, 46, OS); c.px(46, 46, OS)
    names = [['nw', 'n', 'ne'], ['w', 'c', 'e'], ['sw', 's', 'se']]
    out = {}
    for y in range(3):
        for x in range(3):
            out[names[y][x]] = c.crop(x * 16, y * 16, 16, 16)
    return out


def mat(colour=P.CLOTH_GREEN, part='single'):
    """Exit / door mat. part: single, l, r."""
    c = Cv(T, T)
    x0 = 1 if part in ('single', 'l') else 0
    x1 = 14 if part in ('single', 'r') else 15
    d, m, l = colour
    c.rect(x0, 4, x1 - x0 + 1, 10, m)
    for y in range(5, 13):
        for x in range(x0 + 1, x1):
            if (x + y) % 4 == 0:
                c.px(x, y, d)
            elif (x + y) % 4 == 2 and y < 8:
                c.px(x, y, l)
    c.hl(x0, x1, 4, l)
    c.hl(x0, x1, 13, d)
    c.hl(x0, x1, 3, OS)
    c.hl(x0, x1, 14, OS)
    if part in ('single', 'l'):
        c.vl(x0 - 1, 4, 13, OS)
    if part in ('single', 'r'):
        c.vl(x1 + 1, 4, 13, OS)
    c.hl(x0 + 1, x1, 15, SH)
    # fringe
    for x in range(x0 + 1, x1, 2):
        c.px(x, 2, P.WALL_CREAM[2])
        c.px(x, 15, P.WALL_CREAM[2])
    return c


# ---------------------------------------------------------------- stairs

def stairs_up(ramp_wall=None):
    """2x2 opaque, replaces the wall face. Steps climb into the wall,
    going up to the right; the top is a dark landing."""
    c = Cv(32, 32, O)
    # side stringer walls
    c.rect(0, 0, 3, 32, W[1])
    c.vl(1, 0, 31, W[2])
    c.vl(2, 0, 31, W[0])
    c.rect(29, 0, 3, 32, W[1])
    c.vl(29, 0, 31, W[0])
    c.vl(30, 0, 31, W[2])
    # steps: each 4px: tread (lit) + riser (shade); deeper = darker
    ramps = [(W[3], W[2]), (W[3], W[2]), (W[2], W[1]), (W[2], W[1]),
             (W[1], W[0]), (W[1], W[0]), (W[0], OS), (OS, O)]
    for i in range(8):
        y = 31 - i * 4 - 3
        tread, riser = ramps[i]
        c.rect(3, y, 26, 2, tread)
        c.rect(3, y + 2, 26, 2, riser)
        c.hl(3, 28, y, P.WOOD[4] if i < 2 else tread)
        c.hl(3, 28, y + 3, O if i < 6 else O)
    c.rect(3, 0, 26, 4, O)
    # banister on the right with posts
    for y in range(4, 32, 6):
        c.px(27, y, W[3])
    c.vl(0, 0, 31, O)
    c.vl(31, 0, 31, O)
    c.hl(0, 31, 0, O)
    return c


def stairs_down():
    """2x2 opaque, replaces floor next to the back wall: an opening in the
    floor with steps descending north, banister posts on the south lip."""
    c = Cv(32, 32, O)
    c.rect(0, 0, 3, 32, W[1]); c.vl(1, 0, 31, W[2]); c.vl(2, 0, 31, W[0])
    c.rect(29, 0, 3, 32, W[1]); c.vl(29, 0, 31, W[0]); c.vl(30, 0, 31, W[2])
    ramps = [(OS, O), (W[0], OS), (W[1], W[0]), (W[1], W[0]),
             (W[2], W[1]), (W[2], W[1]), (W[3], W[2])]
    for i in range(7):
        y = 3 + i * 4
        tread, riser = ramps[i]
        c.rect(3, y, 26, 3, tread)
        c.hl(3, 28, y + 3, riser)
        c.hl(3, 28, y, tread if i < 5 else P.WOOD[4])
    c.rect(3, 0, 26, 3, O)
    # south lip / nosing
    c.hl(0, 31, 31, O)
    c.vl(0, 0, 31, O); c.vl(31, 0, 31, O)
    return c


def inner_door(frame=W, leaf=W):
    """1x2 wall overlay: a closed wooden door in the wall face."""
    c = Cv(T, 32)
    c.rect(1, 6, 14, 26, frame[1])
    c.frame(1, 6, 14, 26, O)
    c.rect(3, 8, 10, 23, leaf[2])
    c.hl(3, 12, 8, leaf[3])
    c.vl(3, 8, 30, leaf[3])
    c.vl(12, 9, 30, leaf[1])
    c.frame(4, 10, 8, 8, leaf[1])
    c.frame(4, 20, 8, 9, leaf[1])
    c.px(11, 19, P.CLOTH_YELLOW[2]); c.px(11, 20, P.CLOTH_YELLOW[1])
    c.hl(2, 13, 31, O)
    return c
