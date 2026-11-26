"""Battle art: battle/bg_grass.png, platforms, trainer back/fronts, prof portrait.

Generated sources (tools/art/gen/raw/spr_*.png) are pixelized with the shared
tools/art/gen/pixelize.py and then cleaned/palette-snapped here.
"""
import math
import os

import numpy as np
from PIL import Image, ImageFilter

from common import P, OUT, ROOT, SPRITES, new, save, put, rect, hline, nearest, all_palette_colours

GEN_RAW = os.path.join(ROOT, 'tools', 'art', 'gen', 'raw')
import sys  # noqa: E402
sys.path.insert(0, os.path.join(ROOT, 'tools', 'art'))
from gen.pixelize import pixelize  # noqa: E402

PALETTE = [c[:3] for c in all_palette_colours()]


def raw(name):
    p = os.path.join(GEN_RAW, name + '.png')
    return p if os.path.exists(p) else None


def _oklab(rgb):
    c = np.asarray(rgb, float) / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                   [0.2119034982, 0.6806995451, 0.1073969566],
                   [0.0883024619, 0.2817188376, 0.6299787005]])
    M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468],
                   [1.9779984951, -2.4285922050, 0.4505937099],
                   [0.0259040371, 0.7827717662, -0.8086757660]])
    lms = np.cbrt(c @ M1.T)
    return lms @ M2.T


def snap_img(im, cols=None, chroma_w=1.6):
    """Snap every colour to the nearest palette entry in OKLab (hue-aware, so
    an olive sweater stays green instead of collapsing to grey)."""
    cols = cols or PALETTE
    a = np.array(im.convert('RGBA'))
    flat = a[..., :3].reshape(-1, 3).astype(int)
    uniq, inv = np.unique(flat, axis=0, return_inverse=True)
    pc = np.array(cols)
    lu, lp = _oklab(uniq), _oklab(pc)
    w = np.array([1.0, chroma_w, chroma_w])
    d = (((lu[:, None, :] - lp[None, :, :]) * w) ** 2).sum(-1)
    mapped = pc[d.argmin(1)]
    a[..., :3] = mapped[inv.reshape(-1)].reshape(a.shape[:2] + (3,))
    return Image.fromarray(a)


def clean_specks(im):
    """Replace single pixels that differ from all 4 neighbours (which agree)
    with the neighbours' colour: removes quantisation salt-and-pepper."""
    a = np.array(im)
    H, W = a.shape[:2]
    out = a.copy()
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            n = [tuple(a[y - 1, x]), tuple(a[y + 1, x]), tuple(a[y, x - 1]), tuple(a[y, x + 1])]
            c = tuple(a[y, x])
            best = max(set(n), key=n.count)
            if c not in n and n.count(best) >= 3:
                out[y, x] = best
    return Image.fromarray(out)


# ------------------------------------------------------------- bg_grass ---

def cloud(im, x, y, w):
    """Small GBA-style cumulus: white puffs with a pale-blue underside."""
    h = max(4, w // 3)
    puffs = [(x + w * 0.25, y + h * 0.55, w * 0.22), (x + w * 0.5, y + h * 0.4, w * 0.28),
             (x + w * 0.75, y + h * 0.6, w * 0.2)]
    for yy in range(int(y - h), int(y + h + 2)):
        for xx in range(int(x - 2), int(x + w + 2)):
            inside = any((xx - cx) ** 2 + ((yy - cy) * 1.6) ** 2 <= r * r for cx, cy, r in puffs)
            if inside and yy <= y + h * 0.9:
                c = P.WHITE[3] if yy < y + h * 0.5 else P.WHITE[2] if yy < y + h * 0.75 else P.SKY[2]
                put(im, xx, yy, c)


def bg_grass():
    """Sky (banded, code-drawn clouds) + generated tree line / meadow."""
    im = new(240, 112, P.SKY[1])
    # banded sky: darker at the top, lighter toward the horizon (dithered seams)
    bands = [(0, P.SKY[0]), (18, P.SKY[1]), (36, P.SKY[2])]
    for y in range(112):
        c = bands[0][1]
        for y0, col in bands:
            if y >= y0:
                c = col
        for x in range(240):
            put(im, x, y, c)
        for y0, col in bands[1:]:
            if y == y0 - 1:
                for x in range(0, 240, 2):
                    put(im, x + (y % 2), y, col)
    for x, y, w in ((18, 10, 30), (92, 20, 18), (160, 6, 36), (212, 24, 16)):
        cloud(im, x, y, w)
    p = raw('spr_bg_grass')
    if p:
        src = Image.open(p).convert('RGB')
        w, h = src.size
        top = int(h * 0.15)
        src = src.crop((0, top, w, h))
        g = src.resize((240, 112), Image.BOX).filter(ImageFilter.ModeFilter(3))
        a = np.array(g).astype(int)
        r_, g_, b_ = a[..., 0], a[..., 1], a[..., 2]
        sky = (b_ > g_ + 15) & (b_ > r_ + 40)
        # everything from the first non-sky row of each column downward is land
        land = np.zeros_like(sky)
        for x in range(240):
            col = ~sky[:, x]
            ys = np.nonzero(col[20:])[0]
            if len(ys):
                land[20 + ys[0]:, x] = True
        q = g.quantize(16, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGBA')
        q = snap_img(q, [c[:3] for c in (P.GRASS + P.TALL_GRASS + P.TREE + [P.SKY[0], P.WATER[1], P.ROOF_BLUE[3]])])
        q = clean_specks(q)
        qa = np.array(q)
        ia = np.array(im)
        ia[land] = qa[land]
        im = Image.fromarray(ia)
    return im


# ------------------------------------------------------------ platforms ---

def platform(w=128, h=32, kind='enemy'):
    """Oval grass pad (GBA style): light top, darker rim, dark underside lip."""
    im = new(w, h)
    cx, cy = (w - 1) / 2, (h - 1) / 2 - 2
    rx, ry = w / 2 - 1, h / 2 - 4
    g = P.GRASS
    for y in range(h):
        for x in range(w):
            dx, dy = (x - cx) / rx, (y - cy) / ry
            d = dx * dx + dy * dy
            lip = ((x - cx) / rx) ** 2 + ((y - cy - 3) / ry) ** 2
            if d <= 1.0:
                # top surface: concentric light ramp + subtle texture
                if d > 0.80:
                    c = g[1]
                elif d > 0.45:
                    c = g[2]
                else:
                    c = g[3] if (y < cy - ry * 0.15) else g[2]
                # dithered tufts
                if 0.2 < d < 0.8 and (x * 7 + y * 13) % 23 == 0:
                    c = g[1]
                if d < 0.6 and (x * 5 + y * 11) % 29 == 0:
                    c = g[3]
                put(im, x, y, c)
            elif lip <= 1.0 and y > cy:
                put(im, x, y, P.TALL_GRASS[0] if lip > 0.9 or y > cy + ry + 1 else P.TALL_GRASS[1])
    # outline only the lower half (soft top edge like GBA pads)
    a = np.array(im)
    m = a[..., 3] > 0
    out = a.copy()
    H, W = m.shape
    for y in range(H):
        for x in range(W):
            if m[y, x]:
                continue
            nb = [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
            if any(0 <= xx < W and 0 <= yy < H and m[yy, xx] for xx, yy in nb) and y > cy - 2:
                out[y, x] = P.TALL_GRASS[0]
    return Image.fromarray(out)


# -------------------------------------------------------- trainer sprites --

def defringe(spr):
    """Kill magenta-tinted edge pixels left over from the keyed background."""
    a = np.array(spr).astype(int)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    m = (al > 0) & (r - g > 45) & (b - g > 45)
    a[m, :3] = P.OUTLINE[:3]
    return Image.fromarray(a.astype(np.uint8))


def remap_green(spr, ramp):
    """Map clearly green pixels onto a palette ramp by luminance."""
    a = np.array(spr).astype(int)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    m = (al > 0) & (g > r - 6) & (g > b + 25)
    lum = (r * 3 + g * 4 + b * 2) / 9
    for y, x in zip(*np.nonzero(m)):
        k = min(len(ramp) - 1, int(lum[y, x] / 256 * len(ramp) * 1.25))
        a[y, x, :3] = ramp[k][:3]
    return Image.fromarray(a.astype(np.uint8))


def prekey(path_or_img):
    """Key the magenta background (and its anti-aliased fringe) to alpha
    before pixelize, writing a temp RGBA png; returns the temp path."""
    from mons import key_magenta
    im = path_or_img if isinstance(path_or_img, Image.Image) else Image.open(path_or_img)
    a = key_magenta(np.array(im.convert('RGBA')))
    tmp = os.path.join(GEN_RAW, '..', '_tmp_key_%d.png' % os.getpid())
    Image.fromarray(a).save(tmp)
    return tmp


def fit_sprite(path, W, H, colors=20, margin=1, snap=True, anchor='bottom', green=None, pal=None):
    path = prekey(path)
    spr = pixelize(path, width=W - 2 * margin, height=H - margin, colors=colors, snap=False)
    os.remove(path)
    spr = defringe(spr)
    if green:
        spr = remap_green(spr, green)
    if snap:
        spr = snap_img(spr, [c[:3] for c in pal] if pal else None, chroma_w=1.0 if pal else 1.6)
    im = new(W, H)
    x = (W - spr.width) // 2
    y = H - spr.height if anchor == 'bottom' else (H - spr.height) // 2
    im.alpha_composite(spr, (x, max(0, y)))
    return im


BASE = [P.OUTLINE, P.OUTLINE_SOFT] + P.SKIN + P.WHITE + [P.SKIN_DEEP[1]]
PAL_PROF = BASE + P.HAIR_BROWN + P.CLOTH_GREEN + P.CLOTH_DARK + P.STONE + P.METAL + P.GLASS + P.WOOD[:3] + [P.CLOTH_RED[1]]
PAL_TM = BASE + P.HAIR_BLOND + P.CLOTH_RED + P.CLOTH_DARK + P.CLOTH_BLUE + P.ROCK + [P.HAIR_BROWN[0]]
PAL_TF = BASE + P.HAIR_BROWN + P.CLOTH_RED + P.CLOTH_BLUE + P.CLOTH_DARK + P.ROCK + P.CLOTH_PINK[1:]
PAL_PLAYER = BASE + P.HAIR_DARK + P.CLOTH_ORANGE + P.ROOF_ORANGE + P.CLOTH_DARK + P.ROOF_TEAL + P.CLOTH_YELLOW + P.CLOTH_BLUE


def prof_front():
    p = raw('spr_prof_front')
    return fit_sprite(p, 64, 96, colors=22, green=P.CLOTH_GREEN, pal=PAL_PROF) if p else new(64, 96)


def trainer_front(kind):
    p = raw('spr_trainer_%s_front' % kind)
    pal = PAL_TM if kind == 'm' else PAL_TF
    return fit_sprite(p, 64, 64, colors=20, pal=pal) if p else new(64, 64)


def split_strip(path, n):
    """Split a horizontal strip of n generated frames on magenta into n images
    by finding the n largest column gaps."""
    src = Image.open(path).convert('RGBA')
    a = np.array(src).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    fg = ~((r > 170) & (b > 170) & (g < 125))
    col = fg.sum(0) > 0
    # find runs of foreground columns
    runs, x = [], 0
    W = len(col)
    while x < W:
        if col[x]:
            s = x
            while x < W and col[x]:
                x += 1
            runs.append([s, x])
        x += 1
    # merge tiny runs into neighbours until n remain
    while len(runs) > n:
        gaps = [runs[i + 1][0] - runs[i][1] for i in range(len(runs) - 1)]
        i = int(np.argmin(gaps))
        runs[i] = [runs[i][0], runs[i + 1][1]]
        del runs[i + 1]
    return [src.crop((s, 0, e, src.height)) for s, e in runs]


def darken_hair(spr):
    """The generated back view has brown hair; the player's hair is dark navy.
    Remap brown pixels in the head area onto the HAIR_DARK ramp by luminance."""
    a = np.array(spr).astype(int)
    H = a.shape[0]
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    lum = (r * 3 + g * 4 + b * 2) / 9
    brown = (al > 0) & (r >= g) & (g >= b - 4) & (r - b > 12) & (r < 200) & (lum < 150)
    rows = np.arange(H)[:, None] < H * 0.62
    m = brown & rows
    ramp = [P.HAIR_DARK[0], P.HAIR_DARK[1], P.HAIR_DARK[2]]
    for y, x in zip(*np.nonzero(m)):
        k = 0 if lum[y, x] < 70 else 1 if lum[y, x] < 105 else 2
        a[y, x, :3] = ramp[k][:3]
    return Image.fromarray(a.astype(np.uint8))


def trainer_back():
    p = raw('spr_trainer_back')
    sheet = new(256, 64)
    if not p:
        return sheet
    frames = split_strip(p, 4)
    # common scale so the character is the same size in every frame
    tmp = os.path.join(GEN_RAW, '..', '_tmp_frame.png')
    hs = []
    for f in frames:
        bb = f.getbbox()
        hs.append(f.height)
    for i, f in enumerate(frames):
        tmp = prekey(f)
        spr = pixelize(tmp, height=round(64 * 1.0), colors=18, snap=False)
        spr = darken_hair(defringe(spr))
        spr = snap_img(spr, [c[:3] for c in PAL_PLAYER], chroma_w=1.0)
        im = new(64, 64)
        x = (64 - spr.width) // 2
        im.alpha_composite(spr.crop((0, 0, min(64, spr.width), 64)), (max(0, x), 64 - min(64, spr.height)))
        sheet.paste(im, (i * 64, 0))
        os.remove(tmp)
    return sheet


def build():
    save(bg_grass(), SPRITES, 'battle', 'bg_grass.png')
    save(platform(kind='enemy'), SPRITES, 'battle', 'platform_enemy.png')
    save(platform(kind='player'), SPRITES, 'battle', 'platform_player.png')
    save(prof_front(), SPRITES, 'battle', 'prof_front.png')
    save(trainer_front('m'), SPRITES, 'battle', 'trainer_m_front.png')
    save(trainer_front('f'), SPRITES, 'battle', 'trainer_f_front.png')
    save(trainer_back(), SPRITES, 'battle', 'trainer_back.png')


if __name__ == '__main__':
    build()
