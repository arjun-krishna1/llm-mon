# Asset attribution

All art, music and sound in the game build is original to this project.

- **Creature designs:** generated for this project (`public/assets/llmmon/`),
  then converted to 64×64 battle sprites by `tools/art/sprites/`.
- **Tiles, buildings, furniture, characters, UI, backgrounds:** source images
  generated for this project with an AI image model (cached in
  `tools/art/gen/raw/`), reduced and palette-snapped by scripts in
  `tools/art/`, plus pixel art drawn directly by those scripts.
- **Fonts:** original bitmap fonts drawn by `tools/font/build_font.py`.
- **Music and sound effects:** original compositions synthesized at runtime
  by `src/game/audio/`.

No assets from any existing game are used. `legacy/` contains the earlier
prototype, which used CC0 packs from Kenney (https://kenney.nl); those files
are not part of the current build.
