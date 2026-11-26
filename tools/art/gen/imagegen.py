#!/usr/bin/env python3
"""Generate source art with the codex CLI's built-in image tool (ChatGPT plan login).

    python3 tools/art/gen/imagegen.py NAME "image prompt" [--ref path.png ...] [--force]

Writes tools/art/gen/raw/NAME.png: the generation cropped to its subject and
reduced to <=384px on the long side (small enough to commit). Skips the call
if that file exists (unless --force), so build scripts never regenerate.
Each call takes ~1-2 minutes and spends the owner's plan quota: be deliberate,
run at most 3 in parallel, and always look at the result before using it.

The STYLE suffix is appended to every prompt so all generated art matches.
Ask for ONE subject per image on a flat magenta background; then turn it into
a game sprite with tools/art/gen/pixelize.py.
"""
import argparse, os, subprocess, sys, tempfile, shutil, glob
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'raw')
STYLE = (
    " Style: authentic 16-bit GBA-era handheld RPG pixel art, original design, "
    "sunny saturated colours, dark warm (not pure black) 1-pixel outlines, light from the top-left, "
    "crisp hard-edged large pixels on a consistent pixel grid, no anti-aliasing, no gradients, no blur, "
    "limited palette. Flat solid pure magenta (#FF00FF) background filling the whole image, "
    "no ground, no cast shadow, no text, no border, no watermark."
)

def is_bg(p):
    r, g, b = p[:3]
    return r > 185 and b > 185 and g < 110

def crop_subject(im):
    im = im.convert('RGB')
    w, h = im.size
    px = im.load()
    x0, y0, x1, y1 = w, h, 0, 0
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            if not is_bg(px[x, y]):
                x0, y0, x1, y1 = min(x0, x), min(y0, y), max(x1, x), max(y1, y)
    if x1 <= x0:
        return im
    pad = 8
    return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad)))

def generate(name, prompt, refs=(), force=False, style=True, keep_full=False):
    out = os.path.join(RAW, name + '.png')
    if os.path.exists(out) and not force:
        return out
    os.makedirs(RAW, exist_ok=True)
    work = tempfile.mkdtemp(prefix='imagegen_')
    full = prompt + (STYLE if style else '')
    instr = ("Use your built-in image generation tool to generate exactly ONE image and save it as "
             "./out.png in the current directory. Do not write code to draw it and do not use any API "
             "script. " + ("Use the attached image(s) as the design reference. " if refs else "") +
             "Image prompt: " + full)
    cmd = ['codex', 'exec', '--skip-git-repo-check', '-s', 'workspace-write']
    for r in refs:
        cmd += ['-i', os.path.abspath(r)]
    cmd += ['--', instr]
    try:
        res = subprocess.run(cmd, cwd=work, capture_output=True, text=True, timeout=600)
        src = os.path.join(work, 'out.png')
        if not os.path.exists(src):
            cands = glob.glob(os.path.join(work, '*.png'))
            if not cands:
                sys.stderr.write(res.stdout[-1500:] + res.stderr[-1500:])
                raise RuntimeError('codex produced no image for ' + name)
            src = cands[0]
        im = Image.open(src)
        if not keep_full:
            im = crop_subject(im)
            im.thumbnail((384, 384), Image.LANCZOS)
        im.save(out)
    finally:
        shutil.rmtree(work, ignore_errors=True)
    return out

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('name'); ap.add_argument('prompt')
    ap.add_argument('--ref', action='append', default=[])
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--no-style', action='store_true', help='do not append the shared STYLE suffix')
    ap.add_argument('--keep-full', action='store_true', help='keep full size, no crop (backgrounds)')
    a = ap.parse_args()
    print(generate(a.name, a.prompt, a.ref, a.force, not a.no_style, a.keep_full))
