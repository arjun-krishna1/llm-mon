#!/usr/bin/env python3
"""Rebuild every ART-SPR asset (plan §4.5) + preview contact sheets.

    python3 tools/art/sprites/build.py            # everything
    python3 tools/art/sprites/build.py --no-preview

Generated source images (tools/art/gen/raw/spr_*.png) are only READ here; the
build never calls the image generator, so it is fast and reproducible.
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import chars  # noqa: E402
import mons  # noqa: E402
import battle  # noqa: E402
import fx  # noqa: E402
import ui  # noqa: E402
import screens  # noqa: E402
import preview  # noqa: E402


def main():
    t = time.time()
    built = chars.build()
    print('chars:', len(built))
    m = mons.build()
    print('mons:', len(m))
    battle.build()
    print('battle: ok')
    fx.build()
    print('fx: ok')
    ui.build()
    screens.build()
    print('ui: ok')
    if '--no-preview' not in sys.argv:
        out = preview.build(list(built), list(m))
        for k, v in out.items():
            print('preview', k, v)
    print('done in %.1fs' % (time.time() - t))


if __name__ == '__main__':
    main()
