"""Props: code-drawn fences (must tile), generated signs/mailbox/lamp/bench."""
import lib  # noqa: F401  (path setup)
import palette as P
import genart
from lib import Canvas, T

O = P.OUTLINE
WD = P.WOOD
WH = P.WHITE


def _shadow_row(c, x0, x1, y):
    for x in range(x0, x1 + 1):
        c.put(x, y, P.SHADOW)


# ---------------------------------------------------------------- fences
def fence(style, conn):
    """style 'wood' | 'white'; conn: subset of 'nesw' = which neighbours
    this fence piece connects to."""
    c = Canvas(T, T)
    ramp = WD if style == 'wood' else [WH[0], WH[1], WH[2], WH[3], WH[3]]
    dark, mid, lit, hi = ramp[1], ramp[2], ramp[3], ramp[4]
    px0, px1 = 6, 9         # post columns
    top, bot = 3, 14        # post rows

    # rails / pickets towards e / w
    def hseg(x0, x1):
        if style == 'wood':
            for ry in (5, 10):
                for x in range(x0, x1 + 1):
                    c.set(x, ry - 1, O)
                    c.set(x, ry, hi if x % 7 else lit)
                    c.set(x, ry + 1, mid)
                    c.set(x, ry + 2, O)
                _shadow_row(c, x0 + 1, x1 + 1, ry + 3)
        else:
            OSo = P.OUTLINE_SOFT
            for x in range(x0, x1 + 1):     # rails behind the pickets
                c.set(x, 6, OSo); c.set(x, 7, WH[1]); c.set(x, 8, OSo)
                c.set(x, 10, OSo); c.set(x, 11, WH[1]); c.set(x, 12, OSo)
            for sx in range(x0, x1 + 1):
                k = sx % 4
                if k == 0:
                    continue
                top_y = 4 if k == 2 else 5
                c.set(sx, top_y, OSo)
                for y in range(top_y + 1, 14):
                    c.set(sx, y, {1: WH[2], 2: WH[3], 3: WH[1]}[k])
                c.set(sx, 14, OSo)
            _shadow_row(c, x0 + 1, x1 + 1, 15)

    if 'w' in conn:
        hseg(0, px0 - 1)
    if 'e' in conn:
        hseg(px1 + 1, T - 1)
    # vertical connection: a rail seen end-on running north/south
    def vseg(y0, y1):
        oc = O if style == 'wood' else P.OUTLINE_SOFT
        for y in range(y0, y1 + 1):
            c.set(px0, y, oc); c.set(px1, y, oc)
            c.set(px0 + 1, y, lit if style == 'wood' else WH[3]); c.set(px0 + 2, y, mid)
            c.put(px1 + 1, y, P.SHADOW)
            if style == 'wood' and y % 8 == 7:
                c.set(px0 + 1, y, mid); c.set(px0 + 2, y, dark)
    if 'n' in conn:
        vseg(0, top - 1)
    if 's' in conn:
        vseg(bot + 1, T - 1)
    # post
    for y in range(top, bot + 1):
        for x in range(px0, px1 + 1):
            edge = x in (px0, px1) or y in (top, bot)
            if edge:
                col = O if style == 'wood' else P.OUTLINE_SOFT
            elif y == top + 1:
                col = hi
            elif x == px0 + 1:
                col = lit
            else:
                col = mid if y < bot - 1 else dark
            c.set(x, y, col)
    if style == 'white':
        # pointed cap on the white post
        c.set(px0 + 1, top - 1, P.OUTLINE_SOFT); c.set(px0 + 2, top - 1, P.OUTLINE_SOFT)
        c.set(px0, top, P.OUTLINE_SOFT); c.set(px1, top, P.OUTLINE_SOFT)
        c.set(px0 + 1, top, WH[3]); c.set(px0 + 2, top, WH[3])
    c.put(px1 + 1, bot, P.SHADOW); c.put(px1 + 1, bot - 1, P.SHADOW)
    if 's' not in conn:
        _shadow_row(c, px0 + 1, px1 + 1, bot + 1)
    return c


FENCE_NAMES = {
    'h': 'ew', 'end_w': 'e', 'end_e': 'w', 'v': 'ns', 'end_n': 's', 'end_s': 'n',
    'corner_nw': 'es', 'corner_ne': 'sw', 'corner_sw': 'ne', 'corner_se': 'nw',
    't_n': 'esw', 't_s': 'new', 't_e': 'nsw', 't_w': 'nes', 'cross': 'nesw', 'post': '',
}


# ------------------------------------------------------------ generated
def _fit(name, w=None, h=None, colors=32, sat=1.2, holes=False):
    return genart.sprite(name, width=w, height=h, colors=colors, sat=sat, key_holes=holes)


def _place(sprite, cw, ch, shadow=True, sx=None):
    c = Canvas(cw, ch)
    x = (cw - sprite.w) // 2 if sx is None else sx
    y = ch - sprite.h - 1
    if shadow:
        for xx in range(x + 2, x + sprite.w + 1):
            c.put(xx, ch - 1, P.SHADOW)
    c.blit(sprite, x, y)
    return c


def signpost():
    return _place(_fit('ext_signpost', w=14), T, T)


def town_sign():
    return _place(_fit('ext_townsign', w=30), 32, 32)


def mailbox():
    return _place(_fit('ext_mailbox', w=12), T, T)


def lamp():
    return _place(_fit('ext_lamp', h=30), T, 32)


def bench():
    return _place(_fit('ext_bench', w=30), 32, T)


def planter():
    return _place(_fit('ext_planter', w=14), T, T)


def crate():
    return _place(_fit('ext_crate', w=14), T, T)


# ------------------------------------------------------- animated props
_WATERY = set(P.WATER) | set(P.GLASS) | set(P.SKY)


def _wrank(c):
    for ramp in (P.WATER, P.GLASS, P.SKY):
        if c in ramp:
            return ramp.index(c) / (len(ramp) - 1)
    return None


def fountain_frames(n=3):
    """48x48 fountain; water surface + spout shimmer in code (n frames)."""
    s = _fit('ext_fountain', w=46, colors=40, sat=1.25)
    base = Canvas(48, 48)
    ox, oy = 1, 48 - s.h - 1
    for x in range(ox + 3, ox + s.w + 1):
        base.put(x, 47, P.SHADOW)
    base.blit(s, ox, oy)
    # normalise all watery pixels onto the WATER ramp
    pts = []
    for y in range(48):
        for x in range(48):
            r = _wrank(base.px[y][x])
            if r is not None:
                k = 0 if r < 0.3 else 1 if r < 0.6 else 2 if r < 0.85 else 3
                base.px[y][x] = P.WATER[k]
                pts.append((x, y, k))
    pool_top = 48 * 0.45   # rough split: above = spout, below = pool
    frames = []
    for f in range(n):
        c = base.copy()
        for x, y, k in pts:
            if y < pool_top:     # falling spout: bright streaks travel down
                if k >= 1 and (y + 3 * (n - f)) % 4 == 0:
                    c.px[y][x] = P.WATER[3] if k >= 2 else P.WATER[2]
                elif k == 3 and (y + 3 * (n - f)) % 4 == 2:
                    c.px[y][x] = P.WATER[2]
            else:                # pool: ripple glints drift sideways
                if k in (1, 2) and (x * 2 + y * 3 + f * 4) % 11 == 0:
                    c.px[y][x] = P.WATER[3]
                elif k == 3 and (x + y + f) % 3 == 0:
                    c.px[y][x] = P.WATER[2]
        frames.append(c)
    return frames


def signal_tower_frames():
    """32x48 relay mast; the beacon blinks (2 frames)."""
    s = _fit('ext_signal_tower', h=46, colors=40, sat=1.2)
    base = Canvas(32, 48)
    ox, oy = (32 - s.w) // 2, 48 - s.h - 1
    for x in range(ox + 3, ox + s.w + 2):
        base.put(x, 47, P.SHADOW)
    base.blit(s, ox, oy)
    reds = set(P.CLOTH_RED) | set(P.ROOF_RED) | {P.FLOWER['red']} | set(P.HP_RED) | set(P.CLOTH_PINK)
    beacon = [(x, y) for y in range(0, 10) for x in range(32) if base.px[y][x] in reds]
    # the lattice snapped to pinks: put it back on a white/teal-ish metal ramp
    body = [base.px[y][x] for y in range(10, 48) for x in range(32)
            if base.px[y][x][3] == 255 and base.px[y][x][0] > base.px[y][x][1] + 25]
    if body:
        genart.remap_ramp(base, (0, 10, 32, 38), list(set(body)), P.WHITE[:3])
    on = base.copy()
    off = base.copy()
    if beacon:
        cx = sum(p[0] for p in beacon) / len(beacon)
        cy = sum(p[1] for p in beacon) / len(beacon)
        for x, y in beacon:
            on.px[y][x] = P.HP_RED[1] if (x <= cx and y <= cy) else P.CLOTH_RED[1]
            off.px[y][x] = P.CLOTH_RED[0]
        # glint + glow halo on the lit frame
        on.set(int(cx) - 1, int(cy) - 1, P.WHITE[3])
        for dx, dy in ((-3, 0), (3, 0), (0, -3)):
            x, y = int(round(cx)) + dx, int(round(cy)) + dy
            if on.get(x, y)[3] == 0:
                on.set(x, y, P.FLOWER['red'])
    return [on, off]


# ------------------------------------------------------------- city kit
def bollard():
    c = Canvas(T, T)
    M = P.METAL
    for x in range(5, 12):
        c.put(x + 1, 15, P.SHADOW)
    rows = ['..ooo..',
            '.oHhmo.',
            'oHhmmdo',
            'oyYyydo',
            'oHhmmdo',
            'oHhmmdo',
            'oyYyydo',
            'oHhmmdo',
            'oHhmmdo',
            'ohmmddo',
            '.ooooo.']
    lg = {'o': O, 'H': M[3], 'h': M[2], 'm': M[1], 'd': M[0],
          'y': P.CLOTH_YELLOW[1], 'Y': P.CLOTH_YELLOW[2]}
    c.pmap(5, 4, rows, lg)
    return c


def hedge(conn):
    """Clipped box hedge; conn = subset of 'nesw' joined neighbours."""
    TR = P.TREE
    c = Canvas(T, T)
    x0 = 0 if 'w' in conn else 1
    x1 = 15 if 'e' in conn else 14
    y0 = 0 if 'n' in conn else 2
    y1 = 15 if 's' in conn else 14
    inside = lambda x, y: x0 <= x <= x1 and y0 <= y <= y1  # noqa: E731
    front = 0 if 's' in conn else 4      # rows of darker front face
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            lx = (x + 2 * ((y // 3) % 2)) % 4
            ly = y % 3
            is_front = y > y1 - front
            ramp = (TR[1], TR[2], TR[3]) if is_front else (TR[2], TR[3], TR[4])
            if ly == 0 and lx in (0, 1):
                col = ramp[2]           # sunlit leaf tip
            elif ly == 2 and lx in (1, 2):
                col = ramp[0]           # shade under the leaf clump
            else:
                col = ramp[1]
            if is_front and y == y1 - front + 1:
                col = TR[1]
            c.px[y][x] = col
    # outline on the free sides
    for y in range(T):
        for x in range(T):
            if not inside(x, y):
                continue
            if (x == x0 and 'w' not in conn) or (x == x1 and 'e' not in conn) or \
               (y == y0 and 'n' not in conn) or (y == y1 and 's' not in conn):
                c.px[y][x] = O
    if 's' not in conn:
        for x in range(x0 + 1, min(T, x1 + 2)):
            c.put(x, 15, P.SHADOW)
    return c


def kiosk_frames():
    s = _fit('ext_kiosk', h=30, colors=32, sat=1.2)
    base = _place(s, T, 32)
    glow = set(P.GLASS) | set(P.SKY) | set(P.WATER)
    scr = [(x, y) for y in range(32) for x in range(T) if base.px[y][x] in glow]
    a, b = base.copy(), base.copy()
    for x, y in scr:
        a.px[y][x] = P.GLASS[3] if (y % 3 == 0) else P.GLASS[2]
        b.px[y][x] = P.GLASS[2] if (y % 3 == 0) else P.GLASS[1]
    # blinking cursor line on frame a
    if scr:
        ys = sorted(set(y for _, y in scr))
        xs = sorted(set(x for x, _ in scr))
        yy = ys[len(ys) // 2]
        for x in xs[1:3]:
            a.set(x, yy, P.WHITE[3])
    return [a, b]


def billboard():
    return _place(_fit('ext_billboard', w=46, colors=40), 48, 32)


def streetlight_modern():
    return _place(_fit('ext_streetlight', h=30, colors=32), T, 32)


def bike_rack():
    return _place(_fit('ext_bikerack', w=30, colors=32, holes=True), 32, T)
