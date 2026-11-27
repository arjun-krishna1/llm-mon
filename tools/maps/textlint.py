#!/usr/bin/env python3
"""Dialogue lint: every page of every dialogue string in src/game/content/**
must wrap to at most 2 lines in the dialog box (210 px of the bitmap font
public/assets/game/fonts/dialog.json), use only glyphs the font has, and not
break a page inside an open “quote”.

  python3 tools/maps/textlint.py
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CONTENT = os.path.join(ROOT, 'src', 'game', 'content')
WIDTH = 210
SUBS = {'{player}': 'Arjun', '{starter}': 'Claude Fable'}


def load_font():
    d = json.load(open(os.path.join(ROOT, 'public', 'assets', 'game', 'fonts', 'dialog.json')))
    return {c['char']: c['xadvance'] for c in d['chars']}


def measure(adv, s):
    return sum(adv.get(ch, 0) for ch in s) - (1 if s else 0)


def wrap(adv, text):
    out = []
    for para in text.split('\n'):
        line = ''
        for word in para.split(' '):
            cand = line + ' ' + word if line else word
            if measure(adv, cand) <= WIDTH or not line:
                line = cand
            else:
                out.append(line)
                line = word
        out.append(line)
    return out


LIT = re.compile(r"'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`")


def unescape(s):
    s = re.sub(r'\$\{[^}]*\}', 'Claude Fable', s)
    s = re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), s)
    return s.replace('\\n', '\n').replace('\\f', '\f').replace("\\'", "'").replace('\\\\', '\\')


def main():
    adv = load_font()
    bad = 0
    n = 0
    for dp, _, fs in os.walk(CONTENT):
        for f in sorted(fs):
            if not f.endswith('.ts'):
                continue
            src = open(os.path.join(dp, f)).read()
            for m in LIT.finditer(src):
                raw = m.group(1) if m.group(1) is not None else m.group(2)
                s = unescape(raw)
                if ' ' not in s or len(s) < 16:
                    continue
                for k, v in SUBS.items():
                    s = s.replace(k, v)
                pages = s.split('\f')
                for pi, page in enumerate(pages):
                    n += 1
                    open_q = page.count('\u201c') - page.count('\u201d')
                    if open_q > 0 and pi < len(pages) - 1:
                        bad += 1
                        print('%s:%d: page break inside an open quote: %r' % (f, src[:m.start()].count('\n') + 1, page))
                    lines = wrap(adv, page)
                    missing = sorted({ch for ch in page if ch not in adv and ch not in '\n'})
                    line_no = src[:m.start()].count('\n') + 1
                    if len(lines) > 2 or missing:
                        bad += 1
                        print('%s:%d: %s%s' % (f, line_no, ('%d lines ' % len(lines)) if len(lines) > 2 else '',
                                                ('missing glyphs %r ' % missing) if missing else ''))
                        for ln in lines:
                            print('    | %s  (%dpx)' % (ln, measure(adv, ln)))
    print('textlint: %d pages checked, %d problems' % (n, bad))
    return bad == 0


if __name__ == '__main__':
    sys.exit(0 if main() else 1)
