# Equipped-gear 3D viewer

> **Status (2026-06-11): FUTURE / idea-stage.** Spun out of `../cleanup.md`. Pure
> exploration — nothing exists, and this is the most speculative of the future projects.

## The idea (original wording)

> It would be pretty cool if we could make our extractor extract like the 3d models of
> weapons and armor and we could like use threejs to render the characters current
> equipped gear.

## Rough shape

Two halves, both substantial:

1. **Extractor stage** (fits the [[dlc-extractor-vision]] one-command pipeline): pull
   weapon/armor models from the game archives — parts models are FLVER (`.partsbnd.dcx`
   binders under `parts/`), textures TPF. **SoulsFormatsNEXT** (already cloned + credited
   on the acknowledgments page) is the canonical format reference. Convert offline to
   glTF/GLB + compressed textures (KTX2/basis) so the browser never parses FromSoft
   formats; emit per-item assets keyed by the same item ids the inventory uses.
2. **Web viewer**: three.js (likely react-three-fiber) card/panel rendering the currently
   equipped gear from the parsed save's equipment slots.

## Open questions / risks (why this is parked)

- **Full character vs. item turntables**: posing an assembled character (body + armor
  pieces + weapon, skeleton/rigging, skin params) is dramatically harder than rendering
  each equipped item as a standalone spinning model. v1 should almost certainly be
  per-item turntables in the equipment panel.
- **Asset size/hosting**: hundreds of MB of models/textures — needs lazy per-item fetch
  and probably ties into [improve-page-load-speed](./improve-page-load-speed.md)'s
  static-asset/CDN story.
- **FLVER→glTF conversion**: find/port a converter (SoulsFormatsNEXT is C#; the extractor
  is TS — either shell out, port the subset, or vendor an existing CLI).
- **Materials**: FromSoft shaders won't translate; accept flat/PBR-approximate looks.
- **Legal posture**: same as map tiles/icons — extracted from the user's own install by
  the extractor, never redistributed by us. The one-command-extractor vision keeps this
  clean.
