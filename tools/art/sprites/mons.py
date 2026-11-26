"""Creature battle sprites: mons/<id>_front.png, _back.png (64x64), _icon.png (32x16).

Sources
  * public/assets/llmmon/sprites-ai/*.png      512px RGBA renders (some with a
    baked-in grey/white checkerboard in "transparent" areas -> flood-removed).
  * tools/art/gen/raw/spr_<id>_front.png / _back.png   generated on magenta
    (starters re-generated from their card art; true back views).
  * public/assets/llmmon/mythos/generated/hallucihound_battle_sprite.png

Pipeline (per sprite): key/clean -> crop -> premultiplied box downscale ->
mild local-contrast boost -> hard alpha -> drop specks / tiny islands ->
median-cut to <=15 colours -> re-ink silhouette edge with a dark outline ->
optional per-sprite pixel touch-ups (eyes etc.).
"""
import os

import numpy as np
from PIL import Image, ImageFilter

from common import P, SPRITES, SRC_AI, SRC_MYTHOS, ROOT, save, new

GEN_RAW = os.path.join(ROOT, 'tools', 'art', 'gen', 'raw')
OUTLINE = np.array(P.OUTLINE[:3])

# species id -> source spec
SPECIES = {
    'claude_fable': {'gen': 'spr_claude_fable'},
    'gpt_5_5': {'gen': 'spr_gpt_5_5'},
    'glm': {'gen': 'spr_glm'},
    'hallucihound': {'file': os.path.join(SRC_MYTHOS, 'hallucihound_battle_sprite.png')},
    'gemma_4': {'ai': 'gemma-4-31b'},
    'gpt_5_4_mini': {'ai': 'gpt-54-mini-medium'},
    'mistral_medium': {'ai': 'mistral-medium-35'},
    'gemini_flash': {'ai': 'gemini-35-flash'},
    'claude_haiku': {'ai': 'claude-45-haiku'},
    'claude_opus': {'ai': 'claude-opus-47-max'},
    'command_a': {'ai': 'command-a-plus'},
    'deepseek_flash': {'ai': 'deepseek-v4-flash-max'},
    'deepseek_pro': {'ai': 'deepseek-v4-pro-max'},
    'glm_max': {'ai': 'glm-52-max'},
    'gpt_5_5_xhigh': {'ai': 'gpt-55-xhigh'},
    'kimi': {'ai': 'kimi-k26'},
}


# ------------------------------------------------------------ cleaning ----

def _dilate(m):
    o = m.copy()
    o[1:, :] |= m[:-1, :]
    o[:-1, :] |= m[1:, :]
    o[:, 1:] |= m[:, :-1]
    o[:, :-1] |= m[:, 1:]
    return o


def flood(seed, passable):
    """Grow `seed` through `passable` (both bool arrays) until stable."""
    cur = seed & passable
    while True:
        nxt = _dilate(cur) & passable
        if nxt.sum() == cur.sum():
            return nxt
        cur = nxt


def label(mask):
    """4-connected component labelling (small images). Returns (labels, sizes)."""
    h, w = mask.shape
    lab = np.zeros((h, w), int)
    sizes = [0]
    n = 0
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not lab[y, x]:
                n += 1
                stack = [(y, x)]
                lab[y, x] = n
                cnt = 0
                while stack:
                    cy, cx = stack.pop()
                    cnt += 1
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        yy, xx = cy + dy, cx + dx
                        if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]:
                            lab[yy, xx] = n
                            stack.append((yy, xx))
                sizes.append(cnt)
    return lab, sizes


def remove_checker(a):
    """Flood from transparent areas through bright, grey (checkerboard) pixels."""
    rgb = a[..., :3].astype(int)
    al = a[..., 3]
    mx, mn = rgb.max(-1), rgb.min(-1)
    greyish = (mx - mn < 12) & (mn > 200)
    clear = al < 20
    gone = flood(clear | (greyish & _dilate(clear)), clear | greyish)
    # enclosed checkerboard pockets (e.g. between legs): big two-tone grey blobs
    rest = greyish & ~gone & (al > 20)
    lab, sizes = label(rest)
    lum = rgb.mean(-1)
    for i, sz in enumerate(sizes):
        if i and sz > 120:
            m = lab == i
            v = lum[m]
            if ((v > 245).mean() > 0.2) and ((v < 242).mean() > 0.2):
                gone |= m
    a = a.copy()
    a[gone, 3] = 0
    return a


def key_magenta(a):
    rgb = a[..., :3].astype(int)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    bg = (r > 150) & (b > 150) & (g < 140) & (abs(r - b) < 90) & (r - g > 70)
    # magenta fringe: strongly magenta-tinted pixels touching the background
    fringe = (r - g > 60) & (b - g > 60) & (g < 170)
    a = a.copy()
    a[bg, 3] = 0
    edge = _dilate(bg) & fringe
    for _ in range(2):
        a[edge, 3] = 0
        edge = _dilate(edge) & fringe
    return a


def load_source(sid):
    spec = SPECIES[sid]
    if 'ai' in spec:
        a = np.array(Image.open(os.path.join(SRC_AI, spec['ai'] + '.png')).convert('RGBA'))
        a = remove_checker(a)
    elif 'gen' in spec:
        a = np.array(Image.open(os.path.join(GEN_RAW, spec['gen'] + '_front.png')).convert('RGBA'))
        a = key_magenta(a)
    else:
        a = np.array(Image.open(spec['file']).convert('RGBA'))
        if a[..., 3].min() == 255:
            a = key_magenta(a)
    im = Image.fromarray(a)
    if spec.get('flip'):
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    return im


def _erode(m):
    o = m.copy()
    o[1:, :] &= m[:-1, :]
    o[:-1, :] &= m[1:, :]
    o[:, 1:] &= m[:, :-1]
    o[:, :-1] &= m[:, 1:]
    return o


def dewisp(im, r, protect=()):
    """Morphological opening at source resolution: removes thin aura wisps /
    swirl lines (narrower than ~2r px) that would turn into noise at 64px.
    `protect` = list of (x0,y0,x1,y1) boxes in 0..1 coords kept untouched."""
    a = np.array(im)
    m = a[..., 3] > 40
    o = m
    for _ in range(r):
        o = _erode(o)
    for _ in range(r + 1):
        o = _dilate(o)
    keep = m & o
    # keep only the main body
    small = Image.fromarray((keep * 255).astype(np.uint8)).resize(
        (keep.shape[1] // 4, keep.shape[0] // 4), Image.BOX)
    sm = np.array(small) > 60
    lab, sizes = label(sm)
    if len(sizes) > 1:
        big = int(np.argmax(sizes))
        main = np.array(Image.fromarray(((lab == big) * 255).astype(np.uint8)).resize(
            (keep.shape[1], keep.shape[0]), Image.NEAREST)) > 0
        keep &= _dilate(_dilate(main))
    h, w = m.shape
    for x0, y0, x1, y1 in protect:
        keep[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)] |= m[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)]
    a[~keep, 3] = 0
    return Image.fromarray(a)


def load_back_source(sid):
    p = os.path.join(GEN_RAW, 'spr_%s_back.png' % sid)
    if not os.path.exists(p):
        return None
    a = key_magenta(np.array(Image.open(p).convert('RGBA')))
    return Image.fromarray(a)


# ----------------------------------------------------------- reduction ----

def downscale(src, tw, th):
    """Premultiplied box downscale; returns float RGB (un-premultiplied) + coverage."""
    a = np.array(src).astype(float) / 255.0
    pm = a.copy()
    pm[..., :3] *= pm[..., 3:4]
    im = Image.fromarray((pm * 255).round().astype(np.uint8))
    sm = np.array(im.resize((tw, th), Image.BOX)).astype(float) / 255.0
    cov = sm[..., 3]
    rgb = np.zeros_like(sm[..., :3])
    nz = cov > 0.001
    rgb[nz] = sm[nz][:, :3] / cov[nz][:, None]
    return np.clip(rgb, 0, 1), cov


def quantize(rgb, mask, n):
    pts = (rgb[mask] * 255).round().astype(np.uint8)
    if len(pts) == 0:
        return rgb
    strip = Image.fromarray(pts.reshape(1, -1, 3), 'RGB')
    q = strip.quantize(n, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    out = rgb.copy()
    out[mask] = np.array(q).reshape(-1, 3) / 255.0
    return out


def boost(rgb, mask, amount=0.5, sat=1.12):
    """Light unsharp + saturation lift so detail survives the reduction."""
    img = Image.fromarray((rgb * 255).round().astype(np.uint8))
    blur = np.array(img.filter(ImageFilter.GaussianBlur(1.0))).astype(float) / 255
    out = rgb + (rgb - blur) * amount
    grey = out.mean(-1, keepdims=True)
    out = grey + (out - grey) * sat
    out = np.clip(out, 0, 1)
    out[~mask] = rgb[~mask]
    return out


def clean_mask(mask, min_island=6):
    m = mask.copy()
    h, w = m.shape
    # orphan pixels (<=1 neighbour)
    for _ in range(2):
        nb = np.zeros_like(m, int)
        nb[1:, :] += m[:-1, :]
        nb[:-1, :] += m[1:, :]
        nb[:, 1:] += m[:, :-1]
        nb[:, :-1] += m[:, 1:]
        m &= nb >= 2
    lab, sizes = label(m)
    if len(sizes) > 1:
        biggest = int(np.argmax(sizes))
        for i, s in enumerate(sizes):
            if i and i != biggest and s < max(min_island, sizes[biggest] * 0.03):
                m[lab == i] = False
    # fill pinholes (single transparent pixels fully enclosed)
    nb = np.zeros_like(m, int)
    nb[1:, :] += m[:-1, :]
    nb[:-1, :] += m[1:, :]
    nb[:, 1:] += m[:, :-1]
    nb[:, :-1] += m[:, 1:]
    m |= (~m) & (nb == 4)
    return m


def ink(rgb, mask, col=None):
    """Re-ink the silhouette: every opaque pixel on the edge becomes a dark
    outline (tinted towards the pixel it replaces so it isn't flat black)."""
    col = OUTLINE / 255.0 if col is None else col
    h, w = mask.shape
    pad = np.pad(mask, 1)
    edge = mask & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    out = rgb.copy()
    lum = rgb.mean(-1)
    for y, x in zip(*np.nonzero(edge)):
        if lum[y, x] < 0.22:
            out[y, x] = rgb[y, x] * 0.5 + col * 0.5
        else:
            out[y, x] = rgb[y, x] * 0.18 + col * 0.82
    return out


def reduce(src, box_w, box_h, colors=15, sharpen=0.5, thresh=0.5, min_island=6, sat=1.12,
           accents=()):
    """Fit `src` into box (keeping aspect); return RGBA uint8 array of that size.

    accents: list of (predicate(r,g,b arrays)->bool array, (x0,y0,x1,y1) box in
    0..1 coords of the cropped source, coverage threshold). Matching detail
    (eyes, gems) is re-painted after quantisation so it can't be merged away."""
    bb = src.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
    src = src.crop(bb)
    s = min(box_w / src.width, box_h / src.height)
    tw, th = max(1, round(src.width * s)), max(1, round(src.height * s))
    rgb, cov = downscale(src, tw, th)
    mask = clean_mask(cov >= thresh, min_island)
    rgb = boost(rgb, mask, sharpen, sat)
    rgb = quantize(rgb, mask, colors)
    rgb = ink(rgb, mask)
    sa = np.array(src).astype(int)
    for pred, box, th_ in accents:
        m = pred(sa[..., 0], sa[..., 1], sa[..., 2]) & (sa[..., 3] > 128)
        H0, W0 = m.shape
        x0, y0, x1, y1 = box
        region = np.zeros_like(m)
        region[int(y0 * H0):int(y1 * H0), int(x0 * W0):int(x1 * W0)] = True
        m &= region
        if not m.any():
            continue
        col = sa[m][:, :3].mean(0) / 255.0
        cov = np.array(Image.fromarray((m * 255).astype(np.uint8)).resize((tw, th), Image.BOX)) / 255.0
        hit = (cov >= th_) & mask
        # brightest accent tone on top rows of each blob, a darker one below
        for y, x in zip(*np.nonzero(hit)):
            above = y > 0 and hit[y - 1, x]
            rgb[y, x] = col * (0.78 if above else 1.0)
            rgb[y, x] = np.clip(rgb[y, x] * 1.1, 0, 1)
    out = np.zeros((th, tw, 4), np.uint8)
    out[..., :3] = (rgb * 255).round().astype(np.uint8)
    out[..., 3] = mask * 255
    return out


def place(arr, W, H, anchor='bottom', margin_bottom=1, dx=0, dy=0):
    im = new(W, H)
    spr = Image.fromarray(arr)
    x = (W - spr.width) // 2 + dx
    if anchor == 'bottom':
        y = H - margin_bottom - spr.height + dy
    else:
        y = (H - spr.height) // 2 + dy
    im.alpha_composite(spr, (max(0, x), max(0, y))) if x >= 0 and y >= 0 else im.paste(spr, (x, y), spr)
    return im


# per-sprite tuning (box size, colours, nudges, touch-ups)
TUNE = {
    'default': {'box': (62, 60), 'colors': 15},
    'mistral_medium': {'dewisp': 6},
    'claude_fable': {'accents': [(lambda r, g, b: (r > 190) & (g < 150) & (g > 40) & (b < 80),
                                  (0.0, 0.38, 0.62, 0.64), 0.3)]},
    'glm': {'accents': [(lambda r, g, b: (g > 150) & (b < 110) & (r > 70) & (r < 215) & (g > r + 20),
                         (0.0, 0.30, 0.55, 0.52), 0.2)]},
    'claude_haiku': {'dewisp': 6, 'protect': [(0.2, 0.0, 0.85, 0.25)]},
    'kimi': {'dewisp': 3},
}


def tune(sid):
    t = dict(TUNE['default'])
    t.update(TUNE.get(sid, {}))
    return t


def make_front(sid, src):
    t = tune(sid)
    arr = reduce(src, *t['box'], colors=t['colors'], sharpen=t.get('sharpen', 0.5),
                 thresh=t.get('thresh', 0.5), sat=t.get('sat', 1.12), accents=t.get('accents', ()))
    im = place(arr, 64, 64, margin_bottom=t.get('mb', 2), dx=t.get('dx', 0))
    for fn in t.get('touch', []):
        fn(im)
    return im


def make_back(sid, src, back_src):
    t = tune(sid)
    vis = t.get('back_vis', 0.82)
    if back_src is not None:
        bw, bh = t.get('back_box', (68, 84))
        arr = reduce(back_src, bw, bh, colors=t['colors'], sharpen=t.get('sharpen', 0.5),
                     sat=t.get('sat', 1.12))
    else:
        # derived: mirror + enlarge ~1.3x, show the upper part
        msrc = src.transpose(Image.FLIP_LEFT_RIGHT)
        bw, bh = t['box']
        k = t.get('back_scale', 1.3)
        arr = reduce(msrc, int(bw * k), int(bh * k), colors=t['colors'],
                     sharpen=t.get('sharpen', 0.5), sat=t.get('sat', 1.12))
    spr = Image.fromarray(arr)
    im = new(64, 64)
    x = (64 - spr.width) // 2 + t.get('back_dx', 0)
    y = 64 - round(spr.height * vis) + t.get('back_dy', 0)
    y = max(y, 1)
    im.paste(spr, (x, y), spr)
    for fn in t.get('back_touch', []):
        fn(im)
    return im


def make_icon(sid, src):
    t = tune(sid)
    arr = reduce(src, 15, 14, colors=10, sharpen=0.8, thresh=0.42, min_island=2)
    a = new(16, 16)
    spr = Image.fromarray(arr)
    a.paste(spr, ((16 - spr.width) // 2, 15 - spr.height), spr)
    b = new(16, 16)
    b.paste(a.crop((0, 1, 16, 16)), (0, 0))  # bob up 1px
    sheet = new(32, 16)
    sheet.paste(a, (0, 0))
    sheet.paste(b, (16, 0))
    return sheet


def build(only=None):
    res = {}
    for sid, spec in SPECIES.items():
        if only and sid not in only:
            continue
        if 'gen' in spec and not os.path.exists(os.path.join(GEN_RAW, spec['gen'] + '_front.png')):
            print('  [mons] missing generated source for', sid, '- skipped')
            continue
        src = load_source(sid)
        t = tune(sid)
        if t.get('dewisp'):
            src = dewisp(src, t['dewisp'], t.get('protect', ()))
        front = make_front(sid, src)
        back = make_back(sid, src, load_back_source(sid))
        icon = make_icon(sid, src)
        save(front, SPRITES, 'mons', sid + '_front.png')
        save(back, SPRITES, 'mons', sid + '_back.png')
        save(icon, SPRITES, 'mons', sid + '_icon.png')
        res[sid] = (front, back, icon)
    return res


if __name__ == '__main__':
    import sys
    build(sys.argv[1:] or None)
