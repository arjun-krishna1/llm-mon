"""Post-process fixes for creature battle sprites (art audit, docs/ART_AUDIT.md).

Runs after mons.py / mons2.py in build.py, and can be run alone:

    python3 tools/art/sprites/polish.py            # all creature sprites
    python3 tools/art/sprites/polish.py grok glm   # some ids

Only fixes reduction defects; it never redraws anything:
  * pinholes: 1-3px transparent holes fully enclosed by the body (the battle
    background shows through as a bright speck). Filled with the most common
    opaque neighbour colour. Species whose holes are part of the design are
    skipped (HOLES_BY_DESIGN).
"""
import os
import sys
from collections import Counter

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
MONS = os.path.join(HERE, '..', '..', '..', 'public', 'assets', 'game', 'sprites', 'mons')
HOLES_BY_DESIGN = {'dropout'}
N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))


def pinholes(im, max_size=3):
    px = im.load()
    w, h = im.size
    seen = set()
    out = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] or (x, y) in seen:
                continue
            comp, st, edge = [], [(x, y)], False
            seen.add((x, y))
            while st:
                a, b = st.pop()
                comp.append((a, b))
                if a in (0, w - 1) or b in (0, h - 1):
                    edge = True
                for dx, dy in N4:
                    X, Y = a + dx, b + dy
                    if 0 <= X < w and 0 <= Y < h and not px[X, Y][3] and (X, Y) not in seen:
                        seen.add((X, Y))
                        st.append((X, Y))
            if not edge and len(comp) <= max_size:
                out.append(comp)
    return out


def fill_pinholes(im):
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    n = 0
    for comp in pinholes(im):
        for x, y in comp:
            nb = Counter(px[x + dx, y + dy] for dx, dy in N4
                         if 0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3] == 255)
            if nb:
                px[x, y] = nb.most_common(1)[0][0]
                n += 1
    return im, n


def build(ids=None):
    done = {}
    for f in sorted(os.listdir(MONS)):
        if not (f.endswith('_front.png') or f.endswith('_back.png')):
            continue
        sid = f.rsplit('_', 1)[0]
        if sid in HOLES_BY_DESIGN or (ids and sid not in ids):
            continue
        p = os.path.join(MONS, f)
        im, n = fill_pinholes(Image.open(p))
        if n:
            im.save(p)
            done[f] = n
    return done


if __name__ == '__main__':
    for k, v in build(sys.argv[1:] or None).items():
        print('filled', v, 'px in', k)
