"""Battle backgrounds for stage 2+ (ART-C2): battle/bg_<id>.png (240x112) and their
platform pads battle/platform_{enemy,player}_<id>.png (128x32).

    python3 tools/art/sprites/battle_bgs.py                  # rebuild from cached sources
    python3 tools/art/sprites/battle_bgs.py --gen gym [--force]   # (re)generate a source

Same construction as bg_grass (battle.py): one generated GBA-style scene (wide, a back
wall / far scenery in the upper part and a big empty floor below) is cropped like the
grass source, box-reduced to 240x112, mode-filtered, cut to <=16 colours and snapped
to the master palette (tools/art/palette.py) in OKLab, then de-speckled. The pads are
drawn in code with the grass pad's shape (battle.platform) in the floor's own ramp, so
creatures stand on something that belongs to the room.
Draw positions are the same as bg_grass: bg at (0,0), enemy pad at (112,50), player
pad at (-8,96).
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from common import P, ROOT, SPRITES, save, new  # noqa: E402

GEN_RAW = os.path.join(ROOT, 'tools', 'art', 'gen', 'raw')

STYLE = (" Style: authentic 16-bit GBA-era handheld monster-RPG battle background, original "
         "design, crisp hard-edged large pixels on a consistent grid, no anti-aliasing, no "
         "gradients, limited sunny palette, light from the upper left, simple readable shapes, "
         "few small details. Wide landscape image. Composition exactly like a classic handheld "
         "RPG battle backdrop: the far wall / far scenery fills the UPPER 45% of the image and a "
         "big, plain, mostly EMPTY flat floor fills the LOWER 55%, seen from a slightly raised "
         "3/4 angle; nothing standing in the middle of the floor, no characters, no creatures, "
         "no text, no letters, no logos, no border, no UI.")

BGS = {
    'gym': dict(p=(
        "Inside the Gradient Gym, a warm indoor battle arena that used to be a lecture hall: "
        "a back wall of big green chalkboards covered with simple white chalk arrows sloping "
        "downhill and small curves (no writing), wooden wainscot, a row of tall windows with "
        "soft daylight above; a polished honey-coloured wooden floor with a large white chalk "
        "circle drawn on it in the middle."),
        floor=[(150, 100, 60), (190, 134, 84), (224, 176, 120), (242, 212, 160)], floor_y=60,
        ring=(244, 246, 250, 255)),
    'station': dict(p=(
        "A Caltrain-style commuter railway platform on a sunny morning: in the far background a "
        "silver double-decker commuter train with a red stripe waiting at the platform edge, a "
        "small platform canopy on posts, a station clock and a bench far away, blue sky above "
        "with a few clouds and distant hills; the foreground is a wide empty light-grey concrete "
        "platform with a yellow safety line near the far edge."),
        floor=[(124, 130, 150), (166, 172, 188), (206, 210, 220), (238, 240, 244)], floor_y=46,
        ring=(232, 184, 48, 255)),
    'campus': dict(p=(
        "The lobby of Benchmark Corp, a bright, friendly tech-company headquarters: a tall glass "
        "wall in the back with sunlight and green trees outside, a white reception desk at the "
        "side, potted plants, a big wall screen showing a simple rising bar chart in gold, white "
        "and gold accents everywhere; the foreground is a wide empty polished pale stone floor "
        "with soft reflections."),
        floor=[(184, 164, 130), (220, 203, 164), (242, 230, 196), (252, 246, 226)], floor_y=43, floor_flat=True,
        ring=(232, 184, 48, 255)),
    'library': dict(p=(
        "A cosy old university library reading hall: tall dark wooden bookshelves full of "
        "colourful book spines along the back wall, a rolling library ladder, warm hanging lamps, "
        "an arched window with evening light; the foreground is a wide empty dark wooden floor "
        "with a large faded red patterned rug in the middle."),
        floor=[(107, 70, 48), (148, 98, 64), (189, 134, 84), (224, 176, 120)], floor_y=56, rug=True),
}


def raw(bid):
    return os.path.join(GEN_RAW, 'spr_bg_%s.png' % bid)


def gen(bid, force=False):
    sys.path.insert(0, os.path.join(ROOT, 'tools', 'art', 'gen'))
    import imagegen
    return imagegen.generate('spr_bg_%s' % bid, BGS[bid]['p'] + STYLE, [], force,
                             style=False, keep_full=True)


def background(bid):
    import battle
    p = raw(bid)
    if not os.path.exists(p):
        return None
    try:
        src = Image.open(p).convert('RGB')
    except OSError:      # being written by a running generation
        return None
    w, h = src.size
    src = src.crop((0, int(h * 0.12), w, h))        # same framing as bg_grass
    g = src.resize((240, 112), Image.BOX).filter(ImageFilter.ModeFilter(3))
    fy = BGS[bid].get('floor_y')
    if fy:   # calm the floor (reflections, plank seams, the source's own chalk ring) so the
        # creatures and pads read on it, like the plain bg_grass meadow
        fl = g.crop((0, fy + 2, 240, 112)).filter(ImageFilter.ModeFilter(7)).filter(ImageFilter.ModeFilter(5))
        g.paste(fl, (0, fy + 2))
        if BGS[bid].get('floor_flat'):   # polished floor: each row its dominant colour,
            a = np.array(g)               # with a few long soft reflection streaks kept
            for y in range(fy + 2, 112):
                row = [tuple(c) for c in a[y]]
                a[y] = max(set(row), key=row.count)
            g = Image.fromarray(a)
    q = g.quantize(18, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGBA')
    q = battle.snap_img(q, None, chroma_w=1.3)
    q = battle.clean_specks(q)
    return q


def pad(bid, kind):
    """The grass pad's shape in the floor's own ramp: lighter top, rim, dark lip."""
    import battle
    ramp = [tuple(c) + (255,) for c in BGS[bid]['floor']]
    im = battle.platform(kind=kind)
    a = np.array(im)
    g = [np.array(c) for c in P.GRASS]
    tg = [np.array(c) for c in P.TALL_GRASS]
    # one step darker than the floor round it, so the pad reads as a raised mat
    m = {tuple(g[0]): ramp[1], tuple(g[1]): ramp[1], tuple(g[2]): ramp[1], tuple(g[3]): ramp[2],
         tuple(tg[0]): ramp[0], tuple(tg[1]): ramp[0]}
    out = a.copy()
    for k, v in m.items():
        sel = (a[..., :4] == np.array(k)).all(-1)
        out[sel] = v
    im = Image.fromarray(out).copy()
    if BGS[bid].get('ring'):        # chalk circle / safety line / gold inlay
        px = im.load()
        cx, cy, rx, ry = 63.5, 13.5, 52, 9.5
        for t in range(900):
            ang = t / 900 * 2 * np.pi
            x, y = int(round(cx + rx * np.cos(ang))), int(round(cy + ry * np.sin(ang)))
            if px[x, y][3]:
                px[x, y] = BGS[bid]['ring']
    if BGS[bid].get('rug'):
        px = im.load()
        for y in range(32):
            for x in range(128):
                dx, dy = (x - 63.5) / 44, (y - 13.5) / 8
                if dx * dx + dy * dy <= 1 and px[x, y][3]:
                    px[x, y] = (192, 68, 68, 255) if dx * dx + dy * dy > 0.7 else (156, 52, 56, 255)
                    if 0.55 < dx * dx + dy * dy < 0.7:
                        px[x, y] = (232, 184, 48, 255)
    return im


def build():
    out = {}
    for bid in BGS:
        bg = background(bid)
        if bg is None:
            continue
        save(bg, SPRITES, 'battle', 'bg_%s.png' % bid)
        for kind in ('enemy', 'player'):
            save(pad(bid, kind), SPRITES, 'battle', 'platform_%s_%s.png' % (kind, bid))
        out[bid] = bg
    return out


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == '--gen':
        print(gen(a[1], '--force' in a))
    else:
        print(sorted(build()))
