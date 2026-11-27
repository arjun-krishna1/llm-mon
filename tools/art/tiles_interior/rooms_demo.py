"""Demo room layouts for previews (catalog names only).

Coordinates are tile cells in a room whose row 0/1 are the wall face, last
row is the front rim, column 0 / last column the side rims. A stamp with
place == 'wall' is put with its top row on wall row 1.
"""


def counter(r, kind, x0, x1, y_base, register_at=None):
    a = r.cat['autotiles'][f'counter_{kind}']
    for x in range(x0, x1 + 1):
        part = 'l' if x == x0 else 'r' if x == x1 else 'm'
        if x0 == x1:
            part = 's'
        top = a[part + '_top']
        if register_at == x and 'm_top_register' in a:
            top = a['m_top_register']
        r.L['over'][y_base - 1][x] = top
        r.L['detail'][y_base][x] = a[part]


def make(Room, cat):
    st = cat['stamps']
    out = {}

    def S(r, name, x, y, layer='detail'):
        if name in st:
            r.stamp(name, x, y, layer)

    # -- home 1F -----------------------------------------------------------
    r = Room(cat, 13, 10, 'home', 'wood_a', seed=3)
    r.rug('rug_red', 6, 4, 4, 3)
    r.door(6)
    S(r, 'stairs_up', 10, 0)
    S(r, 'fridge', 1, 1)
    S(r, 'kitchen_counter', 2, 1)
    S(r, 'kitchen_sink', 3, 1)
    S(r, 'kitchen_stove', 4, 1)
    S(r, 'window', 5, 0)
    S(r, 'clock', 7, 0)
    S(r, 'tv', 7, 1)
    S(r, 'console', 8, 3)
    S(r, 'table', 2, 4)
    S(r, 'chair_s', 2, 3)
    S(r, 'chair_s', 3, 3)
    S(r, 'chair_n', 2, 6)
    S(r, 'chair_n', 3, 6)
    S(r, 'cushion', 7, 5, 'detail2')
    S(r, 'plant', 11, 6)
    S(r, 'plant', 1, 7)
    S(r, 'sofa', 7, 7)
    S(r, 'bin', 5, 2)
    out['home_1f'] = r

    # -- bedroom -------------------------------------------------------------
    r = Room(cat, 11, 9, 'bedroom', 'wood_a', seed=5)
    r.rug('rug_blue', 3, 4, 4, 3)
    S(r, 'stairs_down', 8, 2)
    S(r, 'window', 1, 0)
    S(r, 'bed_wide', 1, 2)
    S(r, 'desk_pc', 3, 1)
    S(r, 'chair_n', 3, 3)
    S(r, 'bookshelf', 5, 1)
    S(r, 'clock', 7, 0)
    S(r, 'poster', 9, 0)
    S(r, 'cushion', 5, 5, 'detail2')
    S(r, 'plant', 9, 5)
    S(r, 'bin', 7, 2)
    out['bedroom'] = r

    # -- lab -----------------------------------------------------------------
    r = Room(cat, 14, 10, 'lab', 'lab', seed=7)
    r.door(7, 'mat_exit_green')
    S(r, 'lab_shelf', 1, 1)
    S(r, 'lab_shelf', 3, 1)
    S(r, 'whiteboard', 5, 0)
    S(r, 'lab_console', 7, 1)
    S(r, 'window_blue', 9, 0)
    S(r, 'terminal', 12, 1)
    S(r, 'lab_rack', 11, 1)
    S(r, 'lab_core', 1, 4)
    S(r, 'lab_table', 5, 4)
    S(r, 'pedestal', 9, 5)
    S(r, 'lab_rack', 12, 4)
    S(r, 'lab_rack', 11, 4)
    S(r, 'plant', 1, 7)
    S(r, 'plant', 12, 7)
    S(r, 'bin', 4, 2)
    out['lab'] = r

    # -- model center ---------------------------------------------------------
    r = Room(cat, 13, 10, 'center', 'center', seed=9)
    r.door(6, 'mat_exit_teal')
    for y in range(5, 9):
        r.t('ground', 'floor_center_inlay', 6, y)
    S(r, 'window_teal', 1, 0)
    S(r, 'heal_machine', 5, 1)
    S(r, 'wall_emblem_center', 5, 0)
    S(r, 'clock', 8, 0)
    S(r, 'window_teal', 9, 0)
    counter(r, 'heal', 3, 9, 4)
    S(r, 'pc_storage', 11, 1)
    S(r, 'plant', 1, 2)
    S(r, 'bench', 1, 6)
    S(r, 'bench', 9, 6)
    S(r, 'plant', 11, 6)
    out['center'] = r

    # -- token mart -----------------------------------------------------------
    r = Room(cat, 12, 9, 'mart', 'mart', seed=11)
    r.door(5, 'mat_exit_violet')
    counter(r, 'shop', 1, 3, 5, register_at=2)
    S(r, 'window_violet', 1, 0)
    S(r, 'wall_emblem_mart', 6, 0)
    S(r, 'mart_shelf', 4, 1)
    S(r, 'mart_shelf', 6, 1)
    S(r, 'mart_shelf', 8, 1)
    S(r, 'mart_shelf_free', 6, 4)
    S(r, 'mart_shelf_free', 8, 4)
    S(r, 'crate_apples', 10, 6)
    S(r, 'boxes', 1, 7)
    S(r, 'plant', 10, 2)
    out['mart'] = r
    # -- neighbour house --------------------------------------------------------
    r = Room(cat, 11, 9, 'neighbor', 'wood_b', seed=13)
    r.door(5, 'mat_exit_red')
    r.rug('rug_violet', 3, 4, 5, 2)
    S(r, 'window_green', 1, 0)
    S(r, 'bookshelf', 4, 1)
    S(r, 'door_inner', 7, 0)
    S(r, 'clock', 6, 0)
    S(r, 'fridge', 9, 1)
    S(r, 'bed_wide_pink', 1, 2)
    S(r, 'stool', 6, 3)
    S(r, 'plant', 9, 5)
    S(r, 'cushion', 5, 4, 'detail2')
    S(r, 'bin', 1, 6)
    out['neighbor'] = r
    return out
