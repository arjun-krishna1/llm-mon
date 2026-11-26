"""Turn a generated image (magenta background) into a true low-res game sprite.

    from gen.pixelize import pixelize
    spr = pixelize('tools/art/gen/raw/house.png', width=80, colors=20)   # RGBA PIL image

Steps: key out magenta, box-downscale to the target size, hard alpha
threshold, quantize, optionally snap every colour to the master palette
(palette.py) so generated art sits with the hand-drawn tiles, despeckle, and
re-ink a 1px outline where the silhouette lost it.
"""
import os, sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import palette as PAL  # noqa: E402

def master_colours():
    cols = []
    for k in dir(PAL):
        if not k.isupper() or k in ('CLEAR', 'SHADOW'):
            continue
        v = getattr(PAL, k)
        vals = v.values() if isinstance(v, dict) else (v if isinstance(v, list) else [v])
        for c in vals:
            if isinstance(c, tuple) and len(c) == 4 and c[3] == 255:
                cols.append(c[:3])
    return sorted(set(cols))

def _is_bg(r, g, b):
    return r > 170 and b > 170 and g < 125 and abs(r - b) < 70

def pixelize(path, width=None, height=None, colors=16, snap=True, outline=True, despeckle=True):
    src = Image.open(path).convert('RGBA')
    px = src.load()
    w, h = src.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if _is_bg(r, g, b):
                px[x, y] = (0, 0, 0, 0)
    bb = src.getchannel('A').getbbox()
    if bb:
        src = src.crop(bb)
    if width and height:
        s = min(width / src.width, height / src.height)
    elif width:
        s = width / src.width
    else:
        s = height / src.height
    tw, th = max(1, round(src.width * s)), max(1, round(src.height * s))
    # premultiply so transparent magenta-free pixels don't bleed
    pm = Image.new('RGBA', src.size, (0, 0, 0, 0)); pm.paste(src, (0, 0), src)
    sm = pm.resize((tw, th), Image.BOX)
    alpha = sm.getchannel('A').point(lambda v: 255 if v >= 128 else 0)
    spx = sm.load()
    flat = Image.new('RGB', (tw, th))
    fpx = flat.load()
    for y in range(th):
        for x in range(tw):
            r, g, b, a = spx[x, y]
            if a > 0:  # un-premultiply
                fpx[x, y] = (min(255, r * 255 // a), min(255, g * 255 // a), min(255, b * 255 // a))
    q = flat.quantize(colors, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    if snap:
        mc = master_colours()
        cache = {}
        qpx = q.load()
        for y in range(th):
            for x in range(tw):
                c = qpx[x, y]
                if c not in cache:
                    cache[c] = min(mc, key=lambda m: (m[0]-c[0])**2*3 + (m[1]-c[1])**2*4 + (m[2]-c[2])**2*2)
                qpx[x, y] = cache[c]
    out = q.convert('RGBA'); out.putalpha(alpha)
    opx = out.load()
    if despeckle:
        for y in range(th):
            for x in range(tw):
                if opx[x, y][3] and not any(
                        0 <= x+dx < tw and 0 <= y+dy < th and opx[x+dx, y+dy][3]
                        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1))):
                    opx[x, y] = (0, 0, 0, 0)
    if outline:
        ol = PAL.OUTLINE
        edge = []
        for y in range(th):
            for x in range(tw):
                if not opx[x, y][3]:
                    continue
                border = any(not (0 <= x+dx < tw and 0 <= y+dy < th) or not opx[x+dx, y+dy][3]
                             for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)))
                r, g, b, _ = opx[x, y]
                if border and (r*3 + g*4 + b*2) / 9 > 95:
                    edge.append((x, y))
        for x, y in edge:
            opx[x, y] = ol
    return out
