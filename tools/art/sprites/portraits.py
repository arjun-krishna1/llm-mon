"""Trainer portraits for stage 2+ (ART-C2): battle/<key>.png, 64x64 full body.

    python3 tools/art/sprites/portraits.py                 # rebuild (pinned files win)
    python3 tools/art/sprites/portraits.py --gen KEY [--force]   # (re)generate a source
    python3 tools/art/sprites/portraits.py --pin KEY       # freeze the current build in pinned/

Style contract: the owner-approved portraits frozen in tools/art/sprites/pinned/
(prof_front, trainer_m_front, trainer_f_front, rival_front, player_front). Every
portrait here is generated WITH two or three of them (6x nearest upscales in
tools/art/gen/raw/refs/) as references, reduced with the same battle.fit_sprite
pipeline (box downscale, <=16 colours, solid #28222e outline), reviewed, and then
pinned so later rebuilds can never alter it. Characters named after real
researchers are original designs that suggest the role, never a likeness.
"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from common import ROOT, SPRITES, save  # noqa: E402

GEN_RAW = os.path.join(ROOT, 'tools', 'art', 'gen', 'raw')
REFS = os.path.join(GEN_RAW, 'refs')
PINNED = os.path.join(HERE, 'pinned')


def ref(name):
    return os.path.join(REFS, 'pin_%s_6x.png' % name)


LEAD = ("ONE original character, full-body standing trainer sprite for a GBA-era monster-collecting "
        "RPG battle screen, whole figure from head to shoes, facing the viewer, turned slightly to the "
        "left. MATCH THE ATTACHED REFERENCE SPRITES EXACTLY IN STYLE: the same natural proportions "
        "(a fairly LARGE head, about one sixth of the full height, like the references; normal limbs, "
        "not chibi), the same chunky pixel size "
        "and bold dark outline, the same simple 2-3 tone cel shading, the same warm sunny palette, and "
        "the same bold readable face with LARGE clear expressive anime-style eyes (dark pupils with a "
        "white highlight) and clear eyebrows, friendly and charming. Simple clothes "
        "with big clear shapes and few small details. ")

INK = (40, 34, 46, 255)
SHINE = (176, 188, 214, 255)   # the pinned portraits' blue-grey lower eye pixel
HAIR_Y = (83, 45, 51, 255)

# key -> dict(p=prompt, refs=[pinned names], size=(w, h), alias=[other keys])
PEOPLE = {
    'yilong_front': dict(refs=['rival_front', 'trainer_m_front', 'player_front'],
                         face=dict(skin=(31, 10, 37, 14), skin_from=(34, 13), eyes=(31, 35, 12),
                                   mouth=[(34, 14), (35, 14), (36, 14), (37, 13)],
                                   px=[(32, 10, HAIR_Y), (35, 10, HAIR_Y), (31, 11, INK), (32, 11, INK),
                                       (35, 11, INK), (36, 11, INK)]), p=(
        "Yilong, the player's smug but likeable teenage rival, a young tech-founder type (an original "
        "character, not any real person): messy spiky dark brown-black hair, confident lopsided grin, "
        "one eyebrow raised, black crew-neck T-shirt under an open dark charcoal bomber jacket with a "
        "small white star-and-comet patch on the chest, slim grey jeans, white sneakers, ONE HAND IN HIS "
        "POCKET and the other hand giving a casual two-finger wave. Cocky, cheerful, a bit too pleased "
        "with himself.")),
    'rumelhart_front': dict(alias=['leader_rumelhart_front'],
                            refs=['prof_front', 'trainer_m_front', 'trainer_f_front'], p=(
        "Gym Leader of the Gradient Gym, a patient, kind former schoolteacher in his fifties (an "
        "original character, not a likeness of anyone): short tidy grey-brown hair, warm gentle smile, "
        "a mustard-yellow knitted cardigan over a white collared shirt, brown slacks, brown shoes, a "
        "small red pin shaped like a downward arrow on the cardigan, his hands dusted white with "
        "chalk, holding a short stick of white chalk up in one hand as if about to explain.")),
    'shannon_front': dict(alias=['leader_shannon_front'],
                          refs=['prof_front', 'trainer_m_front', 'trainer_f_front'], p=(
        "Gym Leader of the Likelihood Gym, a playful middle-aged tinkerer (an original character, not "
        "a likeness of anyone): wavy greying hair, cheerful grin, rolled-up white shirt sleeves under a "
        "dark green waistcoat with a small brass gear pin, a red bow tie, grey trousers, brown shoes, "
        "juggling three small coloured balls (red, blue, yellow) that float in an arc above his raised "
        "hands.")),
    'overfit_grunt_m_front': dict(refs=['trainer_m_front', 'rival_front', 'trainer_f_front'], p=(
        "A young male field agent of Benchmark Corp's Team Overfit: friendly, proud and eager, not "
        "thuggish: short neat dark hair, big confident smile, crisp white track jacket with gold "
        "stripes down the sleeves and a gold collar, a small gold bar-chart emblem (three rising bars) "
        "on the chest, white track pants with a gold stripe, white-and-gold sneakers, a gold sweatband, "
        "giving a thumbs-up.")),
    'overfit_grunt_f_front': dict(refs=['trainer_f_front', 'rival_front', 'trainer_m_front'], p=(
        "A young female field agent of Benchmark Corp's Team Overfit: friendly, proud and eager, not "
        "thuggish: dark auburn hair in a high ponytail, bright smile, crisp white track jacket with gold "
        "stripes down the sleeves and a gold collar, a small gold bar-chart emblem (three rising bars) "
        "on the chest, white track shorts over dark leggings, white-and-gold sneakers, one hand on her "
        "hip, the other holding up a clipboard proudly.")),
    'overfit_admin_front': dict(refs=['trainer_m_front', 'prof_front', 'rival_front'], p=(
        "Goodhart, a Team Overfit Admin of Benchmark Corp (an original character): a slick, very "
        "confident man in his thirties, swept-back blond hair, a knowing smile, a long white-and-gold "
        "coat over a black turtleneck, a large gold bar-chart emblem (three rising bars) on the coat, "
        "gold epaulettes, black trousers, polished shoes, holding up a glowing tablet showing a single "
        "rising line chart. Proud and theatrical, not scary.")),
    'director_norm_front': dict(refs=['prof_front', 'trainer_m_front', 'rival_front'], p=(
        "Director Norm, the head of Benchmark Corp (an original character): a charming, sincere "
        "middle-aged executive with neat salt-and-pepper hair, a warm earnest smile, a light blue "
        "dress shirt with the sleeves rolled up, a loose navy tie, a gold company lanyard with an ID "
        "badge round his neck, grey suit trousers, brown shoes, one hand open in a welcoming "
        "gesture. Approachable and genuine, not sinister.")),
}


def raw(key):
    return os.path.join(GEN_RAW, 'spr_%s.png' % key)


def gen(key, force=False):
    sys.path.insert(0, os.path.join(ROOT, 'tools', 'art', 'gen'))
    import imagegen
    s = PEOPLE[key]
    return imagegen.generate('spr_%s' % key, LEAD + s['p'], [ref(r) for r in s['refs']], force)


def paint_face(im, face):
    """Hand-placed face (the generator's small eyes do not survive 64px).
    face: dict(eyes=(lx, rx, y) top-left pixel of each 2x2 eye, skin=(x0, y0, x1, y1)
    region repainted with the face's skin colour first, mouth=[(x, y), ...] ink,
    px=[(x, y, rgba), ...] free pixels)."""
    px = im.load()
    if 'skin' in face:
        x0, y0, x1, y1 = face['skin']
        sk = face.get('skin_col') or px[face['skin_from']]
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if px[x, y][3]:
                    px[x, y] = sk
    if 'eyes' in face:
        lx, rx, y = face['eyes']
        for x in (lx, rx):
            px[x, y] = INK
            px[x + 1, y] = INK
            px[x, y + 1] = INK if x == rx else SHINE
            px[x + 1, y + 1] = SHINE if x == rx else INK
    for x, y in face.get('mouth', []):
        px[x, y] = INK
    for x, y, c in face.get('px', []):
        px[x, y] = c
    return im


def make(key):
    """Mode reduction (mons2.reduce_mode: dominant colour per block, so cloth reads as
    flat chunky shapes like the pinned set), solid outline, then the face."""
    import numpy as np
    import battle
    import mons as M
    import mons2 as M2
    p = raw(key)
    if not os.path.exists(p):
        return None
    s = PEOPLE[key]
    w, h = s.get('size', (64, 64))
    src = M2.load(p)
    arr = M2.reduce_mode(src, w - 2, h - 2, colors=16, line_w=1.0, contrast=2.5, min_island=3)
    spr = battle.solid_outline(Image.fromarray(arr))
    im = M.place(np.array(spr), w, h, margin_bottom=s.get('mb', 0))
    if s.get('face'):
        paint_face(im, s['face'])
    return im


def portrait(key):
    pin = os.path.join(PINNED, key + '.png')
    if os.path.exists(pin):
        return Image.open(pin).convert('RGBA')
    return make(key)


def build():
    out = {}
    for key, s in PEOPLE.items():
        im = portrait(key)
        if im is None:
            continue
        for k in [key] + s.get('alias', []):
            save(im, SPRITES, 'battle', k + '.png')
        out[key] = im
    return out


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == '--gen':
        print(gen(a[1], '--force' in a))
    elif a and a[0] == '--pin':
        im = make(a[1])
        im.save(os.path.join(PINNED, a[1] + '.png'))
        print('pinned', a[1])
    else:
        print(sorted(build()))
