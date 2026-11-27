#!/usr/bin/env python3
"""Prompts for the generated interior furniture sources.

    python3 tools/art/tiles_interior/gen_prompts.py [name ...]

Calls tools/art/gen/imagegen.py for each (cached: existing raws are kept,
so build.py never triggers generation). Raw files: tools/art/gen/raw/int_*.png
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
GEN = os.path.join(HERE, '..', 'gen', 'imagegen.py')

V = ("furniture sprite for a top-down 3/4-view Game Boy Advance RPG house "
     "interior, seen from slightly above so the top surface and the front face "
     "are both visible, front-facing and symmetric, not isometric, not rotated. "
     "Chunky simple readable shapes that still read when shrunk to a few dozen "
     "pixels.")
SHEET = ("A sprite sheet of separate small props for a top-down 3/4-view Game "
         "Boy Advance RPG interior, each seen from slightly above with top and "
         "front faces visible, arranged in a loose grid with wide empty magenta "
         "gaps between them so none touch. Chunky simple readable shapes. Props: ")

PROMPTS = {
    'int_bookshelf': "A single tall wooden bookshelf, " + V + " Overall proportions exactly 1:1 square (it occupies 2x2 tiles). Warm honey-brown wood frame, three shelves packed with colourful book spines (red, blue, green, yellow, violet) of varied heights, a small potted cactus on one shelf.",
    'int_bed': "A single child's bed, " + V + " Overall proportions exactly 1 wide by 2 tall (portrait, it occupies 1x2 tiles), headboard at the top, white pillow, blue quilt with a simple white star pattern folded back at the top, wooden footboard at the bottom.",
    'int_desk_pc': "A wooden study desk with a chunky retro beige CRT computer monitor and keyboard on it, " + V + " Overall proportions exactly 1:1 square (occupies 2x2 tiles): the monitor sits on the left half of the desk top, a red notebook lies on the right half, two drawers with brass knobs on the right of the front face, open leg space on the left.",
    'int_tv': "A chunky retro CRT television with a dark grey case and glossy blue screen standing on a low wooden TV cabinet with two doors, " + V + " Overall proportions exactly 1:1 square (2x2 tiles); the TV is centred on the cabinet top and is about as wide as two thirds of the cabinet.",
    'int_fridge': "A tall rounded retro white refrigerator with a small freezer door on top and a big door below, silver handles, a yellow note magnet, " + V + " Overall proportions exactly 1 wide by 2 tall (portrait, 1x2 tiles).",
    'int_kitchen': "A straight kitchen counter run against a wall, " + V + " Overall proportions exactly 3 wide by 2 tall (3x2 tiles), made of three equal-width sections side by side: left a cupboard section with a light grey countertop and a cutting board, middle a steel sink with a curved faucet, right a white stove with two black burners and a red kettle. Honey-brown wooden cupboard doors on the front, light grey countertop on top.",
    'int_table': "A rectangular wooden dining table with four short legs, a white table runner down the middle and a bowl of red apples, " + V + " Overall proportions exactly 1:1 square (2x2 tiles), table top seen mostly from above.",
    'int_props_home': SHEET + "a wooden chair seen from the front with the backrest at the top; the same wooden chair seen from behind; a round wooden stool; a square yellow floor cushion; a small grey metal waste bin; a small grey game console with a wired controller; a round wooden wall clock; a potted leafy green house plant in a terracotta pot (twice as tall as wide).",
    'int_window': "A wall window seen straight from the front as in a GBA RPG house interior back wall: white wooden frame with a cross mullion, four panes of bright blue sky with a small white cloud and glossy highlights, short red curtains tied at both sides, a small sill at the bottom. Overall proportions 4 wide by 3 tall. Flat front view, no perspective.",
    'int_lab_rack': "A tall sci-fi computer server rack cabinet for a professor's laboratory, " + V + " Overall proportions exactly 1 wide by 2 tall (1x2 tiles). Light grey metal case, dark front panel with rows of small green, yellow and red blinking lights and vents, a white top face.",
    'int_lab_console': "A large laboratory analysis machine against a wall, " + V + " Overall proportions exactly 1:1 square (2x2 tiles): white and pale grey metal body, a big dark screen showing a green wave graph in the upper half, a sloped control desk with colourful buttons and two dials below.",
    'int_lab_core': "A big futuristic glass tank machine for a professor's laboratory, " + V + " Overall proportions exactly 2 wide by 3 tall (2x3 tiles): a tall cylindrical glass tube full of glowing cyan liquid with bubbles and a small floating square microchip inside, a chunky white metal cap on top with cables, a wide white metal base with blue lights.",
    'int_lab_shelf': "A tall pale grey metal laboratory bookshelf, " + V + " Overall proportions exactly 1:1 square (2x2 tiles). Three shelves holding blue and yellow binders, thick books, a glass beaker and a small globe.",
    'int_lab_table': "A long white laboratory work table, " + V + " Overall proportions exactly 3 wide by 2 tall (3x2 tiles): white top seen mostly from above with a microscope, glass beakers with colourful liquids, scattered papers and a clipboard; grey metal legs.",
    'int_terminal': "A standing computer terminal kiosk, " + V + " Overall proportions exactly 1 wide by 2 tall (1x2 tiles): a pale grey monitor with a glowing teal screen on top of a pale grey pedestal cabinet with a small keyboard shelf.",
    'int_heal_machine': "An original restoring machine for a creature-care center, " + V + " Overall proportions exactly 1:1 square (2x2 tiles): a chunky white console with teal trim, on top a round glass dome holding a glowing teal hexagonal crystal core, three small round glowing slots on the front panel in a row, a small screen with a green heart-rate line. Not a ball, no red-and-white.",
    'int_bench': "A waiting room bench with a light wooden frame and a teal cushioned seat and backrest, " + V + " Overall proportions exactly 2 wide by 1 tall (2x1 tiles), seen from the front with the backrest at the top.",
    'int_mart_shelf': "A shop display shelf unit against a wall, " + V + " Overall proportions exactly 1:1 square (2x2 tiles): honey wood frame with violet trim, three shelves stocked with neat rows of colourful goods: bottles, small boxes, jars and cans.",
    'int_mart_shelf_free': "A freestanding double-sided shop gondola shelf in an aisle, " + V + " Overall proportions exactly 1:1 square (2x2 tiles): low white metal shelf unit with violet end trim, two tiers of neatly stocked colourful packaged goods, boxes and bottles; the top tier visible from above.",
    'int_props_shop': SHEET + "a small violet cash register with a paper receipt; a wooden crate full of red apples; a small white round display pedestal with a teal ring for a laboratory; a brown leather satchel bag; a stack of three cardboard boxes; a small wall poster showing a cute original round creature on a starry night sky.",
    'int_bed_wide': "A wide single bed for a child's bedroom, " + V + " Overall proportions exactly 1:1 square (2x2 tiles): a honey-wood headboard at the top, a big white pillow, a blue quilt with a simple white diamond pattern and a white sheet folded over its top edge, the quilt draping over both sides, a low wooden footboard at the bottom.",
    'int_sofa': "A cosy two-seat living-room sofa seen from the front, " + V + " Overall proportions exactly 2 wide by 1 tall (2x1 tiles): soft olive-green fabric, a rounded backrest at the top, two seat cushions, chunky rounded armrests on both sides, short wooden feet, one small cream throw pillow.",
}


def main(names):
    for n in names or PROMPTS:
        subprocess.run([sys.executable, GEN, n, PROMPTS[n]], check=True)


if __name__ == '__main__':
    main(sys.argv[1:])
