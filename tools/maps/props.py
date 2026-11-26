"""Build the small `props` tileset that every map embeds next to exterior/interior:

  tile 0           invisible solid blocker (collision only)
  stamp `truck`    the Mythos Movers truck (sprites/fx/truck.png) cut into 3x3
                   tiles: top row -> over (walk behind), bottom rows solid.

Writes public/assets/game/maps/props.{png,tsj,catalog.json}.
"""
import json
import os

from PIL import Image

from mapdsl import MAP_DIR, SPRITES, T

COLS = 16


def build():
    os.makedirs(MAP_DIR, exist_ok=True)
    sheet = Image.new('RGBA', (COLS * T, T), (0, 0, 0, 0))
    tiles = {'blocker': 0}
    props = {0: {'solid': True}}
    truck_p = os.path.join(SPRITES, 'fx', 'truck.png')
    truck = Image.open(truck_p).convert('RGBA') if os.path.exists(truck_p) else Image.new('RGBA', (48, 40), (200, 80, 40, 255))
    box = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
    box.alpha_composite(truck, ((48 - truck.width) // 2, 48 - truck.height))
    base = [[-1] * 3 for _ in range(3)]
    over = [[-1] * 3 for _ in range(3)]
    tid = 1
    for j in range(3):
        for i in range(3):
            cell = box.crop((i * T, j * T, i * T + T, j * T + T))
            if cell.getbbox() is None:
                continue
            sheet.alpha_composite(cell, (tid * T, 0))
            if j == 0:
                over[j][i] = tid
            else:
                base[j][i] = tid
                props[tid] = {'solid': True}
            tid += 1
    sheet.save(os.path.join(MAP_DIR, 'props.png'))
    tsj = {
        'type': 'tileset', 'version': '1.10', 'tiledversion': '1.10.2', 'name': 'props',
        'image': 'props.png', 'imagewidth': COLS * T, 'imageheight': T, 'tilewidth': T, 'tileheight': T,
        'margin': 0, 'spacing': 0, 'columns': COLS, 'tilecount': COLS,
        'tiles': [{'id': k, 'properties': [{'name': n, 'type': 'bool', 'value': v} for n, v in p.items()]}
                  for k, p in sorted(props.items())],
    }
    with open(os.path.join(MAP_DIR, 'props.tsj'), 'w') as f:
        json.dump(tsj, f, indent=1)
    cat = {'tiles': tiles, 'stamps': {'truck': {'w': 3, 'h': 3, 'layers': {'base': base, 'over': over}}}}
    with open(os.path.join(MAP_DIR, 'props.catalog.json'), 'w') as f:
        json.dump(cat, f, indent=1)


if __name__ == '__main__':
    build()
