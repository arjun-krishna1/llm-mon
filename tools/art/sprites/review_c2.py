"""Review sheets for the ART-C2 work (written to tools/art/sprites/preview/).

    python3 tools/art/sprites/review_c2.py

  * c2_portraits_battle_4x.png  every new trainer portrait on a mocked 240x160 trainer-battle
    screen (portrait on the enemy pad, the player's back, party pips, message box), next
    to the pinned rival/prof screens for the style comparison
  * c2_portraits_lineup_4x.png  new portraits side by side with the pinned set
  * c2_chars_4x.png             the new overworld sheets
  * c2_backgrounds_4x.png       each battle background with platforms + two creatures + HUD
  * c2_icons_8x.png             every creature icon (both frames) at 8x, plus 1x strip
"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from common import SPRITES, PREVIEW, new, save, scale  # noqa: E402
import preview as PV  # noqa: E402
from font import text5  # noqa: E402

B = os.path.join(SPRITES, 'battle')


def L(*p):
    f = os.path.join(*p)
    return Image.open(f).convert('RGBA') if os.path.exists(f) else None


def trainer_screen(front, bg='bg_grass', line=('Rival Yilong', 'would like to battle!')):
    scr = new(240, 160, (0, 0, 0, 255))
    scr.alpha_composite(L(B, bg + '.png'), (0, 0))
    pe = L(B, 'platform_enemy_%s.png' % bg[3:]) or L(B, 'platform_enemy.png')
    pp = L(B, 'platform_player_%s.png' % bg[3:]) or L(B, 'platform_player.png')
    scr.alpha_composite(pe, (112, 50))
    scr.alpha_composite(pp, (-8, 96))
    f = L(B, front + '.png')
    if f:
        scr.alpha_composite(f, (144, 64 - f.height + 2))
    tb = L(B, 'trainer_back.png').crop((0, 0, 64, 64))
    scr.alpha_composite(tb, (32, 48))
    fb = L(PV.UI, 'frame_battle.png')
    if fb:
        box = PV.nine(fb, 240, 48)
        text5(box, 12, 12, line[0], (56, 56, 64, 255), (200, 196, 176, 255))
        text5(box, 12, 28, line[1], (56, 56, 64, 255), (200, 196, 176, 255))
        scr.alpha_composite(box, (0, 112))
    return scr


def grid(tiles, cols, pad=4, bgc=(30, 30, 38, 255)):
    w, h = tiles[0].size
    rows = (len(tiles) + cols - 1) // cols
    im = new(cols * (w + pad) + pad, rows * (h + pad) + pad, bgc)
    for i, t in enumerate(tiles):
        im.alpha_composite(t, (pad + (i % cols) * (w + pad), pad + (i // cols) * (h + pad)))
    return im


NEW_PORTRAITS = ['yilong_front', 'rumelhart_front', 'shannon_front', 'overfit_grunt_m_front',
                 'overfit_grunt_f_front', 'overfit_admin_front', 'director_norm_front']
PINNED = ['rival_front', 'trainer_m_front', 'trainer_f_front']
NAMES = {'yilong_front': 'Rival Yilong', 'rumelhart_front': 'Leader Rumelhart',
         'shannon_front': 'Leader Shannon', 'overfit_grunt_m_front': 'Team Overfit Grunt',
         'overfit_grunt_f_front': 'Team Overfit Grunt', 'overfit_admin_front': 'Admin Goodhart',
         'director_norm_front': 'Director Norm', 'rival_front': 'Rival Dana - pinned',
         'trainer_m_front': 'Youngster - pinned', 'trainer_f_front': 'Lass - pinned'}
BGS = {'yilong_front': 'bg_grass', 'rumelhart_front': 'bg_gym', 'shannon_front': 'bg_gym',
       'overfit_grunt_m_front': 'bg_station', 'overfit_grunt_f_front': 'bg_station',
       'overfit_admin_front': 'bg_campus', 'director_norm_front': 'bg_campus'}


def portraits_battle():
    tiles = []
    for k in NEW_PORTRAITS + PINNED:
        bg = BGS.get(k, 'bg_grass')
        if not os.path.exists(os.path.join(B, bg + '.png')):
            bg = 'bg_grass'
        tiles.append(trainer_screen(k, bg, (NAMES[k], 'would like to battle!')))
    return scale(grid(tiles, 3), 2)


def lineup():
    ims = [L(B, k + '.png') for k in NEW_PORTRAITS] + [L(B, k + '.png') for k in PINNED + ['prof_front']]
    ims = [i for i in ims if i]
    im = new(sum(i.width + 4 for i in ims) + 4, 100, (150, 200, 140, 255))
    x = 4
    for i in ims:
        im.alpha_composite(i, (x, 98 - i.height))
        x += i.width + 4
    return scale(im, 4)


def chars():
    import people
    ids = ['yilong', 'proxy', 'leader_rumelhart', 'leader_shannon', 'overfit_m', 'overfit_f',
           'overfit_admin', 'norm', 'barista', 'vc', 'founder', 'busker', 'commuter', 'guard', 'player', 'rival']
    ims = [L(SPRITES, 'chars', i + '.png') for i in ids]
    im = new(len(ims) * 52 + 4, 104, (150, 200, 140, 255))
    for j, (i, s) in enumerate(zip(ids, ims)):
        im.alpha_composite(s, (4 + j * 52, 2))
    return scale(im, 4)


def backgrounds():
    tiles = []
    pairs = [('bg_grass', 'grok', 'claude_fable'), ('bg_gym', 'mlp', 'gpt_5_5'),
             ('bg_station', 'markov_chain', 'glm'), ('bg_campus', 'proxy_student', 'claude_sonnet'),
             ('bg_library', 'embedding', 'gemini_flash')]
    for bg, e, p in pairs:
        if os.path.exists(os.path.join(B, bg + '.png')):
            tiles.append(PV.battle_screen(e, p, e.upper().replace('_', ' ')[:12], p.upper().replace('_', ' ')[:12], bg=bg))
    return scale(grid(tiles, 2), 2) if tiles else None


def icons():
    files = sorted(f for f in os.listdir(os.path.join(SPRITES, 'mons')) if f.endswith('_icon.png'))
    n = len(files)
    cols = 12
    rows = (n + cols - 1) // cols
    big = new(cols * 40 + 4, rows * 26 + 4, (240, 234, 212, 255))
    for i, f in enumerate(files):
        ic = L(SPRITES, 'mons', f)
        x, y = 4 + (i % cols) * 40, 4 + (i // cols) * 26
        big.alpha_composite(ic, (x, y))
        text5(big, x, y + 16, f[:-9][:7], (56, 56, 64, 255), None) if False else None
    return scale(big, 4)


def build():
    out = {}
    out['c2_portraits_battle_4x.png'] = save(portraits_battle(), PREVIEW, 'c2_portraits_battle_4x.png')
    out['c2_portraits_lineup_4x.png'] = save(lineup(), PREVIEW, 'c2_portraits_lineup_4x.png')
    out['c2_chars_4x.png'] = save(chars(), PREVIEW, 'c2_chars_4x.png')
    bg = backgrounds()
    if bg is not None:
        out['c2_backgrounds_4x.png'] = save(bg, PREVIEW, 'c2_backgrounds_4x.png')
    out['c2_icons_4x.png'] = save(icons(), PREVIEW, 'c2_icons_4x.png')
    return out


if __name__ == '__main__':
    for k, v in build().items():
        print(k, v)
