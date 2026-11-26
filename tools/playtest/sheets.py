#!/usr/bin/env python3
"""Contact sheets for the lead from a playtest run directory.

  python3 tools/playtest/sheets.py tools/playtest/out/run [--out tools/playtest/out] [--prefix sheet]

Reads <run>/result.json (beats in order, animation strips) and writes
  <out>/<prefix>_01.png ...      12 labelled beats per sheet, each 240x160 scaled 2x (3 columns)
  <out>/<prefix>_anim_*.png      animation strips (frames at 1x, 6 per row, labelled with ms)
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

args = sys.argv[1:]
run = Path(args[0])
out = Path(args[args.index('--out') + 1]) if '--out' in args else run.parent
prefix = args[args.index('--prefix') + 1] if '--prefix' in args else 'sheet'
res = json.loads(((run / 'result.json') if (run / 'result.json').exists() else (run / 'strips.json')).read_text())

try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
    SMALL = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 11)
except OSError:
    FONT = SMALL = ImageFont.load_default()

BG = (24, 26, 34)
FG = (236, 236, 228)
DIM = (150, 156, 170)


def load1x(p):
    im = Image.open(p).convert('RGB')
    if im.size != (240, 160):
        im = im.resize((240, 160), Image.NEAREST)
    return im


def beat_sheets():
    beats = res['beats']
    per = 12
    cols = 3
    cw, ch = 480, 320
    pad, lab = 8, 34
    paths = []
    for si in range(0, len(beats), per):
        chunk = beats[si:si + per]
        rows = (len(chunk) + cols - 1) // cols
        W = cols * cw + (cols + 1) * pad
        H = 28 + rows * (ch + lab + pad) + pad
        sheet = Image.new('RGB', (W, H), BG)
        d = ImageDraw.Draw(sheet)
        d.text((pad, 7), f"LLMMON playtest {'fast' if res['fast'] else 'normal'} seed {res['seed']} starter {res['starter']} - sheet {si // per + 1} (beats {si + 1}-{si + len(chunk)})", fill=FG, font=FONT)
        for i, b in enumerate(chunk):
            x = pad + (i % cols) * (cw + pad)
            y = 28 + (i // cols) * (ch + lab + pad)
            d.text((x, y + 2), f"{si + i + 1}. {b['label']}"[:64], fill=FG, font=FONT)
            d.text((x, y + 18), f"{b['seg']} | {b['map']} {b['x']},{b['y']} | music {b['music']}"[:80], fill=DIM, font=SMALL)
            try:
                im = load1x(run / b['file']).resize((cw, ch), Image.NEAREST)
                sheet.paste(im, (x, y + lab))
            except Exception as e:  # noqa: BLE001
                d.text((x, y + lab + 10), f'missing: {e}', fill=(255, 90, 90), font=SMALL)
        p = out / f'{prefix}_{si // per + 1:02d}.png'
        sheet.save(p)
        paths.append(str(p))
    return paths


OVERWORLD_STRIPS = ('walk', 'turn', 'run', 'door', 'grass', 'ledge')


def strip_sheets():
    """Overworld strips: 64x56 crop around the player (screen 112,64) at 4x; battle strips: full frame at 2x."""
    paths = []
    for s in res.get('strips', []):
        files = [run / Path(f).name for f in s['files']]
        ow = s['name'].startswith(OVERWORLD_STRIPS)
        if ow:
            crop, scale, cols = (88, 32, 152, 96), 4, 6
        else:
            crop, scale, cols = (0, 0, 240, 160), 2, 3
        cw, ch = (crop[2] - crop[0]) * scale, (crop[3] - crop[1]) * scale
        pad, lab = 6, 16
        rows = (len(files) + cols - 1) // cols
        W = cols * cw + (cols + 1) * pad
        H = 26 + rows * (ch + lab + pad) + pad
        sheet = Image.new('RGB', (W, H), BG)
        d = ImageDraw.Draw(sheet)
        what = 'crop around player, 4x' if ow else 'full frame, 2x'
        d.text((pad, 6), f"strip: {s['name']} ({len(files)} frames, {what}, ms from first capture)", fill=FG, font=FONT)
        for i, f in enumerate(files):
            x = pad + (i % cols) * (cw + pad)
            y = 26 + (i // cols) * (ch + lab + pad)
            d.text((x, y), f"f{i}  +{s['t'][i]}ms", fill=DIM, font=SMALL)
            try:
                sheet.paste(load1x(f).crop(crop).resize((cw, ch), Image.NEAREST), (x, y + lab))
            except Exception:  # noqa: BLE001
                pass
        p = out / f"{prefix}_anim_{s['name']}.png"
        sheet.save(p)
        paths.append(str(p))
    return paths


if __name__ == '__main__':
    out.mkdir(parents=True, exist_ok=True)
    for p in beat_sheets() + strip_sheets():
        print(p)
