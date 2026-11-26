"""Contact sheets / mock-ups for art review -> tools/art/sprites/preview/*.png"""
import os

from PIL import Image

from common import P, SPRITES, UI, PREVIEW, new, scale, save, rect
from font import text5, width5
import ui as U

BG = (168, 216, 150, 255)


def L(*parts):
    p = os.path.join(*parts)
    return Image.open(p).convert('RGBA') if os.path.exists(p) else None


def nine(src, w, h, c=8):
    im = new(w, h)
    sw, sh = src.size
    xs = [(0, c, 0, c), (c, sw - c, c, w - c), (sw - c, sw, w - c, w)]
    ys = [(0, c, 0, c), (c, sh - c, c, h - c), (sh - c, sh, h - c, h)]
    for sx0, sx1, dx0, dx1 in xs:
        for sy0, sy1, dy0, dy1 in ys:
            tile = src.crop((sx0, sy0, sx1, sy1))
            tw, th = sx1 - sx0, sy1 - sy0
            for y in range(dy0, dy1, th):
                for x in range(dx0, dx1, tw):
                    cw, ch = min(tw, dx1 - x), min(th, dy1 - y)
                    im.paste(tile.crop((0, 0, cw, ch)), (x, y))
    return im


def chars_sheet(ids):
    k = 6
    cols = 4
    cw, ch = 48 + 8 + 16 * 4 + 8, 96 + 8
    rows = (len(ids) + cols - 1) // cols
    im = new(cols * cw + 8, rows * ch + 8, BG)
    for i, cid in enumerate(ids):
        sh = L(SPRITES, 'chars', cid + '.png')
        x0, y0 = 8 + (i % cols) * cw, 8 + (i // cols) * ch
        im.alpha_composite(sh, (x0, y0))
        # walk-cycle strip (stand, A, stand, B) for down/left
        for r, row in enumerate((0, 1, 2, 3)):
            for j, c in enumerate((0, 1, 0, 2)):
                fr = sh.crop((c * 16, row * 24, c * 16 + 16, row * 24 + 24))
                im.alpha_composite(fr, (x0 + 56 + j * 16, y0 + r * 24))
    return scale(im, k)


def battle_screen(enemy, player, enemy_name='Enemy', player_name='Player', lv=(5, 5),
                  hp=(0.7, 0.35), text=('What will', 'FABLE do?')):
    scr = new(240, 160, (0, 0, 0, 255))
    bg = L(SPRITES, 'battle', 'bg_grass.png')
    if bg:
        scr.alpha_composite(bg, (0, 0))
    pe = L(SPRITES, 'battle', 'platform_enemy.png')
    pp = L(SPRITES, 'battle', 'platform_player.png')
    if pe:
        scr.alpha_composite(pe, (112, 50))
    if pp:
        scr.alpha_composite(pp, (-8, 96))
    ef = L(SPRITES, 'mons', enemy + '_front.png')
    pb = L(SPRITES, 'mons', player + '_back.png')
    if ef:
        scr.alpha_composite(ef, (144, 4))
    if pb:
        scr.alpha_composite(pb, (32, 48))
    # HUDs
    he, hpl = L(UI, 'hud_enemy.png'), L(UI, 'hud_player.png')
    a, b = U.HUD['enemy'], U.HUD['player']
    ex, ey = 8, 10
    px_, py_ = 128, 70
    if he:
        h = he.copy()
        text5(h, *a['name'], enemy_name, P.UI_TEXT, P.UI_TEXT_SHADOW)
        text5(h, *a['level'], str(lv[0]), P.UI_TEXT, P.UI_TEXT_SHADOW)
        U.draw_hp(h, a['hp_bar'], hp[0])
        scr.alpha_composite(h, (ex, ey))
    if hpl:
        h = hpl.copy()
        text5(h, *b['name'], player_name, P.UI_TEXT, P.UI_TEXT_SHADOW)
        text5(h, *b['level'], str(lv[1]), P.UI_TEXT, P.UI_TEXT_SHADOW)
        U.draw_hp(h, b['hp_bar'], hp[1])
        s = '%d/ %d' % (round(21 * hp[1]), 21)
        rx, ry = b['hp_text_right']
        text5(h, rx - width5(s), ry, s, P.UI_TEXT, P.UI_TEXT_SHADOW)
        x, y, w, hh = b['exp_bar']
        rect(h, x, y, int(w * 0.6), hh, P.EXP_BLUE[1])
        scr.alpha_composite(h, (px_, py_))
    # message box
    fb = L(UI, 'frame_battle.png')
    if fb:
        box = nine(fb, 240, 48)
        text5(box, 12, 12, text[0], P.UI_TEXT, P.UI_TEXT_SHADOW)
        text5(box, 12, 28, text[1], P.UI_TEXT, P.UI_TEXT_SHADOW)
        scr.alpha_composite(box, (0, 112))
    return scr


def ui_sheet():
    im = new(240 + 16, 160 * 2 + 24, (60, 70, 90, 255))
    # dialog mock on top of a grass field
    scr = new(240, 160, P.GRASS[2])
    fd = L(UI, 'frame_dialog.png')
    box = nine(fd, 240, 48)
    text5(box, 12, 12, "Hi! I'm Prof. Karpathy. Welcome to", P.UI_TEXT, P.UI_TEXT_SHADOW)
    text5(box, 12, 28, 'the world of LLMMON!', P.UI_TEXT, P.UI_TEXT_SHADOW)
    box.alpha_composite(L(UI, 'arrow_down.png'), (224, 34))
    scr.alpha_composite(box, (0, 112))
    fm = L(UI, 'frame_menu.png')
    menu = nine(fm, 72, 88)
    for i, s in enumerate(['DEX', 'PARTY', 'BAG', 'Arjun', 'SAVE', 'EXIT']):
        text5(menu, 16, 8 + i * 13, s, P.UI_TEXT, P.UI_TEXT_SHADOW)
    menu.alpha_composite(L(UI, 'cursor.png'), (6, 8 + 2 * 13))
    scr.alpha_composite(menu, (164, 4))
    # chips + pips
    x = 4
    for i, t in enumerate(U.TYPE_RAMPS):
        scr.alpha_composite(L(UI, 'type_%s.png' % t), (4 + (i % 4) * 36, 6 + (i // 4) * 16))
    scr.alpha_composite(L(UI, 'orb_slots.png'), (4, 40))
    im.alpha_composite(scr, (8, 8))
    # raw 9-slice sources + HUD plates at 1x
    y = 176
    for j, n in enumerate(['frame_dialog', 'frame_menu', 'frame_battle', 'cursor', 'arrow_down']):
        im.alpha_composite(L(UI, n + '.png'), (8 + j * 30, y))
    im.alpha_composite(L(UI, 'hud_enemy.png'), (8, y + 30))
    im.alpha_composite(L(UI, 'hud_player.png'), (120, y + 30))
    return scale(im, 4)


def mons_grid(ids):
    """All front+back pairs on the battle field, 2x."""
    cols = 4
    cw, ch = 140, 76
    bg = L(SPRITES, 'battle', 'bg_grass.png')
    rows = (len(ids) + cols - 1) // cols
    im = new(cols * cw, rows * ch, (40, 40, 50, 255))
    for i, sid in enumerate(ids):
        x0, y0 = (i % cols) * cw, (i // cols) * ch
        tile = new(cw - 4, ch - 4)
        if bg:
            tile.alpha_composite(bg.crop((40, 30, 40 + cw - 4, 30 + ch - 4)))
        for j, side in enumerate(('front', 'back', 'icon')):
            s = L(SPRITES, 'mons', '%s_%s.png' % (sid, side))
            if s is None:
                continue
            if side == 'icon':
                tile.alpha_composite(s, (2, 2))
            else:
                tile.alpha_composite(s, (2 + j * 66, 6))
        im.alpha_composite(tile, (x0 + 2, y0 + 2))
    return scale(im, 3)


def title_screen():
    scr = new(240, 160, (0, 0, 0, 255))
    bg = L(UI, 'title_bg.png')
    if bg:
        scr.alpha_composite(bg)
    lg = L(UI, 'title_logo.png')
    if lg:
        scr.alpha_composite(lg, (40, 6))
    s = 'PRESS START'
    text5(scr, (240 - width5(s)) // 2, 136, s, P.WALL_CREAM[3], P.OUTLINE)
    return scale(scr, 4)


def starter_screen():
    scr = new(240, 160, (0, 0, 0, 255))
    bg = L(UI, 'starter_select_bg.png')
    if bg:
        scr.alpha_composite(bg)
    orb = L(SPRITES, 'fx', 'orb_throw.png')
    for i, (x, y) in enumerate(STARTER_ORBS):
        scr.alpha_composite(orb.crop((0, 0, 16, 16)), (x - 8, y - 8))
    scr.alpha_composite(L(UI, 'cursor.png'), (STARTER_ORBS[1][0] - 4, STARTER_ORBS[1][1] - 20))
    fd = L(UI, 'frame_dialog.png')
    box = nine(fd, 240, 48)
    text5(box, 12, 12, 'So, you want GPT 5.5,', P.UI_TEXT, P.UI_TEXT_SHADOW)
    text5(box, 12, 28, 'the Tool-type LLMMON?', P.UI_TEXT, P.UI_TEXT_SHADOW)
    scr.alpha_composite(box, (0, 112))
    return scale(scr, 4)


def props_sheet(char_ids):
    im = new(240, 160, P.GRASS[2])
    x = 4
    for n in ['emote_exclaim', 'grass_overlay', 'item_ball', 'shadow', 'satchel']:
        s = L(SPRITES, 'fx', n + '.png')
        im.alpha_composite(s, (x, 4))
        x += 20
    im.alpha_composite(L(SPRITES, 'fx', 'grass_rustle.png'), (4, 24))
    im.alpha_composite(L(SPRITES, 'fx', 'orb_throw.png'), (72, 24))
    im.alpha_composite(L(SPRITES, 'fx', 'truck.png'), (150, 4))
    # player standing in grass with shadow + emote + overlay
    pl = L(SPRITES, 'chars', 'player.png').crop((0, 0, 16, 24))
    im.alpha_composite(L(SPRITES, 'fx', 'shadow.png'), (8, 64 + 17))
    im.alpha_composite(pl, (8, 64))
    im.alpha_composite(L(SPRITES, 'fx', 'emote_exclaim.png'), (8, 46))
    im.alpha_composite(pl, (30, 64))
    im.alpha_composite(L(SPRITES, 'fx', 'grass_overlay.png'), (30, 72))
    tb = L(SPRITES, 'battle', 'trainer_back.png')
    im.alpha_composite(tb, (-16 + 70, 96))
    pf = L(SPRITES, 'battle', 'prof_front.png')
    im.alpha_composite(pf, (4, 64 + 0) if False else (176, 60))
    im.alpha_composite(L(SPRITES, 'battle', 'trainer_m_front.png'), (60, 36))
    im.alpha_composite(L(SPRITES, 'battle', 'trainer_f_front.png'), (120, 36))
    return scale(im, 4)


# Orb centres on starter_select_bg (also documented in the catalog).
STARTER_ORBS = [(72, 84), (120, 84), (168, 84)]


def build(char_ids, mon_ids):
    os.makedirs(PREVIEW, exist_ok=True)
    out = {}
    out['chars'] = save(chars_sheet(char_ids), PREVIEW, 'chars_6x.png')
    out['ui'] = save(ui_sheet(), PREVIEW, 'ui_4x.png')
    out['title'] = save(title_screen(), PREVIEW, 'title_4x.png')
    out['starter'] = save(starter_screen(), PREVIEW, 'starter_select_4x.png')
    out['props'] = save(props_sheet(char_ids), PREVIEW, 'props_4x.png')
    out['mons'] = save(mons_grid(mon_ids), PREVIEW, 'mons_grid_3x.png')
    pairs = [('hallucihound', 'claude_fable', 'HalluciHound', 'FABLE'),
             ('gemma_4', 'gpt_5_5', 'GEMMA 4', 'GPT 5.5'),
             ('mistral_medium', 'glm', 'MISTRAL', 'GLM'),
             ('gpt_5_4_mini', 'claude_fable', 'GPT-5.4 mini', 'FABLE'),
             ('gemini_flash', 'gemma_4', 'GEMINI', 'GEMMA 4'),
             ('claude_haiku', 'mistral_medium', 'HAIKU', 'MISTRAL')]
    for i, (e, p, en, pn) in enumerate(pairs):
        scr = battle_screen(e, p, en, pn, text=('What will', '%s do?' % pn))
        out['battle%d' % i] = save(scale(scr, 4), PREVIEW, 'battle_%d_%s_vs_%s_4x.png' % (i, p, e))
    return out
