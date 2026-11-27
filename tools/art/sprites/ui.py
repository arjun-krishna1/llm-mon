"""UI art: 9-slice frames, battle HUD plates, cursors, type chips, orb slots.

Title / starter-select backgrounds live in screens.py.
All colours come from tools/art/palette.py.
"""
from common import P, UI, OUT, new, save, put, rect, hline, vline
from font import text3, width3

PAPER = P.UI_PAPER      # dark, mid, light
FRAME = P.UI_FRAME      # darkest -> lightest
ACC = P.UI_ACCENT
TXT = P.UI_TEXT


def rounded_mask(w, h, r):
    """Pixel-rounded rectangle membership test with radius r (0..3)."""
    cut = {0: [], 1: [1], 2: [2, 1], 3: [3, 1, 1], 4: [4, 2, 1, 1]}[r]

    def inside(x, y):
        for i, c in enumerate(cut):
            if (y == i or y == h - 1 - i) and (x < c or x > w - 1 - c):
                return False
        return 0 <= x < w and 0 <= y < h
    return inside


def ring_frame(w, h, rings, fill, radius=3, inner_shadow=None):
    """Draw concentric rounded rings. rings: list of colours outside->inside."""
    im = new(w, h)
    for i, col in enumerate(rings + [fill]):
        ins = rounded_mask(w - 2 * i, h - 2 * i, max(0, radius - i))
        for y in range(h - 2 * i):
            for x in range(w - 2 * i):
                if ins(x, y):
                    put(im, x + i, y + i, col)
    if inner_shadow:
        k = len(rings)
        hline(im, k + 1, w - k - 2, k, inner_shadow)
        vline(im, k, k + 1, h - k - 2, inner_shadow)
    return im


def frame_dialog(w=24, h=24):
    # navy outer line, light-blue bevel, mid-blue band, navy inner line, paper
    return ring_frame(w, h, [FRAME[0], FRAME[3], FRAME[1], FRAME[0]], PAPER[2],
                      radius=3, inner_shadow=PAPER[1])


def frame_menu(w=24, h=24):
    return ring_frame(w, h, [FRAME[0], FRAME[2], FRAME[0]], PAPER[2], radius=2,
                      inner_shadow=PAPER[1])


def frame_battle(w=24, h=24):
    # warm battle message box: navy line, orange bevel band, navy line, paper
    return ring_frame(w, h, [FRAME[0], ACC[2], ACC[1], FRAME[0]], PAPER[2], radius=3,
                      inner_shadow=PAPER[1])


# ---------------------------------------------------------------- HUD -----
# Anchor coordinates are documented in docs/ART_CATALOG_SPRITES.md and
# exported here so previews draw text exactly where the engine should.
HUD = {
    # Sized for the longest roster name ("DeepSeek Flash", 77 px in font_dialog)
    # plus "Lv100" with >= 3 px breathing room at normal letter spacing.
    'enemy': {
        'size': (124, 32),
        'name': (9, 2),          # top-left of the name PxText (font_dialog: caps rows +1..+9)
        'name_max': 88,          # right edge the name may reach
        'level': (100, 2),       # top-left of the level number (after baked 'LV'); up to 3 digits
        'lv_label': (92, 6),
        'hp_bar': (69, 17, 48, 3),  # x, y, w, h of the fill area
        'gender': None,
    },
    'player': {
        'size': (124, 44),
        'name': (7, 1),
        'name_max': 84,
        'level': (96, 1),
        'lv_label': (88, 5),
        'hp_bar': (66, 15, 48, 3),
        'hp_text_right': (114, 19),  # right edge / top of the "cur/max" PxText row
        'exp_bar': (50, 33, 64, 2),
    },
}


def hp_housing(im, x, y, bar_w):
    """Dark rounded housing with an orange 'HP' label and an empty bar slot.
    Bar fill area = (x+11, y+2, bar_w, 3)."""
    w = bar_w + 14
    rect(im, x + 1, y, w - 2, 7, FRAME[0])
    rect(im, x, y + 1, w, 5, FRAME[0])
    # label plate
    text3(im, x + 2, y + 1, 'HP', ACC[2])
    # bar slot: inner well
    rect(im, x + 10, y + 1, bar_w + 2, 5, FRAME[0])
    rect(im, x + 11, y + 2, bar_w, 3, P.UI_TEXT)
    hline(im, x + 11, x + 10 + bar_w, y + 2, (72, 72, 84, 255))


def plate(w, h, tail_left):
    """Cream plate with navy border, soft bevel and a GBA-style angled base."""
    im = new(w, h)
    body_h = h - 5
    base = ring_frame(w - 3, body_h, [FRAME[0], PAPER[2]], PAPER[2], radius=3)
    # bevel: bottom/right darker paper
    for y in range(body_h):
        for x in range(w - 3):
            if base.getpixel((x, y))[3]:
                put(im, x + (3 if not tail_left else 0), y, base.getpixel((x, y)))
    ox = 3 if not tail_left else 0
    bw = w - 3
    hline(im, ox + 2, ox + bw - 3, body_h - 2, PAPER[1])
    vline(im, ox + bw - 2, 2, body_h - 3, PAPER[1])
    hline(im, ox + 2, ox + bw - 4, 1, (255, 255, 255, 255))
    # angled navy base strip under the plate (points toward the creature)
    for i in range(4):
        y = body_h + i - 1
        if tail_left:
            x0, x1 = 6 + i, w - 1 - (3 - i)
        else:
            x0, x1 = 0 + (3 - i), w - 7 - i
        hline(im, x0, x1, y, FRAME[0] if i in (0, 3) else FRAME[2] if i == 1 else FRAME[1])
    return im


def hud_enemy():
    a = HUD['enemy']
    im = plate(*a['size'], tail_left=False)
    text3(im, a['lv_label'][0], a['lv_label'][1], 'LV', FRAME[1])
    x, y, bw, _ = a['hp_bar']
    hp_housing(im, x - 11, y - 2, bw)
    return im


def hud_player():
    a = HUD['player']
    im = plate(*a['size'], tail_left=True)
    text3(im, a['lv_label'][0], a['lv_label'][1], 'LV', FRAME[1])
    x, y, bw, _ = a['hp_bar']
    hp_housing(im, x - 11, y - 2, bw)
    ex, ey, ew, eh = a['exp_bar']
    rect(im, ex - 15, ey - 2, ew + 17, eh + 4, FRAME[0])
    text3(im, ex - 14, ey - 1, 'EXP', ACC[2])
    rect(im, ex, ey, ew, eh, P.UI_TEXT)
    return im


HPBAR = {
    'green': P.HP_GREEN, 'yellow': P.HP_YELLOW, 'red': P.HP_RED,
    'exp': P.EXP_BLUE, 'empty': P.UI_TEXT,
}


def draw_hp(im, bar, frac, kind=None):
    x, y, w, h = bar
    kind = kind or ('green' if frac > 0.5 else 'yellow' if frac > 0.2 else 'red')
    dark, light = HPBAR[kind]
    n = round(w * frac)
    if n <= 0:
        return
    rect(im, x, y, n, h, dark)
    hline(im, x, x + n - 1, y, light) if h >= 3 else None
    if h >= 3:
        rect(im, x, y, n, h - 1, light)
        hline(im, x, x + n - 1, y + h - 1, dark)
    else:
        rect(im, x, y, n, h, light)


# ------------------------------------------------------------- small UI ---

def cursor():
    rows = ['........',
            '.oo.....',
            '.oxo....',
            '.oxxo...',
            '.oxxxo..',
            '.oxxo...',
            '.oxo....',
            '.oo.....']
    im = new(8, 8)
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c == 'o':
                put(im, x, y, TXT)
            elif c == 'x':
                put(im, x, y, ACC[1] if y > 3 else ACC[2])
    return im


def arrow_down():
    rows = ['........',
            'ooooooo.',
            'oxxxxxo.',
            '.oxxxo..',
            '.oxxxo..',
            '..oxo...',
            '...o....',
            '........']
    im = new(8, 8)
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c == 'o':
                put(im, x, y, ACC[0])
            elif c == 'x':
                put(im, x, y, ACC[1] if y > 2 else ACC[2])
    return im


# One chip per type id (src/game/data/typechart.ts). Lab types are plain coloured
# chips with text only (no logos or logo-like marks). Neighbouring labs in the list
# use clearly different hues: orange, teal, blue, violet, navy, yellow, green, brown.
TYPE_RAMPS = {
    'anthropic': [P.ROOF_ORANGE[0], P.ROOF_ORANGE[1], P.ROOF_ORANGE[2]],
    'openai': [P.ROOF_TEAL[0], P.ROOF_TEAL[1], P.ROOF_TEAL[2]],
    'google': [P.ROOF_BLUE[0], P.ROOF_BLUE[1], P.ROOF_BLUE[2]],
    'zhipu': [P.ROOF_VIOLET[0], P.ROOF_VIOLET[1], P.ROOF_VIOLET[2]],
    'deepseek': [P.UI_FRAME[0], P.UI_FRAME[1], P.UI_FRAME[2]],
    'mistral': [P.CLOTH_YELLOW[0], P.CLOTH_YELLOW[1], P.CLOTH_YELLOW[2]],
    'moonshot': [P.GRASS[0], P.GRASS[1], P.GRASS[2]],
    'cohere': [P.WOOD[0], P.WOOD[1], P.WOOD[2]],
    'classic': [P.ROCK[0], P.ROCK[1], P.ROCK[2]],
    'glitch': [P.CLOTH_PINK[0], P.CLOTH_RED[1], P.CLOTH_PINK[1]],
}
TYPE_NAME = {'anthropic': 'ANTHROPIC', 'openai': 'OPENAI', 'google': 'GOOGLE', 'zhipu': 'ZHIPU',
             'deepseek': 'DEEPSEEK', 'mistral': 'MISTRAL', 'moonshot': 'MOONSHOT', 'cohere': 'COHERE',
             'classic': 'CLASSIC', 'glitch': 'GLITCH'}
TYPE_CODE = {'anthropic': 'ANT', 'openai': 'OAI', 'google': 'GGL', 'zhipu': 'ZHP', 'deepseek': 'DSK',
             'mistral': 'MST', 'moonshot': 'MSH', 'cohere': 'COH', 'classic': 'CLS', 'glitch': 'GLT'}
# Short name when it fits inside the 32px chip (2px inset each side), else the 3-letter code.
TYPE_LABEL = {t: (n if width3(n) <= 28 else TYPE_CODE[t]) for t, n in TYPE_NAME.items()}


def type_chip(tid):
    d, m, l = TYPE_RAMPS[tid]
    im = ring_frame(32, 12, [OUT], m, radius=2)
    hline(im, 2, 29, 1, l)
    hline(im, 2, 29, 10, d)
    label = TYPE_LABEL[tid]
    x = (32 - width3(label)) // 2
    text3(im, x, 3, label, P.WHITE[3], shadow=d)
    return im


def orb_cell(kind):
    """8x8 party pip. kinds: empty, ok, status, fainted, glint."""
    im = new(8, 8)
    if kind == 'empty':
        rows = ['..ooo...', '.o...o..', 'o.....o.', 'o.....o.', 'o.....o.', '.o...o..', '..ooo...', '........']
        cols = {'o': FRAME[2]}
    else:
        rows = ['..ooo...', '.oabbo..', 'oaabtbo.', 'occaabo.', 'oxccaao.', '.oxcco..', '..ooo...', '........']
        if kind in ('ok', 'glint'):
            cols = {'o': OUT, 'a': P.CLOTH_YELLOW[1], 'b': P.CLOTH_YELLOW[2], 't': P.WHITE[3],
                    'c': P.ROOF_TEAL[2], 'x': P.ROOF_TEAL[1]}
            if kind == 'glint':
                cols['b'] = P.WHITE[3]
        elif kind == 'status':
            cols = {'o': OUT, 'a': P.CLOTH_VIOLET[1], 'b': P.CLOTH_VIOLET[2], 't': P.WHITE[2],
                    'c': P.CLOTH_VIOLET[0], 'x': P.CLOTH_VIOLET[0]}
        else:  # fainted
            cols = {'o': OUT, 'a': P.ROCK[1], 'b': P.ROCK[2], 't': P.ROCK[2],
                    'c': P.ROCK[0], 'x': P.ROCK[0]}
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c in cols:
                put(im, x, y, cols[c])
    return im


def orb_slots():
    im = new(64, 8)
    for i, k in enumerate(['empty', 'ok', 'status', 'fainted', 'glint', 'ok', 'ok', 'ok']):
        im.paste(orb_cell(k), (i * 8, 0))
    return im


def build():
    save(frame_dialog(), UI, 'frame_dialog.png')
    save(frame_menu(), UI, 'frame_menu.png')
    save(frame_battle(), UI, 'frame_battle.png')
    save(hud_enemy(), UI, 'hud_enemy.png')
    save(hud_player(), UI, 'hud_player.png')
    save(cursor(), UI, 'cursor.png')
    save(arrow_down(), UI, 'arrow_down.png')
    save(orb_slots(), UI, 'orb_slots.png')
    build_type_chips()


def build_type_chips():
    """Only the 32x12 type chips (safe to run on its own)."""
    for t in TYPE_RAMPS:
        save(type_chip(t), UI, 'type_%s.png' % t)


if __name__ == '__main__':
    build()
