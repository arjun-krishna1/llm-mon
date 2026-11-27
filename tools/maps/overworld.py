"""The ONE seamless outdoor map: SoMa Node (north) / Route 101 / Hayes Valley (south).

The ASCII below is the ground + detail truth; buildings/stamps are letters at
their top-left with '#' over the rest of their footprint. Objects are placed in
`objects()` by coordinates (x = column in the full 44-wide rows, y = row).

Legend
  .  grass            ,  calm grass         T  forest wall (2x3 lattice, rows odd..odd, cols even..odd)
  =  path             %  path under a stamp ~  water           "  tall grass
  v  down-ledge       ^  steps through a ledge
  r y w p  flowers    b  bush   o  rock     m  mailbox   s  wooden sign
  f  wood fence       F  white fence        g  wood fence on path
  #  stamp footprint  H house_orange  N house_blue  L lab  C model_center  M token_mart
  G gym  D shed  S sign_town  t tree  Y tree_b  B rock_big  n bench  l lamp (post cell; head above)
  Q fountain  R signal_tower  *  water + lilypad  |  reeds  q flowering bush  u stump  P planter  x crate
  City: _ pavement (- under a stamp)  + plaza inlay  Z crosswalk  j bollard  @ planter  ! streetlight (post)
        ? kiosk (post)  W bike rack  $ bench  O fountain (all on pavement)  h hedge
        A apartment  K cafe  E house_green  V billboard
"""
from mapdsl import MapDef

W = 44
PAD = 'TTTTTTTT'

LEGEND = {
    '.': 'grass', ',': 'calm', 'T': 'forest', '=': ('area', 'path'), '%': ('area', 'path'),
    '~': ('area', 'water'), ':': ('area', 'sand'), '"': 'tall', 'v': 'ledge', '^': ('tile', 'steps', 'ground'),
    'r': ('tile', 'flower_red'), 'y': ('tile', 'flower_yellow'), 'w': ('tile', 'flower_white'),
    'p': ('tile', 'flower_pink'), 'b': ('tile', 'bush'), 'o': ('tile', 'rock'), 'm': ('tile', 'mailbox'),
    's': ('tile', 'sign_wood'), 'f': ('fence', 'wood'), 'F': ('fence', 'white'),
    'g': ('multi', ('area', 'path'), ('fence', 'wood')),
    '#': 'calm', 'H': ('stamp', 'house_orange'), 'N': ('stamp', 'house_blue'), 'L': ('stamp', 'lab'),
    'C': ('stamp', 'model_center'), 'M': ('stamp', 'token_mart'), 'G': ('stamp', 'gym'), 'D': ('stamp', 'shed'),
    'S': ('stamp', 'sign_town'), 't': ('stamp', 'tree'), 'B': ('stamp', 'rock_big'), 'n': ('stamp', 'bench'),
    'l': ('stamp', 'lamp', 0, -1), 'Y': ('stamp', 'tree_b'), 'Q': ('stamp', 'fountain'), 'R': ('stamp', 'signal_tower'),
    '*': ('multi', ('area', 'water'), ('tile', 'lilypad', 'detail')), '|': ('tile', 'reeds'),
    'q': ('tile', 'bush_flower'), 'u': ('tile', 'stump'), 'P': ('tile', 'planter'), 'x': ('tile', 'crate'),
    # SoMa city kit (pavement never touches dirt path: keep a grass cell between them)
    '_': ('area', 'pavement'), '-': ('area', 'pavement'), 'h': ('fence', 'hedge'),
    '+': ('multi', ('area', 'pavement'), ('tile', 'plaza_inlay', 'ground')),
    'Z': ('multi', ('area', 'pavement'), ('tile', 'crosswalk', 'ground')),
    'j': ('multi', ('area', 'pavement'), ('tile', 'bollard')),
    '@': ('multi', ('area', 'pavement'), ('tile', 'planter')),
    '!': ('multi', ('area', 'pavement'), ('stamp', 'streetlight_modern', 0, -1)),
    '?': ('multi', ('area', 'pavement'), ('stamp', 'kiosk', 0, -1)),
    'W': ('multi', ('area', 'pavement'), ('stamp', 'bike_rack')),
    '$': ('multi', ('area', 'pavement'), ('stamp', 'bench')),
    'O': ('multi', ('area', 'pavement'), ('stamp', 'fountain')),
    'A': ('stamp', 'apartment'), 'K': ('stamp', 'cafe'), 'E': ('stamp', 'house_green'), 'V': ('stamp', 'billboard'),
}

# Interior columns x=8..35 (28 chars); PAD forest is added on both sides.
SOMA = [
    # rows 0-8: forest, the closed road north
    *['TTTTTTTTTTTT.==.TTTTTTTTTTTT'] * 9,
    'TTTTTTTTTTTTfggfTTTTTTTTTTTT',  # 9  road-closed fence
    '.G######K####..s......A#####',  # 10 gym / cafe / end sign / apartment
    '.############___......######',  # 11
    '.############___C###########',  # 12 model center
    '.############__!############',  # 13
    '.############___############',  # 14
    '.############___############',  # 15
    '.############__!############',  # 16 cafe door x18
    '.#######________############',  # 17 gym door x12 / center doors
    '.____________ZZ_______######',  # 18 main street / apartment doors x32-33
    '.____________ZZ____________.',  # 19
    '..E####.____________.M####..',  # 20 soma_house (green) / plaza / mart
    '..#####._____+__W-__.#####..',  # 21 bike rack
    '..#####._?______$___.#####..',  # 22 kiosk / bench
    '..#####.!___O--____!.#####..',  # 23 fountain
    '..#####._@__---__@__.#####..',  # 24
    '..#####.____---_____.#####..',  # 25
    '..#####._j________j_.#####..',  # 26 house door x12 / mart door x31
    '...._________+__________....',  # 27
    '........____________........',  # 28
    'TTTTTThh____________hhTTTTTT',  # 29 south square
    'TTTTTTh,V##______,n#,hTTTTTT',  # 30 billboard
    'TTTTTThr###!____!,yr,hTTTTTT',  # 31
    'TTTTTTh,y,,______,P,,hTTTTTT',  # 32
    'TTTTTThhhS#______hhhhhTTTTTT',  # 33 town sign
    'TTTTTThhh##,,,,,,hhhhhTTTTTT',  # 34 hedge gate: grass between paving and the dirt road
]

ROUTE = [
    *['TTTTTTTTTTTT.==.TTTTTTTTTTTT'] * 3,  # 35-37
    'TTTTTTTTTTTT.==s.y......TTTT',  # 38 north sign
    'TTTTTTTTTTTT.==.........TTTT',  # 39 Benchmarker Tiana at x24, looking west
    'TTTTTTTTTTTT.==....b....TTTT',  # 40
    'TTTTTTTTTTTT.==..r....b.TTTT',  # 41
    'TT..y........=======""""..TT',  # 42
    'TT...........=======""""..TT',  # 43 prompt orb at x33
    'TT.r....o.........==""""b.TT',  # 44
    'TT................==""""..TT',  # 45
    'TT..p.....w.......==.~~~..TT',  # 46
    'TT............TT..==.~~~~.TT',  # 47 separator starts
    'TTvvvvvvvvvvvvTT====.~~~~.TT',  # 48 ledge 1
    'TTTTTT........TT==...~~~~~TT',  # 49 hidden patch at x21
    'TTTTTT.""""...TT==...~~~~.TT',  # 50 angler at x28
    'TTTTTT.""""".rTT==...~~~~.TT',  # 51
    'TT...""""""...TT==....~~..TT',  # 52
    'TT..r"""""....TT==........TT',  # 53
    'TT....""".....TT==..r.....TT',  # 54 Young Founder Calvin at x33, looking west
    'TTb......o....TT==......o.TT',  # 55
    'TTvvvvvvvvvvvvTT==........TT',  # 56 ledge 2
    'TT............TT==........TT',  # 57
    'TT."""""........======....TT',  # 58 gap to terrace 2
    'TT."""""............==....TT',  # 59
    'TT..""""..y.........==..y.TT',  # 60
    'TT...""..........r..==....TT',  # 61 researcher at x17
    'TT..................==.t#.TT',  # 62
    'TT...r....t#..TT....==.##.TT',  # 63
    'TT........##..TT....==.##.TT',  # 64
    'TT........##..TT..y.==....TT',  # 65 patch at x10
    'TTvvvvvvvvvvvv......==....TT',  # 66 ledge 3
    'TTTTTT.......r......==TTTTTT',  # 67
    'TTTTTT..y...........==TTTTTT',  # 68
    'TTTTTTTT""""""""""""""TTTTTT',  # 69 tall grass you must cross
    'TTTTTTTT""""""""""""""TTTTTT',  # 70
    'TTTTTTTT"""b""""""""TTTTTTTT',  # 71
    'TTTTTT"""""""""o""""TTTTTTTT',  # 72
    'TTTTTT."""""""""""""TTTTTTTT',  # 73
    'TTTTTT"......==......"TTTTTT',  # 74 rescue clearing
    'TTTTTT.....y.==...TTTTTTTTTT',  # 75
    'TTTTTT..r....==...TTTTTTTTTT',  # 76
    'TTTTTT.......==...TTTTTTTTTT',  # 77
    'TTTTTT..y....==....w..TTTTTT',  # 78
    'TTTTTTTTTT...==..B#...TTTTTT',  # 79
    'TTTTTTTTTT...==..##.r.TTTTTT',  # 80
    'TTTTTTTTTTp..==.......TTTTTT',  # 81
    'TTTTTTTTTT...==...y...TTTTTT',  # 82
    'TTTTTTTTTT...==.......TTTTTT',  # 83
    'TTTTTT.....s.==....o..TTTTTT',  # 84 south sign
    *['TTTTTTTTTTTT.==.TTTTTTTTTTTT'] * 5,  # 85-89 mouth (rescue trigger at 86)
]

HAYES = [
    'TT........S#.==...........TT',  # 90 town sign
    'TT.H####..##.==..L######..TT',  # 91 player house / lab
    'TT.#####.....==..#######..TT',  # 92
    'TT.#####.yr..==..#######..TT',  # 93
    'TT.#####.....==..#######.bTT',  # 94
    'TT.#####.....==..#######..TT',  # 95 (truck prop parks on the drive below)
    'TT.#####%%%..==.....=.....TT',  # 96
    'TT.#####%%%..==.....=.....TT',  # 97 house door x13
    'TT...=m.===..==.....=.....TT',  # 98 mailbox
    'TTo======================.TT',  # 99 street
    'TT.======================.TT',  # 100
    'TT..N####....==.FFF..FFF..TT',  # 101 neighbour house / garden
    'TT..#####....==.Fr....yF..TT',  # 102
    'TT..#####....==.F|~~~*.F..TT',  # 103
    'TT..#####....==.Fp~*~~.F..TT',  # 104
    'TT..#####....==.F.~~~.|F..TT',  # 105
    'TT..#####.y..==.Fy...n#F..TT',  # 106
    'TT..#####....==.FFFFFFFF..TT',  # 107
    'TTb.r.=========..w.y..r.b.TT',  # 108 lane
    *['TTTTTTTTTTTTTTTTTTTTTTTTTTTT'] * 8,  # 109-116
]


# Per-cell edits applied after the blocks are stacked: (x, y, char).
EDITS = [
    (30, 48, '*'), (31, 50, '*'), (31, 52, '*'), (32, 52, '|'), (28, 46, '|'),   # Route 101 pond dressing
    (18, 53, 'R'), (19, 53, '#'), (18, 54, '#'), (19, 54, '#'), (18, 55, '#'), (19, 55, '#'),  # relay mast landmark
    (31, 62, 'Y'),
]
# Rescue pocket (Route 101 south): full rows x=14..29 (between the TTTTTT side walls).
POCKET = {74: '."""""""""""""".', 75: 'TT""".y...""TTTT', 76: 'TT"".....r."TTTT', 77: 'TT".o.......TTTT', 78: 'TT.w.====.B#""..', 79: 'TTTT.====.##""".', 80: 'TTTTp====.."""""', 81: 'TTTT...==.."""".', 82: 'TTTTu..==...""..', 83: 'TTTT.y.==.r.""..'}


def rows():
    out = []
    for block in (SOMA, ROUTE, HAYES):
        for r in block:
            if len(r) != 28:
                raise ValueError('overworld row %d has %d chars: %r' % (len(out), len(r), r))
            out.append(PAD + r + PAD)
    for y, chunk in POCKET.items():
        r = out[y]
        out[y] = r[:14] + chunk + r[30:]
    for x, y, ch in EDITS:
        out[y] = out[y][:x] + ch + out[y][x + 1:]
    return out


def build():
    R = rows()
    m = MapDef('overworld', W, len(R), tilesets=['exterior'],
               props={'name': 'HAYES VALLEY', 'music': 'hayes_valley', 'onEnter': 'overworld.enter'})
    m.paint(R, LEGEND, scatter=35)
    objects(m)
    return m


def objects(m):
    H = m.h
    # ---------------------------------------------------------------- zones
    m.zone(0, 0, W, 37, 'SOMA NODE', music='soma_node')
    m.zone(0, 37, W, 49, 'ROUTE 101', music='route_101', encounters='route_101')
    m.zone(0, 86, W, H - 86, 'HAYES VALLEY', music='hayes_valley')

    # ---------------------------------------------------------------- Hayes Valley
    m.spawn('arrival', 21, 98, facing='left')
    m.door(13, 97, 'home_1f', 'entrance', 'home_door')
    m.door(28, 95, 'lab', 'entrance', 'lab_door')
    m.door(14, 107, 'neighbor', 'entrance', 'neighbor_door')
    m.spawn('lab_front', 28, 96, facing='down')
    m.spawn('route_mouth', 21, 83, facing='up')
    m.sign(18, 91, script='hayes.town_sign')
    m.sign(19, 91, script='hayes.town_sign')
    m.sign(14, 98, script='hayes.mailbox')
    # Mythos Movers truck: parked on the drive at new game, drives off during the arrival
    m.prop('truck', 16, 96, 'fx/truck', w=3, h=2, hideIfFlag='arrived', script='hayes.truck')
    m.npc('hv_boy', 20, 93, 'boy', script='hayes.boy', facing='down', movement='look')
    m.npc('hv_mover', 19, 97, 'man', script='hayes.mover', facing='right', hideIfFlag='arrived')
    m.npc('hv_woman', 18, 104, 'woman', script='hayes.woman', facing='down', movement='wander', radius=2)
    m.npc('hv_elder', 25, 102, 'elder', script='hayes.elder', facing='right', movement='look')
    m.npc('hv_girl', 30, 100, 'girl', script='hayes.girl', facing='left', movement='wander', radius=3)
    m.npc('hv_techie', 31, 97, 'techie', script='hayes.techie', facing='up')
    # Mom waits outside the lab with the Fast Tokens (after the PromptDex)
    m.trigger(26, 96, 5, 2, 'hayes.mom_fast_tokens', ifFlag='got_dex', unlessFlag='has_run')
    # The route mouth: the rescue cutscene (nothing else stops you going north)
    m.trigger(20, 86, 4, 1, 'route.rescue', unlessFlag='rescue_done')

    # ---------------------------------------------------------------- Route 101
    m.sign(19, 84, script='route.sign_south', anySide=True)
    m.sign(23, 38, script='route.sign_north')
    m.npc('rt_tiana', 24, 39, 'trainer_f', facing='left', sight=4,
          trainer='route_101_b')
    m.npc('rt_calvin', 33, 54, 'trainer_m', facing='left', sight=9,
          trainer='route_101_a')
    m.npc('rt_elder', 28, 50, 'elder', script='route.angler', facing='right')
    m.npc('rt_techie', 17, 61, 'techie', script='route.grass_researcher', facing='down', movement='look')
    m.npc('rt_girl', 25, 83, 'girl', script='route.picnic_girl', facing='left', movement='look',
          showIfFlag='rescue_done')
    m.item(33, 43, 'prompt_orb', 'item_route_prompt_orb')
    m.item(21, 49, 'patch', 'item_route_hidden_patch', hidden=True)
    m.item(10, 65, 'patch', 'item_route_patch')
    m.item(29, 79, 'debugger', 'item_route_debugger')
    m.sign(18, 82, script='route.field_notes', anySide=True)   # on the stump itself
    m.tile('detail2', 19, 82, 'notes', tileset='props')
    m.tile('detail2', 18, 83, 'notes', tileset='props')
    m.npc('rt_hiker', 31, 57, 'man', script='route.hiker', facing='left', movement='look')

    # ---------------------------------------------------------------- SoMa Node
    m.door(26, 17, 'center', 'entrance', 'center_door')
    m.warp(27, 17, 'center', 'entrance', facing='up')
    m.door(31, 26, 'mart', 'entrance', 'mart_door')
    m.door(12, 26, 'soma_house', 'entrance', 'soma_house_door')
    m.spawn('soma_south', 21, 33, facing='up')
    m.sign(12, 17, script='soma.gym_door')
    m.block(12, 17)
    for x in (32, 33):
        m.sign(x, 18, script='soma.apartment')
        m.block(x, 18)
    m.sign(18, 16, script='soma.cafe')
    m.block(18, 16)
    m.sign(17, 22, script='soma.kiosk', anySide=True)
    for x in (16, 17, 18):
        m.sign(x, 31, script='soma.billboard', anySide=True)
    m.sign(23, 10, script='soma.end_sign')
    m.sign(17, 34, script='soma.town_sign', anySide=True)
    m.sign(18, 34, script='soma.town_sign', anySide=True)
    m.sign(21, 9, script='soma.road_closed')
    m.npc('sn_guard', 22, 10, 'man', script='soma.guard', facing='down')
    # stepping away from the closed road after hearing about it rolls the end card (once)
    m.trigger(21, 12, 3, 1, 'soma.end', ifFlag='heard_road_closed', unlessFlag='saw_end_card')
    # rival Dana: meets you outside your house, ambushes you at the north end of Route 101
    m.trigger(12, 98, 1, 1, 'rival.intro', ifFlag='mom_lab_call', unlessFlag='met_rival')
    m.trigger(13, 99, 1, 1, 'rival.intro', ifFlag='mom_lab_call', unlessFlag='met_rival')
    m.trigger(20, 36, 4, 1, 'rival.ambush', ifFlag='rival_starter', unlessFlag='rival_beaten')
    m.npc('sn_girl', 16, 19, 'girl', script='soma.girl', facing='down', movement='wander', radius=2)
    m.npc('sn_techie', 23, 15, 'techie', script='soma.techie', facing='left')
    m.npc('sn_woman', 26, 21, 'woman', script='soma.woman', facing='left', movement='look')
    m.npc('sn_elder', 16, 24, 'elder', script='soma.elder', facing='right', movement='look')
    m.npc('sn_man', 14, 27, 'man', script='soma.man', facing='right', movement='wander', radius=2)
    m.npc('sn_boy', 27, 31, 'boy', script='soma.boy', facing='down', movement='wander', radius=2)
    for x in (20, 21, 22):
        m.sign(x, 25, script='soma.fountain')
