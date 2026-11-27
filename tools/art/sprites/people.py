"""Overworld PEOPLE: chars/<id>.png (48x96 = 3 cols x 4 rows of 16x24) and
chars/player_run.png. Rows: down, up, left, right. Cols: stand, step-A, step-B.

Construction (GBA-era handheld RPG overworld figure, 3/4 top-down view):
  * figure ~20 (kids) / 21 (adults) px tall incl. outline, feet outline on y=21
  * head ~8-9px incl. outline: the top is a big shaded hair mass, the face is
    only the lower 3-4px strip with two 1x2 dark eyes set wide and low
  * body drawn in full: shoulders, separate 1px arms with hands, torso with
    clothing detail, two legs with a gap, shoes in their own colour
  * 3-tone shading, light from the upper left; 1px dark outline (automatic)
  * side views are profiles (one eye, nose pixel, near arm over the torso,
    scissoring legs); walk frames move legs and swing arms; 1px bob on steps.

Bodies are drawn procedurally (so every walk frame is exact); hair is a small
ASCII template per style; outfits add detail with small callbacks.
Symbols (cmap per character):
  H h j hair dark/mid/light   S s t skin shade/mid/light   e eye   n nose shade
  C c d top dark/mid/light    P p bottom dark/mid          K k shoes dark/mid
  A a b accessory-1           X x y accessory-2            o outline colour
"""
from PIL import Image

from common import P, OUT, new, outline, save, SPRITES

W, H = 16, 24
HAIRS = 'Hhj'


def blank():
    return [['.'] * W for _ in range(H)]


def setp(g, x, y, c):
    if 0 <= x < W and 0 <= y < H:
        g[y][x] = c


def hline(g, x0, x1, y, c):
    for x in range(x0, x1 + 1):
        setp(g, x, y, c)


# --------------------------------------------------------------- geometry --
class Geo:
    """Vertical layout for a body type."""

    def __init__(self, adult, stoop=False):
        self.adult = adult
        self.stoop = stoop
        if adult:
            self.hy, self.hrows = 2, 7          # head interior rows y2..y8
            self.t0, self.t1 = 9, 15            # torso rows
        else:
            self.hy, self.hrows = 3, 8          # y3..y10
            self.t0, self.t1 = 11, 15
        self.hip = 16
        self.feet = 20
        if stoop:
            self.hy += 1


# ------------------------------------------------------------------- head --
def draw_head(g, geo, d, skin_only=False):
    hy, n = geo.hy, geo.hrows
    dx = -1 if (geo.stoop and d == 'left') else 0
    for r in range(n):
        y = hy + r
        if d == 'left':
            x0, x1 = (5, 10) if r in (0, n - 1) else (4, 11)
        else:
            x0, x1 = (5, 10) if r in (0, n - 1) else (4, 11)
        hline(g, x0 + dx, x1 + dx, y, 's')
    # shading: right edge and chin
    for r in range(1, n):
        setp(g, (10 if r == n - 1 else 11) + dx, hy + r, 'S')
    if d == 'down':
        ey = hy + n - 3                     # eyes: low and wide
        setp(g, 5, ey, 'e'); setp(g, 5, ey + 1, 'e')
        setp(g, 10, ey, 'e'); setp(g, 10, ey + 1, 'e')
        # brow shadow under the fringe + soft nose
        setp(g, 7, ey + 1, 'n')
        hline(g, 5, 10, hy + n - 1, 'S') if False else None
    elif d == 'left':
        ey = hy + n - 3
        setp(g, 5 + dx, ey, 'e'); setp(g, 5 + dx, ey + 1, 'e')
        setp(g, 3 + dx, ey + 1, 's')        # nose
        setp(g, 9 + dx, ey, 'S'); setp(g, 9 + dx, ey + 1, 'S')   # ear
    return dx


def stamp_hair(g, rows, geo, dx=0):
    """rows: 12-char strings covering x2..x13; row 0 = head row -1."""
    for i, row in enumerate(rows):
        y = geo.hy - 1 + i
        for j, ch in enumerate(row):
            if ch == '.':
                continue
            x = j + 2 + dx
            if ch == '_':
                setp(g, x, y, '.')
            else:
                setp(g, x, y, ch)


def shade_hair(g):
    """3-tone hair: light rim top-left, dark on right/bottom edges."""
    src = [r[:] for r in g]
    pts = [(x, y) for y in range(H) for x in range(W) if src[y][x] in HAIRS]
    if not pts:
        return
    xs = [p[0] for p in pts]
    cx = (min(xs) + max(xs)) / 2
    for x, y in pts:
        if src[y][x] != 'h':
            continue
        up = src[y - 1][x] if y else '.'
        left = src[y][x - 1] if x else '.'
        right = src[y][x + 1] if x < W - 1 else '.'
        down = src[y + 1][x] if y < H - 1 else '.'
        if (up not in HAIRS or left not in HAIRS) and x <= cx and up not in 's':
            g[y][x] = 'j'
        elif right not in HAIRS and x > cx:
            g[y][x] = 'H'
        elif down not in HAIRS and down != '.':
            g[y][x] = 'H'


# ------------------------------------------------------------------- hair --
# 12-char rows over x2..x13, first row = one above the head's top row.
# Kid heads have 8 rows, adult 7; templates are written for 8 and the extra
# rows simply fall onto the face/shoulders for long styles.
HAIR = {}


def _H(block):
    rows = [r.split('|')[1] if '|' in r else r for r in block.strip('\n').split('\n')]
    return [r.ljust(12, '.')[:12] for r in rows]


HAIR['messy'] = {  # player: dark, tousled, parting on his right, tufts
    'down': _H('''
|...h.hh..h..
|..hhhhhhhh..
|..hhhjjhhhh.
|..hhhhhhhhh.
|..hhhhhhhhh.
|..hh.hh.hhh.
|..h......h..
'''),
    'up': _H('''
|...h.hh..h..
|..hhhhhhhh..
|..hhhjjhhhh.
|..hhhhhhhhh.
|..hhhhhhhhh.
|..hhhhhhhhh.
|..hhhhhhhhh.
|...hh.hhh...
'''),
    'left': _H('''
|....h.hh.h..
|...hhhhhhhh.
|..hhjjhhhhhh
|..hhhhhhhhhh
|..hhhhhhhhhh
|..h.hhhhhhhh
|.......hhhh.
|........hh..
'''),
}
HAIR['bob_long'] = {  # mom: warm brown, shoulder length, side part
    'down': _H('''
|............
|...hhhhhh...
|..hhjjhhhh..
|..hhhhhhhhh.
|..hh.hhhhhh.
|..h......hh.
|..h......hh.
|..hh....hhh.
|..hh....hh..
'''),
    'up': _H('''
|............
|...hhhhhh...
|..hhjjhhhh..
|..hhhhhhhhh.
|..hhhhhhhhh.
|..hhhhhhhhh.
|..hhhhhhhhh.
|..hhhhhhhhh.
|..hhhhhhhh..
'''),
    'left': _H('''
|............
|...hhhhhhh..
|..hhjjhhhhh.
|..hhhhhhhhhh
|..hh.hhhhhhh
|......hhhhhh
|.......hhhhh
|.......hhhhh
|........hhh.
'''),
}
HAIR['swept'] = {  # prof: brown, swept up and back, high forehead
    'down': _H('''
|..h..hh.h...
|..hhhhhhhhh.
|..hhjjjhhhh.
|..hhhhhhhhh.
|..hh....hhh.
|..h......h..
'''),
    'up': _H('''
|..h..hh.h...
|..hhhhhhhhh.
|..hhjjjhhhh.
|..hhhhhhhhh.
|..hhhhhhhhh.
|..hhhhhhhhh.
|...hhhhhhh..
'''),
    'left': _H('''
|.....h.hh.h.
|...hhhhhhhhh
|..hhjjjhhhhh
|..hhhhhhhhhh
|....hhhhhhhh
|........hhh.
|........hh..
'''),
}
HAIR['neat'] = {  # aide: blond, short, side part
    'down': _H('''
|............
|...hhhhhh...
|..hhhhjjhh..
|..hhhhhhhhh.
|..hhh...hhh.
|..h......h..
'''),
    'up': _H('''
|............
|...hhhhhh...
|..hhhhjjhh..
|..hhhhhhhhh.
|..hhhhhhhhh.
|..hhhhhhhhh.
|...hhhhhhh..
'''),
    'left': _H('''
|............
|...hhhhhhh..
|..hhhhjjhhh.
|..hhhhhhhhhh
|..hhh.hhhhhh
|........hhh.
|........hh..
'''),
}
HAIR['short'] = {  # man: cropped
    'down': _H('''
|............
|...hhhhhh...
|..hhjhhhhh..
|..hhhhhhhhh.
|..h.......h.
'''),
    'up': _H('''
|............
|...hhhhhh...
|..hhjhhhhh..
|..hhhhhhhhh.
|..hhhhhhhhh.
|..hhhhhhhhh.
|...hhhhhhh..
'''),
    'left': _H('''
|............
|...hhhhhhh..
|..hhjhhhhhh.
|..hhhhhhhhhh
|...h...hhhhh
|........hhh.
'''),
}
HAIR['long'] = {  # woman: long, straight, centre part
    'down': _H('''
|............
|...hhhhhh...
|..hhhjjhhh..
|..hhhhhhhhh.
|..hhh..hhhh.
|..hh.....hh.
|..h......hh.
|..hh....hhh.
|..hh....hhh.
|..hh....hh..
|..hh....hh..
'''),
    'up': _H('''
|............
|...hhhhhh...
|..hhhjjhhh..
|..hhhhhhhhh.
|..hhhhhhhhh.
|..hhhhhhhhh.
|..hhhhhhhhh.
|..hhhhhhhhh.
|..hhhhhhhhh.
|..hhhhhhhhh.
|...hhhhhhh..
'''),
    'left': _H('''
|............
|...hhhhhhh..
|..hhhjjhhhh.
|..hhhhhhhhhh
|..hh..hhhhhh
|.......hhhhh
|.......hhhhh
|.......hhhhh
|.......hhhhh
|........hhhh
|........hhh.
'''),
}
HAIR['elder'] = {  # bald crown, grey fringe at the back/sides, moustache
    'down': _H('''
|............
|............
|............
|............
|..h.......h.
|..hh.....hh.
|..h..jjjj.h.
'''),
    'up': _H('''
|............
|............
|............
|............
|..hhhhhhhhh.
|..hhhhhhhhh.
|...hhhhhhh..
'''),
    'left': _H('''
|............
|............
|............
|.......hhhh.
|.......hhhhh
|........hhhh
|..jj....hh..
'''),
}
HAIR['beanie'] = {  # techie: knit beanie (accessory colour) + hair at the sides
    'down': _H('''
|....aaaa....
|..aaaaaaaa..
|..abbaaaaaa.
|..aaaaaaaaa.
|..AAAAAAAAA.
|..h......h..
'''),
    'up': _H('''
|....aaaa....
|..aaaaaaaa..
|..abbaaaaaa.
|..aaaaaaaaa.
|..AAAAAAAAA.
|..hhhhhhhhh.
|..hhhhhhhhh.
|...hhhhhhh..
'''),
    'left': _H('''
|.....aaaa...
|...aaaaaaaa.
|..abbaaaaaaa
|..aaaaaaaaaa
|..AAAAAAAAAA
|.......hhhhh
|........hhh.
'''),
}
HAIR['bun'] = {  # nurse: hair in a bun, white cap (accessory)
    'down': _H('''
|....hhhh....
|...hhhhhh...
|..haaaaaaah.
|..hhhhhhhhh.
|..hhh..hhhh.
|..h......h..
'''),
    'up': _H('''
|....hhhh....
|...hjjhhh...
|..haaaaaaah.
|..hhhhhhhhh.
|..hhhhhhhhh.
|..hhhhhhhhh.
|...hhhhhhh..
'''),
    'left': _H('''
|.........hh.
|...hhhhhhhhh
|..aaaaaaahhh
|..hhhhhhhhhh
|..hh..hhhhhh
|........hhh.
'''),
}
HAIR['ponytail'] = {  # clerk: dark, pulled back, ponytail
    'down': _H('''
|............
|...hhhhhh...
|..hhjjhhhh..
|..hhhhhhhhh.
|..hhh..hhhh.
|..h......h..
'''),
    'up': _H('''
|............
|...hhhhhh...
|..hhjjhhhh..
|..hhhhhhhhh.
|..hhhhhhhhh.
|..hhhAAhhhh.
|..hhhhhhhhh.
|....hhhh....
|.....hh.....
|.....hh.....
'''),
    'left': _H('''
|............
|...hhhhhhh..
|..hhjjhhhhh.
|..hhhhhhhhhh
|..hhh..hhhAh
|........hh.h
|...........h
|...........h
'''),
}
HAIR['cap'] = {  # boy: baseball cap (accessory) with a brim
    'down': _H('''
|............
|...aaaaaa...
|..abbaaaaa..
|..aaaaaaaaa.
|.AAAAAAAAAAA
|..h......h..
'''),
    'up': _H('''
|............
|...aaaaaa...
|..aaaaaaaa..
|..aaaaaaaaa.
|..aaaaAaaaa.
|..hhhhhhhhh.
|..hhhhhhhhh.
|...hhhhhhh..
'''),
    'left': _H('''
|............
|...aaaaaaa..
|..abbaaaaaa.
|..aaaaaaaaaa
AAAAAAaaaaa.
|........hhhh
|........hhh.
'''),
}
HAIR['pigtails'] = {  # girl: blond, two short pigtails
    'down': _H('''
|............
|...hhhhhh...
|..hhjjhhhh..
|..hhhhhhhhh.
|.hhhh..hhhhh
|hhh......hhh
|hh........hh
|.h........h.
'''),
    'up': _H('''
|............
|...hhhhhh...
|..hhjjhhhh..
|..hhhhhhhhh.
|.hhhhhhhhhhh
|hhhhhhhhhhhh
|hh.hhhhhhh.h
|.h........h.
'''),
    'left': _H('''
|............
|...hhhhhhh..
|..hhjjhhhhh.
|..hhhhhhhhhh
|..hh..hhhhhh
|.........hhh
|..........hh
|...........h
'''),
}
HAIR['spiky'] = {  # trainer_m: blond spikes + red headband (accessory)
    'down': _H('''
|.h.h.hh.h.h.
|..hhhhhhhhh.
|..hhjjhhhhh.
|..aaaaaaaaa.
|..hh.hh.hhh.
|..h......h..
'''),
    'up': _H('''
|.h.h.hh.h.h.
|..hhhhhhhhh.
|..hhjjhhhhh.
|..aaaaaaaaa.
|..hhhhhhhhh.
|..hhhhhAAhh.
|..hhhhhhhhh.
|...h.hh.h...
'''),
    'left': _H('''
|...h.h.h.h.h
|...hhhhhhhhh
|..hhjjhhhhhh
|..aaaaaaaaaa
|..h.hhhhhhAA
|........hhA.
|........hh..
'''),
}
HAIR['bob'] = {  # trainer_f: brown bob + red beret (accessory)
    'down': _H('''
|...aaaaaa...
|..abbaaaaaa.
|..AAAAAAAAA.
|..hhhhhhhhh.
|..hhh..hhhh.
|..h......hh.
|..hh....hhh.
|..hh....hh..
'''),
    'up': _H('''
|...aaaaaa...
|..aaaaaaaaa.
|..AAAAAAAAA.
|..hhhhhhhhh.
|..hhhhhhhhh.
|..hhhhhhhhh.
|..hhhhhhhhh.
|..hhhhhhhh..
'''),
    'left': _H('''
|....aaaaaa..
|...abbaaaaaa
|..AAAAAAAAAA
|..hhhhhhhhhh
|..hh..hhhhhh
|.......hhhhh
|.......hhhhh
|........hhh.
'''),
}
HAIR['sporty'] = {  # rival Dana: auburn, choppy, white visor with a teal brim
    'down': _H('''
|...h.hh.h...
|..hhhhhhhhh.
|..hhjjhhhhh.
|..aaaaaaaaa.
|.AAAAAAAAAAA
|..hh....hhh.
|..h......h..
'''),
    'up': _H('''
|...h.hh.h...
|..hhhhhhhhh.
|..hhjjhhhhh.
|..aaaaAAaaa.
|..hhhhhhhhh.
|..hhhhhhhhh.
|..hhhhhhhhh.
|...hh.hhh...
'''),
    'left': _H('''
|....h.hh.h..
|...hhhhhhhhh
|..hhjjhhhhhh
|..aaaaaaaaaa
AAAAAAhhhhhh
|........hhhh
|........hhh.
|.........h..
'''),
}


# ------------------------------------------------------------------- body --
def draw_body(g, geo, d, f, outfit, run=False):
    """Torso + arms + legs, procedurally. outfit: dict with keys
    top ('shirt'|'coat'|'hoodie'), sleeves (rows of sleeve), legs
    ('pants'|'shorts'|'skirt'|'dress')."""
    t0, t1, hip, feet = geo.t0, geo.t1, geo.hip, geo.feet
    top = outfit.get('top', 'shirt')
    sleeves = outfit.get('sleeves', 99)
    legs = outfit.get('legs', 'pants')
    body_c = 'a' if top == 'coat' else 'c'
    body_l = 'b' if top == 'coat' else 'd'
    body_d = 'A' if top == 'coat' else 'C'
    if d in ('down', 'up'):
        # torso
        for y in range(t0, t1 + 1):
            x0, x1 = (5, 10) if y == t0 else (4, 11)
            hline(g, x0, x1, y, body_c)
            if y == t0 + 1:
                hline(g, 5, 7, y, body_l)          # lit shoulder
            setp(g, x0, y, body_d if y > t0 + 1 else body_c)   # arm shadow
            setp(g, x1, y, body_d)
        hline(g, 5, 10, t1, body_d)                # waist fold / hem
        if top == 'coat' and d == 'down':
            for y in range(t0, t1 + 1):
                setp(g, 7, y, 'c'); setp(g, 8, y, 'C' if y > t0 else 'c')
            setp(g, 6, t0 + 1, 'A'); setp(g, 9, t0 + 1, 'A')   # lapels
        # arms (1px, separated from the torso by its shaded edge)
        lift = {0: (0, 0), 1: (1, 0), 2: (0, 1)}[f]
        if run and f:
            lift = (2, 0) if f == 1 else (0, 2)
        if d == 'up':
            lift = (lift[1], lift[0])
        for side, x in ((0, 3), (1, 12)):
            up = lift[side]
            y0, y1 = t0 + 1, t1 - up
            for y in range(y0, y1 + 1):
                k = y - y0
                ch = (body_c if side == 0 else body_d) if k < sleeves else ('s' if side == 0 else 'S')
                setp(g, x, y, ch)
            setp(g, x, y1 + 1, 's' if side == 0 else 'S')   # hand
        # hips / legs
        lift_leg = {0: (0, 0), 1: (0, 1), 2: (1, 0)}[f]
        if run and f:
            lift_leg = (0, 2) if f == 1 else (2, 0)
        if legs in ('pants', 'shorts'):
            hline(g, 5, 10, hip, 'p')
            setp(g, 10, hip, 'P')
            for side, (xa, xb) in enumerate(((5, 6), (9, 10))):
                up = lift_leg[side]
                for y in range(hip + 1, feet - up):
                    skin = legs == 'shorts' and y > hip + 1
                    setp(g, xa, y, ('s' if skin else 'p') if side == 0 else ('S' if skin else 'P'))
                    setp(g, xb, y, ('S' if skin else 'P') if side == 0 else ('S' if skin else 'P'))
                    if not skin and side == 0:
                        setp(g, xa, y, 'p')
                        setp(g, xb, y, 'p')
                # shoes
                sx = (4, 6) if side == 0 else (9, 11)
                hline(g, sx[0], sx[1], feet - up, 'k')
                setp(g, sx[1] if side == 0 else sx[1], feet - up, 'K')
            # crotch line
            setp(g, 7, hip + 1, 'P'); setp(g, 8, hip + 1, 'P')
        else:
            long_ = legs == 'dress'
            hem = feet - 1 if long_ else hip + 1
            for y in range(hip, hem + 1):
                x0, x1 = (4, 11) if y > hip else (5, 10)
                if long_ and y >= hem - 1:
                    x0, x1 = 3, 12
                hline(g, x0, x1, y, 'p')
                setp(g, x1, y, 'P')
                if (y - hip) % 2 == 1:
                    setp(g, 7, y, 'P')      # pleat / fold
            for side, (xa, xb) in enumerate(((5, 6), (9, 10))):
                up = lift_leg[side]
                for y in range(hem + 1, feet - up):
                    setp(g, xa, y, 's'); setp(g, xb, y, 'S')
                sx = (4, 6) if side == 0 else (9, 11)
                hline(g, sx[0], sx[1], feet - up, 'k')
                setp(g, sx[1], feet - up, 'K')
        if top == 'coat':
            # coat skirt over the thighs
            for y in (hip, hip + 1):
                hline(g, 4, 11, y, 'a')
                setp(g, 11, y, 'A')
                if d == 'down':
                    setp(g, 7, y, 'p'); setp(g, 8, y, 'P')
    else:  # left profile (right is mirrored)
        lean = 1 if (run) else 0
        # torso
        for y in range(t0, t1 + 1):
            x0, x1 = (6, 9) if y == t0 else (5, 10)
            if lean and y < t0 + 3:
                x0, x1 = x0 - 1, x1 - 1
            hline(g, x0, x1, y, body_c)
            setp(g, x0, y, body_l)
            setp(g, x1, y, body_d)
        # legs
        stride = {0: 0, 1: 1, 2: -1}[f]
        if run and f:
            stride *= 2
        if legs in ('pants', 'shorts', 'skirt'):
            hline(g, 6, 9, hip, 'p')
            setp(g, 9, hip, 'P')
            n = feet - hip - 1
            for k in range(1, n + 1):
                y = hip + k
                t = k / n
                skin = (legs == 'shorts' and k > 1) or (legs == 'skirt' and k > 1)
                if stride == 0:
                    near, far = 7, 8
                    setp(g, 8, y, 'S' if skin else 'P')
                    setp(g, 7, y, 's' if skin else 'p')
                    setp(g, 6, y, 's' if skin else 'p')
                else:
                    fwd = round(-2 * stride * t * (1.5 if run else 1))
                    back = round(2 * stride * t * (1.5 if run else 1))
                    # far leg first (darker), then near leg
                    xf = 8 + back
                    setp(g, xf, y, 'S' if skin else 'P')
                    setp(g, xf + 1, y, 'S' if skin else 'P')
                    xn = 6 + fwd
                    setp(g, xn, y, 's' if skin else 'p')
                    setp(g, xn + 1, y, 'S' if skin else 'p')
            # shoes
            if stride == 0:
                hline(g, 5, 8, feet, 'k'); setp(g, 8, feet, 'K')
            else:
                ext = (1.5 if run else 1)
                xn = 6 + round(-2 * stride * ext)
                xf = 8 + round(2 * stride * ext)
                hline(g, xf, xf + 2, feet, 'K')
                hline(g, xn - 1, xn + 1, feet, 'k')
            if legs == 'skirt':
                hline(g, 5, 10, hip, 'p'); hline(g, 4, 10, hip + 1, 'p')
                setp(g, 10, hip + 1, 'P')
        else:  # dress
            for y in range(hip, feet):
                x0, x1 = (5, 10) if y < feet - 2 else (4, 11)
                hline(g, x0, x1, y, 'p'); setp(g, x1, y, 'P')
            if stride == 0:
                hline(g, 5, 8, feet, 'k')
            else:
                hline(g, 4 - stride, 6 - stride, feet, 'k')
                hline(g, 8 + stride, 10 + stride, feet, 'K')
        if top == 'coat':
            for y in (hip, hip + 1):
                hline(g, 5, 10, y, 'a'); setp(g, 10, y, 'A')
        # near arm over the torso, swinging opposite the near leg
        swing = {0: 0, 1: -1, 2: 1}[f] * (2 if run else 1)
        n = t1 - t0
        for k in range(n):
            y = t0 + 1 + k
            t = k / max(1, n - 1)
            x = 8 + round(swing * t * 2) - (lean if y < t0 + 3 else 0)
            ch = body_c if k < sleeves else 's'
            setp(g, x, y, ch)
            setp(g, x + 1, y, body_d if k < sleeves else 'S')
        hx = 8 + round(swing * 2)
        setp(g, hx, t1 + 1 if swing == 0 else t1, 's')
        if run and f:
            # bent pumping arm: hand higher
            setp(g, hx, t1, 's')


# -------------------------------------------------------------- character --
class Person:
    def __init__(self, cid, hair, hairc, top, bottom, skin=None, shoes=None,
                 adult=False, outfit=None, acc=None, acc2=None, details=None,
                 stoop=False, eye=None):
        self.cid = cid
        self.hair = hair
        self.geo = Geo(adult, stoop)
        self.outfit = outfit or {}
        self.details = details or []
        skin = skin or SKIN_FAIR
        shoes = shoes or [P.CLOTH_DARK[0], P.CLOTH_DARK[1]]
        acc = acc or P.CLOTH_DARK
        acc2 = acc2 or P.METAL
        self.cmap = {
            'o': OUT,
            'H': hairc[0], 'h': hairc[1], 'j': hairc[2],
            'S': skin[0], 's': skin[1], 't': skin[2], 'n': skin[0],
            'e': eye or P.HAIR_DARK[0],
            'C': top[0], 'c': top[1], 'd': top[2],
            'P': bottom[0], 'p': bottom[1],
            'K': shoes[0], 'k': shoes[1],
            'A': acc[0], 'a': acc[1], 'b': acc[2] if len(acc) > 2 else acc[1],
            'X': acc2[0], 'x': acc2[1], 'y': acc2[2] if len(acc2) > 2 else acc2[1],
            'w': P.WHITE[3],
        }

    def grid(self, d, f, run=False):
        src = 'left' if d == 'right' else d
        g = blank()
        draw_body(g, self.geo, src, f, self.outfit, run=run)
        dx = draw_head(g, self.geo, src)
        stamp_hair(g, HAIR[self.hair][src], self.geo, dx if self.geo.stoop and src == 'left' else 0)
        shade_hair(g)
        for fn in self.details:
            fn(g, self.geo, src, f)
        if run and src == 'left':
            # lean: shift everything above the hips 1px forward
            for y in range(0, self.geo.t0 + 3):
                g[y] = g[y][1:] + ['.']
        return g

    def frame(self, d, f, run=False):
        g = self.grid(d, f, run)
        im = new(W, H)
        px = im.load()
        for y in range(H):
            for x in range(W):
                ch = g[y][x]
                if ch != '.':
                    px[x, y] = self.cmap[ch]
        im = outline(im)
        if f in (1, 2):
            b = new(W, H)
            b.paste(im.crop((0, 1, W, H)), (0, 0))
            im = b
        if d == 'right':
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        return im

    def sheet(self, run=False):
        sh = new(W * 3, H * 4)
        for r, d in enumerate(('down', 'up', 'left', 'right')):
            for c in range(3):
                sh.paste(self.frame(d, c, run), (c * W, r * H))
        return sh


# ---------------------------------------------------------------- details --
def det_headphones(g, geo, d, f):
    """Player: teal headphones resting round the neck (on the collar)."""
    y = geo.t0
    if d == 'down':
        setp(g, 5, y, 'X'); setp(g, 10, y, 'X')
        hline(g, 6, 9, y, 'x')
        setp(g, 5, y + 1, 'X'); setp(g, 10, y + 1, 'X')
    elif d == 'up':
        hline(g, 5, 10, y, 'x')
    else:
        setp(g, 6, y, 'X'); setp(g, 6, y + 1, 'X'); hline(g, 7, 9, y, 'x')


def det_hoodie(g, geo, d, f):
    y = geo.t0
    if d == 'down':
        setp(g, 7, y + 2, 'w'); setp(g, 8, y + 2, 'w')     # drawstrings
        setp(g, 7, y + 3, 'w')
        hline(g, 6, 9, geo.t1 - 1, 'C')                   # pocket
    elif d == 'up':
        hline(g, 5, 10, y + 1, 'C')                       # hood
        hline(g, 6, 9, y + 2, 'C')
        hline(g, 6, 9, y + 1, 'c')
    else:
        setp(g, 9, y + 1, 'C'); setp(g, 10, y + 1, 'C'); setp(g, 10, y + 2, 'C')


def det_glasses(g, geo, d, f):
    ey = geo.hy + geo.hrows - 3
    if d == 'down':
        for x in (4, 6, 9, 11):
            setp(g, x, ey, 'x')
        hline(g, 7, 8, ey, 'x')
        setp(g, 5, ey, 'y'); setp(g, 10, ey, 'y')
    elif d == 'left':
        setp(g, 4, ey, 'x'); setp(g, 6, ey, 'x'); setp(g, 5, ey, 'y')
        hline(g, 7, 8, ey, 'x')


def det_apron(colour_rows=True):
    def fn(g, geo, d, f):
        if d == 'down':
            for y in range(geo.t0 + 2, geo.hip + 2):
                hline(g, 6, 9, y, 'a')
                setp(g, 9, y, 'A')
            setp(g, 5, geo.t0 + 1, 'a'); setp(g, 10, geo.t0 + 1, 'a')   # straps
            hline(g, 6, 9, geo.t0 + 2, 'b')
        elif d == 'up':
            hline(g, 5, 10, geo.t0 + 4, 'A')                              # tie
            setp(g, 7, geo.t0 + 5, 'A'); setp(g, 8, geo.t0 + 5, 'A')
        else:
            for y in range(geo.t0 + 2, geo.hip + 2):
                setp(g, 5, y, 'a')
            setp(g, 4, geo.hip + 1, 'a')
    return fn


def det_collar(g, geo, d, f):
    if d == 'down':
        setp(g, 6, geo.t0, 'd'); setp(g, 9, geo.t0, 'd')
        setp(g, 7, geo.t0, 's'); setp(g, 8, geo.t0, 'S')


def det_zip(g, geo, d, f):
    if d == 'down':
        for y in range(geo.t0 + 1, geo.t1 + 1):
            setp(g, 7, y, 'w')
        setp(g, 6, geo.t0, 'd'); setp(g, 9, geo.t0, 'd')
    elif d == 'up':
        hline(g, 6, 9, geo.t0, 'd')


def det_bag_strap(g, geo, d, f):
    if d == 'down':
        for k in range(5):
            setp(g, 5 + k, geo.t0 + k, 'A')


def det_nurse(g, geo, d, f):
    if d == 'down':
        hline(g, 6, 9, geo.t0, 'w')
        setp(g, 7, geo.t0 + 2, 'w'); setp(g, 8, geo.t0 + 2, 'w')


def det_cardigan(g, geo, d, f):
    if d == 'down':
        for y in range(geo.t0 + 1, geo.t1 + 1):
            setp(g, 7, y, 'C')
        setp(g, 6, geo.t0 + 2, 'k'); setp(g, 6, geo.t0 + 4, 'k')


# --------------------------------------------------------------- the cast --
SKIN_FAIR = [P.SKIN[1], P.SKIN[2], P.SKIN[3]]
SKIN_WARM = [P.SKIN[0], P.SKIN[1], P.SKIN[2]]
SKIN_TAN = [P.SKIN_DEEP[2], P.SKIN_DEEP[3], P.SKIN[1]]
SKIN_DEEP = [P.SKIN_DEEP[0], P.SKIN_DEEP[1], P.SKIN_DEEP[2]]
GLASSES = [P.METAL[0], P.METAL[1], P.GLASS[3]]


def define():
    C = {}
    C['player'] = Person('player', 'messy', P.HAIR_DARK, P.CLOTH_ORANGE, P.CLOTH_BLUE,
                         skin=SKIN_FAIR, shoes=[P.CLOTH_RED[0], P.CLOTH_RED[1]],
                         acc2=[P.ROOF_TEAL[0], P.ROOF_TEAL[1], P.ROOF_TEAL[3]],
                         outfit={'top': 'shirt', 'legs': 'pants'},
                         details=[det_hoodie, det_headphones])
    C['mom'] = Person('mom', 'bob_long', P.HAIR_BROWN, P.CLOTH_GREEN, P.CLOTH_YELLOW,
                      skin=SKIN_FAIR, adult=True, acc=[P.WHITE[1], P.WHITE[3], P.WHITE[3]],
                      shoes=[P.TRUNK[0], P.TRUNK[1]],
                      outfit={'top': 'shirt', 'legs': 'dress', 'sleeves': 3},
                      details=[det_apron()])
    C['prof'] = Person('prof', 'swept', P.HAIR_BROWN, P.CLOTH_GREEN, P.CLOTH_DARK,
                       skin=SKIN_FAIR, adult=True, acc=[P.WHITE[1], P.WHITE[3], P.WHITE[3]],
                       acc2=GLASSES, shoes=[P.TRUNK[0], P.TRUNK[1]],
                       outfit={'top': 'coat', 'legs': 'pants'}, details=[det_glasses])
    C['aide'] = Person('aide', 'neat', P.HAIR_BLOND, P.CLOTH_BLUE, P.ROCK,
                       skin=SKIN_FAIR, adult=True, acc=[P.WHITE[1], P.WHITE[3], P.WHITE[3]],
                       outfit={'top': 'coat', 'legs': 'pants'})
    C['boy'] = Person('boy', 'cap', P.HAIR_BROWN, P.CLOTH_YELLOW, P.CLOTH_BLUE,
                      skin=SKIN_TAN, acc=P.CLOTH_GREEN,
                      outfit={'top': 'shirt', 'legs': 'shorts', 'sleeves': 1},
                      shoes=[P.CLOTH_BLUE[0], P.WHITE[2]])
    C['girl'] = Person('girl', 'pigtails', P.HAIR_BLOND, P.CLOTH_PINK, P.CLOTH_VIOLET,
                       skin=SKIN_FAIR, outfit={'top': 'shirt', 'legs': 'skirt', 'sleeves': 1},
                       shoes=[P.CLOTH_RED[0], P.CLOTH_RED[1]])
    C['man'] = Person('man', 'short', P.HAIR_DARK, P.CLOTH_GREEN, P.TRUNK,
                      skin=SKIN_DEEP, adult=True, outfit={'top': 'shirt', 'legs': 'pants', 'sleeves': 2},
                      details=[det_collar])
    C['woman'] = Person('woman', 'long', P.HAIR_DARK, P.CLOTH_RED, P.CLOTH_RED,
                        skin=SKIN_TAN, adult=True, outfit={'top': 'shirt', 'legs': 'dress', 'sleeves': 2},
                        shoes=[P.CLOTH_DARK[0], P.CLOTH_DARK[1]])
    C['elder'] = Person('elder', 'elder', P.HAIR_GREY, P.WOOD[:3], P.CLOTH_DARK,
                        skin=SKIN_WARM, adult=True, stoop=True,
                        outfit={'top': 'shirt', 'legs': 'pants'}, details=[det_cardigan],
                        shoes=[P.TRUNK[0], P.TRUNK[1]])
    C['techie'] = Person('techie', 'beanie', P.HAIR_DARK, P.CLOTH_DARK, P.CLOTH_BLUE,
                         skin=SKIN_TAN, adult=True, acc=P.CLOTH_GREEN, acc2=GLASSES,
                         outfit={'top': 'shirt', 'legs': 'pants'},
                         details=[det_glasses, det_bag_strap],
                         shoes=[P.WHITE[0], P.WHITE[2]])
    C['nurse'] = Person('nurse', 'bun', P.HAIR_BROWN, P.ROOF_TEAL, P.ROOF_TEAL,
                        skin=SKIN_FAIR, adult=True, acc=[P.WHITE[1], P.WHITE[3], P.WHITE[3]],
                        outfit={'top': 'shirt', 'legs': 'dress', 'sleeves': 2},
                        details=[det_nurse], shoes=[P.WHITE[0], P.WHITE[2]])
    C['clerk'] = Person('clerk', 'ponytail', P.HAIR_DARK, P.CLOTH_YELLOW, P.CLOTH_DARK,
                        skin=SKIN_DEEP, adult=True, acc=P.CLOTH_VIOLET,
                        outfit={'top': 'shirt', 'legs': 'pants', 'sleeves': 2},
                        details=[det_apron()])
    C['trainer_m'] = Person('trainer_m', 'spiky', P.HAIR_BLOND, P.CLOTH_RED, P.CLOTH_DARK,
                            skin=SKIN_WARM, acc=P.CLOTH_RED,
                            outfit={'top': 'shirt', 'legs': 'shorts', 'sleeves': 1},
                            shoes=[P.CLOTH_RED[0], P.CLOTH_RED[1]])
    C['trainer_f'] = Person('trainer_f', 'bob', P.HAIR_BROWN, P.CLOTH_BLUE, P.WHITE[1:],
                            skin=SKIN_FAIR, acc=P.CLOTH_RED,
                            outfit={'top': 'shirt', 'legs': 'skirt', 'sleeves': 1},
                            details=[det_collar])
    auburn = [P.HAIR_BROWN[0], P.ROOF_ORANGE[0], P.ROOF_ORANGE[1]]
    C['rival'] = Person('rival', 'sporty', auburn, P.ROOF_TEAL[:3], P.CLOTH_DARK,
                        skin=SKIN_FAIR, acc=[P.ROOF_TEAL[1], P.WHITE[2], P.WHITE[3]],
                        outfit={'top': 'shirt', 'legs': 'pants'}, details=[det_zip],
                        shoes=[P.WHITE[0], P.WHITE[2]])
    return C


def build():
    out = {}
    cast = define()
    for cid, ch in cast.items():
        sh = ch.sheet()
        save(sh, SPRITES, 'chars', cid + '.png')
        out[cid] = sh
    rs = cast['player'].sheet(run=True)
    save(rs, SPRITES, 'chars', 'player_run.png')
    out['player_run'] = rs
    return out


if __name__ == '__main__':
    build()
