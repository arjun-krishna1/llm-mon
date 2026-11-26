"""Build the small `props` tileset that every map embeds next to exterior/interior:

  tile 0           invisible solid blocker (collision only; used on the door
                   tiles of buildings you cannot enter)
(The moving truck and the satchel are engine `prop` sprites, not tiles.)

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
    cat = {'tiles': tiles, 'stamps': {}}
    with open(os.path.join(MAP_DIR, 'props.catalog.json'), 'w') as f:
        json.dump(cat, f, indent=1)


if __name__ == '__main__':
    build()
