"""Interior maps. Each room is a shell (wall faces on rows 0-1, floor, rims) +
furniture stamps from interior.catalog.json + objects.

Room coordinates: row 0/1 wall face, last row = front rim, column 0 / last = rims.
A `wall` stamp is placed with its top row on wall row 1; `wall_face` decor on rows 0-1.
"""
from mapdsl import MapDef, h32


def room(id, w, h, theme, floor, music, name, seed=1):
    m = MapDef(id, w, h, tilesets=['interior'], props={'music': music, 'indoor': True, 'name': name})
    ts, first = m.ts('interior')
    wl = ts.cat['walls'][theme]
    tiles = ts.cat['tiles']

    def g(x, y, tid):
        m.set('ground', x, y, first + tid)
    for x in range(w):
        g(x, 0, wl['u'])
        g(x, 1, wl['l'])
        g(x, h - 1, wl['rim_b'])
    g(1, 0, wl['u_left'])
    g(1, 1, wl['l_left'])
    g(w - 2, 0, wl['u_right'])
    g(w - 2, 1, wl['l_right'])
    for y in range(h):
        g(0, y, wl['rim_l'])
        g(w - 1, y, wl['rim_r'])
    g(0, 0, wl['rim_tl'])
    g(w - 1, 0, wl['rim_tr'])
    g(0, h - 1, wl['rim_bl'])
    g(w - 1, h - 1, wl['rim_br'])
    alt = 'floor_%s_alt' % floor
    for y in range(2, h - 1):
        for x in range(1, w - 1):
            nm = 'floor_%s' % floor
            if alt in tiles and h32(x, y, seed) % 2 == 0:
                nm = alt
            if y == 2:
                nm += '_shadow'
            g(x, y, tiles[nm])
    m.theme = theme
    return m


def exit_mat(m, x, mat, to_spawn, width=1):
    """Exit mat on the bottom floor row + rim gap + warp back outside + 'entrance' spawn."""
    ts, first = m.ts('interior')
    wl = ts.cat['walls'][m.theme]
    y = m.h - 2
    names = [mat] if width == 1 else [mat + '_l', mat + '_r']
    for i, nm in enumerate(names):
        m.tile('detail', x + i, y, nm)
        m.set('ground', x + i, m.h - 1, first + wl['rim_door_gap'])
        m.warp(x + i, y, 'overworld', to_spawn, facing='down', sfx='exit')
    m.spawn('entrance', x, y, facing='up')


def rug(m, name, x, y, w, h, layer='detail'):
    ts, first = m.ts('interior')
    a = ts.cat['autotiles'][name]
    for yy in range(h):
        for xx in range(w):
            v = 'n' if yy == 0 else 's' if yy == h - 1 else ''
            hz = 'w' if xx == 0 else 'e' if xx == w - 1 else ''
            m.set(layer, x + xx, y + yy, first + a[(v + hz) or 'c'])


def counter(m, kind, x0, x1, y, register_at=None):
    ts, first = m.ts('interior')
    a = ts.cat['autotiles']['counter_' + kind]
    for x in range(x0, x1 + 1):
        part = 's' if x0 == x1 else 'l' if x == x0 else 'r' if x == x1 else 'm'
        top = a[part + '_top']
        if register_at == x and 'm_top_register' in a:
            top = a['m_top_register']
        m.set('over', x, y - 1, first + top)
        m.set('detail', x, y, first + a[part])


def signs(m, cells, script):
    for (x, y) in cells:
        m.sign(x, y, script=script, anySide=True)


# ----------------------------------------------------------------------------- rooms
def home_1f():
    m = room('home_1f', 13, 10, 'home', 'wood_a', 'home', 'HOME', seed=3)
    S = m.stamp
    S('stairs_up', 10, 0)
    S('fridge', 1, 1)
    S('kitchen_counter', 2, 1)
    S('kitchen_sink', 3, 1)
    S('kitchen_stove', 4, 1)
    S('window', 5, 0)
    S('clock', 7, 0)
    S('tv', 7, 1)
    S('console', 8, 3)
    rug(m, 'rug_red', 6, 4, 4, 3)
    S('cushion', 7, 5, base='detail2')
    S('table', 2, 4)
    S('chair_s', 2, 3)
    S('chair_s', 3, 3)
    S('chair_n', 2, 6)
    S('chair_n', 3, 6)
    S('plant', 11, 6)
    S('plant', 1, 7)
    S('boxes', 11, 3)
    S('boxes', 5, 7)
    exit_mat(m, 6, 'mat_exit_green', 'home_door')
    m.warp(10, 1, 'home_2f', 'stairs', facing='down', sfx='stairs')
    m.warp(11, 1, 'home_2f', 'stairs', facing='down', sfx='stairs')
    m.spawn('stairs', 10, 2, facing='down')
    m.npc('mom', 4, 5, 'mom', script='home.mom', facing='left')
    # the phone rings on your first steps after the arrival: heading for the stairs
    # (every route to them passes 9..10,3) or back out of the door (cells round the mat)
    for (x, y, w, h) in ((9, 3, 2, 1), (6, 6, 2, 2), (5, 6, 1, 1), (5, 8, 1, 1), (7, 8, 1, 1)):
        m.trigger(x, y, w, h, 'home.mom_lab_call', ifFlag='arrived', unlessFlag='mom_lab_call')
    signs(m, [(7, 2), (8, 2)], 'home.tv')
    signs(m, [(8, 3)], 'home.console')
    signs(m, [(1, 2)], 'home.fridge')
    signs(m, [(4, 2)], 'home.kitchen')
    signs(m, [(11, 3), (5, 7)], 'home.boxes')
    signs(m, [(2, 4), (3, 4), (2, 5)], 'home.table')
    return m


def home_2f():
    m = room('home_2f', 11, 9, 'bedroom', 'wood_a', 'home', 'HOME 2F', seed=5)
    S = m.stamp
    S('stairs_down', 8, 2)
    S('window', 1, 0)
    S('bed_wide', 1, 2)
    S('desk_pc', 3, 1)
    S('bookshelf', 5, 1)
    S('clock', 7, 0)
    S('poster', 9, 0)
    rug(m, 'rug_blue', 3, 4, 4, 3)
    S('cushion', 5, 5, base='detail2')
    S('plant', 9, 5)
    S('bin', 7, 2)
    S('boxes', 1, 7)
    S('boxes', 2, 7)
    m.warp(8, 3, 'home_1f', 'stairs', facing='down', sfx='stairs')
    m.warp(9, 3, 'home_1f', 'stairs', facing='down', sfx='stairs')
    m.spawn('stairs', 8, 4, facing='left')
    m.props['onEnter'] = 'home.enter_2f'
    signs(m, [(3, 2)], 'home.pc')
    signs(m, [(4, 2)], 'home.notebook')
    signs(m, [(1, 3), (2, 3)], 'home.bed')
    signs(m, [(5, 2), (6, 2)], 'home.bookshelf')
    signs(m, [(1, 7), (2, 7)], 'home.boxes_2f')
    signs(m, [(7, 2)], 'home.bin')
    return m


def neighbor():
    m = room('neighbor', 11, 9, 'neighbor', 'wood_b', 'home', 'NEIGHBOUR', seed=13)
    S = m.stamp
    rug(m, 'rug_violet', 3, 4, 5, 2)
    S('window_green', 1, 0)
    S('bookshelf', 4, 1)
    S('clock', 6, 0)
    S('door_inner', 7, 0)
    S('fridge', 9, 1)
    S('bed_wide_pink', 1, 2)
    S('stool', 6, 3)
    S('plant', 9, 5)
    S('cushion', 5, 4, base='detail2')
    S('bin', 1, 6)
    exit_mat(m, 5, 'mat_exit_red', 'neighbor_door')
    m.npc('nb_mom', 7, 4, 'woman', script='neighbor.mom', facing='left')
    m.npc('nb_milo', 4, 5, 'boy', script='neighbor.milo', facing='up', movement='look')
    signs(m, [(4, 2), (5, 2)], 'neighbor.bookshelf')
    signs(m, [(9, 2)], 'neighbor.fridge')
    signs(m, [(1, 3), (2, 3)], 'neighbor.bed')
    return m


def lab():
    m = room('lab', 14, 11, 'lab', 'lab', 'lab', 'LAB', seed=7)
    S = m.stamp
    S('lab_shelf', 1, 1)
    S('lab_shelf', 3, 1)
    S('whiteboard', 5, 0)
    S('lab_console', 7, 1)
    S('window_blue', 9, 0)
    S('lab_rack', 11, 1)
    S('terminal', 12, 1)
    S('lab_core', 1, 5)
    rug(m, 'rug_teal', 4, 4, 5, 4)
    S('lab_table', 5, 5, base='detail2')
    S('lab_rack', 11, 3)
    S('lab_rack', 12, 3)
    S('pedestal', 10, 5)
    S('lab_rack', 11, 6)
    S('lab_rack', 12, 6)
    S('plant', 1, 8)
    S('plant', 12, 8)
    S('bin', 9, 2)
    S('terminal_free', 10, 7)
    S('stool', 9, 8)
    exit_mat(m, 6, 'mat_exit_green', 'lab_door')
    m.spawn('prof_talk', 6, 4, facing='up')
    m.npc('lab_aide', 8, 3, 'aide', script='lab.aide', facing='up')
    m.npc('lab_prof', 6, 3, 'prof', script='lab.prof', facing='down', showIfFlag='rescue_done')
    signs(m, [(1, 2), (2, 2), (3, 2), (4, 2)], 'lab.shelf')
    signs(m, [(5, 1), (6, 1)], 'lab.whiteboard')
    signs(m, [(7, 2)], 'lab.console')
    signs(m, [(12, 2), (10, 8)], 'lab.terminal')
    signs(m, [(1, 6), (2, 6), (1, 7), (2, 7)], 'lab.core')
    signs(m, [(5, 5), (6, 5), (7, 5), (5, 6), (6, 6), (7, 6)], 'lab.table')
    signs(m, [(10, 5)], 'lab.pedestal')
    signs(m, [(11, 2), (11, 4), (12, 4), (11, 7), (12, 7)], 'lab.rack')
    return m


def center():
    m = room('center', 13, 10, 'center', 'center', 'center', 'MODEL CENTER', seed=9)
    S = m.stamp
    ts, first = m.ts('interior')
    for y in range(5, 9):
        m.tile('ground', 6, y, 'floor_center_inlay')
    S('window_teal', 1, 0)
    S('wall_emblem_center', 5, 0)
    S('heal_machine', 5, 1)
    S('clock', 8, 0)
    S('window_teal', 9, 0)
    counter(m, 'heal', 2, 10, 4)
    S('plant', 1, 3)
    S('plant', 11, 3)
    S('bench', 1, 6)
    S('bench', 9, 6)
    S('pc_storage', 11, 6)
    S('plant', 1, 7)
    exit_mat(m, 6, 'mat_exit_teal', 'center_door')
    m.spawn('counter', 6, 5, facing='up')
    m.npc('nurse', 6, 3, 'nurse', script='center.nurse', facing='down')
    m.npc('ct_techie', 3, 6, 'techie', script='center.techie', facing='right')
    m.npc('ct_woman', 9, 7, 'woman', script='center.woman', facing='up', movement='look')
    signs(m, [(11, 7)], 'center.terminal')
    return m


def mart():
    m = room('mart', 12, 9, 'mart', 'mart', 'center', 'TOKEN MART', seed=11)
    S = m.stamp
    counter(m, 'shop', 1, 3, 4, register_at=2)
    S('window_violet', 1, 0)
    S('wall_emblem_mart', 6, 0)
    S('mart_shelf', 4, 1)
    S('mart_shelf', 6, 1)
    S('mart_shelf', 8, 1)
    S('boxes', 4, 3)
    S('mart_shelf_free', 6, 4)
    S('mart_shelf_free', 8, 4)
    S('crate_apples', 10, 6)
    S('plant', 10, 2)
    S('boxes', 1, 7)
    exit_mat(m, 5, 'mat_exit_violet', 'mart_door')
    m.npc('clerk', 2, 3, 'clerk', script='mart.clerk', facing='down')
    m.npc('mt_man', 7, 6, 'man', script='mart.customer', facing='up')
    signs(m, [(5, 2), (6, 2), (7, 2), (8, 2), (9, 2)], 'mart.shelf')
    signs(m, [(6, 5), (7, 5), (8, 5), (9, 5)], 'mart.aisle')
    signs(m, [(10, 6)], 'mart.apples')
    return m


def soma_house():
    m = room('soma_house', 11, 9, 'home', 'wood_b', 'home', 'SOMA HOUSE', seed=17)
    S = m.stamp
    S('bookshelf', 1, 1)
    S('window', 3, 0)
    S('tv', 6, 1)
    S('clock', 5, 0)
    S('console', 6, 3)
    S('plant', 9, 1)
    rug(m, 'rug_teal', 5, 4, 4, 2)
    S('cushion', 6, 5, base='detail2')
    S('sofa', 6, 6)
    S('table', 2, 4)
    S('chair_s', 2, 3)
    S('chair_n', 3, 6)
    S('bin', 9, 7)
    exit_mat(m, 5, 'mat_exit_red', 'soma_house_door')
    m.npc('sh_grandpa', 4, 4, 'elder', script='soma_house.grandpa', facing='left')
    m.npc('sh_kid', 7, 4, 'girl', script='soma_house.kid', facing='up', movement='look')
    signs(m, [(1, 2), (2, 2)], 'soma_house.bookshelf')
    signs(m, [(6, 2), (7, 2)], 'soma_house.tv')
    signs(m, [(2, 4), (3, 4), (2, 5), (3, 5)], 'soma_house.table')
    return m


def build_all():
    return [home_1f(), home_2f(), neighbor(), lab(), center(), mart(), soma_house()]
