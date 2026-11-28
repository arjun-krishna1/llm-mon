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
    'proxy_needle': dict(name='Proxy', line='Proxy', ref='proxy_student', p=(
        "Its next form: the SAME creature as the attached image (white-and-gold fur, round ears, "
        "gold forehead star, medal rosette, chart-arrow tail), but its body is turning into a user "
        "interface. LARGE, chunky, clearly readable bar-chart bars in bright teal and mint green "
        "grow out of its shoulders, back, head and tail like big crystals, sticking out of the "
        "silhouette; its left arm and one leg are made of flat panels with progress bars and "
        "ruler tick marks; a few big digits float in its fur. One eye is still a big round pretty "
        "blue eye, the other eye is a big glowing mint-green number 1 filling the eye socket. "
        "Calm, polite, standing upright, fixed smile. Unsettling but not monstrous, no gore, no "
        "red eyes. Palette: white, gold, sky blue, saturated teal and mint UI crystals.")),
    'proxy_ascendant': dict(name='Proxy', line='Proxy', ref='proxy_needle', p=(
        "Its final form: the SAME being as the attached image, now vast, serene and calm, seated "
        "like a huge round idol, filling the width of the image. Same white fur and gold trim, "
        "gold forehead star, round ears, the big gold medal rosette, the gold chart-arrow tail. Its "
        "face is LARGE and clear: eyes gently closed in perfect serenity, a small calm smile. "
        "Crowning its head is a tall straight vertical ranking column: a stack of thick gold and "
        "teal horizontal bars like a leaderboard tower, rising straight up and cut off by the top "
        "edge of the image. Set into the column and the body are five or six small but clearly "
        "drawn copies of the cute round mascot face (white faces with big blue eyes). A few chunky "
        "teal bar-chart crystals at its shoulders. Designed to read as a tiny 64-pixel sprite: "
        "big simple shapes, few large details, strong value contrast, soft blue-grey shading on "
        "the white fur, no fine fur strokes. Unsettling through serenity and scale, not horror: "
        "no gore, no red eyes, no teeth. Palette: white, blue-grey shadow, gold, sky blue, teal.")),

    # ---- first batch (docs/ROSTER.md, stages 2-3) ----
    'claude_sonnet': dict(name='Claude Sonnet', line='Claude', refpath='spr_claude_fable_front', p=(
        "Its evolution: the SAME black fox-kirin as the attached image, grown half again as large "
        "and more graceful: black coat, cream flame mane now running all down its spine, gold spiral "
        "runes on its body, calm orange eyes. It now has a lynx-like cream ruff and tall tufted lynx "
        "ears. Fourteen small gold rune-spirals float in an arc behind it like the lines of a poem. "
        "Standing three-quarter pose, one forepaw raised. Palette: black, cream, gold, orange.")),
    'gpt_5_5_thinking': dict(name='GPT 5.5 Thinking', line='GPT', refpath='spr_gpt_5_5_front', p=(
        "Its evolution: the SAME teal-and-white fox-dragon as the attached image, now dog-sized "
        "and sitting upright in a thinking pose, chin resting on one raised paw, eyes thoughtful. "
        "Small teal wings folded on its back with gold tips. A ring of glowing rune wheels "
        "(abstract glyph circles, not machinery) orbits its head like a halo of thought. Its "
        "ribbon tail curls into a question-mark shape. Palette: teal, white, cream, a little gold.")),
    'glm_plus': dict(name='GLM Plus', line='GLM', refpath='spr_glm_front', p=(
        "Its evolution: the SAME jade-and-indigo kirin as the attached image, grown into a "
        "long-legged qilin with a flowing violet mane and short antler horns. Its gold constellation "
        "markings now connect with thin glowing lines into a visible graph of nodes across its "
        "flanks; three small glowing node-stars float above the horns. Proud trotting pose, leafy "
        "jade tail streaming. Palette: deep indigo, jade green, violet, gold, ice-blue highlights.")),
    'mistral_small': dict(name='Mistral Small', line='Mistral', refpath='mistral_medium', p=(
        "Its pre-evolution: a tiny baby version of the orange wind-fox in the attached image: a "
        "small orange-and-cream fox kit made of swirling air, huge ears pinned back as if facing a "
        "headwind, a scarf-like wisp tail. A single curling rune gust swirl hovers behind it. "
        "Mid-leap pose, cheerful. Palette: bright orange, cream, a touch of rust.")),
    'llama_scout': dict(name='Llama Scout', line='Llama', p=(
        "A woolly baby llama in soft blue-grey fleece with a little red explorer's scarf; a trail "
        "of three glowing hoof-print runes behind it. Big curious eyes, ears up, mid-step. The "
        "fleece has faint woven glyph patterns like a blanket. A small pendant shaped like a plain "
        "infinity loop hangs from the scarf. Palette: blue-grey, cream, red scarf, gold.")),
    'phi_mini': dict(name='Phi mini', line='Phi', p=(
        "A small fluffy sky-blue owlet with round study-glasses made of glowing light and a tiny "
        "open book of glowing runes held under one wing. Upright, slightly too-serious studious "
        "expression. Palette: sky blue, white, warm yellow book, a little navy.")),
    'sgd': dict(name='SGD', line='Optimizer', p=(
        "A small round armoured pill-bug / armadillo creature rolling downhill, shown mid-roll and "
        "slightly tilted, its banded shell marked with small glowing mint downward-arrow runes. "
        "Behind it a dotted glowing trail that wobbles zig-zag (noisy steps). Determined little "
        "face peeking out. Palette: earthy brown, tan, glowing mint.")),
    'momentum': dict(name='Momentum', line='Optimizer', ref='sgd', p=(
        "Its evolution: the SAME armoured bug as the attached image, grown into a sleek armoured "
        "pangolin leaning far forward as it rolls at speed, body half-curled into a wheel, head "
        "low and determined, small fins on its sides. Its mint arrow runes now all point forward "
        "in one steady direction and a long SMOOTH straight speed trail streams behind it (no "
        "wobble). Palette: brown armour, tan, glowing mint.")),
    'sigmoid': dict(name='Sigmoid', line='Activation', refpath='mon_sigmoid_front_v1', p=(
        "A soft lavender snake (same colours and face as the attached image) whose body traces a "
        "clean S-shaped step curve, seen from the side: its tail lies flat along the LOW ground on "
        "the right, the body then rises smoothly and steeply through the middle, and levels off "
        "flat again at the TOP on the left, where its sleepy head rests on a small flat-topped rock "
        "ledge. So both ends are flat but at different heights, like a smooth ramp from low to "
        "high. Rune scale pattern glows brightest pink on the steep middle and dims toward both "
        "flat ends. Palette: lavender, cream belly, warm pink glow, grey rock.")),
    'tanh': dict(name='Tanh', line='Activation', ref='sigmoid', p=(
        "Its evolution: the SAME S-curved snake as the attached image, now longer and perfectly "
        "centred, coiled symmetrically around a small glowing zero-ring rune; one half of its "
        "body is lavender, the other half teal (negative and positive). Head raised, balanced "
        "and alert. Palette: lavender, teal, cream, pink glow at the centre.")),
    'relu': dict(name='ReLU', line='Activation', ref='tanh', p=(
        "Its evolution: the snake from the attached image becomes a sharp-angled lizard shaped "
        "like a hockey stick: its long tail lies perfectly flat and straight along the ground with a "
        "hard flat underside, then its body bends at one hard corner and rises in a straight "
        "diagonal line up to its head. Everything below the flat ground line is clipped clean. "
        "Bold teal body, bright lime edge along the rising half, grey on the flat half. Alert, "
        "poised to dash.")),
    'perceptron': dict(name='Perceptron', line='Perceptron', p=(
        "A small round firefly-beetle with exactly three long antenna-whiskers (inputs), each with "
        "a glowing rune dot, and one big round glowing tail-light lantern (output). Hovering with "
        "small wings. Cute round eyes. Palette: warm brass, soft gold glow, cream.")),
    'mlp': dict(name='MLP', line='Perceptron', ref='perceptron', p=(
        "Its evolution: a colony creature made of SEVEN of the brass firefly-beetles from the "
        "attached image, big and chunky, stacked in three clear rows (two on top, three in the "
        "middle, two at the bottom) and joined by a few thick glowing gold threads into one "
        "round lantern-shaped hovering body. The middle beetle of the middle row is the largest "
        "and is the face, with big cute eyes looking left. Glowing round tail-lights. Designed to "
        "read as a tiny 64-pixel sprite: big simple shapes, few details. Palette: brass, cream, "
        "warm gold glow, same as the attached beetle.")),
    'batchnorm': dict(name='BatchNorm', line='Norm', p=(
        "A plump otter standing upright, perfectly balanced, centred and symmetric, front view, "
        "balancing on its head a neat stack of glowing pebbles that are all exactly the same size. "
        "Calm rune ripple rings radiate around its feet like a still pond. Proud, serene. "
        "Palette: brown, cream, calm aqua glow.")),
    'dropout': dict(name='Dropout', line='Dropout', p=(
        "A playful ghost-kitten that is only partly there: several random patches of its body are "
        "missing as clean square holes showing the background straight through it, and some of its "
        "spots are faded out. Pouncing pose, mischievous grin. Soft white fur with mint rune "
        "whiskers and mint spots.")),
    'residual': dict(name='Residual', line='Residual', p=(
        "A small brass salamander crawling low, with a bright glowing cyan arc of light that leaps "
        "from its nose in a high bridge over its back and lands at its tail tip (a skip "
        "connection). Friendly face. Palette: brass, bronze, cyan glow.")),
    'softmax': dict(name='Softmax', line='Softmax', p=(
        "A round fluffy puffball bird, perched and fluffed up, whose tail is a big round fan of "
        "feathers of clearly different lengths that together form one full circle behind it, "
        "faint glowing rune marks on each feather. Palette: pastel peach, pink, white, a little "
        "gold.")),
    'entropy': dict(name='Entropy', line='Entropy', p=(
        "A small curled cloud-cat whose fur is a slowly mixing swirled marble of indigo and peach, "
        "with tiny glowing square sparks popping off it. Curled-up pose, mysterious half-smile, "
        "glowing eyes. Palette: indigo, peach, cream, small cyan sparks.")),
    'n_gram': dict(name='N-gram', line='Embedding', p=(
        "A chain of three small round caterpillar segments, each segment carrying a glowing "
        "rune glyph (abstract symbol, not a real letter), the head turned back to look at the two "
        "segments behind it. Inching pose. Palette: spring green, cream, soft gold glow.")),
    'word2vec': dict(name='Word2Vec', line='Embedding', ref='n_gram', p=(
        "Its evolution: the caterpillar from the attached image becomes a moth with spring-green "
        "body and wide spread wings that are a night-blue star map: little glowing dots clustered "
        "in groups with one faint glowing arrow from one cluster to another. Same face and green "
        "colouring as the caterpillar. Palette: spring green, cream, night blue, soft gold.")),
    'embedding': dict(name='Embedding', line='Embedding', ref='word2vec', p=(
        "Its evolution: the moth from the attached image becomes a graceful luna-moth spirit with "
        "long tail streamers; its body is a translucent glowing cube of space with clusters of "
        "glowing points floating inside it; its wings are a deep star field. Hovering, serene. "
        "Palette: night blue, green, silver, soft gold.")),
    'glove': dict(name='GloVe', line='GloVe', p=(
        "A plump round hedgehog whose quills are tipped with tiny glowing rune dots, some pairs "
        "of quills tied together by thin glowing threads. Cupped little paws held in front. "
        "Curled-ready pose, friendly. Palette: sand, moss green, soft gold.")),
    'markov_chain': dict(name='Markov Chain', line='Markov', p=(
        "A ring-tailed lemur mid-hop between three small floating stepping-stones, each stone "
        "marked with a glowing rune, curved glowing arrows between the stones. Long striped "
        "ringed tail. Palette: grey, white, coral, black rings.")),
    'inception': dict(name='Inception', line='Inception', p=(
        "A chameleon perched on a short branch with four eyes of different sizes on short stalks, "
        "each looking a different way, violet eye-rings, and a curled spiral tail made of rune "
        "rings nested inside each other. Palette: leaf green, gold, violet.")),

    # ---- beyond the first batch: completing the optimizer and activation lines ----
    'adam': dict(name='Adam', line='Optimizer', ref='momentum', p=(
        "Its evolution: the brown armoured pangolin from the attached image now walks upright as "
        "a nimble armoured anteater-knight in a balanced fighting stance, long snout, big eyes. "
        "Each armour scale glows mint at a slightly different brightness. Two thin glowing rune "
        "rings orbit around its tail. Designed to read as a 64-pixel sprite: big simple shapes, "
        "large face. Palette: brown, tan, glowing mint, gold.")),
    'adamw': dict(name='AdamW', line='Optimizer', ref='adam', p=(
        "Its evolution: the SAME armoured anteater-knight as the attached image, in lighter, "
        "trimmed armour: fewer, thinner plates with silver trim, small glowing mint rune leaves "
        "falling away from it (weights decaying). Calm, upright, holding a short staff. Big simple "
        "shapes, large face. Palette: brown, mint, silver trim, a little gold.")),
    'gelu': dict(name='GELU', line='Activation', ref='relu', p=(
        "Its evolution: the angular hockey-stick lizard from the attached image smoothed into a "
        "sleek elegant dragon in a rearing pose: its tail still lies flat along the ground but the "
        "hard corner is now a soft smooth curve with a tiny dip just below the ground line before "
        "the body rises. Lime and teal scales, rune bands along the rising back, small fins. Big "
        "simple shapes, clear face. Palette: lime, teal, cream, a little gold.")),
}


def raw(sid, side):
    return os.path.join(GEN_RAW, 'mon_%s_%s.png' % (sid, side))


def ref_path(sid):
    spec = PROMPTS[sid]
    if spec.get('ref'):
        return raw(spec['ref'], 'front')
    r = spec.get('refpath')
    if not r:
        return None
    if r in M.SPECIES and 'ai' in M.SPECIES[r]:
        return os.path.join(M.SRC_AI, M.SPECIES[r]['ai'] + '.png')
    return os.path.join(GEN_RAW, r + '.png')


def gen(sid, side='front', force=False):
    sys.path.insert(0, os.path.join(ROOT, 'tools', 'art', 'gen'))
    import imagegen
    spec = PROMPTS[sid]
    if side == 'front':
        refs = [ref_path(sid)] if ref_path(sid) else []
        prompt = LEAD + spec['p']
    else:
        refs = [raw(sid, 'front')]
        prompt = BACK + spec['p']
    return imagegen.generate('mon_%s_%s' % (sid, side), prompt, refs, force)


# ------------------------------------------------- mode-based reduction ----
# The generated sources are already pixel art at ~5-6x; averaging blocks
# (mons.reduce) blends neighbouring colours into mud and merges small accents
# (eyes) away. Here each output pixel takes the MOST COMMON source colour of its
# block (after a fine full-res pre-quantisation), and the final <=15 colour
# palette comes from a farthest-point-seeded k-means, so small saturated
# accents (eyes, gems) keep their own colour.

def _kmeans(pts, w, k, iters=12, chroma=0.9):
    pts = pts.astype(float)
    # opponent colour space with chroma weighted up, so a small blue eye is
    # not merged into a dark grey just because their luminance is close
    T = np.array([[1 / 3, 1 / 3, 1 / 3], [1.0, -1.0, 0.0], [0.5, 0.5, -1.0]]) * \
        np.array([[1.0], [chroma], [chroma]])
    P = pts @ T.T
    # farthest-point seeding, weighted by count so noise doesn't dominate
    c = [P[int(np.argmax(w))]]
    d = ((P - c[0]) ** 2).sum(1)
    for _ in range(1, min(k, len(P))):
        i = int(np.argmax(d * np.sqrt(w)))
        c.append(P[i])
        d = np.minimum(d, ((P - P[i]) ** 2).sum(1))
    C = np.array(c)
    for _ in range(iters):
        lab = ((P[:, None, :] - C[None]) ** 2).sum(-1).argmin(1)
        for j in range(len(C)):
            m = lab == j
            if m.any():
                C[j] = (P[m] * w[m, None]).sum(0) / w[m].sum()
    lab = ((P[:, None, :] - C[None]) ** 2).sum(-1).argmin(1)
    return C @ np.linalg.inv(T).T, lab


def _despeckle(cl, C, keep_contrast):
    """A pixel whose colour appears nowhere in its 8-neighbourhood is fur/line
    noise: give it the most common neighbouring colour - unless it contrasts
    strongly with all of them (a deliberate highlight such as an eye glint)."""
    h, w = cl.shape
    out = cl.copy()
    lum = C.mean(1)
    for y in range(h):
        for x in range(w):
            c = cl[y, x]
            if c < 0:
                continue
            nb = cl[max(0, y - 1):y + 2, max(0, x - 1):x + 2].ravel()
            nb = nb[nb >= 0]
            if (nb == c).sum() > 1:
                continue
            others = nb[nb != c]
            if len(others) < 5:
                continue
            if np.abs(lum[others] - lum[c]).min() > keep_contrast:
                continue
            out[y, x] = np.bincount(others).argmax()
    return out


def reduce_mode(src, box_w, box_h, colors=15, thresh=0.5, min_island=6, pre=40, sat=1.06,
                despeckle=1, keep_contrast=140, line_w=1.0, premode=0, accents=(), contrast=0.0, min_share=0.22):
    bb = src.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
    src = src.crop(bb)
    s = min(box_w / src.width, box_h / src.height)
    tw, th = max(1, round(src.width * s)), max(1, round(src.height * s))
    _, cov = M.downscale(src, tw, th)
    mask = M.clean_mask(cov >= thresh, min_island)
    a = np.array(src)
    op = a[..., 3] > 128
    # fine uniform pre-quantisation (16 levels per channel): keeps rare
    # colours (eyes) that a median cut would drop
    if premode:   # full-res mode filter: drops hairline fur strokes first
        from PIL import ImageFilter
        a = a.copy()
        a[..., :3] = np.array(Image.fromarray(a[..., :3]).filter(ImageFilter.ModeFilter(premode)))
    q4 = (a[..., :3].astype(int) // 16)
    qi = q4[..., 0] * 256 + q4[..., 1] * 16 + q4[..., 2]
    pre = 4096
    pal = np.zeros((pre, 3))
    cnt = np.bincount(qi[op], minlength=pre).astype(float)
    for ch in range(3):
        pal[:, ch] = np.bincount(qi[op], weights=a[..., ch][op].astype(float), minlength=pre)
    pal /= np.maximum(cnt, 1)[:, None]
    H, W = qi.shape
    # vote weights: dark line-art colours count extra so thin source outlines
    # (eyes, mouths, brows) survive the reduction
    plum = pal @ np.array([0.3, 0.5, 0.2])
    vw = 1.0 + line_w * (plum < 90)
    out_idx = np.zeros((th, tw), int)
    xs = np.linspace(0, W, tw + 1)
    ys = np.linspace(0, H, th + 1)
    for y in range(th):
        y0, y1 = int(ys[y]), max(int(ys[y]) + 1, int(round(ys[y + 1])))
        for x in range(tw):
            if not mask[y, x]:
                continue
            x0, x1 = int(xs[x]), max(int(xs[x]) + 1, int(round(xs[x + 1])))
            blk = qi[y0:y1, x0:x1][op[y0:y1, x0:x1]]
            if blk.size == 0:
                blk = qi[y0:y1, x0:x1].ravel()
            bc = np.bincount(blk, weights=vw[blk], minlength=pre)
            if contrast:
                # detail-preserving vote: a colour covering a fair share of the
                # block wins if it stands out from the surrounding area (eyes,
                # mouths, gems), instead of always the majority fur colour
                ny0, ny1 = max(0, 2 * y0 - y1), min(H, 2 * y1 - y0)
                nx0, nx1 = max(0, 2 * x0 - x1), min(W, 2 * x1 - x0)
                nb = a[ny0:ny1, nx0:nx1][op[ny0:ny1, nx0:nx1]][:, :3]
                if len(nb):
                    mean = nb.mean(0)
                    cand = np.nonzero(bc >= bc.sum() * min_share)[0]
                    if len(cand) == 0:
                        cand = np.array([bc.argmax()])
                    d = np.sqrt(((pal[cand] - mean) ** 2).sum(1)) / 255.0
                    score = bc[cand] * (1 + contrast * d)
                    out_idx[y, x] = cand[int(np.argmax(score))]
                    continue
            out_idx[y, x] = bc.argmax()
    used, counts = np.unique(out_idx[mask], return_counts=True)
    C, lab = _kmeans(pal[used], counts.astype(float), colors)
    C = np.clip(C, 0, 255)
    grey = C.mean(1, keepdims=True)
    C = np.clip(grey + (C - grey) * sat, 0, 255)
    lut = {int(u): int(l) for u, l in zip(used, lab)}
    cl = np.full((th, tw), -1)
    for y, x in zip(*np.nonzero(mask)):
        cl[y, x] = lut[int(out_idx[y, x])]
    for _ in range(despeckle):
        cl = _despeckle(cl, C, keep_contrast)
    out_rgb = np.zeros((th, tw, 3))
    for y, x in zip(*np.nonzero(mask)):
        out_rgb[y, x] = C[cl[y, x]] / 255.0
    sa = np.array(src).astype(int)
    for pred, box, th_, *dark in accents:
        m = pred(sa[..., 0], sa[..., 1], sa[..., 2]) & (sa[..., 3] > 128)
        H0, W0 = m.shape
        x0, y0, x1, y1 = box
        reg = np.zeros_like(m)
        reg[int(y0 * H0):int(y1 * H0), int(x0 * W0):int(x1 * W0)] = True
        m &= reg
        if not m.any():
            continue
        col = sa[m][:, :3].mean(0) / 255.0
        cv = np.array(Image.fromarray((m * 255).astype(np.uint8)).resize((tw, th), Image.BOX)) / 255.0
        hit = (cv >= th_) & mask
        for y, x in zip(*np.nonzero(hit)):
            out_rgb[y, x] = np.clip(col * (0.8 if (y > 0 and hit[y - 1, x]) else 1.05), 0, 1)
        if dark:   # dark rim under/left of the accent (eye outline)
            for y, x in zip(*np.nonzero(hit)):
                for dy, dx in dark[0]:
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < th and 0 <= xx < tw and mask[yy, xx] and not hit[yy, xx]:
                        out_rgb[yy, xx] = (0.24, 0.13, 0.13)
    out_rgb = M.ink(out_rgb, mask)
    out = np.zeros((th, tw, 4), np.uint8)
    out[..., :3] = (out_rgb * 255).round().astype(np.uint8)
    out[..., 3] = mask * 255
    return out


# ------------------------------------------------------- touch-ups ----

def _ascendant_face(im):
    """Proxy leader: the source's fine closed-eye lines don't survive 64px;
    repaint a clean serene face (closed eyes, small smile, blush)."""
    px = im.load()
    fur = (255, 246, 228, 255)
    for y in range(25, 32):
        for x in range(16, 31):
            if px[x, y][3]:
                px[x, y] = fur
    ink = (74, 36, 40, 255)
    for x, y in [(17, 28), (18, 29), (19, 29), (20, 28),
                 (25, 28), (26, 29), (27, 29), (28, 28),
                 (22, 31), (23, 31)]:
        px[x, y] = ink
    for x, y in [(17, 30), (18, 30), (27, 30), (28, 30)]:
        px[x, y] = (247, 186, 186, 255)


# per-creature tuning, same keys as mons.TUNE
TUNE = {
    'grok': {'keep_contrast': 90},
    'momentum': {'crop': (0.0, 0.0, 0.66, 1.0), 'back_box': (80, 84), 'back_crop': (0.3, 0.0, 1.0, 1.0)},
    'sgd': {'back_box': (84, 84)},
    'gelu': {'back_box': (76, 84)},
    'sigmoid': {'back_box': (76, 84), 'back_vis': 1.0, 'back_dx': 6, 'box': (64, 60)},
    'relu': {'back_box': (76, 84), 'back_vis': 1.0, 'back_dx': -6, 'box': (64, 60)},
    'n_gram': {'back_box': (80, 84)},
    'residual': {'back_box': (84, 84), 'back_vis': 0.9},
    'proxy_ascendant': {'box': (64, 63), 'mb': 1, 'touch': [_ascendant_face], 'accents': [
        # blue eyes of the embedded mascot faces
        (lambda r, g, b: (b > 160) & (r < 110) & (g > 80) & (g < 200), (0.0, 0.0, 1.0, 1.0), 0.22)]},
    'proxy_student': {'icon_crop': (0.0, 0.62), 'box': (62, 62), 'mb': 1,
                      'accents': [(lambda r, g, b: (b > 170) & (r < 130) & (g > 90),
                                   (0.2, 0.15, 0.55, 0.3), 0.2, [(-1, 0), (0, -1)])]},
    'proxy_needle': {'icon_crop': (0.0, 0.62), 'box': (62, 62), 'mb': 1, 'line_w': 0.0,
                     'accents': [
                         (lambda r, g, b: (b > 170) & (r < 130) & (g > 90), (0.1, 0.18, 0.3, 0.32), 0.2, [(-1, 0), (0, -1)]),
                         (lambda r, g, b: (g > 170) & (g > r + 40) & (b < g), (0.28, 0.18, 0.48, 0.32), 0.2, [(-1, 0), (0, 1)])]},
}


def tune(sid):
    t = dict(M.TUNE['default'])
    t.update(TUNE.get(sid, {}))
    return t


def load(path):
    a = M.key_magenta(np.array(Image.open(path).convert('RGBA')))
    return Image.fromarray(a)


def make_front(sid, src):
    t = tune(sid)
    arr = reduce_mode(src, *t['box'], colors=t['colors'], thresh=t.get('thresh', 0.5),
                      sat=t.get('sat', 1.06), despeckle=t.get('despeckle', 1),
                      keep_contrast=t.get('keep_contrast', 140), line_w=t.get('line_w', 0.5), premode=t.get('premode', 0), contrast=t.get('contrast', 2.5), accents=t.get('accents', ()))
    im = M.place(arr, 64, 64, margin_bottom=t.get('mb', 2), dx=t.get('dx', 0), dy=t.get('dy', 0))
    for fn in t.get('touch', []):
        fn(im)
    return im


def make_back(sid, src, back_src):
    t = tune(sid)
    vis = t.get('back_vis', 0.82)
    if back_src is None:
        back_src = src.transpose(Image.FLIP_LEFT_RIGHT)
        bw, bh = (int(t['box'][0] * 1.3), int(t['box'][1] * 1.3))
    else:
        bw, bh = t.get('back_box', (64, 84))
    arr = reduce_mode(back_src, bw, bh, colors=t['colors'], thresh=t.get('thresh', 0.5),
                      sat=t.get('sat', 1.06), despeckle=t.get('despeckle', 1),
                      keep_contrast=t.get('keep_contrast', 140), line_w=t.get('line_w', 0.5), premode=t.get('premode', 0), contrast=t.get('contrast', 2.5), accents=t.get('back_accents', ()))
    spr = Image.fromarray(arr)
    im = M.new(64, 64)
    x = (64 - spr.width) // 2 + t.get('back_dx', 0)
    y = max(1, 64 - round(spr.height * vis) + t.get('back_dy', 0))
    im.paste(spr, (x, y), spr)
    for fn in t.get('back_touch', []):
        fn(im)
    return im


def make_icon(sid, src):
    t = tune(sid)
    if t.get('icon_crop'):   # tall creatures: icon shows the upper part only
        bb = src.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
        y0, y1 = t['icon_crop']
        h = bb[3] - bb[1]
        src = src.crop((bb[0], bb[1] + int(h * y0), bb[2], bb[1] + int(h * y1)))
    arr = reduce_mode(src, 15, 14, colors=10, thresh=0.42, min_island=2, sat=1.12)
    a = M.new(16, 16)
    spr = Image.fromarray(arr)
    a.paste(spr, ((16 - spr.width) // 2, 15 - spr.height), spr)
    b = M.new(16, 16)
    b.paste(a.crop((0, 1, 16, 16)), (0, 0))  # bob up 1px
    sheet = M.new(32, 16)
    sheet.paste(a, (0, 0))
    sheet.paste(b, (16, 0))
    return sheet


def build(only=None):
    res = {}
    for sid in PROMPTS:
        if only and sid not in only:
            continue
        if not os.path.exists(raw(sid, 'front')):
            continue
        t = tune(sid)
        src = load(raw(sid, 'front'))
        if t.get('crop'):   # (x0, y0, x1, y1) fractions: drop e.g. a long thin trail
            x0, y0, x1, y1 = t['crop']
            src = src.crop((int(x0 * src.width), int(y0 * src.height),
                            int(x1 * src.width), int(y1 * src.height)))
        if t.get('dewisp'):
            src = M.dewisp(src, t['dewisp'], t.get('protect', ()))
        back_src = load(raw(sid, 'back')) if os.path.exists(raw(sid, 'back')) else None
        if back_src is not None and t.get('back_crop'):
            x0, y0, x1, y1 = t['back_crop']
            w, h = back_src.size
            back_src = back_src.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))
        front = make_front(sid, src)
        back = make_back(sid, src, back_src)
        icon = make_icon(sid, src)
        save(front, SPRITES, 'mons', sid + '_front.png')
        save(back, SPRITES, 'mons', sid + '_back.png')
        save(icon, SPRITES, 'mons', sid + '_icon.png')
        res[sid] = (front, back, icon)
    return res


# ------------------------------------------------------------ previews ----

GALLERY_BG = (168, 216, 150, 255)   # battle meadow green


# Evolution lines for the gallery, including existing (mons.py) members so a
# new stage is always seen next to the stage it grows from / into.
LINES = [
    ('Grok', ['grok']),
    ('Proxy', ['proxy_mascot', 'proxy_student', 'proxy_needle', 'proxy_ascendant']),
    ('Claude', ['claude_fable', 'claude_haiku', 'claude_sonnet', 'claude_opus']),
    ('GPT', ['gpt_5_4_mini', 'gpt_5_5', 'gpt_5_5_thinking', 'gpt_5_5_xhigh']),
    ('GLM', ['glm', 'glm_plus', 'glm_max']),
    ('Mistral', ['mistral_small', 'mistral_medium']),
    ('Llama', ['llama_scout']),
    ('Phi', ['phi_mini']),
    ('Optimizer', ['sgd', 'momentum', 'adam', 'adamw']),
    ('Activation', ['sigmoid', 'tanh', 'relu', 'gelu']),
    ('Perceptron', ['perceptron', 'mlp']),
    ('Embedding', ['n_gram', 'word2vec', 'embedding']),
    ('Singles', ['batchnorm', 'dropout', 'residual', 'softmax']),
    ('Singles 2', ['entropy', 'glove', 'markov_chain', 'inception']),
]


def lines():
    """[(line name, [ids with a built front])], only lines with a set-2 member."""
    have = lambda s: os.path.exists(os.path.join(SPRITES, 'mons', s + '_front.png'))
    out, seen = [], set()
    for name, ids in LINES:
        ids = [i for i in ids if have(i)]
        seen.update(ids)
        if any(i in PROMPTS for i in ids):
            out.append((name, ids))
    rest = [i for i in PROMPTS if i not in seen and have(i)]
    if rest:
        out.append(('Other', rest))
    return out


def gallery():
    """Front + back (+ icon) of every set-2 creature on the battle meadow,
    one row per evolution line, names underneath; returned scaled 3x."""
    from common import new, scale
    from font import text5
    rows = lines()
    if not rows:
        return None
    cw, ch = 134, 78
    ncol = max(len(ids) for _, ids in rows)
    W, H = 4 + ncol * cw, 2 + len(rows) * ch
    im = new(W, H, (40, 40, 50, 255))
    bg = Image.open(os.path.join(SPRITES, 'battle', 'bg_grass.png')).convert('RGBA')
    for r, (lname, ids) in enumerate(rows):
        y = 2 + r * ch
        for j, sid in enumerate(ids):
            x = 2 + j * cw
            tile = new(cw - 2, ch - 2, GALLERY_BG)
            tile.alpha_composite(bg.crop((40, 36, 40 + cw - 2, 36 + ch - 2)))
            for k, side in enumerate(('front', 'back')):
                f = Image.open(os.path.join(SPRITES, 'mons', '%s_%s.png' % (sid, side))).convert('RGBA')
                tile.alpha_composite(f, (1 + k * 66, 1))
            ic = Image.open(os.path.join(SPRITES, 'mons', sid + '_icon.png')).convert('RGBA')
            tile.alpha_composite(ic, (cw - 2 - 34, ch - 2 - 16))
            im.alpha_composite(tile, (x, y))
            text5(im, x + 2, y + 64, sid.replace('_', ' '), (255, 255, 255, 255), (20, 20, 30, 255))
    return scale(im, 3)


def battle_mock(enemy, player):
    import preview as PV
    from common import scale
    n = lambda s: PROMPTS.get(s, {}).get('name', s).upper()[:12]
    scr = PV.battle_screen(enemy, player, n(enemy), n(player),
                           text=('What will', '%s do?' % n(player)))
    return scale(scr, 4)


def previews():
    from common import PREVIEW
    out = {}
    g = gallery()
    if g is not None:
        out['gallery'] = save(g, PREVIEW, 'creatures_gallery_3x.png')
    for lname, ids in lines():
        if lname.startswith('Singles'):
            continue
        mine = [i for i in ids if i in PROMPTS]
        enemy, player = mine[-1], mine[0]
        key = 'battle_c_%s_4x.png' % mine[0]
        out[key] = save(battle_mock(enemy, player), PREVIEW, key)
    return out


# notes per creature for docs/ART_CREATURES.md (design intent, known flaws)
NOTES = {
    'grok': 'raven + comet tail, star-map dots on wings; eye glint is the cyan/violet 3px',
    'proxy_mascot': 'the anchor design; every form keeps the white-gold fur, ears, forehead star, chart-arrow tail',
    'proxy_student': 'rosette medal, eyes re-painted (accents) so the too-still stare survives',
    'proxy_needle': 'UI bars grow through the fur; one eye is a mint "1" (accents). Roster brief mentions a pen-needle: not drawn (coordinator brief followed)',
    'proxy_ascendant': 'final form: ranking column runs to y=0 (off the top in spirit), mascot faces in column/body; face hand-repainted (_ascendant_face). Never catchable: back is a mirrored front',
    'claude_sonnet': 'ref spr_claude_fable: black coat, cream flame spine, lynx ruff/tufts (Haiku road); floating spirals mostly drop out at 64px',
    'gpt_5_5_thinking': 'ref spr_gpt_5_5: chin-on-paw, glyph-wheel halo, question-mark tail',
    'glm_plus': 'ref spr_glm: qilin, constellation graph on flanks, violet mane',
    'mistral_small': 'ref Mistral Medium source: same orange wind-fox, kit-sized',
    'llama_scout': 'scarf + glyph fleece; the infinity pendant is ~2px (no logo read)',
    'phi_mini': 'owlet with light-glasses and a rune book',
    'sgd': 'rolling pill-bug, wobbly noisy trail (thin trail mostly lost at 64px)',
    'momentum': 'ref sgd: leaning, rolling pangolin, arrows all forward; trail cropped (crop tune)',
    'sigmoid': 'regenerated: flat high head end on a ledge, flat low tail end, steep middle (a step curve, not a bump); v1 kept as mon_sigmoid_front_v1 (palette ref)',
    'tanh': 'ref sigmoid v1: symmetric coil around a zero ring, lavender/teal halves',
    'relu': 'ref tanh: hockey-stick lizard, flat grey tail, hard bend, lime rising edge',
    'perceptron': 'three antennae (inputs), one tail-light (output)',
    'mlp': 'ref perceptron: colony of beetles in rows; regenerated with fewer, larger beetles',
    'batchnorm': 'symmetric upright otter balancing equal pebbles; pond rings drop out at 64px',
    'dropout': 'square holes are real transparency (magenta pockets keyed out)',
    'residual': 'skip-connection arc nose-to-tail (1px cyan arc)',
    'softmax': 'tail fan of unequal feathers forming one full circle',
    'entropy': 'indigo/peach marbled cloud-cat with bit sparks',
    'n_gram': 'three-segment caterpillar with glyph segments',
    'word2vec': 'ref n_gram: moth with star-map wings and a cluster arrow',
    'embedding': 'ref word2vec: luna moth spirit with a point-cloud cube body',
    'glove': 'hedgehog with paired, thread-tied quills',
    'markov_chain': 'lemur hopping between three state stones with arrows',
    'inception': 'four-eyed chameleon (multi-scale), nested-ring tail',
    'adam': 'ref momentum: upright anteater-knight, per-scale glow, two moment rings',
    'adamw': 'ref adam: trimmed silver-edged armour, falling rune leaves (decay)',
    'gelu': 'ref relu: the hard corner smoothed, small dip below the ground line',
}


def doc_rows():
    """Markdown table rows of finished creatures for docs/ART_CREATURES.md."""
    rows = []
    for sid, spec in PROMPTS.items():
        f = os.path.join(SPRITES, 'mons', sid + '_front.png')
        if not os.path.exists(f):
            continue
        hasb = os.path.exists(raw(sid, 'back'))
        src = '`mon_%s_front`' % sid + (', `mon_%s_back`' % sid if hasb else '')
        ref = spec.get('ref') or spec.get('refpath') or ''
        rows.append('| `%s` | %s | %s | %s | %s | %s |' % (
            sid, spec.get('line', sid), src, ('`%s`' % ref) if ref else '-',
            'generated' if hasb else 'mirrored front', NOTES.get(sid, '')))
    return rows


def write_doc():
    import re
    roster = open(os.path.join(ROOT, 'docs', 'ROSTER.md')).read()
    ids = re.findall(r"^\| \d+ \| `(\w+)` \| (.*?) \|", roster, re.M)
    first = re.search(r"## First batch.*?\n\n(.*?)\n", roster, re.S)
    first = re.findall(r"`(\w+)`", first.group(1)) if first else []
    have = lambda s: os.path.exists(os.path.join(SPRITES, 'mons', s + '_front.png'))
    todo = [(i, n) for i, n in ids if not have(i)]
    old = [i for i, n in ids if have(i) and i not in PROMPTS]
    L = ['# Creature sprites: gallery index (ART-C)', '',
         'Every creature battle sprite: `public/assets/game/sprites/mons/<id>_front.png` (64x64, faces left,',
         'feet ~y=61), `_back.png` (64x64, player view), `_icon.png` (32x16 = two 16x16 frames, 1px bob).',
         'Contract and the first 16 sprites: `docs/ART_CATALOG_SPRITES.md`. Roster and visual briefs:',
         '`docs/ROSTER.md`.', '',
         '## How to continue', '',
         '1. Add the species to `PROMPTS` in `tools/art/sprites/mons2.py` (prompt from its ROSTER visual',
         '   brief; `ref`/`refpath` = the previous stage so lines evolve recognisably; `line` = gallery row)',
         '   and, for a new line, to `LINES`.',
         '2. Generate: `python3 tools/art/sprites/mons2.py --gen <id>` (front), check it, then',
         '   `python3 tools/art/sprites/mons2.py --gen <id> back` (uses the front as the reference).',
         '   ~40-70 s each on the owner\'s ChatGPT plan; at most 3 in parallel; cached in',
         '   `tools/art/gen/raw/mon_<id>_{front,back}.png`; `--force` regenerates.',
         '3. Build: `python3 tools/art/sprites/build.py` (everything) or `python3 tools/art/sprites/mons2.py [ids]`;',
         '   previews: `python3 tools/art/sprites/mons2.py --preview`; this file: `python3 tools/art/sprites/mons2.py --doc`.',
         '4. Look at `tools/art/sprites/preview/creatures_gallery_3x.png` and `battle_c_<line>_4x.png`; fix',
         '   with per-creature `TUNE` (box, crop, contrast, line_w, accents = eye/gem repaint, touch = pixel fixes).',
         '', 'Reduction (`reduce_mode`): each output pixel takes the dominant source colour of its block, with',
         'a contrast bonus so eyes and gems beat the surrounding fur; palette = farthest-point k-means',
         '(<=15 colours) so small accents keep their own colour; isolated noise pixels despeckled; dark',
         'outline re-inked. Very fine source detail (fur strokes, tiny faces) does not survive 64px: prompts',
         'for new creatures should ask for big simple shapes and a large face.', '',
         '## Done (set 2, %d creatures)' % len(doc_rows()), '',
         '| id | line | source generations | design ref | back | notes |',
         '| --- | --- | --- | --- | --- | --- |'] + doc_rows() + [
         '', '## Done earlier (set 1, `tools/art/sprites/mons.py`)', '',
         ', '.join('`%s`' % i for i in old), '',
         '## Still to draw (%d)' % len(todo), '',
         'First batch: ' + (', '.join('`%s`' % i for i in first if not have(i)) or 'none left'), '',
         ', '.join('`%s` (%s)' % (i, n) for i, n in todo), '']
    p = os.path.join(ROOT, 'docs', 'ART_CREATURES.md')
    open(p, 'w').write('\n'.join(L))
    return p


if __name__ == '__main__':
    args = sys.argv[1:]
    if args and args[0] == '--doc':
        print(write_doc())
        sys.exit()
    if args and args[0] == '--preview':
        print(previews())
        sys.exit()
    if args and args[0] == '--gen':
        force = '--force' in args
        rest = [a for a in args[1:] if a != '--force']
        sid = rest[0]
        side = rest[1] if len(rest) > 1 else 'front'
        print(gen(sid, side, force))
    else:
        print(sorted(build(args or None)))
