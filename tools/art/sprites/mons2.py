"""Creature battle sprites, set 2 (ART-C): the full-roster creatures.

Same contract and pipeline as mons.py (64x64 front/back, 32x16 icon):
    python3 tools/art/sprites/mons2.py                 # rebuild all set-2 sprites
    python3 tools/art/sprites/mons2.py grok proxy_mascot
    python3 tools/art/sprites/mons2.py --gen ID [front|back] [--force]
                                                        # (re)generate a source (spends quota)

Sources: tools/art/gen/raw/mon_<id>_front.png / mon_<id>_back.png, generated
with tools/art/gen/imagegen.py from the PROMPTS below (front prompts may name a
`ref` species whose front is passed as --ref so evolution lines stay related;
backs always use the creature's own front as the reference). The build only
reads them. Gallery: docs/ART_CREATURES.md.
"""
import os
import sys

import numpy as np
from PIL import Image

import mons as M
from common import SPRITES, ROOT, save

GEN_RAW = M.GEN_RAW

LEAD = ("One original monster-collecting-RPG creature, battle sprite, full body, "
        "3/4 front view facing LEFT, standing on the ground, centred and filling the frame. "
        "An animal / mythic creature with ornamental tech-rune detailing (small engraved circuit "
        "glyphs, gem inlays), strong readable silhouette, big expressive eyes, saturated palette. "
        "It is a living creature, not a robot, no screen for a face, no text, no letters, "
        "no logos or logo-like emblems. ")

BACK = ("The SAME creature as in the attached image (same colours, markings, proportions and "
        "features), now seen from behind in a 3/4 back view, facing away from the viewer towards "
        "the upper right, as the player's own creature in a monster-RPG battle. Full body, centred. "
        "No face visible except perhaps an ear or cheek edge. ")

# id -> {'p': front prompt (creature brief), 'ref': species id whose front is the design ref,
#        'line': evolution line name for the gallery, 'name': display name}
PROMPTS = {
    'grok': dict(name='Grok', line='Grok', p=(
        "A sharp, mischievous corvid-meets-comet creature: a sleek black-and-silver raven with "
        "constellation star-map markings (tiny silver dots joined by fine lines) across its wings, "
        "a long glowing icy-blue and white comet tail streaming behind it, a crest of swept-back "
        "silver feathers, one bright glinting eye with a star-shaped highlight, a cheeky confident "
        "half-smirk beak. Perched upright with one wing flared. Confident, a little chaotic. "
        "Palette: glossy blue-black, silver, white, icy cyan, a touch of violet.")),
    'proxy_mascot': dict(name='Proxy', line='Proxy', p=(
        "A small, round, genuinely adorable lab mascot creature: a soft fluffy white-and-gold "
        "puffball body with tiny paws, two little rounded ears, huge hopeful shiny eyes, rosy "
        "cheeks, a small happy open smile, and a short tail shaped like an upward-pointing "
        "chart arrow (a little zig-zag rising line ending in an arrowhead) in gold. A tiny gold "
        "star mark on its forehead. Cute, cuddly, trustworthy, the kind of mascot everyone loves. "
        "Palette: warm white, cream, soft gold, a hint of sky blue in the eyes.")),
    'proxy_student': dict(name='Proxy', line='Proxy', ref='proxy_mascot', p=(
        "Its evolution: the SAME creature as the attached image, now grown taller and slimmer, "
        "standing upright on two legs, polite and immaculate, posture perfect, paws folded neatly "
        "in front. Same white-and-gold fur, same round ears, same gold forehead star, same "
        "chart-arrow tail now longer and crisper. It wears a big gold prize rosette / medal on its "
        "chest with ribbon tails. Its big eyes are still pretty but slightly too still, staring "
        "straight out, a fixed polite smile. Pristine, model-student, a little uncanny but not "
        "scary. Palette: white, cream, gold, sky blue eyes, a blue ribbon.")),
    'proxy_tamper': dict(name='Proxy', line='Proxy', ref='proxy_student', p=(
        "Its next form: the SAME creature as the attached image (white-and-gold fur, round ears, "
        "gold forehead star, medal rosette, chart-arrow tail), but its body is turning into a user "
        "interface. LARGE, chunky, clearly readable bar-chart bars in bright teal and mint green "
        "grow out of its shoulders, back, head and tail like big crystals, sticking out of the "
        "silhouette; its left arm and one leg are made of flat panels with progress bars and "
        "ruler tick marks; a few big digits float in its fur. One eye is still a big round pretty "
        "blue eye, the other eye is a big glowing mint-green number 1 filling the eye socket. "
        "Calm, polite, standing upright, fixed smile. Unsettling but not monstrous, no gore, no "
        "red eyes. Palette: white, gold, sky blue, saturated teal and mint UI crystals.")),
    'proxy_leader': dict(name='Proxy', line='Proxy', ref='proxy_tamper', p=(
        "Its final form: the SAME being as the attached image, now vast, serene and calm, seated "
        "like a huge round idol, filling the width of the image. Same white fur and gold trim, "
        "gold forehead star, round ears, the big gold medal rosette, the gold chart-arrow tail. Its "
        "face is LARGE and clear: eyes gently closed in perfect serenity, a small calm smile. "
        "Crowning its head is a tall straight vertical ranking column: a stack of thick gold and "
        "teal horizontal bars like a leaderboard tower, rising straight up and cut off by the top "
        "edge of the image. Set into the column and the body are five or six small but clearly "
        "drawn copies of the cute round mascot face (white faces with big blue eyes). A few chunky "
        "teal bar-chart crystals at its shoulders. Designed to read as a tiny 64-pixel sprite: "
        "big simple shapes, few large details, strong value contrast, soft blue-grey shading on "
        "the white fur, no fine fur strokes. Unsettling through serenity and scale, not horror: "
        "no gore, no red eyes, no teeth. Palette: white, blue-grey shadow, gold, sky blue, teal.")),
}


def raw(sid, side):
    return os.path.join(GEN_RAW, 'mon_%s_%s.png' % (sid, side))


def gen(sid, side='front', force=False):
    sys.path.insert(0, os.path.join(ROOT, 'tools', 'art', 'gen'))
    import imagegen
    spec = PROMPTS[sid]
    if side == 'front':
        refs = [raw(spec['ref'], 'front')] if spec.get('ref') else []
        prompt = LEAD + spec['p']
    else:
        refs = [raw(sid, 'front')]
        prompt = BACK + spec['p']
    return imagegen.generate('mon_%s_%s' % (sid, side), prompt, refs, force)


# ------------------------------------------------- mode-based reduction ----
# The generated sources are already pixel art at ~5-6x; averaging blocks
# (mons.reduce) blends neighbouring colours into mud and merges small accents
# (eyes) away. Here each output pixel takes the MOST COMMON source colour of its
# block (after a fine full-res pre-quantisation), and the final <=15 colour
# palette comes from a farthest-point-seeded k-means, so small saturated
# accents (eyes, gems) keep their own colour.

def _kmeans(pts, w, k, iters=12, chroma=0.9):
    pts = pts.astype(float)
    # opponent colour space with chroma weighted up, so a small blue eye is
    # not merged into a dark grey just because their luminance is close
    T = np.array([[1 / 3, 1 / 3, 1 / 3], [1.0, -1.0, 0.0], [0.5, 0.5, -1.0]]) * \
        np.array([[1.0], [chroma], [chroma]])
    P = pts @ T.T
    # farthest-point seeding, weighted by count so noise doesn't dominate
    c = [P[int(np.argmax(w))]]
    d = ((P - c[0]) ** 2).sum(1)
    for _ in range(1, min(k, len(P))):
        i = int(np.argmax(d * np.sqrt(w)))
        c.append(P[i])
        d = np.minimum(d, ((P - P[i]) ** 2).sum(1))
    C = np.array(c)
    for _ in range(iters):
        lab = ((P[:, None, :] - C[None]) ** 2).sum(-1).argmin(1)
        for j in range(len(C)):
            m = lab == j
            if m.any():
                C[j] = (P[m] * w[m, None]).sum(0) / w[m].sum()
    lab = ((P[:, None, :] - C[None]) ** 2).sum(-1).argmin(1)
    return C @ np.linalg.inv(T).T, lab


def _despeckle(cl, C, keep_contrast):
    """A pixel whose colour appears nowhere in its 8-neighbourhood is fur/line
    noise: give it the most common neighbouring colour - unless it contrasts
    strongly with all of them (a deliberate highlight such as an eye glint)."""
    h, w = cl.shape
    out = cl.copy()
    lum = C.mean(1)
    for y in range(h):
        for x in range(w):
            c = cl[y, x]
            if c < 0:
                continue
            nb = cl[max(0, y - 1):y + 2, max(0, x - 1):x + 2].ravel()
            nb = nb[nb >= 0]
            if (nb == c).sum() > 1:
                continue
            others = nb[nb != c]
            if len(others) < 5:
                continue
            if np.abs(lum[others] - lum[c]).min() > keep_contrast:
                continue
            out[y, x] = np.bincount(others).argmax()
    return out


def reduce_mode(src, box_w, box_h, colors=15, thresh=0.5, min_island=6, pre=40, sat=1.06,
                despeckle=1, keep_contrast=140, line_w=1.0, premode=0, accents=()):
    bb = src.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
    src = src.crop(bb)
    s = min(box_w / src.width, box_h / src.height)
    tw, th = max(1, round(src.width * s)), max(1, round(src.height * s))
    _, cov = M.downscale(src, tw, th)
    mask = M.clean_mask(cov >= thresh, min_island)
    a = np.array(src)
    op = a[..., 3] > 128
    # fine uniform pre-quantisation (16 levels per channel): keeps rare
    # colours (eyes) that a median cut would drop
    if premode:   # full-res mode filter: drops hairline fur strokes first
        from PIL import ImageFilter
        a = a.copy()
        a[..., :3] = np.array(Image.fromarray(a[..., :3]).filter(ImageFilter.ModeFilter(premode)))
    q4 = (a[..., :3].astype(int) // 16)
    qi = q4[..., 0] * 256 + q4[..., 1] * 16 + q4[..., 2]
    pre = 4096
    pal = np.zeros((pre, 3))
    cnt = np.bincount(qi[op], minlength=pre).astype(float)
    for ch in range(3):
        pal[:, ch] = np.bincount(qi[op], weights=a[..., ch][op].astype(float), minlength=pre)
    pal /= np.maximum(cnt, 1)[:, None]
    H, W = qi.shape
    # vote weights: dark line-art colours count extra so thin source outlines
    # (eyes, mouths, brows) survive the reduction
    plum = pal @ np.array([0.3, 0.5, 0.2])
    vw = 1.0 + line_w * (plum < 90)
    out_idx = np.zeros((th, tw), int)
    xs = np.linspace(0, W, tw + 1)
    ys = np.linspace(0, H, th + 1)
    for y in range(th):
        y0, y1 = int(ys[y]), max(int(ys[y]) + 1, int(round(ys[y + 1])))
        for x in range(tw):
            if not mask[y, x]:
                continue
            x0, x1 = int(xs[x]), max(int(xs[x]) + 1, int(round(xs[x + 1])))
            blk = qi[y0:y1, x0:x1][op[y0:y1, x0:x1]]
            if blk.size == 0:
                blk = qi[y0:y1, x0:x1].ravel()
            out_idx[y, x] = np.bincount(blk, weights=vw[blk], minlength=pre).argmax()
    used, counts = np.unique(out_idx[mask], return_counts=True)
    C, lab = _kmeans(pal[used], counts.astype(float), colors)
    C = np.clip(C, 0, 255)
    grey = C.mean(1, keepdims=True)
    C = np.clip(grey + (C - grey) * sat, 0, 255)
    lut = {int(u): int(l) for u, l in zip(used, lab)}
    cl = np.full((th, tw), -1)
    for y, x in zip(*np.nonzero(mask)):
        cl[y, x] = lut[int(out_idx[y, x])]
    for _ in range(despeckle):
        cl = _despeckle(cl, C, keep_contrast)
    out_rgb = np.zeros((th, tw, 3))
    for y, x in zip(*np.nonzero(mask)):
        out_rgb[y, x] = C[cl[y, x]] / 255.0
    sa = np.array(src).astype(int)
    for pred, box, th_, *dark in accents:
        m = pred(sa[..., 0], sa[..., 1], sa[..., 2]) & (sa[..., 3] > 128)
        H0, W0 = m.shape
        x0, y0, x1, y1 = box
        reg = np.zeros_like(m)
        reg[int(y0 * H0):int(y1 * H0), int(x0 * W0):int(x1 * W0)] = True
        m &= reg
        if not m.any():
            continue
        col = sa[m][:, :3].mean(0) / 255.0
        cv = np.array(Image.fromarray((m * 255).astype(np.uint8)).resize((tw, th), Image.BOX)) / 255.0
        hit = (cv >= th_) & mask
        for y, x in zip(*np.nonzero(hit)):
            out_rgb[y, x] = np.clip(col * (0.8 if (y > 0 and hit[y - 1, x]) else 1.05), 0, 1)
        if dark:   # dark rim under/left of the accent (eye outline)
            for y, x in zip(*np.nonzero(hit)):
                for dy, dx in dark[0]:
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < th and 0 <= xx < tw and mask[yy, xx] and not hit[yy, xx]:
                        out_rgb[yy, xx] = (0.24, 0.13, 0.13)
    out_rgb = M.ink(out_rgb, mask)
    out = np.zeros((th, tw, 4), np.uint8)
    out[..., :3] = (out_rgb * 255).round().astype(np.uint8)
    out[..., 3] = mask * 255
    return out


# per-creature tuning, same keys as mons.TUNE
TUNE = {
    'grok': {'keep_contrast': 90},
    'proxy_leader': {'box': (64, 63), 'mb': 1},
    'proxy_student': {'icon_crop': (0.0, 0.62), 'box': (62, 62), 'mb': 1,
                      'accents': [(lambda r, g, b: (b > 170) & (r < 130) & (g > 90),
                                   (0.2, 0.15, 0.55, 0.3), 0.2, [(-1, 0), (0, -1)])]},
    'proxy_tamper': {'icon_crop': (0.0, 0.62), 'box': (62, 62), 'mb': 1, 'line_w': 0.0,
                     'accents': [
                         (lambda r, g, b: (b > 170) & (r < 130) & (g > 90), (0.1, 0.18, 0.3, 0.32), 0.2, [(-1, 0), (0, -1)]),
                         (lambda r, g, b: (g > 170) & (g > r + 40) & (b < g), (0.28, 0.18, 0.48, 0.32), 0.2, [(-1, 0), (0, 1)])]},
}


def tune(sid):
    t = dict(M.TUNE['default'])
    t.update(TUNE.get(sid, {}))
    return t


def load(path):
    a = M.key_magenta(np.array(Image.open(path).convert('RGBA')))
    return Image.fromarray(a)


def make_front(sid, src):
    t = tune(sid)
    arr = reduce_mode(src, *t['box'], colors=t['colors'], thresh=t.get('thresh', 0.5),
                      sat=t.get('sat', 1.06), despeckle=t.get('despeckle', 1),
                      keep_contrast=t.get('keep_contrast', 140), line_w=t.get('line_w', 1.0), premode=t.get('premode', 0), accents=t.get('accents', ()))
    im = M.place(arr, 64, 64, margin_bottom=t.get('mb', 2), dx=t.get('dx', 0), dy=t.get('dy', 0))
    for fn in t.get('touch', []):
        fn(im)
    return im


def make_back(sid, src, back_src):
    t = tune(sid)
    vis = t.get('back_vis', 0.82)
    if back_src is None:
        back_src = src.transpose(Image.FLIP_LEFT_RIGHT)
        bw, bh = (int(t['box'][0] * 1.3), int(t['box'][1] * 1.3))
    else:
        bw, bh = t.get('back_box', (64, 84))
    arr = reduce_mode(back_src, bw, bh, colors=t['colors'], thresh=t.get('thresh', 0.5),
                      sat=t.get('sat', 1.06), despeckle=t.get('despeckle', 1),
                      keep_contrast=t.get('keep_contrast', 140), line_w=t.get('line_w', 1.0), premode=t.get('premode', 0), accents=t.get('back_accents', ()))
    spr = Image.fromarray(arr)
    im = M.new(64, 64)
    x = (64 - spr.width) // 2 + t.get('back_dx', 0)
    y = max(1, 64 - round(spr.height * vis) + t.get('back_dy', 0))
    im.paste(spr, (x, y), spr)
    for fn in t.get('back_touch', []):
        fn(im)
    return im


def make_icon(sid, src):
    t = tune(sid)
    if t.get('icon_crop'):   # tall creatures: icon shows the upper part only
        bb = src.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
        y0, y1 = t['icon_crop']
        h = bb[3] - bb[1]
        src = src.crop((bb[0], bb[1] + int(h * y0), bb[2], bb[1] + int(h * y1)))
    arr = reduce_mode(src, 15, 14, colors=10, thresh=0.42, min_island=2, sat=1.12)
    a = M.new(16, 16)
    spr = Image.fromarray(arr)
    a.paste(spr, ((16 - spr.width) // 2, 15 - spr.height), spr)
    b = M.new(16, 16)
    b.paste(a.crop((0, 1, 16, 16)), (0, 0))  # bob up 1px
    sheet = M.new(32, 16)
    sheet.paste(a, (0, 0))
    sheet.paste(b, (16, 0))
    return sheet


def build(only=None):
    res = {}
    for sid in PROMPTS:
        if only and sid not in only:
            continue
        if not os.path.exists(raw(sid, 'front')):
            continue
        t = tune(sid)
        src = load(raw(sid, 'front'))
        if t.get('dewisp'):
            src = M.dewisp(src, t['dewisp'], t.get('protect', ()))
        back_src = load(raw(sid, 'back')) if os.path.exists(raw(sid, 'back')) else None
        front = make_front(sid, src)
        back = make_back(sid, src, back_src)
        icon = make_icon(sid, src)
        save(front, SPRITES, 'mons', sid + '_front.png')
        save(back, SPRITES, 'mons', sid + '_back.png')
        save(icon, SPRITES, 'mons', sid + '_icon.png')
        res[sid] = (front, back, icon)
    return res


# ------------------------------------------------------------ previews ----

GALLERY_BG = (168, 216, 150, 255)   # battle meadow green


def lines():
    """Evolution lines in roster order: [(line name, [ids])]."""
    out = {}
    for sid, spec in PROMPTS.items():
        if os.path.exists(os.path.join(SPRITES, 'mons', sid + '_front.png')):
            out.setdefault(spec.get('line', sid), []).append(sid)
    return list(out.items())


def gallery():
    """Front + back (+ icon) of every set-2 creature on the battle meadow,
    one row per evolution line, names underneath; returned scaled 3x."""
    from common import new, scale
    from font import text5
    rows = lines()
    if not rows:
        return None
    cw, ch = 134, 78
    ncol = max(len(ids) for _, ids in rows)
    W, H = 4 + ncol * cw, 2 + len(rows) * ch
    im = new(W, H, (40, 40, 50, 255))
    bg = Image.open(os.path.join(SPRITES, 'battle', 'bg_grass.png')).convert('RGBA')
    for r, (lname, ids) in enumerate(rows):
        y = 2 + r * ch
        for j, sid in enumerate(ids):
            x = 2 + j * cw
            tile = new(cw - 2, ch - 2, GALLERY_BG)
            tile.alpha_composite(bg.crop((40, 36, 40 + cw - 2, 36 + ch - 2)))
            for k, side in enumerate(('front', 'back')):
                f = Image.open(os.path.join(SPRITES, 'mons', '%s_%s.png' % (sid, side))).convert('RGBA')
                tile.alpha_composite(f, (1 + k * 66, 1))
            ic = Image.open(os.path.join(SPRITES, 'mons', sid + '_icon.png')).convert('RGBA')
            tile.alpha_composite(ic, (cw - 2 - 34, ch - 2 - 16))
            im.alpha_composite(tile, (x, y))
            text5(im, x + 2, y + 64, sid.replace('_', ' '), (255, 255, 255, 255), (20, 20, 30, 255))
    return scale(im, 3)


def battle_mock(enemy, player):
    import preview as PV
    from common import scale
    n = lambda s: PROMPTS.get(s, {}).get('name', s).upper()[:12]
    scr = PV.battle_screen(enemy, player, n(enemy), n(player),
                           text=('What will', '%s do?' % n(player)))
    return scale(scr, 4)


def previews():
    from common import PREVIEW
    out = {}
    g = gallery()
    if g is not None:
        out['gallery'] = save(g, PREVIEW, 'creatures_gallery_3x.png')
    for lname, ids in lines():
        enemy = ids[-1]
        player = ids[0]
        key = 'battle_c_%s_4x.png' % ids[0]
        out[key] = save(battle_mock(enemy, player), PREVIEW, key)
    return out


def doc_rows():
    """Markdown table rows of finished creatures for docs/ART_CREATURES.md."""
    rows = []
    for sid, spec in PROMPTS.items():
        f = os.path.join(SPRITES, 'mons', sid + '_front.png')
        if not os.path.exists(f):
            continue
        back = 'true back' if os.path.exists(raw(sid, 'back')) else 'mirrored front (no back gen yet)'
        ref = spec.get('ref', '')
        rows.append('| `%s` | %s | `mon_%s_front`%s | %s | %s |' % (
            sid, spec.get('line', sid), sid,
            ', `mon_%s_back`' % sid if os.path.exists(raw(sid, 'back')) else '',
            ('ref `%s`' % ref) if ref else '-', back))
    return rows


if __name__ == '__main__':
    args = sys.argv[1:]
    if args and args[0] == '--doc':
        print('\n'.join(doc_rows()))
        sys.exit()
    if args and args[0] == '--preview':
        print(previews())
        sys.exit()
    if args and args[0] == '--gen':
        force = '--force' in args
        rest = [a for a in args[1:] if a != '--force']
        sid = rest[0]
        side = rest[1] if len(rest) > 1 else 'front'
        print(gen(sid, side, force))
    else:
        print(sorted(build(args or None)))
