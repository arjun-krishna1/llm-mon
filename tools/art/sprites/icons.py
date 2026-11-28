"""Party / storage icons for every creature (ART-C2, art audit item 5).

    python3 tools/art/sprites/icons.py            # all creatures
    python3 tools/art/sprites/icons.py grok glm

mons/<id>_icon.png = 32x16, two 16x16 frames (frame 1 = the same pose 1px higher).
The old icons box-downscaled the whole 64px body, so long or thin creatures became
brown balls or 1px lines at 16px. Now each icon is a HEAD-AND-SHOULDERS crop of the
front source (the generated painting, not the 64px sprite): a square window over the
top of the body, centred on where the head is (the mass of the topmost rows; creatures
face left, so it is usually left of centre), reduced with mons2.reduce_mode straight
to 16x15 and re-inked. Per-creature windows can be forced in WINDOW.
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import mons as M  # noqa: E402
import mons2 as M2  # noqa: E402
from common import SPRITES, save, new  # noqa: E402

# id -> (x0, y0, x1, y1) window as fractions of the source bbox (overrides the auto crop)
WINDOW = {
    'sigmoid': (0.0, 0.0, 0.5, 0.7),
    'relu': (0.0, 0.0, 0.55, 0.8),
    'residual': (0.0, 0.25, 0.5, 1.0),
    'sgd': (0.1, 0.1, 0.9, 1.0),
    'momentum': (0.0, 0.05, 0.9, 1.0),
    'markov_chain': (0.15, 0.0, 0.75, 0.6),
    'proxy_ascendant': (0.1, 0.3, 0.7, 0.85),
    'n_gram': (0.0, 0.0, 0.6, 0.9),
    'batchnorm': (0.15, 0.25, 0.85, 0.85),
    'mlp': (0.1, 0.1, 0.9, 0.9),
    'dropout': (0.0, 0.0, 0.7, 0.8),
    'softmax': (0.0, 0.1, 0.75, 0.9),
    'entropy': (0.0, 0.0, 0.8, 0.9),
    'glove': (0.0, 0.1, 0.8, 0.95),
    'gelu': (0.0, 0.0, 0.6, 0.75),
}
# compact creatures: icon shows the whole body (already round / chunky)
WHOLE = {'proxy_mascot', 'perceptron', 'phi_mini', 'kimi'}


def head_window(src, frac=0.62):
    """Square window over the head and shoulders, in source pixels."""
    a = np.array(src)[..., 3] > 40
    ys, xs = np.nonzero(a)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    w, h = x1 - x0, y1 - y0
    s = int(max(w, h) * frac)
    s = max(s, int(min(w, h) * 0.9))
    s = min(s, max(w, h))
    # centre column = mass of the top quarter of the window rows
    top = a[y0:y0 + max(1, s // 3), x0:x1]
    cols = np.nonzero(top.sum(0))[0]
    if len(cols):
        wts = top.sum(0)[cols].astype(float)
        cx = x0 + int((cols * wts).sum() / wts.sum())
    else:
        cx = (x0 + x1) // 2
    wx0 = int(np.clip(cx - s // 2, x0, max(x0, x1 - s)))
    return (wx0, y0, wx0 + s, y0 + s)


def icon_from_source(sid, src):
    bb = src.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
    src = src.crop(bb)
    if sid in WINDOW:
        x0, y0, x1, y1 = WINDOW[sid]
        w, h = src.size
        crop = src.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))
    elif sid in WHOLE:
        crop = src
    else:
        crop = src.crop(head_window(src))
    try:
        arr = M2.reduce_mode(crop, 16, 15, colors=10, thresh=0.42, min_island=3, sat=1.12,
                             line_w=1.0, contrast=3.0)
    except ValueError:   # window landed on a sparse area: fall back to the whole body
        print('  [icons] %s: head window empty, using the whole body' % sid)
        arr = M2.reduce_mode(src, 16, 15, colors=10, thresh=0.42, min_island=3, sat=1.12,
                             line_w=1.0, contrast=3.0)
    spr = Image.fromarray(arr)
    a = new(16, 16)
    a.paste(spr, ((16 - spr.width) // 2, 16 - spr.height), spr)
    b = new(16, 16)
    b.paste(a.crop((0, 1, 16, 16)), (0, 0))  # bob up 1px
    sheet = new(32, 16)
    sheet.paste(a, (0, 0))
    sheet.paste(b, (16, 0))
    return sheet


def sources():
    """(id, front source RGBA) for every creature with a built front."""
    out = []
    for sid in M.SPECIES:
        if 'gen' in M.SPECIES[sid] and not os.path.exists(os.path.join(M.GEN_RAW, M.SPECIES[sid]['gen'] + '_front.png')):
            continue
        out.append((sid, lambda s=sid: M.load_source(s)))
    for sid in M2.PROMPTS:
        if os.path.exists(M2.raw(sid, 'front')):
            out.append((sid, lambda s=sid: M2.front_source(s)))
    return out


def build(only=None):
    res = {}
    for sid, load in sources():
        if only and sid not in only:
            continue
        ic = icon_from_source(sid, load())
        save(ic, SPRITES, 'mons', sid + '_icon.png')
        res[sid] = ic
    return res


if __name__ == '__main__':
    print(len(build(sys.argv[1:] or None)), 'icons')
