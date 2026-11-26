#!/usr/bin/env python3
"""Render 240x160 camera frames (as the engine frames them: player tile at
screen 112,64, clamped to the map) for review.

  python3 tools/maps/frames.py overworld 21,99 21,84 ... [--scale 3] [--out DIR]
  python3 tools/maps/frames.py --path        # the standard walkthrough frames

Writes tools/maps/preview/frames/<map>_<x>_<y>.png (and a contact sheet with --sheet).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mapdsl import HERE, Image  # noqa: E402

W, H, T = 240, 160, 16

# The player's critical path (map, x, y) used for review frames.
WALK = [
    ('overworld', 19, 99), ('overworld', 13, 99), ('overworld', 21, 94), ('overworld', 28, 100),
    ('overworld', 18, 105), ('overworld', 21, 86), ('overworld', 21, 79), ('overworld', 21, 71),
    ('overworld', 26, 64), ('overworld', 27, 55), ('overworld', 27, 46), ('overworld', 16, 45),
    ('overworld', 16, 53), ('overworld', 15, 61), ('overworld', 22, 40), ('overworld', 21, 31),
    ('overworld', 21, 24), ('overworld', 21, 18), ('overworld', 21, 12),
]


def frame(img, mw, mh, x, y):
    px, py = x * T, y * T
    sx = (mw - W) / 2 if mw <= W else min(max(px - 112, 0), mw - W)
    sy = (mh - H) / 2 if mh <= H else min(max(py - 64, 0), mh - H)
    out = Image.new('RGBA', (W, H), (0, 0, 0, 255))
    out.alpha_composite(img.crop((int(sx), int(sy), int(sx) + W, int(sy) + H)) if mw > W and mh > H else
                        img.crop((int(max(sx, 0)), int(max(sy, 0)), int(max(sx, 0)) + W, int(max(sy, 0)) + H)))
    return out


def main(argv):
    import build
    scale = 3
    if '--scale' in argv:
        scale = int(argv[argv.index('--scale') + 1])
    maps = {m.id: m for m in build.all_maps()}
    jobs = []
    if '--path' in argv:
        jobs = WALK
    else:
        mid = argv[0]
        for a in argv[1:]:
            if ',' in a:
                x, y = a.split(',')
                jobs.append((mid, int(x), int(y)))
    outdir = os.path.join(HERE, 'preview', 'frames')
    os.makedirs(outdir, exist_ok=True)
    cache = {}
    frames = []
    for mid, x, y in jobs:
        m = maps[mid]
        if mid not in cache:
            cache[mid] = m.render()
        f = frame(cache[mid], m.w * T, m.h * T, x, y)
        frames.append(f)
        f.resize((W * scale, H * scale), Image.NEAREST).save(os.path.join(outdir, '%s_%d_%d.png' % (mid, x, y)))
    if '--sheet' in argv and frames:
        cols = 3
        rows = (len(frames) + cols - 1) // cols
        sheet = Image.new('RGBA', (cols * (W + 4), rows * (H + 4)), (20, 20, 20, 255))
        for i, f in enumerate(frames):
            sheet.alpha_composite(f, ((i % cols) * (W + 4), (i // cols) * (H + 4)))
        sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST).save(os.path.join(outdir, 'sheet.png'))
    print('frames ->', outdir)


if __name__ == '__main__':
    main(sys.argv[1:])
