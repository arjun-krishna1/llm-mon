"""Overworld character sheets: chars/<id>.png, 48x96 (3 cols x 4 rows of 16x24).

Rows: down, up, left, right. Cols: stand, step-A, step-B.
Feet bottom (incl. outline) sits on y=21 of each 16x24 frame (2px above bottom).

Characters are composed from hand-drawn ASCII part templates:
  legs   (per leg style, direction, frame)
  torso  (per torso style, direction, frame)   -- arms swing per frame
  head   (base face per direction)
  hair   (per hairstyle per direction)         -- defines most of the silhouette
  extras (per-character overlays: headphones, glasses, apron, caps ...)
Every frame is outlined automatically (1px, palette OUTLINE) after compositing,
so templates only describe filled shapes plus a few explicit inner 'o' lines.

Symbols:
  . nothing   _ force-clear   o outline colour
  H h j  hair dark/mid/light         S s t  skin shade/mid/light
  C c d  top dark/mid/light          P p q  bottom dark/mid/light
  K k    shoes dark/mid              e      eye   w eye-glint / white
  A a b  accessory-1 dark/mid/light  X x y  accessory-2 dark/mid/light
  m      mouth / blush
"""
from PIL import Image

from common import P, OUT, new, outline, save, SPRITES, grid_to_image, put

W, H = 16, 24


def _rows(block):
    rows = [r for r in block.strip('\n').split('\n')]
    out = []
    for r in rows:
        r = r.split('|')[1] if '|' in r else r
        if len(r) < W:
            r = r + '.' * (W - len(r))
        assert len(r) == W, (len(r), r)
        out.append(r)
    return out


def T(block):
    return _rows(block)


# ---------------------------------------------------------------- heads ----
# Head templates start at head origin row 0 (kid: frame y=1, adult: y=0).
# Interior head rows r1..r10.
HEAD = {
    'down': T('''
|................
|....ssssssss....
|...ssssssssss...
|..ssssssssssss..
|..ssssssssssss..
|..ssssssssssss..
|..ssssssssssssS.
|..sswessssweSS..
|..sseEssssseES..
|..smsssMMsssmS..
|...sssssssssS...
'''.replace('|..ssssssssssssS.', '|..sssssssssssS..')
       .replace('|..sswessssweSS..', '|..sswessssweSS..')
       .replace('|..sseEssssseES..', '|..sseEsssseESS..')),
    'up': T('''
|................
|....ssssssss....
|...ssssssssss...
|..ssssssssssss..
|..ssssssssssss..
|..ssssssssssss..
|..ssssssssssss..
|..ssssssssssss..
|..ssssssssssss..
|..ssssssssssss..
|...SSSSSSSSSS...
'''),
    'left': T('''
|................
|.....ssssssss...
|....ssssssssss..
|...sssssssssss..
|...sssssssssss..
|...sssssssssss..
|...sssssssssss..
|...wesssssssss..
|..sEesssssssss..
|...Mmssssssss...
|....sssssssSS...
'''),
}

# ---------------------------------------------------------------- hair -----
HAIR = {}

# Player: dark, tousled, a few spikes, fringe swept to one side.
HAIR['messy'] = {
    'down': T('''
|.....h....h.....
|...hhhhhhhhhh...
|..hhjjhhhjjhhh..
|.hhjhhhhjhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhHhhhhHhhhHhh.
|.hhhh.hhhh.hhhh.
|.hh..........hh.
|.hh..........hh.
|..h..........h..
'''),
    'up': T('''
|.....h....h.....
|...hhhhhhhhhh...
|..hhjjhhhjjhhh..
|.hhjhhhhjhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|..hhhhhhhhhhhh..
|..hhh.hhhh.hhh..
'''),
    'left': T('''
|......h....h....
|....hhhhhhhhhh..
|...hjjhhhjjhhhh.
|..hjhhhhjhhhhhh.
|..hhhhhhhhhhhhh.
|..hhhhhhhhhhhhh.
|..h.hhh.hhhhhhh.
|........hhhhhhh.
|.........hhhhhh.
|.........hhhhh..
|..........hhh...
'''),
}

# Mom: shoulder-length warm brown hair with a soft side part.
HAIR['bob_long'] = {
    'down': T('''
|................
|....hhhhhhhh....
|...hhjjjhhhhh...
|..hhjjhhhhhhhh..
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhH______Hhhhh.
|.hh........H.hh.
|.hh..........hh.
|.hh..........hh.
|.hhh........hhh.
|.hhh........hhh.
|..hh........hh..
'''),
    'up': T('''
|................
|....hhhhhhhh....
|...hhjjjjhhhh...
|..hhjjhhhhhhhh..
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhHhhhhhhh.
|.hhhhhhHhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhHhhhhhhHhhh.
|.hhhhhhhhhhhhhh.
|..hhhhhhhhhhhh..
'''),
    'left': T('''
|................
|.....hhhhhhhh...
|....hjjjhhhhhh..
|...hjjhhhhhhhhh.
|..hhhhhhhhhhhhh.
|..hhhhhhhhhhhhh.
|...HH..hhhhhhhh.
|........hhhhhhh.
|........hhhhhhh.
|.........hhhhhh.
|.........hhhhhh.
|.........hhhhhh.
|..........hhhh..
'''),
}

# Prof: brown hair swept up and back, a bit wild at the back.
HAIR['swept'] = {
    'down': T('''
|...h.......h....
|..hhhhhhhhhhh...
|.hhjjjjhhhhhhh..
|.hhjhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhHHhhhhhhh.
|.hh__________hh.
|.hh..........hh.
|..h..........h..
'''),
    'up': T('''
|...h.......h....
|..hhhhhhhhhhh...
|.hhjjjjhhhhhhh..
|.hhjhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhHhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhHhhhhhhHhhh.
|.hhhhhhhhhhhhhh.
|..hhhhhhhhhhhh..
|...HHhhhhhhHH...
'''),
    'left': T('''
|..............h.
|...hhhhhhhhhhh..
|..hjjjjhhhhhhhh.
|..hjhhhhhhhhhhhh
|...hhhhhhhhhhhh.
|....hhhhhhhhhhh.
|.......hhhhhhhh.
|........hhhhhhh.
|.........hhhhh..
|.........hhhh...
'''),
}

# Aide: tidy blond bowl cut.
HAIR['bowl'] = {
    'down': T('''
|................
|....hhhhhhhh....
|...hhjjjjjjhh...
|..hhjjhhhhhhhh..
|..hhhhhhhhhhhh..
|.hhhhhhhhhhhhhh.
|.hHhhhhhhhhhhHh.
|.hh..........hh.
|.hh..........hh.
'''),
    'up': T('''
|................
|....hhhhhhhh....
|...hhjjjjjjhh...
|..hhjjhhhhhhhh..
|..hhhhhhhhhhhh..
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hHhhhhhhhhhhHh.
|..HHHHHHHHHHHH..
'''),
    'left': T('''
|................
|.....hhhhhhhh...
|....hjjjjjjhhh..
|...hjjhhhhhhhhh.
|...hhhhhhhhhhhh.
|..hhhhhhhhhhhhh.
|..hhHhhhhhhhhhh.
|........hhhhhhh.
|........hhhhhhh.
|.........HHHHH..
'''),
}

# Short neat hair (man / clerk base).
HAIR['short'] = {
    'down': T('''
|................
|....hhhhhhhh....
|...hhhjjjhhhh...
|..hhhjjhhhhhhh..
|..hhhhhhhhhhhh..
|..hhhhhhhhhhhh..
|..hhH__hhhhhhh..
|..h.........hh..
'''),
    'up': T('''
|................
|....hhhhhhhh....
|...hhhjjjhhhh...
|..hhhjjhhhhhhh..
|..hhhhhhhhhhhh..
|..hhhhhhhhhhhh..
|..hhhhhhhhhhhh..
|..hhhhhhhhhhhh..
|..hHhhhhhhhhHh..
|...HHHHHHHHHH...
'''),
    'left': T('''
|................
|.....hhhhhhhh...
|....hhjjjhhhhh..
|...hjjhhhhhhhh..
|...hhhhhhhhhhh..
|...hhhhhhhhhhh..
|...H...hhhhhhh..
|........hhhhhh..
|.........hhhhh..
|..........HHH...
'''),
}

# Long flowing hair to the shoulders and down the back (woman).
HAIR['long'] = {
    'down': T('''
|................
|....hhhhhhhh....
|...hhjjjjhhhh...
|..hhjjhhhhhhhh..
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhhH____Hhhhh.
|.hhh........hhh.
|.hhh........hhh.
|.hhh........hhh.
|.hhhh......hhhh.
|.hhhh......hhhh.
|.hhhh......hhhh.
|..hhh......hhh..
'''),
    'up': T('''
|................
|....hhhhhhhh....
|...hhjjjjhhhh...
|..hhjjhhhhhhhh..
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhHhhhhhhh.
|.hhhhhhHhhhhhhh.
|.hhhhhhhhhhhhhh.
|..hhhhhhhhhhhh..
|...hhhhhhhhhh...
|....hHhhhhHh....
'''),
    'left': T('''
|................
|.....hhhhhhhh...
|....hjjjjhhhhh..
|...hjjhhhhhhhhh.
|..hhhhhhhhhhhhh.
|..hhhhhhhhhhhhh.
|...HH..hhhhhhhh.
|.......hhhhhhhh.
|.......hhhhhhhh.
|........hhhhhhh.
|........hhhhhhh.
|........hhhhhhh.
|........hhhhhhh.
|.........hhhhhh.
|.........hhhhh..
|..........hhh...
'''),
}

# Pigtails (girl).
HAIR['pigtails'] = {
    'down': T('''
|................
|....hhhhhhhh....
|...hhjjjjhhhh...
|..hhjjhhhhhhhh..
|..hhhhhhhhhhhh..
|.hhhhhhhhhhhhhh.
|hhhH__hhhh__Hhhh
|hh.h........h.hh
|hh............hh
|hh............hh
|.h............h.
'''),
    'up': T('''
|................
|....hhhhhhhh....
|...hhjjjjhhhh...
|..hhjjhhhhhhhh..
|..hhhhhhhhhhhh..
|.hhhhhhhhhhhhhh.
|hhhhhhhHhhhhhhhh
|hhhhhhhHhhhhhhhh
|hh.hhhhhhhhhh.hh
|hh.hhhhhhhhhh.hh
|.h..HhhhhhhH..h.
'''),
    'left': T('''
|................
|.....hhhhhhhh...
|....hjjjjhhhhh..
|...hjjhhhhhhhhh.
|...hhhhhhhhhhhhh
|..hhhhhhhhhhhhhh
|...HH..hhhhhhhhh
|........hhhhhhhh
|.........hhhh.hh
|..........hh..hh
|...............h
'''),
}

# Elder: bald crown, grey tufts at the sides, big moustache.
HAIR['elder'] = {
    'down': T('''
|................
|................
|................
|................
|..h..........h..
|.hhh........hhh.
|.hhh........hhh.
|.hh..........hh.
|.hh..........hh.
|.....jjjjjj.....
|......hhhh......
'''),
    'up': T('''
|................
|................
|................
|................
|..h..........h..
|.hhh........hhh.
|.hhhh......hhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|..hhhhhhhhhhhh..
|...hhhhhhhhhh...
'''),
    'left': T('''
|................
|................
|................
|................
|...........hhh..
|..........hhhhh.
|.........hhhhhh.
|.........hhhhhh.
|..jjjj...hhhhh..
|...hh.....hhh...
'''),
}

# Bun (nurse): hair pulled back into a bun, small cap added as an extra.
HAIR['bun'] = {
    'down': T('''
|......hhhh......
|....hhhhhhhh....
|...hhjjjjhhhh...
|..hhjjhhhhhhhh..
|..hhhhhhhhhhhh..
|..hhhhhhhhhhhh..
|..hhH_____Hhhh..
|..h.........hh..
|..h..........h..
'''),
    'up': T('''
|......hhhh......
|....hhhjjhhh....
|...hhhhhhhhhh...
|..hhhjjhhhhhhh..
|..hhhhhhhhhhhh..
|..hhhhhhhhhhhh..
|..hhhhhhhhhhhh..
|..hhhhhhhhhhhh..
|..hhhhhhhhhhhh..
|...hhhhhhhhhh...
'''),
    'left': T('''
|..........hhh...
|.....hhhhhhhhh..
|....hjjjjhhhhhh.
|...hjjhhhhhhhhh.
|...hhhhhhhhhhh..
|...hhhhhhhhhhh..
|...HH..hhhhhhh..
|........hhhhhh..
|.........hhhh...
'''),
}

# Ponytail (clerk).
HAIR['ponytail'] = {
    'down': T('''
|................
|....hhhhhhhh....
|...hhhjjjjhhh...
|..hhhjhhhhhhhh..
|..hhhhhhhhhhhh..
|..hhhhhhhhhhhh..
|..hhhhH_Hhhhhh..
|..hh........hh..
|..h..........h..
'''),
    'up': T('''
|................
|....hhhhhhhh....
|...hhhjjjjhhh...
|..hhhjhhhhhhhh..
|..hhhhhhhhhhhh..
|..hhhhhhhhhhhh..
|..hhhhhAAhhhhh..
|..hhhhhhhhhhhh..
|..hhhhhhhhhhhh..
|...hhhhhhhhhh...
|......hhhh......
|......hhhh......
|.......hh.......
'''),
    'left': T('''
|................
|.....hhhhhhhh...
|....hhjjjjhhhh..
|...hjjhhhhhhhh..
|...hhhhhhhhhhhh.
|...hhhhhhhhhAhhh
|...HH..hhhhhhhhh
|........hhhhhh.h
|.........hhhh..h
|..........HH...h
'''),
}

# Short bob (trainer_f), with a beret extra.
HAIR['bob'] = {
    'down': T('''
|................
|....hhhhhhhh....
|...hhjjjjhhhh...
|..hhjjhhhhhhhh..
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhH________Hhh.
|.hh..........hh.
|.hh..........hh.
|.hhh........hhh.
|..hh........hh..
'''),
    'up': T('''
|................
|....hhhhhhhh....
|...hhjjjjhhhh...
|..hhjjhhhhhhhh..
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|..hHhhhhhhhhHh..
'''),
    'left': T('''
|................
|.....hhhhhhhh...
|....hjjjjhhhhh..
|...hjjhhhhhhhhh.
|..hhhhhhhhhhhhh.
|..hhhhhhhhhhhhh.
|...HH..hhhhhhhh.
|........hhhhhhh.
|........hhhhhhh.
|.........hhhhhh.
|..........hhhh..
'''),
}

# Spiky (trainer_m): big spikes, headband extra.
HAIR['spiky'] = {
    'down': T('''
|..h..h.hh.h..h..
|..hhhhhhhhhhhh..
|.hhhjjhhhjjhhhh.
|.hhjjhhhhhhjhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hh.H.hhh.H.hhh.
|.hh..........hh.
|h.h..........h.h
'''),
    'up': T('''
|..h..h.hh.h..h..
|..hhhhhhhhhhhh..
|.hhhjjhhhjjhhhh.
|.hhjjhhhhhhjhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|hhhHhhhhhhhhHhhh
|.hhhhhhhhhhhhhh.
|..hHhhhHhhhhHh..
'''),
    'left': T('''
|....h..h.h..h...
|...hhhhhhhhhhh.h
|..hhjjhhhjjhhhh.
|..hjjhhhhhhjhhhh
|..hhhhhhhhhhhhh.
|...hhhhhhhhhhhhh
|...h.h.hhhhhhhh.
|........hhhhhhhh
|.........hhhhhh.
|..........hhhh..
'''),
}

# Beanie hat covers the head; a little hair peeks out (techie).
HAIR['beanie'] = {
    'down': T('''
|.......aa.......
|....aaaaaaaa....
|...abbaaaaaaa...
|..abbaaaaaaaaa..
|..aaaaaaaaaaaa..
|..AAAAAAAAAAAA..
|..hhhh__hhhhhh..
|..h..........h..
'''),
    'up': T('''
|.......aa.......
|....aaaaaaaa....
|...abbaaaaaaa...
|..abbaaaaaaaaa..
|..aaaaaaaaaaaa..
|..AAAAAAAAAAAA..
|..hhhhhhhhhhhh..
|..hhhhhhhhhhhh..
|..hhhhhhhhhhhh..
|...hHhhhhhhHh...
'''),
    'left': T('''
|..........aa....
|.....aaaaaaaa...
|....abbaaaaaaa..
|...abbaaaaaaaa..
|...aaaaaaaaaaa..
|...AAAAAAAAAAA..
|....h..hhhhhhh..
|........hhhhhh..
|.........hhhhh..
'''),
}

# Cap (boy): cap with a forward brim; brim in accessory colour.
HAIR['cap'] = {
    'down': T('''
|................
|....aaaaaaaa....
|...abbbaaaaaa...
|..abbaaaaaaaaa..
|..aaaaaaaaaaaa..
|.AAAAAAAAAAAAAA.
|..hhhh____hhhh..
|..h..........h..
'''),
    'up': T('''
|................
|....aaaaaaaa....
|...aaaabbaaaa...
|..aaaabbaaaaaa..
|..aaaaaaaaaaaa..
|..AAAAAAAAAAAA..
|..hhhhhhhhhhhh..
|..hhhhhhhhhhhh..
|..hhhhhhhhhhhh..
|...HhhhhhhhhH...
'''),
    'left': T('''
|................
|.....aaaaaaaa...
|....abbbaaaaaa..
|...abbaaaaaaaa..
|...aaaaaaaaaaa..
|AAAAAAAAAAAAAa..
|....H..hhhhhhh..
|........hhhhhh..
|.........hhhhh..
'''),
}

# Rival Dana: short choppy auburn hair poking out of a white sports visor
# with a teal brim (accessory ramp: A brim, a band, b highlight).
HAIR['sporty'] = {
    'down': T('''
|...h.h....h.h...
|....hhhhhhhh....
|...hhjhhhhjhh...
|..abbaaaaaaaaa..
|.AAAAAAAAAAAAAA.
|..hhhh.hh.hhhh..
|..hh.h....h.hh..
|.hh..........hh.
|.hh..........hh.
|..h..........h..
'''),
    'up': T('''
|...h.h....h.h...
|....hhhhhhhh....
|...hhjhhhhjhh...
|..aaaaaAAaaaaa..
|..hhhhhhhhhhhh..
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|.hhhhhhhhhhhhhh.
|..hhhhhhhhhhhh..
|...hhh.hh.hhh...
'''),
    'left': T('''
|......h.h..h....
|.....hhhhhhhh...
|....hhjhhhhjhh..
|...abbaaaaaaaa..
|AAAAAAAhhhhhhhh.
|...hh.hhhhhhhhh.
|...h....hhhhhhh.
|.........hhhhhh.
|.........hhhhh..
|..........hhh...
'''),
}

# ---------------------------------------------------------------- torsos ---
# Torso templates are placed so their LAST row is frame y=16.
# 'kid' = 5 rows (y12..16), 'adult' = 6 rows (y11..16).
# Frame index: 0 stand, 1 step-A, 2 step-B.
TORSO = {}

TORSO['kid'] = {
    ('down', 0): T('''
|....cccccccc....
|..cccccccccccc..
|..cdccccccccCc..
|..sdccccccccCs..
|..s.pppppppp.s..
'''),
    ('down', 1): T('''
|....cccccccc....
|..cccccccccccc..
|..cdccccccccCs..
|..sdccccccccC...
|..s.pppppppp....
'''),
    ('down', 2): T('''
|....cccccccc....
|..cccccccccccc..
|..sdccccccccCc..
|...dccccccccCs..
|....pppppppp.s..
'''),
    ('up', 0): T('''
|....cccccccc....
|..cccccccccccc..
|..cCccccccccdc..
|..sCccccccccds..
|..s.pppppppp.s..
'''),
    ('up', 1): T('''
|....cccccccc....
|..cccccccccccc..
|..sCccccccccdc..
|...Cccccccccds..
|....pppppppp.s..
'''),
    ('up', 2): T('''
|....cccccccc....
|..cccccccccccc..
|..cCccccccccds..
|..sCccccccccd...
|..s.pppppppp....
'''),
    ('left', 0): T('''
|.....cccccc.....
|.....cdddcc.....
|.....cdddcC.....
|.....cssdcC.....
|.....pppppp.....
'''),
    ('left', 1): T('''
|.....cccccc.....
|....ddddccc.....
|...ssdd.ccC.....
|........ccC.....
|.....pppppp.....
'''),
    ('left', 2): T('''
|.....cccccc.....
|.....cccdddd....
|.....cccC.dss...
|.....cccC.......
|.....pppppp.....
'''),
}

TORSO['adult'] = {
    ('down', 0): T('''
|....cccccccc....
|..cccccccccccc..
|..cdccccccccCc..
|..cdccccccccCc..
|..sdccccccccCs..
|..s.pppppppp.s..
'''),
    ('down', 1): T('''
|....cccccccc....
|..cccccccccccc..
|..cdccccccccCc..
|..cdccccccccCs..
|..sdccccccccC...
|..s.pppppppp....
'''),
    ('down', 2): T('''
|....cccccccc....
|..cccccccccccc..
|..cdccccccccCc..
|..sdccccccccCc..
|...dccccccccCs..
|....pppppppp.s..
'''),
    ('up', 0): T('''
|....cccccccc....
|..cccccccccccc..
|..cCccccccccdc..
|..cCccccccccdc..
|..sCccccccccds..
|..s.pppppppp.s..
'''),
    ('up', 1): T('''
|....cccccccc....
|..cccccccccccc..
|..cCccccccccdc..
|..sCccccccccdc..
|...Cccccccccds..
|....pppppppp.s..
'''),
    ('up', 2): T('''
|....cccccccc....
|..cccccccccccc..
|..cCccccccccdc..
|..cCccccccccds..
|..sCccccccccd...
|..s.pppppppp....
'''),
    ('left', 0): T('''
|.....cccccc.....
|.....cdddcc.....
|.....cdddcC.....
|.....cdddcC.....
|.....cssdcC.....
|.....pppppp.....
'''),
    ('left', 1): T('''
|.....cccccc.....
|.....cdddcc.....
|....ddddccC.....
|...ssdd.ccC.....
|........ccC.....
|.....pppppp.....
'''),
    ('left', 2): T('''
|.....cccccc.....
|.....ccddcc.....
|.....cccddddC...
|.....cccC.dss...
|.....cccC.......
|.....pppppp.....
'''),
}

# Lab coat: white coat 'a' open over a shirt 'c'; hem continues in LEGS['coat'].
TORSO['coat'] = {
    ('down', 0): T('''
|....aaaccaaa....
|..aaaaaccaaaaa..
|..abaaaccaaaAa..
|..abaaaccaaaAa..
|..sbaaaccaaaAs..
|..s.aaappaaa.s..
'''),
    ('down', 1): T('''
|....aaaccaaa....
|..aaaaaccaaaaa..
|..abaaaccaaaAa..
|..abaaaccaaaAs..
|..sbaaaccaaaA...
|..s.aaappaaa....
'''),
    ('down', 2): T('''
|....aaaccaaa....
|..aaaaaccaaaaa..
|..abaaaccaaaAa..
|..sbaaaccaaaAa..
|...baaaccaaaAs..
|....aaappaaa.s..
'''),
    ('up', 0): T('''
|....aaaaaaaa....
|..aaaaaaaaaaaa..
|..aAaaaaaaaaba..
|..aAaaaaaaaaba..
|..sAaaaaaaaabs..
|..s.aaaaaaaa.s..
'''),
    ('up', 1): T('''
|....aaaaaaaa....
|..aaaaaaaaaaaa..
|..aAaaaaaaaaba..
|..sAaaaaaaaaba..
|...Aaaaaaaaabs..
|....aaaaaaaa.s..
'''),
    ('up', 2): T('''
|....aaaaaaaa....
|..aaaaaaaaaaaa..
|..aAaaaaaaaaba..
|..aAaaaaaaaabs..
|..sAaaaaaaaab...
|..s.aaaaaaaa....
'''),
    ('left', 0): T('''
|.....caaaaa.....
|.....cbbbaa.....
|.....cbbbaA.....
|.....abbbaA.....
|.....assbaA.....
|.....aaaaaA.....
'''),
    ('left', 1): T('''
|.....caaaaa.....
|.....cbbbaa.....
|....bbbbaaA.....
|...ssbb.aaA.....
|.....aaaaaA.....
|.....aaaaaA.....
'''),
    ('left', 2): T('''
|.....caaaaa.....
|.....cabbaa.....
|.....aaabbbbA...
|.....aaaA.bss...
|.....aaaA.......
|.....aaaaaA.....
'''),
}

# ---------------------------------------------------------------- legs -----
# Leg templates: rows y17..y20.
LEGS = {}
LEGS['pants'] = {
    ('down', 0): T('''
|....pppppppp....
|....ppp..ppp....
|....pPp..pPp....
|....kkk..kkk....
'''),
    ('down', 1): T('''
|....pppppppp....
|....ppp..ppp....
|....pPp..kkk....
|....kkk.........
'''),
    ('down', 2): T('''
|....pppppppp....
|....ppp..ppp....
|....kkk..pPp....
|.........kkk....
'''),
    ('left', 0): T('''
|.....pppppp.....
|......pppP......
|......pppP......
|.....kkkkK......
'''),
    ('left', 1): T('''
|.....pppppp.....
|....ppp..PPP....
|...ppp....PPP...
|...kkK.....kkK..
'''),
    ('left', 2): T('''
|.....pppppp.....
|....PPP..ppp....
|...PPP....ppp...
|...kkK.....kkK..
'''),
}
LEGS['shorts'] = {
    ('down', 0): T('''
|....pppppppp....
|....ppp..ppp....
|....sss..sss....
|....kkk..kkk....
'''),
    ('down', 1): T('''
|....pppppppp....
|....ppp..ppp....
|....sSs..kkk....
|....kkk.........
'''),
    ('down', 2): T('''
|....pppppppp....
|....ppp..ppp....
|....kkk..sSs....
|.........kkk....
'''),
    ('left', 0): T('''
|.....pppppp.....
|......pppP......
|......sssS......
|.....kkkkK......
'''),
    ('left', 1): T('''
|.....pppppp.....
|....ppp..PPP....
|...sss....SSS...
|...kkK.....kkK..
'''),
    ('left', 2): T('''
|.....pppppp.....
|....PPP..ppp....
|...SSS....sss...
|...kkK.....kkK..
'''),
}
LEGS['skirt'] = {
    ('down', 0): T('''
|...pppppppppp...
|...pPpppppPpp...
|.....ss..ss.....
|....kkk..kkk....
'''),
    ('down', 1): T('''
|...pppppppppp...
|...pPpppppPpp...
|.....ss..kkk....
|....kkk.........
'''),
    ('down', 2): T('''
|...pppppppppp...
|...pPpppppPpp...
|....kkk..ss.....
|.........kkk....
'''),
    ('left', 0): T('''
|....ppppppp.....
|....pppppPp.....
|......ssS.......
|.....kkkK.......
'''),
    ('left', 1): T('''
|....ppppppp.....
|...ppppppPPp....
|....ss....SS....
|...kkK.....kkK..
'''),
    ('left', 2): T('''
|....ppppppp.....
|...ppppppPPp....
|....SS....ss....
|...kkK.....kkK..
'''),
}
# long skirt / dress to the ankles
LEGS['dress'] = {
    ('down', 0): T('''
|...pppppppppp...
|...pPppppppPp...
|..ppPppppppPpp..
|....kkk..kkk....
'''),
    ('down', 1): T('''
|...pppppppppp...
|...pPppppppPp...
|..ppPppppppPpp..
|....kkk.........
'''),
    ('down', 2): T('''
|...pppppppppp...
|...pPppppppPp...
|..ppPppppppPpp..
|.........kkk....
'''),
    ('left', 0): T('''
|....ppppppp.....
|....pppppPp.....
|...pppppppPp....
|.....kkkK.......
'''),
    ('left', 1): T('''
|....ppppppp.....
|...ppppppPPp....
|...pppppppPPp...
|...kkK.....kK...
'''),
    ('left', 2): T('''
|....ppppppp.....
|...ppppppPPp....
|..pppppppPPp....
|..kkK.....kkK...
'''),
}
# lab coat hem over trousers
LEGS['coat'] = {
    ('down', 0): T('''
|....aaapPaaa....
|....aAp..pAa....
|....pPp..pPp....
|....kkk..kkk....
'''),
    ('down', 1): T('''
|....aaapPaaa....
|....aAp..pAa....
|....pPp..kkk....
|....kkk.........
'''),
    ('down', 2): T('''
|....aaapPaaa....
|....aAp..pAa....
|....kkk..pPp....
|.........kkk....
'''),
    ('left', 0): T('''
|.....aaaaaaA....
|......pppPaA....
|......pppP......
|.....kkkkK......
'''),
    ('left', 1): T('''
|.....aaaaaaA....
|....ppp..PPaA...
|...ppp....PPP...
|...kkK.....kkK..
'''),
    ('left', 2): T('''
|.....aaaaaaA....
|....PPP..ppaA...
|...PPP....ppp...
|...kkK.....kkK..
'''),
}


def legs_for(style, d, f):
    tbl = LEGS[style]
    if d == 'up':
        # back view: same as front but no shading on the inner trouser side.
        return tbl[('down', f)]
    return tbl[(d, f)]


# ----------------------------------------------------------- composition ---

def blank():
    return [['.'] * W for _ in range(H)]


def stamp(g, rows, y0, x0=0):
    for dy, row in enumerate(rows):
        y = y0 + dy
        if not 0 <= y < H:
            continue
        for dx, ch in enumerate(row):
            x = x0 + dx
            if not 0 <= x < W or ch == '.':
                continue
            g[y][x] = '.' if ch == '_' else ch


def stamp_masked(g, rows, y0, only_on):
    """Stamp only where the existing grid already has one of `only_on`."""
    for dy, row in enumerate(rows):
        y = y0 + dy
        if not 0 <= y < H:
            continue
        for x, ch in enumerate(row):
            if ch == '.' or not 0 <= x < W:
                continue
            if g[y][x] in only_on:
                g[y][x] = ch


class Char:
    def __init__(self, cid, hair, hairc, top, bottom, shoes=None, skin=None,
                 body='kid', legs='pants', acc=None, acc2=None, extras=None,
                 eye=None, head_dy=0, cmap=None):
        self.cid = cid
        self.hair = hair
        self.body = body
        self.legs = legs
        self.extras = extras or {}
        self.head_dy = head_dy
        skin = skin or P.SKIN
        shoes = shoes or [P.CLOTH_DARK[0], P.CLOTH_DARK[1]]
        acc = acc or P.CLOTH_DARK
        acc2 = acc2 or P.METAL
        self.cmap = {
            'o': OUT,
            'H': hairc[0], 'h': hairc[1], 'j': hairc[2],
            'S': skin[1], 's': skin[2], 't': skin[3], 'm': P.CLOTH_PINK[2],
            'e': P.HAIR_DARK[0], 'w': P.WHITE[3], 'E': eye or P.CLOTH_DARK[1],
            'M': skin[0],
            'C': top[0], 'c': top[1], 'd': top[2],
            'P': bottom[0], 'p': bottom[1], 'q': bottom[-1],
            'K': shoes[0], 'k': shoes[1],
            'A': acc[0], 'a': acc[1], 'b': acc[2] if len(acc) > 2 else acc[1],
            'X': acc2[0], 'x': acc2[1], 'y': acc2[2] if len(acc2) > 2 else acc2[1],
        }
        self.cmap.update(cmap or {})

    def frame_grid(self, d, f):
        src_d = 'left' if d == 'right' else d
        g = blank()
        adult = self.body in ('adult', 'coat')
        head_y = (0 if adult else 1) + self.head_dy
        # legs
        stamp(g, legs_for(self.legs, src_d, f), 17)
        # torso (last row lands on y=16)
        trows = TORSO[self.body][(src_d, f)]
        stamp(g, trows, 17 - len(trows))
        # head + hair
        stamp(g, HEAD[src_d], head_y)
        hair = HAIR[self.hair][src_d]
        if src_d == 'up':
            # isolated dark specks read as dots/eyes on the back of the head
            hair = [''.join('h' if (c == 'H' and 0 < i < len(r) - 1 and r[i - 1] in 'hj'
                                    and r[i + 1] in 'hj') else c for i, c in enumerate(r))
                    for r in hair]
        stamp(g, hair, head_y)
        self.shade_hair(g, src_d, head_y)
        # per-character extras: dict (dir, frame|None) -> (y0, rows, mode)
        for key in ((src_d, None), (src_d, f)):
            for ex in self.extras.get(key, []):
                y0, rows = ex[0], ex[1]
                mode = ex[2] if len(ex) > 2 else 'over'
                yy = y0 + (head_y if (len(ex) > 3 and ex[3] == 'head') else 0)
                if mode == 'over':
                    stamp(g, rows, yy)
                else:
                    stamp_masked(g, rows, yy, mode)
        return g

    @staticmethod
    def shade_hair(g, d, head_y):
        """Automatic 3-tone hair: light rim on the top-left, shadow on the
        right/bottom edges (light comes from the top-left)."""
        HAIRS = 'hHj'
        src = [row[:] for row in g]
        xs = [x for y in range(H) for x in range(W) if src[y][x] in HAIRS]
        if not xs:
            return
        xmin, xmax = min(xs), max(xs)
        for y in range(H):
            for x in range(W):
                if src[y][x] != 'h':
                    continue
                up = src[y - 1][x] if y else '.'
                left = src[y][x - 1] if x else '.'
                right = src[y][x + 1] if x < W - 1 else '.'
                down = src[y + 1][x] if y < H - 1 else '.'
                if (up == '.' or left == '.') and y <= head_y + 4 and x < (xmin + xmax) / 2 + 2:
                    g[y][x] = 'j'
                elif right == '.' and x > (xmin + xmax) / 2:
                    g[y][x] = 'H'
                elif down not in HAIRS and down != '.' and y > head_y + 3:
                    g[y][x] = 'H'
                elif d == 'up' and down == '.':
                    g[y][x] = 'H'

    def frame(self, d, f):
        g = self.frame_grid(d, f)
        rows = [''.join(r) for r in g]
        im = new(W, H)
        px = im.load()
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch != '.':
                    px[x, y] = self.cmap[ch]
        im = outline(im)
        if f in (1, 2):
            # 1px bob on the passing/step frames (stand -> A -> stand -> B)
            bob = new(W, H)
            bob.paste(im.crop((0, 1, W, H)), (0, 0))
            im = bob
        if d == 'right':
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        return im

    def sheet(self):
        sh = new(W * 3, H * 4)
        for r, d in enumerate(('down', 'up', 'left', 'right')):
            for c in range(3):
                sh.paste(self.frame(d, c), (c * W, r * H))
        return sh


# --------------------------------------------------------------- extras ----
def E(*items):
    return list(items)


# Headphones around the neck (player): band across the collar, cups at sides.
PLAYER_EXTRAS = {
    ('down', None): E((12, T('''
|....XyxxxxyX....
|....XX....XX....
'''))),
    ('up', None): E((12, T('''
|...XxxxxxxxxX...
'''))),
    ('left', None): E((12, T('''
|.....yXxxxx.....
|.....XX.........
'''))),
    # hood + drawstrings
}
PLAYER_EXTRAS[('down', None)].append((14, T('''
|.......dd.......
|.......wd.......
'''), 'cCd'))
PLAYER_EXTRAS[('up', None)].append((13, T('''
|.....CccccC.....
|......CCCC......
'''), 'cCd'))
# pocket on the hoodie front
PLAYER_EXTRAS[('down', None)].append((16, T('''
|.....CCCCCC.....
'''), 'p'))

GLASSES_DOWN = (7, T('''
|...xxxxxxxxxx...
|....yeyy.yeyy...
'''), 'over', 'head')
GLASSES_LEFT = (7, T('''
|..xxxx..........
|..yeyy..........
'''), 'over', 'head')


def glasses(extras):
    extras.setdefault(('down', None), []).append(
        (7, T('''
|...xwexxxxwex...
|...x..x..x..x...
'''), 'over', 'head'))
    extras.setdefault(('left', None), []).append(
        (7, T('''
|..xwexxxx.......
|..x..x..........
'''), 'over', 'head'))
    return extras


def apron(extras, adult=True):
    y = 12 if adult else 13
    extras.setdefault(('down', None), []).append((y, T('''
|.....aaaaaa.....
|.....aaaaaa.....
|.....abbbba.....
|.....aaaaaa.....
|....aaaaaaaa....
|....aAaaaaAa....
'''), 'cdCpPs'))
    extras.setdefault(('left', None), []).append((y, T('''
|....aa..........
|....aa..........
|....ab..........
|....aa..........
|...aaa..........
|...aA...........
'''), 'cdCpPs.'))
    extras.setdefault(('up', None), []).append((y + 1, T('''
|.......AA.......
'''), 'cC'))
    return extras


CHARS = {}


def define():
    C = {}
    C['player'] = Char('player', 'messy', P.HAIR_DARK, P.CLOTH_ORANGE, P.CLOTH_BLUE,
                       shoes=[P.CLOTH_RED[0], P.CLOTH_RED[1]],
                       acc2=[P.ROOF_TEAL[1], P.CLOTH_DARK[1], P.ROOF_TEAL[3]],
                       body='kid', legs='pants', extras=dict(PLAYER_EXTRAS))
    C['mom'] = Char('mom', 'bob_long', P.HAIR_BROWN, P.CLOTH_GREEN, P.CLOTH_YELLOW,
                    body='adult', legs='dress', acc=P.WHITE,
                    extras=apron({}, True))
    C['prof'] = Char('prof', 'swept', P.HAIR_BROWN, P.CLOTH_GREEN, P.CLOTH_DARK,
                     body='coat', legs='coat', acc=P.WHITE[1:], acc2=[P.METAL[0], P.METAL[2], P.GLASS[3]],
                     extras=glasses({}))
    C['aide'] = Char('aide', 'bowl', P.HAIR_BLOND, P.CLOTH_BLUE, P.ROCK[:3],
                     body='coat', legs='coat', acc=P.WHITE[1:])
    C['boy'] = Char('boy', 'cap', P.HAIR_BROWN, P.CLOTH_YELLOW, P.CLOTH_BLUE,
                    body='kid', legs='shorts', acc=P.CLOTH_GREEN)
    C['girl'] = Char('girl', 'pigtails', P.HAIR_BLOND, P.CLOTH_PINK, P.CLOTH_VIOLET,
                     body='kid', legs='skirt')
    C['man'] = Char('man', 'short', P.HAIR_BROWN, P.CLOTH_GREEN, P.TRUNK,
                    body='adult', legs='pants', skin=P.SKIN_DEEP)
    C['woman'] = Char('woman', 'long', P.HAIR_DARK, P.CLOTH_RED, P.CLOTH_RED,
                      body='adult', legs='dress')
    C['elder'] = Char('elder', 'elder', P.HAIR_GREY, P.WOOD[:3], P.CLOTH_DARK,
                      body='adult', legs='pants', skin=P.SKIN)
    C['techie'] = Char('techie', 'beanie', P.HAIR_DARK, P.CLOTH_DARK, P.CLOTH_BLUE,
                       body='adult', legs='pants', acc=P.CLOTH_GREEN,
                       acc2=[P.METAL[0], P.METAL[2], P.GLASS[3]], skin=P.SKIN_DEEP, extras=glasses({}))
    C['nurse'] = Char('nurse', 'bun', P.HAIR_BROWN, P.ROOF_TEAL, P.ROOF_TEAL,
                      body='adult', legs='dress', acc=P.WHITE[1:],
                      extras={('down', None): [(0, T('''
|.....aaaaaa.....
|.....abbbba.....
'''), 'over', 'head')],
                              ('up', None): [(0, T('''
|.....aaaaaa.....
|.....aaaaaa.....
'''), 'over', 'head')],
                              ('left', None): [(0, T('''
|......aaaaaa....
|......abbbba....
'''), 'over', 'head')]})
    C['clerk'] = Char('clerk', 'ponytail', P.HAIR_DARK, P.CLOTH_YELLOW, P.CLOTH_DARK,
                      body='adult', legs='pants', acc=P.CLOTH_VIOLET,
                      extras=apron({}, True))
    C['trainer_m'] = Char('trainer_m', 'spiky', P.HAIR_BLOND, P.CLOTH_RED, P.CLOTH_DARK,
                          body='kid', legs='shorts')
    C['trainer_f'] = Char('trainer_f', 'bob', P.HAIR_BROWN, P.CLOTH_BLUE, P.WHITE,
                          body='kid', legs='skirt', acc=P.CLOTH_RED,
                          extras={('down', None): [(0, T('''
|....aaaaaaa.....
|...abbaaaaaa....
|...AAAAAAAAa....
'''), 'over', 'head')],
                                  ('up', None): [(0, T('''
|.....aaaaaaa....
|....aaaaaaaaa...
|....AAAAAAAAa...
'''), 'over', 'head')],
                                  ('left', None): [(0, T('''
|......aaaaaaa...
|.....abbaaaaaa..
|.....AAAAAAAAaa.
'''), 'over', 'head')]})
    auburn = [P.HAIR_BROWN[0], P.ROOF_ORANGE[0], P.ROOF_ORANGE[1]]
    C['rival'] = Char('rival', 'sporty', auburn, P.ROOF_TEAL[:3], P.CLOTH_DARK,
                      shoes=[P.WHITE[0], P.WHITE[2]], body='kid', legs='pants',
                      acc=[P.ROOF_TEAL[1], P.WHITE[2], P.WHITE[3]],
                      extras={('down', None): [(12, T('''
|......dwwd......
|.......ww.......
|.......ww.......
|.......ww.......
'''), 'cdC')],
                              ('up', None): [(13, T('''
|......CCCC......
'''), 'cdC')],
                              ('left', None): [(12, T('''
|.....dd.........
'''), 'cdC')]})
    return C


def build():
    chars = define()
    out = {}
    for cid, ch in chars.items():
        sh = ch.sheet()
        save(sh, SPRITES, 'chars', cid + '.png')
        out[cid] = sh
    rs = player_run_sheet()
    save(rs, SPRITES, 'chars', 'player_run.png')
    out['player_run'] = rs
    hs = hound_sheet()
    save(hs, SPRITES, 'chars', 'hallucihound.png')
    out['hallucihound'] = hs
    return out



# ------------------------------------------------------------ HalluciHound --
# Overworld quadruped for the Route 101 rescue cutscene. Same 48x96 sheet
# layout as the people. Reads as a near-black glitch hound: dark slate fur,
# magenta glitch streaks, red/magenta eye glow, only a small cream muzzle/brow
# accent; stray magenta "glitch pixels" change every frame (flicker).
HOUND_CM = {
    'B': P.CLOTH_DARK[0], 'b': P.CLOTH_DARK[1], 'n': P.CLOTH_DARK[2],
    'm': P.WALL_CREAM[2], 'M': P.WALL_CREAM[0],
    'r': P.HP_RED[1], 'R': P.CLOTH_PINK[1],
    'g': P.CLOTH_PINK[1], 'G': P.CLOTH_PINK[0], 'w': P.WHITE[2], 'o': OUT,
}

HOUND_DOWN = T('''
|..b..........b..
|..bb........bb..
|..bnb.gGGg.bbb..
|..bnbbbbbbbbbb..
|.bnbbbbbbbbbbbb.
|.bbrRbbbbbbRrbb.
|gbbbbmbbbbmbbbbG
|.bbbbbbmmbbbbbb.
|Gbbbbbmoombbbbbg
|.bBbbbwbbwbbbBb.
|.bbgGbbbbbbbbbb.
|..bbbbbbbbGgbb..
''')
HOUND_UP = T('''
|..b..........b..
|..bb........bb..
|..bnb......bbb..
|..bnbbbbbbbbbb..
|.bnbbbbbbbbbbbb.
|.bbbbbbgGbbbbbb.
|gbbbbbbbgbbbbbbG
|.bbbbbbgGbbbbbb.
|.bnbbbgbbbbbbbb.
|.bbbbbbGgbbbbbB.
|.bbgbbbbgbbbBbb.
|..bbbbbbbbbbbb..
''')
# side view, facing left, rows y6..y14 (legs drawn below)
HOUND_SIDE = T('''
|....b.b.........
|...bbbbb........
|..bnbbbbb.....g.
|..bbrRbbb....gG.
|.mmbbbbbbb...gb.
|.wMbbbbbbbbbbbbG
|...bnbbbbbbbbbbB
|...bbgGbbbbbbbbB
|...bbbbbbbbGgbB.
|....bbbbbbbbbbB.
''')
SIDE_LEGS = [(3, True), (6, False), (10, True), (13, False)]  # near=2px, far=1px


def _leg(g, x, swing, near):
    for i, y in enumerate(range(15, 21)):
        xx = x + round(swing * i / 5)
        cells = ((0, 'n'), (1, 'b')) if near else ((0, 'B'),)
        for dx, cc in cells:
            if 0 <= xx + dx < W:
                g[y][xx + dx] = cc
    if near and 0 <= x + swing < W:
        g[20][x + swing] = 'w'


# stray glitch pixels per frame (drawn after outlining, unoutlined)
GLITCH = {
    'down': [((0, 9), (15, 14), (4, 3)), ((15, 8), (1, 15), (11, 3)), ((0, 13), (14, 5), (9, 2))],
    'up': [((0, 9), (15, 13), (7, 3)), ((15, 7), (0, 15), (8, 2)), ((1, 12), (14, 4), (6, 2))],
    'left': [((15, 7), (1, 13), (12, 4)), ((14, 5), (0, 15), (15, 11)), ((15, 9), (2, 7), (11, 3))],
}


def hound_frame(d, f):
    g = blank()
    src = 'left' if d == 'right' else d
    if src == 'left':
        stamp(g, HOUND_SIDE, 5)
        sw = {0: None, 1: (-2, 2), 2: (2, -2)}[f]
        for near_pass in (False, True):
            for x, near in SIDE_LEGS:
                if near != near_pass:
                    continue
                if sw is None:
                    s = {3: 0, 6: -1, 10: 1, 13: 1}[x]
                else:
                    front = x < 8
                    pair_a = (front and near) or (not front and not near)
                    s = sw[0] if pair_a else sw[1]
                _leg(g, x, s, near)
        if f:
            g[7][14], g[8][15] = ('G', 'g') if f == 1 else ('g', 'G')
            g[6][14] = '.' if f == 1 else 'g'
    else:
        stamp(g, HOUND_DOWN if src == 'down' else HOUND_UP, 4)
        lift = {0: (0, 0), 1: (1, 0), 2: (0, 1)}[f]
        for i, x in enumerate((2, 12)):
            up = lift[i]
            for y in range(16, 21 - up):
                g[y][x] = 'n' if i == 0 else 'b'
                g[y][x + 1] = 'b' if i == 0 else 'B'
            g[20 - up][x] = 'w' if src == 'down' else 'B'
            g[20 - up][x + 1] = 'w' if src == 'down' else 'B'
        for x in (5, 10):
            for y in (18, 19, 20):
                g[y][x] = 'B'
    rows = [''.join(r) for r in g]
    im = grid_to_image(rows, HOUND_CM, W, H)
    im = outline(im)
    for i, (x, y) in enumerate(GLITCH[src][f]):
        put(im, x, y, HOUND_CM['g'] if i != 1 else HOUND_CM['R'])
    if f in (1, 2):
        b2 = new(W, H)
        b2.paste(im.crop((0, 1, W, H)), (0, 0))
        im = b2
    if d == 'right':
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    return im


def hound_sheet():
    sh = new(W * 3, H * 4)
    for r, d in enumerate(('down', 'up', 'left', 'right')):
        for c in range(3):
            sh.paste(hound_frame(d, c), (c * W, r * H))
    return sh


# ------------------------------------------------------------ player run ---
# chars/player_run.png: same 48x96 layout; lean-forward body, bigger stride,
# arms pumping. Col 0 = passing pose, cols 1/2 = full strides.
LEGS['run'] = {
    ('down', 0): T('''
|....pppppppp....
|....ppp..ppp....
|....pPp..pPp....
|....kkk..kkk....
'''),
    ('down', 1): T('''
|....pppppppp....
|....ppp..kkk....
|....pPp.........
|....kkk.........
'''),
    ('down', 2): T('''
|....pppppppp....
|....kkk..ppp....
|.........pPp....
|.........kkk....
'''),
    ('left', 0): T('''
|.....pppppp.....
|.....pppPPP.....
|......pp..PKk...
|.....kkK........
'''),
    ('left', 1): T('''
|....ppppppp.....
|...ppp...PPP....
|..ppp......PPk..
|.kkK.........K..
'''),
    ('left', 2): T('''
|....ppppppp.....
|...PPP...ppp....
|..PPP......ppk..
|.kkK.........k..
'''),
}
TORSO['kid_run'] = {
    ('down', 0): TORSO['kid'][('down', 0)],
    ('down', 1): T('''
|....cccccccc....
|..scccccccccc...
|..sdcccccccccC..
|...dccccccccCs..
|....pppppppp.s..
'''),
    ('down', 2): T('''
|....cccccccc....
|...cccccccccs...
|..dcccccccccCs..
|..sdccccccccC...
|..s.pppppppp....
'''),
    ('left', 0): T('''
|....cccccc......
|....cdddcc......
|....csdddcC.....
|.....ccsscC.....
|.....pppppp.....
'''),
    ('left', 1): T('''
|....cccccc......
|..ssdddcccCC....
|....dd.ccccCs...
|.......cccC.....
|.....pppppp.....
'''),
    ('left', 2): T('''
|....cccccc......
|..CCcccddddss...
|..s.ccccdd......
|.....cccC.......
|.....pppppp.....
'''),
}
TORSO['kid_run'][('up', 0)] = TORSO['kid'][('up', 0)]
TORSO['kid_run'][('up', 1)] = [r[::-1] for r in TORSO['kid_run'][('down', 2)]]
TORSO['kid_run'][('up', 2)] = [r[::-1] for r in TORSO['kid_run'][('down', 1)]]


class RunChar(Char):
    """Running variant: lean the head 1px forward on side views."""

    def frame_grid(self, d, f):
        g = super().frame_grid(d, f)
        src_d = 'left' if d == 'right' else d
        if src_d == 'left':
            # shift everything above the waist (y<=13) one pixel forward
            for y in range(0, 14):
                g[y] = g[y][1:] + ['.']
        return g


def player_run_sheet():
    base = define()['player']
    rc = RunChar('player_run', 'messy', P.HAIR_DARK, P.CLOTH_ORANGE, P.CLOTH_BLUE,
                 shoes=[P.CLOTH_RED[0], P.CLOTH_RED[1]],
                 acc2=[P.ROOF_TEAL[1], P.CLOTH_DARK[1], P.ROOF_TEAL[3]],
                 body='kid_run', legs='run', extras=dict(PLAYER_EXTRAS))
    return rc.sheet()


if __name__ == '__main__':
    build()
