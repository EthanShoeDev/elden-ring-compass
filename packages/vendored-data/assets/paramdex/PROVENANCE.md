# Vendored Paramdex (DO NOT EDIT BY HAND)

These PARAMDEF field-layout definitions are **reverse-engineered community data**,
not extracted from the game: Elden Ring does not ship paramdefs (the field schema
lives only in the game executable). They are required to decode `regulation.bin`
param rows into named fields. See plan §7 ("vendor baked content").

- Source: https://github.com/soulsmods/Paramdex
- Subdirs: ER/Defs
- Commit: ff7245e524329bc3eab00036723d2bd53384cedf
- Files: 194 ER defs

Refresh with `bun run update-paramdex` (from packages/er-extractor). On a game
patch, re-run this and watch for the param-def version drift warning at decode.
