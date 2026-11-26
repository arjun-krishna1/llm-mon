"""Source-art prompts for the generated (hero) exterior objects.

    python3 tools/art/tiles_exterior/gen_sources.py [name ...] [--force]

Results are cached in tools/art/gen/raw/ext_*.png; build.py only reads the
cache and never calls the generator. Runs at most 3 generations at once.
"""
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.dirname(HERE)
RAW = os.path.join(ART, 'gen', 'raw')
REF_HOUSE = os.path.join(RAW, 'ext_house_orange.png')

VIEW = ("Top-down 3/4 view exactly as in a GBA-era RPG overworld: the front wall faces the viewer "
        "and the roof is seen from above at an angle; symmetrical, centred, whole building visible. ")
FOOT = "Footprint {w} tiles wide by {h} tiles tall, where one tile is exactly one door-width. "

PROMPTS = {
    # ext_house_orange: lead's accepted test house (player house), copied in.
    'ext_house_blue': (VIEW + FOOT.format(w=5, h=5) +
        "A cosy two-storey family house in exactly the same style, scale and construction as the "
        "reference house, but with a BLUE tiled roof (no chimney on the right; a small round attic "
        "window instead), cream walls with white timber trim, flower boxes with red flowers under "
        "the two ground-floor windows, a single wooden door centred on the bottom edge.", [REF_HOUSE]),
    'ext_lab': (VIEW + FOOT.format(w=7, h=5) +
        "A wide, low, modern research laboratory, same pixel style as the reference: a flat-ish "
        "slate-grey roof seen from above with a row of three glass skylight panels and a small white "
        "satellite dish on the right of the roof, clean white walls with a teal stripe, a long band "
        "of large blue glass windows, a glass double sliding door centred on the bottom edge with a "
        "small teal panel above it, light grey stone foundation.", [REF_HOUSE]),
    'ext_center': (VIEW + FOOT.format(w=6, h=5) +
        "A public healing centre where trainers rest their creatures, same pixel style as the "
        "reference: bright TEAL tiled roof; centred on the front of the roof a large white square "
        "sign plate showing a teal microchip icon (square chip with little pins) with a white plus "
        "sign in its middle; white walls with teal trim; a wide glass automatic sliding double door "
        "centred on the bottom edge; a window on each side. Nothing red, no ball logo.", [REF_HOUSE]),
    'ext_mart': (VIEW + FOOT.format(w=5, h=5) +
        "A small corner shop, same pixel style as the reference: VIOLET tiled roof; above the door a "
        "round gold coin sign with a bold letter T embossed on it; cream walls; a striped violet and "
        "white awning over a big shop window full of goods on the left; a glass shop door centred on "
        "the bottom edge.", [REF_HOUSE]),
    'ext_gym': (VIEW + FOOT.format(w=7, h=6) +
        "A sturdy town arena building, same pixel style as the reference: deep red-brown tiled "
        "roof with a triangular stone pediment carrying a round gold emblem of a stylised brain "
        "circuit; light grey stone block walls with two white columns either side of the entrance; "
        "a big wooden double door centred on the bottom edge that is boarded shut with two wooden "
        "planks nailed across in an X; tall narrow windows.", [REF_HOUSE]),
    'ext_shed': (VIEW + FOOT.format(w=3, h=3) +
        "A small wooden garden tool shed, same pixel style as the reference: corrugated slate-grey "
        "metal roof, warm brown vertical plank walls, one small wooden door centred on the bottom "
        "edge, a tiny window.", [REF_HOUSE]),
    'ext_tree': ("A single round leafy deciduous tree for a GBA-era RPG overworld, seen from the front "
        "at a slight top-down angle, exactly 2 tiles wide and 3 tiles tall: a big round lumpy canopy "
        "made of several rounded leaf clusters, each cluster lit on its top-left with lighter green "
        "highlights and darker green underneath, dark green outline; a short brown trunk with two "
        "small roots at the bottom centre. Canopy as wide as the whole image.", []),
    'ext_bush': ("A single small round leafy shrub for a GBA-era RPG overworld, 1 tile wide and 1 tile "
        "tall, seen from the front at a slight top-down angle: a dome of rounded leaf clumps, bright "
        "green lit on the top-left, darker green underneath, dark green outline, flat bottom.", []),
    'ext_rock': ("A single grey boulder for a GBA-era RPG overworld, 1 tile wide and 1 tile tall, seen "
        "from the front at a slight top-down angle: rounded chunky rock with two facets, light grey "
        "top-left, darker grey lower right, a small crack, dark outline, flat bottom.", []),
    'ext_signpost': ("A single small wooden signpost for a GBA-era RPG overworld, 1 tile wide and 1 tile "
        "tall, seen from the front: one wide rectangular light-wood plank board with a darker wood "
        "frame on one thick short post, the board face blank with a few faint wood-grain lines, no "
        "text.", []),
    'ext_townsign': ("A single wide town welcome sign for a GBA-era RPG overworld, 2 tiles wide and 1.5 "
        "tiles tall, seen from the front: a wide cream-painted board with a green wooden frame and a "
        "small green roof cap, standing on two short wooden posts, blank face, no text.", []),
    'ext_mailbox': ("A single small mailbox on a short wooden post for a GBA-era RPG overworld, 1 tile "
        "wide and 1 tile tall, seen from the front at a slight angle: rounded-top metal box painted "
        "warm red with a little yellow flag raised on its side.", []),
    'ext_lamp': ("A single street lamp for a GBA-era RPG overworld, 1 tile wide and 2 tiles tall, seen "
        "from the front: slim dark green iron post with a small decorative base, topped by a square "
        "lantern with warm yellow glowing glass panes and a little pointed cap.", []),
    'ext_bench': ("A single park bench for a GBA-era RPG overworld, 2 tiles wide and 1 tile tall, seen "
        "from the front at a slight top-down angle: three warm wooden slats for the seat and a "
        "backrest, dark iron legs and armrests.", []),
}


def run(name, force):
    prompt, refs = PROMPTS[name]
    cmd = [sys.executable, os.path.join(ART, 'gen', 'imagegen.py'), name, prompt]
    for r in refs:
        cmd += ['--ref', r]
    if force:
        cmd.append('--force')
    r = subprocess.run(cmd, capture_output=True, text=True)
    return name, r.returncode, (r.stdout + r.stderr)[-400:]


if __name__ == '__main__':
    force = '--force' in sys.argv
    names = [a for a in sys.argv[1:] if not a.startswith('--')] or list(PROMPTS)
    with ThreadPoolExecutor(3) as ex:
        for name, rc, out in ex.map(lambda n: run(n, force), names):
            print(name, rc, out.strip())
