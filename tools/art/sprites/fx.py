"""Overworld / battle effect sprites -> sprites/fx/*.png

emote_exclaim 16x16, grass_rustle 64x16 (4 frames), grass_overlay 16x16,
item_ball 16x16, shadow 16x8, orb_throw 64x16 (Prompt Orb: closed, tilt-left,
tilt-right, open), truck ~48x40, satchel 16x16.
"""
import json
import math
import os

from PIL import Image

from common import P, OUT, ROOT, SPRITES, new, save, put, rect, hline, vline, outline, grid_to_image
import battle as B

TG = P.TALL_GRASS


def emote_exclaim():
    rows = [
        '................',
        '...oooooooooo...',
        '..owwwwwwwwwwo..',
        '.owwwwwrrwwwwwo.',
        '.owwwwrRRrwwwwo.',
        '.owwwwrRRrwwwwo.',
        '.owwwwwrRrwwwwo.',
        '.owwwwwrRwwwwwo.',
        '.owwwwwwwwwwwso.',
        '.owwwwwrRwwwwso.',
        '.owwwwwrrwwwsso.',
        '..ossssssssssO..',
        '...ooooo.sooo...',
        '........oso.....',
        '.........oo.....',
        '................',
    ]
    cm = {'o': OUT, 'O': OUT, 'w': P.WHITE[3], 's': P.WHITE[1], 'r': P.CLOTH_RED[1], 'R': P.CLOTH_RED[0]}
    return grid_to_image(rows, cm)


def _blade(im, x, y0, h, lean, cols):
    """One grass blade from (x, y0) upwards h px, leaning by `lean` px at the tip."""
    for i in range(h):
        t = i / max(1, h - 1)
        xx = x + round(lean * t * t)
        put(im, xx, y0 - i, cols[0] if i == 0 else cols[1] if t < 0.6 else cols[2])


def grass_overlay():
    """Front blades of tall grass that cover a standing character's feet."""
    ext = os.path.join(ROOT, 'public', 'assets', 'game', 'tilesets')
    cat = os.path.join(ext, 'exterior.catalog.json')
    if os.path.exists(cat):
        try:
            c = json.load(open(cat))
            tid = next((v for k, v in c['tiles'].items() if k.startswith('tall_grass')), None)
            if tid is not None:
                ts = Image.open(os.path.join(ext, 'exterior.png')).convert('RGBA')
                cols = ts.width // 16
                tile = ts.crop(((tid % cols) * 16, (tid // cols) * 16, (tid % cols) * 16 + 16, (tid // cols) * 16 + 16))
                im = new(16, 16)
                im.paste(tile.crop((0, 9, 16, 16)), (0, 9))
                return im
        except Exception:
            pass
    im = new(16, 16)
    for x, h, lean in ((0, 6, 1), (2, 7, -1), (4, 5, 1), (6, 7, 0), (8, 6, 1), (10, 7, -1),
                       (12, 6, 0), (14, 7, -1), (15, 5, 0), (1, 4, 0), (5, 4, 0), (9, 4, 0), (13, 4, 0)):
        _blade(im, x, 15, h, lean, (TG[0], TG[1], TG[2]))
    rect(im, 0, 14, 16, 2, TG[0])
    for x in range(0, 16, 3):
        put(im, x, 13, TG[1])
    return im


def grass_rustle():
    """4 frames: blades flick outward and two leaf bits fly up then settle."""
    sheet = new(64, 16)
    for f in range(4):
        im = new(16, 16)
        spread = [0, 2, 3, 1][f]
        for x, h in ((1, 6), (3, 8), (5, 7), (8, 8), (10, 7), (12, 8), (14, 6)):
            lean = (-spread if x < 7 else spread if x > 8 else 0)
            _blade(im, x, 15, h - (1 if f in (1, 2) and 5 < x < 11 else 0), lean, (TG[0], TG[2], TG[3]))
        rect(im, 0, 15, 16, 1, TG[0])
        # flying leaf bits
        if f in (1, 2, 3):
            dy = [0, 3, 6, 5][f]
            for lx, ly in ((3 - f, 10 - dy), (11 + f, 9 - dy)):
                put(im, lx, ly, TG[3])
                put(im, lx + 1, ly, TG[2])
        sheet.paste(im, (f * 16, 0))
    return sheet


def shadow():
    im = new(16, 8)
    c = P.SHADOW
    for y in range(8):
        for x in range(16):
            dx, dy = (x - 7.5) / 6.5, (y - 3.5) / 2.6
            if dx * dx + dy * dy <= 1:
                put(im, x, y, c)
    return im


# ------------------------------------------------------------- Prompt Orb --
# An original capture device: a faceted crystal orb, amber upper dome, teal
# lower dome, a steel equator ring with a small teal "prompt" gem.
ORB = [
    '................',
    '.....oooooo.....',
    '...ooWyyyaAoo...',
    '..oWyyyyyaaaAo..',
    '..oyyyyyaaaaAo..',
    '.oyyyyyaaaaaAAo.',
    '.oaaaaaaaaAAAAo.',
    '.oRRRRRRRRRRRRo.',
    '.orrrrrgGrrrrRo.',
    '.oRRRRRRRRRRRRo.',
    '.ottttttTTTTTDo.',
    '..otttttTTTTDo..',
    '..oTttttTTTDDo..',
    '...ooTTTTTDoo...',
    '.....oooooo.....',
    '................',
]
ORB_CM = {
    'o': OUT, 'W': P.WHITE[3], 'y': P.CLOTH_YELLOW[2], 'a': P.CLOTH_YELLOW[1], 'A': P.ROOF_ORANGE[1],
    'R': P.METAL[1], 'r': P.METAL[3], 'g': P.ROOF_TEAL[3], 'G': P.ROOF_TEAL[1],
    't': P.ROOF_TEAL[2], 'T': P.ROOF_TEAL[1], 'D': P.ROOF_TEAL[0],
}


def orb_closed():
    return grid_to_image(ORB, ORB_CM)


def orb_tilt(deg):
    big = orb_closed().resize((64, 64), Image.NEAREST).rotate(deg, resample=Image.NEAREST, center=(31.5, 33))
    sm = big.resize((16, 16), Image.NEAREST)
    return sm


def orb_open():
    im = new(16, 16)
    base = orb_closed()
    # lower half + ring stays
    im.alpha_composite(base.crop((0, 7, 16, 16)), (0, 7))
    # glowing mouth
    glow = ['..oWWWWWWWWo....', '.oWWyyyyyyWWo...']
    for i, row in enumerate(['..ycWWWWWWcy....'[:16], '.yWWWWWWWWWWy...'[:16]]):
        pass
    for x in range(2, 14):
        put(im, x, 6, P.CLOTH_YELLOW[2] if x in (2, 13) else P.WHITE[3])
    for x in range(4, 12):
        put(im, x, 5, P.CLOTH_YELLOW[2])
    # lid lifted 4px and tipped back
    lid = base.crop((0, 0, 16, 7))
    im.alpha_composite(lid.crop((0, 1, 16, 7)), (0, -2))
    # light rays
    for x, y in ((1, 3), (14, 3), (7, 0), (8, 0)):
        put(im, x, y, P.CLOTH_YELLOW[2])
    return im


def orb_throw():
    sheet = new(64, 16)
    for i, f in enumerate((orb_closed(), orb_tilt(24), orb_tilt(-24), orb_open())):
        sheet.paste(f, (i * 16, 0))
    return sheet


ORB_SMALL = [
    '...oooooo...',
    '..oWyyyaAo..',
    '.oyyyyaaaAo.',
    '.oaaaaaaAAo.',
    '.oRRRRRRRRo.',
    '.orrrgGrrRo.',
    '.ottttTTTDo.',
    '..otttTTDo..',
    '...oooooo...',
]


def item_ball():
    """Ground item: a small Prompt Orb resting on the ground with a shadow."""
    im = new(16, 16)
    sh = shadow().resize((12, 6), Image.NEAREST)
    im.alpha_composite(sh, (2, 10))
    o = orb_closed().resize((12, 12), Image.NEAREST)
    o = grid_to_image(ORB_SMALL, ORB_CM)
    im.alpha_composite(o, (2, 3))
    return im


# ---------------------------------------------------- generated props -----

def truck():
    p = B.raw('spr_truck')
    if not p:
        return new(48, 40)
    from gen.pixelize import pixelize
    spr = pixelize(p, width=48, height=40, colors=20, snap=True)
    im = new(48, 40)
    im.alpha_composite(spr, ((48 - spr.width) // 2, 40 - spr.height))
    _truck_livery(im)
    return im


def _truck_livery(im):
    """The generated lettering is illegible at 48px: repaint the cargo side
    panel plain cream and add a sheared 'MM' (Mythos Movers) mark + diamond."""
    px = im.load()
    top = lambda x: 17 - (x - 24) / 3.0
    bot = lambda x: 28.7 - (x - 24) / 3.0
    cream = P.WALL_CREAM[2]
    for x in range(25, 44):
        for y in range(int(top(x)) + 2, int(bot(x)) - 1):
            r, g, b, a = px[x, y]
            if a and (r + g + b) < 560:
                px[x, y] = cream
    from font import text3
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            if abs(dx) + abs(dy) <= 2:
                px[29 + dx, 21 + dy] = P.ROOF_ORANGE[0] if abs(dx) + abs(dy) == 2 else P.CLOTH_YELLOW[1]
    text3(im, 33, 17, 'MM', P.ROOF_ORANGE[0])


SATCHEL = [
    '................',
    '................',
    '......oooo......',
    '.....o....o.....',
    '..oooooooooooo..',
    '.oLLLLLLLLLLLLo.',
    '.oLMMMMMMMMMMMo.',
    '.oMMMMMMMMMMMDo.',
    '.oMMMMMyyMMMMDo.',
    '.oDDDDDyYDDDDDo.',
    '.oMMMMMMMMMMMMo.',
    '.oLMMMMMMMMMMDo.',
    '.oMMMMMMMMMMDDo.',
    '..oDDDDDDDDDDo..',
    '...oooooooooo...',
    '................',
]


def satchel():
    """The professor's leather satchel lying on the ground (hand-drawn)."""
    cm = {'o': OUT, 'L': P.WOOD[3], 'M': P.WOOD[2], 'D': P.WOOD[1],
          'y': P.CLOTH_YELLOW[2], 'Y': P.CLOTH_YELLOW[0]}
    im = grid_to_image(SATCHEL, cm)
    # strap loop in a darker leather
    for x, y in ((6, 2), (7, 2), (8, 2), (9, 2), (5, 3), (10, 3)):
        put(im, x, y, P.WOOD[0])
    # amber orb glints peeking from under the flap
    put(im, 4, 4, P.CLOTH_YELLOW[1])
    put(im, 11, 4, P.ROOF_TEAL[2])
    # soft ground shadow
    for x in range(3, 13):
        if im.getpixel((x, 15))[3] == 0:
            put(im, x, 15, P.SHADOW)
    return im


def build():
    save(emote_exclaim(), SPRITES, 'fx', 'emote_exclaim.png')
    save(grass_rustle(), SPRITES, 'fx', 'grass_rustle.png')
    save(grass_overlay(), SPRITES, 'fx', 'grass_overlay.png')
    save(item_ball(), SPRITES, 'fx', 'item_ball.png')
    save(shadow(), SPRITES, 'fx', 'shadow.png')
    save(orb_throw(), SPRITES, 'fx', 'orb_throw.png')
    save(truck(), SPRITES, 'fx', 'truck.png')
    save(satchel(), SPRITES, 'fx', 'satchel.png')


if __name__ == '__main__':
    build()
