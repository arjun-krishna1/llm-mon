#!/usr/bin/env python3
"""Placeholder gym badges: public/assets/game/ui/badge_<id>.png (16x16, badge case) and
badge_<id>_big.png (32x32, badge-get scene). Run: python3 tools/ui/badges.py

Eight distinct shapes + glyphs, drawn natively at each size from the master palette
(tools/art/palette.py): 3-tone fill lit from the top-left, warm dark outline, a light
glyph with a dark drop. The art team can replace any file; the engine also draws a
procedural fallback if a file is missing.
"""
import math
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'art'))
import palette as P  # noqa: E402

OUT = os.path.join(ROOT, 'public', 'assets', 'game', 'ui')

BADGES = {
    # id: (shape, ramp dark->light (3), glyph colour)
    'gradient': ('circle', P.ROOF_RED[:3], P.CLOTH_YELLOW[2]),
    'likelihood': ('square', P.ROOF_BLUE[:3], P.WHITE[3]),
    'embedding': ('hex', P.CLOTH_GREEN, P.GRASS[3]),
    'normal': ('shield', P.ROOF_TEAL[:3], P.WATER[3]),
    'chain': ('octagon', P.METAL[:3], P.WHITE[3]),
    'wave': ('diamond', P.CLOTH_VIOLET, P.CLOTH_YELLOW[2]),
    'attention': ('star', P.CLOTH_ORANGE, P.WALL_CREAM[3]),
    'merge': ('drop', P.CLOTH_PINK, P.WHITE[3]),
}


def inside(shape, x, y, n):
    """Is pixel centre (x+.5, y+.5) inside the shape on an n x n canvas (1px margin)?"""
    c = (n - 1) / 2
    u = (x - c) / (c - 0.5)
    v = (y - c) / (c - 0.5)
    if shape == 'circle':
        return u * u + v * v <= 1.0
    if shape == 'square':
        return abs(u) <= 0.86 and abs(v) <= 0.86 and not (abs(u) > 0.7 and abs(v) > 0.7 and abs(u) + abs(v) > 1.5)
    if shape == 'hex':
        return abs(v) <= 0.9 and abs(u) * 0.87 + abs(v) * 0.5 <= 0.9
    if shape == 'shield':
        if v < -0.85 or abs(u) > 0.88:
            return False
        return v <= 0.15 or (abs(u) <= 0.88 * (1 - (v - 0.15) / 0.9) + 0.02)
    if shape == 'octagon':
        return abs(u) <= 0.92 and abs(v) <= 0.92 and abs(u) + abs(v) <= 1.32
    if shape == 'diamond':
        return abs(u) + abs(v) <= 1.0
    if shape == 'star':
        r = math.hypot(u, v)
        a = math.atan2(v, u) + math.pi / 2
        k = 0.62 + 0.38 * (0.5 + 0.5 * math.cos(a * 8))
        return r <= k
    if shape == 'drop':
        # two overlapping circles fused: a rounded lozenge
        return (u + 0.25) ** 2 + v * v <= 0.62 or (u - 0.25) ** 2 + v * v <= 0.62
    return False


def base(shape, ramp, n):
    img = Image.new('RGBA', (n, n), P.CLEAR)
    px = img.load()
    mask = [[inside(shape, x, y, n) for x in range(n)] for y in range(n)]
    for y in range(n):
        for x in range(n):
            if not mask[y][x]:
                continue
            edge = any(not (0 <= x + dx < n and 0 <= y + dy < n and mask[y + dy][x + dx])
                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if edge:
                px[x, y] = P.OUTLINE
                continue
            t = (x + y) / (2 * n)  # 0 top-left .. 1 bottom-right
            px[x, y] = ramp[2] if t < 0.36 else ramp[1] if t < 0.62 else ramp[0]
    # rim highlight (top-left inner edge) and a sparkle
    for y in range(n):
        for x in range(n):
            if px[x, y] == ramp[2] and x > 0 and y > 0 and (px[x - 1, y] == P.OUTLINE or px[x, y - 1] == P.OUTLINE):
                px[x, y] = P.WHITE[3]
    return img


def glyph(d, gid, n, col, shadow):
    s = n / 16.0

    def L(pts, c, w=1):
        d.line([(round(a * s), round(b * s)) for a, b in pts], fill=c, width=max(1, int(w * s) if n > 16 else w))

    def dot(x, y, c, r=1):
        x0, y0 = round(x * s), round(y * s)
        rr = max(0, round(r * s) - 1) if n > 16 else 0
        d.rectangle([x0 - rr, y0 - rr, x0 + rr, y0 + rr], fill=c)

    def draw(c, o):
        ox, oy = o
        if gid == 'gradient':  # descending staircase + arrow head
            L([(4 + ox, 5 + oy), (6 + ox, 5 + oy), (6 + ox, 8 + oy), (9 + ox, 8 + oy), (9 + ox, 11 + oy), (11 + ox, 11 + oy)], c)
            L([(10 + ox, 9 + oy), (11 + ox, 11 + oy), (9 + ox, 12 + oy)], c)
        elif gid == 'likelihood':  # die face
            for x, y in ((5, 5), (10, 5), (7.5, 8), (5, 10.5), (10, 10.5)):
                dot(x + ox, y + oy, c)
        elif gid == 'embedding':  # a cluster of three + one outlier
            for x, y in ((6, 6), (8, 5), (7, 8), (11, 11)):
                dot(x + ox, y + oy, c)
            L([(6 + ox, 6 + oy), (7 + ox, 8 + oy), (8 + ox, 5 + oy)], c)
        elif gid == 'normal':  # bell curve
            pts = [(3 + i * 0.5 + ox, 11 - 6 * math.exp(-((i * 0.5 - 4.5) ** 2) / 2.2) + oy) for i in range(19)]
            L(pts, c)
        elif gid == 'chain':  # two interlocked links
            d.ellipse([round((3 + ox) * s), round((5 + oy) * s), round((9 + ox) * s), round((10 + oy) * s)], outline=c)
            d.ellipse([round((7 + ox) * s), round((6 + oy) * s), round((13 + ox) * s), round((11 + oy) * s)], outline=c)
        elif gid == 'wave':  # sine
            pts = [(3 + i * 0.5 + ox, 8 + 2.6 * math.sin(i * 0.5 * 1.15) + oy) for i in range(21)]
            L(pts, c)
        elif gid == 'attention':  # eye with pupil
            d.ellipse([round((3 + ox) * s), round((5 + oy) * s), round((12 + ox) * s), round((10 + oy) * s)], outline=c)
            dot(7.5 + ox, 7.5 + oy, c, 1.4)
        elif gid == 'merge':  # two blocks → one
            d.rectangle([round((3 + ox) * s), round((5 + oy) * s), round((5 + ox) * s), round((7 + oy) * s)], outline=c)
            d.rectangle([round((3 + ox) * s), round((9 + oy) * s), round((5 + ox) * s), round((11 + oy) * s)], outline=c)
            L([(6 + ox, 6 + oy), (8 + ox, 8 + oy), (6 + ox, 10 + oy)], c)
            d.rectangle([round((9 + ox) * s), round((6 + oy) * s), round((12 + ox) * s), round((10 + oy) * s)], fill=c)

    draw(shadow, (0.0, 1.0 / s if n > 16 else 1))
    draw(col, (0, 0))


def make(gid, n):
    shape, ramp, col = BADGES[gid]
    img = base(shape, ramp, n)
    d = ImageDraw.Draw(img)
    glyph(d, gid, n, col, P.OUTLINE)
    # keep the glyph inside the badge: clear anything drawn outside the mask
    px = img.load()
    for y in range(n):
        for x in range(n):
            if not inside(shape, x, y, n):
                px[x, y] = P.CLEAR
    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    for gid in BADGES:
        make(gid, 16).save(os.path.join(OUT, f'badge_{gid}.png'))
        make(gid, 32).save(os.path.join(OUT, f'badge_{gid}_big.png'))
    # preview strip (4x) for review
    prev = Image.new('RGBA', (8 * 36, 52), (40, 48, 72, 255))
    for i, gid in enumerate(BADGES):
        prev.alpha_composite(make(gid, 32), (i * 36 + 2, 2))
        prev.alpha_composite(make(gid, 16), (i * 36 + 10, 34))
    os.makedirs(os.path.join(ROOT, 'tools', 'ui', 'preview'), exist_ok=True)
    prev.resize((prev.width * 3, prev.height * 3), Image.NEAREST).save(os.path.join(ROOT, 'tools', 'ui', 'preview', 'badges.png'))
    print('wrote', len(BADGES) * 2, 'badge files to', OUT)


if __name__ == '__main__':
    main()
