"""Creature battle sprites, set 2 (ART-C): the full-roster creatures.

Same contract and pipeline as mons.py (64x64 front/back, 32x16 icon):
    python3 tools/art/sprites/mons2.py                 # rebuild all set-2 sprites
    python3 tools/art/sprites/mons2.py grok proxy_mascot
    python3 tools/art/sprites/mons2.py --gen ID [front|back] [--force]
                                                        # (re)generate a source (spends quota)

Sources: tools/art/gen/raw/mon_<id>_front.png / mon_<id>_back.png, generated
with tools/art/gen/imagegen.py from the PROMPTS below (front prompts may name a
`ref` species whose front is passed as --ref so evolution lines stay related;
backs always use the creature's own front as the reference). The build only
reads them. Gallery: docs/ART_CREATURES.md.
"""
import os
import sys

import numpy as np
from PIL import Image

import mons as M
from common import SPRITES, ROOT, save

GEN_RAW = M.GEN_RAW

LEAD = ("One original monster-collecting-RPG creature, battle sprite, full body, "
        "3/4 front view facing LEFT, standing on the ground, centred and filling the frame. "
        "An animal / mythic creature with ornamental tech-rune detailing (small engraved circuit "
        "glyphs, gem inlays), strong readable silhouette, big expressive eyes, saturated palette. "
        "It is a living creature, not a robot, no screen for a face, no text, no letters, "
        "no logos or logo-like emblems. ")

BACK = ("The SAME creature as in the attached image (same colours, markings, proportions and "
        "features), now seen from behind in a 3/4 back view, facing away from the viewer towards "
        "the upper right, as the player's own creature in a monster-RPG battle. Full body, centred. "
        "No face visible except perhaps an ear or cheek edge. ")

# id -> {'p': front prompt (creature brief), 'ref': species id whose front is the design ref,
#        'line': evolution line name for the gallery, 'name': display name}
PROMPTS = {
    'grok': dict(name='Grok', line='Grok', p=(
        "A sharp, mischievous corvid-meets-comet creature: a sleek black-and-silver raven with "
        "constellation star-map markings (tiny silver dots joined by fine lines) across its wings, "
        "a long glowing icy-blue and white comet tail streaming behind it, a crest of swept-back "
        "silver feathers, one bright glinting eye with a star-shaped highlight, a cheeky confident "
        "half-smirk beak. Perched upright with one wing flared. Confident, a little chaotic. "
        "Palette: glossy blue-black, silver, white, icy cyan, a touch of violet.")),
    'proxy_mascot': dict(name='Proxy', line='Proxy', p=(
        "A small, round, genuinely adorable lab mascot creature: a soft fluffy white-and-gold "
        "puffball body with tiny paws, two little rounded ears, huge hopeful shiny eyes, rosy "
        "cheeks, a small happy open smile, and a short tail shaped like an upward-pointing "
        "chart arrow (a little zig-zag rising line ending in an arrowhead) in gold. A tiny gold "
        "star mark on its forehead. Cute, cuddly, trustworthy, the kind of mascot everyone loves. "
        "Palette: warm white, cream, soft gold, a hint of sky blue in the eyes.")),
    'proxy_student': dict(name='Proxy', line='Proxy', ref='proxy_mascot', p=(
        "Its evolution: the SAME creature as the attached image, now grown taller and slimmer, "
        "standing upright on two legs, polite and immaculate, posture perfect, paws folded neatly "
        "in front. Same white-and-gold fur, same round ears, same gold forehead star, same "
        "chart-arrow tail now longer and crisper. It wears a big gold prize rosette / medal on its "
        "chest with ribbon tails. Its big eyes are still pretty but slightly too still, staring "
        "straight out, a fixed polite smile. Pristine, model-student, a little uncanny but not "
        "scary. Palette: white, cream, gold, sky blue eyes, a blue ribbon.")),
    'proxy_tamper': dict(name='Proxy', line='Proxy', ref='proxy_student', p=(
        "Its next form: the SAME creature as the attached image (white-and-gold fur, round ears, "
        "gold forehead star, medal rosette, chart-arrow tail), but its body is starting to be made "
        "of user interface: bar-chart bars, digits and ruler tick marks are growing out through "
        "the fur like crystals on its shoulders, back and tail; parts of its fur are replaced by "
        "flat clean panels with progress bars. One eye is still a big round pretty eye, the "
        "other eye has become a glowing number '1'. Calm, polite, standing upright. Unsettling "
        "but not monstrous, no gore, no red eyes. Palette: white, gold, sky blue, pale UI green "
        "and pale teal crystals.")),
    'proxy_leader': dict(name='Proxy', line='Proxy', ref='proxy_tamper', p=(
        "Its final form: the SAME being as the attached image, now vast, serene and calm, seated "
        "like a great idol, white-and-gold, gold forehead star, eyes half closed in perfect "
        "serenity, a gentle smile. Crowning its head is a tall vertical ranking column / "
        "leaderboard tower of stacked gold-and-white bars that rises straight up and is cut off "
        "by the top edge of the image. Embedded all over the column and its robe-like body are many "
        "small copies of the cute round mascot face (tiny smiling white faces with big eyes). "
        "Bars, digits and tick marks grow from it like crystals. Unsettling through serenity and "
        "scale, not horror: no gore, no red eyes, no teeth. Palette: white, cream, gold, sky blue, "
        "pale teal.")),
}


def raw(sid, side):
    return os.path.join(GEN_RAW, 'mon_%s_%s.png' % (sid, side))


def gen(sid, side='front', force=False):
    sys.path.insert(0, os.path.join(ROOT, 'tools', 'art', 'gen'))
    import imagegen
    spec = PROMPTS[sid]
    if side == 'front':
        refs = [raw(spec['ref'], 'front')] if spec.get('ref') else []
        prompt = LEAD + spec['p']
    else:
        refs = [raw(sid, 'front')]
        prompt = BACK + spec['p']
    return imagegen.generate('mon_%s_%s' % (sid, side), prompt, refs, force)


# per-creature tuning, same keys as mons.TUNE
TUNE = {
    'proxy_leader': {'box': (64, 62), 'mb': 1},
}


def tune(sid):
    t = dict(M.TUNE['default'])
    t.update(TUNE.get(sid, {}))
    return t


def load(path):
    a = M.key_magenta(np.array(Image.open(path).convert('RGBA')))
    return Image.fromarray(a)


def build(only=None):
    res = {}
    old = M.TUNE.copy()
    try:
        for sid in PROMPTS:
            if only and sid not in only:
                continue
            if not os.path.exists(raw(sid, 'front')):
                continue
            M.TUNE[sid] = tune(sid)
            src = load(raw(sid, 'front'))
            t = M.tune(sid)
            if t.get('dewisp'):
                src = M.dewisp(src, t['dewisp'], t.get('protect', ()))
            back_src = load(raw(sid, 'back')) if os.path.exists(raw(sid, 'back')) else None
            front = M.make_front(sid, src)
            back = M.make_back(sid, src, back_src)
            icon = M.make_icon(sid, src)
            save(front, SPRITES, 'mons', sid + '_front.png')
            save(back, SPRITES, 'mons', sid + '_back.png')
            save(icon, SPRITES, 'mons', sid + '_icon.png')
            res[sid] = (front, back, icon)
    finally:
        M.TUNE.clear()
        M.TUNE.update(old)
    return res


if __name__ == '__main__':
    args = sys.argv[1:]
    if args and args[0] == '--gen':
        force = '--force' in args
        rest = [a for a in args[1:] if a != '--force']
        sid = rest[0]
        side = rest[1] if len(rest) > 1 else 'front'
        print(gen(sid, side, force))
    else:
        print(sorted(build(args or None)))
