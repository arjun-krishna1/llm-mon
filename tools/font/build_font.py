#!/usr/bin/env python3
"""Build the LLMMON bitmap fonts (ENGINE workstream).

Original pixel fonts authored here as pixel maps. Outputs, per font:
  public/assets/game/fonts/<name>.png   white glyphs on transparent (tint at runtime)
  public/assets/game/fonts/<name>.xml   BMFont text-XML (Phaser `load.bitmapFont`)
  public/assets/game/fonts/<name>.json  same metrics as JSON (tools / debugging)
  public/assets/game/fonts/<name>_preview.png  4x preview with drop shadow

Fonts:
  dialog  variable width, mixed case, cap height 9, x-height 6, 2px descenders.
  mini    3px-wide caps + digits, cap height 5 (HUD numbers, Lv, HP).

Glyph authoring format: rows separated by spaces. Rows are bottom-aligned on
the baseline; a '|' token separates descender rows (below baseline).
'#' = ink, '.' = empty. Run: python3 tools/font/build_font.py
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public', 'assets', 'game', 'fonts')

# ---------------------------------------------------------------- dialog font
DIALOG = {
    # Uppercase: 9 rows
    'A': '.###. #...# #...# #...# ##### #...# #...# #...# #...#',
    'B': '####. #...# #...# #...# ####. #...# #...# #...# ####.',
    'C': '.###. #...# #.... #.... #.... #.... #.... #...# .###.',
    'D': '###.. #..#. #...# #...# #...# #...# #...# #..#. ###..',
    'E': '##### #.... #.... #.... ####. #.... #.... #.... #####',
    'F': '##### #.... #.... #.... ####. #.... #.... #.... #....',
    'G': '.###. #...# #.... #.... #.### #...# #...# #...# .####',
    'H': '#...# #...# #...# #...# ##### #...# #...# #...# #...#',
    'I': '### .#. .#. .#. .#. .#. .#. .#. ###',
    'J': '..### ...#. ...#. ...#. ...#. ...#. #..#. #..#. .##..',
    'K': '#...# #..#. #.#.. ##... ##... #.#.. #..#. #...# #...#',
    'L': '#.... #.... #.... #.... #.... #.... #.... #.... #####',
    'M': '#.....# ##...## #.#.#.# #..#..# #.....# #.....# #.....# #.....# #.....#',
    'N': '#...# ##..# ##..# #.#.# #.#.# #..## #..## #...# #...#',
    'O': '.###. #...# #...# #...# #...# #...# #...# #...# .###.',
    'P': '####. #...# #...# #...# ####. #.... #.... #.... #....',
    'Q': '.###. #...# #...# #...# #...# #...# #.#.# #..#. .##.#',
    'R': '####. #...# #...# #...# ####. #.#.. #..#. #...# #...#',
    'S': '.###. #...# #.... #.... .###. ....# ....# #...# .###.',
    'T': '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
    'U': '#...# #...# #...# #...# #...# #...# #...# #...# .###.',
    'V': '#...# #...# #...# #...# #...# .#.#. .#.#. .#.#. ..#..',
    'W': '#.....# #.....# #.....# #.....# #..#..# #..#..# #.#.#.# ##...## #.....#',
    'X': '#...# #...# .#.#. .#.#. ..#.. .#.#. .#.#. #...# #...#',
    'Y': '#...# #...# #...# .#.#. .#.#. ..#.. ..#.. ..#.. ..#..',
    'Z': '##### ....# ...#. ...#. ..#.. .#... .#... #.... #####',
    # Lowercase: x-height 6, ascenders 9
    'a': '.###. ....# .#### #...# #..## .##.#',
    'b': '#.... #.... #.... ####. #...# #...# #...# #...# ####.',
    'c': '.###. #...# #.... #.... #...# .###.',
    'd': '....# ....# ....# .#### #...# #...# #...# #...# .####',
    'e': '.###. #...# ##### #.... #...# .###.',
    'f': '..## .#.. .#.. #### .#.. .#.. .#.. .#.. .#..',
    'g': '.#### #...# #...# #...# .#### ....# | #...# .###.',
    'h': '#.... #.... #.... #.##. ##..# #...# #...# #...# #...#',
    'i': '# . # # # # # #',
    'j': '.# .. .# .# .# .# .# .# | .# #.',
    'k': '#... #... #... #..# #.#. ##.. ##.. #.#. #..#',
    'l': '#. #. #. #. #. #. #. #. .#',
    'm': '##.#. #.#.# #.#.# #.#.# #.#.# #.#.#',
    'n': '#.##. ##..# #...# #...# #...# #...#',
    'o': '.###. #...# #...# #...# #...# .###.',
    'p': '####. #...# #...# #...# ####. #.... | #.... #....',
    'q': '.#### #...# #...# #...# .#### ....# | ....# ....#',
    'r': '#.## ##.. #... #... #... #...',
    's': '.###. #.... .###. ....# #...# .###.',
    't': '.#.. .#.. #### .#.. .#.. .#.. .#.. ..##',
    'u': '#...# #...# #...# #...# #..## .##.#',
    'v': '#...# #...# #...# .#.#. .#.#. ..#..',
    'w': '#.....# #.....# #..#..# #..#..# #.#.#.# .#...#.',
    'x': '#...# .#.#. ..#.. ..#.. .#.#. #...#',
    'y': '#...# #...# #...# #...# .#### ....# | #...# .###.',
    'z': '##### ...#. ..#.. .#... #.... #####',
    # Digits: 9 rows
    '0': '.###. #...# #...# #...# #...# #...# #...# #...# .###.',
    '1': '..#.. .##.. #.#.. ..#.. ..#.. ..#.. ..#.. ..#.. #####',
    '2': '.###. #...# ....# ...#. ..#.. .#... #.... #.... #####',
    '3': '.###. #...# ....# ....# ..##. ....# ....# #...# .###.',
    '4': '...#. ..##. .#.#. #..#. #..#. ##### ...#. ...#. ...#.',
    '5': '##### #.... #.... ####. ....# ....# ....# #...# .###.',
    '6': '.###. #.... #.... ####. #...# #...# #...# #...# .###.',
    '7': '##### ....# ....# ...#. ...#. ..#.. ..#.. ..#.. ..#..',
    '8': '.###. #...# #...# #...# .###. #...# #...# #...# .###.',
    '9': '.###. #...# #...# #...# .#### ....# ....# ....# .###.',
    # Punctuation
    '.': '#',
    ',': '.# | #.',
    '!': '# # # # # # # . #',
    '?': '.###. #...# ....# ...#. ..#.. ..#.. ..#.. ..... ..#..',
    ':': '# . . . #',
    ';': '.# .. .. .. .# | #.',
    '-': '#### .... .... ....',
    '+': '..#.. ..#.. ##### ..#.. ..#.. .....',
    '=': '#### .... #### .... ....',
    '/': '....# ....# ...#. ...#. ..#.. .#... .#... #.... #....',
    '(': '..# .#. #.. #.. #.. #.. #.. .#. ..# | ...',
    ')': '#.. .#. ..# ..# ..# ..# ..# .#. #.. | ...',
    "'": '# # . . . . . . .',
    '"': '#.# #.# ... ... ... ... ... ... ...',
    '’': '# # . . . . . . .',  # right single quote -> apostrophe
    '“': '#.# #.# ... ... ... ... ... ... ...',
    '”': '#.# #.# ... ... ... ... ... ... ...',
    '×': '#...# .#.#. ..#.. .#.#. #...# .....',  # multiplication sign
    '…': '#.#.#',  # ellipsis
    'é': '...#. ..#.. ..... .###. #...# ##### #.... #...# .###.',  # e-acute
    '$': '..#.. .#### #.#.. #.#.. .###. ..#.# ..#.# ####. ..#..',
    '%': '##..# ##..# ...#. ...#. ..#.. .#... .#... #..## #..##',
    '&': '.##.. #..#. #..#. .##.. .#... #.#.# #..#. #..#. .##.#',
    '#': '.#.#. .#.#. ##### .#.#. .#.#. ##### .#.#. .#.#. .....',
    '*': '..#.. #.#.# .###. #.#.# ..#.. ..... ..... ..... .....',
    '_': '..... | .....  #####',
    '~': '.#..# #.##. ..... .....',
    '<': '...# ..#. .#.. #... .#.. ..#. ...# ....',
    '>': '#... .#.. ..#. ...# ..#. .#.. #... ....',
    '▶': '#... ##.. ###. #### ###. ##.. #... ....',  # right-pointing triangle (cursor)
    '▼': '####### .#####. ..###.. ...#... .......',  # down triangle (advance)
    '♥': '.#.#. ##### ##### .###. ..#.. .....',  # heart
    '♪': '..### ..#.# ..#.. ..#.. ###.. ###.. .....',  # note
}

# ---------------------------------------------------------------- mini font
MINI = {
    '0': '### #.# #.# #.# ###',
    '1': '.#. ##. .#. .#. ###',
    '2': '##. ..# .#. #.. ###',
    '3': '##. ..# .#. ..# ##.',
    '4': '#.# #.# ### ..# ..#',
    '5': '### #.. ##. ..# ##.',
    '6': '.## #.. ### #.# ###',
    '7': '### ..# .#. .#. .#.',
    '8': '### #.# ### #.# ###',
    '9': '### #.# ### ..# ##.',
    'A': '.#. #.# ### #.# #.#',
    'B': '##. #.# ##. #.# ##.',
    'C': '.## #.. #.. #.. .##',
    'D': '##. #.# #.# #.# ##.',
    'E': '### #.. ##. #.. ###',
    'F': '### #.. ##. #.. #..',
    'G': '.## #.. #.# #.# .##',
    'H': '#.# #.# ### #.# #.#',
    'I': '### .#. .#. .#. ###',
    'J': '..# ..# ..# #.# .#.',
    'K': '#.# #.# ##. #.# #.#',
    'L': '#.. #.. #.. #.. ###',
    'M': '#...# ##.## #.#.# #...# #...#',
    'N': '#..# ##.# #.## #..# #..#',
    'O': '.#. #.# #.# #.# .#.',
    'P': '##. #.# ##. #.. #..',
    'Q': '.#. #.# #.# ##. .##',
    'R': '##. #.# ##. #.# #.#',
    'S': '.## #.. .#. ..# ##.',
    'T': '### .#. .#. .#. .#.',
    'U': '#.# #.# #.# #.# ###',
    'V': '#.# #.# #.# #.# .#.',
    'W': '#...# #...# #.#.# ##.## #...#',
    'X': '#.# #.# .#. #.# #.#',
    'Y': '#.# #.# .#. .#. .#.',
    'Z': '### ..# .#. #.. ###',
    'v': '#.# #.# .#.',
    '/': '..# ..# .#. #.. #..',
    ':': '. # . # .',
    '-': '### ... ...',
    '+': '.#. ### .#. ...',
    '.': '#',
    '%': '#.# ..# .#. #.. #.#',
    '!': '# # # . #',
    '?': '##. ..# .#. ... .#.',
    "'": '# # . . .',
    '×': '#.# .#. #.# ...',
}


def parse(spec):
    tokens = spec.split()
    if '|' in tokens:
        i = tokens.index('|')
        above, below = tokens[:i], tokens[i + 1:]
    else:
        above, below = tokens, []
    w = max(len(r) for r in above + below)
    return above, below, w


def build(name, glyphs, ascent, descent, line_height, space_adv, tracking=1, top_pad=1):
    """ascent = rows above baseline (cap height); cell height = top_pad+ascent+descent."""
    cell_h = top_pad + ascent + descent
    parsed = {}
    for ch, spec in glyphs.items():
        above, below, w = parse(spec)
        if len(above) > ascent + top_pad or len(below) > descent:
            sys.exit(f'{name}: glyph {ch!r} too tall ({len(above)}+{len(below)})')
        parsed[ch] = (above, below, w)

    # Atlas layout: rows of glyph cells, 1px gutter.
    atlas_w = 256
    x = y = 1
    placed = {}
    for ch, (above, below, w) in parsed.items():
        if x + w + 1 > atlas_w:
            x = 1
            y += cell_h + 1
        placed[ch] = (x, y)
        x += w + 1
    atlas_h = y + cell_h + 1
    h = 1
    while h < atlas_h:
        h *= 2
    img = Image.new('RGBA', (atlas_w, h), (0, 0, 0, 0))
    px = img.load()
    for ch, (above, below, w) in parsed.items():
        ox, oy = placed[ch]
        base = oy + top_pad + ascent  # first row below baseline
        for r, row in enumerate(reversed(above)):
            yy = base - 1 - r
            for c, v in enumerate(row):
                if v == '#':
                    px[ox + c, yy] = (255, 255, 255, 255)
        for r, row in enumerate(below):
            for c, v in enumerate(row):
                if v == '#':
                    px[ox + c, base + r] = (255, 255, 255, 255)

    chars = []
    for ch, (above, below, w) in parsed.items():
        ox, oy = placed[ch]
        chars.append({'id': ord(ch), 'char': ch, 'x': ox, 'y': oy, 'width': w, 'height': cell_h,
                      'xoffset': 0, 'yoffset': 0, 'xadvance': w + tracking})
    # space: tiny 1x1 empty glyph so Phaser has a frame
    chars.append({'id': 32, 'char': ' ', 'x': 0, 'y': 0, 'width': 0, 'height': 0,
                  'xoffset': 0, 'yoffset': 0, 'xadvance': space_adv})

    os.makedirs(OUT, exist_ok=True)
    img.save(os.path.join(OUT, f'{name}.png'))
    meta = {'face': f'llmmon_{name}', 'size': cell_h, 'lineHeight': line_height,
            'base': top_pad + ascent, 'capHeight': ascent, 'scaleW': atlas_w, 'scaleH': h,
            'file': f'{name}.png', 'chars': chars}
    with open(os.path.join(OUT, f'{name}.json'), 'w') as f:
        json.dump(meta, f, indent=1, ensure_ascii=False)

    lines = ['<?xml version="1.0"?>', '<font>',
             f'  <info face="{meta["face"]}" size="{cell_h}" bold="0" italic="0" charset="" unicode="1" '
             'stretchH="100" smooth="0" aa="1" padding="0,0,0,0" spacing="1,1"/>',
             f'  <common lineHeight="{line_height}" base="{meta["base"]}" scaleW="{atlas_w}" '
             f'scaleH="{h}" pages="1" packed="0"/>',
             f'  <pages><page id="0" file="{name}.png"/></pages>',
             f'  <chars count="{len(chars)}">']
    for c in chars:
        lines.append(f'    <char id="{c["id"]}" x="{c["x"]}" y="{c["y"]}" width="{c["width"]}" '
                     f'height="{c["height"]}" xoffset="0" yoffset="0" xadvance="{c["xadvance"]}" '
                     'page="0" chnl="15"/>')
    lines += ['  </chars>', '  <kernings count="0"/>', '</font>', '']
    with open(os.path.join(OUT, f'{name}.xml'), 'w') as f:
        f.write('\n'.join(lines))
    return img, meta


def preview(name, meta, img, sample_lines, scale=4):
    adv = {c['id']: c for c in meta['chars']}
    lh = meta['lineHeight']
    w = 236
    hh = lh * len(sample_lines) + 8
    out = Image.new('RGBA', (w, hh), (252, 250, 240, 255))
    fg = (56, 56, 64, 255)
    sh = (200, 196, 176, 255)
    for li, text in enumerate(sample_lines):
        for colour, d in ((sh, (1, 1)), (sh, (1, 0)), (sh, (0, 1)), (fg, (0, 0))):
            x = 4
            for ch in text:
                c = adv.get(ord(ch))
                if not c:
                    continue
                if c['width']:
                    g = img.crop((c['x'], c['y'], c['x'] + c['width'], c['y'] + c['height']))
                    solid = Image.new('RGBA', g.size, colour)
                    out.paste(solid, (x + d[0], 4 + li * lh + d[1]), g)
                x += c['xadvance']
    out = out.resize((w * scale, hh * scale), Image.NEAREST)
    out.save(os.path.join(OUT, f'{name}_preview.png'))


def main():
    img, meta = build('dialog', DIALOG, ascent=9, descent=2, line_height=16, space_adv=4)
    preview('dialog', meta, img, [
        'The quick brown fox jumps over',
        'THE LAZY DOG! 0123456789',
        'Prof. Karpathy: "Welcome… é?"',
        'Lv5 (HP) 12/34 +-×$%& ; : ▶ ▼',
        'abcdefghijklmnopqrstuvwxyz',
    ])
    img2, meta2 = build('mini', MINI, ascent=5, descent=0, line_height=7, space_adv=2, top_pad=0)
    preview('mini', meta2, img2, ['Lv12 HP 23/45 ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ 0123456789 :-+%'])
    print('fonts written to', OUT)


if __name__ == '__main__':
    main()
