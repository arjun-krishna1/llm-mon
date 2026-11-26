"""Furniture & props.

Big pieces come from generated sources (tools/art/gen/raw/int_*.png, prompts
in gen_prompts.py) reduced to tile scale by gensrc.reduce with a per-object
palette subset so they sit with the code-drawn shell. Pieces that must tile
(counters) and tiny props are drawn in code.
"""
import os

from cv import T, Cv, O, OS, SH, P, block
import gensrc

W = P.WOOD
WH = P.WHITE
TE = P.ROOF_TEAL
VI = P.ROOF_VIOLET
WC = P.WALL_CREAM
ST = P.STONE
M = P.METAL


def pal(*ramps, extra=()):
    cols = {O[:3], OS[:3]}
    for r in ramps:
        for c in (r.values() if isinstance(r, dict) else r):
            cols.add(c[:3])
    for c in extra:
        cols.add(c[:3])
    return sorted(cols)


BOOKS = (P.CLOTH_RED, P.CLOTH_BLUE, P.CLOTH_GREEN, P.CLOTH_YELLOW, P.CLOTH_VIOLET)


def have(name):
    return os.path.exists(os.path.join(gensrc.RAW, name + '.png'))


def shadow_under(c, x0=None, x1=None):
    """Soft floor shadow: 1px under the silhouette's bottom and right side."""
    pts = []
    for y in range(c.h):
        for x in range(c.w):
            if c.get(x, y)[3] == 0:
                above = c.get(x, y - 1)[3] == 255
                left = c.get(x - 1, y)[3] == 255 and c.get(x - 1, y - 2)[3] == 255
                if above and y >= c.h - 3:
                    pts.append((x, y))
                elif left and y >= c.h - 16 and y > 2:
                    pts.append((x, y))
    for x, y in pts:
        c.px(x, y, SH)


def gen(name, tw, th, *, w=None, h=None, box=None, palette=None, pad_b=1,
        dx=0, dy=0, shadow=True, dark_bias=0.34, fit='stretch'):
    """Reduce generated art into a (tw x th tiles) canvas.

    w/h: drawn size in px (default fills the canvas minus pad_b for shadow).
    The sprite is centred horizontally and sits pad_b px above the bottom.
    """
    cw, ch = tw * T, th * T
    w = w or cw
    h = h or (ch - pad_b)
    spr = gensrc.reduce(name, w, h, box=box, pal=palette, dark_bias=dark_bias,
                        fit=fit)
    c = Cv(cw, ch)
    c.paste(spr, (cw - w) // 2 + dx, ch - pad_b - h + dy)
    if shadow:
        shadow_under(c)
    return c


# ------------------------------------------------------------ counters

def counter_piece(kind, top, front, accent, *, part='m'):
    """16x32 counter piece. Row 0 = counter top (over layer, covers the feet
    of whoever stands behind), row 1 = front face (base, solid + counter).
    Pieces tile seamlessly: l + m* + r, or s for a 1-wide counter."""
    c = Cv(T, 32)
    t_d, t_m, t_l, t_hi = top
    f_d, f_m, f_l = front
    a_d, a_m, a_l = accent
    # top surface y9..15
    c.rect(0, 9, 16, 7, t_m)
    c.hl(0, 15, 9, O)
    c.hl(0, 15, 10, t_hi)
    c.hl(0, 15, 13, t_d if kind == 'heal' else t_m)
    if kind == 'heal':
        c.hl(0, 15, 12, t_l)
        for x in range(0, 16, 4):
            c.px(x + 1, 13, t_l)
    if kind == 'shop':                       # wood grain on the counter top
        for x, y in ((2, 11), (3, 11), (9, 12), (10, 12), (11, 12), (14, 11)):
            c.px(x, y, t_d)
    else:
        c.px(4, 11, WH[3]); c.px(5, 11, WH[3]); c.px(12, 12, WH[3])
    c.hl(0, 15, 14, a_l)                     # coloured front lip
    c.hl(0, 15, 15, a_m)
    c.hl(0, 15, 16, O)
    # front face y17..28: one accent pilaster per tile + a wide inset panel
    c.rect(0, 17, 16, 11, f_m)
    c.vl(0, 17, 27, a_l)
    c.vl(1, 17, 27, a_m)
    c.vl(2, 17, 27, a_d)
    c.hl(4, 14, 19, f_d)
    c.vl(4, 19, 25, f_d)
    c.hl(5, 14, 25, f_l)
    c.vl(14, 20, 25, f_l)
    c.hl(5, 13, 22, a_m)                     # accent stripe in the panel
    c.hl(5, 13, 21, a_l)
    c.hl(0, 15, 17, f_l)
    c.hl(0, 15, 27, f_d)
    c.hl(0, 15, 28, a_d)
    c.hl(0, 15, 29, O)
    c.hl(0, 15, 30, SH)
    c.hl(1, 15, 31, SH)
    if part in ('l', 's'):
        c.vl(0, 10, 28, O)
        c.vl(1, 10, 13, t_hi)
        c.vl(1, 17, 27, a_l)
        c.clear_px(0, 9); c.clear_px(0, 29)
        c.clear_px(0, 30); c.clear_px(0, 31)
    if part in ('r', 's'):
        c.vl(15, 10, 28, O)
        c.vl(14, 17, 27, f_d)
        c.vl(14, 10, 15, a_d if False else t_d)
        c.clear_px(15, 9); c.clear_px(15, 29)
        c.px(15, 30, SH); c.px(15, 31, SH)
    return c


# ------------------------------------------------------------ code props

def notebook():
    """Small item overlay for a desk top (detail2): the controls notebook."""
    c = Cv(T, T)
    c.rect(3, 5, 10, 7, P.CLOTH_RED[1])
    c.frame(3, 5, 10, 7, O)
    c.hl(4, 11, 6, P.CLOTH_RED[2])
    c.vl(4, 6, 10, P.CLOTH_RED[2])
    c.hl(4, 11, 10, WH[3])
    c.px(9, 7, P.CLOTH_YELLOW[2]); c.px(10, 7, P.CLOTH_YELLOW[2])
    c.vl(10, 4, 5, P.CLOTH_YELLOW[1])
    return c


def stairs_up():
    """2x2 opaque stairs climbing into the back wall (replaces the face)."""
    c = Cv(32, 32, O)
    # treads: 7 steps of 4px, lighter = nearer
    steps = [(W[4], W[3], W[2]), (W[4], W[3], W[2]), (W[4], W[3], W[1]),
             (W[3], W[2], W[1]), (W[3], W[2], W[0]), (W[2], W[1], W[0]),
             (W[1], W[0], OS)]
    for i, (hi, tread, riser) in enumerate(steps):
        y = 28 - i * 4
        c.hl(4, 27, y, hi)
        c.hl(4, 27, y + 1, tread)
        c.hl(4, 27, y + 2, riser)
        c.hl(4, 27, y + 3, O)
        c.px(4, y, tread)
    c.rect(4, 0, 24, 4, O)
    # side stringers with banister rails
    for x0, flip in ((0, False), (28, True)):
        c.rect(x0, 0, 4, 32, W[1])
        c.vl(x0 + (2 if flip else 1), 0, 31, W[2])
        c.vl(x0 + (0 if flip else 3), 0, 31, O)
        c.vl(x0 + (3 if flip else 0), 0, 31, O)
        for y in range(2, 32, 5):
            c.px(x0 + (1 if flip else 2), y, W[3])
    c.rect(0, 26, 4, 6, W[2]); c.frame(0, 26, 4, 6, O); c.hl(1, 2, 27, W[4])
    c.rect(28, 26, 4, 6, W[2]); c.frame(28, 26, 4, 6, O); c.hl(29, 30, 27, W[4])
    return c


def stairs_down():
    """2x2 opaque opening in the floor with steps descending north."""
    c = Cv(32, 32, O)
    steps = [(OS, O, O), (W[0], OS, O), (W[1], W[0], O), (W[2], W[1], O),
             (W[3], W[2], O), (W[3], W[2], O), (W[4], W[3], O)]
    for i, (hi, tread, edge) in enumerate(steps):
        y = 4 + i * 4
        c.hl(4, 27, y, hi)
        c.hl(4, 27, y + 1, tread)
        c.hl(4, 27, y + 2, tread)
        c.hl(4, 27, y + 3, edge)
    c.rect(4, 0, 24, 4, O)
    for x0, flip in ((0, False), (28, True)):
        c.rect(x0, 0, 4, 32, W[2])
        c.vl(x0 + (2 if flip else 1), 0, 31, W[3])
        c.vl(x0 + (0 if flip else 3), 0, 31, O)
        c.vl(x0 + (3 if flip else 0), 0, 31, O)
        c.hl(x0, x0 + 3, 0, O)
    c.rect(0, 0, 4, 5, W[3]); c.frame(0, 0, 4, 5, O); c.hl(1, 2, 1, W[4])
    c.rect(28, 0, 4, 5, W[3]); c.frame(28, 0, 4, 5, O); c.hl(29, 30, 1, W[4])
    c.hl(0, 31, 31, O)
    return c


# ------------------------------------------------------------ props sheets

def components(name, min_px=200):
    """Bounding boxes of separate subjects on a magenta sheet, reading order."""
    im = gensrc.load(name)
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    boxes = []
    for y in range(h):
        for x in range(w):
            if seen[y * w + x] or gensrc.is_bg(*px[x, y]):
                continue
            stack = [(x, y)]
            seen[y * w + x] = 1
            x0 = x1 = x
            y0 = y1 = y
            n = 0
            while stack:
                a, b = stack.pop()
                n += 1
                x0, x1, y0, y1 = min(x0, a), max(x1, a), min(y0, b), max(y1, b)
                for da, db in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    q, r = a + da, b + db
                    if 0 <= q < w and 0 <= r < h and not seen[r * w + q] \
                            and not gensrc.is_bg(*px[q, r]):
                        seen[r * w + q] = 1
                        stack.append((q, r))
            if n >= min_px:
                boxes.append((x0, y0, x1 + 1, y1 + 1))
    rows = []
    for b in sorted(boxes, key=lambda b: b[1]):
        for r in rows:
            if b[1] < r[0][3] - 10:
                r.append(b)
                break
        else:
            rows.append([b])
    return [b for r in rows for b in sorted(r, key=lambda b: b[0])]


# ------------------------------------------------------------ animation

def _lighten_map(ramps):
    m = {}
    for r in ramps:
        for i in range(len(r) - 1):
            m[r[i]] = r[i + 1]
    return m


def glow(c, ramps, box=None, swap=None):
    """Second animation frame: pixels of `ramps` inside box get one step
    lighter (a pulse); `swap` maps colours directly (blinking LEDs)."""
    if c is None:
        return None
    f = c.copy()
    m = _lighten_map(ramps)
    if swap:
        m.update(swap)
    x0, y0, x1, y1 = box or (0, 0, c.w, c.h)
    f.recolor(x0, y0, x1 - x0, y1 - y0, m)
    return f


def whiteboard():
    """2x2 wall overlay: lab whiteboard with marker scribbles."""
    c = Cv(32, 32)
    c.rect(1, 5, 30, 18, M[2])
    c.frame(1, 5, 30, 18, O)
    c.rect(3, 7, 26, 13, WH[3])
    c.hl(3, 28, 19, WH[1])
    c.vl(28, 7, 19, WH[1])
    # scribbles: a little network diagram + text lines
    for (x, y) in ((6, 10), (12, 9), (12, 14), (18, 11)):
        c.rect(x, y, 3, 3, P.CLOTH_BLUE[1])
    c.hl(9, 11, 11, P.CLOTH_BLUE[2]); c.px(15, 10, P.CLOTH_BLUE[2])
    c.px(15, 13, P.CLOTH_BLUE[2]); c.px(16, 12, P.CLOTH_BLUE[2])
    c.px(9, 12, P.CLOTH_BLUE[2]); c.px(10, 13, P.CLOTH_BLUE[2]); c.px(11, 14, P.CLOTH_BLUE[2])
    c.hl(22, 26, 9, P.CLOTH_RED[1]); c.hl(22, 25, 11, OS); c.hl(22, 26, 13, OS)
    c.hl(22, 24, 15, OS); c.hl(5, 13, 17, P.CLOTH_GREEN[1])
    # tray with markers
    c.rect(4, 22, 24, 2, M[1]); c.hl(4, 27, 22, M[3]); c.hl(3, 28, 24, O)
    c.px(8, 21, P.CLOTH_RED[1]); c.px(9, 21, P.CLOTH_RED[1])
    c.px(12, 21, P.CLOTH_BLUE[1]); c.px(13, 21, P.CLOTH_BLUE[1])
    c.hl(2, 29, 25, SH)
    return c


# ------------------------------------------------------------ registration

HOME_PROPS = ['chair_s', 'chair_n', 'stool', 'cushion', 'bin', 'console',
              'clock', 'plant']
SHOP_PROPS = ['register', 'crate_apples', 'pedestal', 'satchel', 'boxes',
              'poster']


def sheet_boxes(name, labels):
    if not have(name):
        return {}
    b = components(name)
    return dict(zip(labels, b))


def build_furniture(sh):
    hp = sheet_boxes('int_props_home', HOME_PROPS)
    spb = sheet_boxes('int_props_shop', SHOP_PROPS)

    def g(name, *a, **k):
        if not have(name):
            print('  (missing source', name, ')')
            return None
        return gen(name, *a, **k)

    def st(stamp, img, layout, **k):
        if img is not None:
            sh.stamp(stamp, img, layout, **k)

    WALL = 'wall'
    # ---- home ----------------------------------------------------------
    st('bed', g('int_bed', 1, 2, w=16), ['B', 'B'], place='floor',
       note='Headboard against the back wall or a side wall.')
    st('desk_pc', g('int_desk_pc', 2, 2), ['BB', 'BB'], place=WALL,
       note='Desk with CRT PC and the red controls notebook (right half).')
    st('tv', g('int_tv', 2, 2, w=30), ['BB', 'BB'], place=WALL)
    st('bookshelf', g('int_bookshelf', 2, 2, w=30), ['BB', 'BB'], place=WALL)
    st('fridge', g('int_fridge', 1, 2, w=14), ['B', 'B'], place=WALL)
    k = g('int_kitchen', 3, 2, w=48, h=23)
    if k:
        for i, nm in enumerate(('kitchen_counter', 'kitchen_sink', 'kitchen_stove')):
            st(nm, k.crop(i * T, 0, T, 2 * T), ['B', 'B'], place=WALL,
               note='Kitchen run piece; place counter, sink, stove side by side.')
    st('table', g('int_table', 2, 2, w=30, h=29), ['BB', 'BB'], place='floor')
    sizes = {'chair_s': (12, 15), 'chair_n': (12, 15), 'stool': (11, 12),
             'cushion': (13, 11), 'bin': (10, 13), 'console': (13, 14),
             'clock': (13, 13), 'plant': (14, 27)}
    for nm in HOME_PROPS:
        if nm not in hp:
            continue
        w, h = sizes[nm]
        th = 2 if nm == 'plant' else 1
        if nm == 'clock':
            c = g('int_props_home', 1, 1, w=w, h=h, box=hp[nm], pad_b=1, shadow=False)
            st('clock', c, ['b'], place='wall_face',
               note='Wall decoration: detail layer on the upper wall row.')
            continue
        c = g('int_props_home', 1, th, w=w, h=h, box=hp[nm])
        if nm == 'plant':
            st('plant', c, ['O', 'B'], place='floor',
               note='Leaves (top) go in over: the player can stand behind it.')
        elif nm == 'cushion':
            st(nm, c, ['b'], place='floor', note='Walkable floor cushion.')
        else:
            st(nm, c, ['B'], place='floor')
    win = g('int_window', 2, 2, w=28, h=21, pad_b=6, shadow=False)
    st('window', win, ['bb', 'bb'], place='wall_face',
       note='Wall decoration: detail layer over both wall-face rows.')
    if win is not None:
        for nm, ramp in (('teal', TE[:3]), ('violet', P.CLOTH_VIOLET),
                         ('blue', P.CLOTH_BLUE), ('green', P.CLOTH_GREEN)):
            rc = win.copy()
            rc.recolor(0, 0, rc.w, rc.h, {P.CLOTH_RED[0]: ramp[0], P.HP_RED[0]: ramp[0],
                                          P.CLOTH_RED[1]: ramp[1], P.HP_RED[1]: ramp[2],
                                          P.FLOWER['red']: ramp[2], P.CLOTH_RED[2]: ramp[2]})
            st('window_' + nm, rc, ['bb', 'bb'], place='wall_face',
               note=f'Window with {nm} curtains.')

    # ---- lab -------------------------------------------------------------
    rack = g('int_lab_rack', 1, 2, w=15)
    st('lab_rack', rack, ['O', 'B'], place='floor', ms=[500, 300],
       frames=[glow(rack, [], swap={P.HP_GREEN[1]: P.GRASS[0], P.HP_RED[1]: P.HP_RED[0],
                                     P.CLOTH_YELLOW[2]: P.CLOTH_YELLOW[0],
                                     P.FLOWER['yellow']: P.CLOTH_YELLOW[0],
                                     P.GRASS[3]: P.GRASS[1], P.FLOWER['red']: P.CLOTH_RED[0]})] if rack else None,
       note='Freestanding or against a wall; top goes in over.')
    con = g('int_lab_console', 2, 2, w=31)
    st('lab_console', con, ['BB', 'BB'], place=WALL, ms=600,
       frames=[glow(con, [P.GRASS, P.HP_GREEN, P.TREE, P.TALL_GRASS])] if con else None)
    st('whiteboard', whiteboard(), ['bb', 'bb'], place='wall_face',
       note='Wall decoration over both wall-face rows.')
    st('lab_core', g('int_lab_core', 2, 3, w=26, h=46), ['OO', 'BB', 'BB'],
       place='floor', note='Centrepiece tank; top row in over.')
    st('lab_shelf', g('int_lab_shelf', 2, 2, w=30), ['BB', 'BB'], place=WALL)
    st('lab_table', g('int_lab_table', 3, 2, w=46, h=27), ['BBB', 'BBB'],
       place='floor')
    term = g('int_terminal', 1, 2, w=14)
    st('terminal', term, ['B', 'B'], place=WALL, note='PC terminal.')
    st('terminal_free', term, ['O', 'B'], place='floor',
       note='Same terminal standing free; screen goes in over.')

    # ---- model center ----------------------------------------------------
    hm = g('int_heal_machine', 2, 2, w=30)
    st('heal_machine', hm, ['BB', 'BB'], ms=[700, 500],
       frames=[glow(hm, [TE, P.ROOF_TEAL, P.CLOTH_GREEN, P.GRASS, P.HP_GREEN])] if hm else None,
       place=WALL, note='Original restorer machine; sits on the back wall '
       'behind the heal counter.')
    st('bench', g('int_bench', 2, 1, w=30, h=15), ['BB'], place='floor')

    # ---- token mart --------------------------------------------------------
    st('mart_shelf', g('int_mart_shelf', 2, 2, w=30), ['BB', 'BB'], place=WALL)
    st('mart_shelf_free', g('int_mart_shelf_free', 2, 2, w=30), ['OO', 'BB'],
       place='floor', note='Aisle shelf; top row in over.')
    ssz = {'register': (14, 12), 'crate_apples': (14, 12), 'pedestal': (13, 12),
           'satchel': (13, 11), 'boxes': (12, 15), 'poster': (12, 18)}
    for nm in SHOP_PROPS:
        if nm not in spb:
            continue
        w, h = ssz[nm]
        if nm == 'poster':
            c = g('int_props_shop', 1, 2, w=w, h=h, box=spb[nm], pad_b=7, shadow=False)
            st('poster', c, ['b', 'b'], place='wall_face',
               note='Wall decoration over both wall-face rows.')
        elif nm == 'register':
            continue
        else:
            st(nm, g('int_props_shop', 1, 1, w=w, h=h, box=spb[nm]), ['B'],
               place='floor')

    # ---- counters (code) -------------------------------------------------
    kinds = {
        'heal': ((WH[1], WH[2], WH[2], WH[3]), (WC[1], WC[2], WC[3]),
                 (TE[1], TE[2], TE[3])),
        'shop': ((W[2], W[3], W[4], W[4]), (W[1], W[2], W[3]),
                 (VI[1], VI[2], VI[3])),
    }
    for kind, (top, front, acc) in kinds.items():
        ids = {}
        for part in ('l', 'm', 'r', 's'):
            c = counter_piece(kind, top, front, acc, part=part)
            ids[part + '_top'] = sh.tile(f'counter_{kind}_{part}_top', c.crop(0, 0, T, T))
            ids[part] = sh.tile(f'counter_{kind}_{part}', c.crop(0, T, T, T),
                                solid=True, counter=True)
        sh.autotiles[f'counter_{kind}'] = ids
    if 'register' in spb:
        c = counter_piece('shop', *kinds['shop'][:2], kinds['shop'][2], part='m')
        reg = gen('int_props_shop', 1, 1, w=13, h=12, box=spb['register'],
                  shadow=False, pad_b=4)
        top = c.crop(0, 0, T, T)
        top.paste(reg, 0, 0)
        sh.tile('counter_shop_m_top_register', top)
        sh.autotiles['counter_shop']['m_top_register'] = sh.names['counter_shop_m_top_register']
