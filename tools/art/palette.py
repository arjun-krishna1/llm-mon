"""Master palette for all LLMMON Mythos pixel art.

Every generator in tools/art/ must draw only with colours from this file so
tiles, characters and UI read as one style. Ramps run dark -> light.
You may ADD a ramp here if you truly need one (append only, keep it small);
never change existing values without telling the lead.
"""

def _h(s):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), 255)

CLEAR = (0, 0, 0, 0)

# Outlines: warm near-black for objects, softer tints for inner lines.
OUTLINE = _h('#28222e')
OUTLINE_SOFT = _h('#4a3f4f')
SHADOW = (40, 34, 46, 90)          # translucent ground shadow

GRASS = [_h(c) for c in ('#3f8f4a', '#58b257', '#7ccf63', '#a4e27a')]
TALL_GRASS = [_h(c) for c in ('#256b45', '#35894c', '#4fa852', '#79c860')]
TREE = [_h(c) for c in ('#1f5540', '#2c7448', '#429550', '#6dbb5c', '#a3d86a')]
TRUNK = [_h(c) for c in ('#553a2e', '#7a5438', '#a0744a')]
DIRT = [_h(c) for c in ('#b08a58', '#d2b077', '#e8cf97', '#f4e4b8')]
SAND = [_h(c) for c in ('#d8c088', '#eedda8', '#f8eec8')]
ROCK = [_h(c) for c in ('#5c5868', '#84808e', '#aeaab4', '#d4d2d8')]
WATER = [_h(c) for c in ('#2f6fc0', '#4a94dc', '#72b8ee', '#b4e0f8')]
WOOD = [_h(c) for c in ('#6b4630', '#946240', '#bd8654', '#e0b078', '#f2d4a0')]
STONE = [_h(c) for c in ('#565a6e', '#7c8296', '#a6acbc', '#ced2dc', '#eef0f4')]
WALL_CREAM = [_h(c) for c in ('#b8a482', '#dccba4', '#f2e6c4', '#fcf6e2')]
ROOF_ORANGE = [_h(c) for c in ('#9c4420', '#d0642a', '#ee8c3c', '#f8b860')]
ROOF_BLUE = [_h(c) for c in ('#2c4a8c', '#3f6cc0', '#5c94e0', '#90bcf0')]
ROOF_TEAL = [_h(c) for c in ('#1c6a6c', '#2a9490', '#48bcae', '#8ce0cc')]
ROOF_VIOLET = [_h(c) for c in ('#4c3a8c', '#6c54bc', '#9078dc', '#bca8f0')]
ROOF_RED = [_h(c) for c in ('#8c2c34', '#c04444', '#e06c5c', '#f4a088')]
ROOF_SLATE = [_h(c) for c in ('#3a4258', '#56627c', '#7a88a0', '#a8b4c6')]
GLASS = [_h(c) for c in ('#3c6c9c', '#6ca8d4', '#a8dcf0', '#e4f8fc')]
METAL = [_h(c) for c in ('#4a5262', '#788494', '#a8b4c0', '#dce4ea')]
SKIN = [_h(c) for c in ('#b06c4c', '#e09c74', '#f8c8a0', '#fde4c8')]
SKIN_DEEP = [_h(c) for c in ('#5c3626', '#84523a', '#a87050', '#c89070')]
HAIR_DARK = [_h(c) for c in ('#241c2c', '#3c3048', '#5c4c68')]
HAIR_BROWN = [_h(c) for c in ('#4c2c20', '#784830', '#a46c44')]
HAIR_BLOND = [_h(c) for c in ('#a87828', '#dcb040', '#f8dc78')]
HAIR_GREY = [_h(c) for c in ('#787480', '#a8a4ae', '#d8d6dc')]
WHITE = [_h(c) for c in ('#a8b0c4', '#d4dae6', '#f4f6fa', '#ffffff')]
CLOTH_ORANGE = [_h(c) for c in ('#a84818', '#e07028', '#f8a048')]
CLOTH_BLUE = [_h(c) for c in ('#24408c', '#3c64c8', '#6c98ec')]
CLOTH_GREEN = [_h(c) for c in ('#1c6440', '#2c9458', '#58c478')]
CLOTH_RED = [_h(c) for c in ('#8c2030', '#c83c44', '#f0706c')]
CLOTH_VIOLET = [_h(c) for c in ('#48308c', '#7050c0', '#a084e8')]
CLOTH_PINK = [_h(c) for c in ('#a83c6c', '#e06c98', '#f8a8c4')]
CLOTH_YELLOW = [_h(c) for c in ('#b08018', '#e8b830', '#fce070')]
CLOTH_DARK = [_h(c) for c in ('#20222e', '#363a4c', '#545a70')]
FLOWER = {'red': _h('#f05850'), 'pink': _h('#f890b8'), 'yellow': _h('#fcd848'),
          'white': _h('#fcfcf4'), 'blue': _h('#70a8f8'), 'centre': _h('#f8b030')}

# UI: cream paper windows, slate-navy frames, one warm accent.
UI_PAPER = [_h(c) for c in ('#d8d0b8', '#f0ead4', '#fcfaf0')]
UI_FRAME = [_h(c) for c in ('#283048', '#40507c', '#6880b8', '#a0b8e0')]
UI_TEXT = _h('#383840')
UI_TEXT_SHADOW = _h('#c8c4b0')
UI_ACCENT = [_h(c) for c in ('#c04820', '#f07830', '#fcb060')]
HP_GREEN = [_h(c) for c in ('#30a048', '#60e070')]
HP_YELLOW = [_h(c) for c in ('#c09018', '#f8d838')]
HP_RED = [_h(c) for c in ('#b02830', '#f85848')]
EXP_BLUE = [_h(c) for c in ('#2868c0', '#50b0f8')]
SKY = [_h(c) for c in ('#78b8f0', '#a8d8f8', '#d8f0fc')]
