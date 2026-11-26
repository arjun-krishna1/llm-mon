#!/usr/bin/env python3
"""Rebuild every map: python3 tools/maps/build.py

  1. props tileset   -> public/assets/game/maps/props.{png,tsj,catalog.json}
  2. maps            -> public/assets/game/maps/<id>.tmj  (embedded tilesets)
  3. previews        -> tools/maps/preview/<id>.png (clean, 1x)
                        tools/maps/preview/<id>_annotated.png (2x, object overlays)
  4. validator       (tools/maps/validate.py) - exits non-zero on errors

Options: --no-preview, --only <id>[,<id>...]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import props  # noqa: E402
from mapdsl import HERE, Image  # noqa: E402

PREVIEW = os.path.join(HERE, 'preview')


def all_maps():
    import overworld
    import interiors
    out = [overworld.build()]
    out += interiors.build_all()
    return out


def main(argv):
    only = None
    if '--only' in argv:
        only = set(argv[argv.index('--only') + 1].split(','))
    props.build()
    maps = all_maps()
    os.makedirs(PREVIEW, exist_ok=True)
    for m in maps:
        if only and m.id not in only:
            continue
        p = m.write()
        print('wrote', os.path.relpath(p), '%dx%d' % (m.w, m.h), '%d objects' % len(m.objects))
        for w in m.warnings:
            print('  WARN', m.id, w)
        if '--no-preview' not in argv:
            img = m.render()
            img.save(os.path.join(PREVIEW, m.id + '.png'))
            ann = m.render(annotate=True)
            ann.resize((ann.width * 2, ann.height * 2), Image.NEAREST).save(os.path.join(PREVIEW, m.id + '_annotated.png'))
    import validate
    ok = validate.run(maps, strict_scripts=True)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
