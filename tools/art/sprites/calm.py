"""Majority 'calm' filter for reduced creature sprites (ART-C2, art audit item 4).

calm(im, need=5, passes=2, keep=()) replaces each interior opaque pixel whose
colour is shared by fewer than 2 of its 8 neighbours with the colour that at
least `need` neighbours agree on. Outline pixels (silhouette edge) and colours
in `keep` (eyes, gems) are never changed. It removes speckle (fur strokes that
survived the reduction as isolated dark/teal dots) without moving the silhouette.
"""
import numpy as np
from PIL import Image


def calm(im, need=5, passes=2, keep=(), protect_dark=False):
    a = np.array(im.convert('RGBA'))
    H, W = a.shape[:2]
    keep = {tuple(k[:3]) for k in keep}
    for _ in range(passes):
        op = a[..., 3] > 0
        pad = np.pad(op, 1)
        interior = op & pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:]
        out = a.copy()
        for y, x in zip(*np.nonzero(interior)):
            c = tuple(a[y, x, :3])
            if c in keep:
                continue
            if protect_dark and sum(c) < 150:
                continue
            nb = [tuple(a[yy, xx, :3]) for yy in range(y - 1, y + 2) for xx in range(x - 1, x + 2)
                  if (yy, xx) != (y, x) and 0 <= yy < H and 0 <= xx < W and a[yy, xx, 3]]
            if nb.count(c) >= 2:
                continue
            best = max(set(nb), key=nb.count)
            if nb.count(best) >= need:
                out[y, x, :3] = best
        a = out
    return Image.fromarray(a)


def unstroke(im, light=200, need=5, passes=2):
    """Dark 1px fur strokes inside a light coat (Proxy's white fur): an interior
    dark pixel with >= `need` light 8-neighbours takes the commonest light one."""
    a = np.array(im.convert('RGBA'))
    H, W = a.shape[:2]
    for _ in range(passes):
        op = a[..., 3] > 0
        pad = np.pad(op, 1)
        interior = op & pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:]
        lum = a[..., :3].astype(int) @ np.array([3, 4, 2]) / 9
        out = a.copy()
        for y, x in zip(*np.nonzero(interior & (lum < light - 40))):
            nb = [tuple(a[yy, xx, :3]) for yy in range(max(0, y - 1), min(H, y + 2))
                  for xx in range(max(0, x - 1), min(W, x + 2))
                  if (yy, xx) != (y, x) and a[yy, xx, 3] and lum[yy, xx] >= light]
            if len(nb) >= need:
                out[y, x, :3] = max(set(nb), key=nb.count)
        a = out
    return Image.fromarray(a)


def keep_main(im):
    """Keep only the largest 8-connected opaque component (drops a detached arc)."""
    a = np.array(im.convert('RGBA'))
    m = a[..., 3] > 0
    H, W = m.shape
    lab = np.zeros((H, W), int)
    n, sizes = 0, [0]
    for y in range(H):
        for x in range(W):
            if m[y, x] and not lab[y, x]:
                n += 1
                st, lab[y, x], c = [(y, x)], n, 0
                while st:
                    yy, xx = st.pop()
                    c += 1
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            Y, X = yy + dy, xx + dx
                            if 0 <= Y < H and 0 <= X < W and m[Y, X] and not lab[Y, X]:
                                lab[Y, X] = n
                                st.append((Y, X))
                sizes.append(c)
    if n > 1:
        big = int(np.argmax(sizes))
        a[(lab != big) & m] = 0
    return Image.fromarray(a)
