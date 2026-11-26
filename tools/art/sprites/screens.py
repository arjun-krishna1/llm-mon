"""Full-screen UI art: ui/title_bg.png (240x160), ui/title_logo.png (160x64),
ui/starter_select_bg.png (240x160).

title_bg / starter_select_bg are pixelized from generated paintings
(tools/art/gen/raw/spr_title_bg.png, spr_starter_bg.png) and snapped to the
master palette; the logo is drawn natively in code so the letters are exact.
"""
import numpy as np
from PIL import Image, ImageFilter

from common import P, OUT, UI, new, save, put
from font import F5
import battle as B

# ---------------------------------------------------------------- logo -----
GLYPHS = {
    'L': ['##....', '##....', '##....', '##....', '##....', '######', '######'],
    'M': ['##...##', '###.###', '#######', '##.#.##', '##...##', '##...##', '##...##'],
    'O': ['.####.', '######', '##..##', '##..##', '##..##', '######', '.####.'],
    'N': ['##..##', '###.##', '######', '######', '##.###', '##..##', '##..##'],
}


def _dil(m, n=1, diag=True):
    for _ in range(n):
        o = m.copy()
        o[1:, :] |= m[:-1, :]
        o[:-1, :] |= m[1:, :]
        o[:, 1:] |= m[:, :-1]
        o[:, :-1] |= m[:, 1:]
        if diag:
            o[1:, 1:] |= m[:-1, :-1]
            o[1:, :-1] |= m[:-1, 1:]
            o[:-1, 1:] |= m[1:, :-1]
            o[:-1, :-1] |= m[1:, 1:]
        m = o
    return m


def title_logo():
    W, H = 160, 64
    U = 3  # unit size of the big glyphs
    word = 'LLMMON'
    arc = [4, 2, 1, 1, 2, 4]
    widths = [len(GLYPHS[c][0]) * U for c in word]
    gap = 3
    total = sum(widths) + gap * (len(word) - 1)
    x = (W - total) // 2
    mask = np.zeros((H, W), bool)
    letter_top = np.zeros((H, W), int)
    o_hole = []
    for i, c in enumerate(word):
        y0 = 3 + arc[i]
        for gy, row in enumerate(GLYPHS[c]):
            for gx, v in enumerate(row):
                if v == '#':
                    mask[y0 + gy * U:y0 + gy * U + U, x + gx * U:x + gx * U + U] = True
                    letter_top[y0 + gy * U:y0 + gy * U + U, x + gx * U:x + gx * U + U] = y0
        if c == 'O':
            o_hole.append((x + 3 * U - 1, y0 + 3 * U + U // 2))
        x += widths[i] + gap
    extr = np.zeros_like(mask)
    for d in range(1, 4):
        extr[d:, :] |= mask[:-d, :]
    extr &= ~mask
    body = mask | extr
    ring = _dil(body, 2) & ~body
    ring2 = _dil(body, 3) & ~body & ~ring
    im = new(W, H)
    px = im.load()
    for yy in range(H):
        for xx in range(W):
            if ring2[yy, xx]:
                px[xx, yy] = P.WALL_CREAM[3] if yy < 20 else P.WALL_CREAM[2]
    yel, org = P.CLOTH_YELLOW, P.ROOF_ORANGE
    grad = [P.WHITE[3], yel[2], yel[2], yel[2], yel[2], yel[2], yel[1], yel[1], yel[1], yel[1],
            yel[1], org[3], org[3], org[3], org[3], org[2], org[2], org[2], org[2], org[2], org[1]]
    for yy in range(H):
        for xx in range(W):
            if ring[yy, xx]:
                px[xx, yy] = OUT
            elif extr[yy, xx]:
                px[xx, yy] = P.ROOF_RED[0] if not extr[max(0, yy - 1), xx] or yy % 2 else P.TRUNK[0]
            elif mask[yy, xx]:
                t = yy - letter_top[yy, xx]
                px[xx, yy] = grad[min(t, len(grad) - 1)]
    # bevel highlight on the left edge of strokes
    for yy in range(H):
        for xx in range(1, W):
            if mask[yy, xx] and not mask[yy, xx - 1] and yy - letter_top[yy, xx] < 12:
                px[xx, yy] = yel[2]
    # amber gem in the O's counter
    for cx, cy in o_hole:
        for dy in range(-2, 3):
            for dx in range(-1, 3):
                if abs(dx - 0.5) + abs(dy) <= 2:
                    px[cx + dx, cy + dy] = P.ROOF_TEAL[2] if dy < 0 else P.ROOF_TEAL[1]
        px[cx, cy - 1] = P.WHITE[3]
    # MYTHOS sub-title: 5x7 font at 2x, cream with dark outline, ornaments
    sub = 'MYTHOS'
    k = 2
    sw = sum((len(F5[c][0]) + 1) * k for c in sub) - k
    sx = (W - sw) // 2
    sy = 40
    m2 = np.zeros((H, W), bool)
    xx0 = sx
    for c in sub:
        g = F5[c]
        for gy, row in enumerate(g):
            for gx, v in enumerate(row):
                if v == '#':
                    m2[sy + gy * k:sy + gy * k + k, xx0 + gx * k:xx0 + gx * k + k] = True
        xx0 += (len(g[0]) + 1) * k
    sh = np.zeros_like(m2)
    sh[1:, :] |= m2[:-1, :]
    r2 = _dil(m2 | sh, 1) & ~(m2 | sh)
    for yy in range(H):
        for xx in range(W):
            if r2[yy, xx]:
                px[xx, yy] = OUT
            elif m2[yy, xx]:
                px[xx, yy] = P.WALL_CREAM[3] if (yy - sy) < 7 else P.WALL_CREAM[1]
            elif sh[yy, xx]:
                px[xx, yy] = P.TRUNK[0]
    # diamond ornaments either side of MYTHOS
    for cx in (sx - 12, sx + sw + 11):
        cy = sy + 7
        for dy in range(-4, 5):
            for dx in range(-4, 5):
                d = abs(dx) + abs(dy)
                if d <= 4:
                    px[cx + dx, cy + dy] = OUT if d == 4 else (yel[2] if d <= 1 else org[2] if dy < 0 or (dy == 0 and dx < 0) else org[1])
        for dx in (6, 7, 8):
            for s in (-1, 1):
                if 0 <= cx + s * dx < W:
                    px[cx + s * dx, cy] = OUT if dx == 8 else yel[1]
    return im


# ------------------------------------------------------------ title bg ----

def _pix_bg(name, colors, pal, fallback):
    p = B.raw(name)
    if not p:
        return new(240, 160, fallback)
    src = Image.open(p).convert('RGB')
    w, h = src.size
    tw, th = 240, 160
    s = max(tw / w, th / h)
    src = src.resize((round(w * s * 4), round(h * s * 4)), Image.LANCZOS)
    g = src.resize((round(w * s), round(h * s)), Image.BOX)
    g = g.crop(((g.width - tw) // 2, (g.height - th) // 2, (g.width - tw) // 2 + tw, (g.height - th) // 2 + th))
    g = g.filter(ImageFilter.ModeFilter(3)) if colors < 0 else g
    q = g.quantize(abs(colors), method=Image.MEDIANCUT, dither=Image.NONE).convert('RGBA')
    if pal:
        q = B.snap_img(q, [c[:3] for c in pal])
    return B.clean_specks(q)


def title_bg():
    pal = (P.ROOF_ORANGE + P.ROOF_RED + P.CLOTH_ORANGE + P.CLOTH_YELLOW + P.WALL_CREAM + P.TRUNK
           + [P.OUTLINE, P.OUTLINE_SOFT, P.HAIR_BROWN[0], P.WOOD[0], P.WOOD[3], P.WHITE[3]])
    return _pix_bg('spr_title_bg', 26, pal, P.ROOF_ORANGE[1])


def starter_select_bg():
    pal = (P.GRASS + P.TALL_GRASS + P.TREE + P.WOOD + P.TRUNK + P.WALL_CREAM + P.HAIR_BROWN
           + list(P.FLOWER.values()) + [P.OUTLINE, P.OUTLINE_SOFT, P.CLOTH_YELLOW[1], P.ROOF_ORANGE[0]])
    return _pix_bg('spr_starter_bg', 28, pal, P.GRASS[2])


def build():
    save(title_bg(), UI, 'title_bg.png')
    save(title_logo(), UI, 'title_logo.png')
    save(starter_select_bg(), UI, 'starter_select_bg.png')


if __name__ == '__main__':
    build()
