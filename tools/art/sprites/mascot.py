"""Overworld sheet for Proxy's mascot form: chars/proxy.png (48x96, the people layout:
3 cols x 4 rows of 16x24; rows down, up, left, right; cols stand, hop, hop).

Proxy appears in towns as Benchmark Corp's mascot (docs/SAFETY_ARC.md): a small,
round, adorable white-and-gold puffball with gold-tipped ears, a gold forehead star,
big hopeful blue eyes, pink cheeks and a gold chart-arrow tail (the design of
mons/proxy_mascot_front). It hops instead of walking: col 0 = sitting (squashed 1px
wider), cols 1/2 = mid-hop, 3px up and 1px taller. Feet / bottom outline on y=21 in
the stand frame, like the people. Drawn in code so every frame is exact.
"""
from PIL import Image

from common import new, outline

W, H = 16, 24
FUR = [(214, 196, 168, 255), (240, 226, 200, 255), (255, 248, 234, 255)]
GOLD = [(176, 120, 32, 255), (232, 180, 48, 255), (252, 222, 112, 255)]
EYE_D = (36, 56, 120, 255)
EYE = (64, 132, 228, 255)
SHINE = (255, 255, 255, 255)
CHEEK = (248, 168, 176, 255)
MOUTH = (176, 64, 72, 255)


def body(d, squash=0, stretch=0):
    """One 16x16 cell: the puffball, bottom on row 15."""
    im = new(16, 16)
    px = im.load()
    cx = 7.5 if d != 'left' else 7.0
    rx = 5.6 + squash * 0.6 - stretch * 0.3
    ry = 5.2 - squash * 0.5 + stretch * 0.5
    cy = 14 - ry - 0.6   # row 15 is left for the outline (feet outline on y=21)
    for y in range(16):
        for x in range(16):
            dx, dy = (x - cx) / rx, (y - cy) / ry
            d2 = dx * dx + dy * dy
            if d2 <= 1.0:
                # lit from the upper left: light core, mid ring, shade lower right
                lit = (x - cx) * 0.55 + (y - cy) * 0.8
                c = FUR[2] if lit < 0.6 else FUR[1] if lit < 3.0 else FUR[0]
                if d2 > 0.72 and (x - cx) + (y - cy) > 2:
                    c = FUR[0]
                px[x, y] = c
    top = int(round(cy - ry))
    # ears: gold-tipped rounds on top
    ears = {'down': (4, 11), 'up': (4, 11), 'left': (6, 10)}[d]
    for ex in ears:
        x0 = ex - (1 if ex > 8 else 0)
        for (ox, oy, c) in ((0, 0, GOLD[2]), (1, 0, GOLD[1]), (0, 1, GOLD[1]), (1, 1, GOLD[0])):
            px[x0 + ox, top + oy - 1] = c
    fy = int(round(cy))       # face row (centre of the ball)
    if d == 'down':
        px[7, top + 2] = GOLD[1]; px[8, top + 2] = GOLD[1]; px[7, top + 1] = GOLD[2]   # forehead star
        px[6, top + 2] = GOLD[2]; px[9, top + 2] = GOLD[2]
        for ex in (4, 10):                       # big 2x2 eyes with a shine
            px[ex, fy - 1] = EYE_D; px[ex + 1, fy - 1] = SHINE
            px[ex, fy] = EYE; px[ex + 1, fy] = EYE_D
        px[3, fy + 1] = CHEEK; px[12, fy + 1] = CHEEK
        px[7, fy + 1] = MOUTH; px[8, fy + 1] = MOUTH
        px[5, 14] = GOLD[1]; px[10, 14] = GOLD[1]          # little paws
        tail = [(13, fy), (14, fy - 1), (13, fy - 2), (14, fy - 3), (15, fy - 4)]
    elif d == 'up':
        tail = [(8, fy + 3), (9, fy + 2), (8, fy + 1), (9, fy), (10, fy - 1), (10, fy - 2)]
    else:   # left profile: face on the left
        px[6, top + 2] = GOLD[1]; px[5, top + 2] = GOLD[2]
        px[3, fy - 1] = EYE_D; px[4, fy - 1] = SHINE
        px[3, fy] = EYE; px[4, fy] = EYE_D
        px[3, fy + 1] = CHEEK
        px[2, fy + 1] = MOUTH
        px[4, 14] = GOLD[1]; px[8, 14] = GOLD[1]
        tail = [(12, fy + 1), (13, fy), (12, fy - 1), (13, fy - 2), (14, fy - 3)]
    for i, (x, y) in enumerate(tail):
        if 0 <= x < 16 and 0 <= y < 16:
            px[x, y] = GOLD[1] if i % 2 == 0 else GOLD[2]
    hx, hy = tail[-1]                            # arrowhead
    for x, y in ((hx, hy - 1), (hx - 1, hy - 1), (hx + 1, hy - 1) if d == 'up' else (hx, hy + 1)):
        if 0 <= x < 16 and 0 <= y < 16:
            px[x, y] = GOLD[1]
    return outline(im)


def frame(d, f):
    src = 'left' if d == 'right' else d
    cell = body(src, squash=1 if f == 0 else 0, stretch=0 if f == 0 else 1)
    im = new(W, H)
    lift = 0 if f == 0 else 3
    im.alpha_composite(cell, (0, 22 - 16 - lift))
    if d == 'right':
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    return im


def sheet():
    sh = new(W * 3, H * 4)
    for r, d in enumerate(('down', 'up', 'left', 'right')):
        for c in range(3):
            sh.alpha_composite(frame(d, c), (c * W, r * H))
    return sh
