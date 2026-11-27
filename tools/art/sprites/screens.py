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



# ------------------------------------------------- PromptDex / Storage ----
from common import rect, hline, vline, put  # noqa: E402

DEX = {
    'header': (4, 4, 232, 14),          # title strip (text area below)
    'header_text': (22, 7, 150, 8),     # draw "PROMPTDEX" / counts here
    'list': (6, 22, 116, 132),          # left list panel outer rect
    'list_inner': (10, 26, 108, 124),   # paper area for rows (pitch 16 -> 7 rows + 12px)
    'screen': (126, 22, 108, 84),       # right display (glass) outer rect
    'screen_inner': (130, 26, 100, 76), # glass area; centre a 64x64 sprite at (148, 32)
    'info': (126, 110, 108, 44),        # right info panel outer rect
    'info_inner': (130, 114, 100, 36),  # paper area for name/type/text
}

STORAGE = {
    'box_header': (6, 6, 136, 20),      # box name bar, arrows baked at both ends
    'box_name': (24, 12, 100, 8),       # text area for the box name
    'grid_panel': (6, 30, 136, 110),    # rack panel around the slot grid
    'grid_origin': (14, 36),            # top-left of slot (0,0)
    'grid_pitch': 20, 'grid_cols': 6, 'grid_rows': 5,   # 20x20 slots, 16px icon at +2,+2
    'info_bar': (6, 144, 136, 12),      # one-line info under the grid
    'party_header': (148, 6, 86, 20),
    'party_title': (166, 12, 60, 8),
    'party_panel': (148, 30, 86, 126),
    'party_origin': (152, 34),          # slot i at (152, 34 + 20*i), i=0..5; name at x+24
    'party_pitch': 20,
}


def _panel(im, r, rings, fill, radius=2):
    from ui import ring_frame
    x, y, w, h = r
    im.alpha_composite(ring_frame(w, h, rings, fill, radius=radius), (x, y))


def _bevel_bg(W, H, base, light, dark):
    im = new(W, H, base)
    for y in range(H):
        for x in range(W):
            if (x + y * 2) % 8 == 0 and (x // 4 + y // 4) % 2 == 0:
                put(im, x, y, dark)
    hline(im, 0, W - 1, 0, light)
    vline(im, 0, 0, H - 1, light)
    hline(im, 0, W - 1, H - 1, P.OUTLINE)
    vline(im, W - 1, 0, H - 1, P.OUTLINE)
    return im


def dex_bg():
    F = P.UI_FRAME
    im = _bevel_bg(240, 160, F[0], F[1], (32, 38, 58, 255))
    # header strip: amber band with a teal lens LED and two small lights
    _panel(im, DEX['header'], [P.OUTLINE, P.UI_ACCENT[2]], P.UI_ACCENT[1], radius=2)
    rect(im, 8, 8, 6, 6, P.OUTLINE)
    rect(im, 9, 8, 4, 6, P.ROOF_TEAL[1])
    rect(im, 8, 9, 6, 4, P.ROOF_TEAL[1])
    put(im, 9, 9, P.WHITE[3]); put(im, 10, 9, P.ROOF_TEAL[3])
    for i, c in enumerate((P.HP_RED[1], P.HP_YELLOW[1], P.HP_GREEN[1])):
        rect(im, 212 + i * 7, 9, 4, 4, P.OUTLINE)
        rect(im, 213 + i * 7, 10, 2, 2, c)
    # left list panel (paper)
    _panel(im, DEX['list'], [P.OUTLINE, F[2], F[0]], P.UI_PAPER[2], radius=3)
    x, y, w, h = DEX['list_inner']
    for i in range(1, h // 16):
        hline(im, x + 2, x + w - 3, y + i * 16 - 1, P.UI_PAPER[1])
    # right display: glass screen with scanlines
    _panel(im, DEX['screen'], [P.OUTLINE, F[2], F[0]], P.GLASS[2], radius=3)
    x, y, w, h = DEX['screen_inner']
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            t = (yy - y) / h
            c = P.GLASS[3] if t < 0.15 else P.GLASS[2]
            if yy % 2 == 1:
                c = P.GLASS[2] if t < 0.15 else (150, 206, 232, 255)
            put(im, xx, yy, c)
    # floor ellipse for the creature
    for yy in range(y + 58, y + 70):
        for xx in range(x + 14, x + w - 14):
            dx, dy = (xx - (x + w / 2)) / (w / 2 - 14), (yy - (y + 64)) / 5
            if dx * dx + dy * dy <= 1:
                put(im, xx, yy, P.GLASS[1] if dx * dx + dy * dy > 0.6 else (122, 184, 222, 255))
    # info panel
    _panel(im, DEX['info'], [P.OUTLINE, F[2], F[0]], P.UI_PAPER[2], radius=3)
    # speaker grille + hinge details on the shell
    for i in range(5):
        rect(im, 228, 158 - 2, 1, 1, F[1])
    return im


def storage_bg():
    D = P.CLOTH_DARK
    im = _bevel_bg(240, 160, D[0], D[1], (26, 28, 38, 255))
    # rack rails with screws
    for x in (2, 143, 237):
        vline(im, x, 2, 157, D[1])
        for y in range(8, 160, 24):
            put(im, x, y, P.METAL[2])
    # box header with arrows
    _panel(im, STORAGE['box_header'], [P.OUTLINE, P.ROOF_TEAL[2]], P.ROOF_TEAL[1], radius=2)
    _panel(im, STORAGE['party_header'], [P.OUTLINE, P.UI_ACCENT[2]], P.UI_ACCENT[1], radius=2)
    bx, by, bw, bh = STORAGE['box_header']
    for i, (ax, d) in enumerate(((bx + 6, -1), (bx + bw - 8, 1))):
        for k in range(4):
            vline(im, ax + (k if d > 0 else 3 - k), by + 6 + k, by + bh - 7 - k, P.WHITE[3])
    # grid panel: dark terminal glass with a subtle grid glow
    _panel(im, STORAGE['grid_panel'], [P.OUTLINE, P.ROOF_SLATE[2], P.OUTLINE], (30, 52, 66, 255), radius=2)
    ox, oy = STORAGE['grid_origin']
    pt = STORAGE['grid_pitch']
    for r in range(STORAGE['grid_rows']):
        for c in range(STORAGE['grid_cols']):
            im.alpha_composite(slot(), (ox + c * pt, oy + r * pt))
    # info bar
    _panel(im, STORAGE['info_bar'], [P.OUTLINE], (30, 52, 66, 255), radius=1)
    # party column
    _panel(im, STORAGE['party_panel'], [P.OUTLINE, P.ROOF_SLATE[2], P.OUTLINE], (30, 52, 66, 255), radius=2)
    px_, py_ = STORAGE['party_origin']
    for i in range(6):
        im.alpha_composite(slot(), (px_, py_ + i * STORAGE['party_pitch']))
        hline(im, px_ + 24, px_ + 76, py_ + i * 20 + 15, P.ROOF_SLATE[1])
    # blinking-LED strip at the bottom of the party rack (static art)
    for i in range(6):
        put(im, 152 + i * 4, 157, P.HP_GREEN[1] if i % 3 else P.UI_ACCENT[2])
    return im


def slot():
    """20x20 recessed slot: dark well, shadow top-left, light rim bottom-right."""
    im = new(20, 20)
    rect(im, 1, 1, 18, 18, (22, 36, 48, 255))
    hline(im, 1, 18, 0, P.OUTLINE)
    vline(im, 0, 1, 18, P.OUTLINE)
    hline(im, 1, 18, 19, P.ROOF_SLATE[2])
    vline(im, 19, 1, 18, P.ROOF_SLATE[2])
    hline(im, 2, 17, 1, (14, 22, 32, 255))
    vline(im, 1, 2, 17, (14, 22, 32, 255))
    for c in ((0, 0), (19, 0), (0, 19), (19, 19)):
        pass
    return im


def slot_sel():
    """20x20 selected slot: amber frame with a warm inner glow."""
    im = slot()
    A = P.UI_ACCENT
    hline(im, 0, 19, 0, A[1]); hline(im, 0, 19, 19, A[0])
    vline(im, 0, 0, 19, A[1]); vline(im, 19, 0, 19, A[0])
    hline(im, 1, 18, 1, A[2]); vline(im, 1, 1, 18, A[2])
    hline(im, 1, 18, 18, A[1]); vline(im, 18, 1, 18, A[1])
    for (x, y) in ((2, 2), (17, 2), (2, 17), (17, 17)):
        put(im, x, y, A[2])
    return im


_old_build = build


def build():  # noqa: F811
    _old_build()
    save(dex_bg(), UI, 'dex_bg.png')
    save(storage_bg(), UI, 'storage_bg.png')
    save(slot(), UI, 'slot.png')
    save(slot_sel(), UI, 'slot_sel.png')


if __name__ == '__main__':
    build()
